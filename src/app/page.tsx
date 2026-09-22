'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D91827] to-[#FF202F] flex items-center justify-center animate-bounce shadow-xl shadow-[#FF202F]/30">
          <span className="text-white font-black text-xl">L</span>
        </div>
        <p className="text-neutral-400 text-sm font-medium tracking-wide">
          Đang mở LearnVocab...
        </p>
      </div>
    </div>
  );
}
