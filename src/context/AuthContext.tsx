'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Khôi phục session từ server và đồng bộ cache
  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          try {
            localStorage.setItem('learnvocab_user', JSON.stringify(data.user));
          } catch {}
          return;
        }
      }

      // Nếu không có session server hợp lệ
      // Kiểm tra xem có đang dùng tài khoản demo không
      const stored = localStorage.getItem('learnvocab_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.id === 'demo-user-id') {
            setUser(parsed);
            return;
          }
        } catch {}
      }

      // Xóa cache nếu phiên trên server không còn
      setUser(null);
      localStorage.removeItem('learnvocab_user');
    } catch (e) {
      console.warn('Lỗi kiểm tra session /api/auth/me:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Lấy dữ liệu nhanh từ localStorage để render 0ms (tránh giật layout)
    const stored = localStorage.getItem('learnvocab_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('learnvocab_user');
      }
    }

    // 2. Xác thực phiên thật từ server qua HttpOnly cookie
    refreshSession();
  }, [refreshSession]);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Đăng nhập thất bại' };
      }
      setUser(data.user);
      localStorage.setItem('learnvocab_user', JSON.stringify(data.user));
      return { success: true };
    } catch {
      return { success: false, error: 'Lỗi kết nối máy chủ' };
    }
  };

  const register = async (formData: { username: string; password: string; fullName?: string; email?: string }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Đăng ký thất bại' };
      }
      setUser(data.user);
      localStorage.setItem('learnvocab_user', JSON.stringify(data.user));
      return { success: true };
    } catch {
      return { success: false, error: 'Lỗi kết nối máy chủ' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('learnvocab_user');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  };

  const loginDemo = async () => {
    const demoUser: User = {
      id: 'demo-user-id',
      email: 'demo@learnvocab.local',
      username: 'tilua',
      full_name: 'Tí Lửa',
      display_name: 'Tí Lửa',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=tilua',
      created_at: new Date().toISOString(),
    };
    setUser(demoUser);
    localStorage.setItem('learnvocab_user', JSON.stringify(demoUser));
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updatedUser };
      try {
        localStorage.setItem('learnvocab_user', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginDemo, updateUser, refreshSession }}>
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
