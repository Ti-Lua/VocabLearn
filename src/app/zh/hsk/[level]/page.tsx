'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { ProgressBar } from '@/components/ProgressBar';
import {
  ArrowRight,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { ChineseTopicSummary, ChineseHskLevelStats } from '@/types';

export default function ChineseHskLevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const resolvedParams = use(params);
  const levelNum = parseInt(resolvedParams.level, 10);
  const { user } = useAuth();

  const [topics, setTopics] = useState<ChineseTopicSummary[]>([]);
  const [levelStat, setLevelStat] = useState<ChineseHskLevelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || isNaN(levelNum)) return;

    fetch(`/api/chinese/levels/${levelNum}?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.topics) setTopics(data.topics);
        if (data.levelStat) setLevelStat(data.levelStat);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, levelNum]);

  const stageLabel =
    levelNum <= 2 ? 'Sơ cấp (Căn bản)' : levelNum <= 4 ? 'Trung cấp (Giao tiếp)' : 'Cao cấp (Chuyên sâu)';

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <AppHeader />

      <div className="flex-1 flex">
        {/* Accordion Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-8 space-y-6 sm:space-y-8 w-full min-w-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Link href="/dashboard" className="hover:text-white">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/zh/vocab" className="hover:text-white">
              HSK Series
            </Link>
            <span>/</span>
            <span className="text-[#FF202F] font-semibold">HSK {levelNum}</span>
          </div>

          {/* Level Header Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#141414] via-[#121212] to-[#181112] border border-neutral-800 relative overflow-hidden space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF202F]/10 text-[#FF202F] text-xs font-bold border border-[#FF202F]/20">
                  <Sparkles size={14} />
                  <span>{stageLabel}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white">
                  HSK {levelNum} Vocabulary
                </h1>
                <p className="text-sm text-neutral-400">
                  Gồm {topics.length} chủ đề thực tế • {levelStat?.total_words || 0} từ vựng chuẩn HSK 2.0.
                </p>
              </div>

              {/* Progress Summary Widget */}
              <div className="sm:w-64 bg-[#181818] p-4 rounded-2xl border border-neutral-800 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-neutral-400">Tiến độ HSK {levelNum}</span>
                  <span className="text-[#FF202F]">{levelStat?.progress_percentage || 0}%</span>
                </div>
                <ProgressBar progress={levelStat?.progress_percentage || 0} height="h-2" />
                <p className="text-[11px] text-neutral-400 text-right">
                  Đã thuộc: <strong className="text-white">{levelStat?.mastered_words || 0}</strong> / {levelStat?.total_words || 0} từ
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-850 text-xs">
              <div className="p-3 rounded-xl bg-[#181818] border border-neutral-800">
                <span className="text-neutral-400 text-[11px]">Tổng số từ:</span>
                <p className="text-lg font-bold text-white mt-0.5">{levelStat?.total_words || 0} từ</p>
              </div>
              <div className="p-3 rounded-xl bg-[#181818] border border-neutral-800">
                <span className="text-neutral-400 text-[11px]">Đã thuộc:</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">{levelStat?.mastered_words || 0} từ</p>
              </div>
              <div className="p-3 rounded-xl bg-[#181818] border border-neutral-800">
                <span className="text-neutral-400 text-[11px]">Đang học:</span>
                <p className="text-lg font-bold text-amber-400 mt-0.5">{levelStat?.learning_words || 0} từ</p>
              </div>
              <div className="p-3 rounded-xl bg-[#181818] border border-neutral-800">
                <span className="text-neutral-400 text-[11px]">Cần ôn lại:</span>
                <p className="text-lg font-bold text-[#FF202F] mt-0.5">{levelStat?.review_later_words || 0} từ</p>
              </div>
            </div>
          </div>

          {/* Topics Grid Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              Danh sách chủ đề trong HSK {levelNum} ({topics.length} topics)
            </h2>
            <Link
              href="/zh/vocab"
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              <span>Cấp độ khác</span>
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 text-neutral-400">
              <Loader2 size={30} className="animate-spin text-[#FF202F]" />
              <p className="text-xs">Đang tải các chủ đề HSK {levelNum}...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map((t) => {
                const encodedTopic = encodeURIComponent(t.topic);

                return (
                  <div
                    key={t.topic}
                    className="group rounded-2xl bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/50 transition-all p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                          HSK {levelNum}
                        </span>
                        {t.is_completed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 size={12} />
                            <span>Đã hoàn thành</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-neutral-400">
                            {t.progress_percentage}%
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-[#FF202F] transition-colors line-clamp-1">
                        {t.topic}
                      </h3>

                      <p className="text-xs text-neutral-400">
                        {t.total_words} từ vựng • <strong className="text-white">{t.mastered_words}/{t.total_words}</strong> đã thuộc
                      </p>

                      <div className="pt-1">
                        <ProgressBar progress={t.progress_percentage} height="h-1.5" />
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Link
                      href={`/zh/hsk/${levelNum}/${encodedTopic}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#181818] group-hover:bg-[#FF202F] text-white text-xs font-bold transition-all shadow"
                    >
                      <span>Học ngay</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
