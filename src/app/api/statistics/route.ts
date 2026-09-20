import { NextResponse } from 'next/server';
import { getUserStatistics } from '@/lib/services';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
  }

  const statistics = getUserStatistics(userId);
  return NextResponse.json({ statistics });
}
