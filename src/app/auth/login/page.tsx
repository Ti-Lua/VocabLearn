'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, User, BookOpen, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginDemo } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(identifier, password);
    setLoading(false);

    if (res.success) {
      // Prompt Rule: Sau login KHÔNG vào thẳng Vocab. Chuyển sang trang chọn ngôn ngữ.
      router.push('/languages');
    } else {
      setError(res.error || 'Đăng nhập thất bại');
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    await loginDemo();
    setLoading(false);
    router.push('/languages');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808] px-4 py-12 relative overflow-hidden">
      {/* Background ambient red glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF202F]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#121212] border border-neutral-800 rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D91827] to-[#FF202F] flex items-center justify-center text-white shadow-xl shadow-[#FF202F]/30 mb-4">
            <BookOpen size={28} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            LearnVocab <span className="text-[#FF202F]">by Tí Lửa</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1.5 max-w-xs">
            Học từ vựng thực tế với 4 bộ sách Cambridge English Vocabulary in Use
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 rounded-2xl bg-[#181818] border border-neutral-800 mb-6">
          <Link
            href="/auth/login"
            className="flex-1 py-2 text-center text-xs font-bold rounded-xl bg-[#FF202F] text-white shadow-md shadow-[#FF202F]/20 transition-all"
          >
            Đăng nhập
          </Link>
          <Link
            href="/auth/register"
            className="flex-1 py-2 text-center text-xs font-semibold rounded-xl text-neutral-400 hover:text-white transition-all"
          >
            Đăng ký
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-[#FF202F]/15 border border-[#FF202F]/30 text-xs text-[#FF202F] font-medium text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Tên đăng nhập (hoặc Email)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <User size={16} />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#181818] border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#FF202F] focus:ring-1 focus:ring-[#FF202F] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#181818] border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#FF202F] focus:ring-1 focus:ring-[#FF202F] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-400 hover:text-white">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-800 text-[#FF202F] focus:ring-0 focus:ring-offset-0"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <Link
              href="/languages"
              className="text-neutral-400 hover:text-[#FF202F] transition-colors text-[11px]"
            >
              Về trang chủ
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D91827] to-[#FF202F] hover:from-[#B81420] hover:to-[#E51322] text-white text-sm font-bold shadow-lg shadow-[#FF202F]/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Fast Login */}
        <div className="mt-5 pt-5 border-t border-neutral-800/80">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1c1415] hover:bg-[#25181a] border border-[#FF202F]/30 text-[#FF202F] text-xs font-semibold transition-all hover:border-[#FF202F]/60 active:scale-[0.98] cursor-pointer"
          >
            <Sparkles size={15} />
            <span>Đăng nhập nhanh với tài khoản Demo (Tí Lửa)</span>
          </button>
        </div>

        {/* Switch to Register */}
        <div className="mt-6 text-center text-xs text-neutral-400">
          Chưa có tài khoản?{' '}
          <Link href="/auth/register" className="text-[#FF202F] font-semibold hover:underline">
            Tạo tài khoản mới ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
