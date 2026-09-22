'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { AudioButton } from '@/components/AudioButton';
import { CopyButton } from '@/components/CopyButton';
import { ProgressBar } from '@/components/ProgressBar';
import {
  RotateCcw,
  BookOpen,
  Filter,
  CheckCircle2,
  ArrowRight,
  Layers,
  Sparkles,
  ChevronLeft,
  Loader2,
  Award,
  Search,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Vocabulary, Book } from '@/types';
import { saveLocalWordProgress } from '@/lib/progressStorage';
import { useAuth } from '@/context/AuthContext';

export default function ReviewPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'review' | 'mastered'>('review');
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Danh sách từ
  const [reviewWords, setReviewWords] = useState<Vocabulary[]>([]);
  const [masteredWords, setMasteredWords] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);

  // Review session mode: setup | flashcard | quiz | result
  const [reviewMode, setReviewMode] = useState<'setup' | 'flashcard' | 'quiz' | 'result'>('setup');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Tải danh mục sách
  useEffect(() => {
    fetch('/api/books')
      .then((r) => r.json())
      .then((d) => {
        if (d.books) setBooks(d.books);
      })
      .catch(console.error);
  }, []);

  // Tải dữ liệu từ vựng (cả 2 nhóm để hiển thị số lượng badge đầy đủ)
  const fetchWords = useCallback((bookId?: number | 'all') => {
    setLoading(true);
    let reviewUrl = `/api/review?status=review&userId=${user?.id || ''}`;
    let masteredUrl = `/api/review?status=mastered&userId=${user?.id || ''}`;

    if (bookId && bookId !== 'all') {
      reviewUrl += `&bookId=${bookId}`;
      masteredUrl += `&bookId=${bookId}`;
    }

    Promise.all([
      fetch(reviewUrl).then((r) => r.json()),
      fetch(masteredUrl).then((r) => r.json()),
    ])
      .then(([revData, masData]) => {
        if (revData.words) setReviewWords(revData.words);
        if (masData.words) setMasteredWords(masData.words);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    fetchWords(selectedBookId);
  }, [selectedBookId, fetchWords]);

  const handleFilterBook = (bookId: number | 'all') => {
    setSelectedBookId(bookId);
  };

  const startReviewSession = (type: 'flashcard' | 'fill_blank' | 'meaning_quiz' | 'mixed') => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsAnswered(false);
    setCorrectCount(0);
    setReviewMode(type === 'flashcard' ? 'flashcard' : 'quiz');
  };

  const currentWord = reviewWords[currentIndex];

  // Xử lý câu trả lời trong session ôn tập
  const handleAnswerReview = async (correct: boolean) => {
    if (!currentWord) return;

    setIsAnswered(true);
    if (correct) {
      setCorrectCount((prev) => prev + 1);
    }

    const newStatus = correct ? 'mastered' : 'review';
    saveLocalWordProgress(user?.id || 'personal', currentWord.id, newStatus);

    try {
      await fetch('/api/vocabulary/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyId: currentWord.id,
          status: newStatus,
          isCorrect: correct,
          userId: user?.id,
        }),
      });

      // Nếu thuộc từ: cập nhật local state ngay lập tức
      if (correct) {
        setReviewWords((prev) => prev.filter((w) => w.id !== currentWord.id));
        setMasteredWords((prev) => [{ ...currentWord, status: 'mastered' }, ...prev]);
      }
    } catch (err) {
      console.error('Error saving review answer:', err);
    }
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

  // Đổi từ ĐÃ THUỘC -> CẦN ÔN LẠI (khi quên từ)
  const handleMoveToReview = async (vocab: Vocabulary) => {
    saveLocalWordProgress(user?.id || 'personal', vocab.id, 'review');
    try {
      await fetch('/api/vocabulary/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyId: vocab.id,
          status: 'review',
          userId: user?.id,
        }),
      });

      setMasteredWords((prev) => prev.filter((w) => w.id !== vocab.id));
      setReviewWords((prev) => [{ ...vocab, status: 'review' }, ...prev]);
      setActionMessage(`Đã chuyển từ "${vocab.word}" sang danh sách Cần ôn lại.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e) {
      console.error('Error moving to review:', e);
    }
  };

  // Đổi từ CẦN ÔN LẠI -> ĐÃ THUỘC
  const handleMarkAsMastered = async (vocab: Vocabulary) => {
    saveLocalWordProgress(user?.id || 'personal', vocab.id, 'mastered');
    try {
      await fetch('/api/vocabulary/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyId: vocab.id,
          status: 'mastered',
          isCorrect: true,
          userId: user?.id,
        }),
      });

      setReviewWords((prev) => prev.filter((w) => w.id !== vocab.id));
      setMasteredWords((prev) => [{ ...vocab, status: 'mastered' }, ...prev]);
      setActionMessage(`🎉 Chúc mừng! Đã chuyển từ "${vocab.word}" sang Đã thuộc.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e) {
      console.error('Error marking mastered:', e);
    }
  };

  // Lọc từ theo tìm kiếm
  const filteredMasteredWords = masteredWords.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      w.word.toLowerCase().includes(q) ||
      w.meaning_vi.toLowerCase().includes(q) ||
      (w.meaning_en && w.meaning_en.toLowerCase().includes(q))
    );
  });

  const filteredReviewWords = reviewWords.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      w.word.toLowerCase().includes(q) ||
      w.meaning_vi.toLowerCase().includes(q) ||
      (w.meaning_en && w.meaning_en.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <AppHeader />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-8 space-y-6 w-full min-w-0">
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30 mb-2">
                <RotateCcw size={14} />
                <span>Quản lý & Ôn tập từ vựng</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Xem lại từ vựng
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Quản lý toàn bộ các từ đã thuộc và các từ cần ôn tập theo lộ trình Spaced Repetition của bạn.
              </p>
            </div>

            {/* Notification Toast */}
            {actionMessage && (
              <div className="px-4 py-2 rounded-xl bg-[#1e1516] border border-[#FF202F]/50 text-white text-xs font-bold animate-pulse shadow-lg">
                {actionMessage}
              </div>
            )}
          </div>

          {/* Tab Switcher: "Cần ôn tập" vs "Đã thuộc" */}
          <div className="flex items-center gap-2 p-1.5 bg-[#121212] rounded-2xl border border-neutral-800 w-full sm:w-fit">
            <button
              type="button"
              onClick={() => {
                setActiveTab('review');
                setReviewMode('setup');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'review'
                  ? 'bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white shadow-lg shadow-[#FF202F]/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <RotateCcw size={14} />
              <span>Cần ôn lại</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'review' ? 'bg-black/30 text-white' : 'bg-neutral-800 text-amber-400'
              }`}>
                {reviewWords.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('mastered');
                setReviewMode('setup');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'mastered'
                  ? 'bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white shadow-lg shadow-[#FF202F]/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Award size={14} />
              <span>Đã thuộc</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'mastered' ? 'bg-black/30 text-white' : 'bg-neutral-800 text-emerald-400'
              }`}>
                {masteredWords.length}
              </span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: TỪ CẦN ÔN LẠI                                     */}
          {/* ======================================================== */}
          {activeTab === 'review' && (
            <>
              {reviewMode === 'setup' && (
                <div className="space-y-6">
                  {/* Filter by Book & Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
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

                    {/* Search bar */}
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="Tìm từ cần ôn..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-[#121212] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF202F]"
                      />
                    </div>
                  </div>

                  {/* Empty or Review Modes */}
                  {loading ? (
                    <div className="p-12 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-3">
                      <Loader2 size={32} className="animate-spin text-[#FF202F] mx-auto" />
                      <p className="text-xs text-neutral-400">Đang tải danh sách từ cần ôn tập từ Supabase...</p>
                    </div>
                  ) : reviewWords.length === 0 ? (
                    <div className="p-12 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-4 shadow-xl">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                        <CheckCircle2 size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-white">Tuyệt vời! Bạn không có từ nào cần ôn</h3>
                      <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                        Tất cả các từ vựng đều đang ở chu kỳ nhớ tốt. Bạn có thể xem lại các từ đã thuộc ở tab bên cạnh hoặc học thêm từ mới!
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
                    <>
                      {/* Review Mode Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-6 rounded-2xl bg-[#121212] border border-neutral-800 flex flex-col justify-between space-y-4 hover:border-[#FF202F]/40 transition-all">
                          <div>
                            <div className="w-10 h-10 rounded-xl bg-[#1a1415] text-[#FF202F] border border-[#FF202F]/30 flex items-center justify-center mb-3">
                              <Layers size={20} />
                            </div>
                            <h4 className="text-sm font-bold text-white">Flashcard Review</h4>
                            <p className="text-xs text-neutral-400 mt-1">
                              Lật thẻ từ vựng với nghĩa, phiên âm và ví dụ câu theo chu kỳ lặp lại.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => startReviewSession('flashcard')}
                            className="w-full py-2.5 rounded-xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs font-bold transition-all shadow"
                          >
                            Bắt đầu Flashcard ({reviewWords.length} từ)
                          </button>
                        </div>

                        <div className="p-6 rounded-2xl bg-[#121212] border border-neutral-800 flex flex-col justify-between space-y-4 hover:border-[#FF202F]/40 transition-all">
                          <div>
                            <div className="w-10 h-10 rounded-xl bg-[#1a1415] text-[#FF202F] border border-[#FF202F]/30 flex items-center justify-center mb-3">
                              <BookOpen size={20} />
                            </div>
                            <h4 className="text-sm font-bold text-white">Luyện tập trắc nghiệm</h4>
                            <p className="text-xs text-neutral-400 mt-1">
                              Chọn nghĩa đúng của từ trong câu ví dụ thực tế.
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

                        <div className="p-6 rounded-2xl bg-[#121212] border border-neutral-800 flex flex-col justify-between space-y-4 hover:border-[#FF202F]/40 transition-all">
                          <div>
                            <div className="w-10 h-10 rounded-xl bg-[#1a1415] text-[#FF202F] border border-[#FF202F]/30 flex items-center justify-center mb-3">
                              <RotateCcw size={20} />
                            </div>
                            <h4 className="text-sm font-bold text-white">Ôn tập hỗn hợp</h4>
                            <p className="text-xs text-neutral-400 mt-1">
                              Kết hợp Flashcard và câu hỏi kiểm tra ngẫu nhiên.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => startReviewSession('mixed')}
                            className="w-full py-2.5 rounded-xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs font-bold transition-all shadow"
                          >
                            Bắt đầu ôn hỗn hợp
                          </button>
                        </div>
                      </div>

                      {/* Danh sách từ cần ôn dạng thẻ tiện lợi */}
                      <div className="space-y-3 pt-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-white">
                            Danh sách các từ cần củng cố ({filteredReviewWords.length} từ)
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {filteredReviewWords.map((vocab) => (
                            <div
                              key={vocab.id}
                              className="p-4 rounded-2xl bg-[#121212] border border-neutral-800 hover:border-neutral-700 flex items-start justify-between gap-3 transition-all"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-extrabold text-white truncate">
                                    {vocab.word}
                                  </span>
                                  {vocab.ipa && (
                                    <span className="text-xs text-neutral-400 font-mono">
                                      /{vocab.ipa}/
                                    </span>
                                  )}
                                  <AudioButton word={vocab.word} audioUrl={vocab.audio_url} size="sm" />
                                </div>
                                <p className="text-xs text-emerald-400 font-medium">
                                  {vocab.meaning_vi}
                                </p>
                                {vocab.example_1 && (
                                  <p className="text-[11px] text-neutral-400 italic line-clamp-1">
                                    "{vocab.example_1}"
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleMarkAsMastered(vocab)}
                                title="Đánh dấu đã thuộc từ này"
                                className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <Check size={12} />
                                <span>Đã thuộc</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* FLASHCARD MODE */}
              {reviewMode === 'flashcard' && currentWord && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Progress Header */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setReviewMode('setup')}
                      className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white"
                    >
                      <ChevronLeft size={16} /> Quay lại danh sách
                    </button>
                    <span className="text-xs font-bold text-[#FF202F]">
                      Từ {currentIndex + 1} / {reviewWords.length}
                    </span>
                  </div>

                  <ProgressBar progress={Math.round(((currentIndex + 1) / reviewWords.length) * 100)} height="h-2" />

                  {/* Interactive Card */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="min-h-[300px] sm:min-h-[320px] rounded-3xl bg-[#121212] border border-neutral-800 p-5 sm:p-8 flex flex-col justify-between cursor-pointer hover:border-neutral-700 transition-all shadow-2xl relative select-none"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {isFlipped ? 'Mặt sau (Nghĩa)' : 'Mặt trước (Từ vựng)'}
                      </span>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <AudioButton word={currentWord.word} audioUrl={currentWord.audio_url} />
                        <CopyButton text={currentWord.word} />
                      </div>
                    </div>

                    <div className="text-center py-6 space-y-3">
                      {!isFlipped ? (
                        <>
                          <h2 className="text-3xl sm:text-4xl font-black text-white break-words">{currentWord.word}</h2>
                          {currentWord.ipa && (
                            <p className="text-base text-neutral-400 font-mono">/{currentWord.ipa}/</p>
                          )}
                          <p className="text-xs text-neutral-500 pt-2">Chạm hoặc click để lật xem nghĩa</p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-2xl font-black text-emerald-400">{currentWord.meaning_vi}</h3>
                          {currentWord.example_1 && (
                            <div className="pt-3 max-w-md mx-auto space-y-1 text-left bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
                              <p className="text-xs text-white">"{currentWord.example_1}"</p>
                              {currentWord.example_1_vi && (
                                <p className="text-[11px] text-neutral-400">"{currentWord.example_1_vi}"</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <p className="text-[11px] text-center text-neutral-500">
                      {isAnswered ? 'Đã lưu phản hồi. Bấm Tiếp tục bên dưới.' : 'Chạm vào thẻ để lật xem mặt sau'}
                    </p>
                  </div>

                  {/* Actions */}
                  {!isAnswered ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => handleAnswerReview(false)}
                        className="min-h-[46px] py-3 rounded-2xl bg-[#1a1415] border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-bold text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={16} />
                        <span>Chưa thuộc (Ôn lại tiếp)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAnswerReview(true)}
                        className="min-h-[46px] py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} />
                        <span>Đã thuộc từ này</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextReviewWord}
                      className="w-full min-h-[46px] py-3.5 rounded-2xl bg-[#FF202F] hover:bg-[#D91827] text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>Từ tiếp theo</span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              )}

              {/* RESULT SCREEN */}
              {reviewMode === 'result' && (
                <div className="max-w-md mx-auto p-8 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-6 shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <Sparkles size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Hoàn thành phiên ôn tập!</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Tiến độ của bạn đã được cập nhật an toàn lên Supabase Cloud.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 flex justify-around">
                    <div>
                      <p className="text-2xl font-black text-emerald-400">{correctCount}</p>
                      <p className="text-[11px] text-neutral-400">Đã thuộc</p>
                    </div>
                    <div className="border-r border-neutral-800" />
                    <div>
                      <p className="text-2xl font-black text-amber-400">{reviewWords.length - correctCount}</p>
                      <p className="text-[11px] text-neutral-400">Cần ôn tiếp</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setReviewMode('setup');
                      fetchWords(selectedBookId);
                    }}
                    className="w-full py-3 rounded-xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs font-bold transition-all shadow"
                  >
                    Về màn hình chính
                  </button>
                </div>
              )}
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 2: XEM LẠI TỪ ĐÃ THUỘC                                */}
          {/* ======================================================== */}
          {activeTab === 'mastered' && (
            <div className="space-y-6">
              {/* Filter by Book & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
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

                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Tìm trong từ đã thuộc..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#121212] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF202F]"
                  />
                </div>
              </div>

              {/* Mastered Words Grid */}
              {loading ? (
                <div className="p-12 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-3">
                  <Loader2 size={32} className="animate-spin text-[#FF202F] mx-auto" />
                  <p className="text-xs text-neutral-400">Đang tải danh sách từ đã thuộc từ Supabase...</p>
                </div>
              ) : filteredMasteredWords.length === 0 ? (
                <div className="p-12 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-3">
                  <p className="text-sm font-semibold text-white">Chưa có từ nào phù hợp</p>
                  <p className="text-xs text-neutral-400">
                    {searchQuery ? 'Thử tìm với từ khóa khác.' : 'Hãy học bài và nhấn "ĐÃ THUỘC" để lưu từ vào đây nhé!'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMasteredWords.map((vocab) => (
                    <div
                      key={vocab.id}
                      className="p-4 rounded-2xl bg-[#121212] border border-neutral-800 hover:border-neutral-700 flex flex-col justify-between space-y-3 transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-white">
                              {vocab.word}
                            </span>
                            <AudioButton word={vocab.word} audioUrl={vocab.audio_url} size="sm" />
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                            Đã thuộc
                          </span>
                        </div>

                        {vocab.ipa && (
                          <p className="text-xs text-neutral-400 font-mono">/{vocab.ipa}/</p>
                        )}

                        <p className="text-xs text-emerald-400 font-medium">
                          {vocab.meaning_vi}
                        </p>

                        {vocab.example_1 && (
                          <p className="text-[11px] text-neutral-400 italic line-clamp-2 pt-1 border-t border-neutral-850">
                            "{vocab.example_1}"
                          </p>
                        )}
                      </div>

                      {/* Action to move back to Review if user forgot */}
                      <div className="pt-2 border-t border-neutral-850 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500">
                          {vocab.correct_count ? `Đúng ${vocab.correct_count} lần` : 'Đã nắm vững'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMoveToReview(vocab)}
                          title="Nếu quên từ này, chuyển lại sang Cần ôn"
                          className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-amber-500/20 text-neutral-400 hover:text-amber-400 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <RefreshCw size={11} />
                          <span>Cần ôn lại</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
