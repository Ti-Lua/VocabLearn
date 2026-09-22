import { getSupabaseAdmin } from './supabase';
import { getDb } from './db';
import { PERSONAL_PROFILE_ID } from '@/config/personal';
import { Book, Topic, Vocabulary, WordStatus, UserStats } from '@/types';
import {
  getBooks,
  getBookById,
  getTopics,
  getTopicById,
  getVocabularyForTopic,
  updateWordProgress,
} from './services';

/**
 * Personal Learning Data Access Layer
 * Supabase Cloud là Source of Truth vĩnh viễn cho mọi tiến độ học tập của Personal Profile.
 * Kết hợp SQLite cục bộ làm bộ đệm tốc độ cao cho metadata sách và từ vựng tĩnh.
 */

function getLocalUserStats(): UserStats {
  try {
    const db = getDb();
    const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(PERSONAL_PROFILE_ID) as any;
    if (stats) {
      return {
        user_id: PERSONAL_PROFILE_ID,
        total_words_learned: stats.total_words_learned || 0,
        total_words_mastered: stats.total_words_mastered || 0,
        total_topics_completed: stats.total_topics_completed || 0,
        current_streak: stats.current_streak || 1,
        longest_streak: stats.longest_streak || 1,
        total_learning_minutes: stats.total_learning_minutes || 0,
        last_learning_date: stats.last_learning_date || null,
        last_book_id: stats.last_book_id || null,
        last_topic_id: stats.last_topic_id || null,
        last_vocab_id: stats.last_vocab_id || null,
      };
    }
    const mastered = (db.prepare("SELECT COUNT(*) as c FROM user_vocabulary_progress WHERE user_id = ? AND status = 'mastered'").get(PERSONAL_PROFILE_ID) as any)?.c || 0;
    const learning = (db.prepare("SELECT COUNT(*) as c FROM user_vocabulary_progress WHERE user_id = ? AND status = 'learning'").get(PERSONAL_PROFILE_ID) as any)?.c || 0;
    const review = (db.prepare("SELECT COUNT(*) as c FROM user_vocabulary_progress WHERE user_id = ? AND status = 'review'").get(PERSONAL_PROFILE_ID) as any)?.c || 0;
    return {
      user_id: PERSONAL_PROFILE_ID,
      total_words_learned: mastered + learning + review,
      total_words_mastered: mastered,
      total_topics_completed: 0,
      current_streak: 1,
      longest_streak: 1,
      total_learning_minutes: 0,
      last_learning_date: null,
      last_book_id: null,
      last_topic_id: null,
      last_vocab_id: null,
    };
  } catch (e) {
    console.error('Error getLocalUserStats:', e);
    return {
      user_id: PERSONAL_PROFILE_ID,
      total_words_learned: 0,
      total_words_mastered: 0,
      total_topics_completed: 0,
      current_streak: 1,
      longest_streak: 1,
      total_learning_minutes: 0,
      last_learning_date: null,
      last_book_id: null,
      last_topic_id: null,
      last_vocab_id: null,
    };
  }
}

function getLocalContinueLearning() {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT utp.*, t.name as topic_name, t.unit_number, b.id as book_id, b.name as book_name, b.short_name as book_short_name, b.level as book_level, b.cover_image as book_cover_image
      FROM user_topic_progress utp
      JOIN topics t ON utp.topic_id = t.id
      JOIN books b ON t.book_id = b.id
      WHERE utp.user_id = ? AND utp.status != 'completed'
      ORDER BY utp.last_studied_at DESC
      LIMIT 1
    `).get(PERSONAL_PROFILE_ID) as any;

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
        learnedWords: row.learned_words || 0,
        totalWords: row.total_words || 20,
        progressPercent: row.progress_percent || 0,
        resumeUrl: `/topics/${row.topic_id}${row.last_vocab_id ? `?startWordId=${row.last_vocab_id}` : ''}`,
      };
    }

    const firstTopic = db.prepare(`
      SELECT t.*, b.id as book_id, b.name as book_name, b.short_name as book_short_name, b.level as book_level, b.cover_image as book_cover_image
      FROM topics t
      JOIN books b ON t.book_id = b.id
      ORDER BY b.order_index ASC, t.order_index ASC, t.id ASC
      LIMIT 1
    `).get() as any;

    if (firstTopic) {
      return {
        bookId: firstTopic.book_id,
        bookName: firstTopic.book_name,
        bookShortName: firstTopic.book_short_name,
        bookLevel: firstTopic.book_level,
        bookCoverImage: firstTopic.book_cover_image,
        topicId: firstTopic.id,
        topicName: firstTopic.name,
        unitNumber: firstTopic.unit_number,
        lastVocabId: null,
        learnedWords: 0,
        totalWords: 20,
        progressPercent: 0,
        resumeUrl: `/topics/${firstTopic.id}`,
      };
    }
  } catch (e) {
    console.error('Error getLocalContinueLearning:', e);
  }
  return null;
}

function getLocalReviewWords(bookId?: number, topicId?: number): Vocabulary[] {
  try {
    const db = getDb();
    let query = `
      SELECT v.*, uvp.status, uvp.correct_count, uvp.wrong_count, uvp.last_reviewed_at, uvp.next_review_at
      FROM user_vocabulary_progress uvp
      JOIN vocabulary v ON uvp.vocabulary_id = v.id
      WHERE uvp.user_id = ? AND uvp.status = 'review'
    `;
    const params: any[] = [PERSONAL_PROFILE_ID];
    if (bookId) {
      query += ' AND v.book_id = ?';
      params.push(bookId);
    }
    if (topicId) {
      query += ' AND v.topic_id = ?';
      params.push(topicId);
    }
    query += ' ORDER BY uvp.updated_at DESC';
    return db.prepare(query).all(...params) as unknown as Vocabulary[];
  } catch (e) {
    console.error('Error getLocalReviewWords:', e);
    return [];
  }
}

function getLocalMasteredWords(bookId?: number, topicId?: number): Vocabulary[] {
  try {
    const db = getDb();
    let query = `
      SELECT v.*, uvp.status, uvp.correct_count, uvp.wrong_count, uvp.last_reviewed_at, uvp.next_review_at
      FROM user_vocabulary_progress uvp
      JOIN vocabulary v ON uvp.vocabulary_id = v.id
      WHERE uvp.user_id = ? AND uvp.status = 'mastered'
    `;
    const params: any[] = [PERSONAL_PROFILE_ID];
    if (bookId) {
      query += ' AND v.book_id = ?';
      params.push(bookId);
    }
    if (topicId) {
      query += ' AND v.topic_id = ?';
      params.push(topicId);
    }
    query += ' ORDER BY uvp.updated_at DESC';
    return db.prepare(query).all(...params) as unknown as Vocabulary[];
  } catch (e) {
    console.error('Error getLocalMasteredWords:', e);
    return [];
  }
}

/**
 * 1. Lấy thống kê học tập tổng hợp từ Supabase (fallback SQLite)
 */
export async function getPersonalUserStats(): Promise<UserStats> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return getLocalUserStats();
  }

  try {
    // 1. Lấy danh sách tiến độ từ vựng của profile
    const { data: progressList } = await supabase
      .from('user_vocabulary_progress')
      .select('status')
      .eq('user_id', PERSONAL_PROFILE_ID);

    const mastered = progressList?.filter((p) => p.status === 'mastered').length || 0;
    const review = progressList?.filter((p) => p.status === 'review').length || 0;
    const learning = progressList?.filter((p) => p.status === 'learning').length || 0;
    const totalLearned = mastered + review + learning;

    // 2. Lấy số topic đã hoàn thành
    const { count: completedTopics } = await supabase
      .from('user_topic_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', PERSONAL_PROFILE_ID)
      .eq('is_completed', true);

    // 3. Lấy thông tin session gần nhất từ user_stats
    const { data: statsRow } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', PERSONAL_PROFILE_ID)
      .maybeSingle();

    return {
      user_id: PERSONAL_PROFILE_ID,
      total_words_learned: totalLearned,
      total_words_mastered: mastered,
      total_topics_completed: completedTopics || 0,
      current_streak: statsRow?.current_streak || 1,
      longest_streak: statsRow?.longest_streak || 1,
      total_learning_minutes: statsRow?.total_learning_minutes || 0,
      last_learning_date: statsRow?.last_learning_date || null,
      last_book_id: statsRow?.last_book_id || null,
      last_topic_id: statsRow?.last_topic_id || null,
      last_vocab_id: statsRow?.last_vocab_id || null,
    };
  } catch (error) {
    console.error('Error fetching personal user stats:', error);
    return getLocalUserStats();
  }
}

/**
 * 2. Lấy vị trí học dang dở gần nhất (Continue Learning)
 */
export async function getPersonalContinueLearning() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return getLocalContinueLearning();

  try {
    // 1. Tìm topic đang học gần nhất từ user_topic_progress
    const { data: latestTopicProg } = await supabase
      .from('user_topic_progress')
      .select(`
        topic_id,
        last_vocab_id,
        status,
        learned_words,
        total_words,
        progress_percent,
        topics:topic_id (
          id,
          name,
          unit_number,
          book_id,
          books:book_id (
            id,
            name,
            short_name,
            level,
            cover_image
          )
        )
      `)
      .eq('user_id', PERSONAL_PROFILE_ID)
      .neq('status', 'completed')
      .order('last_studied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestTopicProg && latestTopicProg.topics) {
      const t: any = latestTopicProg.topics;
      const b: any = t.books;
      return {
        bookId: b.id,
        bookName: b.name,
        bookShortName: b.short_name,
        bookLevel: b.level,
        bookCoverImage: b.cover_image,
        topicId: t.id,
        topicName: t.name,
        unitNumber: t.unit_number,
        lastVocabId: latestTopicProg.last_vocab_id,
        learnedWords: latestTopicProg.learned_words,
        totalWords: latestTopicProg.total_words,
        progressPercent: latestTopicProg.progress_percent,
        resumeUrl: `/topics/${t.id}${latestTopicProg.last_vocab_id ? `?startWordId=${latestTopicProg.last_vocab_id}` : ''}`,
      };
    }

    // 2. Dự phòng: kiểm tra last_topic_id trong user_stats
    const { data: statsRow } = await supabase
      .from('user_stats')
      .select('last_book_id, last_topic_id, last_vocab_id')
      .eq('user_id', PERSONAL_PROFILE_ID)
      .maybeSingle();

    if (statsRow?.last_topic_id) {
      const { data: topic } = await supabase
        .from('topics')
        .select('*, books(*)')
        .eq('id', statsRow.last_topic_id)
        .maybeSingle();

      if (topic) {
        const b: any = topic.books;
        return {
          bookId: b.id,
          bookName: b.name,
          bookShortName: b.short_name,
          bookLevel: b.level,
          bookCoverImage: b.cover_image,
          topicId: topic.id,
          topicName: topic.name,
          unitNumber: topic.unit_number,
          lastVocabId: statsRow.last_vocab_id,
          learnedWords: 0,
          totalWords: 20,
          progressPercent: 0,
          resumeUrl: `/topics/${topic.id}${statsRow.last_vocab_id ? `?startWordId=${statsRow.last_vocab_id}` : ''}`,
        };
      }
    }

    // 3. Mặc định gợi ý Unit 1 của cuốn sách đầu tiên
    const { data: firstTopic } = await supabase
      .from('topics')
      .select('*, books(*)')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstTopic) {
      const b: any = firstTopic.books;
      return {
        bookId: b.id,
        bookName: b.name,
        bookShortName: b.short_name,
        bookLevel: b.level,
        bookCoverImage: b.cover_image,
        topicId: firstTopic.id,
        topicName: firstTopic.name,
        unitNumber: firstTopic.unit_number,
        lastVocabId: null,
        learnedWords: 0,
        totalWords: 20,
        progressPercent: 0,
        resumeUrl: `/topics/${firstTopic.id}`,
      };
    }

    return getLocalContinueLearning();
  } catch (error) {
    console.error('Error fetching continue learning:', error);
    return getLocalContinueLearning();
  }
}

/**
 * 3. Cập nhật tiến độ từ vựng lên Supabase (ĐÃ THUỘC / ÔN LẠI / ĐANG HỌC)
 */
export async function updatePersonalWordProgress(
  vocabularyId: number,
  status: WordStatus | 'known',
  isCorrect?: boolean
) {
  // Chuẩn hóa status theo database constraint: ('new', 'learning', 'mastered', 'review')
  const dbStatus: WordStatus = status === 'known' ? 'mastered' : status;

  // Luôn cập nhật vào SQLite cục bộ để bảo đảm dữ liệu offline/Serverless fallback
  try {
    updateWordProgress(PERSONAL_PROFILE_ID, vocabularyId, dbStatus, isCorrect);
  } catch (localErr) {
    console.warn('Lỗi ghi tiến trình SQLite cục bộ:', localErr);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: true };
  }

  // Lấy tiến độ hiện tại từ Supabase
  const { data: existing } = await supabase
    .from('user_vocabulary_progress')
    .select('correct_count, wrong_count, review_count')
    .eq('user_id', PERSONAL_PROFILE_ID)
    .eq('vocabulary_id', vocabularyId)
    .maybeSingle();

  let correctCount = existing?.correct_count || 0;
  let wrongCount = existing?.wrong_count || 0;
  let reviewCount = existing?.review_count || 0;

  if (isCorrect === true) correctCount += 1;
  if (isCorrect === false) wrongCount += 1;
  if (dbStatus === 'review') reviewCount += 1;

  const now = new Date();
  const nowIso = now.toISOString();

  const nextReviewDate = new Date();
  if (dbStatus === 'mastered') {
    const intervalDays = correctCount > 5 ? 30 : correctCount > 3 ? 14 : 7;
    nextReviewDate.setDate(now.getDate() + intervalDays);
  } else if (dbStatus === 'review') {
    nextReviewDate.setDate(now.getDate() + 1);
  } else if (dbStatus === 'learning') {
    nextReviewDate.setDate(now.getDate() + 3);
  }
  const nextReviewIso = nextReviewDate.toISOString();

  // 1. UPSERT vào user_vocabulary_progress trên Supabase
  const { error: upsertErr } = await supabase
    .from('user_vocabulary_progress')
    .upsert(
      {
        user_id: PERSONAL_PROFILE_ID,
        vocabulary_id: vocabularyId,
        status: dbStatus,
        correct_count: correctCount,
        wrong_count: wrongCount,
        incorrect_count: wrongCount,
        review_count: reviewCount,
        last_reviewed_at: nowIso,
        next_review_at: nextReviewIso,
        updated_at: nowIso,
      },
      { onConflict: 'user_id,vocabulary_id' }
    );

  if (upsertErr) {
    console.error('Lỗi upsert tiến độ từ vựng Supabase:', upsertErr.message);
    throw upsertErr;
  }

  // 2. Tự động đồng bộ vị trí học vào user_topic_progress & user_stats
  try {
    // Lấy thông tin topic_id và book_id của từ này
    const { data: vocab } = await supabase
      .from('vocabulary')
      .select('id, topic_id, book_id')
      .eq('id', vocabularyId)
      .maybeSingle();

    if (vocab) {
      const topicId = vocab.topic_id;
      const bookId = vocab.book_id;

      // Cập nhật user_stats (vị trí học gần nhất)
      await supabase
        .from('user_stats')
        .upsert(
          {
            user_id: PERSONAL_PROFILE_ID,
            last_book_id: bookId,
            last_topic_id: topicId,
            last_vocab_id: vocabularyId,
            last_learning_date: nowIso.slice(0, 10),
            updated_at: nowIso,
          },
          { onConflict: 'user_id' }
        );

      // Tính tổng số từ trong topic
      const { count: totalInTopic } = await supabase
        .from('vocabulary')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', topicId);

      // Tính số từ đã học trong topic
      const { data: topicVocabs } = await supabase
        .from('vocabulary')
        .select('id')
        .eq('topic_id', topicId);

      const topicVocabIds = topicVocabs?.map((v) => v.id) || [];
      const { data: learnedList } = await supabase
        .from('user_vocabulary_progress')
        .select('vocabulary_id, status')
        .eq('user_id', PERSONAL_PROFILE_ID)
        .in('vocabulary_id', topicVocabIds);

      const masteredCount = learnedList?.filter((p) => p.status === 'mastered').length || 0;
      const totalWords = totalInTopic || topicVocabIds.length || 20;
      const progressPercent = Math.min(100, Math.round((masteredCount / totalWords) * 100));
      const isCompleted = progressPercent === 100;

      // Cập nhật user_topic_progress
      await supabase
        .from('user_topic_progress')
        .upsert(
          {
            user_id: PERSONAL_PROFILE_ID,
            topic_id: topicId,
            last_vocab_id: vocabularyId,
            status: isCompleted ? 'completed' : 'in_progress',
            is_completed: isCompleted,
            learned_words: learnedList?.length || 0,
            total_words: totalWords,
            progress_percent: progressPercent,
            completed_at: isCompleted ? nowIso : null,
            last_studied_at: nowIso,
          },
          { onConflict: 'user_id,topic_id' }
        );

      // Cập nhật số topic hoàn thành trong user_stats
      const { count: completedTopicsCount } = await supabase
        .from('user_topic_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', PERSONAL_PROFILE_ID)
        .eq('is_completed', true);

      // Cập nhật tổng từ đã thuộc trong user_stats
      const { count: totalMasteredCount } = await supabase
        .from('user_vocabulary_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', PERSONAL_PROFILE_ID)
        .eq('status', 'mastered');

      // Cập nhật tổng từ đã học trong user_stats
      const { count: totalLearnedCount } = await supabase
        .from('user_vocabulary_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', PERSONAL_PROFILE_ID);

      await supabase
        .from('user_stats')
        .upsert(
          {
            user_id: PERSONAL_PROFILE_ID,
            total_words_learned: totalLearnedCount || 0,
            total_words_mastered: totalMasteredCount || 0,
            total_topics_completed: completedTopicsCount || 0,
            last_learning_date: nowIso.slice(0, 10),
            updated_at: nowIso,
          },
          { onConflict: 'user_id' }
        );
    }
  } catch (syncErr) {
    console.warn('Lỗi đồng bộ metadata topic/stats:', syncErr);
  }

  return { status: dbStatus, correctCount, wrongCount, nextReviewIso };
}

/**
 * 4. Lấy danh sách từ CẦN ÔN TẬP (status = 'review') từ Supabase (fallback SQLite)
 */
export async function getPersonalReviewWords(bookId?: number, topicId?: number): Promise<Vocabulary[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return getLocalReviewWords(bookId, topicId);

  try {
    const query = supabase
      .from('user_vocabulary_progress')
      .select(`
        vocabulary_id,
        status,
        correct_count,
        wrong_count,
        last_reviewed_at,
        next_review_at,
        vocabulary:vocabulary_id (
          id,
          book_id,
          topic_id,
          word,
          normalized_word,
          ipa,
          part_of_speech,
          meaning_vi,
          meaning_en,
          example_1,
          example_1_vi,
          example_2,
          example_2_vi,
          level,
          audio_url,
          word_image
        )
      `)
      .eq('user_id', PERSONAL_PROFILE_ID)
      .eq('status', 'review')
      .order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return getLocalReviewWords(bookId, topicId);
    }

    const results: Vocabulary[] = [];
    for (const row of data) {
      if (row.vocabulary) {
        const v: any = row.vocabulary;
        if (bookId && v.book_id !== bookId) continue;
        if (topicId && v.topic_id !== topicId) continue;
        results.push({
          ...v,
          status: 'review',
          correct_count: row.correct_count,
          wrong_count: row.wrong_count,
          last_reviewed_at: row.last_reviewed_at,
          next_review_at: row.next_review_at,
        });
      }
    }

    return results.length > 0 ? results : getLocalReviewWords(bookId, topicId);
  } catch (error) {
    console.error('Error fetching review words:', error);
    return getLocalReviewWords(bookId, topicId);
  }
}

/**
 * 5. Lấy danh sách từ ĐÃ THUỘC (status = 'mastered') từ Supabase (fallback SQLite)
 */
export async function getPersonalMasteredWords(bookId?: number, topicId?: number): Promise<Vocabulary[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return getLocalMasteredWords(bookId, topicId);

  try {
    const query = supabase
      .from('user_vocabulary_progress')
      .select(`
        vocabulary_id,
        status,
        correct_count,
        wrong_count,
        last_reviewed_at,
        next_review_at,
        vocabulary:vocabulary_id (
          id,
          book_id,
          topic_id,
          word,
          normalized_word,
          ipa,
          part_of_speech,
          meaning_vi,
          meaning_en,
          example_1,
          example_1_vi,
          example_2,
          example_2_vi,
          level,
          audio_url,
          word_image
        )
      `)
      .eq('user_id', PERSONAL_PROFILE_ID)
      .eq('status', 'mastered')
      .order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return getLocalMasteredWords(bookId, topicId);
    }

    const results: Vocabulary[] = [];
    for (const row of data) {
      if (row.vocabulary) {
        const v: any = row.vocabulary;
        if (bookId && v.book_id !== bookId) continue;
        if (topicId && v.topic_id !== topicId) continue;
        results.push({
          ...v,
          status: 'mastered',
          correct_count: row.correct_count,
          wrong_count: row.wrong_count,
          last_reviewed_at: row.last_reviewed_at,
          next_review_at: row.next_review_at,
        });
      }
    }

    return results.length > 0 ? results : getLocalMasteredWords(bookId, topicId);
  } catch (error) {
    console.error('Error fetching mastered words:', error);
    return getLocalMasteredWords(bookId, topicId);
  }
}

/**
 * 6. Lấy từ vựng của 1 Topic kèm tiến độ Supabase Cloud của Personal Profile (fallback SQLite)
 */
export async function getTopicVocabularyWithProgress(topicId: number): Promise<Vocabulary[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return getVocabularyForTopic(topicId, PERSONAL_PROFILE_ID, 1, 1000);

  try {
    // 1. Lấy danh sách từ của topic
    const { data: vocabs, error: vErr } = await supabase
      .from('vocabulary')
      .select('*')
      .eq('topic_id', topicId)
      .order('id', { ascending: true });

    if (vErr || !vocabs || vocabs.length === 0) {
      return getVocabularyForTopic(topicId, PERSONAL_PROFILE_ID, 1, 1000);
    }

    const vocabIds = vocabs.map((v) => v.id);

    // 2. Lấy tiến độ từ vựng của user trên Supabase
    const { data: progressList } = await supabase
      .from('user_vocabulary_progress')
      .select('vocabulary_id, status, correct_count, wrong_count, last_reviewed_at, next_review_at')
      .eq('user_id', PERSONAL_PROFILE_ID)
      .in('vocabulary_id', vocabIds);

    const progMap = new Map<number, any>();
    progressList?.forEach((p) => progMap.set(p.vocabulary_id, p));

    // 3. Lấy distractors cho các từ vựng này
    const { data: distractors } = await supabase
      .from('vocabulary_distractors')
      .select('*')
      .in('vocabulary_id', vocabIds)
      .order('position', { ascending: true });

    const distractorMap = new Map<number, any[]>();
    distractors?.forEach((d) => {
      if (!distractorMap.has(d.vocabulary_id)) distractorMap.set(d.vocabulary_id, []);
      distractorMap.get(d.vocabulary_id)!.push(d);
    });

    // 4. Hợp nhất dữ liệu
    return vocabs.map((v) => {
      const p = progMap.get(v.id);
      return {
        ...v,
        status: p?.status || 'new',
        correct_count: p?.correct_count || 0,
        wrong_count: p?.wrong_count || 0,
        last_reviewed_at: p?.last_reviewed_at || null,
        next_review_at: p?.next_review_at || null,
        distractors: distractorMap.get(v.id) || [],
      };
    });
  } catch (error) {
    console.error('Error fetching topic vocabulary with progress:', error);
    return getVocabularyForTopic(topicId, PERSONAL_PROFILE_ID, 1, 1000);
  }
}

/**
 * 7. Lấy danh mục sách kèm tiến độ Supabase của Personal Profile (fallback SQLite)
 */
export async function getBooksWithPersonalProgress(languageId = 1): Promise<Book[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return getBooks(PERSONAL_PROFILE_ID, languageId);

  try {
    const { data: books, error: bErr } = await supabase
      .from('books')
      .select('*')
      .eq('language_id', languageId)
      .order('order_index', { ascending: true });

    if (bErr || !books || books.length === 0) {
      return getBooks(PERSONAL_PROFILE_ID, languageId);
    }

    // Lấy thống kê tổng số topic và từ theo sách
    const { data: allTopics } = await supabase.from('topics').select('id, book_id');
    const topicCountMap = new Map<number, number>();
    allTopics?.forEach((t) => {
      topicCountMap.set(t.book_id, (topicCountMap.get(t.book_id) || 0) + 1);
    });

    const { data: allVocabs } = await supabase.from('vocabulary').select('id, book_id');
    const wordCountMap = new Map<number, number>();
    allVocabs?.forEach((v) => {
      wordCountMap.set(v.book_id, (wordCountMap.get(v.book_id) || 0) + 1);
    });

    // Lấy tiến độ từ vựng mastered theo sách
    const { data: userProgress } = await supabase
      .from('user_vocabulary_progress')
      .select('vocabulary_id, status')
      .eq('user_id', PERSONAL_PROFILE_ID)
      .eq('status', 'mastered');

    const masteredVocabIds = new Set(userProgress?.map((p) => p.vocabulary_id) || []);
    const masteredWordsMap = new Map<number, number>();
    allVocabs?.forEach((v) => {
      if (masteredVocabIds.has(v.id)) {
        masteredWordsMap.set(v.book_id, (masteredWordsMap.get(v.book_id) || 0) + 1);
      }
    });

    // Lấy số topic hoàn thành
    const { data: completedTopics } = await supabase
      .from('user_topic_progress')
      .select('topic_id, is_completed')
      .eq('user_id', PERSONAL_PROFILE_ID)
      .eq('is_completed', true);

    const completedTopicIds = new Set(completedTopics?.map((ct) => ct.topic_id) || []);
    const completedTopicsMap = new Map<number, number>();
    allTopics?.forEach((t) => {
      if (completedTopicIds.has(t.id)) {
        completedTopicsMap.set(t.book_id, (completedTopicsMap.get(t.book_id) || 0) + 1);
      }
    });

    return books.map((book) => {
      const totalTopics = topicCountMap.get(book.id) || 0;
      const completedCount = completedTopicsMap.get(book.id) || 0;
      const totalWords = wordCountMap.get(book.id) || 0;
      const masteredWords = masteredWordsMap.get(book.id) || 0;
      const progressPercentage = totalTopics > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

      return {
        ...book,
        total_topics: totalTopics,
        completed_topics: completedCount,
        total_words: totalWords,
        mastered_words: masteredWords,
        progress_percentage: progressPercentage,
      };
    });
  } catch (error) {
    console.error('Error fetching books with progress:', error);
    return getBooks(PERSONAL_PROFILE_ID, languageId);
  }
}

/**
 * 8. Lấy danh mục Topics kèm tiến độ Supabase của Personal Profile (fallback SQLite)
 */
export async function getTopicsWithPersonalProgress(bookId: number): Promise<Topic[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return getTopics(bookId, PERSONAL_PROFILE_ID);

  try {
    const { data: topics, error: tErr } = await supabase
      .from('topics')
      .select('*')
      .eq('book_id', bookId)
      .order('order_index', { ascending: true });

    if (tErr || !topics || topics.length === 0) {
      return getTopics(bookId, PERSONAL_PROFILE_ID);
    }

    const topicIds = topics.map((t) => t.id);

    // Lấy tổng số từ theo topic
    const { data: vocabs } = await supabase
      .from('vocabulary')
      .select('id, topic_id')
      .in('topic_id', topicIds);

    const topicWordCountMap = new Map<number, number>();
    const vocabToTopicMap = new Map<number, number>();
    vocabs?.forEach((v) => {
      topicWordCountMap.set(v.topic_id, (topicWordCountMap.get(v.topic_id) || 0) + 1);
      vocabToTopicMap.set(v.id, v.topic_id);
    });

    // Lấy tiến độ từ vựng của user trên Supabase
    const allVocabIds = vocabs?.map((v) => v.id) || [];
    const { data: progressList } = await supabase
      .from('user_vocabulary_progress')
      .select('vocabulary_id, status')
      .eq('user_id', PERSONAL_PROFILE_ID)
      .in('vocabulary_id', allVocabIds);

    const topicStatusMap = new Map<number, { mastered: number; learning: number; review: number }>();
    progressList?.forEach((p) => {
      const tId = vocabToTopicMap.get(p.vocabulary_id);
      if (tId !== undefined) {
        if (!topicStatusMap.has(tId)) topicStatusMap.set(tId, { mastered: 0, learning: 0, review: 0 });
        const item = topicStatusMap.get(tId)!;
        if (p.status === 'mastered') item.mastered += 1;
        else if (p.status === 'learning') item.learning += 1;
        else if (p.status === 'review') item.review += 1;
      }
    });

    // Lấy topic progress metadata
    const { data: topicProgressData } = await supabase
      .from('user_topic_progress')
      .select('topic_id, is_completed, best_test_score, last_vocab_id, status')
      .eq('user_id', PERSONAL_PROFILE_ID)
      .in('topic_id', topicIds);

    const tpMap = new Map<number, any>();
    topicProgressData?.forEach((tp) => tpMap.set(tp.topic_id, tp));

    return topics.map((topic) => {
      const totalWords = topicWordCountMap.get(topic.id) || 0;
      const statusCounts = topicStatusMap.get(topic.id) || { mastered: 0, learning: 0, review: 0 };
      const tp = tpMap.get(topic.id);
      const isCompleted = tp?.is_completed || (totalWords > 0 && statusCounts.mastered >= totalWords);
      const progressPercent = totalWords > 0 ? Math.round((statusCounts.mastered / totalWords) * 100) : 0;

      return {
        ...topic,
        total_words: totalWords,
        mastered_words: statusCounts.mastered,
        learning_words: statusCounts.learning,
        review_words: statusCounts.review,
        progress_percentage: progressPercent,
        is_completed: isCompleted,
        best_test_score: tp?.best_test_score || 0,
        last_vocab_id: tp?.last_vocab_id || null,
        status: tp?.status || (isCompleted ? 'completed' : statusCounts.mastered > 0 ? 'in_progress' : 'not_started'),
      };
    });
  } catch (error) {
    console.error('Error fetching topics with progress:', error);
    return getTopics(bookId, PERSONAL_PROFILE_ID);
  }
}

/**
 * 9. Lấy chi tiết sách theo ID (fallback SQLite)
 */
export async function getPersonalBookById(bookId: number): Promise<Book | null> {
  const books = await getBooksWithPersonalProgress();
  const found = books.find((b) => b.id === bookId);
  if (found) return found;
  return getBookById(bookId, PERSONAL_PROFILE_ID);
}

/**
 * 10. Lấy chi tiết topic theo ID (fallback SQLite)
 */
export async function getPersonalTopicById(topicId: number): Promise<Topic | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return getTopicById(topicId, PERSONAL_PROFILE_ID);

  try {
    const { data: topic } = await supabase
      .from('topics')
      .select('*')
      .eq('id', topicId)
      .maybeSingle();

    if (!topic) return getTopicById(topicId, PERSONAL_PROFILE_ID);

    const topics = await getTopicsWithPersonalProgress(topic.book_id);
    return topics.find((t) => t.id === topicId) || topic;
  } catch (e) {
    console.error('Error fetching topic by id:', e);
    return getTopicById(topicId, PERSONAL_PROFILE_ID);
  }
}

