import { ParsedMathSections } from '../types';

export const mathAnalysisService = {
  /**
   * Parse structured mathematical problem sections from model response
   */
  parseProblemSections(text: string): ParsedMathSections | null {
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

    const given = extractSection(
      /(?:###|\*\*|•|\d\.)?\s*المعطيات/i,
      /(?:###|\*\*|•|\d\.)?\s*(?:المطلوب|الفكرة|تلميح|خطوات|الحل النهائي|درجة الثقة)/i
    );
    const required = extractSection(
      /(?:###|\*\*|•|\d\.)?\s*المطلوب/i,
      /(?:###|\*\*|•|\d\.)?\s*(?:الفكرة|القانون|تلميح|خطوات|الحل النهائي|درجة الثقة)/i
    );
    const concept = extractSection(
      /(?:###|\*\*|•|\d\.)?\s*(?:الفكرة أو القانون المناسب|الفكرة|القانون المناسب)/i,
      /(?:###|\*\*|•|\d\.)?\s*(?:تلميح|خطوات|الحل النهائي|درجة الثقة)/i
    );
    const hint = extractSection(
      /(?:###|\*\*|•|\d\.)?\s*(?:تلميح أول|تلميح)/i,
      /(?:###|\*\*|•|\d\.)?\s*(?:خطوات الحل|خطوات|الحل النهائي|درجة الثقة)/i
    );
    const steps = extractSection(
      /(?:###|\*\*|•|\d\.)?\s*(?:خطوات الحل|خطوات)/i,
      /(?:###|\*\*|•|\d\.)?\s*(?:الحل النهائي|درجة الثقة)/i
    );
    const finalSolution = extractSection(
      /(?:###|\*\*|•|\d\.)?\s*(?:الحل النهائي|النتيجة النهائية)/i,
      /(?:###|\*\*|•|\d\.)?\s*درجة الثقة/i
    );
    const confidence = extractSection(/(?:###|\*\*|•|\d\.)?\s*درجة الثقة/i, /$/i);

    if (!given && !required && !finalSolution) {
      return null;
    }

    return {
      given: given || 'لم تحدد معطيات إضافية.',
      required: required || 'المطلوب مبين في نص المسألة.',
      concept: concept || 'تطبيق القواعد الرياضية المباشرة.',
      hint: hint || 'راجع العلاقات الأساسية بين عناصر المسألة.',
      steps: steps || 'تطبيق متسلسل للقانون.',
      finalSolution: finalSolution || 'تم استخراج الناتج.',
      confidence: confidence || '95%',
    };
  },

  isUnclearProblem(text: string): boolean {
    return (
      text.includes('لم أتمكن من قراءة المسألة بوضوح') ||
      text.includes('حدد منطقة أكبر')
    );
  },
};

export default mathAnalysisService;
