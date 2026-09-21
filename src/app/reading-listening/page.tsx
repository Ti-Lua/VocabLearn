'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { AudioButton } from '@/components/AudioButton';
import { Article, ArticleVocab } from '@/types';
import { getTTSAudioUrl, getAudioSpeed, setAudioSpeed, configureAudioSpeed } from '@/lib/audio';
import { GOOGLE_TTS_VOICES, GoogleVoiceId } from '@/lib/gemini';
import {
  BookOpen,
  Sparkles,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  ExternalLink,
  Calendar,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function ReadingListeningPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Reader layout mode: 'bilingual' | 'english' | 'vietnamese'
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'english' | 'vietnamese'>('bilingual');

  // Mobile/Tablet tab switch: 'article' | 'vocab'
  const [mobileTab, setMobileTab] = useState<'article' | 'vocab'>('article');

  // Active highlighted vocabulary modal
  const [activeVocab, setActiveVocab] = useState<ArticleVocab | null>(null);

  // Google AI Studio Audio playback state
  const [selectedVoice, setSelectedVoice] = useState<GoogleVoiceId>('Charon'); // Default Charon for BBC News
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [playingParagraphIndex, setPlayingParagraphIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load articles and sync audio speed on mount
  useEffect(() => {
    fetchArticles();
    const currentSpeed = getAudioSpeed();
    setPlaybackSpeed(currentSpeed);

    const handleSpeedEvent = (e: Event) => {
      const custom = e as CustomEvent<{ speed: number }>;
      if (custom.detail?.speed !== undefined) {
        setPlaybackSpeed(custom.detail.speed);
        if (audioRef.current) {
          audioRef.current.defaultPlaybackRate = custom.detail.speed;
          audioRef.current.playbackRate = custom.detail.speed;
        }
      }
    };

    window.addEventListener('audio_speed_change', handleSpeedEvent);
    return () => window.removeEventListener('audio_speed_change', handleSpeedEvent);
  }, []);

  const handleSpeedSelect = (speed: number) => {
    setPlaybackSpeed(speed);
    setAudioSpeed(speed);
    if (audioRef.current) {
      audioRef.current.defaultPlaybackRate = speed;
      audioRef.current.playbackRate = speed;
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/articles');
      const data = await res.json();
      if (data.articles && data.articles.length > 0) {
        setArticles(data.articles);
        setSelectedArticle(data.articles[0]);
      }
    } catch (e) {
      console.error('Failed to load articles:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncBBCBot = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/articles', { method: 'POST' });
      const data = await res.json();
      if (data.article) {
        setArticles((prev) => [data.article, ...prev.filter((a) => a.id !== data.article.id)]);
        setSelectedArticle(data.article);
        setSyncMessage('Đã cập nhật và dịch bài báo BBC mới nhất!');
        setTimeout(() => setSyncMessage(null), 4000);
      }
    } catch (e) {
      console.error('BBC Bot sync failed:', e);
      setSyncMessage('Có lỗi khi kết nối BBC. Vui lòng thử lại.');
    } finally {
      setSyncing(false);
    }
  };

  // Play a specific paragraph with Google AI Studio Voice
  const handlePlayParagraph = (index: number) => {
    if (!selectedArticle) return;
    const p = selectedArticle.paragraphs[index];
    if (!p) return;

    // If already playing this paragraph, toggle pause/resume
    if (playingParagraphIndex === index && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const ttsUrl = getTTSAudioUrl(p.en, selectedVoice);
    const audio = new Audio(ttsUrl);
    configureAudioSpeed(audio, playbackSpeed);
    audioRef.current = audio;

    setPlayingParagraphIndex(index);
    setIsPlaying(true);

    audio.onended = () => {
      // Auto proceed to next paragraph if available
      if (index + 1 < selectedArticle.paragraphs.length) {
        handlePlayParagraph(index + 1);
      } else {
        setPlayingParagraphIndex(null);
        setIsPlaying(false);
      }
    };

    audio.onerror = () => {
      setPlayingParagraphIndex(null);
      setIsPlaying(false);
    };

    audio.play().catch((err) => {
      console.warn('Audio play error:', err);
      setIsPlaying(false);
      setPlayingParagraphIndex(null);
    });
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setPlayingParagraphIndex(null);
  };

  // Helper to render English text with highlighted interactive vocabulary terms
  const renderHighlightedEnglish = (text: string, vocabList: ArticleVocab[]) => {
    if (!vocabList || vocabList.length === 0) return <span>{text}</span>;

    // Sort words by length descending to match phrases before single words
    const sortedVocabs = [...vocabList].sort((a, b) => b.word.length - a.word.length);

    // Build regex pattern matching all vocab words
    const escapedWords = sortedVocabs
      .map((v) => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    if (!escapedWords) return <span>{text}</span>;

    const regex = new RegExp(`\\b(${escapedWords})\\b`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) => {
          const matchedVocab = sortedVocabs.find(
            (v) => v.word.toLowerCase() === part.toLowerCase()
          );

          if (matchedVocab) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveVocab(matchedVocab)}
                className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-[#FF202F]/15 hover:bg-[#FF202F]/30 text-[#FF5A67] hover:text-white font-semibold border-b-2 border-[#FF202F] transition-all cursor-pointer group"
                title="Nhấn để xem giải nghĩa & phát âm Google AI"
              >
                <span>{part}</span>
                <span className="ml-1 opacity-0 group-hover:opacity-100 text-[10px] text-[#FF202F] transition-opacity">
                  ★
                </span>
              </button>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col text-neutral-200">
      <AppHeader />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-8 space-y-6 sm:space-y-8 w-full min-w-0">
          {/* Top Banner: BBC World News AI Bot */}
          <div className="relative rounded-3xl bg-gradient-to-r from-[#141414] via-[#1a1213] to-[#121212] border border-neutral-800 p-6 sm:p-8 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF202F]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF202F]/15 text-[#FF202F] text-xs font-bold border border-[#FF202F]/30">
                    <Sparkles size={13} className="animate-spin" style={{ animationDuration: '4s' }} />
                    <span>BBC World News AI Bot</span>
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">Google Studio AI Powered</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Reading &amp; Listening Daily
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
                  Bot AI tự động cập nhật báo thế giới uy tín từ BBC mỗi ngày, dịch sát nghĩa chuẩn xác sang tiếng Việt, phân tích từ vựng đắt giá và phát âm bằng Google Studio AI.
                </p>
              </div>

              {/* Action Button: Fetch Daily BBC */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleSyncBBCBot}
                  disabled={syncing}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs sm:text-sm font-bold shadow-xl shadow-[#FF202F]/20 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? 'Đang phân tích BBC & dịch AI...' : 'Cập nhật bài báo BBC hôm nay'}</span>
                </button>
              </div>
            </div>

            {syncMessage && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{syncMessage}</span>
              </div>
            )}
          </div>

          {/* Audio Player & Reader Settings Bar */}
          {selectedArticle && (
            <div className="sticky top-2 z-20 rounded-2xl bg-[#121212]/95 backdrop-blur-md border border-neutral-800 p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
              {/* Play / Pause & Paragraph Status */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isPlaying) {
                      handleStopAudio();
                    } else {
                      handlePlayParagraph(playingParagraphIndex ?? 0);
                    }
                  }}
                  className="w-11 h-11 rounded-full bg-[#FF202F] hover:bg-[#D91827] text-white flex items-center justify-center shadow-lg shadow-[#FF202F]/25 transition-transform active:scale-95"
                  title={isPlaying ? 'Tạm dừng đọc' : 'Đọc toàn bài báo'}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {isPlaying
                        ? `Đang đọc đoạn ${(playingParagraphIndex ?? 0) + 1} / ${selectedArticle.paragraphs.length}`
                        : 'Sẵn sàng nghe báo đọc'}
                    </span>
                    {isPlaying && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF202F] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF202F]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400">Google AI Studio • {selectedVoice}</span>
                </div>
              </div>

              {/* Voice & Speed Controls */}
              <div className="flex items-center gap-3">
                {/* Voice Selector */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <Volume2 size={14} className="text-[#FF202F]" />
                  <span className="hidden sm:inline">Giọng đọc:</span>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value as GoogleVoiceId)}
                    className="bg-[#181818] border border-neutral-800 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#FF202F]"
                  >
                    {GOOGLE_TTS_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speed Switcher */}
                <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-xl border border-neutral-800 text-[11px] font-bold">
                  {[0.5, 0.75, 1.0, 1.25, 1.5].map((speed) => {
                    const isActive = Math.abs(playbackSpeed - speed) < 0.05;
                    return (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => handleSpeedSelect(speed)}
                        title={`Tốc độ đọc ${speed}x`}
                        className={`px-2 py-0.5 rounded-lg transition-all active:scale-95 ${
                          isActive
                            ? 'bg-[#FF202F] text-white shadow-sm shadow-[#FF202F]/30 scale-105'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {speed === 1.0 ? '1x' : `${speed}x`}
                      </button>
                    );
                  })}
                </div>

                {/* Display Mode Switcher */}
                <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-xl border border-neutral-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDisplayMode('bilingual')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      displayMode === 'bilingual'
                        ? 'bg-[#FF202F] text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Song ngữ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode('english')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      displayMode === 'english'
                        ? 'bg-[#FF202F] text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode('vietnamese')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      displayMode === 'vietnamese'
                        ? 'bg-[#FF202F] text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    VI
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Tab Switcher (Visible on Mobile & Tablet) */}
          {selectedArticle && !loading && (
            <div className="flex lg:hidden items-center justify-center p-1 bg-[#141414] rounded-2xl border border-neutral-800 gap-1 shadow-md">
              <button
                type="button"
                onClick={() => setMobileTab('article')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  mobileTab === 'article'
                    ? 'bg-[#FF202F] text-white shadow-lg shadow-[#FF202F]/25'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <BookOpen size={15} />
                <span>Nội dung bài báo</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('vocab')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  mobileTab === 'vocab'
                    ? 'bg-[#FF202F] text-white shadow-lg shadow-[#FF202F]/25'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sparkles size={15} />
                <span>Từ vựng đắt giá ({selectedArticle.highlighted_vocab.length})</span>
              </button>
            </div>
          )}

          {/* Article Reader Body */}
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw size={32} className="animate-spin mx-auto text-[#FF202F]" />
              <p className="text-sm text-neutral-400">Đang tải bài báo BBC từ hệ thống AI...</p>
            </div>
          ) : selectedArticle ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Main Reading Section (2 Columns on Desktop) */}
              <div className={`lg:col-span-2 space-y-6 ${mobileTab === 'article' ? 'block' : 'hidden lg:block'}`}>
                {/* Article Card */}
                <article className="rounded-3xl bg-[#121212] border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-xl">
                  {/* Article Meta Header */}
                  <div className="space-y-3 border-b border-neutral-800/80 pb-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-red-600/15 text-[#FF202F] text-[11px] font-extrabold border border-[#FF202F]/30 uppercase tracking-wider">
                        {selectedArticle.source_name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 text-[11px] font-bold">
                        {selectedArticle.topic}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-850 text-neutral-400 text-[11px] font-mono">
                        Level: {selectedArticle.level}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-400 ml-auto">
                        <Clock size={12} />
                        <span>{selectedArticle.reading_time_min} phút đọc</span>
                      </div>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                      {selectedArticle.title_en}
                    </h2>

                    <h3 className="text-base sm:text-lg font-bold text-[#FF5A67] leading-snug">
                      {selectedArticle.title_vi}
                    </h3>

                    {selectedArticle.published_date && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 pt-1">
                        <Calendar size={13} />
                        <span>Thời sự quốc tế • {selectedArticle.published_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Summary Box */}
                  {selectedArticle.summary_vi && (
                    <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-xs sm:text-sm text-neutral-300 leading-relaxed space-y-1">
                      <span className="font-bold text-[#FF202F] uppercase text-[10px] tracking-wider block">
                        Tóm tắt nhanh:
                      </span>
                      <p>{selectedArticle.summary_vi}</p>
                    </div>
                  )}

                  {/* Paragraphs Flow */}
                  <div className="space-y-6 pt-2">
                    {selectedArticle.paragraphs.map((p, idx) => {
                      const isCurrentlyPlaying = playingParagraphIndex === idx && isPlaying;
                      return (
                        <div
                          key={idx}
                          className={`group relative p-4 sm:p-5 rounded-2xl transition-all duration-300 border ${
                            isCurrentlyPlaying
                              ? 'bg-[#1a1213] border-[#FF202F]/60 shadow-lg shadow-[#FF202F]/10 ring-1 ring-[#FF202F]/30'
                              : 'bg-[#151515] border-neutral-800/80 hover:border-neutral-700'
                          }`}
                        >
                          {/* Paragraph Play Button */}
                          <button
                            type="button"
                            onClick={() => handlePlayParagraph(idx)}
                            className="absolute top-4 right-4 p-2 rounded-xl bg-neutral-850 hover:bg-[#FF202F] text-neutral-400 hover:text-white transition-colors"
                            title="Nghe đoạn này bằng Google AI Voice"
                          >
                            {isCurrentlyPlaying ? (
                              <Pause size={14} className="text-white" />
                            ) : (
                              <Play size={14} />
                            )}
                          </button>

                          {/* Paragraph Number Badge */}
                          <div className="text-[10px] font-mono font-bold text-neutral-400 mb-2">
                            PARAGRAPH {idx + 1}
                          </div>

                          {/* English Text with clickable highlights */}
                          {(displayMode === 'bilingual' || displayMode === 'english') && (
                            <p className="text-sm sm:text-base text-neutral-100 font-medium leading-relaxed pr-8">
                              {renderHighlightedEnglish(p.en, selectedArticle.highlighted_vocab)}
                            </p>
                          )}

                          {/* Vietnamese Translation */}
                          {(displayMode === 'bilingual' || displayMode === 'vietnamese') && (
                            <div
                              className={`text-xs sm:text-sm text-neutral-400 leading-relaxed font-normal ${
                                displayMode === 'bilingual'
                                  ? 'mt-3 pt-3 border-t border-neutral-800/60'
                                  : ''
                              }`}
                            >
                              <span className="text-[11px] font-bold text-[#FF202F]/80 mr-1.5">
                                [Bản dịch sát nghĩa]:
                              </span>
                              {p.vi}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer links */}
                  {selectedArticle.original_url && (
                    <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                      <span>Nguồn báo chí chính thức: BBC World Service</span>
                      <a
                        href={selectedArticle.original_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#FF202F] hover:underline font-semibold"
                      >
                        <span>Xem bài gốc trên BBC</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  )}
                </article>
              </div>

              {/* Right Sidebar: Highlighted English Vocabulary Masterlist */}
              <div className={`space-y-6 ${mobileTab === 'vocab' ? 'block' : 'hidden lg:block'}`}>
                <div className="sticky top-24 space-y-6">
                  <div className="rounded-3xl bg-[#121212] border border-neutral-800 p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-[#FF202F]" />
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          Từ vựng đắt giá ({selectedArticle.highlighted_vocab.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-neutral-400">Click để nghe phát âm</span>
                    </div>

                    <p className="text-xs text-neutral-400">
                      Các collocations, idioms và thuật ngữ nâng cao do AI trích xuất và giải nghĩa từ bài báo hôm nay:
                    </p>

                    <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                      {selectedArticle.highlighted_vocab.map((v, i) => (
                        <div
                          key={i}
                          onClick={() => setActiveVocab(v)}
                          className="p-3.5 rounded-2xl bg-[#161616] hover:bg-[#1f1617] border border-neutral-800 hover:border-[#FF202F]/50 transition-all cursor-pointer group space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white group-hover:text-[#FF5A67] transition-colors">
                              {v.word}
                            </h4>
                            <AudioButton word={v.word} size="sm" />
                          </div>

                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-[#FF202F] font-mono">{v.phonetic}</span>
                            <span className="text-neutral-400 font-semibold uppercase text-[10px] px-1.5 py-0.2 rounded bg-neutral-800">
                              {v.part_of_speech}
                            </span>
                          </div>

                          <p className="text-xs text-neutral-200 font-medium">
                            {v.vi_meaning}
                          </p>

                          <p className="text-[11px] text-neutral-400 line-clamp-2 italic">
                            &ldquo;{v.context_sentence}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Previous Articles History */}
                  {articles.length > 1 && (
                    <div className="rounded-2xl bg-[#121212] border border-neutral-800 p-4 space-y-3">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        Kho lưu trữ bài báo BBC
                      </h4>
                      <div className="space-y-2">
                        {articles.map((art) => (
                          <button
                            key={art.id}
                            type="button"
                            onClick={() => setSelectedArticle(art)}
                            className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                              selectedArticle.id === art.id
                                ? 'bg-[#FF202F]/15 border-[#FF202F]/40 text-white font-bold'
                                : 'bg-[#181818] border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <p className="line-clamp-1">{art.title_en}</p>
                            <span className="text-[10px] text-neutral-400 block mt-0.5">
                              {art.published_date}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center space-y-4">
              <BookOpen size={40} className="mx-auto text-neutral-600" />
              <p className="text-neutral-400">Chưa có bài báo BBC nào được tải về.</p>
              <button
                type="button"
                onClick={handleSyncBBCBot}
                className="px-5 py-2.5 rounded-xl bg-[#FF202F] text-white text-xs font-bold"
              >
                Nhấn để tải bài báo BBC đầu tiên
              </button>
            </div>
          )}

          {/* Active Highlighted Vocab Modal */}
          {activeVocab && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="relative w-full max-w-lg rounded-3xl bg-[#141414] border border-neutral-700 p-6 sm:p-8 space-y-5 shadow-2xl shadow-[#FF202F]/10">
                <button
                  type="button"
                  onClick={() => setActiveVocab(null)}
                  className="absolute top-5 right-5 p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#FF202F]/15 text-[#FF202F] border border-[#FF202F]/30">
                      {activeVocab.part_of_speech}
                    </span>
                    <span className="text-xs text-neutral-400">Google AI Pronunciation</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black text-white">{activeVocab.word}</h3>
                    <AudioButton word={activeVocab.word} size="lg" />
                  </div>

                  <p className="text-base font-semibold text-[#FF202F] font-mono">
                    {activeVocab.phonetic}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#1a1a1a] border border-neutral-800 space-y-2">
                  <span className="text-[11px] uppercase font-bold text-neutral-400">Nghĩa tiếng Việt:</span>
                  <p className="text-lg font-bold text-white">{activeVocab.vi_meaning}</p>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-bold text-neutral-400">Ngữ cảnh trong bài báo BBC:</span>
                  <p className="p-3 rounded-xl bg-neutral-900 border border-neutral-800/80 text-neutral-200 italic leading-relaxed">
                    &ldquo;{activeVocab.context_sentence}&rdquo;
                  </p>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Sparkles size={13} />
                    <span>Cách dùng &amp; mẹo ghi nhớ cho người học:</span>
                  </span>
                  <p className="p-3 rounded-xl bg-[#181515] border border-[#FF202F]/20 text-neutral-300 leading-relaxed">
                    {activeVocab.explanation}
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveVocab(null)}
                    className="px-5 py-2.5 rounded-xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs font-bold transition-all"
                  >
                    Đã hiểu từ này
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
