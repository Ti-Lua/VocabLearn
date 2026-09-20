'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BookOpen,
  Headphones,
  RotateCcw,
  BarChart2,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { Book, Topic, ChineseTopicSummary } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useUI } from '@/context/UIContext';

export function Sidebar() {
  const pathname = usePathname();
  const { isChinese } = useLanguage();
  const { isMobileSidebarOpen, closeMobileSidebar } = useUI();

  // English state
  const [books, setBooks] = useState<Book[]>([]);
  const [expandedBooks, setExpandedBooks] = useState<Record<number, boolean>>({
    4: true,
  });
  const [topicsByBook, setTopicsByBook] = useState<Record<number, Topic[]>>({});

  // Chinese HSK state
  const [hskRootExpanded, setHskRootExpanded] = useState(true);
  const [expandedHsk, setExpandedHsk] = useState<Record<number, boolean>>({
    1: true, // HSK 1 expanded by default
  });
  const [topicsByHsk, setTopicsByHsk] = useState<Record<number, ChineseTopicSummary[]>>({});
  const [comingSoonToast, setComingSoonToast] = useState(false);

  // Tree mode activates when inside vocab, books, topics, review, or Chinese /zh routes
  const isTreeMode =
    pathname.startsWith('/zh') ||
    pathname.startsWith('/vocab') ||
    pathname.startsWith('/books') ||
    pathname.startsWith('/topics') ||
    pathname.startsWith('/review');

  // Load English books if needed
  useEffect(() => {
    if (!isChinese && isTreeMode && books.length === 0) {
      fetch('/api/books')
        .then((res) => res.json())
        .then((data) => {
          if (data.books) {
            setBooks(data.books);
          }
        })
        .catch(console.error);
    }
  }, [isChinese, isTreeMode, books.length]);

  // Load default HSK 1 topics if Chinese tree mode is active
  useEffect(() => {
    if (isChinese && isTreeMode && !topicsByHsk[1]) {
      fetch('/api/chinese/levels/1')
        .then((r) => r.json())
        .then((d) => {
          if (d.topics) {
            setTopicsByHsk((prev) => ({ ...prev, 1: d.topics }));
          }
        })
        .catch(console.error);
    }
  }, [isChinese, isTreeMode, topicsByHsk]);

  const toggleBook = (bookId: number) => {
    setExpandedBooks((prev) => ({
      ...prev,
      [bookId]: !prev[bookId],
    }));

    if (!topicsByBook[bookId]) {
      fetch(`/api/books/${bookId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.topics) {
            setTopicsByBook((prev) => ({ ...prev, [bookId]: data.topics }));
          }
        })
        .catch(console.error);
    }
  };

  const toggleHsk = (lvl: number) => {
    setExpandedHsk((prev) => ({
      ...prev,
      [lvl]: !prev[lvl],
    }));

    if (!topicsByHsk[lvl]) {
      fetch(`/api/chinese/levels/${lvl}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.topics) {
            setTopicsByHsk((prev) => ({ ...prev, [lvl]: data.topics }));
          }
        })
        .catch(console.error);
    }
  };

  const renderNavContent = (isMobile = false) => {
    const handleItemClick = () => {
      if (isMobile) closeMobileSidebar();
    };

    return (
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Điều hướng
          </p>
          <nav className="space-y-1">
            {/* Về trang chủ (Language Selection) */}
            <Link
              href="/languages"
              onClick={handleItemClick}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-[#181818] transition-all"
            >
              <Home size={18} className="text-neutral-400" />
              <span>Về trang chủ</span>
            </Link>

            {/* Dashboard link */}
            <Link
              href="/dashboard"
              onClick={handleItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                pathname === '/dashboard'
                  ? 'bg-[#FF202F]/15 text-[#FF202F] font-semibold border border-[#FF202F]/30'
                  : 'text-neutral-400 hover:text-white hover:bg-[#181818]'
              }`}
            >
              <Layers size={18} className={pathname === '/dashboard' ? 'text-[#FF202F]' : 'text-neutral-400'} />
              <span>Tổng quan học tập</span>
            </Link>

            {/* Vocab Menu: Mode 1: Compact (Dashboard view) */}
            {!isTreeMode ? (
              <Link
                href={isChinese ? '/zh/vocab' : '/vocab'}
                onClick={handleItemClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === '/vocab' || pathname === '/zh/vocab'
                    ? 'bg-[#FF202F]/15 text-[#FF202F] font-semibold border border-[#FF202F]/30'
                    : 'text-neutral-400 hover:text-white hover:bg-[#181818]'
                }`}
              >
                <BookOpen size={18} className="text-neutral-400" />
                <span>Vocab</span>
              </Link>
            ) : (
              /* Mode 2: Tree / Accordion Vocab Mode */
              <div className="pt-2">
                {isChinese ? (
                  /* CHINESE HSK TREE ACCORDION */
                  <div>
                    <div className="flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                      <button
                        type="button"
                        onClick={() => setHskRootExpanded(!hskRootExpanded)}
                        className="flex items-center gap-2 hover:text-[#FF202F] transition-colors"
                      >
                        <BookOpen size={16} className="text-[#FF202F]" />
                        <span>HSK Series</span>
                        {hskRootExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <Link
                        href="/zh/vocab"
                        onClick={handleItemClick}
                        className="text-[11px] text-neutral-400 hover:text-[#FF202F] font-normal"
                      >
                        Tất cả
                      </Link>
                    </div>

                    {hskRootExpanded && (
                      <div className="mt-2 space-y-1.5 pl-1.5">
                        {[1, 2, 3, 4, 5, 6].map((lvl) => {
                          const isExpanded = !!expandedHsk[lvl];
                          const isCurrentLvl = pathname.startsWith(`/zh/hsk/${lvl}`);
                          const topics = topicsByHsk[lvl] || [];

                          return (
                            <div key={lvl} className="rounded-lg bg-[#121212]/50 border border-neutral-850 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleHsk(lvl)}
                                className={`w-full flex items-center justify-between px-2.5 py-2 text-left text-xs font-semibold transition-all ${
                                  isCurrentLvl
                                    ? 'text-[#FF202F] bg-[#181818]'
                                    : 'text-neutral-300 hover:text-white hover:bg-[#181818]'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate pr-1">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono font-bold">
                                    HSK {lvl}
                                  </span>
                                  <span className="text-[11px] text-neutral-400 truncate">
                                    {lvl <= 2 ? 'Sơ cấp' : lvl <= 4 ? 'Trung cấp' : 'Cao cấp'}
                                  </span>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown size={14} className="flex-shrink-0 text-neutral-400" />
                                ) : (
                                  <ChevronRight size={14} className="flex-shrink-0 text-neutral-400" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="px-2 py-1.5 space-y-1 bg-[#090909] border-t border-neutral-850 max-h-56 overflow-y-auto">
                                  <Link
                                    href={`/zh/hsk/${lvl}`}
                                    onClick={handleItemClick}
                                    className="block px-2 py-1 text-[11px] text-[#FF202F] hover:underline font-bold"
                                  >
                                    → Xem tổng quan HSK {lvl}
                                  </Link>
                                  {topics.length === 0 ? (
                                    <p className="px-2 py-1 text-[10px] text-neutral-500">Đang tải danh sách chủ đề...</p>
                                  ) : (
                                    topics.map((t) => {
                                      const encodedTopic = encodeURIComponent(t.topic);
                                      const isTopicActive = pathname === `/zh/hsk/${lvl}/${encodedTopic}` || pathname.includes(`/zh/hsk/${lvl}/${t.topic}`);
                                      return (
                                        <Link
                                          key={t.topic}
                                          href={`/zh/hsk/${lvl}/${encodedTopic}`}
                                          onClick={handleItemClick}
                                          className={`block px-2 py-1 text-[11px] rounded truncate transition-colors ${
                                            isTopicActive
                                              ? 'bg-[#FF202F]/20 text-[#FF202F] font-bold'
                                              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                                          }`}
                                          title={t.topic}
                                        >
                                          {t.topic} ({t.total_words})
                                        </Link>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Ôn tập từ chưa thuộc */}
                        <Link
                          href="/zh/review"
                          onClick={handleItemClick}
                          className={`flex items-center gap-2.5 px-3 py-2 mt-2 rounded-xl text-xs font-semibold transition-all ${
                            pathname === '/zh/review'
                              ? 'bg-[#FF202F] text-white shadow-md shadow-[#FF202F]/20'
                              : 'bg-[#151212] text-neutral-300 hover:text-white hover:bg-[#1c1818] border border-neutral-800'
                          }`}
                        >
                          <RotateCcw size={15} className={pathname === '/zh/review' ? 'text-white' : 'text-[#FF202F]'} />
                          <span>Ôn tập từ chưa thuộc</span>
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ENGLISH VOCABULARY IN USE TREE ACCORDION */
                  <div>
                    <div className="flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-[#FF202F]" />
                        <span>Vocab Books</span>
                      </div>
                      <Link
                        href="/vocab"
                        onClick={handleItemClick}
                        className="text-[11px] text-neutral-400 hover:text-[#FF202F]"
                      >
                        Tất cả
                      </Link>
                    </div>

                    <div className="mt-2 space-y-1.5 pl-1.5">
                      {books.map((book) => {
                        const isExpanded = !!expandedBooks[book.id];
                        const isCurrentBook = pathname.includes(`/books/${book.id}`);
                        const topics = topicsByBook[book.id] || [];

                        return (
                          <div key={book.id} className="rounded-lg bg-[#121212]/50 border border-neutral-850 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleBook(book.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-2 text-left text-xs font-semibold transition-all ${
                                isCurrentBook
                                  ? 'text-[#FF202F] bg-[#181818]'
                                  : 'text-neutral-300 hover:text-white hover:bg-[#181818]'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate pr-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                                  {book.level}
                                </span>
                                <span className="truncate">{book.short_name}</span>
                              </div>
                              {isExpanded ? (
                                <ChevronDown size={14} className="flex-shrink-0 text-neutral-400" />
                              ) : (
                                <ChevronRight size={14} className="flex-shrink-0 text-neutral-400" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="px-2 py-1.5 space-y-1 bg-[#090909] border-t border-neutral-850">
                                <Link
                                  href={`/books/${book.id}`}
                                  onClick={handleItemClick}
                                  className="block px-2 py-1 text-[11px] text-[#FF202F] hover:underline font-medium"
                                >
                                  → Xem toàn bộ {book.total_topics || ''} topics
                                </Link>
                                {topics.slice(0, 5).map((topic) => (
                                  <Link
                                    key={topic.id}
                                    href={`/topics/${topic.id}`}
                                    onClick={handleItemClick}
                                    className={`block px-2 py-1 text-[11px] rounded truncate transition-colors ${
                                      pathname === `/topics/${topic.id}`
                                        ? 'bg-[#FF202F]/20 text-[#FF202F] font-bold'
                                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                                    }`}
                                    title={topic.name}
                                  >
                                    {topic.unit_number ? `Unit ${topic.unit_number}: ` : ''}
                                    {topic.name}
                                  </Link>
                                ))}
                                {topics.length > 5 && (
                                  <Link
                                    href={`/books/${book.id}`}
                                    onClick={handleItemClick}
                                    className="block px-2 py-0.5 text-[10px] text-neutral-400 hover:text-neutral-200"
                                  >
                                    + {topics.length - 5} topics khác...
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Ôn tập từ chưa thuộc (English) */}
                      <Link
                        href="/review"
                        onClick={handleItemClick}
                        className={`flex items-center gap-2.5 px-3 py-2 mt-2 rounded-xl text-xs font-semibold transition-all ${
                          pathname === '/review'
                            ? 'bg-[#FF202F] text-white shadow-md shadow-[#FF202F]/20'
                            : 'bg-[#151212] text-neutral-300 hover:text-white hover:bg-[#1c1818] border border-neutral-800'
                        }`}
                      >
                        <RotateCcw size={15} className={pathname === '/review' ? 'text-white' : 'text-[#FF202F]'} />
                        <span>Ôn tập từ chưa thuộc</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reading & Listening Link */}
            {isChinese ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    handleItemClick();
                    setComingSoonToast(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-[#181818] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Headphones size={18} className="text-neutral-400" />
                    <span>Reading &amp; Listening</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                    Soon
                  </span>
                </button>
              </div>
            ) : (
              <Link
                href="/reading-listening"
                onClick={handleItemClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === '/reading-listening'
                    ? 'bg-[#FF202F]/15 text-[#FF202F] font-semibold border border-[#FF202F]/30'
                    : 'text-neutral-400 hover:text-white hover:bg-[#181818]'
                }`}
              >
                <Headphones size={18} className={pathname === '/reading-listening' ? 'text-[#FF202F]' : 'text-neutral-400'} />
                <span>Reading &amp; Listening</span>
              </Link>
            )}

            {/* Statistics Link */}
            <Link
              href="/statistics"
              onClick={handleItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                pathname === '/statistics'
                  ? 'bg-[#FF202F]/15 text-[#FF202F] font-semibold border border-[#FF202F]/30'
                  : 'text-neutral-400 hover:text-white hover:bg-[#181818]'
              }`}
            >
              <BarChart2 size={18} className={pathname === '/statistics' ? 'text-[#FF202F]' : 'text-neutral-400'} />
              <span>Thống kê</span>
            </Link>
          </nav>
        </div>
      </div>
    );
  };

  const bottomBadge = (
    <div className="p-3 rounded-xl bg-[#121212] border border-neutral-850">
      <div className="flex items-center gap-2 text-xs text-neutral-400 font-semibold mb-1">
        <Sparkles size={14} className="text-[#FF202F]" />
        <span>{isChinese ? 'LearnVocab Chinese' : 'LearnVocab English'}</span>
      </div>
      <p className="text-[11px] text-neutral-400 leading-relaxed">
        {isChinese
          ? 'Khung chuẩn HSK 1 - HSK 6 • 4.896 từ vựng duy nhất.'
          : '4 bộ sách Cambridge • 4,635+ từ vựng thực tế.'}
      </p>
    </div>
  );

  return (
    <>
      {/* 1. Mobile & iPad Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* 2. Mobile & iPad Off-canvas Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-[#0d0d0d] border-r border-neutral-800 p-4 flex flex-col justify-between select-none shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-800/80 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D91827] to-[#FF202F] text-white flex items-center justify-center font-bold shadow-md shadow-[#FF202F]/25">
              <BookOpen size={16} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-white leading-tight">Danh mục bài học</p>
              <p className="text-[10px] text-neutral-400 font-mono">
                {isChinese ? 'HSK 1 - 6 Series' : 'Cambridge Vocab'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeMobileSidebar}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto pr-1">
          {renderNavContent(true)}
        </div>

        {/* Drawer Footer Badge */}
        <div className="pt-3 flex-shrink-0">
          {bottomBadge}
        </div>
      </div>

      {/* 3. Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-[#0d0d0d] border-r border-neutral-800/80 min-h-[calc(100vh-4rem)] p-4 flex-col justify-between select-none">
        <div className="flex-1 overflow-y-auto pr-1">
          {renderNavContent(false)}
        </div>
        <div className="pt-4 flex-shrink-0">
          {bottomBadge}
        </div>
      </aside>

      {/* 4. Coming Soon Toast for Chinese Reading & Listening */}
      {comingSoonToast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#181818] border border-[#FF202F]/40 text-white text-xs font-semibold shadow-2xl animate-fade-in">
          <Headphones size={16} className="text-[#FF202F] flex-shrink-0" />
          <span>Tính năng Reading &amp; Listening tiếng Trung đang được cập nhật!</span>
          <button
            type="button"
            onClick={() => setComingSoonToast(false)}
            className="text-neutral-400 hover:text-white text-xs ml-2 p-1"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
