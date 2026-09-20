/**
 * Script to import Chinese HSK 1-6 vocabulary from HSK1-HSK6_CLEAN_WEB_READY.xlsx
 * ONLY reads sheet 'IMPORT_READY' (exactly 4,896 unique records).
 * Uses UPSERT on id. Safe to run multiple times without duplicating data.
 */

import path from 'node:path';
import fs from 'node:fs';
import * as xlsx from 'xlsx';
import { getDb } from '../src/lib/db';

interface ImportRow {
  id?: string;
  word?: string;
  pinyin?: string;
  meaning_vi?: string;
  example_cn?: string;
  example_pinyin?: string;
  example_vi?: string;
  topic?: string;
  hsk_system?: string;
  hsk_level?: number | string;
  duplicate_in_levels?: string;
  source_sheet?: string;
}

export function importHskVocabulary(excelPath?: string) {
  const filePath = excelPath || path.join(process.cwd(), 'HSK1-HSK6_CLEAN_WEB_READY.xlsx');

  console.log('====================================================');
  console.log('🇨🇳 BẮT ĐẦU IMPORT TỪ VỰNG TIẾNG TRUNG HSK 1 - 6');
  console.log(`📁 Đường dẫn file: ${filePath}`);
  console.log('====================================================');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file Excel tại: ${filePath}`);
  }

  const workbook = xlsx.readFile(filePath);
  const sheetName = 'IMPORT_READY';

  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet '${sheetName}' không tồn tại trong file Excel! Các sheet hiện có: ${workbook.SheetNames.join(', ')}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json<ImportRow>(sheet, { defval: '' });

  console.log(`📊 Tổng số dòng đọc được từ sheet '${sheetName}': ${rawRows.length}`);

  const db = getDb();

  // Check initial count
  const initialCountRow = db.prepare('SELECT COUNT(*) as cnt FROM chinese_vocabulary').get() as { cnt: number };
  const initialCount = initialCountRow.cnt;

  // Prepare UPSERT statement
  const upsertStmt = db.prepare(`
    INSERT INTO chinese_vocabulary (
      id, language, word, pinyin, meaning_vi, example_cn, example_pinyin, example_vi,
      topic, hsk_system, hsk_level, duplicate_in_levels, source_sheet, created_at, updated_at
    ) VALUES (
      ?, 'zh', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      word = excluded.word,
      pinyin = excluded.pinyin,
      meaning_vi = excluded.meaning_vi,
      example_cn = excluded.example_cn,
      example_pinyin = excluded.example_pinyin,
      example_vi = excluded.example_vi,
      topic = excluded.topic,
      hsk_system = excluded.hsk_system,
      hsk_level = excluded.hsk_level,
      duplicate_in_levels = excluded.duplicate_in_levels,
      source_sheet = excluded.source_sheet,
      updated_at = datetime('now');
  `);

  // Check existing ID statement to distinguish insert vs update
  const checkExistsStmt = db.prepare('SELECT id FROM chinese_vocabulary WHERE id = ?');

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // Run in Transaction
  db.exec('BEGIN TRANSACTION;');

  try {
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      // Trim all string fields
      const id = typeof row.id === 'string' ? row.id.trim() : (row.id ? String(row.id).trim() : '');
      const word = typeof row.word === 'string' ? row.word.trim() : (row.word ? String(row.word).trim() : '');
      const pinyin = typeof row.pinyin === 'string' ? row.pinyin.trim() : (row.pinyin ? String(row.pinyin).trim() : '');
      const meaning_vi = typeof row.meaning_vi === 'string' ? row.meaning_vi.trim() : (row.meaning_vi ? String(row.meaning_vi).trim() : '');
      const example_cn = typeof row.example_cn === 'string' ? row.example_cn.trim() : (row.example_cn ? String(row.example_cn).trim() : '');
      const example_pinyin = typeof row.example_pinyin === 'string' ? row.example_pinyin.trim() : (row.example_pinyin ? String(row.example_pinyin).trim() : '');
      const example_vi = typeof row.example_vi === 'string' ? row.example_vi.trim() : (row.example_vi ? String(row.example_vi).trim() : '');
      const topic = typeof row.topic === 'string' ? row.topic.trim() : (row.topic ? String(row.topic).trim() : 'Khái niệm trừu tượng & Khác');
      const hsk_system = typeof row.hsk_system === 'string' ? row.hsk_system.trim() : (row.hsk_system ? String(row.hsk_system).trim() : 'HSK 2.0 (6 cấp)');
      const duplicate_in_levels = typeof row.duplicate_in_levels === 'string' ? row.duplicate_in_levels.trim() : (row.duplicate_in_levels ? String(row.duplicate_in_levels).trim() : '');
      const source_sheet = typeof row.source_sheet === 'string' ? row.source_sheet.trim() : (row.source_sheet ? String(row.source_sheet).trim() : '');

      // Parse and validate hsk_level
      const hskLevelNum = typeof row.hsk_level === 'number' ? row.hsk_level : parseInt(String(row.hsk_level).trim(), 10);

      // Skip completely empty rows
      if (!id && !word) {
        skipped++;
        continue;
      }

      // Validation
      if (!id) {
        console.warn(`[Dòng ${i + 2}] Bỏ qua vì thiếu trường 'id':`, row);
        failed++;
        continue;
      }

      if (!word) {
        console.warn(`[Dòng ${i + 2}] Bỏ qua vì thiếu trường 'word' (id: ${id})`);
        failed++;
        continue;
      }

      if (isNaN(hskLevelNum) || hskLevelNum < 1 || hskLevelNum > 6) {
        console.warn(`[Dòng ${i + 2}] HSK level không hợp lệ (${row.hsk_level}) cho id: ${id}`);
        failed++;
        continue;
      }

      const existing = checkExistsStmt.get(id);
      if (existing) {
        updated++;
      } else {
        inserted++;
      }

      upsertStmt.run(
        id,
        word,
        pinyin,
        meaning_vi,
        example_cn,
        example_pinyin,
        example_vi,
        topic,
        hsk_system,
        hskLevelNum,
        duplicate_in_levels,
        source_sheet
      );
    }

    db.exec('COMMIT;');
    console.log('✅ Đã COMMIT transaction thành công.');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('❌ Lỗi khi import, đã ROLLBACK:', err);
    throw err;
  }

  // Final verification
  const finalCountRow = db.prepare('SELECT COUNT(*) as cnt FROM chinese_vocabulary').get() as { cnt: number };
  const finalCount = finalCountRow.cnt;

  // Breakdown by HSK level
  const levelBreakdown = db.prepare(`
    SELECT hsk_level, COUNT(*) as count 
    FROM chinese_vocabulary 
    GROUP BY hsk_level 
    ORDER BY hsk_level ASC
  `).all() as { hsk_level: number; count: number }[];

  // Distinct topics
  const distinctTopicsRow = db.prepare('SELECT COUNT(DISTINCT topic) as count FROM chinese_vocabulary').get() as { count: number };

  console.log('====================================================');
  console.log('🎉 KẾT QUẢ IMPORT TỪ VỰNG TIẾNG TRUNG:');
  console.log(`- Ban đầu: ${initialCount} từ`);
  console.log(`- Đã thêm mới (inserted): ${inserted} từ`);
  console.log(`- Đã cập nhật (updated): ${updated} từ`);
  console.log(`- Bỏ qua (skipped): ${skipped}`);
  console.log(`- Thất bại (failed): ${failed}`);
  console.log(`- Tổng số từ tiếng Trung hiện tại: ${finalCount} từ`);
  console.log(`- Tổng số Topics phân loại: ${distinctTopicsRow.count} topics`);
  console.log('----------------------------------------------------');
  console.log('📊 Thống kê từng cấp HSK:');
  for (const lb of levelBreakdown) {
    console.log(`  • HSK ${lb.hsk_level}: ${lb.count} từ`);
  }
  console.log('====================================================');

  if (finalCount !== 4896) {
    console.warn(`⚠️ Cảnh báo: Tổng số từ tiếng Trung hiện là ${finalCount} (kỳ vọng: 4896)`);
  } else {
    console.log('✨ XÁC NHẬN HOÀN TẤT: ĐỦ 4,896 TỪ TIẾNG TRUNG DUY NHẤT!');
  }

  return {
    initialCount,
    inserted,
    updated,
    skipped,
    failed,
    finalCount,
    levelBreakdown,
  };
}

if (require.main === module) {
  try {
    importHskVocabulary();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
