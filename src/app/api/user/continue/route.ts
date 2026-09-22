import { NextResponse } from 'next/server';
import { getPersonalContinueLearning } from '@/lib/personalLearningService';
import { getActiveUserIdFromRequest } from '@/lib/serverUser';

export async function GET(req: Request) {
  try {
    const userId = await getActiveUserIdFromRequest(req);
    const continueData = await getPersonalContinueLearning(userId);
    return NextResponse.json({ continueData });
  } catch (error: any) {
    console.error('Fetch continue learning error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi tải bài học tiếp theo' }, { status: 500 });
  }
}
