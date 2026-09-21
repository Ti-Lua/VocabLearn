-- LearnVocab by Tí Lửa - Supabase Schema
-- Compatible with PostgreSQL 15+ and Supabase Auth, Storage & Row Level Security

-- 1. Languages Table
CREATE TABLE IF NOT EXISTS languages (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  native_name VARCHAR(50) NOT NULL,
  flag VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'coming_soon'))
);

-- 2. Books Table (Cambridge Vocabulary in Use)
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100) NOT NULL,
  edition VARCHAR(50),
  level VARCHAR(50) NOT NULL,
  cover_image TEXT,
  order_index INTEGER NOT NULL
);

-- 3. Topics Table
CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  unit_number INTEGER,
  name VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL
);

-- 4. Vocabulary Table (English)
CREATE TABLE IF NOT EXISTS vocabulary (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  word VARCHAR(255) NOT NULL,
  normalized_word VARCHAR(255) NOT NULL,
  ipa VARCHAR(255),
  part_of_speech VARCHAR(100),
  meaning_vi TEXT NOT NULL,
  meaning_en TEXT,
  example_1 TEXT,
  example_1_vi TEXT,
  example_2 TEXT,
  example_2_vi TEXT,
  cloze_example_1 TEXT,
  cloze_example_2 TEXT,
  level VARCHAR(20),
  audio_url TEXT,
  word_image TEXT,
  example_image_1 TEXT,
  example_image_2 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_book_topic_word UNIQUE (book_id, topic_id, normalized_word)
);

-- 5. Vocabulary Distractors Table
CREATE TABLE IF NOT EXISTS vocabulary_distractors (
  id SERIAL PRIMARY KEY,
  vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  word VARCHAR(255) NOT NULL,
  meaning_vi TEXT,
  position INTEGER NOT NULL
);

-- 6. Chinese Vocabulary Table (HSK 1 - 6)
CREATE TABLE IF NOT EXISTS chinese_vocabulary (
  id VARCHAR(50) PRIMARY KEY,
  language VARCHAR(10) NOT NULL DEFAULT 'zh',
  word VARCHAR(100) NOT NULL,
  pinyin VARCHAR(100) NOT NULL,
  meaning_vi TEXT NOT NULL,
  example_cn TEXT,
  example_pinyin TEXT,
  example_vi TEXT,
  topic VARCHAR(100) NOT NULL,
  hsk_system VARCHAR(50),
  hsk_level INTEGER NOT NULL,
  duplicate_in_levels TEXT,
  source_sheet VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. User Vocabulary Progress Table
CREATE TABLE IF NOT EXISTS user_vocabulary_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'learning', 'mastered', 'review')),
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  mastery_score INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_vocabulary UNIQUE (user_id, vocabulary_id)
);

-- 8. User Chinese Progress Table
CREATE TABLE IF NOT EXISTS user_chinese_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id VARCHAR(50) NOT NULL REFERENCES chinese_vocabulary(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'learning', 'mastered', 'review_later')),
  mastery_level INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_zh_vocabulary UNIQUE (user_id, vocabulary_id)
);

-- 9. User Topic Progress Table
CREATE TABLE IF NOT EXISTS user_topic_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  total_words INTEGER DEFAULT 0,
  learned_words INTEGER DEFAULT 0,
  mastered_words INTEGER DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  last_vocab_id INTEGER,
  last_studied_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  best_test_score REAL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  CONSTRAINT unique_user_topic UNIQUE (user_id, topic_id)
);

-- 10. User Aggregated Stats Table
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_words_learned INTEGER DEFAULT 0,
  total_words_mastered INTEGER DEFAULT 0,
  total_topics_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_learning_minutes INTEGER DEFAULT 0,
  last_learning_date DATE,
  last_book_id INTEGER,
  last_topic_id INTEGER,
  last_vocab_id INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Study Sessions Table
CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_id INTEGER NOT NULL DEFAULT 1,
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  mode VARCHAR(50) NOT NULL CHECK (mode IN ('learn', 'practice', 'test', 'review')),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL,
  words_seen INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0
);

-- 12. Exercise Attempts Table
CREATE TABLE IF NOT EXISTS exercise_attempts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  exercise_type VARCHAR(50) NOT NULL,
  selected_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- High Performance Indexes
CREATE INDEX IF NOT EXISTS idx_vocab_topic_id ON vocabulary (topic_id);
CREATE INDEX IF NOT EXISTS idx_vocab_book_id ON vocabulary (book_id);
CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabulary (word);
CREATE INDEX IF NOT EXISTS idx_distractors_vocab ON vocabulary_distractors (vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_topics_book_id ON topics (book_id);

CREATE INDEX IF NOT EXISTS idx_user_vocab_prog ON user_vocabulary_progress (user_id, vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_user_vocab_status ON user_vocabulary_progress (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_vocab_next_rev ON user_vocabulary_progress (user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_user_topic_prog ON user_topic_progress (user_id, topic_id);

CREATE INDEX IF NOT EXISTS idx_zh_vocab_level ON chinese_vocabulary (hsk_level);
CREATE INDEX IF NOT EXISTS idx_zh_vocab_topic ON chinese_vocabulary (topic);
CREATE INDEX IF NOT EXISTS idx_user_zh_prog ON user_chinese_progress (user_id, vocabulary_id);

-- Row Level Security (RLS)
ALTER TABLE user_vocabulary_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chinese_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own vocab progress" ON user_vocabulary_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own zh progress" ON user_chinese_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own topic progress" ON user_topic_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own stats" ON user_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own attempts" ON exercise_attempts FOR ALL USING (auth.uid() = user_id);

-- Public Read Policies for content
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_distractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE chinese_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read languages" ON languages FOR SELECT USING (true);
CREATE POLICY "Public read books" ON books FOR SELECT USING (true);
CREATE POLICY "Public read topics" ON topics FOR SELECT USING (true);
CREATE POLICY "Public read vocabulary" ON vocabulary FOR SELECT USING (true);
CREATE POLICY "Public read distractors" ON vocabulary_distractors FOR SELECT USING (true);
CREATE POLICY "Public read chinese vocab" ON chinese_vocabulary FOR SELECT USING (true);
