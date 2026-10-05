import { NextRequest, NextResponse } from 'next/server';
import { getHskLevelsWithProgress, syncChineseProgressFromSupabase } from '@/lib/chineseService';
import { getActiveUserIdFromRequest } from '@/lib/serverUser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');
    const activeUserId = await getActiveUserIdFromRequest(request);
    const userId = queryUserId || activeUserId;

    await syncChineseProgressFromSupabase(userId);
    const levels = getHskLevelsWithProgress(userId);
    return NextResponse.json({ success: true, levels });
  } catch (error) {
    console.error('Error fetching Chinese HSK levels:', error);
    return NextResponse.json({ success: false, error: 'Không thể tải danh sách cấp độ HSK' }, { status: 500 });
  }
}
