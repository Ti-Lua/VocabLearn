import { NextResponse } from 'next/server';
import { getPersonalBookById, getTopicsWithPersonalProgress } from '@/lib/personalLearningService';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const bookId = parseInt(resolvedParams.id, 10);

    const book = await getPersonalBookById(bookId);
    if (!book) {
      return NextResponse.json({ error: 'Không tìm thấy sách' }, { status: 404 });
    }

    const topics = await getTopicsWithPersonalProgress(bookId);
    return NextResponse.json({ book, topics });
  } catch (error: any) {
    console.error('Fetch book error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi tải sách' }, { status: 500 });
  }
}
