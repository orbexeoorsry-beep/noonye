import React, { useState, useEffect } from 'react';
import { BookLesson } from '../../services/bookLessonsService';
import {
  lessonQuizService,
  QuizQuestion,
  QuizResult,
} from '../../services/lessonQuizService';
import { AppIcon, IconButton } from '../../design-system';
import { useI18n } from '../../i18n';

interface LessonQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  allLessons: BookLesson[];
  initialLesson: BookLesson | null;
  onJumpToPage?: (pageNumber: number) => void;
  onQuizCompleted?: (isCorrect: boolean) => void;
}

export const LessonQuizModal: React.FC<LessonQuizModalProps> = ({
  isOpen,
  onClose,
  allLessons,
  initialLesson,
  onJumpToPage,
  onQuizCompleted,
}) => {
  const { t, isRTL } = useI18n();

  // Mode: 'quiz' (taking quiz) | 'multiSelect' (picking multiple lessons) | 'result' (viewing score)
  const [mode, setMode] = useState<'quiz' | 'multiSelect' | 'result'>('quiz');

  // Selected lessons for testing
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>(() =>
    initialLesson ? [initialLesson.id] : allLessons[0] ? [allLessons[0].id] : []
  );

  // Active quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  // Initialize questions when modal opens or initialLesson changes
  useEffect(() => {
    if (isOpen) {
      const targetLessons = initialLesson
        ? [initialLesson]
        : allLessons.length > 0
        ? [allLessons[0]]
        : [];
      setSelectedLessonIds(targetLessons.map((l) => l.id));
      startQuizWithLessons(targetLessons);
    }
  }, [isOpen, initialLesson]);

  const startQuizWithLessons = (lessonsToTest: BookLesson[]) => {
    const generatedQuestions = lessonQuizService.getQuestionsForLessons(lessonsToTest);
    setQuestions(generatedQuestions);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setRevealedHints({});
    setIsAnswerSubmitted(false);
    setResult(null);
    setMode('quiz');
  };

  if (!isOpen) return null;

  const currentQ = questions[currentQuestionIndex];
  const totalQ = questions.length;
  const currentAnswer = currentQ ? selectedAnswers[currentQ.id] : undefined;
  const isHintOpen = currentQ ? revealedHints[currentQ.id] : false;

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted || !currentQ) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: index,
    }));
    setIsAnswerSubmitted(true);

    const isCorrect = index === currentQ.correctIndex;
    if (onQuizCompleted) {
      onQuizCompleted(isCorrect);
    }
  };

  const handleToggleHint = () => {
    if (!currentQ) return;
    setRevealedHints((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < totalQ) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setIsAnswerSubmitted(Boolean(questions[currentQuestionIndex + 1] && selectedAnswers[questions[currentQuestionIndex + 1].id] !== undefined));
    } else {
      const evaluation = lessonQuizService.evaluateQuiz(questions, selectedAnswers);
      setResult(evaluation);
      setMode('result');
    }
  };

  const handleToggleLessonSelection = (lessonId: string) => {
    setSelectedLessonIds((prev) =>
      prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const handleStartMultiLessonQuiz = () => {
    const chosen = allLessons.filter((l) => selectedLessonIds.includes(l.id));
    if (chosen.length === 0) return;
    startQuizWithLessons(chosen);
  };

  const handleRetake = () => {
    const chosen = allLessons.filter((l) => selectedLessonIds.includes(l.id));
    startQuizWithLessons(chosen.length > 0 ? chosen : initialLesson ? [initialLesson] : allLessons);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 motion-reduce:animate-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
        {/* Header */}
        <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <AppIcon name="sparkles" size="md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  {mode === 'multiSelect'
                    ? 'اختيار عدة دروس للاختبار الشامل'
                    : mode === 'result'
                    ? 'نتيجة ودرجة الاختبار'
                    : 'اختبار نون التفاعلي'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 flex items-center gap-1 font-sans">
                  <AppIcon name="award" size="xs" />
                  تقييم جيمني
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1 font-sans">
                {mode === 'quiz' && currentQ ? currentQ.lessonTitle : 'اختبار منهجي يقيس الفهم والاستيعاب بدقة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {mode === 'quiz' && allLessons.length > 1 && (
              <IconButton
                name="layers"
                iconSize="xs"
                variant="outline"
                label="تحديد عدة دروس"
                onClick={() => setMode('multiSelect')}
                className="px-2.5 py-1.5"
              >
                <span className="hidden sm:inline font-sans text-xs">عدة دروس</span>
              </IconButton>
            )}

            <IconButton
              name="close"
              iconSize="sm"
              variant="ghost"
              label="إغلاق"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] text-slate-400 hover:text-slate-700"
            />
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 font-sans">
          {/* Mode 1: MULTI-LESSON SELECTOR */}
          {mode === 'multiSelect' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 font-sans">
                <p className="font-bold mb-1 flex items-center gap-1.5 font-display">
                  <AppIcon name="layers" size="sm" className="text-indigo-600" />
                  حدد الدروس التي ترغب في تضمينها في الاختبار:
                </p>
                <p className="text-indigo-700 text-[11px]">
                  سيقوم نظام جيمني بجمع أسئلة شاملة ومتنوعة من كافة الدروس التي تختارها لقياس مدى ترابط المعلومات لديك.
                </p>
              </div>

              <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                {allLessons.map((lesson) => {
                  const isChecked = selectedLessonIds.includes(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => handleToggleLessonSelection(lesson.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none active:scale-[0.99] motion-reduce:transform-none ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <AppIcon name="check" size="xs" strokeWidth={3.5} />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 font-display">{lesson.title}</h4>
                          {lesson.unitTitle && (
                            <span className="text-[10px] text-slate-500 font-sans">{lesson.unitTitle}</span>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        ص {lesson.pageNumber}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLessonIds(allLessons.map((l) => l.id))}
                  className="text-xs text-indigo-600 font-bold hover:underline font-sans min-h-[44px] flex items-center"
                >
                  تحديد كافة الدروس ({allLessons.length})
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('quiz')}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleStartMultiLessonQuiz}
                    disabled={selectedLessonIds.length === 0}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-xs active:scale-[0.98] motion-reduce:transform-none"
                  >
                    بدء الاختبار ({selectedLessonIds.length} دروس)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: ACTIVE QUESTION (GEMINI STUDENT QUIZ) */}
          {mode === 'quiz' && currentQ && (
            <div className="space-y-5">
              {/* Progress and Topic Bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2 font-sans">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    السؤال {currentQuestionIndex + 1} من {totalQ}
                  </span>
                  {currentQ.topic && (
                    <span className="bg-slate-100 px-2.5 py-0.5 rounded-lg text-slate-600 text-[11px] font-medium font-sans">
                      المحور: {currentQ.topic}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300 motion-reduce:transition-none"
                    style={{
                      width: `${((currentQuestionIndex + 1) / totalQ) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Question Statement */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed font-display">
                  {currentQ.question}
                </h4>
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((option, idx) => {
                  const isSelected = currentAnswer === idx;
                  const isCorrect = idx === currentQ.correctIndex;
                  const optionLetters = ['أ', 'ب', 'ج', 'د'];

                  let optionStyles = 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800';

                  if (isAnswerSubmitted) {
                    if (isCorrect) {
                      optionStyles = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500';
                    } else if (isSelected) {
                      optionStyles = 'border-red-500 bg-red-50/70 text-red-950 ring-1 ring-red-500';
                    } else {
                      optionStyles = 'border-slate-200 opacity-60 text-slate-500';
                    }
                  } else if (isSelected) {
                    optionStyles = 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswerSubmitted}
                      className={`w-full min-h-[48px] p-3.5 sm:p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 text-xs sm:text-sm font-medium select-none active:scale-[0.99] motion-reduce:transform-none font-sans ${optionStyles}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isAnswerSubmitted && isCorrect
                              ? 'bg-emerald-600 text-white'
                              : isAnswerSubmitted && isSelected
                              ? 'bg-red-600 text-white'
                              : isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {optionLetters[idx] || idx + 1}
                        </span>
                        <span className="leading-relaxed">{option}</span>
                      </div>

                      {isAnswerSubmitted && (
                        <div className="shrink-0">
                          {isCorrect ? (
                            <AppIcon name="checkCircle" size="md" className="text-emerald-600" />
                          ) : isSelected ? (
                            <AppIcon name="xCircle" size="md" className="text-red-600" />
                          ) : null}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Gemini Hint Toggle & Card */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleToggleHint}
                  className="min-h-[40px] flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/80 px-3 py-1.5 rounded-xl border border-amber-200/80 transition-colors active:scale-[0.98] motion-reduce:transform-none"
                >
                  <AppIcon name="lightbulb" size="xs" className="text-amber-600" />
                  <span>{isHintOpen ? 'إخفاء التلميح' : '💡 تلميح استدلالي من جيمني'}</span>
                </button>

                {isHintOpen && (
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed animate-in fade-in duration-200 motion-reduce:animate-none font-sans">
                    <span className="font-bold text-amber-800 block mb-0.5">توجيه جيمني:</span>
                    {currentQ.hint}
                  </div>
                )}
              </div>

              {/* Explanation Card (Appears after answer is selected) */}
              {isAnswerSubmitted && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none font-sans">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-display">
                    <AppIcon name="sparkles" size="xs" className="text-indigo-600" />
                    <span>تفسير وتبرير الإجابة المنهجي:</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    {currentQ.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: FINAL SCORE & RESULT */}
          {mode === 'result' && result && (
            <div className="space-y-6 animate-in fade-in duration-200 motion-reduce:animate-none">
              {/* Score Card Banner */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-3">
                    <AppIcon name="award" size="xl" className="text-amber-300" />
                  </div>

                  <h3 className="text-lg font-bold mb-1 font-display">{result.gradeLabel}</h3>

                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-4xl font-extrabold tracking-tight font-mono">
                      {result.scorePercent}%
                    </span>
                    <span className="text-xs text-indigo-200 font-medium font-sans">
                      ({result.correctAnswers} من {result.totalQuestions} إجابات صحيحة)
                    </span>
                  </div>

                  <p className="text-xs text-indigo-100 max-w-md leading-relaxed mt-2 font-sans">
                    {result.geminiFeedback}
                  </p>
                </div>
              </div>

              {/* Detailed Question Review List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-display">
                  <span>مراجعة الأسئلة وتصحيح المفاهيم:</span>
                </h4>

                <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
                  {result.answers.map((ans, i) => (
                    <div
                      key={ans.questionId}
                      className={`p-3.5 rounded-2xl border text-xs leading-relaxed font-sans ${
                        ans.isCorrect
                          ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                          : 'border-red-200 bg-red-50/50 text-red-950'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-bold text-slate-900 font-display">
                          {i + 1}. {ans.question}
                        </span>
                        {ans.isCorrect ? (
                          <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-sans">
                            <AppIcon name="checkCircle" size="xs" /> صحيح
                          </span>
                        ) : (
                          <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md font-sans">
                            <AppIcon name="xCircle" size="xs" /> خاطئ
                          </span>
                        )}
                      </div>

                      {!ans.isCorrect && (
                        <div className="mb-1 text-[11px] font-sans">
                          <span className="text-slate-500">إجابتك: </span>
                          <span className="text-red-700 font-semibold">{ans.selectedOption}</span>
                          <span className="mx-2">·</span>
                          <span className="text-slate-500">الإجابة الصحيحة: </span>
                          <span className="text-emerald-700 font-semibold">{ans.correctOption}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-600 bg-white/70 rounded-xl p-2 mt-1.5 border border-slate-200/60 font-sans">
                        <span className="font-semibold text-slate-700">توضيح: </span>
                        {ans.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <footer className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2 font-sans">
          {mode === 'quiz' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors active:scale-[0.98] motion-reduce:transform-none"
              >
                متابعة القراءة
              </button>

              <button
                type="button"
                onClick={handleNextQuestion}
                disabled={!isAnswerSubmitted}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 flex items-center gap-1.5 active:scale-[0.98] motion-reduce:transform-none"
              >
                <span>{currentQuestionIndex + 1 === totalQ ? 'عرض النتيجة والدرجة' : 'السؤال التالي'}</span>
                <AppIcon name={isRTL ? 'arrowLeft' : 'arrowRight'} size="xs" />
              </button>
            </>
          )}

          {mode === 'result' && (
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-[0.98] motion-reduce:transform-none"
              >
                <AppIcon name="rotate" size="xs" />
                <span>إعادة الاختبار</span>
              </button>

              <div className="flex items-center gap-2">
                {initialLesson && onJumpToPage && (
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToPage(initialLesson.pageNumber);
                      onClose();
                    }}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-[0.98] motion-reduce:transform-none"
                  >
                    <AppIcon name="library" size="xs" />
                    <span>صفحة الدرس</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs active:scale-[0.98] motion-reduce:transform-none"
                >
                  إنهاء ومتابعة القراءة
                </button>
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
