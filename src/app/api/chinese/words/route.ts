import { NextRequest, NextResponse } from 'next/server';
import { searchChineseWords } from '@/lib/chineseService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user-id';
    const query = searchParams.get('query') || '';
    const levelStr = searchParams.get('level');
    const topic = searchParams.get('topic') || 'all';
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sort = (searchParams.get('sort') || 'id') as 'id' | 'word' | 'pinyin' | 'status';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

    let level: number | 'all' = 'all';
    if (levelStr && levelStr !== 'all') {
      const parsed = parseInt(levelStr, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) {
        level = parsed;
      }
    }

    const { words, total } = searchChineseWords({
      userId,
      query,
      level,
      topic,
      status,
      limit,
      offset,
      sort,
      sortOrder,
    });

    return NextResponse.json({ success: true, words, total });
  } catch (error) {
    console.error('Error searching Chinese words:', error);
    return NextResponse.json({ success: false, error: 'Không thể tìm kiếm từ vựng tiếng Trung' }, { status: 500 });
  }
}
