import { NextResponse } from 'next/server';
import { getPersonalUserStats } from '@/lib/personalLearningService';

export async function GET() {
  try {
    const stats = await getPersonalUserStats();
    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('Fetch user stats error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi tải thống kê' }, { status: 500 });
  }
}
