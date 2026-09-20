import { NextResponse } from 'next/server';
import { getTopicById, getVocabularyForTopic, getBookById } from '@/lib/services';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const topicId = parseInt(resolvedParams.id, 10);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || undefined;

  const topic = getTopicById(topicId, userId);
  if (!topic) {
    return NextResponse.json({ error: 'Không tìm thấy topic' }, { status: 404 });
  }

  const book = getBookById(topic.book_id, userId);
  const vocabulary = getVocabularyForTopic(topicId, userId);

  return NextResponse.json({ topic, book, vocabulary });
}
