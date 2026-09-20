'use client';

import React, { useState, useEffect } from 'react';
import { Gauge } from 'lucide-react';
import { getAudioSpeed, setAudioSpeed } from '@/lib/audio';

interface AudioSpeedControlProps {
  className?: string;
  size?: 'sm' | 'md';
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25];

export function AudioSpeedControl({ className = '', size = 'sm' }: AudioSpeedControlProps) {
  const [speed, setSpeed] = useState<number>(1.0);

  useEffect(() => {
    setSpeed(getAudioSpeed());

    const handleSpeedChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ speed: number }>;
      if (customEvent.detail?.speed) {
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
      className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#161616] border border-neutral-800 shadow-sm ${className}`}
      title="Tốc độ đọc Google Studio AI (0.75x: Chậm, 1.0x: Chuẩn, 1.25x: Nhanh)"
    >
      <div className="flex items-center gap-1 pl-1.5 pr-0.5 text-neutral-400">
        <Gauge size={isSmall ? 12 : 14} className="text-[#FF202F]" />
        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline text-neutral-400">
          Tốc độ:
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => handleSelect(opt)}
            className={`px-2 py-0.5 rounded-lg font-mono font-bold transition-all ${
              isSmall ? 'text-[11px]' : 'text-xs'
            } ${
              speed === opt
                ? 'bg-[#FF202F] text-white shadow-sm shadow-[#FF202F]/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {opt}x
          </button>
        ))}
      </div>
    </div>
  );
}
