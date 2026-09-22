import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

function getDatabasePath(): string {
  // Trên môi trường Serverless của Vercel (read-only filesystem), sao chép sang /tmp để có quyền ghi
  if (process.env.VERCEL) {
    const tmpDb = path.join('/tmp', 'learnvocab.db');
    if (!fs.existsSync(tmpDb)) {
      const srcDb = path.join(process.cwd(), 'data', 'learnvocab.db');
      if (fs.existsSync(srcDb)) {
        try {
          fs.copyFileSync(srcDb, tmpDb);
        } catch (e) {
          console.warn('Không thể sao chép db sang /tmp, sử dụng nguồn gốc:', e);
          return srcDb;
        }
      }
    }
    return tmpDb;
  }
  return path.join(process.cwd(), 'data', 'learnvocab.db');
}

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = getDatabasePath();
    dbInstance = new DatabaseSync(dbPath);
    try {
      dbInstance.exec('PRAGMA journal_mode = WAL;');
      dbInstance.exec('PRAGMA synchronous = NORMAL;');
      dbInstance.exec('PRAGMA cache_size = -64000;'); // 64MB memory page cache
      dbInstance.exec('PRAGMA temp_store = MEMORY;');
      dbInstance.exec('PRAGMA mmap_size = 268435456;'); // 256MB memory mapped I/O
      dbInstance.exec('PRAGMA foreign_keys = ON;');
      initSchema(dbInstance);
    } catch (e) {
      console.warn('SQLite PRAGMA/schema warning:', e);
    }
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS languages (
      id INTEGER PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      native_name TEXT NOT NULL,
      flag TEXT NOT NULL,
      status TEXT CHECK(status IN ('active', 'coming_soon')) DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY,
      language_id INTEGER NOT NULL REFERENCES languages(id),
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      edition TEXT,
      level TEXT NOT NULL,
      cover_image TEXT,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id),
      unit_number INTEGER,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vocabulary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id),
      topic_id INTEGER NOT NULL REFERENCES topics(id),
      word TEXT NOT NULL,
      normalized_word TEXT NOT NULL,
      ipa TEXT,
      part_of_speech TEXT,
      meaning_vi TEXT NOT NULL,
      meaning_en TEXT,
      example_1 TEXT,
      example_1_vi TEXT,
      example_2 TEXT,
      example_2_vi TEXT,
      cloze_example_1 TEXT,
      cloze_example_2 TEXT,
      level TEXT,
      audio_url TEXT,
      word_image TEXT,
      example_image_1 TEXT,
      example_image_2 TEXT,
      visual_concept TEXT,
      image_validation_score INTEGER,
      image_validation_status TEXT CHECK(image_validation_status IN ('pending', 'passed', 'failed', 'manual_review')) DEFAULT 'pending',
      image_validation_reason TEXT,
      image_generation_attempts INTEGER DEFAULT 0,
      needs_manual_review INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(book_id, topic_id, normalized_word)
    );

    CREATE TABLE IF NOT EXISTS vocabulary_distractors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      meaning_vi TEXT,
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_vocabulary_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id),
      status TEXT CHECK(status IN ('new', 'learning', 'mastered', 'review')) DEFAULT 'new',
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      last_reviewed_at TEXT,
      next_review_at TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, vocabulary_id)
    );

    CREATE TABLE IF NOT EXISTS exercise_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id),
      topic_id INTEGER NOT NULL REFERENCES topics(id),
      book_id INTEGER NOT NULL REFERENCES books(id),
      exercise_type TEXT NOT NULL,
      selected_answer TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      attempted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      language_id INTEGER NOT NULL DEFAULT 1,
      book_id INTEGER,
      topic_id INTEGER,
      mode TEXT CHECK(mode IN ('learn', 'practice', 'test', 'review')) NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      duration INTEGER NOT NULL,
      words_seen INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      wrong_answers INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_topic_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      topic_id INTEGER NOT NULL REFERENCES topics(id),
      is_completed INTEGER DEFAULT 0,
      best_test_score REAL DEFAULT 0,
      completed_at TEXT,
      UNIQUE(user_id, topic_id)
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_en TEXT NOT NULL,
      title_vi TEXT NOT NULL,
      summary_vi TEXT,
      topic TEXT,
      level TEXT,
      reading_time_min INTEGER DEFAULT 4,
      original_url TEXT UNIQUE,
      source_name TEXT DEFAULT 'BBC World News',
      published_date TEXT,
      paragraphs_json TEXT NOT NULL,
      highlighted_vocab_json TEXT NOT NULL,
      audio_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chinese_vocabulary (
      id TEXT PRIMARY KEY,
      language TEXT NOT NULL DEFAULT 'zh',
      word TEXT NOT NULL,
      pinyin TEXT NOT NULL,
      meaning_vi TEXT NOT NULL,
      example_cn TEXT,
      example_pinyin TEXT,
      example_vi TEXT,
      topic TEXT NOT NULL,
      hsk_system TEXT,
      hsk_level INTEGER NOT NULL,
      duplicate_in_levels TEXT,
      source_sheet TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_chinese_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      vocabulary_id TEXT NOT NULL REFERENCES chinese_vocabulary(id) ON DELETE CASCADE,
      status TEXT CHECK(status IN ('new', 'learning', 'mastered', 'review_later')) DEFAULT 'new',
      mastery_level INTEGER DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      last_reviewed_at TEXT,
      next_review_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, vocabulary_id)
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      total_words_learned INTEGER DEFAULT 0,
      total_words_mastered INTEGER DEFAULT 0,
      total_topics_completed INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      total_learning_minutes INTEGER DEFAULT 0,
      last_learning_date TEXT,
      last_book_id INTEGER,
      last_topic_id INTEGER,
      last_vocab_id INTEGER,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_articles_created ON articles (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_vocab_book_topic ON vocabulary (book_id, topic_id);
    CREATE INDEX IF NOT EXISTS idx_vocab_topic_id ON vocabulary (topic_id);
    CREATE INDEX IF NOT EXISTS idx_vocab_book_id ON vocabulary (book_id);
    CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabulary (word);
    CREATE INDEX IF NOT EXISTS idx_vocab_norm_word ON vocabulary (normalized_word);
    CREATE INDEX IF NOT EXISTS idx_topics_book_id ON topics (book_id);
    CREATE INDEX IF NOT EXISTS idx_user_vocab_prog ON user_vocabulary_progress (user_id, vocabulary_id);
    CREATE INDEX IF NOT EXISTS idx_user_vocab_status ON user_vocabulary_progress (user_id, status);
    CREATE INDEX IF NOT EXISTS idx_user_vocab_next_rev ON user_vocabulary_progress (user_id, next_review_at);
    CREATE INDEX IF NOT EXISTS idx_user_topic_prog_user ON user_topic_progress (user_id, topic_id);
    CREATE INDEX IF NOT EXISTS idx_distractors_vocab ON vocabulary_distractors (vocabulary_id);
    CREATE INDEX IF NOT EXISTS idx_exercise_attempts ON exercise_attempts (user_id, vocabulary_id);
    CREATE INDEX IF NOT EXISTS idx_study_sessions ON study_sessions (user_id, started_at);

    CREATE INDEX IF NOT EXISTS idx_zh_vocab_level ON chinese_vocabulary (hsk_level);
    CREATE INDEX IF NOT EXISTS idx_zh_vocab_topic ON chinese_vocabulary (topic);
    CREATE INDEX IF NOT EXISTS idx_zh_vocab_word ON chinese_vocabulary (word);
    CREATE INDEX IF NOT EXISTS idx_zh_vocab_level_topic ON chinese_vocabulary (hsk_level, topic);
    CREATE INDEX IF NOT EXISTS idx_user_zh_prog_user_vocab ON user_chinese_progress (user_id, vocabulary_id);
    CREATE INDEX IF NOT EXISTS idx_user_zh_prog_status ON user_chinese_progress (user_id, status);
  `);

  // Migration for user_topic_progress columns
  const topicProgCols = [
    'total_words INTEGER DEFAULT 0',
    'learned_words INTEGER DEFAULT 0',
    'mastered_words INTEGER DEFAULT 0',
    'progress_percent INTEGER DEFAULT 0',
    "status TEXT DEFAULT 'not_started'",
    'last_vocab_id INTEGER',
    'last_studied_at TEXT'
  ];
  for (const col of topicProgCols) {
    try {
      db.exec(`ALTER TABLE user_topic_progress ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Migration for user_vocabulary_progress columns
  const vocabProgCols = [
    'incorrect_count INTEGER DEFAULT 0',
    'review_count INTEGER DEFAULT 0',
    'mastery_score INTEGER DEFAULT 0'
  ];
  for (const col of vocabProgCols) {
    try {
      db.exec(`ALTER TABLE user_vocabulary_progress ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Migration for users columns
  const userCols = [
    'display_name TEXT',
    'last_login_at TEXT',
    'updated_at TEXT'
  ];
  for (const col of userCols) {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Migration for vocabulary image pipeline columns if not present
  const newCols = [
    'visual_concept TEXT',
    'image_validation_score INTEGER',
    'image_validation_status TEXT DEFAULT "pending"',
    'image_validation_reason TEXT',
    'image_generation_attempts INTEGER DEFAULT 0',
    'needs_manual_review INTEGER DEFAULT 0'
  ];
  for (const col of newCols) {
    try {
      db.exec(`ALTER TABLE vocabulary ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Seed languages
  const countLang = db.prepare('SELECT COUNT(*) as count FROM languages').get() as { count: number };
  if (countLang.count === 0) {
    const insertLang = db.prepare(`
      INSERT INTO languages (id, code, name, native_name, flag, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertLang.run(1, 'en', 'Tiếng Anh', 'English', '🇬🇧', 'active');
    insertLang.run(2, 'zh', 'Tiếng Trung', '中文', '🇨🇳', 'active');
    insertLang.run(3, 'ja', 'Tiếng Nhật', '日本語', '🇯🇵', 'coming_soon');
  } else {
    db.exec("UPDATE languages SET status = 'active' WHERE code = 'zh';");
  }

  // Seed books
  const countBooks = db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number };
  if (countBooks.count === 0) {
    const insertBook = db.prepare(`
      INSERT INTO books (id, language_id, name, short_name, edition, level, cover_image, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertBook.run(
      1,
      1,
      'English Vocabulary in Use Elementary',
      'Elementary',
      '3rd Edition',
      'A1-A2',
      '/covers/elementary.jpg',
      1
    );
    insertBook.run(
      2,
      1,
      'English Vocabulary in Use Pre-intermediate & Intermediate',
      'Pre-intermediate & Intermediate',
      '4th Edition',
      'B1',
      '/covers/pre-intermediate.jpg',
      2
    );
    insertBook.run(
      3,
      1,
      'English Vocabulary in Use Upper-intermediate',
      'Upper-intermediate',
      '4th Edition',
      'B2',
      '/covers/upper-intermediate.jpg',
      3
    );
    insertBook.run(
      4,
      1,
      'English Vocabulary in Use Advanced',
      'Advanced',
      '3rd Edition',
      'C1-C2',
      '/covers/advanced.jpg',
      4
    );
  }

  // Seed demo / personal users (Tí Lửa & Tí Điệu)
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('password123', salt);
  const insertUserStmt = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, username, password_hash, full_name, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUserStmt.run(
    '85c97771-538f-4532-a970-c9c9d82babe2',
    'demo@learnvocab.local',
    'tilua',
    hash,
    'Tí Lửa',
    'https://api.dicebear.com/7.x/bottts/svg?seed=tilua'
  );

  insertUserStmt.run(
    '5cd254c4-618e-4cb1-a09a-cb161a28a22a',
    'tidieu@learnvocab.local',
    'tidieu',
    hash,
    'Tí Điệu',
    'https://api.dicebear.com/7.x/bottts/svg?seed=tidieu'
  );

  // Backward compatibility for demo-user-id
  insertUserStmt.run(
    'demo-user-id',
    'demoid@learnvocab.local',
    'tilua_demo',
    hash,
    'Tí Lửa',
    'https://api.dicebear.com/7.x/bottts/svg?seed=tilua'
  );

  // Auto-import vocabulary if table is empty
  const vocabCount = db.prepare('SELECT COUNT(*) as count FROM vocabulary').get() as { count: number };
  if (vocabCount.count === 0) {
    try {
      // Dynamically import or require importAllFiles
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { importAllFiles } = require('../../scripts/importVocabulary');
      importAllFiles();
    } catch (e) {
      console.warn('Auto import skipped or already run:', e);
    }
  }
}
