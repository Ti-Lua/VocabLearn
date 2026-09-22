'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { ArrowRight, Sparkles, CheckCircle2, Clock, Info, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES, SupportedLanguageCode } from '@/config/languages';
import { useLanguage } from '@/context/LanguageContext';

export default function LanguageSelectionPage() {
  const router = useRouter();
  const { setLanguage } = useLanguage();
  const languages = SUPPORTED_LANGUAGES;
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

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
        {/* Title Section */}
        <div className="text-center max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FF202F]/10 border border-[#FF202F]/30 text-xs font-bold text-[#FF202F] mb-4 shadow-sm">
            <Sparkles size={14} />
            <span>Nền tảng học từ vựng thực tế</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Bạn muốn học ngôn ngữ nào hôm nay?
          </h1>
          <p className="text-neutral-400 text-sm mt-3 leading-relaxed">
            Chọn lộ trình ngôn ngữ bạn muốn chinh phục. Giáo trình được số hóa chuẩn xác kèm audio giọng đọc AI và phương pháp lặp lại ngắt quãng SRS.
          </p>
        </div>

        {/* 3 Balanced Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {languages.map((lang) => {
            const isActive = lang.status === 'active';

            return (
              <div
                key={lang.id}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`group relative rounded-3xl p-6 sm:p-7 transition-all duration-300 flex flex-col justify-between min-h-[380px] border cursor-pointer ${
                  isActive
                    ? 'bg-[#121212] border-neutral-800 hover:border-[#FF202F]/60 hover:shadow-2xl hover:shadow-[#FF202F]/15 hover:-translate-y-1.5'
                    : 'bg-[#101010] border-neutral-850 hover:border-neutral-700 hover:shadow-lg hover:-translate-y-1'
                }`}
              >
                {/* Ambient glow on hover for active */}
                {isActive && (
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FF202F]/5 rounded-full blur-2xl group-hover:bg-[#FF202F]/15 transition-all pointer-events-none" />
                )}

                {/* Top Section */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-5xl filter drop-shadow-md transform group-hover:scale-110 transition-transform duration-300">
                      {lang.flag}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {lang.badge}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-white group-hover:text-[#FF202F] transition-colors">
                    {lang.name}
                  </h2>
                  <p className="text-sm font-semibold text-neutral-400 mb-3">{lang.nativeName}</p>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono">
                      {lang.levelFramework}
                    </span>
                    <span className="text-[11px] text-neutral-400 truncate">
                      {lang.levels.join(' • ')}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                    {lang.description}
                  </p>
                </div>

                {/* Bottom CTA */}
                <div className="pt-5 border-t border-neutral-800/80 flex items-center justify-between mt-6">
                  {isActive ? (
                    <>
                      <span className="text-xs font-bold text-white group-hover:text-[#FF202F] transition-colors flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-400" />
                        Bắt đầu học
                      </span>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white flex items-center justify-center shadow-lg shadow-[#FF202F]/30 group-hover:scale-110 transition-transform">
                        <ArrowRight size={17} />
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-amber-400/90 flex items-center gap-1.5">
                        <Clock size={14} />
                        Sắp ra mắt (Xem chi tiết)
                      </span>
                      <div className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                        <Info size={15} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Japanese Coming Soon Modal */}
      {showJapaneseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#141414] border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center">
            <button
              onClick={() => setShowJapaneseModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-3xl flex items-center justify-center mx-auto shadow-inner">
              🇯🇵
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Khóa học Tiếng Nhật (JLPT)
              </h3>
              <p className="text-xs text-amber-400 font-semibold mt-1">
                Đang trong quá trình hoàn thiện nội dung
              </p>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-[#1a1a1a] p-3.5 rounded-2xl border border-neutral-800 text-left">
              Hệ thống đang chuẩn bị cơ sở dữ liệu từ vựng JLPT N5 đến N1 kèm Kanji, Romaji, Hiragana và giọng đọc AI chuẩn phát âm Tokyo. Hãy trải nghiệm <strong>Tiếng Anh</strong> và <strong>Tiếng Trung</strong> trước nhé!
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowJapaneseModal(false);
                  handleSelectLanguage('en');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D91827] to-[#FF202F] hover:from-[#B81420] hover:to-[#E51322] text-white text-xs font-bold transition-all shadow-md shadow-[#FF202F]/20"
              >
                🇬🇧 Học Tiếng Anh
              </button>
              <button
                onClick={() => {
                  setShowJapaneseModal(false);
                  handleSelectLanguage('zh');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all border border-neutral-700"
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
