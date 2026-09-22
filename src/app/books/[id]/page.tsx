'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Search,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { Book, Topic } from '@/types';

export default function BookDetailPage() {
  const params = useParams();
  const bookId = params?.id as string;
  const { user } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId || !user) return;

    fetch(`/api/books/${bookId}?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.book) setBook(data.book);
        if (data.topics) setTopics(data.topics);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bookId, user]);

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.unit_number && t.unit_number.toString().includes(searchQuery));

      if (!matchesSearch) return false;

      if (filterStatus === 'completed') return t.is_completed;
      if (filterStatus === 'in_progress') return (t.learning_words || 0) > 0 || ((t.mastered_words || 0) > 0 && !t.is_completed);
      if (filterStatus === 'not_started') return (t.mastered_words || 0) === 0 && (t.learning_words || 0) === 0 && (t.review_words || 0) === 0;

      return true;
    });
  }, [topics, searchQuery, filterStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center text-neutral-400">
          Đang tải danh sách Topics...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <AppHeader />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-8 space-y-6 w-full min-w-0">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Link href="/vocab" className="hover:text-white flex items-center gap-1">
              <ChevronLeft size={14} />
              <span>Chọn sách</span>
            </Link>
            <span>/</span>
            <span className="text-[#FF202F] font-semibold">{book?.short_name}</span>
          </div>

          {/* Book Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#141414] to-[#1a1112] border border-neutral-800 flex flex-col sm:flex-row justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 relative z-10 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FF202F]/15 text-[#FF202F] border border-[#FF202F]/30 font-mono">
                  {book?.level}
                </span>
                <span className="text-xs text-neutral-400">{book?.edition}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{book?.name}</h1>
              <p className="text-xs text-neutral-400">
                Toàn bộ các chủ đề học từ vựng thực tế với chu trình khép kín: <strong>Learn → Practice → Test</strong>.
              </p>
            </div>

            <div className="flex-shrink-0 sm:w-64 bg-[#121212]/80 backdrop-blur-md p-4 rounded-2xl border border-neutral-800 flex flex-col justify-between relative z-10">
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                  <span className="text-neutral-400">Tiến độ sách</span>
                  <span className="text-[#FF202F] font-extrabold">{book?.progress_percentage || 0}%</span>
                </div>
                <ProgressBar progress={book?.progress_percentage || 0} height="h-2" />
              </div>
              <div className="flex justify-between text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-850">
                <span>Hoàn thành:</span>
                <strong className="text-emerald-400 font-semibold">
                  {book?.completed_topics || 0} / {book?.total_topics || 0} topics
                </strong>
              </div>
            </div>
          </div>

          {/* Search & Filter bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute inset-y-0 left-3 my-auto text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm topic hoặc số unit..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#121212] border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF202F] transition-all"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterStatus === 'all'
                    ? 'bg-[#FF202F] text-white shadow'
                    : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                Tất cả ({topics.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('in_progress')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterStatus === 'in_progress'
                    ? 'bg-[#FF202F] text-white shadow'
                    : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                Đang học
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterStatus === 'completed'
                    ? 'bg-[#FF202F] text-white shadow'
                    : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                Đã xong
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('not_started')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterStatus === 'not_started'
                    ? 'bg-[#FF202F] text-white shadow'
                    : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                Chưa học
              </button>
            </div>
          </div>

          {/* Topics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map((topic) => {
              const status = topic.is_completed
                ? 'completed'
                : (topic.mastered_words || 0) > 0 || (topic.learning_words || 0) > 0
                ? 'in_progress'
                : 'not_started';

              return (
                <Link
                  key={topic.id}
                  href={`/topics/${topic.id}`}
                  className="group p-5 rounded-2xl bg-[#121212] border border-neutral-800 hover:border-[#FF202F]/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                        {topic.unit_number ? `Unit ${topic.unit_number}` : `Topic #${topic.order_index}`}
                      </span>
                      <StatusBadge status={status} size="sm" />
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-[#FF202F] transition-colors line-clamp-2 mb-2">
                      {topic.name}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-neutral-850 space-y-2">
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>{topic.total_words} từ vựng</span>
                      <span className="font-semibold text-white">
                        {topic.mastered_words || 0} / {topic.total_words} mastered
                      </span>
                    </div>

                    <ProgressBar progress={topic.progress_percentage || 0} height="h-1.5" />

                    <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-neutral-400 group-hover:text-[#FF202F] transition-colors">
                      <span>Vào học topic</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredTopics.length === 0 && (
            <div className="text-center py-16 text-neutral-500 text-sm">
              Không tìm thấy topic nào phù hợp với tìm kiếm của bạn.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
