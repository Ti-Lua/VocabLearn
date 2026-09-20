import { NextRequest, NextResponse } from 'next/server';
import { updateChineseWordProgress } from '@/lib/chineseService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, vocabularyId, status } = body;

    if (!userId || !vocabularyId || !status) {
      return NextResponse.json({ success: false, error: 'Thiếu userId, vocabularyId hoặc status' }, { status: 400 });
    }

    if (!['learning', 'mastered', 'review_later'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Status không hợp lệ (learning, mastered, review_later)' }, { status: 400 });
    }

    const result = updateChineseWordProgress(userId, vocabularyId, status);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating Chinese progress:', error);
    return NextResponse.json({ success: false, error: 'Không thể cập nhật tiến độ' }, { status: 500 });
  }
}
