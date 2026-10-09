import { ParsedVisualSections } from '../types';
import { SelectionRegion } from '../../selection/types';

export const scienceAnalysisService = {
  /**
   * Determine element type from selection shape and page context text
   */
  inferElementType(selection: SelectionRegion | null, text: string): string {
    if (!selection) return 'عنصر بصري';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('جدول') || lowerText.includes('table')) {
      return 'جدول';
    }
    if (lowerText.includes('خريطة') || lowerText.includes('موقع') || lowerText.includes('تضاريس')) {
      return 'خريطة';
    }
    if (lowerText.includes('تجربة') || lowerText.includes('نشاط عملي') || lowerText.includes('ملاحظة')) {
      return 'صورة تجربة';
    }
    if (selection.widthPct > 40 && selection.heightPct > 35) {
      return 'رسم علمي';
    }
    return 'صورة / مخطط توضيحي';
  },

  /**
   * Parse 6 structured visual sections from response
   */
  parseImageSections(text: string): ParsedVisualSections | null {
    const extractSection = (headingRegex: RegExp, nextHeadingRegex: RegExp): string => {
      const startMatch = text.search(headingRegex);
      if (startMatch === -1) return '';
      const sub = text.substring(startMatch);
      const lineEnd = sub.indexOf('\n');
      const contentStart = lineEnd !== -1 ? lineEnd + 1 : 0;
      const rest = sub.substring(contentStart);
      const nextMatch = rest.search(nextHeadingRegex);
      if (nextMatch !== -1) {
        return rest.substring(0, nextMatch).trim();
      }
      return rest.trim();
    };

    const whatAppears = extractSection(
      /(?:###|\*\*|•|\d\.)?\s*(?:ماذا يظهر في العنصر\؟|ماذا يظهر في العنصر)/i,
      /(?:###|\*\*|•|\d\.)?\s*(?:ما الأجزاء المهمة|الأجزاء المهمة|ما علاقته|شرح مبسط|سؤال قصير|درجة الثقة)/i
    );
    const importantParts = extractSection(
      /(?:###|\*\*|•|\d\.)?\s*(?:ما الأجزاء المهمة\؟|ما الأجزاء المهمة|الأجزاء المهمة)/i,
      /(?:###|\*\*|•|\d\.)?\s*(?:ما علاقته بالنص القريب|علاقته بالنص القريب|ما علاقته|شرح مبسط|سؤال قصير|درجة الثقة)/i
    );
    const relationToNearby = extractSection(
      /(?:###|\*\*|•|\d\.)?\s*(?:ما علاقته بالنص القريب\؟|علاقته بالنص القريب|ما علاقته)/i,
      /(?:###|\*\*|•|\d\.)?\s*(?:شرح مبسط للطالب|شرح مبسط|سؤال قصير|درجة الثقة)/i
    );
    const simplifiedExplanation = extractSection(
      /(?:###|\*\*|•|\d\.)?\s*(?:شرح مبسط للطالب|شرح مبسط)/i,
      /(?:###|\*\*|•|\d\.)?\s*(?:سؤال قصير لاختبار الفهم|سؤال قصير|درجة الثقة)/i
    );
    const quizQuestion = extractSection(
      /(?:###|\*\*|•|\d\.)?\s*(?:سؤال قصير لاختبار الفهم|سؤال قصير)/i,
      /(?:###|\*\*|•|\d\.)?\s*درجة الثقة/i
    );
    const confidence = extractSection(/(?:###|\*\*|•|\d\.)?\s*درجة الثقة/i, /$/i);

    if (!whatAppears && !importantParts && !simplifiedExplanation) {
      return null;
    }

    const suggestsMathAnalysis =
      text.includes('تحليل المسألة') ||
      text.includes('معادلة رياضية') ||
      text.includes('مسألة حسابية');

    return {
      whatAppears: whatAppears || 'عنصر بصري توضيحي من صفحة الكتاب.',
      importantParts: importantParts || 'البيانات والأجزاء والمسميات في الشكل.',
      relationToNearby: relationToNearby || 'يرتبط بالنص التعليمي وموضوع الدرس في الصفحة.',
      simplifiedExplanation: simplifiedExplanation || 'شرح مبسط يربط فكرة الشكل بذهن الطالب.',
      quizQuestion: quizQuestion || '',
      confidence: confidence || '95%',
      suggestsMathAnalysis,
    };
  },

  isUnclearImage(text: string): boolean {
    return (
      text.includes('الصورة غير واضحة بما يكفي للتحليل') ||
      text.includes('حدد منطقة أوضح')
    );
  },
};

export default scienceAnalysisService;
