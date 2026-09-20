import React from 'react';
import { WordStatus } from '@/types';
import { CheckCircle2, RotateCcw, Clock, Sparkles } from 'lucide-react';

interface StatusBadgeProps {
  status: WordStatus | 'completed' | 'in_progress' | 'not_started';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  switch (status) {
    case 'mastered':
    case 'completed':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${sizeClasses}`}>
          <CheckCircle2 size={size === 'sm' ? 12 : 14} />
          <span>{status === 'completed' ? 'Hoàn thành' : 'Đã thuộc'}</span>
        </span>
      );
    case 'review':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 ${sizeClasses}`}>
          <RotateCcw size={size === 'sm' ? 12 : 14} />
          <span>Cần ôn</span>
        </span>
      );
    case 'learning':
    case 'in_progress':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-[#FF202F]/15 text-[#FF202F] border border-[#FF202F]/30 ${sizeClasses}`}>
          <Clock size={size === 'sm' ? 12 : 14} />
          <span>Đang học</span>
        </span>
      );
    case 'new':
    case 'not_started':
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-neutral-800 text-neutral-400 border border-neutral-700/60 ${sizeClasses}`}>
          <Sparkles size={size === 'sm' ? 12 : 14} />
          <span>Từ mới</span>
        </span>
      );
  }
}
