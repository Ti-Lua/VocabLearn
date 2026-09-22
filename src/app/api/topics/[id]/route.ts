import { NextResponse } from 'next/server';
import {
  getPersonalTopicById,
  getPersonalBookById,
  getTopicVocabularyWithProgress,
} from '@/lib/personalLearningService';
import { getActiveUserIdFromRequest } from '@/lib/serverUser';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const topicId = parseInt(resolvedParams.id, 10);
    const userId = await getActiveUserIdFromRequest(req);

    const topic = await getPersonalTopicById(topicId, userId);
    if (!topic) {
      return NextResponse.json({ error: 'Không tìm thấy topic' }, { status: 404 });
    }

    const book = await getPersonalBookById(topic.book_id, userId);
    const vocabulary = await getTopicVocabularyWithProgress(topicId, userId);

    return NextResponse.json({ topic, book, vocabulary });
  } catch (error: any) {
    console.error('Fetch topic error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi tải topic' }, { status: 500 });
  }
}
