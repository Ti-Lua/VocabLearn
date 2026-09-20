'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ChineseVocabulary } from '@/types';

export default function ChineseReviewPage() {
  const { user } = useAuth();
  const [words, setWords] = useState<ChineseVocabulary[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [topicsList, setTopicsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Active flashcard state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);

  const fetchReviewWords = useCallback(() => {
    if (!user) return;

    setLoading(true);
    let url = `/api/chinese/review?userId=${user.id}`;
    if (selectedLevel !== 'all') url += `&level=${selectedLevel}`;
    if (selectedTopic !== 'all') url += `&topic=${encodeURIComponent(selectedTopic)}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.words) {
          setWords(data.words);
          setCurrentIndex(0);

          // Extract distinct topics
          const topics = Array.from(new Set(data.words.map((w: ChineseVocabulary) => w.topic))) as string[];
          setTopicsList(topics);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, selectedLevel, selectedTopic]);

  useEffect(() => {
    fetchReviewWords();
  }, [fetchReviewWords]);

  const currentWord: ChineseVocabulary | undefined = words[currentIndex];

  const handleUpdateStatus = useCallback(async (vocabId: string, status: 'learning' | 'mastered' | 'review_later') => {
    if (!user) return;

    try {
      await fetch('/api/chinese/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          vocabularyId: vocabId,
          status,
        }),
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }

    if (status === 'mastered') {
      // Word is mastered -> remove from review list immediately!
      setSessionCompletedCount((prev) => prev + 1);
      setWords((prev) => {
        const nextWords = prev.filter((w) => w.id !== vocabId);
        if (currentIndex >= nextWords.length) {
          setCurrentIndex(Math.max(0, nextWords.length - 1));
        }
        return nextWords;
      });
    } else {
      // Advance to next word
      setCurrentIndex((prev) => (prev < words.length - 1 ? prev + 1 : 0));
    }
  }, [user, words.length, currentIndex]);

  const handleNextCard = useCallback(() => {
    setCurrentIndex((prev) => (prev < words.length - 1 ? prev + 1 : prev));
  }, [words.length]);

  const handlePrevCard = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [currentWord, handleNextCard, handlePrevCard, handleUpdateStatus]);

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <AppHeader />

      <div className="flex-1 flex">
        {/* Accordion Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-8 space-y-6 w-full min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30 mb-2">
                <RotateCcw size={14} />
                <span>Spaced Repetition Review</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Ôn tập từ tiếng Trung chưa thuộc
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Toàn bộ các từ HSK bạn đã đánh dấu Đang học hoặc Cần ôn lại.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#181818] border border-neutral-800 text-white">
                Cần ôn tập: <strong className="text-[#FF202F]">{words.length} từ</strong>
              </span>
              {sessionCompletedCount > 0 && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  Đã thuộc phiên này: {sessionCompletedCount} từ
                </span>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-[#121212] border border-neutral-800 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold">
              <Filter size={14} />
              <span>Lọc theo cấp HSK:</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedLevel('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedLevel === 'all'
                    ? 'bg-[#FF202F] text-white shadow'
                    : 'bg-[#181818] text-neutral-400 hover:text-white'
                }`}
              >
                Tất cả HSK
              </button>
              {[1, 2, 3, 4, 5, 6].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all font-mono ${
                    selectedLevel === lvl
                      ? 'bg-[#FF202F] text-white shadow'
                      : 'bg-[#181818] text-neutral-400 hover:text-white'
                  }`}
                >
                  HSK {lvl}
                </button>
              ))}
            </div>

            {topicsList.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-neutral-400">Chủ đề:</span>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#181818] border border-neutral-700 text-xs text-neutral-300 focus:outline-none"
                >
                  <option value="all">Tất cả chủ đề ({topicsList.length})</option>
                  {topicsList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-24 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-[#FF202F] mx-auto" />
              <p className="text-xs text-neutral-400">Đang tải danh sách từ cần ôn tập...</p>
            </div>
          ) : words.length === 0 ? (
            /* Empty State */
            <div className="p-12 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Tuyệt vời! Bạn không có từ nào cần ôn tập</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Tất cả các từ vựng tiếng Trung đều đang ở trạng thái nhớ tốt. Hãy vào các chủ đề HSK để tiếp tục học từ mới nhé!
              </p>
              <Link
                href="/zh/vocab"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF202F] text-white text-xs font-bold shadow-lg shadow-[#FF202F]/20 hover:scale-105 active:scale-95 transition-all"
              >
                <span>Khám phá các cấp độ HSK</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : currentWord ? (
            /* Review Flashcard */
            <div className="max-w-xl mx-auto space-y-6">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300">
                  {currentWord.topic} • HSK {currentWord.hsk_level}
                </span>
                <span className="font-mono font-bold text-white">
                  {currentIndex + 1} / {words.length}
                </span>
              </div>

              <ProgressBar
                progress={((currentIndex + 1) / words.length) * 100}
                height="h-1.5"
              />

              <div className="w-full rounded-3xl bg-[#121212] border border-neutral-800 p-8 flex flex-col justify-between shadow-2xl hover:border-[#FF202F]/50 transition-all space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-black uppercase font-mono">
                      HSK {currentWord.hsk_level}
                    </span>
                    <span className="text-xs text-neutral-400">{currentWord.topic}</span>
                  </div>

                  <div className="flex items-center gap-2">
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

                <div className="text-center py-4 space-y-2 select-text">
                  <h2 className="text-5xl sm:text-6xl font-black text-white tracking-[0.16em] pl-[0.16em] font-sans">
                    {currentWord.word}
                  </h2>
                  <p className="text-xl sm:text-2xl font-semibold text-[#FF202F] font-mono tracking-wider">
                    {currentWord.pinyin}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-neutral-200 pt-2">
                    {currentWord.meaning_vi}
                  </p>
                </div>

                {currentWord.example_cn && (
                  <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-2 text-left select-text">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <span>Ví dụ minh họa:</span>
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
                    <p className="text-sm sm:text-base font-bold text-white leading-relaxed tracking-[0.08em]">
                      {currentWord.example_cn}
                    </p>
                    {currentWord.example_pinyin && (
                      <p className="text-xs text-[#FF202F] font-mono tracking-wide">{currentWord.example_pinyin}</p>
                    )}
                    {currentWord.example_vi && (
                      <p className="text-xs text-neutral-300 italic">{currentWord.example_vi}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-neutral-850 text-xs text-neutral-400">
                  <span className="font-semibold text-neutral-400">
                    Trạng thái hiện tại:{' '}
                    <strong className="text-amber-400">
                      {currentWord.status === 'learning' ? 'Đang học' : 'Cần ôn lại'}
                    </strong>
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    Bấm [3] để hoàn thành
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(currentWord.id, 'learning')}
                  className="py-3 px-2 rounded-2xl bg-[#1c1415] hover:bg-[#25181a] border border-[#FF202F]/40 text-[#FF202F] text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow"
                >
                  <XCircle size={16} />
                  <span>Chưa thuộc (1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(currentWord.id, 'review_later')}
                  className="py-3 px-2 rounded-2xl bg-[#1c1914] hover:bg-[#262118] border border-amber-500/40 text-amber-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow"
                >
                  <RotateCcw size={16} />
                  <span>Ôn lại (2)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(currentWord.id, 'mastered')}
                  className="py-3 px-2 rounded-2xl bg-[#111c14] hover:bg-[#14261b] border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow"
                >
                  <CheckCircle2 size={16} />
                  <span>Đã thuộc (3)</span>
                </button>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePrevCard}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 text-xs font-bold disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                  <span>Từ trước (←)</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextCard}
                  disabled={currentIndex === words.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 text-xs font-bold disabled:opacity-30 transition-colors"
                >
                  <span>Từ tiếp theo (→)</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
