'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, Headphones, RotateCcw, Menu } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useUI } from '@/context/UIContext';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isChinese } = useLanguage();
  const { toggleMobileSidebar, isMobileSidebarOpen } = useUI();

  // Hide bottom nav on auth and initial language selection screens
  if (pathname.startsWith('/auth') || pathname === '/languages' || pathname === '/') {
    return null;
  }

  const vocabHref = isChinese ? '/zh/vocab' : '/vocab';
  const reviewHref = isChinese ? '/zh/review' : '/review';

  const isDashboardActive = pathname === '/dashboard';
  const isVocabActive =
    pathname.startsWith('/vocab') ||
    pathname.startsWith('/books') ||
    pathname.startsWith('/topics') ||
    (isChinese && (pathname.startsWith('/zh/vocab') || pathname.startsWith('/zh/hsk')));
  const isReadingActive = pathname.startsWith('/reading-listening');
  const isReviewActive = pathname.startsWith('/review') || pathname.startsWith('/zh/review');

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[#0d0d0d]/95 backdrop-blur-xl border-t border-neutral-800/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_25px_rgba(0,0,0,0.5)] md:bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[92%] md:max-w-md md:rounded-2xl md:border md:border-neutral-800 md:shadow-[0_10px_35px_rgba(0,0,0,0.7)] md:py-2 md:px-4 transition-all"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
    >
      {/* 1. Dashboard */}
      <Link
        href="/dashboard"
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
          isDashboardActive
            ? 'text-[#FF202F] font-bold'
            : 'text-neutral-400 hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-lg ${isDashboardActive ? 'bg-[#FF202F]/15' : ''}`}>
          <LayoutDashboard size={19} />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Trang chủ</span>
      </Link>

      {/* 2. Vocab */}
      <Link
        href={vocabHref}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
          isVocabActive
            ? 'text-[#FF202F] font-bold'
            : 'text-neutral-400 hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-lg ${isVocabActive ? 'bg-[#FF202F]/15' : ''}`}>
          <BookOpen size={19} />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">
          {isChinese ? 'HSK' : 'Từ vựng'}
        </span>
      </Link>

      {/* 3. BBC Reading & Listening */}
      <Link
        href="/reading-listening"
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
          isReadingActive
            ? 'text-[#FF202F] font-bold'
            : 'text-neutral-400 hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-lg ${isReadingActive ? 'bg-[#FF202F]/15' : ''}`}>
          <Headphones size={19} />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Luyện nghe</span>
      </Link>

      {/* 4. Review SRS */}
      <Link
        href={reviewHref}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
          isReviewActive
            ? 'text-[#FF202F] font-bold'
            : 'text-neutral-400 hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-lg ${isReviewActive ? 'bg-[#FF202F]/15' : ''}`}>
          <RotateCcw size={19} />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Ôn tập</span>
      </Link>

      {/* 5. Menu Drawer Trigger */}
      <button
        type="button"
        onClick={toggleMobileSidebar}
        aria-label="Mở danh mục chi tiết"
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
          isMobileSidebarOpen
            ? 'text-[#FF202F] font-bold'
            : 'text-neutral-400 hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-lg ${isMobileSidebarOpen ? 'bg-[#FF202F]/15' : ''}`}>
          <Menu size={19} />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Danh mục</span>
      </button>
    </nav>
  );
}
