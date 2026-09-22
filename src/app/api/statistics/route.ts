import { NextResponse } from 'next/server';
import { getUserStatistics } from '@/lib/services';
import { getActiveUserIdFromRequest } from '@/lib/serverUser';

export async function GET(req: Request) {
  const userId = await getActiveUserIdFromRequest(req);
  const statistics = getUserStatistics(userId);
  return NextResponse.json({ statistics });
}
