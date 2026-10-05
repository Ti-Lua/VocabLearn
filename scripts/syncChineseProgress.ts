/**
 * Script đồng bộ toàn bộ tiến độ học tiếng Trung từ SQLite sang Supabase Cloud
 * Chạy lệnh: npx tsx scripts/syncChineseProgress.ts
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { PROFILES } from '../src/config/personal';

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

async function syncAllChinese() {
  console.log('=== ĐỒNG BỘ TIẾN ĐỘ HỌC TIẾNG TRUNG SANG SUPABASE ===');
  if (!supabaseUrl || !supabaseKey) {
    console.error('Thiếu Supabase credentials!');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const dbPath = path.join(process.cwd(), 'data', 'learnvocab.db');
  if (!fs.existsSync(dbPath)) {
    console.log('Không tìm thấy learnvocab.db');
    return;
  }

  const db = new DatabaseSync(dbPath);
  const rows = db.prepare('SELECT * FROM user_chinese_progress').all() as any[];
  console.log(`Tìm thấy ${rows.length} bản ghi user_chinese_progress trong SQLite.`);

  // Lấy danh sách user_id hợp lệ trong auth.users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const validUserIds = new Set((authUsers?.users || []).map(u => u.id));
  console.log(`Có ${validUserIds.size} auth users hợp lệ trên Supabase.`);

  let synced = 0;
  for (const r of rows) {
    // Nếu user_id cũ không nằm trong auth.users, map sang profile Tí Lửa hoặc Tí Điệu
    let targetUserId = r.user_id;
    if (!validUserIds.has(targetUserId)) {
      targetUserId = PROFILES.tilua.id; // Map các bản ghi test cũ sang Tí Lửa
    }

    const { error } = await supabase.from('user_chinese_progress').upsert({
      user_id: targetUserId,
      vocabulary_id: r.vocabulary_id,
      status: r.status,
      mastery_level: r.mastery_level || (r.status === 'mastered' ? 5 : 2),
      review_count: r.review_count || 1,
      correct_count: r.correct_count || 1,
      incorrect_count: r.incorrect_count || 0,
      last_reviewed_at: r.last_reviewed_at || new Date().toISOString(),
      next_review_at: r.next_review_at || null,
      updated_at: r.updated_at || new Date().toISOString(),
    }, { onConflict: 'user_id,vocabulary_id' });

    if (error) {
      console.warn(`Lỗi sync từ ${r.vocabulary_id}:`, error.message);
    } else {
      synced++;
    }
  }

  console.log(`✅ Đã đồng bộ thành công ${synced}/${rows.length} từ vựng tiếng Trung lên Supabase Cloud!`);

  // Kiểm tra lại trên Supabase
  const { count } = await supabase.from('user_chinese_progress').select('*', { count: 'exact', head: true });
  console.log(`Tổng số bản ghi user_chinese_progress hiện tại trên Supabase: ${count}`);
}

syncAllChinese().catch(console.error);
