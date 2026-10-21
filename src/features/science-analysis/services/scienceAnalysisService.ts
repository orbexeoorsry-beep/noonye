import { ParsedVisualSections } from '../types';
import { SelectionRegion } from '../../selection/types';

type VisualSectionKey =
  | 'whatAppears'
  | 'importantParts'
  | 'relationToNearby'
  | 'simplifiedExplanation'
  | 'quizQuestion'
  | 'confidence';

const VISUAL_HEADING_PATTERNS: Array<{ key: VisualSectionKey; regex: RegExp }> = [
  {
    key: 'whatAppears',
    regex:
      /^(?:ماذا\s*يظهر\s*في\s*العنصر\s*[؟?]?|What\s*Appears\s*in\s*the\s*Element\s*\??|What\s*Appears\s*\??)/i,
  },
  {
    key: 'importantParts',
    regex:
      /^(?:ما\s*الأجزاء\s*المهمة\s*[؟?]?|الأجزاء\s*المهمة|Key\s*Components\s*&\s*Labels|Key\s*Components|Important\s*Parts)/i,
  },
  {
    key: 'relationToNearby',
    regex:
      /^(?:ما\s*علاقته\s*بالنص\s*القريب\s*[؟?]?|علاقته\s*بالنص\s*القريب|Relation\s*to\s*Nearby\s*Text|Relation\s*to\s*Text)/i,
  },
  {
    key: 'simplifiedExplanation',
    regex:
      /^(?:شرح\s*مبسط\s*للطالب|شرح\s*مبسط|Simplified\s*Explanation(?:\s*for\s*Students)?)/i,
  },
  {
    key: 'quizQuestion',
    regex:
      /^(?:سؤال\s*قصير\s*لاختبار\s*الفهم|سؤال\s*قصير|Quick\s*Comprehension\s*Question|Quick\s*Quiz)/i,
  },
  {
    key: 'confidence',
    regex: /^(?:درجة\s*الثقة|Confidence\s*Level|Confidence)/i,
  },
];

export const scienceAnalysisService = {
  /**
   * Determine element type from selection shape and page context text
   */
  inferElementType(selection: SelectionRegion | null, text: string, lang: string = 'ar'): string {
    const isEn = lang === 'en';
    if (!selection) return isEn ? 'Visual Element' : 'عنصر بصري';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('جدول') || lowerText.includes('table') || lowerText.includes('%')) {
      return isEn ? 'Table / Data' : 'جدول';
    }
    if (
      lowerText.includes('خريطة') ||
      lowerText.includes('موقع') ||
      lowerText.includes('تضاريس') ||
      lowerText.includes('map') ||
      lowerText.includes('basin')
    ) {
      return isEn ? 'Map' : 'خريطة';
    }
    if (
      lowerText.includes('تجربة') ||
      lowerText.includes('نشاط عملي') ||
      lowerText.includes('ملاحظة') ||
      lowerText.includes('experiment')
    ) {
      return isEn ? 'Experiment' : 'صورة تجربة';
    }
    if (
      lowerText.includes('sqrt') ||
      lowerText.includes('delta') ||
      lowerText.includes('معادلة') ||
      lowerText.includes('formula') ||
      lowerText.includes('equation')
    ) {
      return isEn ? 'Problem / Equation' : 'مسألة / معادلة';
    }
    if (selection.widthPct > 40 && selection.heightPct > 35) {
      return isEn ? 'Scientific Diagram' : 'رسم علمي';
    }
    return isEn ? 'Selected Section' : 'صورة / مقطع محدد';
  },

  /**
   * Parse 6 structured visual sections from response (Supports both Arabic & English headings)
   */
  parseImageSections(text: string): ParsedVisualSections | null {
    if (!text || !text.trim()) return null;

    const buckets: Record<VisualSectionKey, string[]> = {
      whatAppears: [],
      importantParts: [],
      relationToNearby: [],
      simplifiedExplanation: [],
      quizQuestion: [],
      confidence: [],
    };

    let currentKey: VisualSectionKey | null = null;
    const lines = text.split(/\r?\n/);

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        if (currentKey && buckets[currentKey].length > 0) {
          buckets[currentKey].push('');
        }
        continue;
      }

      const hasHeadingPrefix = /^(?:#{1,4}\s*|\*\*|(?:[١٢٣٤٥٦1-6][.\-)]\s*))/.test(trimmed);
      const strippedPrefix = trimmed
        .replace(/^(?:#{1,4}\s*|\*\*|(?:[١٢٣٤٥٦1-6][.\-)]\s*)|\*\*\s*)+/, '')
        .trim();

      let matchedHeading: { key: VisualSectionKey; inlineRest: string } | null = null;

      for (const { key, regex } of VISUAL_HEADING_PATTERNS) {
        const m = regex.exec(strippedPrefix);
        if (m) {
          const afterLabel = strippedPrefix.slice(m[0].length).trim();
          const isCleanHeaderEnd =
            afterLabel === '' ||
            afterLabel === '**' ||
            /^(\*\*)?\s*[:：\-—?؟]/.test(afterLabel);

          if (hasHeadingPrefix || isCleanHeaderEnd) {
            const inlineRest = afterLabel
              .replace(/^(\*\*)?\s*[:：\-—?؟]?\s*(\*\*)?\s*/, '')
              .replace(/\*\*$/, '')
              .trim();
            matchedHeading = { key, inlineRest };
            break;
          }
        }
      }

      if (matchedHeading) {
        currentKey = matchedHeading.key;
        if (matchedHeading.inlineRest) {
          buckets[currentKey].push(matchedHeading.inlineRest);
        }
      } else if (currentKey) {
        buckets[currentKey].push(trimmed);
      }
    }

    const cleanBucket = (key: VisualSectionKey) => buckets[key].join('\n').trim();

    const whatAppears = cleanBucket('whatAppears');
    const importantParts = cleanBucket('importantParts');
    const relationToNearby = cleanBucket('relationToNearby');
    const simplifiedExplanation = cleanBucket('simplifiedExplanation');
    const quizQuestion = cleanBucket('quizQuestion');
    const confidence = cleanBucket('confidence');

    if (!whatAppears && !importantParts && !simplifiedExplanation) {
      return null;
    }

    const isEnglish =
      /[A-Za-z]{4,}/.test(whatAppears + simplifiedExplanation) &&
      !/[\u0600-\u06FF]{4,}/.test(whatAppears);

    const suggestsMathAnalysis =
      text.includes('تحليل المسألة') ||
      text.includes('معادلة رياضية') ||
      text.includes('مسألة حسابية') ||
      text.toLowerCase().includes('analyze problem') ||
      text.toLowerCase().includes('mathematical equation');

    return {
      whatAppears:
        whatAppears ||
        (isEnglish
          ? 'Visual educational element from the textbook page.'
          : 'عنصر بصري توضيحي من صفحة الكتاب.'),
      importantParts:
        importantParts ||
        (isEnglish
          ? 'Key labels, arrows, and components in the figure.'
          : 'البيانات والأجزاء والمسميات في الشكل.'),
      relationToNearby:
        relationToNearby ||
        (isEnglish
          ? 'Directly illustrates the lesson concept on this page.'
          : 'يرتبط بالنص التعليمي وموضوع الدرس في الصفحة.'),
      simplifiedExplanation:
        simplifiedExplanation ||
        (isEnglish
          ? 'Clear visual summary of the textbook concept.'
          : 'شرح مبسط يربط فكرة الشكل بذهن الطالب.'),
      quizQuestion: quizQuestion || '',
      confidence: confidence || '95%',
      suggestsMathAnalysis,
    };
  },

  isUnclearImage(text: string): boolean {
    return (
      text.includes('الصورة غير واضحة بما يكفي للتحليل') ||
      text.includes('حدد منطقة أوضح') ||
      text.includes('Image is not clear enough for analysis')
    );
  },
};

export default scienceAnalysisService;

