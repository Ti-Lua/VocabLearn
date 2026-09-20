export type LanguageCode = 'en' | 'zh' | 'ja';

export interface Language {
  id: number;
  code: LanguageCode;
  name: string;
  native_name: string;
  flag: string;
  status: 'active' | 'coming_soon';
}

export interface Book {
  id: number;
  language_id: number;
  name: string;
  short_name: string;
  edition?: string | null;
  level: string;
  cover_image?: string | null;
  order_index: number;
  // Computed / aggregated fields
  total_topics?: number;
  completed_topics?: number;
  total_words?: number;
  mastered_words?: number;
  progress_percentage?: number;
}

export interface Topic {
  id: number;
  book_id: number;
  unit_number?: number | null;
  name: string;
  order_index: number;
  // Computed stats
  total_words?: number;
  mastered_words?: number;
  learning_words?: number;
  review_words?: number;
  new_words?: number;
  progress_percentage?: number;
  is_completed?: boolean;
  best_test_score?: number | null;
}

export interface Distractor {
  id?: number;
  vocabulary_id?: number;
  word: string;
  meaning_vi?: string | null;
  position: number;
}

export type WordStatus = 'new' | 'learning' | 'mastered' | 'review';

export interface Vocabulary {
  id: number;
  book_id: number;
  topic_id: number;
  word: string;
  normalized_word: string;
  ipa?: string | null;
  part_of_speech?: string | null;
  meaning_vi: string;
  meaning_en?: string | null;
  example_1?: string | null;
  example_1_vi?: string | null;
  example_2?: string | null;
  example_2_vi?: string | null;
  cloze_example_1?: string | null;
  cloze_example_2?: string | null;
  level?: string | null;
  audio_url?: string | null;
  word_image?: string | null;
  example_image_1?: string | null;
  example_image_2?: string | null;
  visual_concept?: string | null;
  image_validation_score?: number | null;
  image_validation_status?: 'pending' | 'passed' | 'failed' | 'manual_review' | null;
  image_validation_reason?: string | null;
  image_generation_attempts?: number;
  needs_manual_review?: boolean | number;
  created_at?: string;
  updated_at?: string;
  // User progress info (when joined)
  status?: WordStatus;
  correct_count?: number;
  wrong_count?: number;
  last_reviewed_at?: string | null;
  next_review_at?: string | null;
  distractors?: Distractor[];
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface UserVocabularyProgress {
  id?: number;
  user_id: string;
  vocabulary_id: number;
  status: WordStatus;
  correct_count: number;
  wrong_count: number;
  last_reviewed_at?: string | null;
  next_review_at?: string | null;
  updated_at?: string;
}

export type ExerciseType = 'fill_blank' | 'word_choice' | 'meaning_choice' | 'matching';

export interface ExerciseAttempt {
  id?: number;
  user_id: string;
  vocabulary_id: number;
  topic_id: number;
  book_id: number;
  exercise_type: ExerciseType;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  attempted_at?: string;
}

export interface StudySession {
  id?: number;
  user_id: string;
  language_id: number;
  book_id?: number | null;
  topic_id?: number | null;
  mode: 'learn' | 'practice' | 'test' | 'review';
  started_at: string;
  ended_at: string;
  duration: number; // in seconds
  words_seen: number;
  correct_answers: number;
  wrong_answers: number;
}

export interface Question {
  id: string;
  type: ExerciseType;
  vocabulary: Vocabulary;
  prompt: string;
  subPrompt?: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  matchingPairs?: { id: string; word: string; meaning: string }[];
}

export interface UserStatistics {
  totalWordsLearned: number;
  masteredWords: number;
  reviewWords: number;
  topicsCompleted: number;
  totalTopics: number;
  studyStreakDays: number;
  totalStudyTimeSeconds: number;
  overallAccuracy: number;
  booksProgress: {
    bookId: number;
    bookName: string;
    level: string;
    totalTopics: number;
    completedTopics: number;
    percentage: number;
  }[];
  mostMistakenWords: {
    vocabularyId: number;
    word: string;
    ipa?: string;
    meaning_vi: string;
    wrongCount: number;
    accuracy: number;
  }[];
  weakTopics: {
    topicId: number;
    topicName: string;
    bookName: string;
    accuracy: number;
  }[];
  weeklyActivity: { day: string; count: number; date: string }[];
}

export interface ArticleParagraph {
  en: string;
  vi: string;
}

export interface ArticleVocab {
  word: string;
  phonetic: string;
  part_of_speech: string;
  vi_meaning: string;
  context_sentence: string;
  explanation: string;
}

export interface Article {
  id: number;
  title_en: string;
  title_vi: string;
  summary_vi?: string | null;
  topic?: string | null;
  level?: string | null;
  reading_time_min: number;
  original_url?: string | null;
  source_name: string;
  published_date?: string | null;
  paragraphs: ArticleParagraph[];
  highlighted_vocab: ArticleVocab[];
  audio_url?: string | null;
  created_at?: string;
}

export type ChineseWordStatus = 'new' | 'learning' | 'mastered' | 'review_later';

export interface ChineseVocabulary {
  id: string;
  language: string;
  word: string;
  pinyin: string;
  meaning_vi: string;
  example_cn?: string | null;
  example_pinyin?: string | null;
  example_vi?: string | null;
  topic: string;
  hsk_system?: string | null;
  hsk_level: number;
  duplicate_in_levels?: string | null;
  source_sheet?: string | null;
  created_at?: string;
  updated_at?: string;
  // User progress info (when joined)
  status?: ChineseWordStatus;
  mastery_level?: number;
  review_count?: number;
  correct_count?: number;
  incorrect_count?: number;
  last_reviewed_at?: string | null;
  next_review_at?: string | null;
}

export interface UserChineseProgress {
  id: number;
  user_id: string;
  vocabulary_id: string;
  status: ChineseWordStatus;
  mastery_level: number;
  review_count: number;
  correct_count: number;
  incorrect_count: number;
  last_reviewed_at?: string | null;
  next_review_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChineseHskLevelStats {
  level: number;
  name: string;
  total_words: number;
  mastered_words: number;
  learning_words: number;
  review_later_words: number;
  new_words: number;
  progress_percentage: number;
  topics_count: number;
}

export interface ChineseTopicSummary {
  topic: string;
  hsk_level: number;
  total_words: number;
  mastered_words: number;
  learning_words: number;
  progress_percentage: number;
  is_completed: boolean;
}

export interface ChineseDashboardStats {
  total_words: number;
  words_mastered: number;
  words_learning: number;
  review_later: number;
  topics_completed: number;
  total_topics: number;
  overall_progress_percentage: number;
  levels: ChineseHskLevelStats[];
}
