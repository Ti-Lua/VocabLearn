import { NextResponse } from 'next/server';
import { getPersonalUserStats } from '@/lib/personalLearningService';
import { getActiveUserIdFromRequest } from '@/lib/serverUser';

export async function GET(req: Request) {
  try {
    const userId = await getActiveUserIdFromRequest(req);
    const stats = await getPersonalUserStats(userId);
    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('Fetch user stats error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi tải thống kê' }, { status: 500 });
  }
}
