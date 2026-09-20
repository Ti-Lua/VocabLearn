import { NextResponse } from 'next/server';
import { generateTestQuestions, recordTestResult } from '@/lib/services';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const topicId = parseInt(resolvedParams.id, 10);
  const questions = generateTestQuestions(topicId, 20);
  return NextResponse.json({ questions });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const topicId = parseInt(resolvedParams.id, 10);
    const { userId, scorePercentage } = await req.json();

    if (!userId || scorePercentage === undefined) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    const result = recordTestResult(userId, topicId, scorePercentage);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Test submit error:', error);
    return NextResponse.json({ error: 'Lỗi lưu kết quả test' }, { status: 500 });
  }
}
