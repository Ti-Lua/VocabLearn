'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { AudioButton } from '@/components/AudioButton';
import { AudioSpeedControl } from '@/components/AudioSpeedControl';
import { CopyButton } from '@/components/CopyButton';
import { ProgressBar } from '@/components/ProgressBar';
import { playPronunciation } from '@/lib/audio';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Search,
  List,
  Layers,
  Loader2,
  XCircle,
} from 'lucide-react';
import { ChineseVocabulary } from '@/types';
import { saveLocalWordProgress, mergeWithLocalProgress } from '@/lib/progressStorage';

export default function ChineseTopicDetailPage({
  params,
}: {
  params: Promise<{ level: string; topic: string }>;
}) {
  const resolvedParams = use(params);
  const levelNum = parseInt(resolvedParams.level, 10);
  const rawTopic = decodeURIComponent(resolvedParams.topic);
  const { user } = useAuth();

  const [words, setWords] = useState<ChineseVocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'flashcard' | 'list'>('flashcard');

  // Flashcard state
  const [currentIndex, setCurrentIndex] = useState(0);

  // List mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'pinyin' | 'word' | 'status'>('pinyin');

  const fetchTopicWords = useCallback(() => {
    if (!user || isNaN(levelNum) || !rawTopic) return;

    fetch(`/api/chinese/topics?level=${levelNum}&topic=${encodeURIComponent(rawTopic)}&userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.words) {
          const merged = mergeWithLocalProgress<ChineseVocabulary>(user.id, data.words, 'chinese');
          setWords(merged);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, levelNum, rawTopic]);

  useEffect(() => {
    fetchTopicWords();
  }, [fetchTopicWords]);

  const currentWord: ChineseVocabulary | undefined = words[currentIndex];

  const handleNextCard = useCallback(() => {
    setCurrentIndex((prev) => (prev < words.length - 1 ? prev + 1 : prev));
  }, [words.length]);

  const handlePrevCard = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  // Touch swipe handling for mobile & iPad
  const touchStartXRef = React.useRef<number | null>(null);
  const touchEndXRef = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (diff > 45) {
      handleNextCard();
    } else if (diff < -45) {
      handlePrevCard();
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Update progress handler - immediate 0ms card advance and persistence
  const handleUpdateStatus = useCallback((vocabId: string, status: 'learning' | 'mastered' | 'review_later') => {
    if (!user) return;

    // 1. Optimistic UI update in 0ms
    setWords((prev) =>
      prev.map((w) => (w.id === vocabId ? { ...w, status } : w))
    );

    // 2. Persist to localStorage immediately
    saveLocalWordProgress(user.id, vocabId, status, 'chinese');

    // 3. Auto next card immediately in flashcard mode
    if (activeTab === 'flashcard') {
      setCurrentIndex((prev) => (prev < words.length - 1 ? prev + 1 : prev));
    }

    // 4. Send background server sync
    fetch('/api/chinese/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        vocabularyId: vocabId,
        status,
      }),
    }).catch((err) => {
      console.error('Error updating status:', err);
    });
  }, [user, activeTab, words.length]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (currentWord) {
          playPronunciation(currentWord.word, undefined, 'Kore', 'zh');
        }
      } else if (e.key === '1' && currentWord) {
        handleUpdateStatus(currentWord.id, 'learning');
      } else if (e.key === '2' && currentWord) {
        handleUpdateStatus(currentWord.id, 'review_later');
      } else if (e.key === '3' && currentWord) {
        handleUpdateStatus(currentWord.id, 'mastered');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextCard, handlePrevCard, handleUpdateStatus, currentWord]);

  // Computed metrics
  const masteredCount = words.filter((w) => w.status === 'mastered').length;
  const totalCount = words.length;
  const progressPct = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  // Filtered & sorted words for List View
  const filteredWords = words
    .filter((w) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchWord = w.word.toLowerCase().includes(q);
        const matchPinyin = w.pinyin.toLowerCase().includes(q);
        const matchMeaning = w.meaning_vi.toLowerCase().includes(q);
        if (!matchWord && !matchPinyin && !matchMeaning) return false;
      }
      if (filterStatus !== 'all') {
        const s = w.status || 'new';
        if (s !== filterStatus) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'pinyin') return a.pinyin.localeCompare(b.pinyin);
      if (sortBy === 'word') return a.word.localeCompare(b.word);
      if (sortBy === 'status') return (a.status || 'new').localeCompare(b.status || 'new');
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <AppHeader />

      <div className="flex-1 flex">
        {/* Accordion Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-8 space-y-6 w-full min-w-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-neutral-400 overflow-x-auto no-scrollbar whitespace-nowrap">
            <Link href="/dashboard" className="hover:text-white">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/zh/vocab" className="hover:text-white">
              HSK Series
            </Link>
            <span>/</span>
            <Link href={`/zh/hsk/${levelNum}`} className="hover:text-white">
              HSK {levelNum}
            </Link>
            <span>/</span>
            <span className="text-[#FF202F] font-semibold truncate max-w-xs">{rawTopic}</span>
          </div>

          {/* Topic Header Card */}
          <div className="p-5 sm:p-8 rounded-3xl bg-gradient-to-r from-[#141414] via-[#121212] to-[#181112] border border-neutral-800 space-y-5 sm:space-y-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                    HSK {levelNum}
                  </span>
                  {masteredCount === totalCount && totalCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={12} />
                      <span>Đã hoàn thành chủ đề</span>
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-3xl font-black text-white">{rawTopic}</h1>
                <p className="text-xs text-neutral-400">
                  {totalCount} từ vựng • Đã thuộc:{' '}
                  <strong className="text-white">
                    {masteredCount} / {totalCount} ({progressPct}%)
                  </strong>
                </p>
              </div>

              {/* Progress summary widget */}
              <div className="w-full sm:w-56 bg-[#181818] p-3.5 rounded-2xl border border-neutral-800">
                <div className="flex justify-between items-center text-xs mb-1 font-bold">
                  <span className="text-neutral-400">Tiến độ chủ đề</span>
                  <span className="text-[#FF202F]">{progressPct}%</span>
                </div>
                <ProgressBar progress={progressPct} height="h-2" />
              </div>
            </div>
          </div>

          {/* View Mode Toggle Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
              <button
                type="button"
                onClick={() => setActiveTab('flashcard')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'flashcard'
                    ? 'bg-[#FF202F] text-white shadow-lg shadow-[#FF202F]/20'
                    : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                <Layers size={15} />
                <span>1. Flashcards ({totalCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'list'
                    ? 'bg-[#FF202F] text-white shadow-lg shadow-[#FF202F]/20'
                    : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                <List size={15} />
                <span>2. Word List</span>
              </button>
            </div>

            <Link
              href="/zh/review"
              className="text-xs text-neutral-400 hover:text-[#FF202F] font-semibold self-end sm:self-auto"
            >
              Ôn tập từ chưa thuộc →
            </Link>
          </div>

          {loading ? (
            <div className="py-24 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-[#FF202F] mx-auto" />
              <p className="text-xs text-neutral-400">Đang tải danh sách từ vựng...</p>
            </div>
          ) : activeTab === 'flashcard' && currentWord ? (
            /* =================================================== */
            /* TAB 1: CHINESE FLASHCARD VIEW                       */
            /* =================================================== */
            <div className="max-w-xl mx-auto space-y-6">
              {/* Progress counter & navigation */}
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300">
                  {rawTopic} • HSK {levelNum}
                </span>
                <span className="font-mono font-bold text-white">
                  {currentIndex + 1} / {words.length}
                </span>
              </div>

              <ProgressBar
                progress={((currentIndex + 1) / words.length) * 100}
                height="h-1.5"
              />

              {/* Flashcard Component with Touch Swipe */}
              <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="w-full rounded-3xl bg-[#121212] border border-neutral-800 p-5 sm:p-8 flex flex-col justify-between shadow-2xl hover:border-[#FF202F]/50 transition-all space-y-6 select-none touch-pan-y"
              >
                {/* Card Header: Level band, topic tag, Speed control & Audio button */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-neutral-850/60">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#FF202F]/15 border border-[#FF202F]/40 text-[#FF202F] text-xs font-black uppercase font-mono">
                      HSK {levelNum}
                    </span>
                    <span className="text-xs text-neutral-400 font-medium">
                      {currentWord.topic}
                    </span>
                    {currentWord.duplicate_in_levels && (
                      <span className="text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 rounded bg-neutral-850">
                        Xuất hiện cả ở: {currentWord.duplicate_in_levels}
                      </span>
                    )}
                  </div>

                  {/* Right side controls: Audio Speed + Copy Word + Audio Pronunciation */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <AudioSpeedControl size="sm" />
                    <CopyButton
                      text={currentWord.word}
                      title="Sao chép chữ Hán"
                      size="md"
                    />
                    <AudioButton
                      word={currentWord.word}
                      audioUrl={currentWord.word}
                      langCode="zh"
                      size="md"
                    />
                  </div>
                </div>

                {/* Center: Very Large Chinese Character with letter spacing & Pinyin */}
                <div className="text-center py-4 space-y-2 select-text">
                  <h2 className="text-4xl sm:text-6xl font-black text-white tracking-[0.14em] pl-[0.14em] font-sans break-words max-w-full">
                    {currentWord.word}
                  </h2>
                  <p className="text-lg sm:text-2xl font-semibold text-[#FF202F] font-mono tracking-wider">
                    {currentWord.pinyin}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-neutral-200 pt-1">
                    {currentWord.meaning_vi}
                  </p>
                </div>

                {/* Examples Section with comfortable spacing & copy */}
                {currentWord.example_cn && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-2 text-left select-text">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <span>Câu ví dụ:</span>
                        <span className="text-[10px] text-neutral-500 font-mono">Google Studio AI</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CopyButton
                          text={currentWord.example_cn}
                          title="Sao chép câu ví dụ tiếng Trung"
                          size="sm"
                        />
                        <AudioButton
                          word={currentWord.example_cn}
                          size="sm"
                          langCode="zh"
                          title="Nghe câu ví dụ tiếng Trung (Google Studio AI)"
                        />
                      </div>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-white leading-relaxed tracking-[0.08em] break-words">
                      {currentWord.example_cn}
                    </p>
                    {currentWord.example_pinyin && (
                      <p className="text-xs text-[#FF202F] font-mono tracking-wide break-words">{currentWord.example_pinyin}</p>
                    )}
                    {currentWord.example_vi && (
                      <p className="text-xs text-neutral-300 italic break-words">{currentWord.example_vi}</p>
                    )}
                  </div>
                )}

                {/* Card Status Indicator */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-850 text-xs text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <span>Trạng thái:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                        currentWord.status === 'mastered'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : currentWord.status === 'review_later'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : currentWord.status === 'learning'
                          ? 'bg-[#FF202F]/20 text-[#FF202F] border border-[#FF202F]/30'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {currentWord.status === 'mastered'
                        ? 'Đã thuộc'
                        : currentWord.status === 'review_later'
                        ? 'Cần ôn lại'
                        : currentWord.status === 'learning'
                        ? 'Đang học'
                        : 'Mới'}
                    </span>
                  </div>

                  <span className="hidden sm:inline text-[11px] text-neutral-400">
                    Phím tắt: [1] Chưa thuộc • [2] Ôn lại • [3] Đã thuộc • [Space] Nghe
                  </span>
                </div>
              </div>

              {/* 3 Action Buttons - Thumb-friendly tap targets */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(currentWord.id, 'learning')}
                  className="min-h-[48px] py-3 px-2 rounded-2xl bg-[#1c1415] hover:bg-[#25181a] border border-[#FF202F]/40 text-[#FF202F] text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow"
                >
                  <XCircle size={16} />
                  <span>Chưa thuộc (1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(currentWord.id, 'review_later')}
                  className="min-h-[48px] py-3 px-2 rounded-2xl bg-[#1c1914] hover:bg-[#262118] border border-amber-500/40 text-amber-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow"
                >
                  <RotateCcw size={16} />
                  <span>Ôn lại (2)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(currentWord.id, 'mastered')}
                  className="min-h-[48px] py-3 px-2 rounded-2xl bg-[#111c14] hover:bg-[#14261b] border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow"
                >
                  <CheckCircle2 size={16} />
                  <span>Đã thuộc (3)</span>
                </button>
              </div>

              {/* Swipe indicator on mobile */}
              <div className="md:hidden text-[11px] text-neutral-500 text-center font-medium">
                👈 Vuốt ngang thẻ để chuyển từ tiếp theo 👉
              </div>

              {/* Bottom Nav: Prev / Next buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handlePrevCard}
                  disabled={currentIndex === 0}
                  className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 text-xs font-bold disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                  <span>Từ trước</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextCard}
                  disabled={currentIndex === words.length - 1}
                  className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 text-xs font-bold disabled:opacity-30 transition-colors"
                >
                  <span>Tiếp theo</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* =================================================== */
            /* TAB 2: WORD LIST VIEW                               */
            /* =================================================== */
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#121212] border border-neutral-800">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo chữ Hán, Pinyin hoặc nghĩa tiếng Việt..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181818] border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF202F]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#181818] border border-neutral-700 text-xs text-neutral-300 focus:outline-none"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="mastered">Đã thuộc</option>
                    <option value="learning">Đang học</option>
                    <option value="review_later">Cần ôn lại</option>
                    <option value="new">Từ mới</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'pinyin' | 'word' | 'status')}
                    className="px-3 py-2 rounded-xl bg-[#181818] border border-neutral-700 text-xs text-neutral-300 focus:outline-none"
                  >
                    <option value="pinyin">Xếp theo Pinyin</option>
                    <option value="word">Xếp theo chữ Hán</option>
                    <option value="status">Xếp theo trạng thái</option>
                  </select>
                </div>
              </div>

              {/* Mobile Card List (Visible on < 768px) */}
              <div className="md:hidden space-y-3">
                {filteredWords.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-2xl bg-[#121212] border border-neutral-800 shadow-md space-y-3"
                  >
                    {/* Header: HSK level, Pinyin, Audio, Copy */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold">
                            HSK {w.hsk_level}
                          </span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                              w.status === 'mastered'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : w.status === 'review_later'
                                ? 'bg-amber-500/20 text-amber-400'
                                : w.status === 'learning'
                                ? 'bg-[#FF202F]/20 text-[#FF202F]'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {w.status === 'mastered'
                              ? 'Đã thuộc'
                              : w.status === 'review_later'
                              ? 'Cần ôn lại'
                              : w.status === 'learning'
                              ? 'Đang học'
                              : 'Mới'}
                          </span>
                        </div>
                        <h3 className="text-2xl font-black text-white font-sans tracking-[0.1em] select-text">
                          {w.word}
                        </h3>
                        <p className="text-xs text-[#FF202F] font-mono font-semibold">{w.pinyin}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <CopyButton text={w.word} size="sm" title="Sao chép chữ Hán" />
                        <AudioButton word={w.word} audioUrl={w.word} langCode="zh" size="sm" />
                      </div>
                    </div>

                    {/* Meaning */}
                    <div className="text-sm font-semibold text-neutral-200 bg-[#181818] p-2.5 rounded-xl border border-neutral-800/80">
                      {w.meaning_vi}
                    </div>

                    {/* Mobile Quick Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-850">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(w.id, 'learning')}
                        className="px-3 py-1.5 rounded-xl bg-neutral-850 hover:bg-[#FF202F]/20 text-neutral-400 hover:text-[#FF202F] text-xs font-bold transition-colors"
                      >
                        Chưa thuộc
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(w.id, 'review_later')}
                        className="px-3 py-1.5 rounded-xl bg-neutral-850 hover:bg-amber-500/20 text-neutral-400 hover:text-amber-400 text-xs font-bold transition-colors"
                      >
                        Ôn lại
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(w.id, 'mastered')}
                        className="px-3 py-1.5 rounded-xl bg-neutral-850 hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-400 text-xs font-bold transition-colors"
                      >
                        Đã thuộc
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Words Table (Visible on >= 768px) */}
              <div className="hidden md:block rounded-2xl bg-[#121212] border border-neutral-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-neutral-800">
                      <tr>
                        <th className="py-3 px-4">Chữ Hán</th>
                        <th className="py-3 px-4">Pinyin</th>
                        <th className="py-3 px-4">Nghĩa Tiếng Việt</th>
                        <th className="py-3 px-3">Cấp HSK</th>
                        <th className="py-3 px-3">Trạng thái</th>
                        <th className="py-3 px-3 text-center">Phát âm</th>
                        <th className="py-3 px-4 text-right">Đánh dấu nhanh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {filteredWords.map((w) => (
                        <tr key={w.id} className="hover:bg-[#181818]/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white text-base font-sans tracking-[0.14em] select-text">
                            <div className="flex items-center gap-2">
                              <span>{w.word}</span>
                              <CopyButton text={w.word} size="sm" title="Sao chép chữ Hán" />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#FF202F] font-semibold tracking-wide select-text">
                            {w.pinyin}
                          </td>
                          <td className="py-3.5 px-4 text-neutral-300 font-medium select-text">
                            {w.meaning_vi}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold">
                              HSK {w.hsk_level}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                w.status === 'mastered'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : w.status === 'review_later'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : w.status === 'learning'
                                  ? 'bg-[#FF202F]/20 text-[#FF202F]'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              {w.status === 'mastered'
                                ? 'Đã thuộc'
                                : w.status === 'review_later'
                                ? 'Ôn lại'
                                : w.status === 'learning'
                                ? 'Đang học'
                                : 'Mới'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <AudioButton
                              word={w.word}
                              audioUrl={w.word}
                              langCode="zh"
                              size="sm"
                            />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(w.id, 'learning')}
                                className="px-2 py-1 rounded-lg bg-neutral-850 hover:bg-[#FF202F]/20 text-neutral-400 hover:text-[#FF202F] text-[10px] font-bold"
                              >
                                Học
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(w.id, 'review_later')}
                                className="px-2 py-1 rounded-lg bg-neutral-850 hover:bg-amber-500/20 text-neutral-400 hover:text-amber-400 text-[10px] font-bold"
                              >
                                Ôn
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(w.id, 'mastered')}
                                className="px-2 py-1 rounded-lg bg-neutral-850 hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-400 text-[10px] font-bold"
                              >
                                Thuộc
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredWords.length === 0 && (
                  <div className="py-12 text-center text-xs text-neutral-500">
                    Không tìm thấy từ vựng nào phù hợp với bộ lọc tìm kiếm.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
