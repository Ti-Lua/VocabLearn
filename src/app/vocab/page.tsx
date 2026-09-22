'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { ProgressBar } from '@/components/ProgressBar';
import { BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { Book } from '@/types';

export default function VocabBookSelectionPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/books?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.books) setBooks(data.books);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

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
                <BookOpen size={14} />
                <span>Cambridge Series</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Chọn sách để học
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                4 cấp độ từ vựng chuẩn Cambridge, cấu trúc rõ ràng theo từng Topic thực tiễn.
              </p>
            </div>

            <Link
              href="/review"
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#1c1415] hover:bg-[#25181a] border border-[#FF202F]/30 text-[#FF202F] text-xs font-bold transition-all shadow"
            >
              Ôn tập từ chưa thuộc →
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 text-neutral-400">
              <Loader2 size={30} className="animate-spin text-[#FF202F]" />
              <p className="text-xs">Đang tải danh sách sách...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {books.map((book) => {
              const progressPct = book.progress_percentage || 0;
              const completedTopics = book.completed_topics || 0;
              const totalTopics = book.total_topics || 0;

              return (
                <div
                  key={book.id}
                  className="group relative rounded-3xl bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/60 transition-all duration-300 hover:shadow-2xl hover:shadow-[#FF202F]/15 flex flex-col justify-between overflow-hidden"
                >
                  {/* Book Cover Image */}
                  <div className="relative w-full aspect-[4/5] bg-neutral-900 overflow-hidden border-b border-neutral-800/80">
                    {book.cover_image ? (
                      <Image
                        src={book.cover_image}
                        alt={book.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <BookOpen size={48} />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-neutral-700 text-xs font-extrabold text-[#FF202F]">
                      {progressPct}%
                    </div>
                  </div>

                  {/* Book Meta Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                          {book.level}
                        </span>
                        <span className="text-xs text-neutral-400">{book.edition}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-white group-hover:text-[#FF202F] transition-colors line-clamp-2">
                        {book.name}
                      </h3>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-neutral-850 text-xs text-neutral-400">
                      <div className="flex justify-between">
                        <span>Số Topics:</span>
                        <strong className="text-white">{totalTopics} topics</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Số từ vựng:</span>
                        <strong className="text-white">{(book.total_words || 0).toLocaleString()} từ</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Hoàn thành:</span>
                        <strong className="text-emerald-400">{completedTopics} / {totalTopics} topics</strong>
                      </div>

                      <div className="pt-1">
                        <ProgressBar progress={progressPct} height="h-1.5" />
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Link
                      href={`/books/${book.id}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D91827] to-[#FF202F] hover:from-[#B81420] hover:to-[#E51322] text-white text-xs font-bold shadow-lg shadow-[#FF202F]/20 transition-all active:scale-[0.98]"
                    >
                      <span>Chọn sách</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
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
