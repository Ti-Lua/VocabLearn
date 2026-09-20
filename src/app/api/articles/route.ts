import { NextRequest, NextResponse } from 'next/server';
import { getArticles, getLatestArticle, syncDailyBBCArticle } from '@/lib/articles';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latestOnly = searchParams.get('latest') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (latestOnly) {
      let article = getLatestArticle();
      // If no articles exist yet, auto-trigger first BBC fetch!
      if (!article) {
        try {
          article = await syncDailyBBCArticle();
        } catch (e) {
          console.warn('Auto sync on initial GET failed:', e);
        }
      }
      return NextResponse.json({ article });
    }

    let articles = getArticles(limit);
    if (articles.length === 0) {
      try {
        const synced = await syncDailyBBCArticle();
        articles = [synced];
      } catch (e) {
        console.warn('Auto sync initial list failed:', e);
      }
    }

    return NextResponse.json({ articles });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/articles error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Manually trigger BBC AI Bot sync
    const newArticle = await syncDailyBBCArticle();
    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật bài báo BBC mới nhất thành công!',
      article: newArticle,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/articles error:', message);
    return NextResponse.json(
      { error: 'Không thể cập nhật bài báo BBC', details: message },
      { status: 500 }
    );
  }
}
