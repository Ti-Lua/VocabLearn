// Audio Player powered by Google Studio AI (gemini-2.5-flash-preview-tts)
// with multi-language support and browser SpeechSynthesis fallback

import { getLanguageConfig } from '@/config/languages';

export type Accent = 'en-GB' | 'en-US';

let selectedVoice: string = 'Puck'; // Google AI Studio Voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede'
let selectedAccent: Accent = 'en-GB';
let currentPlaybackSpeed: number = 1.0;

export function setGoogleVoice(voice: string) {
  selectedVoice = voice;
}

export function getGoogleVoice(): string {
  return selectedVoice;
}

export function setAccent(accent: Accent) {
  selectedAccent = accent;
}

export function getAccent(): Accent {
  return selectedAccent;
}

export function setAudioSpeed(speed: number) {
  currentPlaybackSpeed = speed;
  if (activeAudio) {
    try {
      activeAudio.defaultPlaybackRate = speed;
      activeAudio.playbackRate = speed;
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('audio_playback_speed', speed.toString());
      window.dispatchEvent(new CustomEvent('audio_speed_change', { detail: { speed } }));
    } catch {
      // ignore
    }
  }
}

export function getAudioSpeed(): number {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('audio_playback_speed');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.5 && val <= 2.0) {
          currentPlaybackSpeed = val;
        }
      }
    } catch {
      // ignore
    }
  }
  return currentPlaybackSpeed;
}

/**
 * Robustly configures an HTMLAudioElement with playback speed,
 * preserving natural voice pitch and preventing browser audio engines (e.g. Chrome/WebKit)
 * from resetting playbackRate to default 1.0 during load and metadata events.
 */
export function configureAudioSpeed(audio: HTMLAudioElement, speed: number) {
  const safeSpeed = Math.max(0.5, Math.min(2.0, speed));

  const apply = () => {
    try {
      audio.defaultPlaybackRate = safeSpeed;
      audio.playbackRate = safeSpeed;

      // Preserve pitch so voice sounds natural (not distorted or squeaky)
      if ('preservesPitch' in audio) {
        audio.preservesPitch = true;
      }
      const vendorAudio = audio as unknown as {
        mozPreservesPitch?: boolean;
        webkitPreservesPitch?: boolean;
      };
      if ('mozPreservesPitch' in vendorAudio) {
        vendorAudio.mozPreservesPitch = true;
      }
      if ('webkitPreservesPitch' in vendorAudio) {
        vendorAudio.webkitPreservesPitch = true;
      }
    } catch {
      // ignore
    }
  };

  // Immediate apply
  apply();

  // Crucial: Chromium resets playbackRate to defaultPlaybackRate on load/metadata events
  audio.addEventListener('loadstart', apply);
  audio.addEventListener('loadedmetadata', apply);
  audio.addEventListener('loadeddata', apply);
  audio.addEventListener('canplay', apply);
  audio.addEventListener('play', apply);
  audio.addEventListener('playing', apply);
}

/**
 * Returns a direct URL to the Google Studio AI TTS endpoint for any text/sentence
 * Supports multi-language parameter (en, ja, zh, ko, fr, de, es).
 */
export function getTTSAudioUrl(text: string, voice?: string, langCode: string = 'en'): string {
  const langConfig = getLanguageConfig(langCode);
  const chosenVoice = voice || selectedVoice || langConfig.defaultVoice;
  return `/api/ai/tts?text=${encodeURIComponent(text.trim())}&voice=${encodeURIComponent(chosenVoice)}&lang=${encodeURIComponent(langCode)}`;
}

let activeAudio: HTMLAudioElement | null = null;

export function setActiveAudio(audio: HTMLAudioElement | null) {
  activeAudio = audio;
}

export function getActiveAudio(): HTMLAudioElement | null {
  return activeAudio;
}

export function stopPronunciation() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Plays pronunciation using Google Studio AI voice with instant caching and fallback.
 * Language-aware: adapts to target language (English, Japanese, Chinese, Korean, etc.).
 * Supports onEnded callback for animated play buttons and reading example sentences.
 * Strictly respects configured playback speed (0.5x, 0.75x, 1.0x, 1.25x, 1.5x).
 */
export async function playPronunciation(
  word: string,
  customAudioUrl?: string | null,
  voice?: string,
  langCode: string = 'en',
  onEnded?: () => void
): Promise<void> {
  if (typeof window === 'undefined') return;

  const cleanWord = word.trim();
  if (!cleanWord) return;

  // Stop previous audio if playing
  stopPronunciation();

  const speed = getAudioSpeed();

  // 1. If explicit static audio file is provided (e.g. from Cambridge files)
  if (
    customAudioUrl &&
    customAudioUrl.trim().length > 5 &&
    (customAudioUrl.startsWith('http') || customAudioUrl.startsWith('/')) &&
    !customAudioUrl.includes('/api/ai/tts')
  ) {
    try {
      const audio = new Audio(customAudioUrl.trim());
      configureAudioSpeed(audio, speed);
      activeAudio = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          if (activeAudio === audio) activeAudio = null;
          onEnded?.();
          resolve();
        };
        audio.onerror = () => {
          if (activeAudio === audio) activeAudio = null;
          onEnded?.();
          reject(new Error('Custom audio URL playback failed'));
        };
        audio.play().catch((err) => {
          if (activeAudio === audio) activeAudio = null;
          reject(err);
        });
      });
      return;
    } catch {
      // Fall through to Google Studio AI
    }
  }

  // 2. Play using Google Studio AI endpoint
  try {
    const ttsUrl = getTTSAudioUrl(cleanWord, voice, langCode);
    const audio = new Audio(ttsUrl);
    configureAudioSpeed(audio, speed);
    activeAudio = audio;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        if (activeAudio === audio) activeAudio = null;
        onEnded?.();
        resolve();
      };
      audio.onerror = () => {
        if (activeAudio === audio) activeAudio = null;
        reject(new Error('Audio element error loading TTS stream'));
      };
      audio.play().catch((err) => {
        if (activeAudio === audio) activeAudio = null;
        reject(err);
      });
    });
    return;
  } catch (error) {
    console.warn('Google Studio AI audio play failed, falling back to Web Speech:', error);
    speakWithSpeechSynthesis(cleanWord, langCode, onEnded);
  }
}

function speakWithSpeechSynthesis(word: string, langCode: string = 'en', onEnded?: () => void) {
  if (!('speechSynthesis' in window)) {
    onEnded?.();
    return;
  }

  const langConfig = getLanguageConfig(langCode);
  const targetLocale = langCode === 'en' ? selectedAccent : langConfig.speechLocale;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = targetLocale;
  const speed = getAudioSpeed();
  utterance.rate = Math.max(0.5, Math.min(2.0, speed));

  utterance.onend = () => {
    onEnded?.();
  };
  utterance.onerror = () => {
    onEnded?.();
  };

  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(
    (v) => v.lang === targetLocale || v.lang.startsWith(targetLocale.slice(0, 2))
  );
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  window.speechSynthesis.speak(utterance);
}
