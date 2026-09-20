import { NextResponse } from 'next/server';
import { getBooks } from '@/lib/services';
import { getLanguageConfig } from '@/config/languages';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || undefined;
  const langCode = searchParams.get('lang');
  const langIdParam = searchParams.get('languageId') || searchParams.get('langId');

  let languageId: number | undefined = undefined;
  if (langIdParam) {
    languageId = parseInt(langIdParam, 10);
  } else if (langCode) {
    languageId = getLanguageConfig(langCode).id;
  }

  const books = getBooks(userId, languageId);
  return NextResponse.json({ books });
}
