import { NextRequest, NextResponse } from 'next/server';
import { getTopicsByHskLevel, getChineseDashboardStats } from '@/lib/chineseService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ level: string }> }
) {
  try {
    const { level } = await params;
    const levelNum = parseInt(level, 10);

    if (isNaN(levelNum) || levelNum < 1 || levelNum > 6) {
      return NextResponse.json({ success: false, error: 'Cấp độ HSK không hợp lệ (1 - 6)' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user-id';

    const topics = getTopicsByHskLevel(levelNum, userId);
    const allStats = getChineseDashboardStats(userId);
    const levelStat = allStats.levels.find((l) => l.level === levelNum);

    return NextResponse.json({
      success: true,
      level: levelNum,
      levelStat,
      topics,
    });
  } catch (error) {
    console.error('Error fetching Chinese HSK level topics:', error);
    return NextResponse.json({ success: false, error: 'Không thể tải danh sách chủ đề HSK' }, { status: 500 });
  }
}
