// Google AI Studio integration for Voice (TTS) and BBC News Bot Analysis
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Supported Google AI Studio TTS voices
export const GOOGLE_TTS_VOICES = [
  { id: 'Puck', name: 'Puck (British/American Clear)', gender: 'Male', description: 'Giọng nam rõ ràng, chuẩn phát âm từ điển' },
  { id: 'Charon', name: 'Charon (BBC News Anchor)', gender: 'Male', description: 'Giọng đọc thời sự BBC trầm ấm, uy quyền' },
  { id: 'Kore', name: 'Kore (Warm Expressive)', gender: 'Female', description: 'Giọng nữ ấm áp, truyền cảm' },
  { id: 'Fenrir', name: 'Fenrir (Crisp Dynamic)', gender: 'Male', description: 'Giọng nam hiện đại, nhịp điệu tự nhiên' },
  { id: 'Aoede', name: 'Aoede (Melodic Educational)', gender: 'Female', description: 'Giọng nữ nhẹ nhàng, chuẩn sư phạm' },
] as const;

export type GoogleVoiceId = (typeof GOOGLE_TTS_VOICES)[number]['id'];

/**
 * Converts raw 16-bit linear PCM audio buffer to standard RIFF WAV format.
 * Default for Gemini TTS: 24,000 Hz, 1 channel (mono), 16 bits per sample.
 */
export function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = Linear PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// In-memory cache for generated TTS audio to prevent redundant API calls
const ttsMemoryCache = new Map<string, Buffer>();

/**
 * Generate native speech WAV buffer using Google AI Studio gemini-2.5-flash-preview-tts
 */
export async function generateGoogleTTS(
  text: string,
  voiceName: string = 'Puck'
): Promise<Buffer> {
  const cleanText = text.trim();
  const cacheKey = `${voiceName}:${cleanText.toLowerCase()}`;
  if (ttsMemoryCache.has(cacheKey)) {
    return ttsMemoryCache.get(cacheKey)!;
  }

  // Use identical natural text for both single words and example sentences
  // to ensure 100% consistent speaking pace and speed synchronization across words and examples
  const speakText = cleanText;

  const ttsModels = [
    'gemini-3.1-flash-tts-preview',
    'gemini-2.5-flash-preview-tts',
  ];

  let lastError: Error | null = null;
  let rawPcm: Buffer | null = null;

  for (const model of ttsModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: speakText }],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName || 'Puck',
                },
              },
            },
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Model ${model} TTS failed (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;

      if (inlineData && inlineData.data) {
        rawPcm = Buffer.from(inlineData.data, 'base64');
        break; // Successfully obtained audio
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!rawPcm) {
    throw lastError || new Error('Google Studio AI did not return audio data in response.');
  }

  const wavBuffer = pcmToWav(rawPcm, 24000);

  // Save to cache (limit size to 500 items)
  if (ttsMemoryCache.size > 500) {
    const firstKey = ttsMemoryCache.keys().next().value;
    if (firstKey) ttsMemoryCache.delete(firstKey);
  }
  ttsMemoryCache.set(cacheKey, wavBuffer);

  return wavBuffer;
}

export interface BBCRawItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

/**
 * Fetches latest world news items from BBC RSS feed (via Akamai feeds.bbci.co.uk)
 */
export async function fetchBBCWorldNewsRSS(): Promise<BBCRawItem[]> {
  const rssUrl = 'https://feeds.bbci.co.uk/news/world/rss.xml';
  const res = await fetch(rssUrl, {
    headers: {
      'User-Agent': 'LearnVocab-Bot/1.0 (Mozilla/5.0)',
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
    // Cache for 30 minutes
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch BBC RSS: ${res.statusText}`);
  }

  const xml = await res.text();
  const items: BBCRawItem[] = [];
  const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  for (const match of matches) {
    const itemXml = match[1];
    const title =
      itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
      itemXml.match(/<title>(.*?)<\/title>/)?.[1] ||
      '';
    const description =
      itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
      itemXml.match(/<description>(.*?)<\/description>/)?.[1] ||
      '';
    const link =
      itemXml.match(/<link>(.*?)<\/link>/)?.[1]?.replace(/&amp;/g, '&') || '';
    const pubDate =
      itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toUTCString();

    if (title && description) {
      items.push({
        title: title.trim(),
        description: description.trim(),
        link: link.trim(),
        pubDate: pubDate.trim(),
      });
    }
  }

  return items;
}

export interface ProcessedBBCArticle {
  title_en: string;
  title_vi: string;
  topic: string;
  level: string;
  reading_time_min: number;
  summary_vi: string;
  original_url: string;
  source_name: string;
  published_date: string;
  paragraphs: { en: string; vi: string }[];
  highlighted_vocab: {
    word: string;
    phonetic: string;
    part_of_speech: string;
    vi_meaning: string;
    context_sentence: string;
    explanation: string;
  }[];
}

/**
 * Uses Gemini 3.5 Flash to transform a BBC news item into a bilingual educational article
 * with sentence-by-sentence Vietnamese translation and highlighted vocabulary.
 */
export async function processBBCNewsWithGemini(
  item: BBCRawItem
): Promise<ProcessedBBCArticle> {
  const prompt = `You are an elite BBC World News editor and professional bilingual English-Vietnamese linguist for English language learners.
Transform this real BBC World News dispatch into a comprehensive, high-quality educational article:
HEADLINE: ${item.title}
SUMMARY: ${item.description}
SOURCE: BBC World News (${item.pubDate})

Requirements:
1. Write a complete, authentic 4-to-5 paragraph BBC news story matching BBC World Service journalistic style.
2. Provide a faithful, accurate, natural Vietnamese translation for each paragraph.
3. Highlight 6 to 8 standout English vocabulary terms, idioms, or collocations from the text that are valuable for learners (CEFR B2-C2). Include accurate IPA phonetic transcription, grammatical part of speech, context-specific Vietnamese meaning, the exact context sentence, and an insightful explanation in Vietnamese of how and why to use this phrase.

Return a STRICT JSON object with this exact structure:
{
  "title_en": "${item.title.replace(/"/g, '\\"')}",
  "title_vi": "Tiêu đề tiếng Việt sát nghĩa và lôi cuốn",
  "topic": "World News",
  "level": "Upper-Intermediate",
  "reading_time_min": 4,
  "summary_vi": "Tóm tắt ngắn gọn 2 câu nội dung cốt lõi của bài báo bằng tiếng Việt.",
  "paragraphs": [
    {
      "en": "English paragraph text...",
      "vi": "Bản dịch tiếng Việt tự nhiên, chuẩn xác tương ứng của đoạn văn này..."
    }
  ],
  "highlighted_vocab": [
    {
      "word": "prominent word or collocation",
      "phonetic": "/.../",
      "part_of_speech": "noun | verb | adjective | adverb | idiom | collocation",
      "vi_meaning": "Nghĩa tiếng Việt chuẩn trong ngữ cảnh này",
      "context_sentence": "Sentence containing the word from the article",
      "explanation": "Giải thích chi tiết sắc thái nghĩa, cách dùng thực tế và lưu ý ngữ pháp cho người học"
    }
  ]
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini 3.5 Flash analysis failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini did not return text content.');
  }

  const parsed = JSON.parse(text);

  return {
    title_en: parsed.title_en || item.title,
    title_vi: parsed.title_vi || item.title,
    topic: parsed.topic || 'World News',
    level: parsed.level || 'Upper-Intermediate',
    reading_time_min: parsed.reading_time_min || 4,
    summary_vi: parsed.summary_vi || item.description,
    original_url: item.link,
    source_name: 'BBC World News',
    published_date: item.pubDate,
    paragraphs: Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [],
    highlighted_vocab: Array.isArray(parsed.highlighted_vocab)
      ? parsed.highlighted_vocab
      : [],
  };
}
