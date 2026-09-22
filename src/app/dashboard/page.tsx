'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { ProgressBar } from '@/components/ProgressBar';
import {
  useBooks,
  useUserStats,
  useContinueLearning,
  useChineseStats,
} from '@/lib/hooks/useLearningData';
import {
  BookOpen,
  Headphones,
  ArrowRight,
  Flame,
  Award,
  Play,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { getLocalProgressCounts } from '@/lib/progressStorage';

export default function DashboardPage() {
  const { user } = useAuth();
  const { isChinese } = useLanguage();

  // SWR Caching Hooks - Tải trực tiếp từ Supabase qua Server API
  const { books, isLoading: booksLoading } = useBooks();
  const { stats: userStats } = useUserStats();
  const { continueData } = useContinueLearning();
  const { chineseStats, isLoading: zhLoading } = useChineseStats();

  const [reviewCount, setReviewCount] = useState<number>(0);
  const [localCounts, setLocalCounts] = useState({ mastered: 0, total: 0 });

  useEffect(() => {
    setLocalCounts(getLocalProgressCounts(user?.id || 'personal'));
  }, [user?.id]);

  const displayMastered = Math.max(userStats?.total_words_mastered || 0, localCounts.mastered);
  const displayLearned = Math.max(userStats?.total_words_learned || 0, localCounts.total);

  // Fetch review words count in background
  useEffect(() => {
    const reviewUrl = isChinese
      ? `/api/chinese/review?userId=${user?.id || ''}`
      : `/api/review?status=review&userId=${user?.id || ''}`;

    fetch(reviewUrl)
      .then((r) => r.json())
      .then((res) => {
        if (res.words) setReviewCount(res.words.length);
      })
      .catch(() => {});
  }, [isChinese, user?.id]);

  const loading = isChinese ? zhLoading && !chineseStats : booksLoading && books.length === 0;

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <AppHeader streakDays={userStats?.current_streak || 1} />

      <div className="flex-1 flex">
        {/* Compact sidebar for Dashboard */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-8 space-y-6 sm:space-y-8 w-full min-w-0">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#FF202F] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-400">Đang tải dữ liệu học tập...</p>
            </div>
          ) : isChinese ? (
            /* =================================================== */
            /* CHINESE DASHBOARD (HSK 1 - 6)                       */
            /* =================================================== */
            <>
              {/* Welcome Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#141414] via-[#121212] to-[#181112] p-6 sm:p-8 rounded-3xl border border-neutral-800 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#FF202F]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF202F]/10 text-[#FF202F] text-xs font-bold border border-[#FF202F]/20">
                    <Flame size={14} className="fill-[#FF202F]" />
                    <span>Lộ trình chuẩn HSK 1 - HSK 6 (4.896 từ)</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">
                    Xin chào, {user?.full_name || 'Bạn'} 👋
                  </h1>
                  <p className="text-sm text-neutral-400">
                    Hôm nay bạn muốn học gì? Tiếp tục nâng tầm vốn từ vựng tiếng Trung cùng LearnVocab!
                  </p>
                </div>

                {/* Quick action: Review today banner if words need review */}
                {reviewCount > 0 && (
                  <div className="relative z-10 flex-shrink-0 bg-[#1e1516] border border-[#FF202F]/30 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FF202F] text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-[#FF202F]/30">
                      {reviewCount}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Ôn tập hôm nay</p>
                      <p className="text-[11px] text-neutral-400">Có {reviewCount} từ cần củng cố</p>
                    </div>
                    <Link
                      href="/zh/review"
                      className="px-3.5 py-1.5 rounded-xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs font-bold transition-all"
                    >
                      Bắt đầu ôn
                    </Link>
                  </div>
                )}
              </div>

              {/* 4 Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400 font-medium">Tổng từ vựng HSK</span>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-2xl sm:text-3xl font-black text-white">
                      {chineseStats?.total_words || 4896}
                    </span>
                    <span className="text-xs font-bold text-neutral-500">từ</span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                    <Award size={14} className="text-yellow-500" />
                    Đã nắm vững
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {chineseStats?.words_mastered || 0}
                    </span>
                    <span className="text-xs font-bold text-emerald-500/80">từ</span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                    <BookOpen size={14} className="text-[#FF202F]" />
                    Đang học
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-2xl sm:text-3xl font-black text-[#FF202F]">
                      {chineseStats?.words_learning || 0}
                    </span>
                    <span className="text-xs font-bold text-[#FF202F]/80">từ</span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                    <RotateCcw size={14} className="text-amber-500" />
                    Cần xem lại
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-2xl sm:text-3xl font-black text-amber-400">
                      {chineseStats?.review_later || 0}
                    </span>
                    <span className="text-xs font-bold text-amber-500/80">từ</span>
                  </div>
                </div>
              </div>

              {/* HSK 1 - 6 Level Progress Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">6 Cấp độ Tiếng Trung HSK</h3>
                    <p className="text-xs text-neutral-400">Chọn cấp độ để bắt đầu học theo chủ đề</p>
                  </div>
                  <Link href="/zh/vocab" className="text-xs font-bold text-[#FF202F] hover:underline">
                    Xem tất cả cấp độ →
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(chineseStats?.levels || []).map((lvl) => {
                    const stageLabel =
                      lvl.level <= 2 ? 'Sơ cấp' : lvl.level <= 4 ? 'Trung cấp' : 'Cao cấp';

                    return (
                      <Link
                        key={lvl.level}
                        href={`/zh/hsk/${lvl.level}`}
                        className="group block rounded-2xl bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#FF202F]/15 border border-[#FF202F]/30 text-[#FF202F] font-mono">
                              {lvl.name}
                            </span>
                            <span className="text-xs text-neutral-400">{stageLabel}</span>
                          </div>
                          <span className="text-xs font-extrabold text-[#FF202F]">
                            {lvl.progress_percentage}%
                          </span>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-neutral-400 mb-1.5">
                            <span>Đã thuộc:</span>
                            <strong className="text-white">
                              {lvl.mastered_words} / {lvl.total_words} từ
                            </strong>
                          </div>
                          <ProgressBar progress={lvl.progress_percentage} height="h-2" />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-neutral-850 text-xs text-neutral-400">
                          <span>{lvl.topics_count} chủ đề</span>
                          <span className="text-white group-hover:text-[#FF202F] transition-colors flex items-center gap-1 font-semibold">
                            Học ngay <ArrowRight size={12} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* =================================================== */
            /* ENGLISH DASHBOARD (Vocabulary in Use)               */
            /* =================================================== */
            <>
              {/* Welcome Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#141414] via-[#121212] to-[#181112] p-6 sm:p-8 rounded-3xl border border-neutral-800 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#FF202F]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF202F]/10 text-[#FF202F] text-xs font-bold border border-[#FF202F]/20">
                    <Flame size={14} className="fill-[#FF202F]" />
                    <span>Chuỗi học tập: {userStats?.current_streak || 1} ngày liên tiếp</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">
                    Xin chào, {user?.full_name || 'Bạn'} 👋
                  </h1>
                  <p className="text-sm text-neutral-400">
                    Hôm nay bạn muốn học gì? Tiếp tục nâng cao vốn từ vựng cùng LearnVocab!
                  </p>
                </div>

                {/* Continue Learning Resume Banner (Fast Action) */}
                {continueData && (
                  <div className="relative z-10 flex-shrink-0 bg-[#1e1516] border border-[#FF202F]/30 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FF202F] text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-[#FF202F]/30">
                      <Play size={18} className="fill-white ml-0.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white line-clamp-1">{continueData.topicName}</p>
                      <p className="text-[11px] text-neutral-400">
                        {continueData.bookShortName} • {continueData.progressPercent}%
                      </p>
                    </div>
                    <Link
                      href={continueData.resumeUrl}
                      className="px-3.5 py-1.5 rounded-xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs font-bold transition-all whitespace-nowrap"
                    >
                      Tiếp tục học
                    </Link>
                  </div>
                )}
              </div>

              {/* Overall Progress Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                    <Award size={14} className="text-yellow-500" />
                    Từ vựng đã thuộc
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-2xl sm:text-3xl font-black text-white">
                      {displayMastered}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">từ</span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                    <BookOpen size={14} className="text-[#FF202F]" />
                    Từ đang học
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-2xl sm:text-3xl font-black text-white">
                      {displayLearned}
                    </span>
                    <span className="text-xs font-bold text-[#FF202F]">từ</span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Chủ đề hoàn thành
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-2xl sm:text-3xl font-black text-white">
                      {userStats?.total_topics_completed || 0}
                    </span>
                    <span className="text-xs font-bold text-neutral-400">topics</span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                    <Flame size={14} className="text-[#FF202F]" />
                    Chuỗi học tập
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-2xl sm:text-3xl font-black text-[#FF202F]">
                      {userStats?.current_streak || 1}
                    </span>
                    <span className="text-xs font-bold text-[#FF202F]/80">ngày</span>
                  </div>
                </div>
              </div>

              {/* 2 Big Interactive Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1: Vocab */}
                <Link
                  href="/vocab"
                  className="group relative rounded-3xl p-7 bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/60 transition-all duration-300 hover:shadow-2xl hover:shadow-[#FF202F]/15 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FF202F]/15 text-[#FF202F] flex items-center justify-center border border-[#FF202F]/30 group-hover:scale-110 transition-transform">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white group-hover:text-[#FF202F] transition-colors">
                        Vocabulary in Use
                      </h2>
                      <p className="text-xs text-neutral-400 mt-1">
                        4 cấp độ Cambridge chuẩn hóa, cấu trúc bài bản theo từng Topic thực tế (A1-A2 đến C1-C2).
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-850 flex items-center justify-between mt-6">
                    <span className="text-xs font-bold text-white group-hover:text-[#FF202F] transition-colors flex items-center gap-1.5">
                      Vào học ngay
                      <ArrowRight size={14} />
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {userStats?.total_topics_completed || 0} topics đã hoàn thành
                    </span>
                  </div>
                </Link>

                {/* Card 2: Reading & Listening BBC Bot */}
                <Link
                  href="/reading-listening"
                  className="group relative rounded-3xl p-7 bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/60 transition-all duration-300 hover:shadow-2xl hover:shadow-[#FF202F]/15 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FF202F]/15 text-[#FF202F] flex items-center justify-center border border-[#FF202F]/30 group-hover:scale-110 transition-transform">
                      <Headphones size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-black text-white group-hover:text-[#FF202F] transition-colors">
                          Reading &amp; Listening
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF202F]/20 text-[#FF202F] border border-[#FF202F]/40 animate-pulse">
                          BBC AI Bot
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        Cập nhật bài báo thế giới uy tín từ BBC mỗi ngày, dịch sát nghĩa song ngữ, highlight từ vựng hay và đọc bằng Google Studio AI.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-850 flex items-center justify-between mt-6">
                    <span className="text-xs font-bold text-white group-hover:text-[#FF202F] transition-colors flex items-center gap-1.5">
                      Đọc báo &amp; Luyện nghe hôm nay
                      <ArrowRight size={14} />
                    </span>
                    <span className="text-[11px] font-mono text-[#FF202F] font-bold">Mới mỗi ngày</span>
                  </div>
                </Link>
              </div>

              {/* 4 Books Progress Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Tiến độ 4 bộ sách Vocabulary in Use</h3>
                    <p className="text-xs text-neutral-400">Dữ liệu thực tế theo tài khoản của bạn</p>
                  </div>
                  <Link href="/vocab" className="text-xs font-bold text-[#FF202F] hover:underline">
                    Xem chi tiết sách →
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {books.map((book) => (
                    <div
                      key={book.id}
                      className="group block rounded-2xl bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <Link href={`/books/${book.id}`} className="block relative w-full h-36 bg-neutral-900 overflow-hidden border-b border-neutral-800/80">
                          {book.cover_image ? (
                            <Image
                              src={book.cover_image}
                              alt={book.short_name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-700">
                              <BookOpen size={32} />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-bold text-[#FF202F] border border-neutral-700">
                            {book.progress_percentage || 0}%
                          </div>
                        </Link>

                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                              {book.level}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white group-hover:text-[#FF202F] transition-colors line-clamp-1">
                            {book.short_name}
                          </h4>

                          <p className="text-xs text-neutral-400">
                            {book.completed_topics || 0} / {book.total_topics || 0} topics
                          </p>

                          <ProgressBar progress={book.progress_percentage || 0} height="h-1.5" />
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <Link
                          href={`/books/${book.id}`}
                          className="w-full py-2 rounded-xl bg-neutral-800/80 hover:bg-[#FF202F] text-neutral-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <span>Học sách này</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
