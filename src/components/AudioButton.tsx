'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { playPronunciation, stopPronunciation, getAudioSpeed } from '@/lib/audio';
import { SupportedLanguageCode } from '@/config/languages';

interface AudioButtonProps {
  word: string;
  audioUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  langCode?: SupportedLanguageCode;
  voice?: string;
  title?: string;
  label?: string;
}

export function AudioButton({
  word,
  audioUrl,
  className = '',
  size = 'md',
  langCode = 'en',
  voice,
  title,
  label,
}: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      stopPronunciation();
      setIsPlaying(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    setIsPlaying(true);

    // Safety timeout dynamically adjusted by playback speed so slow audio (e.g. 0.5x) is never prematurely cut off
    const currentSpeed = getAudioSpeed();
    const wordCount = word.trim().split(/\s+/).length;
    const safetyDuration = Math.max(4000, Math.round(((wordCount * 600) + 3000) / (currentSpeed || 1)));

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsPlaying(false);
    }, safetyDuration);

    playPronunciation(word, audioUrl, voice, langCode, () => {
      setIsPlaying(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    });
  };

  const sizeClasses = {
    sm: 'w-7 h-7 p-1 text-xs',
    md: 'w-9 h-9 p-2 text-xs',
    lg: 'w-11 h-11 p-2.5 text-sm',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  const defaultTitle = title || (word.includes(' ') || word.length > 20
    ? 'Nghe câu ví dụ bằng Google Studio AI'
    : `Phát âm: ${word}`);

  if (label) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={defaultTitle}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-[#222222] text-neutral-300 hover:text-[#FF202F] border border-neutral-800 transition-all duration-200 active:scale-95 text-xs font-semibold ${
          isPlaying ? 'text-[#FF202F] border-[#FF202F]/50 ring-2 ring-[#FF202F]/20 bg-[#1c1415]' : ''
        } ${className}`}
      >
        {isPlaying ? (
          <VolumeX size={iconSizes[size]} className="text-[#FF202F]" />
        ) : (
          <Volume2 size={iconSizes[size]} className={isPlaying ? 'animate-pulse text-[#FF202F]' : ''} />
        )}
        <span>{isPlaying ? 'Dừng đọc' : label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={defaultTitle}
      className={`relative inline-flex items-center justify-center rounded-full bg-[#1e1e1e] text-neutral-300 hover:text-[#FF202F] hover:bg-[#282828] border border-neutral-800 transition-all duration-200 active:scale-95 shrink-0 ${sizeClasses[size]} ${
        isPlaying ? 'text-[#FF202F] border-[#FF202F]/50 ring-2 ring-[#FF202F]/20 shadow-md shadow-[#FF202F]/20' : ''
      } ${className}`}
    >
      <Volume2 size={iconSizes[size]} className={isPlaying ? 'animate-pulse text-[#FF202F]' : ''} />
    </button>
  );
}
