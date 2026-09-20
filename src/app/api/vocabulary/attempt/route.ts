import { NextResponse } from 'next/server';
import { saveExerciseAttempt } from '@/lib/services';
import { ExerciseAttempt } from '@/types';

export async function POST(req: Request) {
  try {
    const data: ExerciseAttempt = await req.json();
    if (!data.user_id || !data.vocabulary_id || !data.exercise_type) {
      return NextResponse.json({ error: 'Thiếu thông tin attempt' }, { status: 400 });
    }

    saveExerciseAttempt(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save attempt error:', error);
    return NextResponse.json({ error: 'Lỗi lưu câu trả lời' }, { status: 500 });
  }
}
