/**
 * Cấu hình Personal Profile vĩnh viễn cho LearnVocab
 * Tương thích 100% với foreign key và schema auth.users trên Supabase Cloud
 */

export const PERSONAL_PROFILE_ID = '85c97771-538f-4532-a970-c9c9d82babe2';

export const PERSONAL_USER = {
  id: PERSONAL_PROFILE_ID,
  username: 'tilua',
  email: 'demo@learnvocab.local',
  full_name: 'Tí Lửa',
  display_name: 'Tí Lửa',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=tilua',
  role: 'admin',
  created_at: '2026-09-19T06:28:44.000Z',
};
