'use client';

import React, { createContext, useContext, useState } from 'react';
import { User } from '@/types';
import { PERSONAL_USER } from '@/config/personal';

interface AuthContextType {
  user: User;
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
  // Personal profile vĩnh viễn không cần đăng nhập
  const [user, setUser] = useState<User>(PERSONAL_USER as unknown as User);

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
