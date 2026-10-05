import { NextRequest, NextResponse } from 'next/server';
import { updateChineseWordProgress } from '@/lib/chineseService';
import { getActiveUserIdFromRequest } from '@/lib/serverUser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const activeUserId = await getActiveUserIdFromRequest(request);
    const userId = body.userId || activeUserId;
    const { vocabularyId, status } = body;

    if (!vocabularyId || !status) {
      return NextResponse.json({ success: false, error: 'Thiếu vocabularyId hoặc status' }, { status: 400 });
    }

    if (!['learning', 'mastered', 'review_later'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Status không hợp lệ (learning, mastered, review_later)' }, { status: 400 });
    }

    const result = await updateChineseWordProgress(userId, vocabularyId, status);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating Chinese progress:', error);
    return NextResponse.json({ success: false, error: 'Không thể cập nhật tiến độ' }, { status: 500 });
  }
}
