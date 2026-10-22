import React, { useState } from 'react';
import { InteractiveElement, NoonToolType } from '../../../types';
import { useI18n } from '../../../i18n';
import { isFeatureEnabled } from '../../../config/feature-flags';
import {
  Sparkles,
  BookOpen,
  ListOrdered,
  Lightbulb,
  CheckSquare,
  Volume2,
  Calculator,
  Image as ImageIcon,
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface NoonToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElement: InteractiveElement | null;
  onSelectAnotherElement?: (elem: InteractiveElement) => void;
  allPageElements?: InteractiveElement[];
  onQuizCompleted?: (isCorrect: boolean) => void;
}

export const NoonToolsPanel: React.FC<NoonToolsPanelProps> = (props) => {
  if (!isFeatureEnabled('aiAssistantEnabled') || !props.isOpen) return null;
  return <EnabledNoonToolsPanel {...props} />;
};

const EnabledNoonToolsPanel: React.FC<NoonToolsPanelProps> = ({
  isOpen,
  onClose,
  selectedElement,
  allPageElements = [],
  onSelectAnotherElement,
  onQuizCompleted,
}) => {
  const { t, lang, isRTL } = useI18n();
  const isEnglish = lang === 'en';
  const [activeTool, setActiveTool] = useState<NoonToolType>('simplify');

  // Quiz state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

  // Audio player mock state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);

  if (!isFeatureEnabled('aiAssistantEnabled') || !isOpen) return null;

  // Active element fallback if nothing selected
  const currentElem = selectedElement || allPageElements[0] || null;

  const tools: { id: NoonToolType; title: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'simplify', title: t.noonTools.toolsList.simplify, desc: t.noonTools.toolsList.simplifyDesc, icon: BookOpen },
    { id: 'stepByStep', title: t.noonTools.toolsList.stepByStep, desc: t.noonTools.toolsList.stepByStepDesc, icon: ListOrdered },
    { id: 'hint', title: t.noonTools.toolsList.hint, desc: t.noonTools.toolsList.hintDesc, icon: Lightbulb },
    { id: 'quiz', title: t.noonTools.toolsList.quiz, desc: t.noonTools.toolsList.quizDesc, icon: CheckSquare },
    { id: 'readAloud', title: t.noonTools.toolsList.readAloud, desc: t.noonTools.toolsList.readAloudDesc, icon: Volume2 },
    { id: 'analyzeProblem', title: t.noonTools.toolsList.analyzeProblem, desc: t.noonTools.toolsList.analyzeProblemDesc, icon: Calculator },
    { id: 'explainFigure', title: t.noonTools.toolsList.explainFigure, desc: t.noonTools.toolsList.explainFigureDesc, icon: ImageIcon },
  ];

  const handleOptionSelect = (index: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(index);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null || !currentElem) return;
    setIsAnswerSubmitted(true);
    const isCorrect = selectedOption === currentElem.mockAiAnalysis.quizQuestion.correctIndex;
    if (onQuizCompleted) {
      onQuizCompleted(isCorrect);
    }
  };

  const handleResetQuiz = () => {
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      {/* Container: Bottom Sheet on Mobile, Right Sidebar on Desktop */}
      <div className="w-full md:max-w-md lg:max-w-lg bg-white rounded-t-3xl md:rounded-none md:rounded-r-none h-[88vh] md:h-full shadow-2xl flex flex-col border-t md:border-t-0 md:border-l border-slate-200 overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right duration-200">
        {/* Mobile Drag Handle */}
        <div className="md:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Panel Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                {t.noonTools.title}
              </h3>
              <p className="text-[11px] text-slate-500 leading-tight">
                {t.noonTools.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={t.actions.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p role="note" className="px-5 py-3 text-xs bg-amber-50 text-amber-900">
          {isEnglish ? 'Experimental demo: preset examples, not AI output or a learning assessment. Audio is simulated.' : 'عرض تجريبي: أمثلة معدّة مسبقًا وليست مخرجات ذكاء اصطناعي أو تقييمًا للتعلم. الصوت محاكاة.'}
        </p>

        {/* Currently Inspected Element Strip */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-1.5 text-xs text-slate-500">
            <span className="font-medium">{t.noonTools.currentlyAnalyzing}:</span>
            {allPageElements.length > 1 && onSelectAnotherElement && (
              <span className="text-[11px] text-indigo-600 font-medium">
                {isEnglish
                  ? `Other elements on page (${allPageElements.length})`
                  : `عناصر أخرى في الصفحة (${allPageElements.length})`}
              </span>
            )}
          </div>

          {currentElem ? (
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
              <div className="truncate">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {currentElem.title}
                </span>
                <span className="text-[11px] text-slate-500 line-clamp-1">
                  {currentElem.content}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
                {currentElem.badge || (isEnglish ? 'Element' : 'عنصر')}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic p-2 bg-white rounded-lg border border-slate-200">
              {t.noonTools.selectPrompt}
            </div>
          )}

          {/* Quick Element Switcher Pills if available */}
          {allPageElements.length > 1 && onSelectAnotherElement && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 no-scrollbar">
              {allPageElements.map((el) => (
                <button
                  key={el.id}
                  onClick={() => {
                    onSelectAnotherElement(el);
                    handleResetQuiz();
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors border ${
                    currentElem?.id === el.id
                      ? 'bg-slate-900 text-white border-slate-900 font-medium'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {el.title.split(':')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tools Selector Strip (Horizontal Scroll on Mobile, Grid/Tabs) */}
        <div className="px-5 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id);
                    if (tool.id === 'quiz') handleResetQuiz();
                  }}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{tool.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tool Output & Analysis Content Deck */}
        <div className="flex-1 overflow-y-auto p-5 text-start space-y-4">
          {!currentElem ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>{t.noonTools.selectPrompt}</p>
            </div>
          ) : (
            <>
              {/* 1. Simplify Tool */}
              {activeTool === 'simplify' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 mb-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>
                        {isEnglish ? 'Simplified Everyday Explanation' : 'الصياغة المبسطة باللغة اليومية'}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-slate-800 leading-relaxed">
                      {currentElem.mockAiAnalysis.simplified}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800 block mb-1">
                      {isEnglish ? 'Key Takeaways in This Section:' : 'المصطلحات المفتاحية في هذه الفقرة:'}
                    </span>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        {isEnglish
                          ? 'Focuses on the core principle and relationship between variables.'
                          : 'تعتمد الفكرة الأساسية على الموازنة وحفظ الطاقة.'}
                      </li>
                      <li>
                        {isEnglish
                          ? 'Connect this concept to real-world examples for better retention.'
                          : 'يمكنك ربط هذا المفهوم بالتجارب الحياتية اليومية لتثبيت الحفظ.'}
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 2. Step by Step Tool */}
              {activeTool === 'stepByStep' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <span className="text-xs font-bold text-slate-700 block mb-1">
                    {isEnglish ? 'Detailed Step-by-Step Breakdown:' : 'الشرح المفصل خطوة بخطوة:'}
                  </span>
                  {currentElem.mockAiAnalysis.stepByStep.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {isEnglish ? `Step ${idx + 1}` : `المرحلة ${idx + 1}`}
                        </span>
                      </div>
                      <p className={`text-xs sm:text-sm text-slate-700 leading-relaxed ${isRTL ? 'pr-7' : 'pl-7'}`}>
                        {step.replace(/^\d+\.\s*/, '')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Hint Tool */}
              {activeTool === 'hint' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
                      <Lightbulb className="w-5 h-5 text-amber-600" />
                      <span>{isEnglish ? 'Preset Hint' : 'تلميح معدّ مسبقًا'}</span>
                    </div>
                    <p className="text-sm sm:text-base text-slate-800 leading-relaxed">
                      {currentElem.mockAiAnalysis.hint}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
                    <span>
                      {isEnglish
                        ? 'You can re-read the question and preset hint before viewing the example answer.'
                        : 'يمكنك إعادة قراءة السؤال والتلميح المعدّ مسبقًا قبل الاطلاع على إجابة المثال.'}
                    </span>
                  </div>
                </div>
              )}

              {/* 4. Quiz Me Tool */}
              {activeTool === 'quiz' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
                      <span className="font-bold text-indigo-700 flex items-center gap-1">
                        <CheckSquare className="w-4 h-4" />
                        <span>{isEnglish ? 'Local Practice Question' : 'سؤال تدريب محلي'}</span>
                      </span>
                      <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-mono">
                        {isEnglish ? 'Preset Practice' : 'تدريب معدّ مسبقًا'}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-4 leading-relaxed">
                      {currentElem.mockAiAnalysis.quizQuestion.question}
                    </h4>

                    {/* Options list */}
                    <div className="space-y-2">
                      {currentElem.mockAiAnalysis.quizQuestion.options.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrectOption = idx === currentElem.mockAiAnalysis.quizQuestion.correctIndex;

                        let optionStyle = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';

                        if (isAnswerSubmitted) {
                          if (isCorrectOption) {
                            optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                          } else if (isSelected && !isCorrectOption) {
                            optionStyle = 'border-red-400 bg-red-50 text-red-900';
                          } else {
                            optionStyle = 'opacity-40 border-slate-200';
                          }
                        } else if (isSelected) {
                          optionStyle = 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-medium ring-1 ring-indigo-600';
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => handleOptionSelect(idx)}
                            disabled={isAnswerSubmitted}
                            className={`w-full text-start p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-2 min-h-[44px] ${optionStyle}`}
                          >
                            <span>{opt}</span>
                            {isAnswerSubmitted && isCorrectOption && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            {isAnswerSubmitted && isSelected && !isCorrectOption && (
                              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Submit / Reset Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      {!isAnswerSubmitted ? (
                        <button
                          onClick={handleCheckAnswer}
                          disabled={selectedOption === null}
                          className="min-h-[42px] px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-all mr-auto"
                        >
                          {t.noonTools.quiz.checkAnswer}
                        </button>
                      ) : (
                        <button
                          onClick={handleResetQuiz}
                          className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5 transition-colors mr-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isEnglish ? 'Try Again' : 'إعادة السؤال'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Explanation Callout after Submit */}
                  {isAnswerSubmitted && (
                    <div
                      className={`p-4 rounded-xl border text-xs leading-relaxed animate-in fade-in duration-200 ${
                        selectedOption === currentElem.mockAiAnalysis.quizQuestion.correctIndex
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50 border-amber-200 text-amber-950'
                      }`}
                    >
                      <span className="font-bold block mb-1">
                        {selectedOption === currentElem.mockAiAnalysis.quizQuestion.correctIndex
                          ? t.noonTools.quiz.correct
                          : t.noonTools.quiz.incorrect}
                      </span>
                      <p>{currentElem.mockAiAnalysis.quizQuestion.explanation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Read Aloud Tool */}
              {activeTool === 'readAloud' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Player Card */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Volume2 className="w-4 h-4 text-indigo-400" />
                        <span>{isEnglish ? 'Audio Player Demo' : 'عرض تجريبي لمشغل الصوت'}</span>
                      </span>
                      <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded text-indigo-300">
                        {isEnglish ? 'No audio output' : 'لا يوجد صوت فعلي'}
                      </span>
                    </div>

                    {/* Transcript with interactive highlight */}
                    <div className="bg-slate-800/80 rounded-xl p-3 text-xs sm:text-sm text-slate-200 leading-relaxed max-h-36 overflow-y-auto mb-4 border border-slate-700">
                      <span className={isPlayingAudio ? 'bg-indigo-600/60 px-1 py-0.5 rounded text-white' : ''}>
                        {currentElem.mockAiAnalysis.audioTranscript}
                      </span>
                    </div>

                    {/* Player Controls */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                          className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md"
                          aria-label={isPlayingAudio ? (isEnglish ? 'Pause' : 'إيقاف') : (isEnglish ? 'Play' : 'تشغيل')}
                        >
                          {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>
                        <span className="text-xs font-semibold text-slate-300">
                          {isPlayingAudio ? t.noonTools.audioPlayer.playing : t.noonTools.audioPlayer.paused}
                        </span>
                      </div>

                      {/* Speed Control */}
                      <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 text-[11px]">
                        {[1.0, 1.25, 1.5].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => setAudioSpeed(spd)}
                            className={`px-2 py-1 rounded transition-colors ${
                              audioSpeed === spd ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed px-1">
                    {isEnglish
                      ? 'These controls only demonstrate the interface; they do not play audio.'
                      : 'هذه الأزرار تعرض محاكاة للواجهة فقط ولا تشغّل صوتًا فعليًا.'}
                  </p>
                </div>
              )}

              {/* 6. Analyze Problem / Equation Tool */}
              {activeTool === 'analyzeProblem' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {/* المعطيات / Given */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 mb-1.5 text-indigo-700 font-extrabold text-xs">
                      <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isEnglish ? 'Given & Core Elements' : 'المعطيات والعناصر الأساسية'}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {currentElem.content}
                    </p>
                  </div>

                  {/* جدول المتغيرات إن وجد / Variables Table */}
                  {currentElem.mockAiAnalysis.equationAnalysis && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
                      <h4 className="text-xs font-extrabold text-slate-800 mb-2">
                        {isEnglish ? 'Variables & Meanings:' : 'جدول المتغيرات والدلالات:'}
                      </h4>
                      <div className="divide-y divide-slate-100 text-xs">
                        {currentElem.mockAiAnalysis.equationAnalysis.variables.map((v, i) => (
                          <div key={i} className="py-2 flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded dir-ltr shrink-0">
                              {v.symbol}
                            </span>
                            <span className="text-slate-700 text-end">{v.meaning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* الفكرة أو القانون المناسب / Concept or Formula */}
                  <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 mb-1 text-indigo-950 font-extrabold text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isEnglish ? 'Concept or Formula' : 'الفكرة أو القانون المناسب'}</span>
                    </div>
                    <p className="text-xs text-indigo-950 leading-relaxed font-semibold">
                      {currentElem.mockAiAnalysis.equationAnalysis?.derivation ||
                        currentElem.mockAiAnalysis.simplified}
                    </p>
                  </div>

                  {/* خطوات التحليل والحل / Solution Steps */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 mb-2 text-slate-900 font-extrabold text-xs">
                      <ListOrdered className="w-3.5 h-3.5 text-slate-600" />
                      <span>{isEnglish ? 'Solution & Analysis Steps' : 'خطوات الحل والتحليل'}</span>
                    </div>
                    <div className="space-y-1.5">
                      {currentElem.mockAiAnalysis.stepByStep.map((step, i) => (
                        <div key={i} className="text-xs text-slate-700 leading-relaxed font-medium">
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* الخلاصة والحل النهائي / Final Solution */}
                  <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 mb-1 text-emerald-950 font-extrabold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{isEnglish ? 'Final Result & Practical Application' : 'النتيجة والتطبيق العملي'}</span>
                    </div>
                    <p className="text-xs font-bold text-emerald-900 leading-relaxed">
                      {currentElem.mockAiAnalysis.equationAnalysis?.application ||
                        currentElem.mockAiAnalysis.quizQuestion.explanation}
                    </p>
                  </div>
                </div>
              )}

              {/* 7. Explain Figure Tool */}
              {activeTool === 'explainFigure' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 mb-2">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <span>{isEnglish ? 'Figure & Diagram Breakdown' : 'تفسير عناصر الشكل التوضيحي'}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed mb-3">
                      {currentElem.mockAiAnalysis.figureExplanation || currentElem.mockAiAnalysis.simplified}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-2">
                    <span className="font-bold text-slate-800 block">
                      {isEnglish ? 'Key Points to Notice in the Figure:' : 'نقاط رئيسية يجب الانتباه لها في الرسم:'}
                    </span>
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <span>
                        {isEnglish
                          ? 'Alignment of labels and directional arrows with the theoretical explanation on the page.'
                          : 'تطابق البيانات والأسهم التوضيحية مع الشرح النظري في متن الصفحة.'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <span>
                        {isEnglish
                          ? 'Relationship between coordinate axes and physical or geographical directions.'
                          : 'علاقة المحاور الإحداثية والاتجاهات الفيزيائية أو الجغرافية.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
