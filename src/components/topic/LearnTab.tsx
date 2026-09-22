'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Vocabulary, WordStatus } from '@/types';
import { AudioButton } from '@/components/AudioButton';
import { AudioSpeedControl } from '@/components/AudioSpeedControl';
import { CopyButton } from '@/components/CopyButton';
import { StatusBadge } from '@/components/StatusBadge';
import { ProgressBar } from '@/components/ProgressBar';
import {
  Check,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  List,
  Layers,
  Search,
  Sparkles,
  X,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { playPronunciation } from '@/lib/audio';

interface LearnTabProps {
  vocabulary: Vocabulary[];
  userId?: string;
  onProgressUpdate: (vocabId: number, status: WordStatus) => void;
  onGoToPractice: () => void;
}

export function LearnTab({
  vocabulary,
  onProgressUpdate,
  onGoToPractice,
}: LearnTabProps) {
  const [mode, setMode] = useState<'flashcard' | 'list'>('flashcard');
  const [items, setItems] = useState<Vocabulary[]>(vocabulary);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);

  // List mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const sortAsc = true;

  const hasAutoResumedRef = useRef(false);
  const currentTopicIdRef = useRef<number | null>(null);

  // Touch swipe handling for mobile & iPad
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

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
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Sync items when vocabulary prop changes, without forcibly resetting currentIndex
  useEffect(() => {
    setItems((prev) => {
      if (prev.length === vocabulary.length && prev.length > 0) {
        return prev.map((item) => {
          const updated = vocabulary.find((v) => v.id === item.id);
          return updated ? { ...item, status: updated.status } : item;
        });
      }
      return vocabulary;
    });

    // Detect if topic changed
    const topicId = vocabulary[0]?.topic_id;
    if (topicId !== undefined && topicId !== currentTopicIdRef.current) {
      currentTopicIdRef.current = topicId;
      hasAutoResumedRef.current = false;
    }

    // Auto resume at last studied word or first unmastered word ONLY ONCE on topic load
    if (!hasAutoResumedRef.current && vocabulary.length > 0) {
      hasAutoResumedRef.current = true;
      let targetIndex = -1;
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const startWordId = urlParams.get('startWordId');
        if (startWordId) {
          targetIndex = vocabulary.findIndex((v) => v.id === Number(startWordId));
        }
        if (targetIndex === -1 && topicId) {
          const saved = localStorage.getItem(`learnvocab_topic_${topicId}_index`);
          if (saved) {
            const idx = parseInt(saved, 10);
            if (idx >= 0 && idx < vocabulary.length) targetIndex = idx;
          }
        }
      }

      if (targetIndex !== -1) {
        setCurrentIndex(targetIndex);
      } else {
        const resumeIndex = vocabulary.findIndex(
          (v) => v.status === 'learning' || v.status === 'review' || v.status === 'new'
        );
        if (resumeIndex !== -1) {
          setCurrentIndex(resumeIndex);
        }
      }
    }
  }, [vocabulary]);

  // Shuffle toggle
  const handleToggleShuffle = () => {
    if (!isShuffled) {
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      setItems(shuffled);
      setIsShuffled(true);
      setCurrentIndex(0);
    } else {
      setItems(vocabulary);
      setIsShuffled(false);
      setCurrentIndex(0);
    }
  };

  const currentWord = items[currentIndex];



  // Auto save current position
  useEffect(() => {
    const topicId = items[0]?.topic_id;
    if (topicId && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`learnvocab_topic_${topicId}_index`, String(currentIndex));
      } catch {}
    }
  }, [currentIndex, items]);

  const isSavingRef = useRef(false);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
  }, [items.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  const handleMarkMastered = useCallback(() => {
    if (!currentWord || isSavingRef.current) return;
    isSavingRef.current = true;
    setTimeout(() => { isSavingRef.current = false; }, 300);

    const targetId = currentWord.id;

    // 1. Notify parent to persist progress to Supabase Cloud immediately
    onProgressUpdate(targetId, 'mastered');

    // 2. Update local items state so badge and status update in 0ms
    setItems((prev) =>
      prev.map((item) => (item.id === targetId ? { ...item, status: 'mastered' } : item))
    );

    // 3. Advance to the next word immediately
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setToastMessage('🎉 Bạn đã hoàn thành học tất cả các từ trong Topic này!');
      setTimeout(() => setToastMessage(null), 3500);
    }
  }, [currentWord, currentIndex, items.length, onProgressUpdate]);

  const handleMarkReview = useCallback(() => {
    if (!currentWord || isSavingRef.current) return;
    isSavingRef.current = true;
    setTimeout(() => { isSavingRef.current = false; }, 300);

    const targetId = currentWord.id;

    // 1. Notify parent to persist progress to Supabase Cloud immediately
    onProgressUpdate(targetId, 'review');

    // 2. Update local items state
    setItems((prev) =>
      prev.map((item) => (item.id === targetId ? { ...item, status: 'review' } : item))
    );

    // 3. Advance to the next word immediately
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setToastMessage('Đã đến từ cuối cùng trong chủ đề này.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [currentWord, currentIndex, items.length, onProgressUpdate]);

  // AI Visual Concept Pipeline State
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [conceptModalData, setConceptModalData] = useState<{
    word: string;
    visual_concept: string;
    score: number;
    reason: string;
  } | null>(null);

  const handleGenerateContextImage = async (vocabId: number) => {
    setIsGeneratingImage(true);
    setToastMessage('Đang phân tích nghĩa ngữ cảnh và tạo ảnh AI...');
    try {
      const res = await fetch(`/api/vocabulary/${vocabId}/generate-image`, { method: 'POST' });
      const data = await res.json();
      if (data.data) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === vocabId
              ? {
                  ...item,
                  word_image: data.data.image_url,
                  visual_concept: data.data.visual_concept,
                  image_validation_score: data.data.validation.score,
                  image_validation_status: data.data.validation.status === 'PASS' ? 'passed' : 'manual_review',
                  image_validation_reason: data.data.validation.reason,
                }
              : item
          )
        );
        setToastMessage(`Đã tạo ảnh chuẩn nghĩa! Điểm kiểm định: ${data.data.validation.score}/100`);
      } else {
        setToastMessage('Có lỗi khi tạo ảnh AI. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error(err);
      setToastMessage('Lỗi kết nối máy chủ tạo ảnh.');
    } finally {
      setIsGeneratingImage(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const renderConceptDetails = (conceptStr: string) => {
    try {
      const parsed = JSON.parse(conceptStr);
      return (
        <div className="space-y-2.5 text-xs text-left">
          {parsed.word_sense_identified && (
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-[#FF202F] font-bold block mb-0.5">1. Nghĩa cụ thể đang sử dụng:</span>
              <span className="text-white font-medium">{parsed.word_sense_identified}</span>
            </div>
          )}
          {parsed.visual_category && (
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400 font-bold">2. Thể loại minh họa:</span>
              <span className="text-amber-400 font-mono uppercase font-bold text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {parsed.visual_category}
              </span>
            </div>
          )}
          {parsed.visual_scenario && (
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-400 font-bold block mb-0.5">3. Tình huống trực quan (Hiểu trong 3 giây):</span>
              <span className="text-neutral-200">{parsed.visual_scenario}</span>
            </div>
          )}
          {parsed.primary_focal_element && (
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-400 font-bold block mb-0.5">4. Tiêu điểm thị giác chính:</span>
              <span className="text-neutral-300">{parsed.primary_focal_element}</span>
            </div>
          )}
          {parsed.clarity_explanation && (
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-400 font-bold block mb-0.5">5. Vì sao tình huống này truyền tải đúng nghĩa:</span>
              <span className="text-neutral-300 italic">{parsed.clarity_explanation}</span>
            </div>
          )}
        </div>
      );
    } catch {
      return <p className="text-xs text-neutral-300 whitespace-pre-wrap">{conceptStr}</p>;
    }
  };

  // Keyboard navigation: ArrowLeft, ArrowRight, Space
  useEffect(() => {
    if (mode !== 'flashcard') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (currentWord) {
          playPronunciation(currentWord.word, currentWord.audio_url);
        }
      } else if (e.key === '1') {
        e.preventDefault();
        handleMarkReview();
      } else if (e.key === '2' || e.key === '3' || e.key === 'Enter') {
        e.preventDefault();
        handleMarkMastered();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleNext, handlePrev, handleMarkMastered, handleMarkReview, currentWord]);

  // List mode filtered items
  const filteredList = items
    .filter((v) => {
      const matchesSearch =
        v.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.meaning_vi.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterStatus !== 'all' && (v.status || 'new') !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => (sortAsc ? a.word.localeCompare(b.word) : b.word.localeCompare(a.word)));

  const learnedCount = items.filter((v) => v.status && v.status !== 'new').length;

  return (
    <div className="space-y-6">
      {/* Mode Switcher & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-neutral-850">
        <div className="flex items-center gap-2 bg-[#121212] p-1 rounded-xl border border-neutral-800">
          <button
            type="button"
            onClick={() => setMode('flashcard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'flashcard'
                ? 'bg-[#FF202F] text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers size={15} />
            <span>Flashcard</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('list')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'list'
                ? 'bg-[#FF202F] text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <List size={15} />
            <span>Danh sách từ ({items.length})</span>
          </button>
        </div>

        {/* Practice unlock teaser indicator */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 hidden sm:inline">
            Đã học: <strong className="text-white">{learnedCount} / {items.length} từ</strong>
          </span>
          {learnedCount >= 4 ? (
            <button
              type="button"
              onClick={onGoToPractice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c1415] hover:bg-[#25181a] border border-[#FF202F]/40 text-xs font-bold text-[#FF202F] transition-all animate-pulse"
            >
              <Sparkles size={14} />
              <span>Đã mở khóa Practice →</span>
            </button>
          ) : (
            <span className="text-[11px] text-neutral-400 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
              Học thêm {4 - learnedCount} từ để mở khóa Practice
            </span>
          )}
        </div>
      </div>

      {/* FLASHCARD MODE */}
      {mode === 'flashcard' && currentWord && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Flashcard Header Controls */}
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm font-mono">
                {currentIndex + 1} / {items.length}
              </span>
              <StatusBadge status={currentWord.status || 'new'} size="sm" />
            </div>

            <button
              type="button"
              onClick={handleToggleShuffle}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                isShuffled
                  ? 'bg-[#FF202F]/15 text-[#FF202F] border-[#FF202F]/40'
                  : 'bg-[#121212] text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              <Shuffle size={13} />
              <span>{isShuffled ? 'Ngẫu nhiên' : 'Theo thứ tự'}</span>
            </button>
          </div>

          <ProgressBar progress={((currentIndex + 1) / items.length) * 100} height="h-1.5" />

          {/* Flashcard Component with Touch Swipe */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="group relative w-full min-h-[350px] sm:min-h-[380px] rounded-3xl bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/40 transition-all duration-300 shadow-2xl p-5 sm:p-8 flex flex-col justify-between select-none touch-pan-y"
          >
            {/* Top row: Level band (Góc trái), Loại từ & Google AI Audio (Góc phải) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-neutral-850/60">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="px-2.5 sm:px-3 py-1 rounded-xl bg-[#FF202F]/15 border border-[#FF202F]/40 text-[#FF202F] text-xs font-black tracking-wider uppercase font-mono shadow-sm">
                  {currentWord.level || 'CEFR'}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 sm:px-2.5 py-1 rounded-xl bg-neutral-850 text-neutral-300 font-mono border border-neutral-800">
                  {currentWord.part_of_speech || 'vocabulary'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <AudioSpeedControl size="sm" />
                <CopyButton text={currentWord.word} title="Sao chép từ vựng" size="md" />
                <AudioButton word={currentWord.word} audioUrl={currentWord.audio_url} size="md" />
              </div>
            </div>

            {/* Core Section: Từ vựng, Cách đọc, Nghĩa */}
            <div className="my-auto py-5 sm:py-8 text-center space-y-2.5 sm:space-y-3 select-text">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight break-words max-w-full">
                {currentWord.word}
              </h2>

              {currentWord.ipa && (
                <p className="text-sm sm:text-lg font-semibold text-[#FF202F] font-mono tracking-wider">
                  {currentWord.ipa.startsWith('/') ? currentWord.ipa : `/${currentWord.ipa}/`}
                </p>
              )}

              <div className="pt-2 space-y-2">
                <div className="inline-block max-w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-[#181818] border border-neutral-800 text-base sm:text-xl font-bold text-white shadow-inner break-words">
                  {currentWord.meaning_vi}
                </div>
                {currentWord.meaning_en && (
                  <p className="text-xs sm:text-sm text-neutral-400 italic mt-2 max-w-lg mx-auto leading-relaxed">
                    &ldquo;{currentWord.meaning_en}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Examples Section: Hiển thị luôn 2 ví dụ của từ không cần nhấn space */}
            <div className="pt-4 sm:pt-5 border-t border-neutral-850/80 space-y-2.5 text-left text-xs select-text">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                <span>Ví dụ ngữ cảnh (2 câu)</span>
                <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1.5 normal-case">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF202F] animate-pulse"></span>
                  Google Studio AI Voice
                </span>
              </div>

              {currentWord.example_1 && (
                <div className="bg-[#181818]/80 p-3 sm:p-3.5 rounded-2xl border border-neutral-800 transition-colors space-y-1 group/ex">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-[#FF202F] shrink-0 mt-0.5">
                        1
                      </span>
                      <p className="text-neutral-100 font-medium text-xs sm:text-sm leading-relaxed break-words">
                        {currentWord.example_1}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <CopyButton
                        text={currentWord.example_1}
                        size="sm"
                        title="Sao chép câu ví dụ 1"
                      />
                      <AudioButton
                        word={currentWord.example_1}
                        size="sm"
                        langCode="en"
                        title="Nghe câu ví dụ 1 (Google Studio AI)"
                      />
                    </div>
                  </div>
                  {currentWord.example_1_vi && (
                    <p className="text-neutral-400 text-[11px] sm:text-xs pl-5 sm:pl-6 font-normal leading-relaxed break-words">
                      → {currentWord.example_1_vi}
                    </p>
                  )}
                </div>
              )}

              {currentWord.example_2 && (
                <div className="bg-[#181818]/80 p-3 sm:p-3.5 rounded-2xl border border-neutral-800 transition-colors space-y-1 group/ex">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-[#FF202F] shrink-0 mt-0.5">
                        2
                      </span>
                      <p className="text-neutral-100 font-medium text-xs sm:text-sm leading-relaxed break-words">
                        {currentWord.example_2}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <CopyButton
                        text={currentWord.example_2}
                        size="sm"
                        title="Sao chép câu ví dụ 2"
                      />
                      <AudioButton
                        word={currentWord.example_2}
                        size="sm"
                        langCode="en"
                        title="Nghe câu ví dụ 2 (Google Studio AI)"
                      />
                    </div>
                  </div>
                  {currentWord.example_2_vi && (
                    <p className="text-neutral-400 text-[11px] sm:text-xs pl-5 sm:pl-6 font-normal leading-relaxed break-words">
                      → {currentWord.example_2_vi}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Row - Thumb-friendly tap targets */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center justify-center gap-1 sm:gap-1.5 py-3 sm:py-3.5 rounded-2xl bg-[#121212] hover:bg-[#181818] border border-neutral-800 text-xs font-bold text-neutral-300 disabled:opacity-40 transition-all active:scale-95 min-h-[46px]"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Trước</span>
            </button>

            <button
              type="button"
              onClick={handleMarkReview}
              className="flex items-center justify-center gap-1 sm:gap-1.5 py-3 sm:py-3.5 rounded-2xl bg-[#1a1410] hover:bg-[#261d15] border border-amber-500/40 text-amber-400 text-xs font-bold transition-all active:scale-95 shadow-sm min-h-[46px]"
              title="Đánh dấu cần ôn lại"
            >
              <RotateCcw size={15} />
              <span>Ôn lại</span>
            </button>

            <button
              type="button"
              onClick={handleMarkMastered}
              className="flex items-center justify-center gap-1 sm:gap-1.5 py-3 sm:py-3.5 rounded-2xl bg-[#101b14] hover:bg-[#14261b] border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-all active:scale-95 shadow-sm min-h-[46px]"
              title="Đánh dấu đã thuộc"
            >
              <Check size={16} />
              <span>Đã thuộc</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === items.length - 1}
              className="flex items-center justify-center gap-1 sm:gap-1.5 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white text-xs font-bold disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-[#FF202F]/20 min-h-[46px]"
            >
              <span className="hidden sm:inline">Tiếp theo</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Swipe indicator on mobile & keyboard hints on desktop */}
          <div className="flex flex-col items-center gap-1.5 pt-1">
            <span className="md:hidden text-[11px] text-neutral-500 font-medium">
              👈 Vuốt ngang thẻ từ để chuyển câu tiếp theo 👉
            </span>
            <div className="hidden md:flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-[11px] text-neutral-400">
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">←</kbd> Từ trước</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-amber-400 font-mono font-bold">1</kbd> Ôn lại</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-emerald-400 font-mono font-bold">2</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-emerald-400 font-mono font-bold">Enter</kbd> Đã thuộc</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">→</kbd> Tiếp theo</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">Space</kbd> Phát âm</span>
            </div>
          </div>
        </div>
      )}

      {/* LIST MODE */}
      {mode === 'list' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute inset-y-0 left-3 my-auto text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm từ vựng hoặc nghĩa..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#121212] border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF202F] transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {['all', 'new', 'learning', 'mastered', 'review'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                    filterStatus === st
                      ? 'bg-[#FF202F] text-white shadow'
                      : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {st === 'all' ? 'Tất cả' : st === 'mastered' ? 'Đã thuộc' : st === 'review' ? 'Cần ôn' : st === 'learning' ? 'Đang học' : 'Từ mới'}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Card List (Visible on < 768px) */}
          <div className="md:hidden space-y-3">
            {filteredList.map((vocab) => (
              <div
                key={vocab.id}
                className="p-4 rounded-2xl bg-[#121212] border border-neutral-800 shadow-md space-y-3"
              >
                {/* Card Header: Level, Word, IPA, Audio & Copy */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded-lg bg-[#FF202F]/15 border border-[#FF202F]/40 text-[#FF202F] text-[10px] font-black uppercase font-mono">
                        {vocab.level || 'CEFR'}
                      </span>
                      {vocab.part_of_speech && (
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">
                          {vocab.part_of_speech}
                        </span>
                      )}
                      <StatusBadge status={vocab.status || 'new'} size="sm" />
                    </div>
                    <h3 className="text-base font-bold text-white select-text">
                      {vocab.word}
                    </h3>
                    {vocab.ipa && (
                      <p className="text-xs text-[#FF202F] font-mono">{vocab.ipa}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <CopyButton text={vocab.word} size="sm" title="Sao chép từ vựng" />
                    <AudioButton word={vocab.word} audioUrl={vocab.audio_url} size="sm" />
                  </div>
                </div>

                {/* Meaning */}
                <div className="text-sm font-semibold text-neutral-200 bg-[#181818] p-2.5 rounded-xl border border-neutral-800/80">
                  {vocab.meaning_vi}
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-850 text-xs">
                  <div className="flex items-center gap-1.5">
                    {vocab.visual_concept && (
                      <button
                        type="button"
                        onClick={() =>
                          setConceptModalData({
                            word: vocab.word,
                            visual_concept: vocab.visual_concept || '',
                            score: vocab.image_validation_score || 0,
                            reason: vocab.image_validation_reason || '',
                          })
                        }
                        className="p-2 rounded-xl bg-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                        title="Xem Visual Concept"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isGeneratingImage}
                      onClick={() => handleGenerateContextImage(vocab.id)}
                      className="p-2 rounded-xl bg-neutral-850 hover:bg-[#FF202F]/20 text-neutral-400 hover:text-[#FF202F] transition-colors disabled:opacity-40"
                      title="Tạo ảnh AI"
                    >
                      <Sparkles size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onProgressUpdate(vocab.id, 'review')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                        vocab.status === 'review'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-neutral-850 hover:bg-amber-500/10 border-neutral-750 text-neutral-400 hover:text-amber-400'
                      }`}
                    >
                      <RotateCcw size={12} />
                      <span>Ôn lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onProgressUpdate(vocab.id, 'mastered')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                        vocab.status === 'mastered'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-neutral-850 hover:bg-emerald-500/10 border-neutral-750 text-neutral-400 hover:text-emerald-400'
                      }`}
                    >
                      <Check size={13} />
                      <span>Đã thuộc</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop & Tablet Vocabulary Table (Visible on >= 768px) */}
          <div className="hidden md:block rounded-2xl bg-[#121212] border border-neutral-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] border-b border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3 text-center w-16">Level</th>
                    <th className="py-3 px-4">Từ vựng</th>
                    <th className="py-3 px-3">Phiên âm &amp; Loại</th>
                    <th className="py-3 px-4">Nghĩa Tiếng Việt</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-3 text-center">Phát âm</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {filteredList.map((vocab) => {
                    return (
                      <tr key={vocab.id} className="hover:bg-[#181818]/60 transition-colors group">
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-lg bg-[#FF202F]/15 border border-[#FF202F]/40 text-[#FF202F] text-[10px] font-black uppercase font-mono shadow-sm">
                            {vocab.level || 'CEFR'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white text-sm select-text">
                          <div className="flex items-center gap-2">
                            <span>{vocab.word}</span>
                            <CopyButton text={vocab.word} size="sm" title="Sao chép từ vựng" />
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="text-neutral-400 font-mono">{vocab.ipa || '-'}</span>
                            <span className="text-[10px] text-neutral-400 uppercase font-semibold">
                              {vocab.part_of_speech || ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-300 font-medium">
                          {vocab.meaning_vi}
                        </td>
                        <td className="py-3.5 px-3">
                          <StatusBadge status={vocab.status || 'new'} size="sm" />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <AudioButton word={vocab.word} audioUrl={vocab.audio_url} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {vocab.visual_concept && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConceptModalData({
                                    word: vocab.word,
                                    visual_concept: vocab.visual_concept || '',
                                    score: vocab.image_validation_score || 0,
                                    reason: vocab.image_validation_reason || '',
                                  })
                                }
                                className="p-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                                title="Xem Visual Concept & Thẩm định"
                              >
                                <Eye size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isGeneratingImage}
                              onClick={() => handleGenerateContextImage(vocab.id)}
                              className="p-1.5 rounded-lg bg-neutral-850 hover:bg-[#FF202F]/20 text-neutral-400 hover:text-[#FF202F] transition-colors disabled:opacity-40"
                              title="Tạo ảnh minh họa chuẩn nghĩa AI"
                            >
                              <Sparkles size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onProgressUpdate(vocab.id, 'review')}
                              className="p-1.5 rounded-lg bg-neutral-850 hover:bg-amber-500/20 text-neutral-400 hover:text-amber-400 transition-colors"
                              title="Đánh dấu cần ôn lại"
                            >
                              <RotateCcw size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onProgressUpdate(vocab.id, 'mastered')}
                              className="p-1.5 rounded-lg bg-neutral-850 hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-400 transition-colors"
                              title="Đánh dấu đã thuộc"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredList.length === 0 && (
              <div className="py-12 text-center text-neutral-500 text-xs">
                Không tìm thấy từ vựng nào trong danh sách.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#181818] border border-neutral-700 text-white text-xs font-semibold shadow-2xl animate-fade-in">
          <Sparkles size={16} className="text-[#FF202F] shrink-0 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Visual Concept & Validation Modal */}
      {conceptModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#121212] border border-neutral-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#FF202F]" />
                <h3 className="text-base font-bold text-white">
                  Visual Concept &amp; Thẩm định: <span className="text-[#FF202F]">{conceptModalData.word}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConceptModalData(null)}
                className="p-1.5 rounded-lg bg-neutral-850 text-neutral-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={16}
                  className={conceptModalData.score >= 85 ? 'text-emerald-400' : 'text-amber-400'}
                />
                <span className="text-xs font-bold text-white">Điểm kiểm định tự động:</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  conceptModalData.score >= 85
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {conceptModalData.score}/100 • {conceptModalData.score >= 85 ? 'PASS' : 'RETRY / REVIEW'}
              </span>
            </div>

            {conceptModalData.reason && (
              <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs">
                <span className="text-neutral-400 font-bold block mb-1">Đánh giá của AI Validator:</span>
                <p className="text-neutral-300 leading-relaxed">{conceptModalData.reason}</p>
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#181818] border border-neutral-800 space-y-3">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                Bước trung gian: Visual Concept
              </span>
              {renderConceptDetails(conceptModalData.visual_concept)}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setConceptModalData(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
