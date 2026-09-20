import { NextResponse } from 'next/server';
import { getReviewWords } from '@/lib/services';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const bookIdParam = searchParams.get('bookId');
  const topicIdParam = searchParams.get('topicId');

  if (!userId) {
    return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
  }

  const bookId = bookIdParam ? parseInt(bookIdParam, 10) : undefined;
  const topicId = topicIdParam ? parseInt(topicIdParam, 10) : undefined;

  const words = getReviewWords(userId, bookId, topicId);
  return NextResponse.json({ words });
}
