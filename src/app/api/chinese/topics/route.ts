import { NextRequest, NextResponse } from 'next/server';
import { getTopicWords, getTopicsByHskLevel } from '@/lib/chineseService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const levelStr = searchParams.get('level');
    const topic = searchParams.get('topic');
    const userId = searchParams.get('userId') || 'demo-user-id';

    if (!levelStr) {
      return NextResponse.json({ success: false, error: 'Thiếu tham số level' }, { status: 400 });
    }

    const level = parseInt(levelStr, 10);
    if (isNaN(level) || level < 1 || level > 6) {
      return NextResponse.json({ success: false, error: 'Level không hợp lệ' }, { status: 400 });
    }

    if (!topic) {
      const topics = getTopicsByHskLevel(level, userId);
      return NextResponse.json({
        success: true,
        level,
        topics,
      });
    }

    const words = getTopicWords(level, topic, userId);

    const masteredCount = words.filter((w) => w.status === 'mastered').length;
    const learningCount = words.filter((w) => w.status === 'learning').length;
    const reviewLaterCount = words.filter((w) => w.status === 'review_later').length;
    const totalCount = words.length;
    const progressPct = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
    const isCompleted = totalCount > 0 && masteredCount === totalCount;

    return NextResponse.json({
      success: true,
      level,
      topic,
      words,
      stats: {
        total: totalCount,
        mastered: masteredCount,
        learning: learningCount,
        review_later: reviewLaterCount,
        progress_percentage: progressPct,
        is_completed: isCompleted,
      },
    });
  } catch (error) {
    console.error('Error fetching topic words:', error);
    return NextResponse.json({ success: false, error: 'Không thể tải danh sách từ vựng chủ đề' }, { status: 500 });
  }
}
