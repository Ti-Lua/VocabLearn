'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useUI } from '@/context/UIContext';
import { Accent, getAccent, setAccent } from '@/lib/audio';
import { Flame, BarChart2, BookOpen, Globe2, ChevronDown, User as UserIcon, Menu } from 'lucide-react';

interface AppHeaderProps {
  streakDays?: number;
  onToggleMobileSidebar?: () => void;
}

export function AppHeader({ streakDays = 0, onToggleMobileSidebar }: AppHeaderProps) {
  const { user, profileKey, switchProfile } = useAuth();
  const { currentLanguage, setLanguage, isChinese } = useLanguage();
  const { toggleMobileSidebar: toggleFromContext } = useUI();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentAccent, setCurrentAccentState] = useState<Accent>(getAccent());

  const handleToggleSidebar = onToggleMobileSidebar || toggleFromContext;

  const handleAccentChange = (accent: Accent) => {
    setAccent(accent);
    setCurrentAccentState(accent);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0d0d0d]/90 backdrop-blur-md border-b border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left: Hamburger (Mobile/Tablet), Brand Logo, and Account Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {/* Hamburger button visible on mobile and tablet */}
          <button
            type="button"
            onClick={handleToggleSidebar}
            aria-label="Mở menu danh mục"
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors focus:outline-none flex-shrink-0"
          >
            <Menu size={20} />
          </button>

          {/* Logo brand linking to home language menu */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#D91827] to-[#FF202F] flex items-center justify-center text-white shadow-lg shadow-[#FF202F]/25 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
              <BookOpen size={17} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-lg tracking-tight text-white group-hover:text-[#FF202F] transition-colors">
                  LearnVocab
                </span>
                <span className="hidden md:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#FF202F]/20 text-[#FF202F] border border-[#FF202F]/30">
                  {profileKey === 'tidieu' ? 'BY TÍ ĐIỆU' : 'BY TÍ LỬA'}
                </span>
              </div>
            </div>
          </Link>

          {/* Segmented Account Switcher (Tí Lửa | Tí Điệu) - Responsive compact mode on mobile */}
          <div className="flex items-center bg-[#181818] rounded-xl p-0.5 border border-neutral-800 text-xs font-semibold flex-shrink-0">
            <button
              type="button"
              onClick={() => switchProfile('tilua')}
              title="Chuyển sang tài khoản Tí Lửa"
              className={`px-1.5 sm:px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 ${
                profileKey === 'tilua'
                  ? 'bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white shadow font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="text-xs">🔥</span>
              <span className="hidden sm:inline text-[11px] sm:text-xs">Tí Lửa</span>
            </button>
            <button
              type="button"
              onClick={() => switchProfile('tidieu')}
              title="Chuyển sang tài khoản Tí Điệu"
              className={`px-1.5 sm:px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 ${
                profileKey === 'tidieu'
                  ? 'bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white shadow font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="text-xs">🌸</span>
              <span className="hidden sm:inline text-[11px] sm:text-xs">Tí Điệu</span>
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 flex-shrink-0">
          {/* Language Switcher */}
          <div className="flex items-center bg-[#181818] rounded-xl p-0.5 border border-neutral-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              title="Học Tiếng Anh"
              className={`px-1.5 sm:px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                currentLanguage === 'en'
                  ? 'bg-[#FF202F] text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>🇬🇧</span>
              <span className="hidden md:inline">EN</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('zh')}
              title="Học Tiếng Trung HSK"
              className={`px-1.5 sm:px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                currentLanguage === 'zh'
                  ? 'bg-[#FF202F] text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>🇨🇳</span>
              <span className="hidden md:inline">中文</span>
            </button>
            <Link
              href="/languages"
              title="Tiếng Nhật (Sắp ra mắt)"
              className={`px-1.5 sm:px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                currentLanguage === 'ja'
                  ? 'bg-[#FF202F] text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>🇯🇵</span>
              <span className="hidden md:inline text-[11px]">JA</span>
            </Link>
          </div>

          {/* Pronunciation Accent Toggle (English only) */}
          {!isChinese && (
            <div className="hidden lg:flex items-center bg-[#181818] rounded-xl p-0.5 border border-neutral-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleAccentChange('en-GB')}
                title="Phát âm chuẩn Anh - Anh (UK)"
                className={`px-2 py-1 rounded-lg transition-all ${
                  currentAccent === 'en-GB'
                    ? 'bg-neutral-700 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                UK
              </button>
              <button
                type="button"
                onClick={() => handleAccentChange('en-US')}
                title="Phát âm chuẩn Anh - Mỹ (US)"
                className={`px-2 py-1 rounded-lg transition-all ${
                  currentAccent === 'en-US'
                    ? 'bg-neutral-700 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                US
              </button>
            </div>
          )}

          {/* Personal Profile Streak Section */}
          <Link
            href="/statistics"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg bg-[#1a1415] border border-[#FF202F]/30 text-xs font-bold text-[#FF202F] hover:bg-[#FF202F]/10 transition-colors"
            title="Chuỗi ngày học liên tục"
          >
            <Flame size={14} className="fill-[#FF202F] animate-pulse" />
            <span>{streakDays || 1}</span>
            <span className="hidden sm:inline">ngày</span>
          </Link>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#181818] border border-transparent hover:border-neutral-800 transition-all text-left"
            >
              {user.avatar_url ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-neutral-700 bg-neutral-800">
                  <Image src={user.avatar_url} alt={user.full_name || 'User'} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#FF202F]/20 border border-[#FF202F]/40 flex items-center justify-center text-[#FF202F]">
                  <UserIcon size={16} />
                </div>
              )}
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-semibold text-white leading-tight">
                  {user.full_name || (profileKey === 'tidieu' ? 'Tí Điệu' : 'Tí Lửa')}
                </span>
                <span className="text-[10px] text-neutral-400">@{user.username || profileKey}</span>
              </div>
              <ChevronDown size={14} className="text-neutral-400" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#121212] border border-neutral-800 shadow-2xl z-50 py-1 text-sm">
                  <div className="px-4 py-2 border-b border-neutral-800/80">
                    <p className="text-xs text-neutral-400">Tài khoản học tập</p>
                    <p className="text-sm font-semibold text-white truncate">
                      {user.full_name || (profileKey === 'tidieu' ? 'Tí Điệu' : 'Tí Lửa')}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors"
                  >
                    <UserIcon size={16} className="text-neutral-400" />
                    <span>Hồ sơ & Sao lưu</span>
                  </Link>
                  <Link
                    href="/languages"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors"
                  >
                    <Globe2 size={16} className="text-neutral-400" />
                    <span>Đổi ngôn ngữ</span>
                  </Link>
                  <Link
                    href="/statistics"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors"
                  >
                    <BarChart2 size={16} className="text-neutral-400" />
                    <span>Thống kê học tập</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
