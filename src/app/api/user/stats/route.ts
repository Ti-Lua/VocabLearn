import { NextResponse } from 'next/server';
import { getUserStats } from '@/lib/services';
import { getSessionFromCookies } from '@/lib/authSession';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get('userId');

    if (!userId) {
      const session = await getSessionFromCookies();
      if (session) userId = session.userId;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
    }

    const stats = getUserStats(userId);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Fetch user stats error:', error);
    return NextResponse.json({ error: 'Lỗi tải thống kê người dùng' }, { status: 500 });
  }
}
