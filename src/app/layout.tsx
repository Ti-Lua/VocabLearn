import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { UIProvider } from '@/context/UIContext';
import { MobileBottomNav } from '@/components/MobileBottomNav';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#080808',
};

export const metadata: Metadata = {
  title: 'LearnVocab by Tí Lửa - Học Từ Vựng Thực Tế',
  description: 'Học từ vựng tiếng Anh & tiếng Trung HSK với Flashcard, Adaptive Practice và Spaced Repetition.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${inter.variable} dark`}>
      <body className="bg-[#080808] text-white min-h-screen flex flex-col antialiased selection:bg-[#FF202F]/30 selection:text-white">
        <AuthProvider>
          <LanguageProvider>
            <UIProvider>
              {children}
              <MobileBottomNav />
            </UIProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
