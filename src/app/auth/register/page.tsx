'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#FF202F] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-400">Đang chuyển hướng vào Dashboard...</p>
      </div>
    </div>
  );
}
