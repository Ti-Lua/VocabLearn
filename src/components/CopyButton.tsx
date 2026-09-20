'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
  title?: string;
  label?: string;
}

export function CopyButton({
  text,
  className = '',
  size = 'sm',
  title,
  label,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
      document.body.removeChild(textarea);
    }
  };

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 13 : 16;
  const defaultTitle = title || (copied ? 'Đã sao chép vào bộ nhớ tạm!' : 'Sao chép');

  if (label) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={defaultTitle}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#161616] hover:bg-[#202020] text-neutral-400 hover:text-white border border-neutral-800 transition-all text-xs font-semibold active:scale-95 ${
          copied ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' : ''
        } ${className}`}
      >
        {copied ? <Check size={iconSize} className="text-emerald-400" /> : <Copy size={iconSize} />}
        <span>{copied ? 'Đã copy!' : label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={defaultTitle}
      className={`relative inline-flex items-center justify-center rounded-full bg-[#1e1e1e] hover:bg-[#282828] text-neutral-400 hover:text-white border border-neutral-800 transition-all active:scale-95 shrink-0 ${
        isSmall ? 'w-7 h-7 p-1' : 'w-9 h-9 p-2'
      } ${copied ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' : ''} ${className}`}
    >
      {copied ? (
        <Check size={iconSize} className="text-emerald-400" />
      ) : (
        <Copy size={iconSize} />
      )}
    </button>
  );
}
