import { NextRequest, NextResponse } from 'next/server';
import { getChineseReviewWords, syncChineseProgressFromSupabase } from '@/lib/chineseService';
import { getActiveUserIdFromRequest } from '@/lib/serverUser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');
    const activeUserId = await getActiveUserIdFromRequest(request);
    const userId = queryUserId || activeUserId;

    await syncChineseProgressFromSupabase(userId);

    const levelStr = searchParams.get('level');
    const topic = searchParams.get('topic') || 'all';

    let level: number | 'all' = 'all';
    if (levelStr && levelStr !== 'all') {
      const parsed = parseInt(levelStr, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) {
        level = parsed;
      }
    }

    const words = getChineseReviewWords(userId, level, topic);
    return NextResponse.json({ success: true, words });
  } catch (error) {
    console.error('Error fetching Chinese review words:', error);
    return NextResponse.json({ success: false, error: 'Không thể tải danh sách từ ôn tập' }, { status: 500 });
  }
}
