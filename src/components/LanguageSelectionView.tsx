'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { CircularFlag } from '@/components/CircularFlag';
import { ArrowRight, Rocket, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { SupportedLanguageCode } from '@/config/languages';

export function LanguageSelectionView() {
  const router = useRouter();
  const { setLanguage } = useLanguage();
  const [showJapaneseModal, setShowJapaneseModal] = useState(false);

  const handleSelectLanguage = (code: SupportedLanguageCode) => {
    if (code === 'ja') {
      setShowJapaneseModal(true);
      return;
    }
    setLanguage(code);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col selection:bg-[#FF202F] selection:text-white">
      <AppHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 flex flex-col items-center justify-center w-full">
        {/* Title Section (Matching Mockup with 'hôm nay?' highlighted in Red) */}
        <div className="text-center max-w-2xl mb-8 sm:mb-12">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e0e11] border border-[#FF202F]/40 text-xs font-bold text-[#FF202F] mb-4 shadow-sm shadow-[#FF202F]/15">
            <Rocket size={14} className="text-[#FF202F]" />
            <span>Nền tảng học từ vựng thực tế</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.2]">
            Bạn muốn học <br />
            ngôn ngữ nào <br />
            <span className="text-[#FF202F] drop-shadow-[0_0_25px_rgba(255,32,47,0.4)]">
              hôm nay?
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-neutral-400 text-xs sm:text-sm mt-3.5 leading-relaxed max-w-lg mx-auto">
            Chọn lộ trình ngôn ngữ bạn muốn chinh phục. Giáo trình được số hóa chuẩn xác kèm audio giọng đọc AI và phương pháp lặp lại ngắt quãng SRS.
          </p>
        </div>

        {/* ========================================================= */}
        {/* 1. IPHONE VIEW (Mobile Stacked Horizontal Cards)          */}
        {/* ========================================================= */}
        <div className="md:hidden flex flex-col gap-3.5 w-full max-w-md">
          {/* Card 1: English */}
          <div
            onClick={() => handleSelectLanguage('en')}
            className="group flex items-center justify-between p-4 rounded-3xl bg-[#141414] border border-neutral-800/80 hover:border-[#FF202F]/60 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <CircularFlag code="en" size={46} className="shadow-md" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-white group-hover:text-[#FF202F] transition-colors">
                    Tiếng Anh
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
                    Sẵn sàng học
                  </span>
                </div>
                <p className="text-xs text-neutral-400">English</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    CEFR
                  </span>
                  <span className="text-[10px] text-neutral-400 truncate">
                    A1 - A2 - B1 - B2 - C1 - C2
                  </span>
                </div>
              </div>
            </div>

            <div className="w-10 h-10 rounded-full bg-[#FF202F] text-white flex items-center justify-center shadow-lg shadow-[#FF202F]/40 flex-shrink-0 ml-2">
              <ArrowRight size={18} strokeWidth={2.5} />
            </div>
          </div>

          {/* Card 2: Chinese */}
          <div
            onClick={() => handleSelectLanguage('zh')}
            className="group flex items-center justify-between p-4 rounded-3xl bg-[#141414] border border-neutral-800/80 hover:border-[#FF202F]/60 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <CircularFlag code="zh" size={46} className="shadow-md" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-white group-hover:text-[#FF202F] transition-colors">
                    Tiếng Trung
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
                    Sẵn sàng học
                  </span>
                </div>
                <p className="text-xs text-neutral-400">中文</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    HSK
                  </span>
                  <span className="text-[10px] text-neutral-400 truncate">
                    HSK 1 - HSK 2 - HSK 3 - HSK 4
                  </span>
                </div>
              </div>
            </div>

            <div className="w-10 h-10 rounded-full bg-[#FF202F] text-white flex items-center justify-center shadow-lg shadow-[#FF202F]/40 flex-shrink-0 ml-2">
              <ArrowRight size={18} strokeWidth={2.5} />
            </div>
          </div>

          {/* Card 3: Japanese */}
          <div
            onClick={() => handleSelectLanguage('ja')}
            className="group flex items-center justify-between p-4 rounded-3xl bg-[#141414] border border-neutral-800/80 hover:border-neutral-700 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <CircularFlag code="ja" size={46} className="shadow-md" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-white">Tiếng Nhật</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-400">
                    Sắp ra mắt
                  </span>
                </div>
                <p className="text-xs text-neutral-400">日本語</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    JLPT
                  </span>
                  <span className="text-[10px] text-neutral-400 truncate">
                    N5 - N4 - N3 - N2 - N1
                  </span>
                </div>
              </div>
            </div>

            <div className="w-10 h-10 rounded-full bg-neutral-800/90 text-neutral-400 border border-neutral-700/60 flex items-center justify-center flex-shrink-0 ml-2">
              <ArrowRight size={18} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. IPAD / TABLET & DESKTOP VIEW (3 Artistic Cards Grid)    */}
        {/* ========================================================= */}
        <div className="hidden md:grid md:grid-cols-3 gap-5 lg:gap-7 w-full max-w-5xl">
          {/* Card 1: Tiếng Anh (English) */}
          <div
            onClick={() => handleSelectLanguage('en')}
            className="group relative rounded-[32px] border border-neutral-850 bg-[#121212] overflow-hidden flex flex-col justify-between min-h-[490px] hover:border-[#FF202F]/70 hover:shadow-[0_0_50px_rgba(255,32,47,0.18)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer"
          >
            {/* Top Text Details */}
            <div className="p-6 sm:p-7 space-y-3 z-10">
              <div className="flex items-center gap-3.5 mb-2">
                <CircularFlag code="en" size={54} className="shadow-lg transform group-hover:scale-105 transition-transform" />
                <div>
                  <h2 className="text-2xl font-black text-white group-hover:text-[#FF202F] transition-colors tracking-tight">
                    Tiếng Anh
                  </h2>
                  <p className="text-xs text-neutral-400 font-medium">English</p>
                </div>
              </div>

              <div>
                <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
                  Sẵn sàng học
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  CEFR
                </span>
                <span className="text-xs text-neutral-400">
                  A1 - A2 - B1 - B2 - C1 - C2
                </span>
              </div>
            </div>

            {/* Bottom Atmospheric Artwork Container */}
            <div className="relative w-full h-64 mt-auto overflow-hidden">
              <Image
                src="/images/card_bg_english.jpg"
                alt="English London Illustration"
                fill
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
                priority
              />
              {/* Gradient Blend from Card Top */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#121212]/30 to-[#121212] pointer-events-none" />

              {/* Floating Bottom-Right Red Arrow Button */}
              <div className="absolute bottom-5 right-5 z-20 w-13 h-13 rounded-full bg-[#FF202F] text-white flex items-center justify-center shadow-2xl shadow-[#FF202F]/60 group-hover:scale-110 active:scale-95 transition-all duration-300">
                <ArrowRight size={22} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Card 2: Tiếng Trung (Chinese) */}
          <div
            onClick={() => handleSelectLanguage('zh')}
            className="group relative rounded-[32px] border border-neutral-850 bg-[#121212] overflow-hidden flex flex-col justify-between min-h-[490px] hover:border-[#FF202F]/70 hover:shadow-[0_0_50px_rgba(255,32,47,0.18)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer"
          >
            {/* Top Text Details */}
            <div className="p-6 sm:p-7 space-y-3 z-10">
              <div className="flex items-center gap-3.5 mb-2">
                <CircularFlag code="zh" size={54} className="shadow-lg transform group-hover:scale-105 transition-transform" />
                <div>
                  <h2 className="text-2xl font-black text-white group-hover:text-[#FF202F] transition-colors tracking-tight">
                    Tiếng Trung
                  </h2>
                  <p className="text-xs text-neutral-400 font-medium">中文</p>
                </div>
              </div>

              <div>
                <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
                  Sẵn sàng học
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  HSK
                </span>
                <span className="text-xs text-neutral-400">
                  HSK 1 - HSK 2 - HSK 3 - HSK 4 HSK 5 - HSK 6
                </span>
              </div>
            </div>

            {/* Bottom Atmospheric Artwork Container */}
            <div className="relative w-full h-64 mt-auto overflow-hidden">
              <Image
                src="/images/card_bg_chinese.jpg"
                alt="Chinese Pagoda Illustration"
                fill
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
                priority
              />
              {/* Gradient Blend from Card Top */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#121212]/30 to-[#121212] pointer-events-none" />

              {/* Floating Bottom-Right Red Arrow Button */}
              <div className="absolute bottom-5 right-5 z-20 w-13 h-13 rounded-full bg-[#FF202F] text-white flex items-center justify-center shadow-2xl shadow-[#FF202F]/60 group-hover:scale-110 active:scale-95 transition-all duration-300">
                <ArrowRight size={22} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Card 3: Tiếng Nhật (Japanese - Coming Soon) */}
          <div
            onClick={() => handleSelectLanguage('ja')}
            className="group relative rounded-[32px] border border-neutral-850 bg-[#121212] overflow-hidden flex flex-col justify-between min-h-[490px] hover:border-neutral-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
            {/* Top Text Details */}
            <div className="p-6 sm:p-7 space-y-3 z-10">
              <div className="flex items-center gap-3.5 mb-2">
                <CircularFlag code="ja" size={54} className="shadow-lg transform group-hover:scale-105 transition-transform" />
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Tiếng Nhật
                  </h2>
                  <p className="text-xs text-neutral-400 font-medium">日本語</p>
                </div>
              </div>

              <div>
                <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-400">
                  Sắp ra mắt
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  JLPT
                </span>
                <span className="text-xs text-neutral-400">
                  N5 - N4 - N3 - N2 - N1
                </span>
              </div>
            </div>

            {/* Bottom Atmospheric Artwork Container */}
            <div className="relative w-full h-64 mt-auto overflow-hidden">
              <Image
                src="/images/card_bg_japanese.jpg"
                alt="Japanese Pagoda Illustration"
                fill
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              {/* Gradient Blend from Card Top */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#121212]/30 to-[#121212] pointer-events-none" />

              {/* Floating Bottom-Right Dark Arrow Button */}
              <div className="absolute bottom-5 right-5 z-20 w-13 h-13 rounded-full bg-[#1e1e1e]/90 text-neutral-400 border border-neutral-700/60 flex items-center justify-center">
                <ArrowRight size={22} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Japanese Coming Soon Modal */}
      {showJapaneseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#141414] border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center">
            <button
              type="button"
              onClick={() => setShowJapaneseModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-3xl flex items-center justify-center mx-auto shadow-inner">
              🇯🇵
            </div>

            <div>
              <h3 className="text-xl font-black text-white">
                Khóa học Tiếng Nhật (JLPT)
              </h3>
              <p className="text-xs text-amber-400 font-bold mt-1">
                Đang trong quá trình hoàn thiện nội dung
              </p>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-[#1a1a1a] p-3.5 rounded-2xl border border-neutral-800 text-left">
              Hệ thống đang chuẩn bị cơ sở dữ liệu từ vựng JLPT N5 đến N1 kèm Kanji, Romaji, Hiragana và giọng đọc AI chuẩn phát âm Tokyo. Hãy trải nghiệm <strong>Tiếng Anh</strong> và <strong>Tiếng Trung</strong> trước nhé!
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowJapaneseModal(false);
                  handleSelectLanguage('en');
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white text-xs font-bold transition-all shadow-md shadow-[#FF202F]/20"
              >
                🇬🇧 Học Tiếng Anh
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowJapaneseModal(false);
                  handleSelectLanguage('zh');
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all border border-neutral-700"
              >
                🇨🇳 Học Tiếng Trung
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
