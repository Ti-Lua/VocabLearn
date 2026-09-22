import { NextRequest, NextResponse } from 'next/server';
import { getChineseDashboardStats } from '@/lib/chineseService';
import { PERSONAL_PROFILE_ID } from '@/config/personal';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || PERSONAL_PROFILE_ID;

    const stats = getChineseDashboardStats(userId);
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching Chinese stats:', error);
    return NextResponse.json({ success: false, error: 'Không thể tải thống kê tiếng Trung' }, { status: 500 });
  }
}
