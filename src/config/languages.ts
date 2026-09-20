/**
 * Centralized Language Registry & Configuration
 * Provides modular metadata, level frameworks, voice settings, and news sources
 * making it effortless to add new languages (e.g. Japanese, Korean, Chinese, French, German).
 */

export type SupportedLanguageCode = 'en' | 'ja' | 'zh' | 'ko' | 'fr' | 'de' | 'es';

export type LevelFramework = 'CEFR' | 'JLPT' | 'HSK' | 'TOPIK';

export interface LanguageVoiceConfig {
  voiceId: string;
  name: string;
  gender: 'male' | 'female';
  googleVoice: string;
  webSpeechLocale: string;
}

export interface NewsSourceConfig {
  name: string;
  rssUrl: string;
  homepageUrl: string;
  languageCode: string;
}

export interface LanguageDefinition {
  id: number;
  code: SupportedLanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  status: 'active' | 'coming_soon';
  badge: string;
  description: string;
  levelFramework: LevelFramework;
  levels: string[];
  defaultVoice: string;
  speechLocale: string;
  voices: LanguageVoiceConfig[];
  newsSource?: NewsSourceConfig;
}

export const LANGUAGES_REGISTRY: Record<SupportedLanguageCode, LanguageDefinition> = {
  en: {
    id: 1,
    code: 'en',
    name: 'Tiếng Anh',
    nativeName: 'English',
    flag: '🇬🇧',
    status: 'active',
    badge: 'Sẵn sàng học',
    description: '4 bộ sách Cambridge Vocabulary in Use với hơn 8,435+ từ vựng thực tế theo chuẩn CEFR.',
    levelFramework: 'CEFR',
    levels: ['A1-A2', 'B1', 'B2', 'C1-C2'],
    defaultVoice: 'Puck',
    speechLocale: 'en-US',
    voices: [
      { voiceId: 'puck', name: 'Puck (Nam chuẩn từ điển)', gender: 'male', googleVoice: 'Puck', webSpeechLocale: 'en-US' },
      { voiceId: 'charon', name: 'Charon (Nam BBC trầm ấm)', gender: 'male', googleVoice: 'Charon', webSpeechLocale: 'en-GB' },
      { voiceId: 'kore', name: 'Kore (Nữ truyền cảm)', gender: 'female', googleVoice: 'Kore', webSpeechLocale: 'en-US' },
      { voiceId: 'fenrir', name: 'Fenrir (Nam năng động)', gender: 'male', googleVoice: 'Fenrir', webSpeechLocale: 'en-US' },
      { voiceId: 'aoede', name: 'Aoede (Nữ nhẹ nhàng)', gender: 'female', googleVoice: 'Aoede', webSpeechLocale: 'en-GB' },
    ],
    newsSource: {
      name: 'BBC World News',
      rssUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
      homepageUrl: 'https://www.bbc.com/news/world',
      languageCode: 'en',
    },
  },
  ja: {
    id: 3,
    code: 'ja',
    name: 'Tiếng Nhật',
    nativeName: '日本語',
    flag: '🇯🇵',
    status: 'coming_soon',
    badge: 'Sắp ra mắt',
    description: 'Lộ trình JLPT N5 - N1, từ vựng Kanji, Hiragana & Katakana kèm hội thoại thực tế.',
    levelFramework: 'JLPT',
    levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
    defaultVoice: 'Kore',
    speechLocale: 'ja-JP',
    voices: [
      { voiceId: 'ja-female', name: 'Sakura (Nữ Tokyo)', gender: 'female', googleVoice: 'Kore', webSpeechLocale: 'ja-JP' },
      { voiceId: 'ja-male', name: 'Kenji (Nam chuẩn NHK)', gender: 'male', googleVoice: 'Puck', webSpeechLocale: 'ja-JP' },
    ],
    newsSource: {
      name: 'NHK News Web Easy',
      rssUrl: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
      homepageUrl: 'https://www3.nhk.or.jp/news/easy/',
      languageCode: 'ja',
    },
  },
  zh: {
    id: 2,
    code: 'zh',
    name: 'Tiếng Trung',
    nativeName: '中文',
    flag: '🇨🇳',
    status: 'active',
    badge: 'Sẵn sàng học',
    description: 'Khung HSK 1 - 6, từ vựng Pinyin, chữ Hán giản thể & cấu trúc giao tiếp thông dụng.',
    levelFramework: 'HSK',
    levels: ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6'],
    defaultVoice: 'Kore',
    speechLocale: 'zh-CN',
    voices: [
      { voiceId: 'zh-female', name: 'Mei (Nữ chuẩn Bắc Kinh)', gender: 'female', googleVoice: 'Kore', webSpeechLocale: 'zh-CN' },
      { voiceId: 'zh-male', name: 'Bo (Nam truyền cảm)', gender: 'male', googleVoice: 'Puck', webSpeechLocale: 'zh-CN' },
    ],
    newsSource: {
      name: 'BBC News 中文',
      rssUrl: 'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml',
      homepageUrl: 'https://www.bbc.com/zhongwen/simp',
      languageCode: 'zh',
    },
  },
  ko: {
    id: 4,
    code: 'ko',
    name: 'Tiếng Hàn',
    nativeName: '한국어',
    flag: '🇰🇷',
    status: 'coming_soon',
    badge: 'Sắp ra mắt',
    description: 'Giáo trình TOPIK I - II, từ vựng Hangul, phát âm & kính ngữ đời sống chuẩn Seoul.',
    levelFramework: 'TOPIK',
    levels: ['Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp 4', 'Cấp 5', 'Cấp 6'],
    defaultVoice: 'Kore',
    speechLocale: 'ko-KR',
    voices: [
      { voiceId: 'ko-female', name: 'Minji (Nữ Seoul)', gender: 'female', googleVoice: 'Kore', webSpeechLocale: 'ko-KR' },
      { voiceId: 'ko-male', name: 'Joon (Nam phát thanh viên)', gender: 'male', googleVoice: 'Puck', webSpeechLocale: 'ko-KR' },
    ],
  },
  fr: {
    id: 5,
    code: 'fr',
    name: 'Tiếng Pháp',
    nativeName: 'Français',
    flag: '🇫🇷',
    status: 'coming_soon',
    badge: 'Sắp ra mắt',
    description: 'Từ vựng DELF A1 - C1, phát âm nối âm (liaison) & từ ngữ văn hóa Pháp.',
    levelFramework: 'CEFR',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    defaultVoice: 'Aoede',
    speechLocale: 'fr-FR',
    voices: [
      { voiceId: 'fr-female', name: 'Camille (Nữ Paris)', gender: 'female', googleVoice: 'Aoede', webSpeechLocale: 'fr-FR' },
    ],
  },
  de: {
    id: 6,
    code: 'de',
    name: 'Tiếng Đức',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    status: 'coming_soon',
    badge: 'Sắp ra mắt',
    description: 'Từ vựng Goethe-Zertifikat A1 - B2, mạo từ der/die/das & ngữ pháp chuẩn.',
    levelFramework: 'CEFR',
    levels: ['A1', 'A2', 'B1', 'B2'],
    defaultVoice: 'Fenrir',
    speechLocale: 'de-DE',
    voices: [
      { voiceId: 'de-male', name: 'Lukas (Nam Berlin)', gender: 'male', googleVoice: 'Fenrir', webSpeechLocale: 'de-DE' },
    ],
  },
  es: {
    id: 7,
    code: 'es',
    name: 'Tiếng Tây Ban Nha',
    nativeName: 'Español',
    flag: '🇪🇸',
    status: 'coming_soon',
    badge: 'Sắp ra mắt',
    description: 'Từ vựng DELE A1 - C1, ngữ điệu Latin & Tây Ban Nha sống động.',
    levelFramework: 'CEFR',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    defaultVoice: 'Charon',
    speechLocale: 'es-ES',
    voices: [
      { voiceId: 'es-male', name: 'Carlos (Nam Madrid)', gender: 'male', googleVoice: 'Charon', webSpeechLocale: 'es-ES' },
    ],
  },
};

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  LANGUAGES_REGISTRY.en,
  LANGUAGES_REGISTRY.zh,
  LANGUAGES_REGISTRY.ja,
];

export function getLanguageConfig(code?: string | null): LanguageDefinition {
  if (!code) return LANGUAGES_REGISTRY.en;
  const normalized = code.toLowerCase() as SupportedLanguageCode;
  return LANGUAGES_REGISTRY[normalized] || LANGUAGES_REGISTRY.en;
}

export function getActiveLanguages(): LanguageDefinition[] {
  return SUPPORTED_LANGUAGES.filter((l) => l.status === 'active');
}

export function getComingSoonLanguages(): LanguageDefinition[] {
  return SUPPORTED_LANGUAGES.filter((l) => l.status === 'coming_soon');
}
