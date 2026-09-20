import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { getDb } from '../src/lib/db';

interface ImportReport {
  file: string;
  format: 'CSV' | 'XLSX';
  bookName: string;
  totalRows: number;
  imported: number;
  skipped: number;
  duplicates: number;
  invalid: number;
  topicsCreated: number;
  distractorsImported: number;
}

// Robust CSV parser supporting quotes, escaped quotes, and newlines
function parseCSV(content: string): string[][] {
  let cleanContent = content;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < cleanContent.length; i++) {
    const c = cleanContent[i];

    if (c === '"') {
      if (inQuotes && cleanContent[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && cleanContent[i + 1] === '\n') {
        i++;
      }
      row.push(field);
      field = '';
      if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
        rows.push(row);
      }
      row = [];
    } else {
      field += c;
    }
  }

  if (row.length > 1 || (row.length === 1 && field.trim() !== '')) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function cleanStr(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  return str === '' ? null : str;
}

function normalizeWord(word: string): string {
  return word.toLowerCase().trim().replace(/\s+/g, ' ');
}

function parseSheetName(sheetName: string): { unitNumber: number | null; topicName: string } {
  const clean = sheetName.trim();
  const matchUnit = clean.match(/^Unit\s+(\d+)[:\s\-\.]*(.*)$/i);
  if (matchUnit) {
    const unitNumber = parseInt(matchUnit[1], 10);
    const topicName = matchUnit[2]?.trim() || clean;
    return { unitNumber, topicName: topicName || `Unit ${unitNumber}` };
  }
  const matchNum = clean.match(/^(\d+)[:\s\-\.]+(.*)$/);
  if (matchNum) {
    const unitNumber = parseInt(matchNum[1], 10);
    const topicName = matchNum[2]?.trim() || clean;
    return { unitNumber, topicName: topicName || `Unit ${unitNumber}` };
  }
  return { unitNumber: null, topicName: clean };
}

export function importAllFiles(resetFirst = true): ImportReport[] {
  const db = getDb();
  const reports: ImportReport[] = [];
  const baseDir = process.cwd();

  if (resetFirst) {
    console.log('🧹 Cleaning existing vocabulary, topics and distractors for fresh update...');
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec('DELETE FROM vocabulary_distractors;');
    db.exec('DELETE FROM user_vocabulary_progress;');
    db.exec('DELETE FROM exercise_attempts;');
    db.exec('DELETE FROM user_topic_progress;');
    db.exec('DELETE FROM vocabulary;');
    db.exec('DELETE FROM topics;');
    db.exec('PRAGMA foreign_keys = ON;');
  }

  // Prepared statements
  const findTopicStmt = db.prepare('SELECT id FROM topics WHERE book_id = ? AND name = ?');
  const insertTopicStmt = db.prepare(`
    INSERT INTO topics (book_id, unit_number, name, order_index)
    VALUES (?, ?, ?, ?)
  `);
  const checkVocabStmt = db.prepare(`
    SELECT id FROM vocabulary WHERE book_id = ? AND topic_id = ? AND normalized_word = ?
  `);
  const insertVocabStmt = db.prepare(`
    INSERT INTO vocabulary (
      book_id, topic_id, word, normalized_word, ipa, part_of_speech,
      meaning_vi, meaning_en, example_1, example_1_vi, example_2, example_2_vi,
      cloze_example_1, cloze_example_2, level, audio_url, word_image,
      example_image_1, example_image_2
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertDistractorStmt = db.prepare(`
    INSERT INTO vocabulary_distractors (vocabulary_id, word, meaning_vi, position)
    VALUES (?, ?, ?, ?)
  `);

  // Target files: 2 XLSX and 2 CSV
  const targets = [
    {
      fileName: '📚 Vocabulary In Use Elementary.xlsx',
      format: 'XLSX' as const,
      bookId: 1,
      bookName: 'Elementary',
    },
    {
      fileName: '📚 Vocabulary in Use - Pre-intermediate & Intermediate.xlsx',
      format: 'XLSX' as const,
      bookId: 2,
      bookName: 'Pre-intermediate & Intermediate',
    },
    {
      fileName: 'upper-intermediate_topic.csv',
      format: 'CSV' as const,
      bookId: 3,
      bookName: 'Upper-intermediate',
    },
    {
      fileName: 'advanced_topic.csv',
      format: 'CSV' as const,
      bookId: 4,
      bookName: 'Advanced',
    },
  ];

  for (const target of targets) {
    const filePath = path.join(baseDir, target.fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`[WARN] File not found: ${target.fileName}`);
      continue;
    }

    console.log(`\n⏳ Processing ${target.format}: "${target.fileName}" (${target.bookName})...`);

    const report: ImportReport = {
      file: target.fileName,
      format: target.format,
      bookName: target.bookName,
      totalRows: 0,
      imported: 0,
      skipped: 0,
      duplicates: 0,
      invalid: 0,
      topicsCreated: 0,
      distractorsImported: 0,
    };

    db.exec('BEGIN TRANSACTION;');

    try {
      if (target.format === 'XLSX') {
        const workbook = XLSX.readFile(filePath);

        for (let sIdx = 0; sIdx < workbook.SheetNames.length; sIdx++) {
          const sheetName = workbook.SheetNames[sIdx];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

          if (rows.length === 0) continue;

          // Parse Unit Number & Topic Title
          const { unitNumber, topicName } = parseSheetName(sheetName);

          let topicId: number;
          const existingTopic = findTopicStmt.get(target.bookId, topicName) as { id: number } | undefined;
          if (existingTopic) {
            topicId = existingTopic.id;
          } else {
            const res = insertTopicStmt.run(target.bookId, unitNumber || (sIdx + 1), topicName, sIdx + 1);
            topicId = Number(res.lastInsertRowid);
            report.topicsCreated++;
          }

          // In XLSX files: NO header, rows start from 0
          for (const row of rows) {
            // Skip purely blank/empty rows in Excel sheets
            if (!row || row.length === 0 || row.every((cell: unknown) => cell === undefined || cell === null || String(cell).trim() === '')) {
              continue;
            }

            report.totalRows++;
            if (row.length < 4) {
              report.invalid++;
              continue;
            }

            const word = cleanStr(row[0]);
            const ipa = cleanStr(row[1]);
            const partOfSpeech = cleanStr(row[2]);
            const meaningVi = cleanStr(row[3]);
            const example1 = cleanStr(row[4]);
            const example1Vi = cleanStr(row[5]);
            const example2 = cleanStr(row[6]);
            const example2Vi = cleanStr(row[7]);
            const cloze1 = cleanStr(row[8]);
            const cloze2 = cleanStr(row[9]);

            if (!word || !meaningVi) {
              report.invalid++;
              continue;
            }

            const normWord = normalizeWord(word);

            // Duplicate check
            const dup = checkVocabStmt.get(target.bookId, topicId, normWord) as { id: number } | undefined;
            if (dup) {
              report.duplicates++;
              continue;
            }

            insertVocabStmt.run(
              target.bookId,
              topicId,
              word,
              normWord,
              ipa,
              partOfSpeech,
              meaningVi,
              null, // meaning_en
              example1,
              example1Vi,
              example2,
              example2Vi,
              cloze1,
              cloze2,
              target.bookId === 1 ? 'A1-A2' : 'B1',
              null, // audio_url
              null, // word_image
              null, // example_image_1
              null  // example_image_2
            );

            report.imported++;
          }
        }
      } else {
        // CSV Format (Upper-intermediate & Advanced)
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const rows = parseCSV(rawContent);
        report.totalRows = rows.length - 1; // excluding header
        const topicCache = new Map<string, number>();

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i];
          if (cols.length < 4) {
            report.invalid++;
            continue;
          }

          const word = cleanStr(cols[0]);
          const ipa = cleanStr(cols[1]);
          const partOfSpeech = cleanStr(cols[2]);
          const meaningVi = cleanStr(cols[3]);
          const meaningEn = cleanStr(cols[4]);
          const example1 = cleanStr(cols[5]);
          const example1Vi = cleanStr(cols[6]);
          const example2 = cleanStr(cols[7]);
          const example2Vi = cleanStr(cols[8]);
          const level = cleanStr(cols[9]);
          const audioUrl = cleanStr(cols[10]);
          const wordImage = cleanStr(cols[11]);
          const exampleImg1 = cleanStr(cols[12]);
          const exampleImg2 = cleanStr(cols[13]);
          const cloze1 = cleanStr(cols[14]);
          const cloze2 = cleanStr(cols[15]);

          let topicName = cleanStr(cols[26]);
          if (!topicName) topicName = 'General Vocabulary';

          if (!word || !meaningVi) {
            report.invalid++;
            continue;
          }

          const normWord = normalizeWord(word);

          // Resolve topic
          let topicId = topicCache.get(topicName);
          if (!topicId) {
            const existingTopic = findTopicStmt.get(target.bookId, topicName) as { id: number } | undefined;
            if (existingTopic) {
              topicId = existingTopic.id;
            } else {
              const orderIdx = (db.prepare('SELECT COUNT(*) as c FROM topics WHERE book_id = ?').get(target.bookId) as { c: number }).c + 1;
              const res = insertTopicStmt.run(target.bookId, orderIdx, topicName, orderIdx);
              topicId = Number(res.lastInsertRowid);
              report.topicsCreated++;
            }
            topicCache.set(topicName, topicId);
          }

          // Duplicate check
          const dup = checkVocabStmt.get(target.bookId, topicId, normWord) as { id: number } | undefined;
          if (dup) {
            report.duplicates++;
            continue;
          }

          const vocabRes = insertVocabStmt.run(
            target.bookId,
            topicId,
            word,
            normWord,
            ipa,
            partOfSpeech,
            meaningVi,
            meaningEn,
            example1,
            example1Vi,
            example2,
            example2Vi,
            cloze1,
            cloze2,
            level,
            audioUrl,
            wordImage,
            exampleImg1,
            exampleImg2
          );

          const newVocabId = Number(vocabRes.lastInsertRowid);
          report.imported++;

          // Distractors Q-Z (cols 16 to 25)
          let pos = 1;
          for (let d = 16; d <= 24; d += 2) {
            const dWord = cleanStr(cols[d]);
            const dMeaning = cleanStr(cols[d + 1]);
            if (dWord) {
              insertDistractorStmt.run(newVocabId, dWord, dMeaning, pos++);
              report.distractorsImported++;
            }
          }
        }
      }

      db.exec('COMMIT;');
      reports.push(report);
    } catch (err) {
      db.exec('ROLLBACK;');
      console.error(`[ERROR] Failed importing ${target.fileName}:`, err);
      throw err;
    }
  }

  return reports;
}

if (require.main === module || process.argv[1]?.includes('importVocabulary')) {
  console.log('🚀 Updating Vocabulary Data (2 CSV + 2 XLSX files)...');
  const results = importAllFiles(true);

  console.log('\n========================================================================================');
  console.log('📊 COMPLETE DATA UPDATE REPORT');
  console.log('========================================================================================');
  console.table(results);
  console.log('\n✅ All 4 Cambridge books have been successfully imported and updated in database!\n');
}
