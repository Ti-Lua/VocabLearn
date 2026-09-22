import { NextResponse } from 'next/server';
import { getPersonalContinueLearning } from '@/lib/personalLearningService';

export async function GET() {
  try {
    const continueData = await getPersonalContinueLearning();
    return NextResponse.json({ continueData });
  } catch (error: any) {
    console.error('Fetch continue learning error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi tải bài học tiếp theo' }, { status: 500 });
  }
}
