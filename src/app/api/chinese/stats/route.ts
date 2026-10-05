import { NextRequest, NextResponse } from 'next/server';
import { getChineseDashboardStats, syncChineseProgressFromSupabase } from '@/lib/chineseService';
import { getActiveUserIdFromRequest } from '@/lib/serverUser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');
    const activeUserId = await getActiveUserIdFromRequest(request);
    const userId = queryUserId || activeUserId;

    await syncChineseProgressFromSupabase(userId);
    const stats = getChineseDashboardStats(userId);
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching Chinese stats:', error);
    return NextResponse.json({ success: false, error: 'Không thể tải thống kê tiếng Trung' }, { status: 500 });
  }
}
