/**
 * CLI Tool to generate and validate vocabulary illustration images
 * using the multi-step context-aware AI pipeline.
 *
 * Usage:
 *   npx tsx scripts/generateVocabImages.ts --word bank
 *   npx tsx scripts/generateVocabImages.ts --topic 483 --limit 3
 *   npx tsx scripts/generateVocabImages.ts --sample
 */

import { getDb } from '../src/lib/db';
import { runFullImagePipelineForVocab } from '../src/lib/vocabularyImagePipeline';

async function main() {
  const args = process.argv.slice(2);
  const db = getDb();

  let targetIds: number[] = [];

  const wordArgIdx = args.indexOf('--word');
  const topicArgIdx = args.indexOf('--topic');
  const limitArgIdx = args.indexOf('--limit');
  const limit = limitArgIdx !== -1 ? parseInt(args[limitArgIdx + 1], 10) : 5;

  if (wordArgIdx !== -1 && args[wordArgIdx + 1]) {
    const searchWord = args[wordArgIdx + 1].trim().toLowerCase();
    const rows = db
      .prepare('SELECT id, word, meaning_vi FROM vocabulary WHERE LOWER(word) LIKE ? LIMIT ?')
      .all(`%${searchWord}%`, limit) as { id: number; word: string; meaning_vi: string }[];

    if (rows.length === 0) {
      console.log(`[Error] Khong tim thay tu nao khop voi "${searchWord}".`);
      process.exit(1);
    }
    targetIds = rows.map((r) => r.id);
    console.log(`[Info] Tim thay ${rows.length} tu cho tu khoa "${searchWord}":`, rows.map((r) => `${r.word} (ID: ${r.id})`));
  } else if (topicArgIdx !== -1 && args[topicArgIdx + 1]) {
    const topicId = parseInt(args[topicArgIdx + 1], 10);
    const rows = db
      .prepare('SELECT id, word FROM vocabulary WHERE topic_id = ? LIMIT ?')
      .all(topicId, limit) as { id: number; word: string }[];

    if (rows.length === 0) {
      console.log(`[Error] Khong tim thay tu trong topic ID ${topicId}.`);
      process.exit(1);
    }
    targetIds = rows.map((r) => r.id);
    console.log(`[Info] Topic ${topicId}: Lay ${rows.length} tu:`, rows.map((r) => r.word));
  } else {
    // Default sample: Pick 5 diverse vocabulary items across categories
    console.log('[Info] Chay thu nghiem mau voi cac tu vung da dang ngu canh...');
    const sampleWords = ['aunt', 'bank', 'bargain', 'embarrassed', 'withdraw'];
    for (const w of sampleWords) {
      const row = db
        .prepare('SELECT id, word FROM vocabulary WHERE LOWER(word) = ? LIMIT 1')
        .get(w.toLowerCase()) as { id: number; word: string } | undefined;
      if (row) {
        targetIds.push(row.id);
      }
    }

    if (targetIds.length === 0) {
      const fallbackRows = db
        .prepare('SELECT id, word FROM vocabulary LIMIT 5')
        .all() as { id: number; word: string }[];
      targetIds = fallbackRows.map((r) => r.id);
    }
  }

  console.log(`\n============================================================`);
  console.log(`🚀 BAT DAU VOCABULARY IMAGE GENERATION & VALIDATION PIPELINE`);
  console.log(`Tong so tu se xu ly: ${targetIds.length}`);
  console.log(`============================================================\n`);

  const results = [];

  for (let i = 0; i < targetIds.length; i++) {
    const vocabId = targetIds[i];
    console.log(`\n[${i + 1}/${targetIds.length}] Dang xu ly tu ID: ${vocabId}...`);

    try {
      const result = await runFullImagePipelineForVocab(vocabId);
      results.push(result);

      console.log(`------------------------------------------------------------`);
      console.log(`✅ TU VUNG: "${result.word}"`);
      console.log(`   - ID: ${result.vocab_id}`);
      console.log(`   - So lan thu nghiem: ${result.attempts}`);
      console.log(`   - Ket qua tham dinh: ${result.validation.status} (Diem: ${result.validation.score}/100)`);
      console.log(`   - Nhan xet AI Validator: ${result.validation.reason}`);
      console.log(`   - Anh da luu: ${result.image_url}`);
      console.log(`   - Can review thu cong: ${result.needs_manual_review ? 'CO' : 'KHONG'}`);
      console.log(`\n   --- BƯỚC TRUNG GIAN (VISUAL CONCEPT) ---`);
      try {
        const parsed = JSON.parse(result.visual_concept);
        console.log(`   + Nghia su dung: ${parsed.word_sense_identified}`);
        console.log(`   + The loai: ${parsed.visual_category}`);
        console.log(`   + Tinh huong (3 giay): ${parsed.visual_scenario}`);
        console.log(`   + Tieu diem: ${parsed.primary_focal_element}`);
      } catch {
        console.log(`   + Concept: ${result.visual_concept}`);
      }
      console.log(`------------------------------------------------------------`);
    } catch (err: unknown) {
      console.error(`❌ Loi khi xu ly tu ID ${vocabId}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n============================================================`);
  console.log(`🎉 HOAN TAT TOAN BO! Da xu ly ${results.length}/${targetIds.length} tu.`);
  console.log(`============================================================\n`);
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
