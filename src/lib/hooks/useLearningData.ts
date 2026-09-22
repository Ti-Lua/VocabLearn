'use client';

import useSWR, { mutate } from 'swr';
import { Book, UserStats, ChineseDashboardStats } from '@/types';
import { useAuth } from '@/context/AuthContext';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Network response was not ok');
  }
  return res.json();
};

/**
 * Hook tải danh mục sách và tiến độ theo User
 */
export function useBooks(overrideUserId?: string, langCode = 'en') {
  const { user } = useAuth();
  const userId = overrideUserId || user?.id;
  const url = `/api/books?lang=${langCode}${userId ? `&userId=${userId}` : ''}`;

  const { data, error, isLoading, mutate: refreshBooks } = useSWR<{ books: Book[] }>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    books: data?.books || [],
    isLoading,
    error,
    refreshBooks,
  };
}

/**
 * Hook tải thống kê học tập tổng hợp của User (bảng user_stats)
 */
export function useUserStats(overrideUserId?: string) {
  const { user } = useAuth();
  const userId = overrideUserId || user?.id;
  const url = `/api/user/stats${userId ? `?userId=${userId}` : ''}`;

  const { data, error, isLoading, mutate: refreshStats } = useSWR<{ stats: UserStats }>(
    url,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  return {
    stats: data?.stats || null,
    isLoading,
    error,
    refreshStats,
  };
}

/**
 * Hook tải vị trí bài học dang dở gần nhất để Tiếp tục học
 */
export function useContinueLearning(overrideUserId?: string) {
  const { user } = useAuth();
  const userId = overrideUserId || user?.id;
  const url = `/api/user/continue${userId ? `?userId=${userId}` : ''}`;

  const { data, error, isLoading, mutate: refreshContinue } = useSWR<{
    continueData: {
      bookId: number;
      bookName: string;
      bookShortName: string;
      bookLevel: string;
      bookCoverImage: string | null;
      topicId: number;
      topicName: string;
      unitNumber: number | null;
      lastVocabId: number | null;
      learnedWords: number;
      totalWords: number;
      progressPercent: number;
      resumeUrl: string;
    } | null;
  }>(url, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  return {
    continueData: data?.continueData || null,
    isLoading,
    error,
    refreshContinue,
  };
}

/**
 * Hook tải thống kê tiếng Trung HSK
 */
export function useChineseStats(overrideUserId?: string) {
  const { user } = useAuth();
  const userId = overrideUserId || user?.id;
  const url = `/api/chinese/stats${userId ? `?userId=${userId}` : ''}`;

  const { data, error, isLoading, mutate: refreshChineseStats } = useSWR<{
    stats: ChineseDashboardStats;
  }>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15000,
  });

  return {
    chineseStats: data?.stats || null,
    isLoading,
    error,
    refreshChineseStats,
  };
}

/**
 * Làm mới toàn bộ cache học tập sau khi hoàn thành bài học
 */
export function invalidateLearningData() {
  mutate(
    (key) =>
      typeof key === 'string' &&
      (key.startsWith('/api/user') ||
        key.startsWith('/api/books') ||
        key.startsWith('/api/review') ||
        key.startsWith('/api/chinese'))
  );
}
