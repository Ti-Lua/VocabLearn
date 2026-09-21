'use client';

import React, { useState, useEffect } from 'react';
import { Gauge } from 'lucide-react';
import { getAudioSpeed, setAudioSpeed } from '@/lib/audio';

interface AudioSpeedControlProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x', title: '0.5x - Cực chậm (Nghe rõ từng âm phát âm)' },
  { value: 0.75, label: '0.75x', title: '0.75x - Chậm vừa' },
  { value: 1.0, label: '1x', title: '1.0x - Tốc độ chuẩn tự nhiên' },
  { value: 1.25, label: '1.25x', title: '1.25x - Nhanh vừa' },
  { value: 1.5, label: '1.5x', title: '1.5x - Rất nhanh (Luyện phản xạ)' },
];

export function AudioSpeedControl({ className = '', size = 'sm' }: AudioSpeedControlProps) {
  const [speed, setSpeed] = useState<number>(1.0);

  useEffect(() => {
    setSpeed(getAudioSpeed());

    const handleSpeedChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ speed: number }>;
      if (customEvent.detail?.speed !== undefined) {
        setSpeed(customEvent.detail.speed);
      }
    };

    window.addEventListener('audio_speed_change', handleSpeedChange);
    return () => window.removeEventListener('audio_speed_change', handleSpeedChange);
  }, []);

  const handleSelect = (newSpeed: number) => {
    setSpeed(newSpeed);
    setAudioSpeed(newSpeed);
  };

  const isSmall = size === 'sm';

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-[#161616] border border-neutral-800 shadow-sm ${className}`}
      title="Tốc độ đọc giọng AI (0.5x: Cực chậm, 0.75x: Chậm, 1x: Chuẩn, 1.25x: Nhanh, 1.5x: Rất nhanh)"
    >
      <div className="flex items-center gap-1 pl-1.5 pr-0.5 text-neutral-400">
        <Gauge size={isSmall ? 12 : 14} className="text-[#FF202F]" />
        <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline text-neutral-400">
          Tốc độ:
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        {SPEED_OPTIONS.map((opt) => {
          const isActive = Math.abs(speed - opt.value) < 0.05;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              title={opt.title}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg font-mono font-bold transition-all active:scale-95 ${
                isSmall ? 'text-[10px] sm:text-[11px]' : 'text-xs'
              } ${
                isActive
                  ? 'bg-[#FF202F] text-white shadow-sm shadow-[#FF202F]/30 scale-105'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
