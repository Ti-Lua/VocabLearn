'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, Mail, User, BookOpen, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    if (cleanUsername.length < 3) {
      setError('Tên đăng nhập phải có tối thiểu 3 ký tự');
      return;
    }

    if (password.length < 4) {
      setError('Mật khẩu phải có tối thiểu 4 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    const res = await register({
      username: cleanUsername,
      password,
      fullName: fullName.trim() || cleanUsername,
      email: email.trim() ? email.trim() : undefined,
    });
    setLoading(false);

    if (res.success) {
      // Sau đăng ký thành công -> chuyển sang trang chọn ngôn ngữ
      router.push('/languages');
    } else {
      setError(res.error || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808] px-4 py-12 relative overflow-hidden selection:bg-[#FF202F] selection:text-white">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF202F]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#121212] border border-neutral-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D91827] to-[#FF202F] flex items-center justify-center text-white shadow-xl shadow-[#FF202F]/30 mb-4">
            <BookOpen size={28} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Tạo tài khoản <span className="text-[#FF202F]">LearnVocab</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1.5">
            Đăng ký nhanh không cần Email • Dữ liệu lưu trữ an toàn
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 rounded-2xl bg-[#181818] border border-neutral-800 mb-6">
          <Link
            href="/auth/login"
            className="flex-1 py-2 text-center text-xs font-semibold rounded-xl text-neutral-400 hover:text-white transition-all"
          >
            Đăng nhập
          </Link>
          <Link
            href="/auth/register"
            className="flex-1 py-2 text-center text-xs font-bold rounded-xl bg-[#FF202F] text-white shadow-md shadow-[#FF202F]/20 transition-all"
          >
            Đăng ký
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-[#FF202F]/15 border border-[#FF202F]/30 text-xs text-[#FF202F] font-medium text-center animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Tên đăng nhập - Bắt buộc */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Tên đăng nhập (Username) <span className="text-[#FF202F]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 font-bold text-sm">
                @
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                placeholder="Ví dụ: myaccount, tilua123..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#181818] border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#FF202F] focus:ring-1 focus:ring-[#FF202F] transition-all"
              />
            </div>
          </div>

          {/* Họ và tên - Tuỳ chọn */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Họ và tên <span className="text-neutral-500 text-[11px] font-normal">(Tuỳ chọn)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <User size={16} />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#181818] border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#FF202F] focus:ring-1 focus:ring-[#FF202F] transition-all"
              />
            </div>
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Mật khẩu <span className="text-[#FF202F]">*</span>
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
                placeholder="Tối thiểu 4 ký tự..."
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

          {/* Xác nhận mật khẩu */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Xác nhận mật khẩu <span className="text-[#FF202F]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <Lock size={16} />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#181818] border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#FF202F] focus:ring-1 focus:ring-[#FF202F] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Email - Hoàn toàn không bắt buộc */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center justify-between">
              <span>Email</span>
              <span className="text-emerald-400/90 text-[11px] font-normal">Không bắt buộc (có thể bỏ trống)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com (không bắt buộc)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#181818] border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#FF202F] focus:ring-1 focus:ring-[#FF202F] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D91827] to-[#FF202F] hover:from-[#B81420] hover:to-[#E51322] text-white text-sm font-bold shadow-lg shadow-[#FF202F]/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Hoàn tất Đăng ký'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-neutral-400">
          Đã có tài khoản?{' '}
          <Link href="/auth/login" className="text-[#FF202F] font-semibold hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
