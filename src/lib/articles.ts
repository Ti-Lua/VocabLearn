import { getDb } from './db';
import { Article, ArticleParagraph, ArticleVocab } from '@/types';
import {
  fetchBBCWorldNewsRSS,
  processBBCNewsWithGemini,
  ProcessedBBCArticle,
} from './gemini';

export function getArticles(limit: number = 20): Article[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM articles ORDER BY id DESC LIMIT ?`
    )
    .all(limit) as Record<string, unknown>[];

  return rows.map(mapRowToArticle);
}

export function getArticleById(id: number): Article | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM articles WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;

  if (!row) return null;
  return mapRowToArticle(row);
}

export function getLatestArticle(): Article | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM articles ORDER BY id DESC LIMIT 1`)
    .get() as Record<string, unknown> | undefined;

  if (!row) return null;
  return mapRowToArticle(row);
}

export function saveArticle(data: ProcessedBBCArticle): Article {
  const db = getDb();

  // Check if article with this original_url already exists
  if (data.original_url) {
    const existing = db
      .prepare(`SELECT * FROM articles WHERE original_url = ?`)
      .get(data.original_url) as Record<string, unknown> | undefined;
    if (existing) {
      return mapRowToArticle(existing);
    }
  }

  const insert = db.prepare(`
    INSERT INTO articles (
      title_en,
      title_vi,
      summary_vi,
      topic,
      level,
      reading_time_min,
      original_url,
      source_name,
      published_date,
      paragraphs_json,
      highlighted_vocab_json,
      audio_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    data.title_en,
    data.title_vi,
    data.summary_vi,
    data.topic,
    data.level,
    data.reading_time_min,
    data.original_url,
    data.source_name,
    data.published_date,
    JSON.stringify(data.paragraphs),
    JSON.stringify(data.highlighted_vocab),
    null
  );

  const newId = Number(result.lastInsertRowid);
  const created = getArticleById(newId);
  if (!created) {
    throw new Error('Failed to retrieve newly inserted article');
  }
  return created;
}

/**
 * AI Bot workflow: Fetches top BBC World News dispatch, processes with Gemini 3.5 Flash,
 * and saves to SQLite database.
 */
export async function syncDailyBBCArticle(): Promise<Article> {
  const items = await fetchBBCWorldNewsRSS();
  if (!items || items.length === 0) {
    throw new Error('No items returned from BBC RSS feed.');
  }

  // Find the first item that is not yet saved
  const db = getDb();
  let selectedItem = items[0];

  for (const item of items) {
    const exists = db
      .prepare('SELECT id FROM articles WHERE original_url = ?')
      .get(item.link);
    if (!exists) {
      selectedItem = item;
      break;
    }
  }

  const processed = await processBBCNewsWithGemini(selectedItem);
  return saveArticle(processed);
}

function mapRowToArticle(row: Record<string, unknown>): Article {
  let paragraphs: ArticleParagraph[] = [];
  try {
    paragraphs = JSON.parse(String(row.paragraphs_json || '[]'));
  } catch {
    paragraphs = [];
  }

  let highlighted_vocab: ArticleVocab[] = [];
  try {
    highlighted_vocab = JSON.parse(String(row.highlighted_vocab_json || '[]'));
  } catch {
    highlighted_vocab = [];
  }

  return {
    id: Number(row.id),
    title_en: String(row.title_en),
    title_vi: String(row.title_vi),
    summary_vi: row.summary_vi ? String(row.summary_vi) : null,
    topic: row.topic ? String(row.topic) : null,
    level: row.level ? String(row.level) : null,
    reading_time_min: Number(row.reading_time_min || 4),
    original_url: row.original_url ? String(row.original_url) : null,
    source_name: String(row.source_name || 'BBC World News'),
    published_date: row.published_date ? String(row.published_date) : null,
    paragraphs,
    highlighted_vocab,
    audio_url: row.audio_url ? String(row.audio_url) : null,
    created_at: String(row.created_at || ''),
  };
}
