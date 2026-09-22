/**
 * Client-side Storage for Vocabulary Progress
 * Guarantees zero-lag UI updates and persistence even in ephemeral serverless environments (Vercel)
 */

export function getLocalProgressKey(userId: string, prefix = 'vocab'): string {
  return `learnvocab_${prefix}_progress_${userId}`;
}

export function getLocalWordProgress(userId: string, prefix = 'vocab'): Record<string, string> {
  if (typeof window === 'undefined' || !userId) return {};
  try {
    const raw = localStorage.getItem(getLocalProgressKey(userId, prefix));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalWordProgress(
  userId: string,
  vocabId: string | number,
  status: string,
  prefix = 'vocab'
): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const key = getLocalProgressKey(userId, prefix);
    const existing = getLocalWordProgress(userId, prefix);
    existing[String(vocabId)] = status;
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {
    console.warn('Lỗi lưu tiến độ vào localStorage:', e);
  }
}

export function mergeWithLocalProgress<T extends { id: string | number; status?: any }>(
  userId: string,
  items: T[],
  prefix = 'vocab'
): T[] {
  if (!items || items.length === 0 || !userId) return items;
  const localMap = getLocalWordProgress(userId, prefix);
  if (Object.keys(localMap).length === 0) return items;

  return items.map((item) => {
    const localStatus = localMap[String(item.id)];
    if (localStatus) {
      return { ...item, status: localStatus as any } as T;
    }
    return item;
  });
}
