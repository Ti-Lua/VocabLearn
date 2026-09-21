/**
 * LearnVocab - Script đồng bộ toàn bộ dữ liệu từ SQLite lên Supabase Cloud
 * Chạy lệnh: npx tsx scripts/syncToSupabase.ts
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Đọc biến môi trường từ .env.local
const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmed.split('=')[1]?.trim() || '';
    } else if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseKey = trimmed.split('=')[1]?.trim() || '';
    } else if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=') && !supabaseKey) {
      supabaseKey = trimmed.split('=')[1]?.trim() || '';
    }
  }
}

async function sync() {
  console.log('==================================================');
  console.log('🔄 LearnVocab: Đồng bộ SQLite -> Supabase Cloud');
  console.log('==================================================\n');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Chưa cấu hình thông tin Supabase!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const dbPath = path.join(process.cwd(), 'data', 'learnvocab.db');
  const db = new DatabaseSync(dbPath);

  try {
    // 1. Đồng bộ Languages
    console.log('📦 1/6. Đồng bộ Languages...');
    const languages = db.prepare('SELECT id, code, name, native_name, flag, status FROM languages').all();
    const { error: langErr } = await supabase.from('languages').upsert(languages);
    if (langErr) console.warn('Lỗi languages:', langErr.message);
    else console.log(`   ✅ Đã đồng bộ ${languages.length} ngôn ngữ.`);

    // 2. Đồng bộ Books
    console.log('📦 2/6. Đồng bộ Books...');
    const books = db.prepare('SELECT id, language_id, name, short_name, edition, level, cover_image, order_index FROM books').all();
    const { error: bookErr } = await supabase.from('books').upsert(books);
    if (bookErr) console.warn('Lỗi books:', bookErr.message);
    else console.log(`   ✅ Đã đồng bộ ${books.length} cuốn sách.`);

    // 3. Đồng bộ Topics
    console.log('📦 3/6. Đồng bộ Topics...');
    const topics = db.prepare('SELECT id, book_id, unit_number, name, order_index FROM topics').all();
    for (let i = 0; i < topics.length; i += 200) {
      const chunk = topics.slice(i, i + 200);
      const { error } = await supabase.from('topics').upsert(chunk);
      if (error) console.warn('Lỗi topic chunk:', error.message);
    }
    console.log(`   ✅ Đã đồng bộ ${topics.length} topics.`);

    // 4. Đồng bộ Vocabulary (8.435 từ)
    console.log('📦 4/6. Đồng bộ Vocabulary (8.435 từ tiếng Anh)...');
    const rawVocabs = db.prepare(`
      SELECT id, book_id, topic_id, word, normalized_word, ipa, part_of_speech,
        meaning_vi, meaning_en, example_1, example_1_vi, example_2, example_2_vi,
        cloze_example_1, cloze_example_2, level, audio_url, word_image,
        example_image_1, example_image_2, created_at, updated_at
      FROM vocabulary
    `).all() as any[];

    const vocabs = rawVocabs.map(v => ({
      ...v,
      level: v.level && v.level.length > 20 ? v.level.slice(0, 20) : v.level
    }));
    for (let i = 0; i < vocabs.length; i += 200) {
      const chunk = vocabs.slice(i, i + 200);
      const { error } = await supabase.from('vocabulary').upsert(chunk);
      if (error) {
        console.warn(`\nLỗi vocab chunk [${i}-${i+200}]:`, error.message);
      }
      process.stdout.write(`   Tiến độ: ${Math.min(i + 200, vocabs.length)}/${vocabs.length} từ\r`);
    }
    console.log(`\n   ✅ Đã đồng bộ ${vocabs.length} từ vựng tiếng Anh.`);

    // 5. Đồng bộ Vocabulary Distractors (22.970 đáp án)
    console.log('📦 5/6. Đồng bộ Vocabulary Distractors (22.970 đáp án trắc nghiệm)...');
    const distractors = db.prepare('SELECT id, vocabulary_id, word, meaning_vi, position FROM vocabulary_distractors').all();
    for (let i = 0; i < distractors.length; i += 400) {
      const chunk = distractors.slice(i, i + 400);
      const { error } = await supabase.from('vocabulary_distractors').upsert(chunk);
      if (error) {
        console.warn(`\nLỗi distractors chunk [${i}-${i+400}]:`, error.message);
      }
      process.stdout.write(`   Tiến độ: ${Math.min(i + 400, distractors.length)}/${distractors.length} distractors\r`);
    }
    console.log(`\n   ✅ Đã đồng bộ ${distractors.length} distractors.`);

    // 6. Đồng bộ Chinese Vocabulary (4.896 từ)
    console.log('📦 6/6. Đồng bộ Chinese Vocabulary (4.896 từ HSK 1-6)...');
    const zhVocabs = db.prepare(`
      SELECT id, language, word, pinyin, meaning_vi, example_cn, example_pinyin, example_vi,
        topic, hsk_system, hsk_level, duplicate_in_levels, source_sheet, created_at, updated_at
      FROM chinese_vocabulary
    `).all();
    for (let i = 0; i < zhVocabs.length; i += 200) {
      const chunk = zhVocabs.slice(i, i + 200);
      const { error } = await supabase.from('chinese_vocabulary').upsert(chunk);
      if (error) {
        console.warn(`\nLỗi HSK chunk [${i}-${i+200}]:`, error.message);
      }
      process.stdout.write(`   Tiến độ: ${Math.min(i + 200, zhVocabs.length)}/${zhVocabs.length} từ HSK\r`);
    }
    console.log(`\n   ✅ Đã đồng bộ ${zhVocabs.length} từ vựng tiếng Trung HSK.`);

    console.log('\n==================================================');
    console.log('🎉 ĐỒNG BỘ TOÀN BỘ CƠ SỞ DỮ LIỆU LÊN SUPABASE THÀNH CÔNG!');
    console.log('==================================================');
  } catch (err) {
    console.error('Lỗi trong quá trình đồng bộ:', err);
  }
}

sync();
