'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { ProgressBar } from '@/components/ProgressBar';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { ChineseHskLevelStats } from '@/types';

export default function ChineseVocabOverviewPage() {
  const { user } = useAuth();
  const [levels, setLevels] = useState<ChineseHskLevelStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/chinese/levels?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.levels) setLevels(data.levels);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const totalWords = levels.reduce((acc, curr) => acc + curr.total_words, 0);
  const masteredWords = levels.reduce((acc, curr) => acc + curr.mastered_words, 0);
  const overallProgress = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <AppHeader />

      <div className="flex-1 flex">
        {/* Accordion Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-8 space-y-6 sm:space-y-8 w-full min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF202F]/10 text-[#FF202F] text-xs font-bold border border-[#FF202F]/20 mb-2">
                <Sparkles size={14} />
                <span>HSK Vocabulary Series</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Chọn cấp độ HSK để học
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                4.896 từ vựng HSK 1 - 6 chuẩn hóa, phân loại theo 31 chủ đề giao tiếp và đời sống.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/zh/review"
                className="px-4 py-2.5 rounded-xl bg-[#1c1415] hover:bg-[#25181a] border border-[#FF202F]/30 text-[#FF202F] text-xs font-bold transition-all shadow"
              >
                Ôn tập từ chưa thuộc →
              </Link>
            </div>
          </div>

          {/* Overall Progress Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#141414] via-[#121212] to-[#181112] border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Tiến độ toàn bộ HSK</span>
              <p className="text-xs text-neutral-400">
                Đã thuộc: <strong className="text-white">{masteredWords.toLocaleString()}</strong> / {totalWords.toLocaleString()} từ vựng HSK 1 - 6
              </p>
            </div>

            <div className="w-full sm:w-64 bg-[#181818] p-3 rounded-2xl border border-neutral-800">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-neutral-400">Tổng tiến độ</span>
                <span className="text-[#FF202F]">{overallProgress}%</span>
              </div>
              <ProgressBar progress={overallProgress} height="h-2.5" />
            </div>
          </div>

          {/* HSK Level Cards Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 text-neutral-400">
              <Loader2 size={30} className="animate-spin text-[#FF202F]" />
              <p className="text-xs">Đang tải danh sách cấp độ HSK...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {levels.map((lvl) => {
                const stageLabel =
                  lvl.level <= 2 ? 'Sơ cấp (Căn bản)' : lvl.level <= 4 ? 'Trung cấp (Giao tiếp)' : 'Cao cấp (Chuyên sâu)';

                return (
                  <div
                    key={lvl.level}
                    className="group relative rounded-3xl bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/60 transition-all duration-300 hover:shadow-2xl hover:shadow-[#FF202F]/15 flex flex-col justify-between p-6 space-y-5"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black px-3 py-1 rounded-xl bg-[#FF202F]/15 border border-[#FF202F]/30 text-[#FF202F] font-mono">
                          {lvl.name}
                        </span>
                        <span className="text-xs font-bold text-[#FF202F]">
                          {lvl.progress_percentage}%
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-white group-hover:text-[#FF202F] transition-colors">
                        {lvl.name} • {stageLabel}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        Gồm {lvl.topics_count} chủ đề thực tế • {lvl.total_words} từ vựng chuẩn.
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-neutral-850 text-xs text-neutral-400">
                      <div className="flex justify-between">
                        <span>Số chủ đề:</span>
                        <strong className="text-white">{lvl.topics_count} topics</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Số từ vựng:</span>
                        <strong className="text-white">{lvl.total_words} từ</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Đã thuộc:</span>
                        <strong className="text-emerald-400">{lvl.mastered_words} / {lvl.total_words} từ</strong>
                      </div>

                      <div className="pt-1">
                        <ProgressBar progress={lvl.progress_percentage} height="h-2" />
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Link
                      href={`/zh/hsk/${lvl.level}`}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D91827] to-[#FF202F] hover:from-[#B81420] hover:to-[#E51322] text-white text-xs font-bold shadow-lg shadow-[#FF202F]/20 transition-all active:scale-[0.98]"
                    >
                      <span>Vào học HSK {lvl.level}</span>
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
