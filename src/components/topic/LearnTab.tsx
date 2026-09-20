'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

  // Sync items when vocabulary prop changes
  useEffect(() => {
    setItems(vocabulary);

    // Auto resume at first unmastered or review word
    const resumeIndex = vocabulary.findIndex(
      (v) => v.status === 'learning' || v.status === 'review' || v.status === 'new'
    );
    if (resumeIndex !== -1) {
      setCurrentIndex(resumeIndex);
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

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, items.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleMarkMastered = useCallback(() => {
    if (!currentWord) return;
    onProgressUpdate(currentWord.id, 'mastered');
    handleNext();
  }, [currentWord, onProgressUpdate, handleNext]);

  const handleMarkReview = useCallback(() => {
    if (!currentWord) return;
    onProgressUpdate(currentWord.id, 'review');
    handleNext();
  }, [currentWord, onProgressUpdate, handleNext]);

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleNext, handlePrev, currentWord]);

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

          {/* Flashcard Component */}
          <div className="group relative w-full min-h-[380px] rounded-3xl bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/40 transition-all duration-300 shadow-2xl p-6 sm:p-8 flex flex-col justify-between">
            {/* Top row: Level band (Góc trái), Loại từ & Google AI Audio (Góc phải) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-850/60">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-[#FF202F]/15 border border-[#FF202F]/40 text-[#FF202F] text-xs font-black tracking-wider uppercase font-mono shadow-sm">
                  {currentWord.level || 'CEFR'}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl bg-neutral-850 text-neutral-300 font-mono border border-neutral-800">
                  {currentWord.part_of_speech || 'vocabulary'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <AudioSpeedControl size="sm" />
                <CopyButton text={currentWord.word} title="Sao chép từ vựng" size="md" />
                <AudioButton word={currentWord.word} audioUrl={currentWord.audio_url} size="md" />
              </div>
            </div>

            {/* Core Section: Từ vựng, Cách đọc, Nghĩa */}
            <div className="my-auto py-6 sm:py-8 text-center space-y-3 select-text">
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
                {currentWord.word}
              </h2>

              {currentWord.ipa && (
                <p className="text-base sm:text-lg font-semibold text-[#FF202F] font-mono tracking-wider">
                  {currentWord.ipa.startsWith('/') ? currentWord.ipa : `/${currentWord.ipa}/`}
                </p>
              )}

              <div className="pt-2 space-y-2">
                <div className="inline-block px-6 py-3 rounded-2xl bg-[#181818] border border-neutral-800 text-lg sm:text-xl font-bold text-white shadow-inner">
                  {currentWord.meaning_vi}
                </div>
                {currentWord.meaning_en && (
                  <p className="text-xs sm:text-sm text-neutral-400 italic mt-2.5 max-w-lg mx-auto leading-relaxed">
                    &ldquo;{currentWord.meaning_en}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Examples Section: Hiển thị luôn 2 ví dụ của từ không cần nhấn space */}
            <div className="pt-5 border-t border-neutral-850/80 space-y-2.5 text-left text-xs select-text">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                <span>Ví dụ ngữ cảnh (2 câu)</span>
                <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1.5 normal-case">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF202F] animate-pulse"></span>
                  Google Studio AI Voice
                </span>
              </div>

              {currentWord.example_1 && (
                <div className="bg-[#181818]/80 p-3.5 rounded-2xl border border-neutral-800 transition-colors space-y-1 group/ex">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-[#FF202F] shrink-0 mt-0.5">
                        1
                      </span>
                      <p className="text-neutral-100 font-medium text-sm leading-relaxed">
                        {currentWord.example_1}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
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
                    <p className="text-neutral-400 text-xs pl-6 font-normal leading-relaxed">
                      → {currentWord.example_1_vi}
                    </p>
                  )}
                </div>
              )}

              {currentWord.example_2 && (
                <div className="bg-[#181818]/80 p-3.5 rounded-2xl border border-neutral-800 transition-colors space-y-1 group/ex">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-[#FF202F] shrink-0 mt-0.5">
                        2
                      </span>
                      <p className="text-neutral-100 font-medium text-sm leading-relaxed">
                        {currentWord.example_2}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
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
                    <p className="text-neutral-400 text-xs pl-6 font-normal leading-relaxed">
                      → {currentWord.example_2_vi}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-4 gap-3 pt-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#121212] hover:bg-[#181818] border border-neutral-800 text-xs font-bold text-neutral-300 disabled:opacity-40 transition-all active:scale-95"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Trước</span>
            </button>

            <button
              type="button"
              onClick={handleMarkReview}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#1a1410] hover:bg-[#261d15] border border-amber-500/40 text-amber-400 text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Đánh dấu cần ôn lại"
            >
              <RotateCcw size={15} />
              <span>Ôn lại</span>
            </button>

            <button
              type="button"
              onClick={handleMarkMastered}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#101b14] hover:bg-[#14261b] border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Đánh dấu đã thuộc"
            >
              <Check size={16} />
              <span>Đã thuộc</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === items.length - 1}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white text-xs font-bold disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-[#FF202F]/20"
            >
              <span className="hidden sm:inline">Tiếp theo</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Keyboard hints */}
          <div className="flex items-center justify-center gap-6 text-[11px] text-neutral-400 pt-1">
            <span>Phím <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">←</kbd> Từ trước</span>
            <span>Phím <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">→</kbd> Từ sau</span>
            <span>Phím <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">Space</kbd> Phát âm</span>
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

          {/* Vocabulary Table */}
          <div className="rounded-2xl bg-[#121212] border border-neutral-800 overflow-hidden shadow-xl">
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
