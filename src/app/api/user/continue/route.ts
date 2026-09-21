import { NextResponse } from 'next/server';
import { getContinueLearning } from '@/lib/services';
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

    const continueData = getContinueLearning(userId);
    return NextResponse.json({ continueData });
  } catch (error) {
    console.error('Fetch continue learning error:', error);
    return NextResponse.json({ error: 'Lỗi tải bài học tiếp theo' }, { status: 500 });
  }
}
