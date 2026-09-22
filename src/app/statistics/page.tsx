'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { ProgressBar } from '@/components/ProgressBar';
import {
  BarChart2,
  Flame,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Award,
  Loader2,
} from 'lucide-react';
import { UserStatistics } from '@/types';

export default function StatisticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/statistics?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.statistics) setStats(data.statistics);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const formatStudyTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} phút`;
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <AppHeader streakDays={stats?.studyStreakDays || 1} />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-8 space-y-6 sm:space-y-8 w-full min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF202F]/10 text-[#FF202F] text-xs font-bold border border-[#FF202F]/20 mb-2">
                <BarChart2 size={14} />
                <span>Analytics &amp; Insights</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Thống kê học tập cá nhân
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Theo dõi sự tiến bộ, chuỗi ngày học và phát hiện các từ hay nhầm lẫn.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 size={32} className="animate-spin text-[#FF202F]" />
              <p className="text-neutral-400 text-sm">Đang tải dữ liệu thống kê...</p>
            </div>
          ) : (
            <>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-2">
              <span className="text-xs text-neutral-400 font-medium">Chuỗi học liên tiếp</span>
              <div className="flex items-center gap-2">
                <Flame size={24} className="text-[#FF202F] fill-[#FF202F]" />
                <p className="text-3xl font-black text-white">{stats?.studyStreakDays || 1} ngày</p>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-2">
              <span className="text-xs text-neutral-400 font-medium">Độ chính xác trung bình</span>
              <div className="flex items-center gap-2">
                <Award size={24} className="text-emerald-400" />
                <p className="text-3xl font-black text-emerald-400">{stats?.overallAccuracy || 0}%</p>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-2">
              <span className="text-xs text-neutral-400 font-medium">Tổng thời gian học</span>
              <div className="flex items-center gap-2">
                <Clock size={24} className="text-amber-400" />
                <p className="text-2xl sm:text-3xl font-black text-white">
                  {formatStudyTime(stats?.totalStudyTimeSeconds || 0)}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[#121212] border border-neutral-800 space-y-2">
              <span className="text-xs text-neutral-400 font-medium">Topics hoàn thành</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={24} className="text-[#FF202F]" />
                <p className="text-3xl font-black text-white">
                  {stats?.topicsCompleted || 0} / {stats?.totalTopics || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Most Mistaken Words ("Từ bạn hay nhầm") */}
          <div className="p-6 rounded-3xl bg-[#121212] border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon size={18} className="text-[#FF202F]" />
                <h3 className="text-base font-bold text-white">Từ bạn hay nhầm nhất</h3>
              </div>
              <span className="text-xs text-neutral-400">Tính tự động từ các bài luyện &amp; kiểm tra</span>
            </div>

            {stats?.mostMistakenWords && stats.mostMistakenWords.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {stats.mostMistakenWords.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{item.word}</span>
                        {item.ipa && (
                          <span className="text-xs text-neutral-400 font-mono">{item.ipa}</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">{item.meaning_vi}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-bold text-[#FF202F] px-2 py-0.5 rounded bg-[#FF202F]/15 border border-[#FF202F]/30">
                        {item.wrongCount} lần sai
                      </span>
                      <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                        Đúng {item.accuracy}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-neutral-500">
                Chưa có dữ liệu từ sai. Hãy tiếp tục luyện tập các bài trong Topic!
              </div>
            )}
          </div>

          {/* Progress Per Book */}
          <div className="p-6 rounded-3xl bg-[#121212] border border-neutral-800 space-y-4">
            <h3 className="text-base font-bold text-white">Tiến độ chi tiết từng bộ sách</h3>
            <div className="space-y-4 pt-2">
              {stats?.booksProgress.map((bp) => (
                <div key={bp.bookId} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px] font-bold">
                        {bp.level}
                      </span>
                      <span className="font-bold text-white">{bp.bookName}</span>
                    </div>
                    <span className="font-extrabold text-[#FF202F]">{bp.percentage}%</span>
                  </div>
                  <ProgressBar progress={bp.percentage} height="h-2" />
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>Hoàn thành: {bp.completedTopics} / {bp.totalTopics} topics</span>
                    <Link href={`/books/${bp.bookId}`} className="text-[#FF202F] hover:underline font-semibold">
                      Xem danh sách topics →
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
