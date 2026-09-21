import { getDb } from './db';
import { getSupabaseAdmin } from './supabase';
import {
  Book,
  Topic,
  Vocabulary,
  Distractor,
  WordStatus,
  ExerciseAttempt,
  StudySession,
  UserStatistics,
  Question,
  ExerciseType,
} from '@/types';

export function getLanguages() {
  const db = getDb();
  return db.prepare('SELECT * FROM languages ORDER BY id ASC').all();
}

export function getBooks(userId?: string, languageId?: number): Book[] {
  const db = getDb();
  let query = 'SELECT * FROM books';
  const params: (string | number)[] = [];
  if (languageId) {
    query += ' WHERE language_id = ?';
    params.push(languageId);
  }
  query += ' ORDER BY order_index ASC';
  const books = db.prepare(query).all(...params) as unknown as Book[];
  if (books.length === 0) return [];

  // 1. Lấy tổng số topic theo book_id trong 1 câu SQL duy nhất
  const topicCountRows = db.prepare(`
    SELECT book_id, COUNT(*) as count FROM topics GROUP BY book_id
  `).all() as { book_id: number; count: number }[];
  const topicCountMap = new Map<number, number>(topicCountRows.map((r) => [r.book_id, r.count]));

  // 2. Lấy tổng số từ theo book_id trong 1 câu SQL duy nhất
  const wordCountRows = db.prepare(`
    SELECT book_id, COUNT(*) as count FROM vocabulary GROUP BY book_id
  `).all() as { book_id: number; count: number }[];
  const wordCountMap = new Map<number, number>(wordCountRows.map((r) => [r.book_id, r.count]));

  const completedTopicsMap = new Map<number, number>();
  const masteredWordsMap = new Map<number, number>();

  if (userId) {
    // 3. Số topic hoàn thành của user gom theo book_id
    const completedRows = db.prepare(`
      SELECT t.book_id, COUNT(*) as count
      FROM user_topic_progress utp
      JOIN topics t ON utp.topic_id = t.id
      WHERE utp.user_id = ? AND utp.is_completed = 1
      GROUP BY t.book_id
    `).all(userId) as { book_id: number; count: number }[];
    for (const r of completedRows) completedTopicsMap.set(r.book_id, r.count);

    // 4. Số từ mastered của user gom theo book_id
    const masteredRows = db.prepare(`
      SELECT v.book_id, COUNT(*) as count
      FROM user_vocabulary_progress uvp
      JOIN vocabulary v ON uvp.vocabulary_id = v.id
      WHERE uvp.user_id = ? AND uvp.status = 'mastered'
      GROUP BY v.book_id
    `).all(userId) as { book_id: number; count: number }[];
    for (const r of masteredRows) masteredWordsMap.set(r.book_id, r.count);
  }

  return books.map((book) => {
    const totalTopics = topicCountMap.get(book.id) || 0;
    const completedTopics = completedTopicsMap.get(book.id) || 0;
    const totalWords = wordCountMap.get(book.id) || 0;
    const masteredWords = masteredWordsMap.get(book.id) || 0;
    const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return {
      ...book,
      total_topics: totalTopics,
      completed_topics: completedTopics,
      total_words: totalWords,
      mastered_words: masteredWords,
      progress_percentage: progressPercentage,
    };
  });
}

export function getBookById(bookId: number, userId?: string): Book | null {
  const books = getBooks(userId);
  const found = books.find((b) => b.id === bookId);
  return found || null;
}

export function getTopics(bookId: number, userId?: string): Topic[] {
  const db = getDb();
  const topics = db.prepare(`
    SELECT * FROM topics WHERE book_id = ? ORDER BY order_index ASC, id ASC
  `).all(bookId) as unknown as Topic[];

  if (topics.length === 0) return [];

  // 1. Gom số từ theo topic_id trong 1 câu truy vấn duy nhất
  const wordCountRows = db.prepare(`
    SELECT topic_id, COUNT(*) as count 
    FROM vocabulary 
    WHERE book_id = ? 
    GROUP BY topic_id
  `).all(bookId) as { topic_id: number; count: number }[];
  const wordCountMap = new Map<number, number>(wordCountRows.map((r) => [r.topic_id, r.count]));

  // 2. Gom tiến độ trạng thái từ của user theo topic_id
  const userVocabStatusMap = new Map<number, { mastered: number; learning: number; review: number }>();
  const userTopicProgressMap = new Map<number, { is_completed: boolean; best_test_score: number | null; last_vocab_id: number | null; status: string }>();

  if (userId) {
    const statusRows = db.prepare(`
      SELECT v.topic_id, uvp.status, COUNT(*) as count
      FROM user_vocabulary_progress uvp
      JOIN vocabulary v ON uvp.vocabulary_id = v.id
      WHERE uvp.user_id = ? AND v.book_id = ?
      GROUP BY v.topic_id, uvp.status
    `).all(userId, bookId) as { topic_id: number; status: string; count: number }[];

    for (const r of statusRows) {
      if (!userVocabStatusMap.has(r.topic_id)) {
        userVocabStatusMap.set(r.topic_id, { mastered: 0, learning: 0, review: 0 });
      }
      const item = userVocabStatusMap.get(r.topic_id)!;
      if (r.status === 'mastered') item.mastered = r.count;
      else if (r.status === 'learning') item.learning = r.count;
      else if (r.status === 'review') item.review = r.count;
    }

    const tpRows = db.prepare(`
      SELECT utp.topic_id, utp.is_completed, utp.best_test_score, utp.last_vocab_id, utp.status
      FROM user_topic_progress utp
      JOIN topics t ON utp.topic_id = t.id
      WHERE utp.user_id = ? AND t.book_id = ?
    `).all(userId, bookId) as { topic_id: number; is_completed: number; best_test_score: number; last_vocab_id: number | null; status: string }[];

    for (const r of tpRows) {
      userTopicProgressMap.set(r.topic_id, {
        is_completed: r.is_completed === 1,
        best_test_score: r.best_test_score,
        last_vocab_id: r.last_vocab_id,
        status: r.status,
      });
    }
  }

  return topics.map((topic) => {
    const totalWords = wordCountMap.get(topic.id) || 0;
    const vStatus = userVocabStatusMap.get(topic.id) || { mastered: 0, learning: 0, review: 0 };
    const tp = userTopicProgressMap.get(topic.id);

    const masteredCount = vStatus.mastered;
    const learningCount = vStatus.learning;
    const reviewCount = vStatus.review;
    const learnedCount = masteredCount + learningCount + reviewCount;
    const newCount = Math.max(0, totalWords - learnedCount);
    const progressPercentage = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

    return {
      ...topic,
      total_words: totalWords,
      mastered_words: masteredCount,
      learning_words: learningCount,
      review_words: reviewCount,
      new_words: newCount,
      progress_percentage: progressPercentage,
      is_completed: tp ? tp.is_completed : false,
      best_test_score: tp ? tp.best_test_score : null,
      last_vocab_id: tp ? tp.last_vocab_id : null,
      status: tp ? tp.status : 'not_started',
    };
  });
}

export function getTopicById(topicId: number, userId?: string): Topic | null {
  const db = getDb();
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId) as unknown as Topic | undefined;
  if (!topic) return null;

  const topics = getTopics(topic.book_id, userId);
  return topics.find((t) => t.id === topicId) || null;
}

export function getVocabularyForTopic(
  topicId: number,
  userId?: string,
  page = 1,
  limit = 50
): Vocabulary[] {
  const db = getDb();
  const offset = Math.max(0, (page - 1) * limit);

  // Chọn đúng các cột cần thiết, kèm phân trang
  const vocabList = db.prepare(`
    SELECT v.id, v.book_id, v.topic_id, v.word, v.normalized_word, v.ipa, v.part_of_speech,
      v.meaning_vi, v.meaning_en, v.example_1, v.example_1_vi, v.example_2, v.example_2_vi,
      v.cloze_example_1, v.cloze_example_2, v.level, v.audio_url, v.word_image,
      v.example_image_1, v.example_image_2, v.created_at,
      COALESCE(uvp.status, 'new') as status,
      COALESCE(uvp.correct_count, 0) as correct_count,
      COALESCE(uvp.wrong_count, 0) as wrong_count,
      uvp.last_reviewed_at,
      uvp.next_review_at
    FROM vocabulary v
    LEFT JOIN user_vocabulary_progress uvp ON v.id = uvp.vocabulary_id AND uvp.user_id = ?
    WHERE v.topic_id = ?
    ORDER BY v.id ASC
    LIMIT ? OFFSET ?
  `).all(userId || '', topicId, limit, offset) as unknown as Vocabulary[];

  if (vocabList.length === 0) return [];

  // Lấy toàn bộ distractors cho các từ vựng này trong ĐÚNG 1 CÂU QUERY DUY NHẤT
  const vocabIds = vocabList.map((v) => v.id);
  const placeholders = vocabIds.map(() => '?').join(',');
  const distractors = db.prepare(`
    SELECT * FROM vocabulary_distractors 
    WHERE vocabulary_id IN (${placeholders}) 
    ORDER BY position ASC
  `).all(...vocabIds) as unknown as Distractor[];

  const distractorMap = new Map<number, Distractor[]>();
  for (const d of distractors) {
    if (d.vocabulary_id) {
      if (!distractorMap.has(d.vocabulary_id)) {
        distractorMap.set(d.vocabulary_id, []);
      }
      distractorMap.get(d.vocabulary_id)!.push(d);
    }
  }

  return vocabList.map((v) => ({
    ...v,
    distractors: distractorMap.get(v.id) || [],
  }));
}

export function updateWordProgress(
  userId: string,
  vocabularyId: number,
  status: WordStatus,
  isCorrect?: boolean
) {
  const db = getDb();
  const existing = db.prepare(`
    SELECT * FROM user_vocabulary_progress WHERE user_id = ? AND vocabulary_id = ?
  `).get(userId, vocabularyId) as {
    correct_count: number;
    wrong_count: number;
    incorrect_count?: number;
    review_count?: number;
    status: WordStatus;
  } | undefined;

  let correctCount = existing?.correct_count || 0;
  let wrongCount = existing?.wrong_count || existing?.incorrect_count || 0;
  let reviewCount = existing?.review_count || 0;

  if (isCorrect === true) correctCount += 1;
  if (isCorrect === false) wrongCount += 1;
  if (status === 'review') reviewCount += 1;

  // Lịch ôn tập ngắt quãng (Spaced repetition schedule)
  const now = new Date();
  let nextReviewDate = new Date();

  if (status === 'mastered') {
    const intervalDays = correctCount > 5 ? 30 : correctCount > 3 ? 14 : 7;
    nextReviewDate.setDate(now.getDate() + intervalDays);
  } else if (status === 'review') {
    nextReviewDate.setDate(now.getDate() + 1);
  } else if (status === 'learning') {
    nextReviewDate.setDate(now.getDate() + 3);
  } else {
    nextReviewDate = now;
  }

  const nowIso = now.toISOString();
  const nextReviewIso = nextReviewDate.toISOString();

  if (existing) {
    db.prepare(`
      UPDATE user_vocabulary_progress
      SET status = ?,
          correct_count = ?,
          wrong_count = ?,
          incorrect_count = ?,
          review_count = ?,
          last_reviewed_at = ?,
          next_review_at = ?,
          updated_at = ?
      WHERE user_id = ? AND vocabulary_id = ?
    `).run(status, correctCount, wrongCount, wrongCount, reviewCount, nowIso, nextReviewIso, nowIso, userId, vocabularyId);
  } else {
    db.prepare(`
      INSERT INTO user_vocabulary_progress
        (user_id, vocabulary_id, status, correct_count, wrong_count, incorrect_count, review_count, last_reviewed_at, next_review_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, vocabularyId, status, correctCount, wrongCount, wrongCount, reviewCount, nowIso, nextReviewIso, nowIso);
  }

  // Đồng bộ lên Supabase Cloud (đảm bảo dữ liệu bền vững khi deploy Vercel)
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      supabase.from('user_vocabulary_progress').upsert({
        user_id: userId,
        vocabulary_id: vocabularyId,
        status,
        correct_count: correctCount,
        wrong_count: wrongCount,
        incorrect_count: wrongCount,
        review_count: reviewCount,
        last_reviewed_at: nowIso,
        next_review_at: nextReviewIso,
        updated_at: nowIso,
      }).then(({ error }) => {
        if (error) console.warn('Supabase sync vocab progress error:', error.message);
      });
    }
  } catch (e) {
    console.warn('Lỗi gọi Supabase từ updateWordProgress:', e);
  }

  // Tự động đồng bộ và tính toán tiến độ Topic + User Stats
  syncTopicAndUserStats(userId, vocabularyId);

  return { status, correctCount, wrongCount, nextReviewIso };
}

function syncTopicAndUserStats(userId: string, vocabularyId: number) {
  const db = getDb();
  const vocab = db.prepare('SELECT id, book_id, topic_id FROM vocabulary WHERE id = ?').get(vocabularyId) as { id: number; book_id: number; topic_id: number } | undefined;
  if (!vocab) return;

  const topicId = vocab.topic_id;
  const bookId = vocab.book_id;
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);

  // 1. Tính toán tiến độ topic
  const totalInTopic = db.prepare('SELECT COUNT(*) as count FROM vocabulary WHERE topic_id = ?').get(topicId) as { count: number };
  const topicStatsRow = db.prepare(`
    SELECT
      COUNT(CASE WHEN uvp.status != 'new' THEN 1 END) as learned,
      COUNT(CASE WHEN uvp.status = 'mastered' THEN 1 END) as mastered
    FROM user_vocabulary_progress uvp
    JOIN vocabulary v ON uvp.vocabulary_id = v.id
    WHERE uvp.user_id = ? AND v.topic_id = ?
  `).get(userId, topicId) as { learned: number; mastered: number };

  const totalWords = totalInTopic?.count || 0;
  const learnedWords = topicStatsRow?.learned || 0;
  const masteredWords = topicStatsRow?.mastered || 0;
  const progressPercent = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

  const currentTopicProg = db.prepare(`
    SELECT * FROM user_topic_progress WHERE user_id = ? AND topic_id = ?
  `).get(userId, topicId) as { is_completed: number; best_test_score: number; completed_at?: string } | undefined;

  const bestScore = currentTopicProg?.best_test_score || 0;
  const isCompleted = (totalWords > 0 && masteredWords / totalWords >= 0.9 && bestScore >= 80) || (learnedWords === totalWords && totalWords > 0) ? 1 : 0;
  const topicStatus = isCompleted ? 'completed' : learnedWords > 0 ? 'in_progress' : 'not_started';

  if (currentTopicProg) {
    db.prepare(`
      UPDATE user_topic_progress
      SET total_words = ?,
          learned_words = ?,
          mastered_words = ?,
          progress_percent = ?,
          status = ?,
          last_vocab_id = ?,
          last_studied_at = ?,
          is_completed = ?,
          completed_at = CASE WHEN ? = 1 AND is_completed = 0 THEN ? ELSE completed_at END
      WHERE user_id = ? AND topic_id = ?
    `).run(totalWords, learnedWords, masteredWords, progressPercent, topicStatus, vocabularyId, nowIso, isCompleted, isCompleted, nowIso, userId, topicId);
  } else {
    db.prepare(`
      INSERT INTO user_topic_progress (user_id, topic_id, total_words, learned_words, mastered_words, progress_percent, status, last_vocab_id, last_studied_at, is_completed, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, topicId, totalWords, learnedWords, masteredWords, progressPercent, topicStatus, vocabularyId, nowIso, isCompleted, isCompleted ? nowIso : null);
  }

  // 2. Tính toán & Cập nhật bảng user_stats
  const overallVocab = db.prepare(`
    SELECT
      COUNT(CASE WHEN status != 'new' THEN 1 END) as total_learned,
      COUNT(CASE WHEN status = 'mastered' THEN 1 END) as total_mastered
    FROM user_vocabulary_progress
    WHERE user_id = ?
  `).get(userId) as { total_learned: number; total_mastered: number };

  const overallTopics = db.prepare(`
    SELECT COUNT(*) as completed_count FROM user_topic_progress WHERE user_id = ? AND is_completed = 1
  `).get(userId) as { completed_count: number };

  const existingStats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId) as {
    current_streak: number;
    longest_streak: number;
    last_learning_date?: string | null;
  } | undefined;

  let currentStreak = existingStats?.current_streak || 0;
  let longestStreak = existingStats?.longest_streak || 0;
  const lastDate = existingStats?.last_learning_date;

  if (!lastDate) {
    currentStreak = 1;
  } else if (lastDate !== todayDate) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (lastDate === yesterday) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  db.prepare(`
    INSERT INTO user_stats (
      user_id, total_words_learned, total_words_mastered, total_topics_completed,
      current_streak, longest_streak, last_learning_date, last_book_id, last_topic_id, last_vocab_id, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      total_words_learned = excluded.total_words_learned,
      total_words_mastered = excluded.total_words_mastered,
      total_topics_completed = excluded.total_topics_completed,
      current_streak = excluded.current_streak,
      longest_streak = excluded.longest_streak,
      last_learning_date = excluded.last_learning_date,
      last_book_id = excluded.last_book_id,
      last_topic_id = excluded.last_topic_id,
      last_vocab_id = excluded.last_vocab_id,
      updated_at = excluded.updated_at
  `).run(
    userId,
    overallVocab?.total_learned || 0,
    overallVocab?.total_mastered || 0,
    overallTopics?.completed_count || 0,
    currentStreak,
    longestStreak,
    todayDate,
    bookId,
    topicId,
    vocabularyId,
    nowIso
  );

  // 3. Đồng bộ topic progress & user stats lên Supabase Cloud
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      supabase.from('user_topic_progress').upsert({
        user_id: userId,
        topic_id: topicId,
        total_words: totalWords,
        learned_words: learnedWords,
        mastered_words: masteredWords,
        progress_percent: progressPercent,
        status: topicStatus,
        last_vocab_id: vocabularyId,
        last_studied_at: nowIso,
        is_completed: isCompleted,
        completed_at: isCompleted ? nowIso : null,
        updated_at: nowIso,
      }).then(() => {});

      supabase.from('user_stats').upsert({
        user_id: userId,
        total_words_mastered: overallVocab?.total_mastered || 0,
        total_words_learned: overallVocab?.total_learned || 0,
        total_topics_completed: overallTopics?.completed_count || 0,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_learning_date: todayDate,
        last_book_id: bookId,
        last_topic_id: topicId,
        last_vocab_id: vocabularyId,
        updated_at: nowIso,
      }).then(() => {});
    }
  } catch (e) {
    console.warn('Lỗi gọi Supabase từ syncTopicAndUserStats:', e);
  }
}

export function getUserStats(userId: string) {
  const db = getDb();
  let stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;

  if (!stats) {
    // Khởi tạo từ dữ liệu sẵn có
    const overallVocab = db.prepare(`
      SELECT
        COUNT(CASE WHEN status != 'new' THEN 1 END) as total_learned,
        COUNT(CASE WHEN status = 'mastered' THEN 1 END) as total_mastered
      FROM user_vocabulary_progress
      WHERE user_id = ?
    `).get(userId) as { total_learned: number; total_mastered: number };

    const overallTopics = db.prepare(`
      SELECT COUNT(*) as completed_count FROM user_topic_progress WHERE user_id = ? AND is_completed = 1
    `).get(userId) as { completed_count: number };

    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT INTO user_stats (user_id, total_words_learned, total_words_mastered, total_topics_completed, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, overallVocab?.total_learned || 0, overallVocab?.total_mastered || 0, overallTopics?.completed_count || 0, nowIso);

    stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  }

  return stats;
}

export function getContinueLearning(userId: string) {
  const db = getDb();

  // Tìm topic dang dở gần nhất
  const row = db.prepare(`
    SELECT 
      utp.topic_id,
      utp.last_vocab_id,
      utp.status as topic_status,
      utp.learned_words,
      utp.total_words,
      utp.progress_percent,
      t.name as topic_name,
      t.unit_number,
      t.book_id,
      b.name as book_name,
      b.short_name as book_short_name,
      b.level as book_level,
      b.cover_image as book_cover_image
    FROM user_topic_progress utp
    JOIN topics t ON utp.topic_id = t.id
    JOIN books b ON t.book_id = b.id
    WHERE utp.user_id = ? AND utp.status != 'completed'
    ORDER BY utp.last_studied_at DESC
    LIMIT 1
  `).get(userId) as {
    topic_id: number;
    last_vocab_id: number | null;
    topic_status: string;
    learned_words: number;
    total_words: number;
    progress_percent: number;
    topic_name: string;
    unit_number: number | null;
    book_id: number;
    book_name: string;
    book_short_name: string;
    book_level: string;
    book_cover_image: string | null;
  } | undefined;

  if (row) {
    return {
      bookId: row.book_id,
      bookName: row.book_name,
      bookShortName: row.book_short_name,
      bookLevel: row.book_level,
      bookCoverImage: row.book_cover_image,
      topicId: row.topic_id,
      topicName: row.topic_name,
      unitNumber: row.unit_number,
      lastVocabId: row.last_vocab_id,
      learnedWords: row.learned_words,
      totalWords: row.total_words,
      progressPercent: row.progress_percent,
      resumeUrl: `/topics/${row.topic_id}${row.last_vocab_id ? `?startWordId=${row.last_vocab_id}` : ''}`,
    };
  }

  // Nếu chưa có bài nào dở, gợi ý Unit 1 của cuốn sách đầu tiên
  const firstTopic = db.prepare(`
    SELECT t.id as topic_id, t.name as topic_name, t.unit_number, t.book_id, b.name as book_name, b.short_name as book_short_name, b.level as book_level, b.cover_image as book_cover_image
    FROM topics t
    JOIN books b ON t.book_id = b.id
    ORDER BY b.order_index ASC, t.order_index ASC
    LIMIT 1
  `).get() as {
    topic_id: number;
    topic_name: string;
    unit_number: number | null;
    book_id: number;
    book_name: string;
    book_short_name: string;
    book_level: string;
    book_cover_image: string | null;
  } | undefined;

  if (firstTopic) {
    return {
      bookId: firstTopic.book_id,
      bookName: firstTopic.book_name,
      bookShortName: firstTopic.book_short_name,
      bookLevel: firstTopic.book_level,
      bookCoverImage: firstTopic.book_cover_image,
      topicId: firstTopic.topic_id,
      topicName: firstTopic.topic_name,
      unitNumber: firstTopic.unit_number,
      lastVocabId: null,
      learnedWords: 0,
      totalWords: 0,
      progressPercent: 0,
      resumeUrl: `/topics/${firstTopic.topic_id}`,
    };
  }

  return null;
}

export function saveExerciseAttempt(attempt: ExerciseAttempt) {
  const db = getDb();
  db.prepare(`
    INSERT INTO exercise_attempts
      (user_id, vocabulary_id, topic_id, book_id, exercise_type, selected_answer, correct_answer, is_correct, attempted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    attempt.user_id,
    attempt.vocabulary_id,
    attempt.topic_id,
    attempt.book_id,
    attempt.exercise_type,
    attempt.selected_answer,
    attempt.correct_answer,
    attempt.is_correct ? 1 : 0
  );

  // Also update vocabulary progress
  const newStatus: WordStatus = attempt.is_correct ? 'learning' : 'review';
  updateWordProgress(attempt.user_id, attempt.vocabulary_id, newStatus, attempt.is_correct);
}

export function saveStudySession(session: StudySession) {
  const db = getDb();
  db.prepare(`
    INSERT INTO study_sessions
      (user_id, language_id, book_id, topic_id, mode, started_at, ended_at, duration, words_seen, correct_answers, wrong_answers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session.user_id,
    session.language_id || 1,
    session.book_id || null,
    session.topic_id || null,
    session.mode,
    session.started_at,
    session.ended_at,
    session.duration,
    session.words_seen,
    session.correct_answers,
    session.wrong_answers
  );
}

export function recordTestResult(userId: string, topicId: number, scorePercentage: number) {
  const db = getDb();
  const current = db.prepare(`
    SELECT * FROM user_topic_progress WHERE user_id = ? AND topic_id = ?
  `).get(userId, topicId) as { id: number; best_test_score: number; is_completed: number } | undefined;

  const newBest = current ? Math.max(current.best_test_score, scorePercentage) : scorePercentage;

  // Check if topic is completed: >= 90% mastered and score >= 80
  const totalInTopic = db.prepare('SELECT COUNT(*) as count FROM vocabulary WHERE topic_id = ?').get(topicId) as { count: number };
  const masteredInTopic = db.prepare(`
    SELECT COUNT(*) as count FROM user_vocabulary_progress uvp
    JOIN vocabulary v ON uvp.vocabulary_id = v.id
    WHERE uvp.user_id = ? AND v.topic_id = ? AND uvp.status = 'mastered'
  `).get(userId, topicId) as { count: number };

  const masteredRatio = totalInTopic.count > 0 ? (masteredInTopic.count / totalInTopic.count) : 0;
  const isCompleted = masteredRatio >= 0.9 && newBest >= 80 ? 1 : 0;

  if (current) {
    db.prepare(`
      UPDATE user_topic_progress
      SET best_test_score = ?,
          is_completed = ?,
          completed_at = CASE WHEN ? = 1 AND is_completed = 0 THEN datetime('now') ELSE completed_at END
      WHERE user_id = ? AND topic_id = ?
    `).run(newBest, isCompleted, isCompleted, userId, topicId);
  } else {
    db.prepare(`
      INSERT INTO user_topic_progress (user_id, topic_id, is_completed, best_test_score, completed_at)
      VALUES (?, ?, ?, ?, CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END)
    `).run(userId, topicId, isCompleted, newBest, isCompleted);
  }

  return { bestScore: newBest, isCompleted: isCompleted === 1 };
}

export function getReviewWords(userId: string, bookId?: number, topicId?: number): Vocabulary[] {
  const db = getDb();
  let query = `
    SELECT v.*,
      uvp.status,
      uvp.correct_count,
      uvp.wrong_count,
      uvp.last_reviewed_at,
      uvp.next_review_at
    FROM user_vocabulary_progress uvp
    JOIN vocabulary v ON uvp.vocabulary_id = v.id
    WHERE uvp.user_id = ?
      AND (uvp.status = 'review' OR date(uvp.next_review_at) <= date('now'))
  `;
  const params: unknown[] = [userId];

  if (bookId) {
    query += ' AND v.book_id = ?';
    params.push(bookId);
  }
  if (topicId) {
    query += ' AND v.topic_id = ?';
    params.push(topicId);
  }

  query += ' ORDER BY uvp.wrong_count DESC, uvp.next_review_at ASC';
  return db.prepare(query).all(...params) as unknown as Vocabulary[];
}

export function getUserStatistics(userId: string): UserStatistics {
  const db = getDb();

  // Total words learned (learning, review, or mastered)
  const learnedRow = db.prepare(`
    SELECT
      COUNT(CASE WHEN status != 'new' THEN 1 END) as total_learned,
      COUNT(CASE WHEN status = 'mastered' THEN 1 END) as mastered,
      COUNT(CASE WHEN status = 'review' THEN 1 END) as review
    FROM user_vocabulary_progress
    WHERE user_id = ?
  `).get(userId) as { total_learned: number; mastered: number; review: number } || { total_learned: 0, mastered: 0, review: 0 };

  // Topics completed
  const topicsCompletedRow = db.prepare(`
    SELECT COUNT(*) as count FROM user_topic_progress WHERE user_id = ? AND is_completed = 1
  `).get(userId) as { count: number };

  const totalTopicsRow = db.prepare(`
    SELECT COUNT(*) as count FROM topics
  `).get() as { count: number };

  // Study streak calculation
  const sessionDates = db.prepare(`
    SELECT DISTINCT substr(started_at, 1, 10) as session_date
    FROM study_sessions
    WHERE user_id = ?
    ORDER BY session_date DESC
  `).all(userId) as { session_date: string }[];

  let streak = 0;
  if (sessionDates.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const mostRecent = sessionDates[0].session_date;

    if (mostRecent === today || mostRecent === yesterday) {
      streak = 1;
      const checkDate = new Date(mostRecent);
      for (let i = 1; i < sessionDates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const expected = checkDate.toISOString().slice(0, 10);
        if (sessionDates[i].session_date === expected) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  // Total study time
  const timeRow = db.prepare(`
    SELECT COALESCE(SUM(duration), 0) as total_seconds FROM study_sessions WHERE user_id = ?
  `).get(userId) as { total_seconds: number };

  // Overall accuracy
  const attemptsRow = db.prepare(`
    SELECT
      COUNT(*) as total_attempts,
      COUNT(CASE WHEN is_correct = 1 THEN 1 END) as correct_attempts
    FROM exercise_attempts
    WHERE user_id = ?
  `).get(userId) as { total_attempts: number; correct_attempts: number };

  const overallAccuracy = attemptsRow.total_attempts > 0
    ? Math.round((attemptsRow.correct_attempts / attemptsRow.total_attempts) * 100)
    : 0;

  // Books progress
  const books = getBooks(userId);
  const booksProgress = books.map((b) => ({
    bookId: b.id,
    bookName: b.name,
    level: b.level,
    totalTopics: b.total_topics || 0,
    completedTopics: b.completed_topics || 0,
    percentage: b.progress_percentage || 0,
  }));

  // Most mistaken words ("Từ bạn hay nhầm")
  const mostMistakenWords = db.prepare(`
    SELECT
      ea.vocabulary_id as vocabularyId,
      v.word,
      v.ipa,
      v.meaning_vi,
      COUNT(CASE WHEN ea.is_correct = 0 THEN 1 END) as wrongCount,
      ROUND(COUNT(CASE WHEN ea.is_correct = 1 THEN 1 END) * 100.0 / COUNT(*)) as accuracy
    FROM exercise_attempts ea
    JOIN vocabulary v ON ea.vocabulary_id = v.id
    WHERE ea.user_id = ?
    GROUP BY ea.vocabulary_id
    HAVING wrongCount > 0
    ORDER BY wrongCount DESC, accuracy ASC
    LIMIT 10
  `).all(userId) as {
    vocabularyId: number;
    word: string;
    ipa?: string;
    meaning_vi: string;
    wrongCount: number;
    accuracy: number;
  }[];

  // Weak topics
  const weakTopics = db.prepare(`
    SELECT
      t.id as topicId,
      t.name as topicName,
      b.name as bookName,
      ROUND(COUNT(CASE WHEN ea.is_correct = 1 THEN 1 END) * 100.0 / COUNT(*)) as accuracy
    FROM exercise_attempts ea
    JOIN topics t ON ea.topic_id = t.id
    JOIN books b ON t.book_id = b.id
    WHERE ea.user_id = ?
    GROUP BY t.id
    HAVING COUNT(*) >= 5 AND accuracy < 70
    ORDER BY accuracy ASC
    LIMIT 5
  `).all(userId) as {
    topicId: number;
    topicName: string;
    bookName: string;
    accuracy: number;
  }[];

  // Weekly activity (last 7 days)
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const weeklyActivity: { day: string; count: number; date: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = days[d.getDay()];

    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM exercise_attempts
      WHERE user_id = ? AND substr(attempted_at, 1, 10) = ?
    `).get(userId, dateStr) as { count: number };

    weeklyActivity.push({
      day: dayName,
      count: countRow?.count || 0,
      date: dateStr,
    });
  }

  return {
    totalWordsLearned: learnedRow.total_learned,
    masteredWords: learnedRow.mastered,
    reviewWords: learnedRow.review,
    topicsCompleted: topicsCompletedRow.count,
    totalTopics: totalTopicsRow.count,
    studyStreakDays: streak,
    totalStudyTimeSeconds: timeRow.total_seconds,
    overallAccuracy,
    booksProgress,
    mostMistakenWords,
    weakTopics,
    weeklyActivity,
  };
}

/**
 * Generates dynamic practice questions based on words learned so far in this topic.
 * Progressive unlock rule: Must have learned >= 4 words.
 */
export function generatePracticeQuestions(
  topicId: number,
  userId: string,
  countOption: number | 'all'
): { questions: Question[]; message?: string; totalLearned: number } {
  // Get all vocabulary in current topic with user progress
  const allVocab = getVocabularyForTopic(topicId, userId);

  // Filter words the user has interacted with (status != 'new')
  const learnedVocab = allVocab.filter((v) => v.status && v.status !== 'new');

  if (learnedVocab.length < 4) {
    return {
      questions: [],
      message: 'Hãy học thêm một vài từ (tối thiểu 4 từ) trong tab Learn để mở khóa bài luyện tập.',
      totalLearned: learnedVocab.length,
    };
  }

  // Priority sorting:
  // 1. Not mastered (learning)
  // 2. High wrong count
  // 3. Status review
  // 4. Mastered
  const sortedPool = [...learnedVocab].sort((a, b) => {
    if (a.status === 'review' && b.status !== 'review') return -1;
    if (b.status === 'review' && a.status !== 'review') return 1;
    if ((a.wrong_count || 0) !== (b.wrong_count || 0)) {
      return (b.wrong_count || 0) - (a.wrong_count || 0);
    }
    if (a.status !== 'mastered' && b.status === 'mastered') return -1;
    if (b.status !== 'mastered' && a.status === 'mastered') return 1;
    return Math.random() - 0.5;
  });

  const selectedPool = countOption === 'all' ? sortedPool : sortedPool.slice(0, countOption);
  const exerciseTypes: ExerciseType[] = ['fill_blank', 'word_choice', 'meaning_choice', 'matching'];
  const questions: Question[] = [];

  const matchingWords: Vocabulary[] = [];

  for (let i = 0; i < selectedPool.length; i++) {
    const vocab = selectedPool[i];
    // Rotate exercise types
    const typeIndex = i % (selectedPool.length >= 5 ? 4 : 3);
    const chosenType = exerciseTypes[typeIndex];

    if (chosenType === 'matching' && selectedPool.length >= 5) {
      matchingWords.push(vocab);
      continue;
    }

    if (chosenType === 'fill_blank' && (vocab.cloze_example_1 || vocab.cloze_example_2)) {
      const cloze = vocab.cloze_example_1 || vocab.cloze_example_2 || '';
      questions.push({
        id: `q_fb_${vocab.id}_${i}`,
        type: 'fill_blank',
        vocabulary: vocab,
        prompt: cloze,
        subPrompt: vocab.meaning_vi,
        correctAnswer: vocab.word,
        explanation: `${vocab.word} (${vocab.part_of_speech || ''}): ${vocab.meaning_vi}`,
      });
    } else if (chosenType === 'word_choice') {
      const cloze = vocab.cloze_example_1 || vocab.cloze_example_2 || `______: ${vocab.meaning_vi}`;
      const options = buildWordOptions(vocab, allVocab);
      questions.push({
        id: `q_wc_${vocab.id}_${i}`,
        type: 'word_choice',
        vocabulary: vocab,
        prompt: cloze,
        subPrompt: `Chọn từ đúng nghĩa với: "${vocab.meaning_vi}"`,
        options,
        correctAnswer: vocab.word,
        explanation: `${vocab.word}: ${vocab.meaning_vi}`,
      });
    } else {
      // meaning_choice
      const options = buildMeaningOptions(vocab, allVocab);
      questions.push({
        id: `q_mc_${vocab.id}_${i}`,
        type: 'meaning_choice',
        vocabulary: vocab,
        prompt: vocab.word,
        subPrompt: vocab.ipa ? `/${vocab.ipa.replace(/\//g, '')}/` : undefined,
        options,
        correctAnswer: vocab.meaning_vi,
        explanation: `${vocab.word}: ${vocab.meaning_vi}`,
      });
    }
  }

  // If we collected words for matching, build a matching question
  if (matchingWords.length >= 4) {
    const matchSlice = matchingWords.slice(0, 5);
    questions.push({
      id: `q_match_${Date.now()}`,
      type: 'matching',
      vocabulary: matchSlice[0],
      prompt: 'Nối các từ vựng tiếng Anh với nghĩa tiếng Việt tương ứng:',
      correctAnswer: 'matched',
      matchingPairs: matchSlice.map((w) => ({
        id: `m_${w.id}`,
        word: w.word,
        meaning: w.meaning_vi,
      })),
    });
  }

  return { questions, totalLearned: learnedVocab.length };
}

/**
 * Generates formal test questions for a topic.
 * 20 questions: 30% Fill blank, 30% Word choice, 25% Meaning choice, 15% Matching.
 */
export function generateTestQuestions(topicId: number, totalCount = 20): Question[] {
  const allVocab = getVocabularyForTopic(topicId);
  if (allVocab.length === 0) return [];

  // Shuffle vocabulary
  const pool = [...allVocab].sort(() => Math.random() - 0.5);

  const fillBlankCount = Math.max(1, Math.round(totalCount * 0.3));
  const wordChoiceCount = Math.max(1, Math.round(totalCount * 0.3));
  const meaningChoiceCount = Math.max(1, Math.round(totalCount * 0.25));

  const questions: Question[] = [];
  let poolIdx = 0;

  // 1. Fill Blank
  for (let i = 0; i < fillBlankCount && poolIdx < pool.length; i++) {
    const vocab = pool[poolIdx++];
    const cloze = vocab.cloze_example_1 || vocab.cloze_example_2 || `______ (${vocab.meaning_vi})`;
    questions.push({
      id: `test_fb_${vocab.id}_${i}`,
      type: 'fill_blank',
      vocabulary: vocab,
      prompt: cloze,
      subPrompt: vocab.meaning_vi,
      correctAnswer: vocab.word,
      explanation: `${vocab.word}: ${vocab.meaning_vi}`,
    });
  }

  // 2. Word Choice
  for (let i = 0; i < wordChoiceCount && poolIdx < pool.length; i++) {
    const vocab = pool[poolIdx++];
    const cloze = vocab.cloze_example_1 || vocab.cloze_example_2 || `______ (${vocab.meaning_vi})`;
    const options = buildWordOptions(vocab, allVocab);
    questions.push({
      id: `test_wc_${vocab.id}_${i}`,
      type: 'word_choice',
      vocabulary: vocab,
      prompt: cloze,
      subPrompt: `Chọn từ tiếng Anh có nghĩa: "${vocab.meaning_vi}"`,
      options,
      correctAnswer: vocab.word,
      explanation: `${vocab.word}: ${vocab.meaning_vi}`,
    });
  }

  // 3. Meaning Choice
  for (let i = 0; i < meaningChoiceCount && poolIdx < pool.length; i++) {
    const vocab = pool[poolIdx++];
    const options = buildMeaningOptions(vocab, allVocab);
    questions.push({
      id: `test_mc_${vocab.id}_${i}`,
      type: 'meaning_choice',
      vocabulary: vocab,
      prompt: vocab.word,
      subPrompt: vocab.ipa ? `/${vocab.ipa.replace(/\//g, '')}/` : undefined,
      options,
      correctAnswer: vocab.meaning_vi,
      explanation: `${vocab.word}: ${vocab.meaning_vi}`,
    });
  }

  // 4. Matching question for remaining pool
  const matchingPool = pool.slice(poolIdx, poolIdx + 5);
  if (matchingPool.length >= 4) {
    questions.push({
      id: `test_match_${Date.now()}`,
      type: 'matching',
      vocabulary: matchingPool[0],
      prompt: 'Nối các từ vựng tiếng Anh với nghĩa tiếng Việt tương ứng:',
      correctAnswer: 'matched',
      matchingPairs: matchingPool.map((w) => ({
        id: `m_${w.id}`,
        word: w.word,
        meaning: w.meaning_vi,
      })),
    });
  }

  return questions;
}

function buildWordOptions(target: Vocabulary, topicPool: Vocabulary[]): string[] {
  const options = new Set<string>();
  options.add(target.word);

  // Priority 1: Distractors from CSV
  if (target.distractors && target.distractors.length > 0) {
    for (const d of target.distractors) {
      if (d.word && d.word.trim()) {
        options.add(d.word.trim());
      }
      if (options.size >= 4) break;
    }
  }

  // Priority 2: Fallback words from current topic
  if (options.size < 4) {
    const shuffled = [...topicPool].sort(() => Math.random() - 0.5);
    for (const v of shuffled) {
      if (v.word !== target.word) {
        options.add(v.word);
      }
      if (options.size >= 4) break;
    }
  }

  return Array.from(options).sort(() => Math.random() - 0.5);
}

function buildMeaningOptions(target: Vocabulary, topicPool: Vocabulary[]): string[] {
  const options = new Set<string>();
  options.add(target.meaning_vi);

  // Priority 1: Meaning distractors from CSV
  if (target.distractors && target.distractors.length > 0) {
    for (const d of target.distractors) {
      if (d.meaning_vi && d.meaning_vi.trim()) {
        options.add(d.meaning_vi.trim());
      }
      if (options.size >= 4) break;
    }
  }

  // Priority 2: Fallback meanings from current topic
  if (options.size < 4) {
    const shuffled = [...topicPool].sort(() => Math.random() - 0.5);
    for (const v of shuffled) {
      if (v.meaning_vi !== target.meaning_vi) {
        options.add(v.meaning_vi);
      }
      if (options.size >= 4) break;
    }
  }

  return Array.from(options).sort(() => Math.random() - 0.5);
}
