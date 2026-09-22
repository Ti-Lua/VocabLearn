import { NextResponse } from 'next/server';
import { getPersonalReviewWords, getPersonalMasteredWords } from '@/lib/personalLearningService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'review';
    const bookIdParam = searchParams.get('bookId');
    const topicIdParam = searchParams.get('topicId');

    const bookId = bookIdParam ? parseInt(bookIdParam, 10) : undefined;
    const topicId = topicIdParam ? parseInt(topicIdParam, 10) : undefined;

    let words = [];
    if (status === 'mastered' || status === 'known') {
      words = await getPersonalMasteredWords(bookId, topicId);
    } else {
      words = await getPersonalReviewWords(bookId, topicId);
    }

    return NextResponse.json({ words });
  } catch (error: any) {
    console.error('Fetch review words error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi tải danh sách ôn tập' }, { status: 500 });
  }
}
