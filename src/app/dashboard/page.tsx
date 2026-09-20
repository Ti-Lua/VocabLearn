'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { ProgressBar } from '@/components/ProgressBar';
import {
  BookOpen,
  Headphones,
  Clock,
  ArrowRight,
  Flame,
  Award,
  RotateCcw,
} from 'lucide-react';
import { Book, UserStatistics, ChineseDashboardStats } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isChinese } = useLanguage();

  // English state
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);

  // Chinese state
  const [chineseStats, setChineseStats] = useState<ChineseDashboardStats | null>(null);

  const [loading, setLoading] = useState(true);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login?redirect=/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    if (isChinese) {
      // Fetch Chinese dashboard data
      Promise.all([
        fetch(`/api/chinese/stats?userId=${user.id}`).then((r) => r.json()),
        fetch(`/api/chinese/review?userId=${user.id}`).then((r) => r.json()),
      ])
        .then(([statsRes, reviewRes]) => {
          if (statsRes.stats) setChineseStats(statsRes.stats);
          if (reviewRes.words) setReviewCount(reviewRes.words.length);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      // Fetch English dashboard data
      Promise.all([
        fetch(`/api/books?userId=${user.id}`).then((r) => r.json()),
        fetch(`/api/statistics?userId=${user.id}`).then((r) => r.json()),
        fetch(`/api/review?userId=${user.id}`).then((r) => r.json()),
      ])
        .then(([booksRes, statsRes, reviewRes]) => {
          if (booksRes.books) setBooks(booksRes.books);
          if (statsRes.statistics) setStats(statsRes.statistics);
          if (reviewRes.words) setReviewCount(reviewRes.words.length);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, isChinese]);

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <AppHeader streakDays={stats?.studyStreakDays || 1} />

      <div className="flex-1 flex">
        {/* Compact sidebar for Dashboard */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-8 space-y-6 sm:space-y-8 w-full min-w-0">
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
                    <BookOpen size={20} className="text-white" />
                    <p className="text-2xl sm:text-3xl font-black text-white">
                      {(chineseStats?.total_words || 4896).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400 font-medium">Đã thuộc (Mastered)</span>
                  <div className="flex items-center gap-2 pt-1">
                    <Award size={20} className="text-emerald-400" />
                    <p className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {chineseStats?.words_mastered || 0}
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400 font-medium">Đang học (Learning)</span>
                  <div className="flex items-center gap-2 pt-1">
                    <Clock size={20} className="text-amber-400" />
                    <p className="text-2xl sm:text-3xl font-black text-amber-400">
                      {chineseStats?.words_learning || 0}
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-1">
                  <span className="text-xs text-neutral-400 font-medium">Cần ôn lại (Review Later)</span>
                  <div className="flex items-center gap-2 pt-1">
                    <RotateCcw size={20} className="text-[#FF202F]" />
                    <p className="text-2xl sm:text-3xl font-black text-[#FF202F]">
                      {chineseStats?.review_later || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2 Big Interactive Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1: HSK Vocab */}
                <Link
                  href="/zh/vocab"
                  className="group relative rounded-3xl p-7 bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/60 transition-all duration-300 hover:shadow-2xl hover:shadow-[#FF202F]/15 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FF202F]/15 text-[#FF202F] flex items-center justify-center border border-[#FF202F]/30 group-hover:scale-110 transition-transform">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white group-hover:text-[#FF202F] transition-colors">
                        Vocab HSK 1 - HSK 6
                      </h2>
                      <p className="text-xs text-neutral-400 mt-1">
                        Học theo 6 cấp độ HSK chuẩn hóa, chia nhỏ theo 31 chủ đề thực tiễn (Gia đình, Ăn uống, Công việc...).
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-850 flex items-center justify-between mt-6">
                    <span className="text-xs font-bold text-white group-hover:text-[#FF202F] transition-colors flex items-center gap-1.5">
                      Khám phá 6 cấp độ HSK
                      <ArrowRight size={14} />
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">4.896 từ vựng</span>
                  </div>
                </Link>

                {/* Card 2: Spaced Repetition Review */}
                <Link
                  href="/zh/review"
                  className="group relative rounded-3xl p-7 bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/60 transition-all duration-300 hover:shadow-2xl hover:shadow-[#FF202F]/15 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
                      <RotateCcw size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white group-hover:text-amber-400 transition-colors">
                        Ôn tập từ chưa thuộc
                      </h2>
                      <p className="text-xs text-neutral-400 mt-1">
                        Hệ thống lặp lại ngắt quãng (Spaced Repetition) tự động gom các từ bạn chưa thuộc hoặc cần củng cố.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-850 flex items-center justify-between mt-6">
                    <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                      Vào phòng ôn tập
                      <ArrowRight size={14} />
                    </span>
                    <span className="text-[11px] font-mono text-amber-400">
                      {(chineseStats?.words_learning || 0) + (chineseStats?.review_later || 0)} từ cần ôn
                    </span>
                  </div>
                </Link>
              </div>

              {/* Progress for 6 HSK Levels */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Tiến độ 6 cấp độ HSK</h3>
                    <p className="text-xs text-neutral-400">Dữ liệu tính toán độc lập theo tài khoản của bạn</p>
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
                    <span>Chuỗi học tập: {stats?.studyStreakDays || 1} ngày liên tiếp</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">
                    Xin chào, {user?.full_name || 'Bạn'} 👋
                  </h1>
                  <p className="text-sm text-neutral-400">
                    Hôm nay bạn muốn học gì? Tiếp tục nâng cao vốn từ vựng cùng LearnVocab!
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
                      <p className="text-[11px] text-neutral-400">Có {reviewCount} từ cần ôn tập</p>
                    </div>
                    <Link
                      href="/review"
                      className="px-3.5 py-1.5 rounded-xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs font-bold transition-all"
                    >
                      Bắt đầu ôn
                    </Link>
                  </div>
                )}
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
                      {stats?.topicsCompleted || 0} / {stats?.totalTopics || 0} topics đã hoàn thành
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
                    <Link
                      key={book.id}
                      href={`/books/${book.id}`}
                      className="group block rounded-2xl bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden"
                    >
                      <div className="relative w-full h-36 bg-neutral-900 overflow-hidden border-b border-neutral-800/80">
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
                      </div>

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
                    </Link>
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
