'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useUI } from '@/context/UIContext';
import {
  Flame,
  BookOpen,
  ChevronDown,
  Settings,
  HelpCircle,
  LogOut,
  Plus,
  Check,
  X,
  Menu,
} from 'lucide-react';
import { PROFILES, ProfileKey } from '@/config/personal';

interface AppHeaderProps {
  streakDays?: number;
  onToggleMobileSidebar?: () => void;
}

export function AppHeader({ streakDays = 1, onToggleMobileSidebar }: AppHeaderProps) {
  const router = useRouter();
  const { user, profileKey, switchProfile, logout } = useAuth();
  const { currentLanguage, setLanguage } = useLanguage();
  const { toggleMobileSidebar: toggleFromContext } = useUI();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const handleToggleSidebar = onToggleMobileSidebar || toggleFromContext;

  const handleSelectProfile = (key: ProfileKey) => {
    switchProfile(key);
    setDropdownOpen(false);
    setMobileSheetOpen(false);
  };

  const currentProfile = profileKey === 'tidieu' ? PROFILES.tidieu : PROFILES.tilua;

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#080808]/95 backdrop-blur-xl border-b border-neutral-850/80 px-4 sm:px-6 lg:px-10 h-16 sm:h-20 flex items-center justify-between">
        {/* Left: Brand Logo & Optional Sidebar Hamburger on sub-pages */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {handleToggleSidebar && (
            <button
              type="button"
              onClick={handleToggleSidebar}
              aria-label="Mở menu"
              className="lg:hidden p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-850 transition-colors"
            >
              <Menu size={20} />
            </button>
          )}

          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
            {/* Glowing red logo icon from mockup */}
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#C8102E] via-[#E6192A] to-[#FF202F] flex items-center justify-center text-white shadow-lg shadow-[#FF202F]/35 group-hover:scale-105 transition-transform duration-200">
              <BookOpen size={20} className="stroke-[2.5]" />
            </div>
            <span className="font-black text-lg sm:text-2xl tracking-tight text-white group-hover:text-[#FF202F] transition-colors">
              LearnVocab
            </span>
          </Link>
        </div>

        {/* Right Actions: Responsive for iPhone and iPad */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* iPad / Desktop Language Switcher (Pill Style from Mockup) */}
          <div className="hidden md:flex items-center bg-[#141414] rounded-full p-1 border border-neutral-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                currentLanguage === 'en'
                  ? 'bg-[#FF202F] text-white shadow-md shadow-[#FF202F]/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="text-[11px] font-mono">GB</span>
              <span>EN</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('zh')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                currentLanguage === 'zh'
                  ? 'bg-[#FF202F] text-white shadow-md shadow-[#FF202F]/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="text-[11px] font-mono">VN</span>
              <span>中文</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/languages')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                currentLanguage === 'ja'
                  ? 'bg-[#FF202F] text-white shadow-md shadow-[#FF202F]/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="text-[11px] font-mono">JP</span>
              <span>JA</span>
            </button>
          </div>

          {/* Mobile Streak Badge (iPhone view in Mockup) */}
          <div className="flex md:hidden items-center gap-1 px-2.5 py-1 rounded-full bg-[#1a1213] border border-[#FF202F]/30 text-[#FF202F] text-xs font-extrabold shadow-sm">
            <Flame size={14} className="fill-[#FF202F] animate-pulse" />
            <span>{streakDays || 1}</span>
          </div>

          {/* User Profile Dropdown Button (iPad & Desktop) */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl bg-[#141414] hover:bg-[#1a1a1a] border border-neutral-800 transition-all text-left"
            >
              {profileKey === 'tidieu' ? (
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg flex-shrink-0 shadow-inner">
                  🤖
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[#FF202F]/20 border border-[#FF202F]/40 flex items-center justify-center text-[#FF202F] text-lg flex-shrink-0 shadow-inner">
                  🔥
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white leading-tight">
                  {currentProfile.full_name}
                </span>
                <span className="text-[10px] text-neutral-400 font-medium">@{currentProfile.username}</span>
              </div>
              <ChevronDown size={14} className={`text-neutral-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* iPad / Desktop Dropdown Menu from Mockup */}
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-3 w-72 rounded-3xl bg-[#121212]/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl z-50 p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-white mb-2 px-1">Chuyển tài khoản</h3>
                    <div className="space-y-2">
                      {/* Account 1: Tí Điệu */}
                      <button
                        type="button"
                        onClick={() => handleSelectProfile('tidieu')}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                          profileKey === 'tidieu'
                            ? 'bg-[#181112] border-[#FF202F] shadow-lg shadow-[#FF202F]/15'
                            : 'bg-[#161616] border-neutral-800/80 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl flex-shrink-0">
                            🤖
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Tí Điệu</p>
                            <p className="text-[10px] text-neutral-400">@tidieu</p>
                          </div>
                        </div>
                        {profileKey === 'tidieu' ? (
                          <div className="w-5 h-5 rounded-full bg-[#FF202F] flex items-center justify-center text-white">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-neutral-700" />
                        )}
                      </button>

                      {/* Account 2: Tí Lửa */}
                      <button
                        type="button"
                        onClick={() => handleSelectProfile('tilua')}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                          profileKey === 'tilua'
                            ? 'bg-[#181112] border-[#FF202F] shadow-lg shadow-[#FF202F]/15'
                            : 'bg-[#161616] border-neutral-800/80 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#FF202F]/20 border border-[#FF202F]/40 flex items-center justify-center text-[#FF202F] text-xl flex-shrink-0">
                            🔥
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Tí Lửa</p>
                            <p className="text-[10px] text-neutral-400">@tilua</p>
                          </div>
                        </div>
                        {profileKey === 'tilua' ? (
                          <div className="w-5 h-5 rounded-full bg-[#FF202F] flex items-center justify-center text-white">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-neutral-700" />
                        )}
                      </button>

                      {/* Add account button */}
                      <button
                        type="button"
                        onClick={() => router.push('/profile')}
                        className="w-full py-2.5 px-3 rounded-xl border border-neutral-800 bg-[#161616] hover:bg-[#202020] text-xs font-bold text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus size={14} />
                        <span>Thêm tài khoản</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-neutral-800/80 pt-2 space-y-1">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800/50 text-xs font-semibold transition-colors"
                    >
                      <Settings size={15} className="text-neutral-400" />
                      <span>Cài đặt</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        alert('LearnVocab v1.0 - Hệ thống học từ vựng SRS theo giáo trình chuẩn quốc tế.');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800/50 text-xs font-semibold transition-colors text-left"
                    >
                      <HelpCircle size={15} className="text-neutral-400" />
                      <span>Trợ giúp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#FF202F] hover:bg-[#FF202F]/10 text-xs font-bold transition-colors text-left"
                    >
                      <LogOut size={15} className="text-[#FF202F]" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile Profile Trigger (iPhone view in Mockup) */}
          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            className="md:hidden flex items-center p-1 rounded-xl bg-[#141414] border border-neutral-800 active:scale-95 transition-transform"
          >
            {profileKey === 'tidieu' ? (
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-sm">
                🤖
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#FF202F]/20 border border-[#FF202F]/40 flex items-center justify-center text-[#FF202F] text-sm">
                🔥
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Mobile iOS-style Bottom Sheet (Phone view in Mockup) */}
      {mobileSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop blur overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSheetOpen(false)}
          />

          {/* Slide-up sheet */}
          <div className="relative z-10 w-full bg-[#121212] border-t border-neutral-800 rounded-t-[32px] p-5 pb-8 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 rounded-full bg-neutral-700 mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-1">
              <h3 className="text-base font-black text-white">Chuyển tài khoản</h3>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-850 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Account 1: Tí Điệu */}
              <button
                type="button"
                onClick={() => handleSelectProfile('tidieu')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                  profileKey === 'tidieu'
                    ? 'bg-[#181112] border-[#FF202F] shadow-lg shadow-[#FF202F]/20'
                    : 'bg-[#181818] border-neutral-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl flex-shrink-0">
                    🤖
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Tí Điệu</p>
                    <p className="text-xs text-neutral-400">@tidieu</p>
                  </div>
                </div>
                {profileKey === 'tidieu' ? (
                  <div className="w-6 h-6 rounded-full bg-[#FF202F] flex items-center justify-center text-white">
                    <Check size={14} strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-neutral-700" />
                )}
              </button>

              {/* Account 2: Tí Lửa */}
              <button
                type="button"
                onClick={() => handleSelectProfile('tilua')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                  profileKey === 'tilua'
                    ? 'bg-[#181112] border-[#FF202F] shadow-lg shadow-[#FF202F]/20'
                    : 'bg-[#181818] border-neutral-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#FF202F]/20 border border-[#FF202F]/40 flex items-center justify-center text-[#FF202F] text-2xl flex-shrink-0">
                    🔥
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Tí Lửa</p>
                    <p className="text-xs text-neutral-400">@tilua</p>
                  </div>
                </div>
                {profileKey === 'tilua' ? (
                  <div className="w-6 h-6 rounded-full bg-[#FF202F] flex items-center justify-center text-white">
                    <Check size={14} strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-neutral-700" />
                )}
              </button>

              {/* Add Account Button */}
              <button
                type="button"
                onClick={() => {
                  setMobileSheetOpen(false);
                  router.push('/profile');
                }}
                className="w-full py-3 px-4 rounded-2xl border border-neutral-800 bg-[#181818] text-xs font-bold text-neutral-300 hover:text-white flex items-center justify-center gap-2 active:scale-98 transition-transform"
              >
                <Plus size={16} />
                <span>Thêm tài khoản</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
