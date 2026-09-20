import { NextResponse } from 'next/server';
import { updateWordProgress } from '@/lib/services';
import { WordStatus } from '@/types';

export async function POST(req: Request) {
  try {
    const { userId, vocabularyId, status, isCorrect } = await req.json();
    if (!userId || !vocabularyId || !status) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    const result = updateWordProgress(userId, vocabularyId, status as WordStatus, isCorrect);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Update progress error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật trạng thái' }, { status: 500 });
  }
}
