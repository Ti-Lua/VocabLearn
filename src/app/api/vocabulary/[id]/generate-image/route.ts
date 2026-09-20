import { NextRequest, NextResponse } from 'next/server';
import { runFullImagePipelineForVocab } from '@/lib/vocabularyImagePipeline';
import { getDb } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const vocabId = parseInt(id, 10);
    if (isNaN(vocabId)) {
      return NextResponse.json({ error: 'Invalid vocabulary ID' }, { status: 400 });
    }

    const result = await runFullImagePipelineForVocab(vocabId);

    return NextResponse.json({
      success: true,
      message: result.validation.status === 'PASS'
        ? `Đã tạo ảnh minh họa chuẩn nghĩa thành công (Score: ${result.validation.score}/100)`
        : `Ảnh cần duyệt thủ công (Score: ${result.validation.score}/100 sau ${result.attempts} lần thử)`,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API generate-image Error:', message);
    return NextResponse.json(
      { error: 'Lỗi trong quá trình tạo và kiểm định ảnh từ vựng', details: message },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const vocabId = parseInt(id, 10);
    if (isNaN(vocabId)) {
      return NextResponse.json({ error: 'Invalid vocabulary ID' }, { status: 400 });
    }

    const db = getDb();
    const row = db.prepare(`
      SELECT
        id, word, part_of_speech, meaning_vi, meaning_en,
        word_image, visual_concept, image_validation_score,
        image_validation_status, image_validation_reason,
        image_generation_attempts, needs_manual_review
      FROM vocabulary
      WHERE id = ?
    `).get(vocabId);

    if (!row) {
      return NextResponse.json({ error: 'Vocabulary item not found' }, { status: 404 });
    }

    return NextResponse.json({ vocabulary: row });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
