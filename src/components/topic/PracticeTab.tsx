'use client';

import React, { useState, useEffect } from 'react';
import { Vocabulary, Question, ExerciseType } from '@/types';
import { AudioButton } from '@/components/AudioButton';
import { ProgressBar } from '@/components/ProgressBar';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  Zap,
} from 'lucide-react';

interface PracticeTabProps {
  topicId: number;
  bookId: number;
  userId: string;
  onGoToLearn: () => void;
  onGoToTest: () => void;
}

export function PracticeTab({
  topicId,
  bookId,
  userId,
  onGoToLearn,
  onGoToTest,
}: PracticeTabProps) {
  // Session setup state
  const [setupMode, setSetupMode] = useState(true);
  const [questionCountChoice, setQuestionCountChoice] = useState<number | 'all'>(10);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [learnedCount, setLearnedCount] = useState(0);

  // Active session state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  // Matching game state
  const [selectedMatchWord, setSelectedMatchWord] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());

  // Result tracking
  const [sessionFinished, setSessionFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongVocabularies, setWrongVocabularies] = useState<Vocabulary[]>([]);
  const [strongVocabularies, setStrongVocabularies] = useState<Vocabulary[]>([]);

  // Check progressive unlock on mount
  useEffect(() => {
    fetch(`/api/topics/${topicId}/practice?userId=${userId}&count=5`)
      .then((r) => r.json())
      .then((data) => {
        setLearnedCount(data.totalLearned || 0);
        setUnlocked((data.totalLearned || 0) >= 4);
      })
      .catch(console.error);
  }, [topicId, userId]);

  // Start practice session
  const startSession = async (count: number | 'all', customQuestions?: Question[]) => {
    setSetupMode(false);
    setSessionFinished(false);
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongVocabularies([]);
    setStrongVocabularies([]);
    setIsAnswered(false);
    setSelectedOption(null);
    setUserAnswer('');
    setMatchedPairs(new Set());
    setSelectedMatchWord(null);
    setSessionStartTime(Date.now());

    if (customQuestions && customQuestions.length > 0) {
      setQuestions(customQuestions);
      return;
    }

    try {
      const res = await fetch(`/api/topics/${topicId}/practice?userId=${userId}&count=${count}`);
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error('Error starting practice session:', err);
    }
  };

  const currentQ = questions[currentIndex];

  // Answer normalizer for Fill in the Blank
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\u2018\u2019']/g, "'") // normalize curly apostrophes
      .replace(/\s+/g, ' ');
  };

  // Submit Answer
  const handleCheckAnswer = (answerGiven?: string) => {
    if (isAnswered || !currentQ) return;

    let correct = false;
    const answer = answerGiven !== undefined ? answerGiven : userAnswer;

    if (currentQ.type === 'fill_blank') {
      correct = normalizeText(answer) === normalizeText(currentQ.correctAnswer);
    } else if (currentQ.type === 'word_choice' || currentQ.type === 'meaning_choice') {
      correct = answer.trim() === currentQ.correctAnswer.trim();
    } else if (currentQ.type === 'matching') {
      correct = true;
    }

    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
      setStrongVocabularies((prev) => {
        if (!prev.find((v) => v.id === currentQ.vocabulary.id)) {
          return [...prev, currentQ.vocabulary];
        }
        return prev;
      });
    } else {
      setWrongVocabularies((prev) => {
        if (!prev.find((v) => v.id === currentQ.vocabulary.id)) {
          return [...prev, currentQ.vocabulary];
        }
        return prev;
      });

      // Adaptive Practice Rule: If user makes a mistake on a word,
      // re-queue it 3-5 questions later under a different format!
      queueAdaptiveRetry(currentQ.vocabulary);
    }

    // Record attempt to DB
    fetch('/api/vocabulary/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        vocabulary_id: currentQ.vocabulary.id,
        topic_id: topicId,
        book_id: bookId,
        exercise_type: currentQ.type,
        selected_answer: answer,
        correct_answer: currentQ.correctAnswer,
        is_correct: correct,
      }),
    }).catch(console.error);
  };

  // Adaptive Retry generator
  const queueAdaptiveRetry = (missedVocab: Vocabulary) => {
    const nextType: ExerciseType =
      currentQ.type === 'meaning_choice' ? 'fill_blank' : 'meaning_choice';

    const retryQ: Question = {
      id: `retry_${missedVocab.id}_${Date.now()}`,
      type: nextType,
      vocabulary: missedVocab,
      prompt:
        nextType === 'fill_blank' && (missedVocab.cloze_example_1 || missedVocab.cloze_example_2)
          ? missedVocab.cloze_example_1 || missedVocab.cloze_example_2 || ''
          : missedVocab.word,
      subPrompt: `Ôn lại từ vừa sai: "${missedVocab.meaning_vi}"`,
      options: [missedVocab.meaning_vi, 'phương án thử 1', 'phương án thử 2', 'phương án thử 3'].sort(
        () => Math.random() - 0.5
      ),
      correctAnswer: nextType === 'fill_blank' ? missedVocab.word : missedVocab.meaning_vi,
      explanation: `${missedVocab.word}: ${missedVocab.meaning_vi}`,
    };

    setQuestions((prev) => {
      const copy = [...prev];
      // Insert 3-4 steps later or at the end
      const insertIdx = Math.min(copy.length, currentIndex + 4);
      copy.splice(insertIdx, 0, retryQ);
      return copy;
    });
  };

  // Move to next question or complete session
  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsAnswered(false);
      setIsCorrect(null);
      setUserAnswer('');
      setSelectedOption(null);
      setMatchedPairs(new Set());
      setSelectedMatchWord(null);
    } else {
      // Finished
      setSessionFinished(true);
      const duration = Math.round((Date.now() - sessionStartTime) / 1000);

      // Log study session
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          language_id: 1,
          book_id: bookId,
          topic_id: topicId,
          mode: 'practice',
          started_at: new Date(sessionStartTime).toISOString(),
          ended_at: new Date().toISOString(),
          duration: Math.max(5, duration),
          words_seen: questions.length,
          correct_answers: correctCount + (isCorrect ? 1 : 0),
          wrong_answers: questions.length - (correctCount + (isCorrect ? 1 : 0)),
        }),
      }).catch(console.error);
    }
  };

  // Matching handler
  const handleMatchWordClick = (word: string) => {
    if (matchedPairs.has(word)) return;
    setSelectedMatchWord(word);
  };

  const handleMatchMeaningClick = (meaning: string, targetWord: string) => {
    if (!selectedMatchWord) return;

    if (selectedMatchWord === targetWord) {
      // Matched!
      const newMatched = new Set(matchedPairs);
      newMatched.add(targetWord);
      setMatchedPairs(newMatched);
      setSelectedMatchWord(null);

      // If all matched
      if (currentQ?.matchingPairs && newMatched.size === currentQ.matchingPairs.length) {
        handleCheckAnswer('matched');
      }
    } else {
      // Wrong match visual shake
      setSelectedMatchWord(null);
    }
  };

  // Re-practice wrong words
  const handlePracticeWrongOnly = () => {
    if (wrongVocabularies.length === 0) return;
    const retryQuestions: Question[] = wrongVocabularies.map((v, i) => ({
      id: `wrong_retry_${v.id}_${i}`,
      type: 'meaning_choice',
      vocabulary: v,
      prompt: v.word,
      subPrompt: v.ipa ? `/${v.ipa.replace(/\//g, '')}/` : undefined,
      options: [v.meaning_vi, 'phản hồi', 'thực hiện', 'kết quả'].sort(() => Math.random() - 0.5),
      correctAnswer: v.meaning_vi,
      explanation: `${v.word}: ${v.meaning_vi}`,
    }));
    startSession('all', retryQuestions);
  };

  // 1. LOCKED STATE (< 4 words learned)
  if (unlocked === false) {
    return (
      <div className="max-w-xl mx-auto py-12 px-6 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-[#1c1415] border border-[#FF202F]/30 text-[#FF202F] flex items-center justify-center mx-auto shadow-lg">
          <BookOpen size={30} />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">Chưa mở khóa Luyện tập</h3>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            Bạn mới học <strong className="text-white">{learnedCount} / 4 từ tối thiểu</strong>.
            Hãy học thêm một vài từ trong tab <strong>Learn</strong> để mở khóa bài luyện tập theo đúng triết lý:
            <br />
            <em className="text-neutral-300 font-medium">"Học tới đâu → Luyện tới đó → Nắm chắc tới đó."</em>
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToLearn}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white text-xs font-bold shadow-lg shadow-[#FF202F]/20 hover:scale-105 active:scale-95 transition-all"
        >
          <span>Vào học ngay tại Tab Learn</span>
          <ArrowRight size={15} />
        </button>
      </div>
    );
  }

  // 2. SESSION SETUP SCREEN
  if (setupMode) {
    return (
      <div className="max-w-lg mx-auto py-8 px-6 sm:px-8 rounded-3xl bg-[#121212] border border-neutral-800 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF202F]/10 text-[#FF202F] text-xs font-bold border border-[#FF202F]/20">
            <Zap size={13} />
            <span>Progressive Practice</span>
          </div>
          <h2 className="text-2xl font-black text-white">Thiết lập bài luyện tập</h2>
          <p className="text-xs text-neutral-400">
            Bài luyện chỉ sử dụng các từ bạn đã học trong Topic này ({learnedCount} từ sẵn sàng).
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
            Chọn số lượng câu hỏi:
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[5, 10, 20, 'all'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setQuestionCountChoice(opt as number | 'all')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all text-center ${
                  questionCountChoice === opt
                    ? 'bg-[#FF202F] text-white border-[#FF202F] shadow-lg shadow-[#FF202F]/20'
                    : 'bg-[#181818] text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {opt === 'all' ? 'Luyện tất cả từ đã học' : `${opt} câu`}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#181818] border border-neutral-800 text-[11px] text-neutral-400 space-y-1.5">
          <p className="font-semibold text-white">Ưu tiên thông minh:</p>
          <p>• Từ vựng bạn chưa mastered hoặc từng làm sai sẽ được ưu tiên hỏi trước.</p>
          <p>• Nếu trả lời sai, từ đó sẽ tự động hỏi lại sau 3-5 câu để củng cố trí nhớ.</p>
        </div>

        <button
          type="button"
          onClick={() => startSession(questionCountChoice)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#D91827] to-[#FF202F] hover:from-[#B81420] hover:to-[#E51322] text-white text-sm font-bold shadow-xl shadow-[#FF202F]/25 active:scale-95 transition-all"
        >
          <span>Bắt đầu luyện tập</span>
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // 3. SESSION RESULT SCREEN
  if (sessionFinished) {
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    return (
      <div className="max-w-xl mx-auto py-8 px-6 sm:px-8 rounded-3xl bg-[#121212] border border-neutral-800 space-y-6 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#D91827] to-[#FF202F] text-white flex items-center justify-center mx-auto shadow-xl shadow-[#FF202F]/30">
          <Award size={32} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-white">Luyện tập hoàn thành!</h2>
          <p className="text-xs text-neutral-400">Kết quả phiên học của bạn</p>
        </div>

        {/* Score metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800">
            <span className="text-xs text-neutral-400">Độ chính xác</span>
            <p className="text-3xl font-black text-[#FF202F] mt-1">{accuracy}%</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800">
            <span className="text-xs text-neutral-400">Số câu đúng</span>
            <p className="text-3xl font-black text-emerald-400 mt-1">
              {correctCount} / {questions.length}
            </p>
          </div>
        </div>

        {/* Weak Words Section */}
        {wrongVocabularies.length > 0 && (
          <div className="text-left p-4 rounded-2xl bg-[#1c1415] border border-[#FF202F]/30 space-y-2">
            <span className="text-xs font-bold text-[#FF202F] uppercase tracking-wider">
              Từ cần ôn lại ({wrongVocabularies.length} từ):
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {wrongVocabularies.map((w) => (
                <span
                  key={w.id}
                  className="px-2.5 py-1 rounded-lg bg-[#28181a] border border-[#FF202F]/40 text-xs font-semibold text-white"
                >
                  {w.word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Strong Words Section */}
        {strongVocabularies.length > 0 && (
          <div className="text-left p-4 rounded-2xl bg-[#111c14] border border-emerald-500/30 space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Từ nắm chắc ({strongVocabularies.length} từ):
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {strongVocabularies.slice(0, 8).map((w) => (
                <span
                  key={w.id}
                  className="px-2.5 py-1 rounded-lg bg-[#16271c] border border-emerald-500/30 text-xs font-semibold text-white"
                >
                  {w.word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {wrongVocabularies.length > 0 && (
            <button
              type="button"
              onClick={handlePracticeWrongOnly}
              className="flex-1 py-3 rounded-xl bg-[#1c1415] hover:bg-[#25181a] border border-[#FF202F]/40 text-xs font-bold text-[#FF202F] transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} />
              <span>Ôn lại từ sai ({wrongVocabularies.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSetupMode(true)}
            className="flex-1 py-3 rounded-xl bg-[#181818] hover:bg-[#222] border border-neutral-700 text-xs font-bold text-white transition-all"
          >
            Luyện tiếp phiên mới
          </button>

          <button
            type="button"
            onClick={onGoToTest}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#D91827] to-[#FF202F] text-white text-xs font-bold shadow-lg shadow-[#FF202F]/25 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Làm bài Test</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  // 4. ACTIVE QUESTION SCREEN
  if (!currentQ) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Question Progress Header */}
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span className="font-bold text-white text-sm font-mono">
          Câu {currentIndex + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-bold">Đúng: {correctCount}</span>
          <span className="text-[#FF202F] font-bold">Sai: {wrongVocabularies.length}</span>
        </div>
      </div>

      <ProgressBar progress={((currentIndex + 1) / questions.length) * 100} height="h-1.5" />

      {/* Main Question Card */}
      <div className="rounded-3xl bg-[#121212] border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Exercise Type Badge & Audio */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#181818] text-[#FF202F] border border-[#FF202F]/20 font-mono">
            {currentQ.type === 'fill_blank'
              ? 'Điền vào chỗ trống'
              : currentQ.type === 'word_choice'
              ? 'Chọn từ đúng'
              : currentQ.type === 'meaning_choice'
              ? 'Chọn nghĩa đúng'
              : 'Nối từ'}
          </span>
          <AudioButton word={currentQ.vocabulary.word} audioUrl={currentQ.vocabulary.audio_url} size="sm" />
        </div>

        {/* Prompt */}
        <div className="space-y-2 text-center py-2">
          <h3 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
            {currentQ.prompt}
          </h3>
          {currentQ.subPrompt && (
            <p className="text-sm font-medium text-neutral-400">
              {currentQ.subPrompt}
            </p>
          )}
        </div>

        {/* Dynamic Exercise Input Form */}

        {/* TYPE 1: Fill in the Blank */}
        {currentQ.type === 'fill_blank' && (
          <div className="space-y-4 max-w-md mx-auto">
            <input
              type="text"
              disabled={isAnswered}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAnswered && userAnswer.trim()) {
                  handleCheckAnswer();
                }
              }}
              placeholder="Nhập từ cần điền..."
              className="w-full text-center text-lg font-bold py-3 px-4 rounded-xl bg-[#181818] border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF202F] transition-all"
            />
            {!isAnswered && (
              <button
                type="button"
                disabled={!userAnswer.trim()}
                onClick={() => handleCheckAnswer()}
                className="w-full py-3 rounded-xl bg-[#FF202F] hover:bg-[#D91827] text-white text-xs font-bold transition-all disabled:opacity-40"
              >
                Kiểm tra đáp án
              </button>
            )}
          </div>
        )}

        {/* TYPE 2 & 3: Word Choice or Meaning Choice */}
        {(currentQ.type === 'word_choice' || currentQ.type === 'meaning_choice') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentQ.options?.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isTargetCorrect = option.trim() === currentQ.correctAnswer.trim();

              let btnStyle = 'bg-[#181818] text-white border-neutral-800 hover:border-neutral-700';
              if (isAnswered) {
                if (isTargetCorrect) {
                  btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold';
                } else if (isSelected && !isTargetCorrect) {
                  btnStyle = 'bg-[#FF202F]/20 border-[#FF202F] text-[#FF202F] font-bold';
                } else {
                  btnStyle = 'bg-[#141414] text-neutral-500 border-neutral-850';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => {
                    setSelectedOption(option);
                    handleCheckAnswer(option);
                  }}
                  className={`p-4 rounded-2xl border text-left text-sm transition-all duration-200 flex items-center justify-between ${btnStyle}`}
                >
                  <span>{option}</span>
                  {isAnswered && isTargetCorrect && (
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  )}
                  {isAnswered && isSelected && !isTargetCorrect && (
                    <XCircle size={16} className="text-[#FF202F] flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* TYPE 4: Matching */}
        {currentQ.type === 'matching' && currentQ.matchingPairs && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            {/* Left: Words */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Từ vựng:
              </span>
              {currentQ.matchingPairs.map((pair) => {
                const isMatched = matchedPairs.has(pair.word);
                const isSelected = selectedMatchWord === pair.word;

                let style = 'bg-[#181818] text-white border-neutral-800 hover:border-neutral-700';
                if (isMatched) style = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 opacity-80';
                else if (isSelected) style = 'bg-[#FF202F]/20 text-[#FF202F] border-[#FF202F] font-bold';

                return (
                  <button
                    key={pair.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handleMatchWordClick(pair.word)}
                    className={`w-full min-h-[44px] p-2.5 sm:p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center ${style}`}
                  >
                    <span className="line-clamp-2">{pair.word}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Shuffled Meanings */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Nghĩa Tiếng Việt:
              </span>
              {currentQ.matchingPairs.map((pair) => {
                const isMatched = matchedPairs.has(pair.word);

                let style = 'bg-[#181818] text-neutral-200 border-neutral-800 hover:border-neutral-700';
                if (isMatched) style = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 opacity-80';

                return (
                  <button
                    key={pair.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handleMatchMeaningClick(pair.meaning, pair.word)}
                    className={`w-full min-h-[44px] p-2.5 sm:p-3 rounded-xl border text-xs transition-all text-left flex items-center ${style}`}
                  >
                    <span className="line-clamp-2 leading-tight">{pair.meaning}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Instant Feedback Banner */}
        {isAnswered && (
          <div
            className={`p-4 rounded-2xl border space-y-2 animate-fadeIn ${
              isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-[#FF202F]/10 border-[#FF202F]/40 text-[#FF202F]'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              <span>{isCorrect ? 'Chính xác!' : 'Chưa chính xác!'}</span>
            </div>

            <p className="text-xs text-neutral-300">
              Đáp án đúng: <strong className="text-white font-mono">{currentQ.correctAnswer}</strong>
            </p>

            {currentQ.explanation && (
              <p className="text-xs text-neutral-400 italic">
                {currentQ.explanation}
              </p>
            )}

            <button
              type="button"
              onClick={handleNextQuestion}
              className="w-full mt-3 py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all flex items-center justify-center gap-1.5 shadow-lg"
            >
              <span>{currentIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
