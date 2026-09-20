import { getDb } from './db';
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

  return books.map((book) => {
    // Total topics in book
    const topicStats = db.prepare(`
      SELECT COUNT(*) as total_topics FROM topics WHERE book_id = ?
    `).get(book.id) as { total_topics: number };

    // Total words in book
    const wordStats = db.prepare(`
      SELECT COUNT(*) as total_words FROM vocabulary WHERE book_id = ?
    `).get(book.id) as { total_words: number };

    let completedTopics = 0;
    let masteredWords = 0;

    if (userId) {
      // Completed topics by user
      const completed = db.prepare(`
        SELECT COUNT(*) as count FROM user_topic_progress
        WHERE user_id = ? AND is_completed = 1 AND topic_id IN (
          SELECT id FROM topics WHERE book_id = ?
        )
      `).get(userId, book.id) as { count: number };
      completedTopics = completed.count;

      // Mastered words by user
      const mastered = db.prepare(`
        SELECT COUNT(*) as count FROM user_vocabulary_progress uvp
        JOIN vocabulary v ON uvp.vocabulary_id = v.id
        WHERE uvp.user_id = ? AND uvp.status = 'mastered' AND v.book_id = ?
      `).get(userId, book.id) as { count: number };
      masteredWords = mastered.count;
    }

    const totalTopics = topicStats.total_topics || 0;
    const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return {
      ...book,
      total_topics: totalTopics,
      completed_topics: completedTopics,
      total_words: wordStats.total_words || 0,
      mastered_words: masteredWords,
      progress_percentage: progressPercentage,
    };
  });
}

export function getBookById(bookId: number, userId?: string): Book | null {
  const db = getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as unknown as Book;
  if (!book) return null;

  const topicStats = db.prepare(`
    SELECT COUNT(*) as total_topics FROM topics WHERE book_id = ?
  `).get(book.id) as { total_topics: number };

  const wordStats = db.prepare(`
    SELECT COUNT(*) as total_words FROM vocabulary WHERE book_id = ?
  `).get(book.id) as { total_words: number };

  let completedTopics = 0;
  let masteredWords = 0;

  if (userId) {
    const completed = db.prepare(`
      SELECT COUNT(*) as count FROM user_topic_progress
      WHERE user_id = ? AND is_completed = 1 AND topic_id IN (
        SELECT id FROM topics WHERE book_id = ?
      )
    `).get(userId, book.id) as { count: number };
    completedTopics = completed.count;

    const mastered = db.prepare(`
      SELECT COUNT(*) as count FROM user_vocabulary_progress uvp
      JOIN vocabulary v ON uvp.vocabulary_id = v.id
      WHERE uvp.user_id = ? AND uvp.status = 'mastered' AND v.book_id = ?
    `).get(userId, book.id) as { count: number };
    masteredWords = mastered.count;
  }

  const totalTopics = topicStats.total_topics || 0;
  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return {
    ...book,
    total_topics: totalTopics,
    completed_topics: completedTopics,
    total_words: wordStats.total_words || 0,
    mastered_words: masteredWords,
    progress_percentage: progressPercentage,
  };
}

export function getTopics(bookId: number, userId?: string): Topic[] {
  const db = getDb();
  const topics = db.prepare(`
    SELECT * FROM topics WHERE book_id = ? ORDER BY order_index ASC, id ASC
  `).all(bookId) as unknown as Topic[];

  return topics.map((topic) => {
    const wordCount = db.prepare(`
      SELECT COUNT(*) as count FROM vocabulary WHERE topic_id = ?
    `).get(topic.id) as { count: number };

    let masteredCount = 0;
    let learningCount = 0;
    let reviewCount = 0;
    let isCompleted = false;
    let bestTestScore: number | null = null;

    if (userId) {
      const statusCounts = db.prepare(`
        SELECT uvp.status, COUNT(*) as count
        FROM user_vocabulary_progress uvp
        JOIN vocabulary v ON uvp.vocabulary_id = v.id
        WHERE uvp.user_id = ? AND v.topic_id = ?
        GROUP BY uvp.status
      `).all(userId, topic.id) as { status: string; count: number }[];

      for (const row of statusCounts) {
        if (row.status === 'mastered') masteredCount = row.count;
        if (row.status === 'learning') learningCount = row.count;
        if (row.status === 'review') reviewCount = row.count;
      }

      const tp = db.prepare(`
        SELECT is_completed, best_test_score FROM user_topic_progress
        WHERE user_id = ? AND topic_id = ?
      `).get(userId, topic.id) as { is_completed: number; best_test_score: number } | undefined;

      if (tp) {
        isCompleted = tp.is_completed === 1;
        bestTestScore = tp.best_test_score;
      }
    }

    const totalWords = wordCount.count || 0;
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
      is_completed: isCompleted,
      best_test_score: bestTestScore,
    };
  });
}

export function getTopicById(topicId: number, userId?: string): Topic | null {
  const db = getDb();
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId) as unknown as Topic;
  if (!topic) return null;

  const wordCount = db.prepare(`
    SELECT COUNT(*) as count FROM vocabulary WHERE topic_id = ?
  `).get(topic.id) as { count: number };

  let masteredCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let isCompleted = false;
  let bestTestScore: number | null = null;

  if (userId) {
    const statusCounts = db.prepare(`
      SELECT uvp.status, COUNT(*) as count
      FROM user_vocabulary_progress uvp
      JOIN vocabulary v ON uvp.vocabulary_id = v.id
      WHERE uvp.user_id = ? AND v.topic_id = ?
      GROUP BY uvp.status
    `).all(userId, topic.id) as { status: string; count: number }[];

    for (const row of statusCounts) {
      if (row.status === 'mastered') masteredCount = row.count;
      if (row.status === 'learning') learningCount = row.count;
      if (row.status === 'review') reviewCount = row.count;
    }

    const tp = db.prepare(`
      SELECT is_completed, best_test_score FROM user_topic_progress
      WHERE user_id = ? AND topic_id = ?
    `).get(userId, topic.id) as { is_completed: number; best_test_score: number } | undefined;

    if (tp) {
      isCompleted = tp.is_completed === 1;
      bestTestScore = tp.best_test_score;
    }
  }

  const totalWords = wordCount.count || 0;
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
    is_completed: isCompleted,
    best_test_score: bestTestScore,
  };
}

export function getVocabularyForTopic(topicId: number, userId?: string): Vocabulary[] {
  const db = getDb();
  const vocabList = db.prepare(`
    SELECT v.*,
      COALESCE(uvp.status, 'new') as status,
      COALESCE(uvp.correct_count, 0) as correct_count,
      COALESCE(uvp.wrong_count, 0) as wrong_count,
      uvp.last_reviewed_at,
      uvp.next_review_at
    FROM vocabulary v
    LEFT JOIN user_vocabulary_progress uvp ON v.id = uvp.vocabulary_id AND uvp.user_id = ?
    WHERE v.topic_id = ?
    ORDER BY v.id ASC
  `).all(userId || '', topicId) as unknown as Vocabulary[];

  // Attach distractors
  const distractorStmt = db.prepare(`
    SELECT * FROM vocabulary_distractors WHERE vocabulary_id = ? ORDER BY position ASC
  `);

  return vocabList.map((v) => {
    const distractors = distractorStmt.all(v.id) as unknown as Distractor[];
    return {
      ...v,
      distractors,
    };
  });
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
    status: WordStatus;
  } | undefined;

  let correctCount = existing?.correct_count || 0;
  let wrongCount = existing?.wrong_count || 0;

  if (isCorrect === true) correctCount += 1;
  if (isCorrect === false) wrongCount += 1;

  // Spaced repetition schedule calculation
  const now = new Date();
  let nextReviewDate = new Date();

  if (status === 'mastered') {
    // Correct mastered: 7 -> 14 -> 30 days
    const intervalDays = correctCount > 5 ? 30 : correctCount > 3 ? 14 : 7;
    nextReviewDate.setDate(now.getDate() + intervalDays);
  } else if (status === 'review') {
    // Review: tomorrow (1 day)
    nextReviewDate.setDate(now.getDate() + 1);
  } else if (status === 'learning') {
    // Learning: in 3 days
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
          last_reviewed_at = ?,
          next_review_at = ?,
          updated_at = ?
      WHERE user_id = ? AND vocabulary_id = ?
    `).run(status, correctCount, wrongCount, nowIso, nextReviewIso, nowIso, userId, vocabularyId);
  } else {
    db.prepare(`
      INSERT INTO user_vocabulary_progress
        (user_id, vocabulary_id, status, correct_count, wrong_count, last_reviewed_at, next_review_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, vocabularyId, status, correctCount, wrongCount, nowIso, nextReviewIso, nowIso);
  }

  // Check and update topic completion
  checkAndUpdateTopicCompletion(userId, vocabularyId);

  return { status, correctCount, wrongCount, nextReviewIso };
}

function checkAndUpdateTopicCompletion(userId: string, vocabularyId: number) {
  const db = getDb();
  const vocab = db.prepare('SELECT topic_id FROM vocabulary WHERE id = ?').get(vocabularyId) as { topic_id: number } | undefined;
  if (!vocab) return;

  const topicId = vocab.topic_id;
  const totalInTopic = db.prepare('SELECT COUNT(*) as count FROM vocabulary WHERE topic_id = ?').get(topicId) as { count: number };
  const masteredInTopic = db.prepare(`
    SELECT COUNT(*) as count FROM user_vocabulary_progress uvp
    JOIN vocabulary v ON uvp.vocabulary_id = v.id
    WHERE uvp.user_id = ? AND v.topic_id = ? AND uvp.status = 'mastered'
  `).get(userId, topicId) as { count: number };

  const currentTopicProg = db.prepare(`
    SELECT * FROM user_topic_progress WHERE user_id = ? AND topic_id = ?
  `).get(userId, topicId) as { is_completed: number; best_test_score: number } | undefined;

  const masteredRatio = totalInTopic.count > 0 ? (masteredInTopic.count / totalInTopic.count) : 0;
  const bestScore = currentTopicProg?.best_test_score || 0;

  // Rule: >= 90% mastered AND best_test_score >= 80%
  const isCompleted = masteredRatio >= 0.9 && bestScore >= 80 ? 1 : 0;

  if (currentTopicProg) {
    db.prepare(`
      UPDATE user_topic_progress
      SET is_completed = ?, completed_at = CASE WHEN ? = 1 AND is_completed = 0 THEN datetime('now') ELSE completed_at END
      WHERE user_id = ? AND topic_id = ?
    `).run(isCompleted, isCompleted, userId, topicId);
  } else {
    db.prepare(`
      INSERT INTO user_topic_progress (user_id, topic_id, is_completed, best_test_score, completed_at)
      VALUES (?, ?, ?, 0, CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END)
    `).run(userId, topicId, isCompleted, isCompleted);
  }
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
