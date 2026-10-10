import React from 'react';
import {
  Calculator,
  HelpCircle,
  Sparkles,
  Lightbulb,
  ListOrdered,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { mathAnalysisService } from '../services/mathAnalysisService';
import { useI18n } from '../../../i18n';
import { isFeatureEnabled } from '../../../config/feature-flags';

export interface ProblemAnalysisViewProps {
  text: string;
}

export const ProblemAnalysisView: React.FC<ProblemAnalysisViewProps> = ({ text }) => {
  const { t } = useI18n();

  if (!isFeatureEnabled('guidedMathEnabled')) {
    return null;
  }

  if (mathAnalysisService.isUnclearProblem(text)) {
    return (
      <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-start space-y-2 animate-in fade-in duration-150">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-amber-900 text-xs sm:text-sm">{t.common.errorTitle}</h5>
            <p className="text-xs text-amber-900 font-bold leading-relaxed mt-1">
              {t.guidedMath?.unclearNotice ||
                'لم أتمكن من قراءة المسألة بوضوح. حدد منطقة أكبر وحاول مرة أخرى.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const parsed = mathAnalysisService.parseProblemSections(text);

  if (!parsed) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/90 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-2xs">
        {text}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 animate-in fade-in duration-150">
      {/* 1. المعطيات */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-1.5 text-indigo-700 font-extrabold text-xs">
          <Calculator className="w-3.5 h-3.5 text-indigo-600" />
          <span>{t.guidedMath?.given || 'المعطيات'}</span>
        </div>
        <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
          {parsed.given}
        </div>
      </div>

      {/* 2. المطلوب */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-1.5 text-blue-700 font-extrabold text-xs">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>{t.guidedMath?.required || 'المطلوب'}</span>
        </div>
        <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
          {parsed.required}
        </div>
      </div>

      {/* 3. الفكرة أو القانون المناسب */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 shadow-2xs">
        <div className="flex items-center gap-2 mb-1.5 text-indigo-950 font-extrabold text-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>{t.guidedMath?.concept || 'الفكرة أو القانون المناسب'}</span>
        </div>
        <div className="text-xs text-indigo-950 leading-relaxed whitespace-pre-line font-semibold">
          {parsed.concept}
        </div>
      </div>

      {/* 4. تلميح أول */}
      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 shadow-2xs">
        <div className="flex items-center gap-2 mb-1.5 text-amber-950 font-extrabold text-xs">
          <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
          <span>{t.guidedMath?.hint || 'تلميح أول'}</span>
        </div>
        <div className="text-xs text-amber-900 leading-relaxed whitespace-pre-line font-medium">
          {parsed.hint}
        </div>
      </div>

      {/* 5. خطوات الحل */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-1.5 text-slate-900 font-extrabold text-xs">
          <ListOrdered className="w-3.5 h-3.5 text-slate-600" />
          <span>{t.guidedMath?.steps || 'خطوات الحل'}</span>
        </div>
        <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
          {parsed.steps}
        </div>
      </div>

      {/* 6. الحل النهائي */}
      <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-1.5 text-emerald-950 font-extrabold text-xs sm:text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{t.guidedMath?.finalSolution || 'الحل النهائي'}</span>
        </div>
        <div className="text-xs sm:text-sm font-extrabold text-emerald-900 leading-relaxed whitespace-pre-line">
          {parsed.finalSolution}
        </div>
      </div>

      {/* 7. درجة الثقة */}
      {parsed.confidence && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-[11px]">
          <span className="font-semibold text-slate-600">
            {t.guidedMath?.confidence || 'درجة الثقة'}:
          </span>
          <span className="font-extrabold text-indigo-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
            {parsed.confidence.replace(/^[•\-\*:]+/, '').trim()}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProblemAnalysisView;
