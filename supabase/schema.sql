-- LearnVocab by Tí Lửa - Supabase Schema
-- Compatible with PostgreSQL 15+ and Supabase Auth & Storage

-- 1. Languages Table
CREATE TABLE IF NOT EXISTS languages (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  native_name VARCHAR(50) NOT NULL,
  flag VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'coming_soon'))
);

-- 2. Books Table (4 Cambridge Vocabulary in Use books)
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

-- 4. Vocabulary Table
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

-- 6. User Vocabulary Progress Table
CREATE TABLE IF NOT EXISTS user_vocabulary_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'learning', 'mastered', 'review')),
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_vocabulary UNIQUE (user_id, vocabulary_id)
);

-- 7. Exercise Attempts Table
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

-- 8. Study Sessions Table
CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  mode VARCHAR(50) NOT NULL CHECK (mode IN ('learn', 'practice', 'test', 'review')),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL, -- seconds
  words_seen INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0
);

-- 9. User Topic Progress Table
CREATE TABLE IF NOT EXISTS user_topic_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  best_test_score REAL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  CONSTRAINT unique_user_topic UNIQUE (user_id, topic_id)
);

-- Indexes for maximum performance
CREATE INDEX IF NOT EXISTS idx_vocab_book_topic ON vocabulary (book_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_vocab_norm_word ON vocabulary (normalized_word);
CREATE INDEX IF NOT EXISTS idx_user_vocab_prog ON user_vocabulary_progress (user_id, vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_user_vocab_status ON user_vocabulary_progress (user_id, status);
CREATE INDEX IF NOT EXISTS idx_distractors_vocab ON vocabulary_distractors (vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_user ON exercise_attempts (user_id, vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions (user_id, started_at);

-- Row Level Security (RLS)
ALTER TABLE user_vocabulary_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topic_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own vocab progress" ON user_vocabulary_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own attempts" ON exercise_attempts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sessions" ON study_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own topic progress" ON user_topic_progress
  FOR ALL USING (auth.uid() = user_id);
