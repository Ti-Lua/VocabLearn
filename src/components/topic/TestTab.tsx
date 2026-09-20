'use client';

import React, { useState, useEffect } from 'react';
import { Question } from '@/types';
import { ProgressBar } from '@/components/ProgressBar';
import confetti from 'canvas-confetti';
import {
  Clock,
  Award,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface TestTabProps {
  topicId: number;
  bookId: number;
  userId: string;
  topicTitle: string;
  masteredPercentage: number;
  onTopicCompleted?: () => void;
}

export function TestTab({
  topicId,
  bookId,
  userId,
  topicTitle,
  masteredPercentage,
  onTopicCompleted,
}: TestTabProps) {
  const [testState, setTestState] = useState<'intro' | 'active' | 'result'>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  // Result metrics
  const [scorePercentage, setScorePercentage] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongItems, setWrongItems] = useState<{ question: Question; givenAnswer: string }[]>([]);
  const [isCompletedTopic, setIsCompletedTopic] = useState(false);

  // Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (testState === 'active') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [testState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/topics/${topicId}/test?userId=${userId}`);
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setUserAnswers({});
        setCurrentIndex(0);
        setElapsedSeconds(0);
        setTestState('active');
      }
    } catch (err) {
      console.error('Error fetching test questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentQ = questions[currentIndex];

  const handleAnswerSelect = (val: string) => {
    if (!currentQ) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: val,
    }));
  };

  // Submit test
  const handleSubmitTest = async () => {
    let correct = 0;
    const wrongs: { question: Question; givenAnswer: string }[] = [];

    for (const q of questions) {
      const given = (userAnswers[q.id] || '').trim().toLowerCase();
      const expected = q.correctAnswer.trim().toLowerCase();

      if (given === expected || (q.type === 'matching' && userAnswers[q.id] === 'matched')) {
        correct++;
      } else {
        wrongs.push({ question: q, givenAnswer: userAnswers[q.id] || '(chưa trả lời)' });
      }

      // Log attempt to DB
      fetch('/api/vocabulary/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          vocabulary_id: q.vocabulary.id,
          topic_id: topicId,
          book_id: bookId,
          exercise_type: q.type,
          selected_answer: userAnswers[q.id] || '',
          correct_answer: q.correctAnswer,
          is_correct: given === expected,
        }),
      }).catch(console.error);
    }

    const pct = Math.round((correct / questions.length) * 100);
    setCorrectCount(correct);
    setScorePercentage(pct);
    setWrongItems(wrongs);
    setTestState('result');

    // Submit score to topic progress
    try {
      const res = await fetch(`/api/topics/${topicId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          scorePercentage: pct,
        }),
      });
      const data = await res.json();
      if (data.isCompleted) {
        setIsCompletedTopic(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        if (onTopicCompleted) onTopicCompleted();
      }
    } catch (err) {
      console.error('Error submitting test:', err);
    }

    // Log study session
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        language_id: 1,
        book_id: bookId,
        topic_id: topicId,
        mode: 'test',
        started_at: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
        ended_at: new Date().toISOString(),
        duration: Math.max(10, elapsedSeconds),
        words_seen: questions.length,
        correct_answers: correct,
        wrong_answers: questions.length - correct,
      }),
    }).catch(console.error);
  };

  // 1. INTRO SCREEN
  if (testState === 'intro') {
    return (
      <div className="max-w-xl mx-auto py-10 px-6 sm:px-8 rounded-3xl bg-[#121212] border border-neutral-800 space-y-6 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#D91827] to-[#FF202F] text-white flex items-center justify-center mx-auto shadow-xl shadow-[#FF202F]/30">
          <Award size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Bài Test Đánh Giá: {topicTitle}</h2>
          <p className="text-xs text-neutral-400">
            Đánh giá toàn diện kiến thức của bạn trong Topic này.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="p-3 rounded-xl bg-[#181818] border border-neutral-800">
            <span className="text-[10px] text-neutral-400 uppercase font-bold">Số câu hỏi</span>
            <p className="text-base font-extrabold text-white mt-0.5">20 câu</p>
          </div>
          <div className="p-3 rounded-xl bg-[#181818] border border-neutral-800">
            <span className="text-[10px] text-neutral-400 uppercase font-bold">Phản hồi</span>
            <p className="text-base font-extrabold text-white mt-0.5">Sau khi nộp</p>
          </div>
          <div className="p-3 rounded-xl bg-[#181818] border border-neutral-800">
            <span className="text-[10px] text-neutral-400 uppercase font-bold">Điểm đạt</span>
            <p className="text-base font-extrabold text-emerald-400 mt-0.5">&ge; 80%</p>
          </div>
          <div className="p-3 rounded-xl bg-[#181818] border border-neutral-800">
            <span className="text-[10px] text-neutral-400 uppercase font-bold">Tính giờ</span>
            <p className="text-base font-extrabold text-[#FF202F] mt-0.5">Tự do</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#181818] border border-neutral-850 text-xs text-neutral-400 text-left space-y-1.5">
          <p className="font-bold text-white">Quy tắc hoàn thành Topic:</p>
          <p>• Điểm bài Test đạt từ <strong>80%</strong> trở lên.</p>
          <p>• Và tổng số từ vựng trong Topic đạt từ <strong>90% Mastered</strong> (Hiện tại: {masteredPercentage}%).</p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleStartTest}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#D91827] to-[#FF202F] hover:from-[#B81420] hover:to-[#E51322] text-white text-sm font-bold shadow-xl shadow-[#FF202F]/25 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Đang chuẩn bị đề...' : 'Bắt đầu làm bài Test'}
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // 2. RESULT SCREEN
  if (testState === 'result') {
    const isPassed = scorePercentage >= 80;

    return (
      <div className="max-w-2xl mx-auto py-8 px-6 sm:px-8 rounded-3xl bg-[#121212] border border-neutral-800 space-y-6 shadow-2xl text-center">
        <div
          className={`w-18 h-18 rounded-3xl mx-auto flex items-center justify-center shadow-xl p-4 ${
            isPassed
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-[#FF202F]/20 text-[#FF202F] border border-[#FF202F]/40'
          }`}
        >
          {isPassed ? <Award size={40} /> : <AlertTriangle size={40} />}
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl font-black text-white">
            {isPassed ? 'Chúc mừng bạn đã vượt qua!' : 'Cần cố gắng thêm!'}
          </h2>
          <p className="text-xs text-neutral-400">
            {isPassed
              ? 'Bạn đã hoàn thành xuất sắc bài kiểm tra kiến thức Topic.'
              : 'Hãy ôn lại các từ chưa đạt điểm để củng cố trước khi thử lại nhé.'}
          </p>
        </div>

        {/* Completion Announcement */}
        {isCompletedTopic && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-emerald-400 animate-spin" />
            <span>TOPIC NÀY ĐÃ CHÍNH THỨC HOÀN THÀNH (MASTERED)!</span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800">
            <span className="text-[11px] text-neutral-400">Điểm số</span>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">{scorePercentage}%</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800">
            <span className="text-[11px] text-neutral-400">Số câu đúng</span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {correctCount} / {questions.length}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800">
            <span className="text-[11px] text-neutral-400">Thời gian</span>
            <p className="text-2xl sm:text-3xl font-black text-[#FF202F] mt-1">
              {formatTime(elapsedSeconds)}
            </p>
          </div>
        </div>

        {/* Incorrect words breakdown */}
        {wrongItems.length > 0 && (
          <div className="text-left space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#FF202F]">
              Danh sách câu cần ôn lại ({wrongItems.length} câu):
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {wrongItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#181818] border border-neutral-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{item.question.vocabulary.word}</span>
                    <span className="text-neutral-400 font-mono">
                      {item.question.vocabulary.ipa || ''}
                    </span>
                  </div>
                  <p className="text-neutral-300 font-medium">
                    Nghĩa đúng: <strong>{item.question.vocabulary.meaning_vi}</strong>
                  </p>
                  <p className="text-neutral-500">
                    Bạn đã chọn: <span className="text-[#FF202F]">{item.givenAnswer}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={handleStartTest}
            className="flex-1 py-3 rounded-xl bg-[#181818] hover:bg-[#222] border border-neutral-700 text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={15} />
            <span>Làm lại bài Test</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. ACTIVE TEST SCREEN
  if (!currentQ) return null;

  const currentAnswer = userAnswers[currentQ.id] || '';
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Test Progress & Timer Header */}
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white text-sm font-mono">
            Câu {currentIndex + 1} / {questions.length}
          </span>
          <span className="text-neutral-400">
            Đã làm: {answeredCount} / {questions.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#181818] border border-neutral-800 text-[#FF202F] font-mono font-bold">
          <Clock size={14} />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>
      </div>

      <ProgressBar progress={((currentIndex + 1) / questions.length) * 100} height="h-1.5" />

      {/* Main Question Card */}
      <div className="rounded-3xl bg-[#121212] border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-neutral-850 text-neutral-300 font-mono">
            {currentQ.type === 'fill_blank'
              ? 'Điền từ'
              : currentQ.type === 'word_choice'
              ? 'Chọn từ'
              : currentQ.type === 'meaning_choice'
              ? 'Chọn nghĩa'
              : 'Nối từ'}
          </span>
        </div>

        {/* Prompt */}
        <div className="space-y-2 text-center py-2">
          <h3 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
            {currentQ.prompt}
          </h3>
          {currentQ.subPrompt && (
            <p className="text-sm font-medium text-neutral-400">{currentQ.subPrompt}</p>
          )}
        </div>

        {/* Fill Blank input */}
        {currentQ.type === 'fill_blank' && (
          <div className="max-w-md mx-auto">
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) => handleAnswerSelect(e.target.value)}
              placeholder="Nhập câu trả lời của bạn..."
              className="w-full text-center text-lg font-bold py-3 px-4 rounded-xl bg-[#181818] border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF202F] transition-all"
            />
          </div>
        )}

        {/* Word / Meaning Choice options */}
        {(currentQ.type === 'word_choice' || currentQ.type === 'meaning_choice') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentQ.options?.map((opt, i) => {
              const isSelected = currentAnswer === opt;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAnswerSelect(opt)}
                  className={`p-4 rounded-2xl border text-left text-sm transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#FF202F]/15 border-[#FF202F] text-white font-bold'
                      : 'bg-[#181818] text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <CheckCircle2 size={16} className="text-[#FF202F]" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Matching question for test */}
        {currentQ.type === 'matching' && currentQ.matchingPairs && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-400 text-center">
              Khớp nghĩa từ vựng tiếng Anh với nghĩa tiếng Việt:
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {currentQ.matchingPairs.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-[#181818] border border-neutral-800 flex justify-between items-center"
                >
                  <span className="font-bold text-white">{p.word}</span>
                  <span className="text-neutral-400 font-medium">{p.meaning}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleAnswerSelect('matched')}
              className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all ${
                currentAnswer === 'matched'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                  : 'bg-[#181818] text-neutral-300 border-neutral-800'
              }`}
            >
              {currentAnswer === 'matched' ? '✓ Đã xác nhận nối' : 'Bấm xác nhận hoàn thành'}
            </button>
          </div>
        )}

        {/* Navigation buttons between questions */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-850">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            className="px-4 py-2.5 rounded-xl bg-[#181818] text-neutral-400 hover:text-white text-xs font-bold disabled:opacity-30 transition-all"
          >
            ← Câu trước
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>Câu tiếp</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitTest}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white text-xs font-bold shadow-lg shadow-[#FF202F]/30 transition-all"
            >
              Nộp bài Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
