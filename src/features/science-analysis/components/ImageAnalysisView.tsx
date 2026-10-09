import React from 'react';
import {
  Layers,
  Table,
  MapPin,
  FlaskConical,
  CheckSquare,
  AlertCircle,
  Calculator,
} from 'lucide-react';
import { scienceAnalysisService } from '../services/scienceAnalysisService';
import { useI18n } from '../../../i18n';

export interface ImageAnalysisViewProps {
  text: string;
  pageNumber: number;
  onSwitchToAnalyze: () => void;
}

function renderDistinctionText(content: string) {
  if (!content) return null;
  const parts = content.split(
    /(\[مذكور أو ظاهر في الصفحة\]|\[استنتاج من العنصر\]|مذكور أو ظاهر في الصفحة|استنتاج من العنصر)/g
  );

  return (
    <span>
      {parts.map((part, i) => {
        if (part === '[مذكور أو ظاهر في الصفحة]' || part === 'مذكور أو ظاهر في الصفحة') {
          return (
            <span
              key={i}
              className="inline-block bg-blue-100 text-blue-900 font-bold text-[10px] px-1.5 py-0.5 rounded-md mx-1 border border-blue-200"
            >
              مذكور أو ظاهر في الصفحة
            </span>
          );
        }
        if (part === '[استنتاج من العنصر]' || part === 'استنتاج من العنصر') {
          return (
            <span
              key={i}
              className="inline-block bg-indigo-100 text-indigo-900 font-bold text-[10px] px-1.5 py-0.5 rounded-md mx-1 border border-indigo-200"
            >
              استنتاج من العنصر
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export const ImageAnalysisView: React.FC<ImageAnalysisViewProps> = ({
  text,
  pageNumber,
  onSwitchToAnalyze,
}) => {
  const { t } = useI18n();

  if (scienceAnalysisService.isUnclearImage(text)) {
    return (
      <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-start space-y-2 animate-in fade-in duration-150">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-amber-900 text-xs sm:text-sm">{t.common.errorTitle}</h5>
            <p className="text-xs text-amber-900 font-bold leading-relaxed mt-1">
              {t.science?.unclearNotice ||
                'الصورة غير واضحة بما يكفي للتحليل. حدد منطقة أوضح وحاول مرة أخرى.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const parsed = scienceAnalysisService.parseImageSections(text);

  if (!parsed) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/90 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-2xs">
        {renderDistinctionText(text)}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 animate-in fade-in duration-150">
      {/* Page Link Reference Banner */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600">
        <span className="font-medium">{t.science?.visualHeaderBanner || 'تحليل المحتوى البصري'}</span>
        <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
          {t.common.page} {pageNumber}
        </span>
      </div>

      {/* Suggestion to switch to Math Analysis */}
      {parsed.suggestsMathAnalysis && (
        <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-indigo-900 leading-tight">
            {t.science?.switchMathPrompt || 'يحتوي هذا العنصر على مسألة أو معادلة رياضية.'}
          </span>
          <button
            onClick={onSwitchToAnalyze}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-xs active:scale-95 transition-transform"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{t.science?.switchMathBtn || 'تحليل المسألة'}</span>
          </button>
        </div>
      )}

      {/* 1. ماذا يظهر في العنصر؟ */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-1.5 text-indigo-700 font-extrabold text-xs">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>{t.science?.whatAppears || 'ماذا يظهر في العنصر؟'}</span>
        </div>
        <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
          {renderDistinctionText(parsed.whatAppears)}
        </div>
      </div>

      {/* 2. ما الأجزاء المهمة؟ */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-1.5 text-blue-700 font-extrabold text-xs">
          <Table className="w-3.5 h-3.5 text-blue-600" />
          <span>{t.science?.importantParts || 'ما الأجزاء المهمة؟'}</span>
        </div>
        <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
          {renderDistinctionText(parsed.importantParts)}
        </div>
      </div>

      {/* 3. ما علاقته بالنص القريب؟ */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 shadow-2xs">
        <div className="flex items-center gap-2 mb-1.5 text-indigo-950 font-extrabold text-xs">
          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
          <span>{t.science?.relationToNearby || 'ما علاقته بالنص القريب؟'}</span>
        </div>
        <div className="text-xs text-indigo-950 leading-relaxed whitespace-pre-line font-semibold">
          {renderDistinctionText(parsed.relationToNearby)}
        </div>
      </div>

      {/* 4. شرح مبسط للطالب */}
      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 shadow-2xs">
        <div className="flex items-center gap-2 mb-1.5 text-amber-950 font-extrabold text-xs">
          <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
          <span>{t.science?.simplifiedExplanation || 'شرح مبسط للطالب'}</span>
        </div>
        <div className="text-xs text-amber-900 leading-relaxed whitespace-pre-line font-medium">
          {renderDistinctionText(parsed.simplifiedExplanation)}
        </div>
      </div>

      {/* 5. سؤال قصير لاختبار الفهم */}
      {parsed.quizQuestion && (
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 mb-1.5 text-slate-900 font-extrabold text-xs">
            <CheckSquare className="w-3.5 h-3.5 text-slate-600" />
            <span>{t.science?.quizQuestion || 'سؤال قصير لاختبار الفهم'}</span>
          </div>
          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
            {parsed.quizQuestion}
          </div>
        </div>
      )}

      {/* 6. درجة الثقة */}
      {parsed.confidence && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-[11px]">
          <span className="font-semibold text-slate-600">
            {t.science?.confidence || 'درجة الثقة'}:
          </span>
          <span className="font-extrabold text-indigo-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
            {parsed.confidence.replace(/^[•\-\*:]+/, '').trim()}
          </span>
        </div>
      )}
    </div>
  );
};

export default ImageAnalysisView;
