/**
 * Cấu hình Dual Profiles vĩnh viễn cho LearnVocab
 * Tương thích 100% với foreign key và schema auth.users trên Supabase Cloud
 */

export const PROFILES = {
  tilua: {
    id: '85c97771-538f-4532-a970-c9c9d82babe2',
    key: 'tilua' as const,
    username: 'tilua',
    email: 'demo@learnvocab.local',
    full_name: 'Tí Lửa',
    display_name: 'Tí Lửa',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=tilua',
    icon: '🔥',
    badge: 'Tí Lửa',
    tag: 'BY TÍ LỬA',
    role: 'admin',
    created_at: '2026-09-19T06:28:44.000Z',
  },
  tidieu: {
    id: '5cd254c4-618e-4cb1-a09a-cb161a28a22a',
    key: 'tidieu' as const,
    username: 'tidieu',
    email: 'tidieu@learnvocab.local',
    full_name: 'Tí Điệu',
    display_name: 'Tí Điệu',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=tidieu',
    icon: '🌸',
    badge: 'Tí Điệu',
    tag: 'BY TÍ ĐIỆU',
    role: 'admin',
    created_at: '2026-09-22T14:26:00.000Z',
  },
} as const;

export type ProfileKey = keyof typeof PROFILES;
export type UserProfile = (typeof PROFILES)[ProfileKey];

export const DEFAULT_PROFILE_KEY: ProfileKey = 'tilua';
export const PERSONAL_PROFILE_ID = PROFILES.tilua.id;
export const PERSONAL_USER = PROFILES.tilua;

export function getProfileByKey(key?: string | null): UserProfile {
  if (key === 'tidieu') return PROFILES.tidieu;
  return PROFILES.tilua;
}

export function getProfileById(id?: string | null): UserProfile {
  if (id === PROFILES.tidieu.id) return PROFILES.tidieu;
  return PROFILES.tilua;
}
