import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 - 100
  className?: string;
  showText?: boolean;
  height?: string;
}

export function ProgressBar({ progress, className = '', showText = false, height = 'h-2' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className={`w-full ${className}`}>
      {showText && (
        <div className="flex justify-between items-center text-xs text-neutral-400 mb-1.5 font-medium">
          <span>Tiến độ hoàn thành</span>
          <span className="text-[#FF202F] font-bold">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-[#1e1e1e] rounded-full overflow-hidden border border-neutral-800/80 ${height}`}>
        <div
          className="h-full bg-gradient-to-r from-[#D91827] to-[#FF202F] transition-all duration-500 rounded-full"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
