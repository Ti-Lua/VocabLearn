'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { username: string; password: string; fullName?: string; email?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loginDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for saved session
    const stored = localStorage.getItem('learnvocab_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('learnvocab_user');
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

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
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=tilua',
      created_at: new Date().toISOString(),
    };
    setUser(demoUser);
    localStorage.setItem('learnvocab_user', JSON.stringify(demoUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginDemo }}>
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
