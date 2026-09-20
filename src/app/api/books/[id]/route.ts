import { NextResponse } from 'next/server';
import { getBookById, getTopics } from '@/lib/services';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const bookId = parseInt(resolvedParams.id, 10);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || undefined;

  const book = getBookById(bookId, userId);
  if (!book) {
    return NextResponse.json({ error: 'Không tìm thấy sách' }, { status: 404 });
  }

  const topics = getTopics(bookId, userId);
  return NextResponse.json({ book, topics });
}
