import { NextRequest, NextResponse } from 'next/server';
import { getHskLevelsWithProgress } from '@/lib/chineseService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user-id';

    const levels = getHskLevelsWithProgress(userId);
    return NextResponse.json({ success: true, levels });
  } catch (error) {
    console.error('Error fetching Chinese HSK levels:', error);
    return NextResponse.json({ success: false, error: 'Không thể tải danh sách cấp độ HSK' }, { status: 500 });
  }
}
