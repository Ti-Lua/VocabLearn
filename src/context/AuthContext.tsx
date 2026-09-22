'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mutate } from 'swr';
import { User } from '@/types';
import { PROFILES, ProfileKey, DEFAULT_PROFILE_KEY } from '@/config/personal';

interface AuthContextType {
  user: User;
  profileKey: ProfileKey;
  switchProfile: (key: ProfileKey) => void;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { username: string; password: string; fullName?: string; email?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loginDemo: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profileKey, setProfileKey] = useState<ProfileKey>(DEFAULT_PROFILE_KEY);
  const [user, setUser] = useState<User>(PROFILES[DEFAULT_PROFILE_KEY] as unknown as User);

  // Khởi tạo profile từ localStorage / cookies khi load trang
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('learnvocab_active_profile') as ProfileKey;
      if (savedKey && (savedKey === 'tilua' || savedKey === 'tidieu')) {
        setProfileKey(savedKey);
        setUser(PROFILES[savedKey] as unknown as User);
        document.cookie = `learnvocab_active_profile=${savedKey}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `learnvocab_active_user_id=${PROFILES[savedKey].id}; path=/; max-age=31536000; SameSite=Lax`;
      } else {
        document.cookie = `learnvocab_active_profile=${DEFAULT_PROFILE_KEY}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `learnvocab_active_user_id=${PROFILES[DEFAULT_PROFILE_KEY].id}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {
      // Bỏ qua nếu môi trường không có localStorage
    }
  }, []);

  const switchProfile = useCallback((key: ProfileKey) => {
    if (!PROFILES[key]) return;
    setProfileKey(key);
    const targetUser = PROFILES[key] as unknown as User;
    setUser(targetUser);

    try {
      localStorage.setItem('learnvocab_active_profile', key);
      document.cookie = `learnvocab_active_profile=${key}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `learnvocab_active_user_id=${PROFILES[key].id}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {
      console.warn('Lỗi lưu active profile:', e);
    }

    // Invalidate toàn bộ cache SWR để dữ liệu tự động load lại theo user mới
    mutate(() => true, undefined, { revalidate: true });
  }, []);

  const login = async () => ({ success: true });
  const register = async () => ({ success: true });
  const logout = () => {};
  const loginDemo = async () => {};
  const refreshSession = async () => {};

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profileKey,
        switchProfile,
        loading: false,
        login,
        register,
        logout,
        loginDemo,
        updateUser,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
