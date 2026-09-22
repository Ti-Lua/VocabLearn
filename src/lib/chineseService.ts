import { getDb } from './db';
import { getSupabaseAdmin } from './supabase';
import {
  ChineseVocabulary,
  ChineseHskLevelStats,
  ChineseTopicSummary,
  ChineseDashboardStats,
  ChineseWordStatus,
} from '@/types';

/**
 * Get overall Chinese learning statistics for a user
 */
export function getChineseDashboardStats(userId: string): ChineseDashboardStats {
  const db = getDb();

  // Total words in Chinese dataset
  const totalRow = db.prepare('SELECT COUNT(*) as cnt FROM chinese_vocabulary').get() as { cnt: number };
  const total_words = totalRow?.cnt || 4896;

  // Words progress breakdown for user
  const userProgressRows = db.prepare(`
    SELECT status, COUNT(*) as cnt 
    FROM user_chinese_progress 
    WHERE user_id = ? 
    GROUP BY status
  `).all(userId) as { status: ChineseWordStatus; cnt: number }[];

  let words_mastered = 0;
  let words_learning = 0;
  let review_later = 0;

  for (const row of userProgressRows) {
    if (row.status === 'mastered') words_mastered = row.cnt;
    else if (row.status === 'learning') words_learning = row.cnt;
    else if (row.status === 'review_later') review_later = row.cnt;
  }

  // Level statistics for HSK 1 to 6 - gom vào 3 queries tổng thay vì lặp 18 queries
  const levels: ChineseHskLevelStats[] = [];
  let totalCompletedTopics = 0;
  let totalDistinctTopicsCount = 0;

  // 1. Tổng số từ theo từng level HSK
  const lvlTotals = db.prepare(`
    SELECT hsk_level, COUNT(*) as cnt 
    FROM chinese_vocabulary 
    GROUP BY hsk_level
  `).all() as { hsk_level: number; cnt: number }[];
  const lvlTotalMap = new Map<number, number>(lvlTotals.map((r) => [r.hsk_level, r.cnt]));

  // 2. Tiến độ học của user theo từng level HSK
  const lvlUserRows = db.prepare(`
    SELECT 
      cv.hsk_level,
      SUM(CASE WHEN ucp.status = 'mastered' THEN 1 ELSE 0 END) as mastered,
      SUM(CASE WHEN ucp.status = 'learning' THEN 1 ELSE 0 END) as learning,
      SUM(CASE WHEN ucp.status = 'review_later' THEN 1 ELSE 0 END) as review_later
    FROM chinese_vocabulary cv
    JOIN user_chinese_progress ucp ON cv.id = ucp.vocabulary_id
    WHERE ucp.user_id = ?
    GROUP BY cv.hsk_level
  `).all(userId) as { hsk_level: number; mastered: number | null; learning: number | null; review_later: number | null }[];
  const lvlUserMap = new Map<number, { mastered: number; learning: number; review_later: number }>();
  for (const r of lvlUserRows) {
    lvlUserMap.set(r.hsk_level, {
      mastered: r.mastered || 0,
      learning: r.learning || 0,
      review_later: r.review_later || 0,
    });
  }

  // 3. Tiến độ topic theo từng level HSK
  const topicRows = db.prepare(`
    SELECT 
      cv.hsk_level,
      cv.topic,
      COUNT(cv.id) as total,
      SUM(CASE WHEN ucp.status = 'mastered' THEN 1 ELSE 0 END) as mastered
    FROM chinese_vocabulary cv
    LEFT JOIN user_chinese_progress ucp ON cv.id = ucp.vocabulary_id AND ucp.user_id = ?
    GROUP BY cv.hsk_level, cv.topic
  `).all(userId) as { hsk_level: number; topic: string; total: number; mastered: number | null }[];

  const topicsByLevelMap = new Map<number, { topic: string; total: number; mastered: number }[]>();
  for (const r of topicRows) {
    if (!topicsByLevelMap.has(r.hsk_level)) {
      topicsByLevelMap.set(r.hsk_level, []);
    }
    const mastered = r.mastered || 0;
    topicsByLevelMap.get(r.hsk_level)!.push({ topic: r.topic, total: r.total, mastered });
    totalDistinctTopicsCount++;
    if (r.total > 0 && mastered === r.total) {
      totalCompletedTopics++;
    }
  }

  for (let lvl = 1; lvl <= 6; lvl++) {
    const lvlTotal = lvlTotalMap.get(lvl) || 0;
    const userProgress = lvlUserMap.get(lvl) || { mastered: 0, learning: 0, review_later: 0 };
    const topicsInLvl = topicsByLevelMap.get(lvl) || [];

    const mastered = userProgress.mastered;
    const learning = userProgress.learning;
    const review_later_cnt = userProgress.review_later;
    const new_words = Math.max(0, lvlTotal - (mastered + learning + review_later_cnt));
    const progress_percentage = lvlTotal > 0 ? Math.round((mastered / lvlTotal) * 100) : 0;

    levels.push({
      level: lvl,
      name: `HSK ${lvl}`,
      total_words: lvlTotal,
      mastered_words: mastered,
      learning_words: learning,
      review_later_words: review_later_cnt,
      new_words,
      progress_percentage,
      topics_count: topicsInLvl.length,
    });
  }

  const overall_progress_percentage = total_words > 0 ? Math.round((words_mastered / total_words) * 100) : 0;

  return {
    total_words,
    words_mastered,
    words_learning,
    review_later,
    topics_completed: totalCompletedTopics,
    total_topics: totalDistinctTopicsCount,
    overall_progress_percentage,
    levels,
  };
}

/**
 * Get all 6 HSK levels with stats for a user
 */
export function getHskLevelsWithProgress(userId: string): ChineseHskLevelStats[] {
  const stats = getChineseDashboardStats(userId);
  return stats.levels;
}

/**
 * Get all topics dynamically for a specific HSK level
 */
export function getTopicsByHskLevel(level: number, userId: string): ChineseTopicSummary[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT 
      cv.topic,
      COUNT(cv.id) as total_words,
      SUM(CASE WHEN ucp.status = 'mastered' THEN 1 ELSE 0 END) as mastered_words,
      SUM(CASE WHEN ucp.status = 'learning' THEN 1 ELSE 0 END) as learning_words
    FROM chinese_vocabulary cv
    LEFT JOIN user_chinese_progress ucp 
      ON cv.id = ucp.vocabulary_id AND ucp.user_id = ?
    WHERE cv.hsk_level = ?
    GROUP BY cv.topic
    ORDER BY cv.topic ASC
  `).all(userId, level) as {
    topic: string;
    total_words: number;
    mastered_words: number | null;
    learning_words: number | null;
  }[];

  return rows.map((r) => {
    const total = r.total_words || 0;
    const mastered = r.mastered_words || 0;
    const learning = r.learning_words || 0;
    const progress_percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
    const is_completed = total > 0 && mastered === total;

    return {
      topic: r.topic,
      hsk_level: level,
      total_words: total,
      mastered_words: mastered,
      learning_words: learning,
      progress_percentage,
      is_completed,
    };
  });
}

/**
 * Get all vocabulary words in a specific level and topic
 */
export function getTopicWords(level: number, topic: string, userId: string): ChineseVocabulary[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT 
      cv.id,
      cv.language,
      cv.word,
      cv.pinyin,
      cv.meaning_vi,
      cv.example_cn,
      cv.example_pinyin,
      cv.example_vi,
      cv.topic,
      cv.hsk_system,
      cv.hsk_level,
      cv.duplicate_in_levels,
      cv.source_sheet,
      cv.created_at,
      cv.updated_at,
      COALESCE(ucp.status, 'new') as status,
      COALESCE(ucp.mastery_level, 0) as mastery_level,
      COALESCE(ucp.review_count, 0) as review_count,
      COALESCE(ucp.correct_count, 0) as correct_count,
      COALESCE(ucp.incorrect_count, 0) as incorrect_count,
      ucp.last_reviewed_at,
      ucp.next_review_at
    FROM chinese_vocabulary cv
    LEFT JOIN user_chinese_progress ucp 
      ON cv.id = ucp.vocabulary_id AND ucp.user_id = ?
    WHERE cv.hsk_level = ? AND cv.topic = ?
    ORDER BY cv.id ASC
  `).all(userId, level, topic) as ChineseVocabulary[];

  return rows;
}

/**
 * Update user learning progress for a specific Chinese vocabulary item
 */
export function updateChineseWordProgress(
  userId: string,
  vocabularyId: string,
  status: 'learning' | 'mastered' | 'review_later'
): { success: boolean; status: ChineseWordStatus } {
  const db = getDb();

  // Validate vocabulary exists
  const vocab = db.prepare('SELECT id FROM chinese_vocabulary WHERE id = ?').get(vocabularyId);
  if (!vocab) {
    throw new Error(`Không tìm thấy từ vựng tiếng Trung với ID: ${vocabularyId}`);
  }

  const upsertProgress = db.prepare(`
    INSERT INTO user_chinese_progress (
      user_id, vocabulary_id, status, mastery_level, review_count, correct_count, incorrect_count, last_reviewed_at, next_review_at, created_at, updated_at
    ) VALUES (
      ?, ?, ?,
      CASE WHEN ? = 'mastered' THEN 5 WHEN ? = 'learning' THEN 2 ELSE 1 END,
      1,
      CASE WHEN ? = 'mastered' THEN 1 ELSE 0 END,
      CASE WHEN ? = 'learning' THEN 1 ELSE 0 END,
      datetime('now'),
      CASE 
        WHEN ? = 'mastered' THEN datetime('now', '+7 days')
        WHEN ? = 'review_later' THEN datetime('now', '+1 days')
        ELSE datetime('now', '+2 days')
      END,
      datetime('now'),
      datetime('now')
    )
    ON CONFLICT(user_id, vocabulary_id) DO UPDATE SET
      status = excluded.status,
      mastery_level = CASE 
        WHEN excluded.status = 'mastered' THEN 5 
        WHEN excluded.status = 'learning' THEN MAX(user_chinese_progress.mastery_level, 2) 
        ELSE 1 
      END,
      review_count = user_chinese_progress.review_count + 1,
      correct_count = CASE WHEN excluded.status = 'mastered' THEN user_chinese_progress.correct_count + 1 ELSE user_chinese_progress.correct_count END,
      incorrect_count = CASE WHEN excluded.status = 'learning' THEN user_chinese_progress.incorrect_count + 1 ELSE user_chinese_progress.incorrect_count END,
      last_reviewed_at = datetime('now'),
      next_review_at = CASE 
        WHEN excluded.status = 'mastered' THEN datetime('now', '+7 days')
        WHEN excluded.status = 'review_later' THEN datetime('now', '+1 days')
        ELSE datetime('now', '+2 days')
      END,
      updated_at = datetime('now');
  `);

  upsertProgress.run(
    userId,
    vocabularyId,
    status,
    status,
    status,
    status,
    status,
    status,
    status
  );

  // Đồng bộ lên Supabase Cloud (đảm bảo dữ liệu bền vững khi deploy Vercel)
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const nowIso = new Date().toISOString();
      supabase.from('user_chinese_progress').upsert({
        user_id: userId,
        vocabulary_id: vocabularyId,
        status,
        mastery_level: status === 'mastered' ? 5 : status === 'learning' ? 2 : 1,
        updated_at: nowIso,
      }, { onConflict: 'user_id,vocabulary_id' }).then(({ error }) => {
        if (error) console.warn('Supabase sync Chinese progress error:', error.message);
      });
    }
  } catch (e) {
    console.warn('Lỗi gọi Supabase từ updateChineseWordProgress:', e);
  }

  return { success: true, status };
}

/**
 * Get all words for review (status = 'learning' or 'review_later')
 */
export function getChineseReviewWords(
  userId: string,
  level?: number | 'all',
  topic?: string | 'all'
): ChineseVocabulary[] {
  const db = getDb();

  let query = `
    SELECT 
      cv.id,
      cv.language,
      cv.word,
      cv.pinyin,
      cv.meaning_vi,
      cv.example_cn,
      cv.example_pinyin,
      cv.example_vi,
      cv.topic,
      cv.hsk_system,
      cv.hsk_level,
      cv.duplicate_in_levels,
      cv.source_sheet,
      cv.created_at,
      cv.updated_at,
      ucp.status,
      ucp.mastery_level,
      ucp.review_count,
      ucp.correct_count,
      ucp.incorrect_count,
      ucp.last_reviewed_at,
      ucp.next_review_at
    FROM user_chinese_progress ucp
    JOIN chinese_vocabulary cv ON ucp.vocabulary_id = cv.id
    WHERE ucp.user_id = ? 
      AND ucp.status IN ('learning', 'review_later')
  `;

  const params: unknown[] = [userId];

  if (level && level !== 'all') {
    query += ' AND cv.hsk_level = ?';
    params.push(level);
  }

  if (topic && topic !== 'all') {
    query += ' AND cv.topic = ?';
    params.push(topic);
  }

  query += ' ORDER BY ucp.updated_at DESC';

  return db.prepare(query).all(...params) as ChineseVocabulary[];
}

/**
 * Search and filter Chinese vocabulary words
 */
export function searchChineseWords(options: {
  userId: string;
  query?: string;
  level?: number | 'all';
  topic?: string | 'all';
  status?: string | 'all';
  limit?: number;
  offset?: number;
  sort?: 'id' | 'word' | 'pinyin' | 'status';
  sortOrder?: 'asc' | 'desc';
}): { words: ChineseVocabulary[]; total: number } {
  const db = getDb();
  const {
    userId,
    query = '',
    level = 'all',
    topic = 'all',
    status = 'all',
    limit = 50,
    offset = 0,
    sort = 'id',
    sortOrder = 'asc',
  } = options;

  let whereClause = 'WHERE 1=1';
  const params: unknown[] = [userId];

  if (query.trim()) {
    const term = `%${query.trim().toLowerCase()}%`;
    whereClause += ` AND (
      cv.word LIKE ? 
      OR LOWER(cv.pinyin) LIKE ? 
      OR LOWER(cv.meaning_vi) LIKE ?
    )`;
    params.push(`%${query.trim()}%`, term, term);
  }

  if (level && level !== 'all') {
    whereClause += ' AND cv.hsk_level = ?';
    params.push(level);
  }

  if (topic && topic !== 'all') {
    whereClause += ' AND cv.topic = ?';
    params.push(topic);
  }

  if (status && status !== 'all') {
    if (status === 'new') {
      whereClause += " AND (ucp.status IS NULL OR ucp.status = 'new')";
    } else {
      whereClause += ' AND ucp.status = ?';
      params.push(status);
    }
  }

  // Count total matching
  const countSql = `
    SELECT COUNT(cv.id) as cnt
    FROM chinese_vocabulary cv
    LEFT JOIN user_chinese_progress ucp ON cv.id = ucp.vocabulary_id AND ucp.user_id = ?
    ${whereClause}
  `;
  const countRow = db.prepare(countSql).get(...params) as { cnt: number };
  const total = countRow?.cnt || 0;

  // Sorting
  let orderBy = 'cv.id ASC';
  if (sort === 'word') orderBy = `cv.word ${sortOrder.toUpperCase()}`;
  else if (sort === 'pinyin') orderBy = `cv.pinyin ${sortOrder.toUpperCase()}`;
  else if (sort === 'status') orderBy = `COALESCE(ucp.status, 'new') ${sortOrder.toUpperCase()}`;
  else orderBy = `cv.id ${sortOrder.toUpperCase()}`;

  const fetchSql = `
    SELECT 
      cv.id,
      cv.language,
      cv.word,
      cv.pinyin,
      cv.meaning_vi,
      cv.example_cn,
      cv.example_pinyin,
      cv.example_vi,
      cv.topic,
      cv.hsk_system,
      cv.hsk_level,
      cv.duplicate_in_levels,
      cv.source_sheet,
      cv.created_at,
      cv.updated_at,
      COALESCE(ucp.status, 'new') as status,
      COALESCE(ucp.mastery_level, 0) as mastery_level,
      COALESCE(ucp.review_count, 0) as review_count,
      COALESCE(ucp.correct_count, 0) as correct_count,
      COALESCE(ucp.incorrect_count, 0) as incorrect_count,
      ucp.last_reviewed_at,
      ucp.next_review_at
    FROM chinese_vocabulary cv
    LEFT JOIN user_chinese_progress ucp ON cv.id = ucp.vocabulary_id AND ucp.user_id = ?
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const words = db.prepare(fetchSql).all(...params, limit, offset) as ChineseVocabulary[];

  return { words, total };
}
