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
import {
  RotateCcw,
  BookOpen,
  Filter,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Layers,
  Sparkles,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { Vocabulary, Book } from '@/types';

export default function ReviewPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | 'all'>('all');
  const [reviewWords, setReviewWords] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);

  // Review mode: setup | flashcard | quiz
  const [reviewMode, setReviewMode] = useState<'setup' | 'flashcard' | 'quiz' | 'result'>('setup');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // Fetch books & review words
  const fetchReviewWords = useCallback((bookId?: number | 'all') => {
    if (!user) return;
    setLoading(true);
    let url = `/api/review?userId=${user.id}`;
    if (bookId && bookId !== 'all') {
      url += `&bookId=${bookId}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.words) setReviewWords(data.words);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/books')
      .then((r) => r.json())
      .then((d) => {
        if (d.books) setBooks(d.books);
      });
    fetchReviewWords('all');
  }, [user, fetchReviewWords]);

  const handleFilterBook = (bookId: number | 'all') => {
    setSelectedBookId(bookId);
    fetchReviewWords(bookId);
  };

  const startReviewSession = (type: 'flashcard' | 'fill_blank' | 'meaning_quiz' | 'mixed') => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsAnswered(false);
    setCorrectCount(0);
    setReviewMode(type === 'flashcard' ? 'flashcard' : 'quiz');
  };

  const currentWord = reviewWords[currentIndex];

  // Handle Spaced Repetition response
  const handleAnswerReview = async (correct: boolean) => {
    if (!currentWord || !user) return;

    setIsAnswered(true);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
    }

    // Update status and Spaced Repetition interval
    // If correct: progresses to 'mastered' or longer interval
    // If wrong: stays in 'review' for tomorrow
    const newStatus = correct ? 'mastered' : 'review';
    await fetch('/api/vocabulary/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        vocabularyId: currentWord.id,
        status: newStatus,
        isCorrect: correct,
      }),
    });
  };

  const handleNextReviewWord = () => {
    if (currentIndex < reviewWords.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setIsAnswered(false);
    } else {
      setReviewMode('result');
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <AppHeader />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-8 space-y-6 w-full min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30 mb-2">
                <RotateCcw size={14} />
                <span>Spaced Repetition System</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Ôn tập từ chưa thuộc
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Toàn bộ các từ cần củng cố hoặc đến hạn ôn tập trên tất cả các sách của bạn.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#181818] border border-neutral-800 text-white">
                Tổng cộng: <strong className="text-[#FF202F]">{reviewWords.length} từ</strong>
              </span>
            </div>
          </div>

          {/* SETUP SCREEN */}
          {reviewMode === 'setup' && (
            <div className="space-y-6">
              {/* Filter by Book */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs text-neutral-400 flex items-center gap-1 font-semibold flex-shrink-0">
                  <Filter size={14} /> Sách:
                </span>
                <button
                  type="button"
                  onClick={() => handleFilterBook('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedBookId === 'all'
                      ? 'bg-[#FF202F] text-white shadow'
                      : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  Tất cả các sách
                </button>
                {books.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleFilterBook(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedBookId === b.id
                        ? 'bg-[#FF202F] text-white shadow'
                        : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {b.short_name}
                  </button>
                ))}
              </div>

              {/* Loading or Empty state or Review Modes */}
              {loading ? (
                <div className="p-12 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-3">
                  <Loader2 size={32} className="animate-spin text-[#FF202F] mx-auto" />
                  <p className="text-xs text-neutral-400">Đang tải danh sách từ cần ôn tập...</p>
                </div>
              ) : reviewWords.length === 0 ? (
                <div className="p-12 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Tuyệt vời! Bạn không có từ nào cần ôn</h3>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Tất cả các từ vựng đều đang ở chu kỳ nhớ tốt. Hãy vào tab Learn của một Topic để học thêm từ mới nhé!
                  </p>
                  <Link
                    href="/vocab"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF202F] text-white text-xs font-bold shadow-lg shadow-[#FF202F]/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <span>Khám phá thêm sách</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-6 rounded-2xl bg-[#121212] border border-neutral-800 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#1a1415] text-[#FF202F] border border-[#FF202F]/30 flex items-center justify-center mb-3">
                        <Layers size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-white">Flashcard Review</h4>
                      <p className="text-xs text-neutral-400 mt-1">
                        Lật thẻ từ vựng với nghĩa, phiên âm và ví dụ câu.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startReviewSession('flashcard')}
                      className="w-full py-2.5 rounded-xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs font-bold transition-all shadow"
                    >
                      Bắt đầu Flashcard
                    </button>
                  </div>

                  <div className="p-6 rounded-2xl bg-[#121212] border border-neutral-800 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#1a1415] text-[#FF202F] border border-[#FF202F]/30 flex items-center justify-center mb-3">
                        <BookOpen size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-white">Điền từ khuyết</h4>
                      <p className="text-xs text-neutral-400 mt-1">
                        Luyện gõ từ chính xác theo ngữ cảnh câu mẫu.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startReviewSession('fill_blank')}
                      className="w-full py-2.5 rounded-xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs font-bold transition-all shadow"
                    >
                      Bắt đầu điền từ
                    </button>
                  </div>

                  <div className="p-6 rounded-2xl bg-[#121212] border border-neutral-800 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#1a1415] text-[#FF202F] border border-[#FF202F]/30 flex items-center justify-center mb-3">
                        <RotateCcw size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-white">Trắc nghiệm nghĩa</h4>
                      <p className="text-xs text-neutral-400 mt-1">
                        Chọn nghĩa tiếng Việt đúng cho từng từ vựng.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startReviewSession('meaning_quiz')}
                      className="w-full py-2.5 rounded-xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs font-bold transition-all shadow"
                    >
                      Bắt đầu trắc nghiệm
                    </button>
                  </div>

                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1a1112] to-[#121212] border border-[#FF202F]/40 flex flex-col justify-between space-y-4 shadow-xl">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#FF202F] text-white flex items-center justify-center mb-3 shadow-md shadow-[#FF202F]/30">
                        <Sparkles size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-white">Ôn tập kết hợp (Mixed)</h4>
                      <p className="text-xs text-neutral-400 mt-1">
                        Tự động kết hợp cả Flashcard, Điền từ và Trắc nghiệm.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startReviewSession('mixed')}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D91827] to-[#FF202F] hover:from-[#B81420] hover:to-[#E51322] text-white text-xs font-bold shadow-lg shadow-[#FF202F]/20 transition-all"
                    >
                      Bắt đầu ôn tất cả
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FLASHCARD REVIEW SESSION */}
          {reviewMode === 'flashcard' && currentWord && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={() => setReviewMode('setup')}
                  className="flex items-center gap-1 text-neutral-400 hover:text-white font-bold"
                >
                  <ChevronLeft size={16} /> Thoát phiên ôn
                </button>
                <span className="font-mono font-bold text-white">
                  {currentIndex + 1} / {reviewWords.length}
                </span>
              </div>

              <ProgressBar progress={((currentIndex + 1) / reviewWords.length) * 100} height="h-1.5" />

              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[320px] rounded-3xl bg-[#121212] border border-neutral-800 p-8 flex flex-col justify-between cursor-pointer shadow-2xl hover:border-[#FF202F]/50 transition-all space-y-4"
              >
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    {currentWord.part_of_speech || 'vocabulary'}
                  </span>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <AudioSpeedControl size="sm" />
                    <CopyButton text={currentWord.word} size="md" title="Sao chép từ vựng" />
                    <AudioButton word={currentWord.word} audioUrl={currentWord.audio_url} size="md" />
                  </div>
                </div>

                <div className="text-center my-auto space-y-2 select-text">
                  <h2 className="text-3xl font-black text-white">{currentWord.word}</h2>
                  {currentWord.ipa && (
                    <p className="text-sm font-mono text-[#FF202F]">{currentWord.ipa}</p>
                  )}
                  {isFlipped && (
                    <div className="pt-3 space-y-3 animate-fadeIn">
                      <p className="text-lg font-bold text-white px-4 py-2 rounded-xl bg-[#181818] inline-block border border-neutral-800">
                        {currentWord.meaning_vi}
                      </p>
                      {currentWord.example_1 && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="p-3 rounded-xl bg-[#181818] border border-neutral-800 text-left text-xs space-y-1 max-w-md mx-auto select-text"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400">
                            <span>Ví dụ ngữ cảnh:</span>
                            <div className="flex items-center gap-1.5">
                              <CopyButton text={currentWord.example_1} size="sm" title="Sao chép câu ví dụ" />
                              <AudioButton
                                word={currentWord.example_1}
                                size="sm"
                                title="Nghe câu ví dụ bằng Google Studio AI"
                              />
                            </div>
                          </div>
                          <p className="text-neutral-100 font-medium">{currentWord.example_1}</p>
                          {currentWord.example_1_vi && (
                            <p className="text-neutral-400 italic text-[11px]">→ {currentWord.example_1_vi}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-neutral-400 text-center select-none">
                  Bấm để {isFlipped ? 'ẩn' : 'hiện'} nghĩa Tiếng Việt
                </p>
              </div>

              {/* SR response buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    handleAnswerReview(false);
                    handleNextReviewWord();
                  }}
                  className="py-3 rounded-2xl bg-[#1c1415] hover:bg-[#25181a] border border-[#FF202F]/40 text-[#FF202F] text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  <span>Chưa thuộc (Ôn ngày mai)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAnswerReview(true);
                    handleNextReviewWord();
                  }}
                  className="py-3 rounded-2xl bg-[#111c14] hover:bg-[#14261b] border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>Đã nhớ (Giãn cách chu kỳ)</span>
                </button>
              </div>
            </div>
          )}

          {/* QUIZ REVIEW SESSION */}
          {reviewMode === 'quiz' && currentWord && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={() => setReviewMode('setup')}
                  className="flex items-center gap-1 text-neutral-400 hover:text-white font-bold"
                >
                  <ChevronLeft size={16} /> Thoát
                </button>
                <span className="font-mono font-bold text-white">
                  {currentIndex + 1} / {reviewWords.length}
                </span>
              </div>

              <ProgressBar progress={((currentIndex + 1) / reviewWords.length) * 100} height="h-1.5" />

              <div className="rounded-3xl bg-[#121212] border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    Spaced Repetition Quiz
                  </span>
                  <AudioButton word={currentWord.word} audioUrl={currentWord.audio_url} size="sm" />
                </div>

                <div className="text-center py-2 space-y-1">
                  <h3 className="text-3xl font-black text-white">{currentWord.word}</h3>
                  {currentWord.ipa && (
                    <p className="text-xs text-[#FF202F] font-mono">{currentWord.ipa}</p>
                  )}
                  <p className="text-xs text-neutral-400 pt-2">
                    Chọn nghĩa tiếng Việt chính xác của từ vựng này:
                  </p>
                </div>

                {/* 4 Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {[
                    currentWord.meaning_vi,
                    'thay đổi bất ngờ',
                    'tiếp tục cố gắng',
                    'đưa ra lời khuyên',
                  ]
                    .sort(() => Math.random() - 0.5)
                    .map((opt, idx) => {
                      const isTarget = opt === currentWord.meaning_vi;
                      let style = 'bg-[#181818] text-white border-neutral-800 hover:border-neutral-700';

                      if (isAnswered) {
                        if (isTarget) style = 'bg-emerald-500/20 text-emerald-400 border-emerald-500 font-bold';
                        else style = 'bg-[#141414] text-neutral-500 border-neutral-850';
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isAnswered}
                          onClick={() => handleAnswerReview(isTarget)}
                          className={`p-3.5 rounded-2xl border text-left text-xs transition-all ${style}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                </div>

                {isAnswered && (
                  <div className="pt-2 animate-fadeIn">
                    <button
                      type="button"
                      onClick={handleNextReviewWord}
                      className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>{currentIndex < reviewWords.length - 1 ? 'Tiếp tục' : 'Xem kết quả'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RESULT SCREEN */}
          {reviewMode === 'result' && (
            <div className="max-w-md mx-auto py-10 px-6 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white">Hoàn thành phiên ôn tập!</h3>
                <p className="text-xs text-neutral-400">
                  Bạn đã củng cố trí nhớ cho {reviewWords.length} từ vựng.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 flex justify-between items-center text-xs">
                <span className="text-neutral-400">Số từ đã nhớ tốt:</span>
                <strong className="text-emerald-400 text-base">{correctCount} / {reviewWords.length}</strong>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReviewMode('setup');
                  fetchReviewWords(selectedBookId);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white text-xs font-bold shadow-lg shadow-[#FF202F]/20"
              >
                Về danh sách ôn tập
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
