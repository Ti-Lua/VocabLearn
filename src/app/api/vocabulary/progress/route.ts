import { NextResponse } from 'next/server';
import { updatePersonalWordProgress } from '@/lib/personalLearningService';
import { WordStatus } from '@/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vocabularyId, status, isCorrect } = body;

    if (!vocabularyId || !status) {
      return NextResponse.json({ error: 'Thiếu vocabularyId hoặc status' }, { status: 400 });
    }

    const result = await updatePersonalWordProgress(
      Number(vocabularyId),
      status as WordStatus,
      isCorrect
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Update progress error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi cập nhật trạng thái' }, { status: 500 });
  }
}
