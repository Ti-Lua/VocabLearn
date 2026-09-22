/**
 * Migration Script: Chuyển toàn bộ tiến độ cũ từ SQLite sang Supabase Cloud
 * Dành cho Personal Profile ID: 85c97771-538f-4532-a970-c9c9d82babe2
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { PERSONAL_PROFILE_ID } from '../src/config/personal';

const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1]?.trim() || '';
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = trimmed.split('=')[1]?.trim() || '';
  }
}

async function migrate() {
  console.log('==================================================');
  console.log('🔄 BẮT ĐẦU MIGRATION TIẾN ĐỘ TỪ SQLITE SANG SUPABASE');
  console.log(`👤 Target Personal Profile: ${PERSONAL_PROFILE_ID}`);
  console.log('==================================================');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Thiếu Supabase credentials!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const dbPath = path.join(process.cwd(), 'data', 'learnvocab.db');

  if (!fs.existsSync(dbPath)) {
    console.log('Không tìm thấy file SQLite data/learnvocab.db');
    return;
  }

  const db = new DatabaseSync(dbPath);

  // Đọc toàn bộ tiến độ trong SQLite
  const sqliteProgress = db.prepare(`
    SELECT * FROM user_vocabulary_progress ORDER BY id ASC
  `).all() as any[];

  console.log(`📦 Tìm thấy ${sqliteProgress.length} bản ghi tiến độ trong SQLite.`);

  if (sqliteProgress.length === 0) {
    console.log('Không có tiến độ cần migrate.');
    return;
  }

  // Gom các từ, ưu tiên status 'mastered' nếu có trùng
  const progressMap = new Map<number, any>();
  for (const row of sqliteProgress) {
    const vocabId = row.vocabulary_id;
    const existing = progressMap.get(vocabId);
    if (!existing || row.status === 'mastered') {
      progressMap.set(vocabId, {
        user_id: PERSONAL_PROFILE_ID,
        vocabulary_id: vocabId,
        status: row.status === 'known' ? 'mastered' : row.status,
        correct_count: row.correct_count || 1,
        wrong_count: row.wrong_count || 0,
        review_count: row.review_count || 0,
        last_reviewed_at: row.last_reviewed_at || new Date().toISOString(),
        next_review_at: row.next_review_at || null,
        updated_at: new Date().toISOString(),
      });
    }
  }

  const recordsToInsert = Array.from(progressMap.values());
  console.log(`🚀 Chuẩn bị upsert ${recordsToInsert.length} bản ghi sang Supabase...`);

  for (const record of recordsToInsert) {
    const { error } = await supabase
      .from('user_vocabulary_progress')
      .upsert(record, { onConflict: 'user_id,vocabulary_id' });

    if (error) {
      console.error(`❌ Lỗi khi chuyển từ ${record.vocabulary_id}:`, error.message);
    } else {
      console.log(`✅ Đã chuyển thành công từ ID ${record.vocabulary_id} (status: ${record.status})`);
    }
  }

  // Cập nhật lại user_stats
  const masteredCount = recordsToInsert.filter(r => r.status === 'mastered').length;
  const learningCount = recordsToInsert.filter(r => r.status === 'learning').length;
  const reviewCount = recordsToInsert.filter(r => r.status === 'review').length;

  await supabase.from('user_stats').upsert({
    user_id: PERSONAL_PROFILE_ID,
    total_words_mastered: masteredCount,
    total_words_learned: masteredCount + learningCount + reviewCount,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  console.log('==================================================');
  console.log(`🎉 MIGRATION HOÀN TẤT! Đã đồng bộ ${recordsToInsert.length} từ sang Supabase.`);
  console.log('==================================================');
}

migrate().catch(console.error);
