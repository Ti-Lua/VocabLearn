import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionFromCookies } from '@/lib/authSession';
import { getUserById } from '@/lib/userService';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookies();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || session?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const db = getDb();
    const vocabProgress = db.prepare('SELECT * FROM user_vocabulary_progress WHERE user_id = ?').all(userId);
    const topicProgress = db.prepare('SELECT * FROM user_topic_progress WHERE user_id = ?').all(userId);
    const chineseProgress = db.prepare('SELECT * FROM user_chinese_progress WHERE user_id = ?').all(userId);
    const sessions = db.prepare('SELECT * FROM study_sessions WHERE user_id = ?').all(userId);
    const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId);

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
      },
      stats,
      vocabProgress,
      topicProgress,
      chineseProgress,
      sessions,
    };

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="learnvocab_backup_${user.username}_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error('Backup export error:', error);
    return NextResponse.json({ error: 'Lỗi xuất dữ liệu sao lưu' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookies();
    const body = await req.json();
    const userId = body.userId || session?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const backup = body.backupData;
    if (!backup || !backup.version) {
      return NextResponse.json({ error: 'File sao lưu không hợp lệ' }, { status: 400 });
    }

    const db = getDb();
    let restoredVocab = 0;
    let restoredChinese = 0;

    // 1. Khôi phục user_vocabulary_progress
    if (Array.isArray(backup.vocabProgress)) {
      const stmt = db.prepare(`
        INSERT INTO user_vocabulary_progress (
          user_id, vocabulary_id, status, correct_count, wrong_count, last_reviewed_at, next_review_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, vocabulary_id) DO UPDATE SET
          status = excluded.status,
          correct_count = excluded.correct_count,
          wrong_count = excluded.wrong_count,
          last_reviewed_at = excluded.last_reviewed_at,
          next_review_at = excluded.next_review_at,
          updated_at = excluded.updated_at
      `);

      for (const item of backup.vocabProgress) {
        if (item.vocabulary_id) {
          stmt.run(
            userId,
            item.vocabulary_id,
            item.status || 'new',
            item.correct_count || 0,
            item.wrong_count || 0,
            item.last_reviewed_at || null,
            item.next_review_at || null,
            item.updated_at || new Date().toISOString()
          );
          restoredVocab++;
        }
      }
    }

    // 2. Khôi phục user_chinese_progress
    if (Array.isArray(backup.chineseProgress)) {
      const stmt = db.prepare(`
        INSERT INTO user_chinese_progress (
          user_id, vocabulary_id, status, mastery_level, review_count, correct_count, incorrect_count, last_reviewed_at, next_review_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, vocabulary_id) DO UPDATE SET
          status = excluded.status,
          mastery_level = excluded.mastery_level,
          review_count = excluded.review_count,
          correct_count = excluded.correct_count,
          incorrect_count = excluded.incorrect_count,
          last_reviewed_at = excluded.last_reviewed_at,
          next_review_at = excluded.next_review_at,
          updated_at = excluded.updated_at
      `);

      for (const item of backup.chineseProgress) {
        if (item.vocabulary_id) {
          stmt.run(
            userId,
            item.vocabulary_id,
            item.status || 'new',
            item.mastery_level || 0,
            item.review_count || 0,
            item.correct_count || 0,
            item.incorrect_count || 0,
            item.last_reviewed_at || null,
            item.next_review_at || null,
            item.updated_at || new Date().toISOString()
          );
          restoredChinese++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã khôi phục thành công ${restoredVocab} từ tiếng Anh và ${restoredChinese} từ tiếng Trung!`,
    });
  } catch (error) {
    console.error('Backup import error:', error);
    return NextResponse.json({ error: 'Lỗi khôi phục dữ liệu sao lưu' }, { status: 500 });
  }
}
