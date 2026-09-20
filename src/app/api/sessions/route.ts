import { NextResponse } from 'next/server';
import { saveStudySession } from '@/lib/services';
import { StudySession } from '@/types';

export async function POST(req: Request) {
  try {
    const session: StudySession = await req.json();
    if (!session.user_id || !session.mode) {
      return NextResponse.json({ error: 'Thiếu thông tin session' }, { status: 400 });
    }

    saveStudySession(session);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save session error:', error);
    return NextResponse.json({ error: 'Lỗi lưu phiên học' }, { status: 500 });
  }
}
