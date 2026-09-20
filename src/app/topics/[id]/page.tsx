'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { ProgressBar } from '@/components/ProgressBar';
import { LearnTab } from '@/components/topic/LearnTab';
import { PracticeTab } from '@/components/topic/PracticeTab';
import { TestTab } from '@/components/topic/TestTab';
import {
  BookMarked,
  Zap,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { Topic, Book, Vocabulary, WordStatus } from '@/types';

export default function TopicDetailPage() {
  const params = useParams();
  const topicId = parseInt(params?.id as string, 10);
  const { user } = useAuth();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [activeTab, setActiveTab] = useState<'learn' | 'practice' | 'test'>('learn');
  const [loading, setLoading] = useState(true);

  const fetchTopicData = useCallback(() => {
    if (!topicId || !user) return;
    fetch(`/api/topics/${topicId}?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.topic) setTopic(data.topic);
        if (data.book) setBook(data.book);
        if (data.vocabulary) setVocabulary(data.vocabulary);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [topicId, user]);

  useEffect(() => {
    fetchTopicData();
  }, [fetchTopicData]);

  const handleProgressUpdate = async (vocabId: number, status: WordStatus) => {
    if (!user) return;

    // Optimistic UI update
    setVocabulary((prev) =>
      prev.map((v) => (v.id === vocabId ? { ...v, status } : v))
    );

    try {
      await fetch('/api/vocabulary/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          vocabularyId: vocabId,
          status,
        }),
      });
      // Refresh topic stats
      fetchTopicData();
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center text-neutral-400">
          Đang tải dữ liệu Topic...
        </div>
      </div>
    );
  }

  if (!topic || !book || !user) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center text-neutral-400">
          {!user ? 'Vui lòng đăng nhập để tiếp tục.' : 'Không tìm thấy Topic.'}
        </div>
      </div>
    );
  }

  const masteredWords = vocabulary.filter((v) => v.status === 'mastered').length;
  const learningWords = vocabulary.filter((v) => v.status === 'learning').length;
  const reviewWords = vocabulary.filter((v) => v.status === 'review').length;
  const totalWords = vocabulary.length;
  const progressPct = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;
  const learnedCount = masteredWords + learningWords + reviewWords;

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <AppHeader />

      <div className="flex-1 flex">
        {/* Accordion Sidebar */}
        <Sidebar />

        <main className="flex-1 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-8 space-y-6 w-full min-w-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-neutral-400 overflow-x-auto no-scrollbar whitespace-nowrap">
            <Link href="/vocab" className="hover:text-white">
              Sách
            </Link>
            <span>/</span>
            <Link href={`/books/${book.id}`} className="hover:text-white">
              {book.short_name}
            </Link>
            <span>/</span>
            <span className="text-[#FF202F] font-semibold truncate max-w-xs">{topic.name}</span>
          </div>

          {/* Topic Header Card */}
          <div className="p-5 sm:p-8 rounded-3xl bg-gradient-to-r from-[#141414] via-[#121212] to-[#181112] border border-neutral-800 space-y-5 sm:space-y-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                    {book.level}
                  </span>
                  {topic.unit_number && (
                    <span className="text-xs text-neutral-400 font-medium">Unit {topic.unit_number}</span>
                  )}
                  {topic.is_completed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={12} />
                      <span>Đã hoàn thành</span>
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-3xl font-black text-white">{topic.name}</h1>
                <p className="text-xs text-neutral-400">
                  {totalWords} từ vựng chuẩn Cambridge • Đã thuộc:{' '}
                  <strong className="text-white">
                    {masteredWords} / {totalWords} ({progressPct}%)
                  </strong>
                </p>
              </div>

              {/* Mini progress widget */}
              <div className="w-full sm:w-56 bg-[#181818] p-3.5 rounded-2xl border border-neutral-800">
                <div className="flex justify-between items-center text-xs mb-1 font-bold">
                  <span className="text-neutral-400">Tiến độ Topic</span>
                  <span className="text-[#FF202F]">{progressPct}%</span>
                </div>
                <ProgressBar progress={progressPct} height="h-2" />
              </div>
            </div>

            {/* Learning Cycle Tracker (Step 1 Learn -> Step 2 Practice -> Step 3 Test) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2 border-t border-neutral-850 text-xs">
              <div
                className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                  learnedCount > 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-[#181818] border-neutral-800 text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <BookMarked size={14} className="flex-shrink-0" />
                  <span className="font-bold text-[10px] sm:text-[11px] truncate">
                    <span className="hidden sm:inline">BƯỚC 1: </span>Learn
                  </span>
                </div>
                {learnedCount > 0 && <CheckCircle2 size={13} className="flex-shrink-0 ml-1" />}
              </div>

              <div
                className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                  learnedCount >= 4
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-[#181818] border-neutral-800 text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <Zap size={14} className="flex-shrink-0" />
                  <span className="font-bold text-[10px] sm:text-[11px] truncate">
                    <span className="hidden sm:inline">BƯỚC 2: </span>Practice
                  </span>
                </div>
                {learnedCount >= 4 && <CheckCircle2 size={13} className="flex-shrink-0 ml-1" />}
              </div>

              <div
                className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                  topic.best_test_score && topic.best_test_score >= 80
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-[#181818] border-neutral-800 text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <Award size={14} className="flex-shrink-0" />
                  <span className="font-bold text-[10px] sm:text-[11px] truncate">
                    <span className="hidden sm:inline">BƯỚC 3: </span>Test {topic.best_test_score ? `(${topic.best_test_score}%)` : ''}
                  </span>
                </div>
                {topic.best_test_score && topic.best_test_score >= 80 && (
                  <CheckCircle2 size={13} className="flex-shrink-0 ml-1" />
                )}
              </div>
            </div>
          </div>

          {/* 3 Interactive Tabs */}
          <div className="flex items-center justify-start gap-2 border-b border-neutral-800 pb-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('learn')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === 'learn'
                  ? 'bg-[#FF202F] text-white shadow-lg shadow-[#FF202F]/20'
                  : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <BookMarked size={15} />
              <span>1. Learn (Học từ)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('practice')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === 'practice'
                  ? 'bg-[#FF202F] text-white shadow-lg shadow-[#FF202F]/20'
                  : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <Zap size={15} />
              <span>2. Practice (Luyện tập)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('test')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === 'test'
                  ? 'bg-[#FF202F] text-white shadow-lg shadow-[#FF202F]/20'
                  : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <Award size={15} />
              <span>3. Test (Kiểm tra)</span>
            </button>
          </div>

          {/* Tab Content Rendering */}
          <div className="pt-2">
            {activeTab === 'learn' && (
              <LearnTab
                vocabulary={vocabulary}
                userId={user.id}
                onProgressUpdate={handleProgressUpdate}
                onGoToPractice={() => setActiveTab('practice')}
              />
            )}

            {activeTab === 'practice' && (
              <PracticeTab
                topicId={topic.id}
                bookId={book.id}
                userId={user.id}
                onGoToLearn={() => setActiveTab('learn')}
                onGoToTest={() => setActiveTab('test')}
              />
            )}

            {activeTab === 'test' && (
              <TestTab
                topicId={topic.id}
                bookId={book.id}
                userId={user.id}
                topicTitle={topic.name}
                masteredPercentage={progressPct}
                onTopicCompleted={fetchTopicData}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
