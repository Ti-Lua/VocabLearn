import { NextResponse } from 'next/server';
import { generatePracticeQuestions } from '@/lib/services';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const topicId = parseInt(resolvedParams.id, 10);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const countParam = searchParams.get('count');

  if (!userId) {
    return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
  }

  const countOption = countParam === 'all' ? 'all' : parseInt(countParam || '10', 10);
  const result = generatePracticeQuestions(topicId, userId, countOption);

  return NextResponse.json(result);
}
