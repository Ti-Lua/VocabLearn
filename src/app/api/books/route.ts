import { NextResponse } from 'next/server';
import { getBooksWithPersonalProgress } from '@/lib/personalLearningService';
import { getLanguageConfig } from '@/config/languages';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const langCode = searchParams.get('lang');
    const langIdParam = searchParams.get('languageId') || searchParams.get('langId');

    let languageId = 1;
    if (langIdParam) {
      languageId = parseInt(langIdParam, 10);
    } else if (langCode) {
      languageId = getLanguageConfig(langCode).id;
    }

    const books = await getBooksWithPersonalProgress(languageId);
    return NextResponse.json({ books });
  } catch (error: any) {
    console.error('Fetch books error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi tải danh mục sách' }, { status: 500 });
  }
}
