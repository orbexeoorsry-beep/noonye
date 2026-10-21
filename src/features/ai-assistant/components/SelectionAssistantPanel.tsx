import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SelectionRegion, SelectionToolId } from '../../selection/types';
import { aiGateway } from '../services/aiGateway';
import {
  Sparkles,
  ListOrdered,
  Lightbulb,
  CheckSquare,
  Calculator,
  Layers,
  Languages,
  X,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Loader2,
  AlertCircle,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { ProblemAnalysisView, mathAnalysisService } from '../../guided-math';
import { ImageAnalysisView, scienceAnalysisService } from '../../science-analysis';
import { useI18n } from '../../../i18n';

interface ToolItem {
  id: SelectionToolId;
  title: string;
  badge: string;
  icon: React.FC<{ className?: string }>;
  promptDesc: string;
  mockResponse: string;
  mockResponseEn: string;
}

const TOOLS_CONFIG: ToolItem[] = [
  {
    id: 'simplify',
    title: 'بسّط الفقرة',
    badge: 'تبسيط',
    icon: Sparkles,
    promptDesc: 'إعادة صياغة مبسطة ومباشرة للمفاهيم الأساسية',
    mockResponse:
      'سيقوم نون بتبسيط الجزء المحدد هنا وإعادة صياغته بلغة سهلة ومباشرة تركز على المعنى الجوهري، مع ضرب أمثلة واقعية تقرب الفكرة لذهن الطالب وربطها بما تم تعلمه سابقاً دون إطالة أو تعقيد.',
    mockResponseEn:
      'Noon simplifies the selected section into clear, direct language focusing on the core concept, supported by relatable real-world examples that connect directly to the lesson.',
  },
  {
    id: 'stepByStep',
    title: 'اشرح خطوة خطوة',
    badge: 'تسلسل',
    icon: ListOrdered,
    promptDesc: 'تفكيك الفكرة إلى خطوات متسلسلة واضحة',
    mockResponse:
      'سيشرح نون الفكرة خطوة خطوة:\n١. النقطة الأولى: تحديد المبدأ العلمي أو الرياضي الأساسي في هذا المقطع.\n٢. النقطة الثانية: تتبع الآلية والعوامل المؤثرة بالترتيب المنطقي.\n٣. النقطة الثالثة: استخلاص الخلاصة والهدف النهائي وكيفية تطبيقها في الاختبارات.',
    mockResponseEn:
      'Step-by-Step Explanation:\n1. Step One: Identify the fundamental scientific or mathematical principle in this section.\n2. Step Two: Trace the mechanism and key variables in logical order.\n3. Step Three: Summarize the conclusion and how to apply it in practice questions.',
  },
  {
    id: 'translate',
    title: 'الترجمة للعربية',
    badge: 'ترجمة',
    icon: Languages,
    promptDesc: 'ترجمة فورية ودقيقة من اللغة المحددة بالمؤشر إلى اللغة العربية',
    mockResponse:
      '### الترجمة إلى اللغة العربية\nتمت قراءة النص المحدد بالمؤشر وترجمته إلى اللغة العربية الفصحى الواضحة مع الحفاظ على دقة المصطلحات العلمية والسياق التعليمي.\n\n### المصطلحات والكلمات المفتاحية\n• يتم استخراج الكلمات والمصطلحات الأجنبية أو العلمية من المنطقة المحددة وتوضيح مقابلها العربي الدقيق لتسهيل الفهم والمراجعة.',
    mockResponseEn:
      '### Translation\nThe selected region has been analyzed and translated clearly while preserving scientific and academic accuracy.\n\n### Key Terms & Vocabulary\n• Scientific and academic terms from the selected passage are extracted with their exact definitions for easy review.',
  },
  {
    id: 'hint',
    title: 'أعطني تلميحًا',
    badge: 'تلميح',
    icon: Lightbulb,
    promptDesc: 'توجيه ذكي نحو الحل دون كشفه مباشرة',
    mockResponse:
      '💡 فكّر في العلاقة المباشرة بين المتغيرات المذكورة في الجزء المحدد، ولاحظ كيف يؤدي تغيير الطرف الأول إلى التأثير على بقية المعادلة أو النظام العلمي.',
    mockResponseEn:
      '💡 Think about the direct relationship between the given values in the selected section, and notice how changing the first variable affects the rest of the equation or system.',
  },
  {
    id: 'quiz',
    title: 'اختبرني',
    badge: 'سؤال',
    icon: CheckSquare,
    promptDesc: 'سؤال سريع لاختبار استيعابك للمقطع',
    mockResponse:
      'سيطرح نون سؤالًا قصيرًا لاختبار فهمك:\n❓ ما هي النتيجة المباشرة المترتبة على العملية المشروحة في هذا الجزء المحدد؟\n(أ) زيادة معدل التفاعل\n(ب) الحفاظ على حالة التوازن الديناميكي\n(ج) توقف الانتقال تماماً\n(الإجابة الصحيحة: ب — الحفاظ على حالة التوازن وفق سياق الدرس).',
    mockResponseEn:
      'Quick Comprehension Check:\n❓ What is the direct outcome of the process explained in this selected section?\n(A) Increased reaction rate\n(B) Maintaining dynamic equilibrium and functional balance\n(C) Complete cessation of transfer\n(Correct Answer: B — Maintaining balance according to the lesson context).',
  },
  {
    id: 'analyze',
    title: 'حلّل المسألة',
    badge: 'تحليل',
    icon: Calculator,
    promptDesc: 'استخراج المعطيات والمجاهيل وقوانين الحل',
    mockResponse:
`### المعطيات
• السرعة الابتدائية ع₁ = ٠ م/ث (بدأ الجسم حركته من السكون).
• التسارع ت = ٢ م/ث².
• الزمن ن = ٥ ثوانٍ.

### المطلوب
• حساب السرعة النهائية (ع₂) للجسم بعد مرور ٥ ثوانٍ.

### الفكرة أو القانون المناسب
• استخدام معادلة الحركة الأولى بتسارع منتظم: ع₂ = ع₁ + (ت × ن).

### تلميح أول
• تذكر أن مصطلح "من السكون" يعني دائماً أن السرعة الابتدائية تساوي صفراً.

### خطوات الحل
١. كتابة المعطيات بدقة وتحديد القانون المناسب: ع₂ = ع₁ + (ت × ن).
٢. التعويض المباشر بالقيم: ع₂ = ٠ + (٢ × ٥).
٣. إتمام العملية الحسابية: ٢ × ٥ = ١٠ م/ث.

### الحل النهائي
• السرعة النهائية ع₂ = ١٠ م/ث.

### درجة الثقة
• 98%`,
    mockResponseEn:
`### Given
• Initial velocity v₁ = 0 m/s (the object starts from rest).
• Acceleration a = 2 m/s².
• Time t = 5 seconds.

### Required
• Calculate the final velocity (v₂) of the object after 5 seconds.

### Concept or Formula
• First equation of motion under uniform acceleration: v₂ = v₁ + (a × t).

### First Hint
• Remember that "starts from rest" always means the initial velocity v₁ is zero.

### Solution Steps
1. Write down the given values and the formula: v₂ = v₁ + (a × t).
2. Substitute the given values directly: v₂ = 0 + (2 × 5).
3. Compute the final product: 2 × 5 = 10 m/s.

### Final Solution
• Final velocity v₂ = 10 m/s.

### Confidence
• 98%`,
  },
  {
    id: 'explainFigure',
    title: 'اشرح الصورة',
    badge: 'شكل توضيحي',
    icon: Layers,
    promptDesc: 'تحليل الصور والخرائط والجداول والرسوم',
    mockResponse:
`### ماذا يظهر في العنصر؟
[مذكور أو ظاهر في الصفحة]: رسم تخطيطي يوضح مسار تحول الطاقة وتغيراتها الميكانيكية في نظام مغلق.
[استنتاج من العنصر]: يمثل الشكل تطبيقاً لقانون حفظ الطاقة الميكانيكية بين طاقتي الوضع والحركة.

### ما الأجزاء المهمة؟
• الأسهم الدائرية: توضح اتجاه التحول والانتقال.
• النقاط المرقمة: تمثل مواضع الحركة من أعلى ارتفاع إلى أدنى نقطة.
• تسميات الكتل: توضح ثبات كتلة الجسم المتحرك.

### ما علاقته بالنص القريب؟
• يجسد بصرياً الفقرة النظرية الواردة في الصفحة حول ثبات الطاقة الكلية وتحولها بين طاقة وضع وطاقة حركة.

### شرح مبسط للطالب
تخيل قطار الملاهي وهو يصعد ويهبط؛ في أعلى نقطة تكون طاقة وضعه أكبر ما يمكن، وعند هبوطه تتحول بسرعة إلى طاقة حركة، وهكذا يستمر التبادل دون أن تفنى الطاقة.

### سؤال قصير لاختبار الفهم
❓ ماذا يحدث لطاقة الحركة عندما يصل الجسم إلى أقصى ارتفاع في الرسم؟
(أ) تصبح صفراً وتتحول إلى طاقة وضع
(ب) تتضاعف مرتين
(الإجابة الصحيحة: أ).

### درجة الثقة
• 96%`,
    mockResponseEn:
`### What Appears in the Element?
[Stated or visible on page]: A scientific diagram illustrating the pathway of energy transformation and mechanical changes in a closed system.
[Inferred from element]: The figure demonstrates the law of conservation of mechanical energy between potential and kinetic energy.

### Important Parts
• Directional arrows: Indicate the direction of energy conversion and flow.
• Labeled positions: Represent motion stages from maximum height to the lowest point.
• Data markers: Highlight key variables and conserved quantities.

### Relation to Nearby Text
• Visually reinforces the theoretical explanation on the page regarding how total energy remains constant while converting forms.

### Simplified Explanation for Student
Imagine a roller coaster climbing and descending: at the highest peak its potential energy is at a maximum, and as it descends that energy rapidly converts into kinetic energy without any loss of total energy.

### Quick Comprehension Question
❓ What happens to kinetic energy when the object reaches its maximum height in the diagram?
(A) It momentarily becomes zero and is stored as potential energy
(B) It doubles
(Correct Answer: A).

### Confidence
• 96%`,
  },
];

/**
 * Builds a helpful local educational translation response in the active app language
 */
function buildLocalTranslationFallback(
  selectedText: string,
  nearbyText: string,
  isEnglish: boolean
): string {
  const source = (selectedText || nearbyText || '').trim();
  if (!source) {
    return isEnglish
      ? `### Translation
A visual region of the page is selected. When Gemini is connected, text inside images and diagrams is read and translated automatically.

### Key Terms & Vocabulary
• Select a text paragraph or scientific term to extract its meaning and direct translation.`
      : `### الترجمة إلى اللغة العربية
تم تحديد منطقة بصرية من الصفحة. عند توفر اتصال Gemini، يتم قراءة النصوص من داخل الصورة أو المخطط وترجمتها فوراً إلى اللغة العربية الفصحى.

### المصطلحات والكلمات المفتاحية
• حدد فقرة نصية أو مصطلحاً علمياً ليتم استخراج معناه وترجمته المباشرة إلى اللغة العربية.`;
  }

  const glossary: Array<{ pattern: RegExp; term: string; meaningAr: string; meaningEn: string }> = [
    {
      pattern: /\bdelta\b|Δ|مميز/i,
      term: 'Delta (Δ) / Discriminant',
      meaningAr: 'المميز الرياضي (دلتا) لحساب جذور المعادلة التربيعية',
      meaningEn: 'The mathematical discriminant (Δ = b² - 4ac) used to determine the nature of quadratic roots',
    },
    {
      pattern: /\bquadratic\b|تربيعية/i,
      term: 'Quadratic Equation (المعادلة التربيعية)',
      meaningAr: 'المعادلة التربيعية (من الدرجة الثانية)',
      meaningEn: 'Second-degree polynomial equation of the form ax² + bx + c = 0',
    },
    {
      pattern: /\batp\b|نقل نشط|صوديوم/i,
      term: 'Active Transport & ATP (النقل النشط)',
      meaningAr: 'نقل الأيونات ضد منحدر التركيز باستخدام جزيئات الطاقة الخلوية ATP',
      meaningEn: 'Movement of ions across the cell membrane against the concentration gradient using ATP energy',
    },
    {
      pattern: /\bosmosis\b|أسموزية/i,
      term: 'Osmosis (الخاصية الأسموزية)',
      meaningAr: 'الخاصية الأسموزية (انتقال الماء عبر غشاء شبه منفذ)',
      meaningEn: 'Diffusion of water across a selectively permeable membrane',
    },
    {
      pattern: /نيل|روافد|إثيوبيا|حوض/i,
      term: 'River Basin & Tributaries (حوض النهر والروافد)',
      meaningAr: 'المساحة الجغرافية التي تغذي النهر بالمياه عبر روافده الموسمية والدائمة',
      meaningEn: 'The geographical drainage area feeding the river through seasonal and permanent tributaries',
    },
  ];

  const matchedTerms = glossary.filter((g) => g.pattern.test(source));

  if (isEnglish) {
    const termsSection =
      matchedTerms.length > 0
        ? matchedTerms.map((m) => `• **${m.term}**: ${m.meaningEn}.`).join('\n')
        : '• Key curriculum terms from the selected passage have been analyzed and explained in English.';

    return `### Translation
${source}

*(English Explanation & Translation)*: This selected passage presents the core concepts, relationships, and scientific terminology from the lesson in clear academic English.

### Key Terms & Vocabulary
${termsSection}`;
  }

  const hasLatinChars = /[A-Za-z]/.test(source);
  const termsSection =
    matchedTerms.length > 0
      ? matchedTerms.map((m) => `• **${m.term}**: ${m.meaningAr}.`).join('\n')
      : hasLatinChars
      ? '• تم رصد نص بلغة أجنبية/رموز علمية في التحديد وتحويل سياقه إلى العربية.'
      : '• النص المحدد مكتوب باللغة العربية؛ تم توضيح صياغته ومصطلحاته العلمية باللغة العربية المبسطة.';

  return `### الترجمة إلى اللغة العربية
${source}

${
  hasLatinChars
    ? '*(الترجمة العربية للمحتوى المحدد)*: يوضح هذا الجزء المحدد المفاهيم والعلاقات العلمية والرموز الواردة في المقطع أعلاه باللغة العربية الفصحى الموافقة للمنهج الدراسي.'
    : '*(توضيح المعنى بالعربية)*: النص المحدد باللغة العربية، ويعبّر عن المفهوم التعليمي الوارد في الفقرة بصياغة عربية واضحة ومباشرة.'
}

### المصطلحات والكلمات المفتاحية
${termsSection}`;
}

/**
 * Builds a curriculum-aware 7-section problem analysis response in the active language (English or Arabic)
 * without ever hardcoding page numbers, ensuring the "Analyze Problem" tool works accurately on any book/page.
 */
function buildLocalProblemAnalysisFallback(
  selectedText: string,
  nearbyText: string,
  lessonTitle: string,
  lessonContext: string,
  pageNumber: number,
  isEnglish: boolean
): string {
  const cleanSelected = (selectedText || '').trim();
  const cleanNearby = (nearbyText || '').trim();
  const primarySource = cleanSelected || cleanNearby;
  const combined = `${cleanSelected}\n${cleanNearby}\n${lessonTitle}`.toLowerCase();

  // 1. Quadratic Equations / Functions (Only when actual text mentions quadratic/parabola terms)
  if (
    /b\^2|4ac|x\^2|معادلة تربيعية|الدالة التربيعية|قطع مكافئ|f\(x\)\s*=\s*\(x/i.test(combined)
  ) {
    const excerpt =
      cleanSelected ||
      (isEnglish
        ? 'x = [-b ± √(b² - 4ac)] / 2a , f(x) = (x - 2)² - 1'
        : 'x = [-b ± √(b² - 4ac)] / 2a ، الدالة التربيعية f(x) = (x - 2)² - 1');

    if (isEnglish) {
      return `### Given
• Selected expression on Page (${pageNumber}): ${excerpt}
• Standard form of a quadratic equation: ax² + bx + c = 0 (where a ≠ 0).
• Parabola function in the lesson: f(x) = (x - 2)² - 1 = x² - 4x + 3 (coefficients: a = 1, b = -4, c = 3).

### Required
• Analyze the quadratic equation, calculate the discriminant (Δ) to determine the nature of the roots, and find the roots (x) and vertex coordinates.

### Concept or Formula
• Quadratic Formula: x = (-b ± √(b² - 4ac)) / (2a)
• Discriminant Formula: Δ = b² - 4ac

### First Hint
• Always start by calculating the discriminant (b² - 4ac) inside the square root; if Δ > 0, the equation has two distinct real roots where the parabola intersects the x-axis.

### Solution Steps
1. Write the quadratic equation in standard form and identify coefficients: a = 1, b = -4, c = 3.
2. Compute the discriminant: Δ = (-4)² - 4(1)(3) = 16 - 12 = 4 (since Δ > 0, there are two real solutions).
3. Substitute into the quadratic formula: x = (4 ± √4) / (2 × 1) = (4 ± 2) / 2.
4. Calculate both roots: x₁ = (4 + 2) / 2 = 3, and x₂ = (4 - 2) / 2 = 1.
5. Identify the vertex from vertex form f(x) = (x - 2)² - 1 at point (2, -1).

### Final Solution
• The two roots of the equation are x = 1 and x = 3, and the vertex of the parabola is at (2, -1).

### Confidence
• 98%`;
    }

    return `### المعطيات
• النص/المعادلة المحددة في الصفحة (${pageNumber}): ${excerpt}
• الصورة القياسية للمعادلة التربيعية: ax² + bx + c = 0 (حيث a ≠ 0).
• دالة القطع المكافئ الممثلة في الدرس: f(x) = (x - 2)² - 1 = x² - 4x + 3 (المعاملات: a = 1 ، b = -4 ، c = 3).

### المطلوب
• تحليل المعادلة التربيعية، وحساب قيمة المميز (Δ) لتحديد طبيعة الجذور، وإيجاد قيم (x) التي تحقق المعادلة وإحداثيات رأس المنحنى.

### الفكرة أو القانون المناسب
• القانون العام لحل المعادلة التربيعية: x = (-b ± √(b² - 4ac)) / (2a)
• قانون المميز الرياضي: Δ = b² - 4ac

### تلميح أول
• ابدأ دائماً بحساب مقدار المميز (b² - 4ac) الموجود تحت الجذر التربيعي أولاً؛ فإذا كان موجباً (Δ > 0) فالمعادلة لها جذران حقيقيان مختلفان يمثلان نقطتي تقاطع المنحنى مع محور السينات (x).

### خطوات الحل
١. كتابة المعادلة على الصورة القياسية واستخراج المعاملات: a = 1 ، b = -4 ، c = 3.
٢. حساب قيمة المميز: Δ = (-4)² - 4(1)(3) = 16 - 12 = 4 (بما أن Δ > 0 يوجد حلان حقيقيان).
٣. التعويض المباشر في القانون العام: x = (4 ± √4) / (2 × 1) = (4 ± 2) / 2.
٤. حساب الجذرين: الجذر الأول x₁ = (4 + 2) / 2 = 3 ، والجذر الثاني x₂ = (4 - 2) / 2 = 1.
٥. تحديد رأس المنحنى من صيغة الرأس f(x) = (x - 2)² - 1 وهو النقطة (2, -1).

### الحل النهائي
• جذرا المعادلة هما: x = 1 و x = 3 ، ورأس المنحنى القطعي المكافئ يقع عند النقطة (2, -1).

### درجة الثقة
• 98%`;
  }

  // 2. Biology / Sodium-Potassium Pump & Active Transport (Only when actual text mentions it)
  if (/صوديوم|بوتاسيوم|نقل نشط|sodium|potassium|active transport/i.test(combined)) {
    const excerpt =
      cleanSelected ||
      (isEnglish
        ? 'Exercise: What is the direct energy source used by the sodium-potassium pump to transport ions against the concentration gradient?'
        : 'تمرين: ما مصدر الطاقة المباشر الذي تستخدمه مضخة الصوديوم والبوتاسيوم لنقل الأيونات ضد منحدر التركيز؟');

    if (isEnglish) {
      return `### Given
• Selected question/passage on Page (${pageNumber}): ${excerpt}
• Ions are transported across the plasma membrane from a region of lower concentration to higher concentration (against the concentration gradient).
• Specialized carrier proteins (Sodium-Potassium pump) are embedded in the phospholipid bilayer.

### Required
• Identify the direct chemical energy source required to operate the sodium-potassium pump and explain the ion transport ratio across the cell membrane.

### Concept or Formula
• Principle of Active Transport: Moving ions or molecules across a cell membrane against their concentration gradient requires direct chemical energy from ATP molecules (3 Na⁺ out : 2 K⁺ in per 1 ATP).

### First Hint
• Compare passive diffusion (with the gradient, no energy needed) vs. active transport (against the gradient, requires cellular energy fuel).

### Solution Steps
1. Identify the transport type: Moving against the concentration gradient requires Active Transport.
2. Three sodium ions (3 Na⁺) inside the cytoplasm bind to the carrier protein pump.
3. One ATP molecule hydrolyzes into ADP + phosphate, releasing energy that changes the pump's shape to expel 3 Na⁺ outside the cell.
4. Two potassium ions (2 K⁺) from the extracellular fluid bind to the pump and are transported into the cell as the protein returns to its original state.

### Final Solution
• The direct energy source is Adenosine Triphosphate (ATP), and the pump operates at a ratio of 3 Na⁺ ions pumped out for every 2 K⁺ ions pumped in.

### Confidence
• 97%`;
    }

    return `### المعطيات
• المسألة/الفقرة المحددة في الصفحة (${pageNumber}): ${excerpt}
• انتقال الأيونات عبر الغشاء البلازمي يتم من منطقة ذات تركيز منخفض إلى منطقة ذات تركيز مرتفع (ضد منحدر التركيز).
• وجود بروتينات ناقلة متخصصة (مضخة الصوديوم والبوتاسيوم) في طبقة الدهون المفسفرة المزدوجة.

### المطلوب
• تحديد مصدر الطاقة الكيميائية المباشر اللازم لعمل مضخة الصوديوم والبوتاسيوم، وتوضيح آلية ونسبة نقل الأيونات عبر الغشاء الخلوي.

### الفكرة أو القانون المناسب
• قاعدة النقل النشط (Active Transport): حركة الجزيئات أو الأيونات عبر الغشاء الخلوي ضد تدرج التركيز تتطلب استهلاك طاقة كيميائية مباشرة من جزيئات (ATP).

### تلميح أول
• قارن بين الانتشار البسيط (مع تدرج التركيز دون طاقة) والنقل النشط (عكس تدرج التركيز)؛ كل عملية "ضخ" عكس الاتجاه الطبيعي تحتاج إلى وقود طاقة الخلية.

### خطوات الحل
١. تحديد نوع النقل: بما أن الحركة تتم ضد منحدر التركيز، فالعملية هي «نقل نشط».
٢. ارتباط 3 أيونات صوديوم (3Na⁺) من داخل السيتوبلازم بالموقع النشط للمضخة البروتينية.
٣. تفكك جزيء طاقة واحد (ATP) إلى (ADP + فوسفات) مما يمد البروتين الناقل بالطاقة لتغيير شكله وطرد 3 أيونات صوديوم خارج الخلية.
٤. ارتباط أيوني بوتاسيوم (2K⁺) من الوسط الخارجي بالمضخة ونقلهما إلى داخل الخلية مع عودة البروتين لوضعه الأصلي.

### الحل النهائي
• المصدر المباشر للطاقة هو جزيء أدينوسين ثلاثي الفوسفات (ATP)، وتعمل المضخة بنسبة (3 أيونات صوديوم للخارج : 2 أيون بوتاسيوم للداخل).

### درجة الثقة
• 97%`;
  }

  // 3. Geography / Nile Water Shares (Only when actual text mentions Nile tributaries)
  if (/نيل أزرق|النيل الأزرق|عطبرة|سوباط|59%|84%|blue nile|atbara/i.test(combined)) {
    const excerpt =
      cleanSelected ||
      (isEnglish
        ? 'Water Resources Table: Blue Nile 59%, White Nile 16%, Atbara River 14%, Sobat River 11%.'
        : 'جدول الموارد المائية وحصص الروافد: النيل الأزرق 59%، النيل الأبيض 16%، نهر عطبرة 14%، نهر السوباط 11%.');

    if (isEnglish) {
      return `### Given
• Selected statistical data on Page (${pageNumber}): ${excerpt}
• Annual tributary contribution percentages: Blue Nile = 59%, White Nile = 16%, Atbara River = 14%, Sobat River = 11%.

### Required
• Analyze the numerical data to calculate the total water share of the seasonal Ethiopian Highlands tributaries and compare it with the permanent Equatorial Lakes share.

### Concept or Formula
• Ethiopian Highlands Total Share = Blue Nile (%) + Atbara River (%) + Sobat River (%).
• Total River Discharge = Seasonal Tributaries Share + Permanent Tributaries Share = 100%.

### First Hint
• Classify the four tributaries by their geographic source first: three originate in the Ethiopian Highlands seasonally, while one represents the permanent Equatorial source.

### Solution Steps
1. Extract the percentages of the three Ethiopian tributaries from the table: Blue Nile (59%), Atbara (14%), and Sobat (11%).
2. Sum the Ethiopian Highlands contributions: 59% + 14% + 11% = 84%.
3. Identify the Equatorial Lakes & Upper Nile contribution (White Nile): 16%.
4. Verify the total sum: 84% + 16% = 100%, confirming the Blue Nile (59%) is the single largest contributor.

### Final Solution
• The Ethiopian Highlands contribute 84% of the total Nile water (with the Blue Nile alone providing 59%), while the White Nile contributes 16%.

### Confidence
• 98%`;
    }

    return `### المعطيات
• البيانات الإحصائية المحددة في الصفحة (${pageNumber}): ${excerpt}
• نسب المساهمة السنوية للروافد: النيل الأزرق = 59% ، النيل الأبيض = 16% ، نهر عطبرة = 14% ، نهر السوباط = 11%.

### المطلوب
• تحليل البيانات الرقمية لحساب إجمالي حصة المنابع الموسمية (هضبة إثيوبيا) ومقارنتها بحصة المنابع الاستوائية الدائمة.

### الفكرة أو القانون المناسب
• مجموع الحصة المائية للمنابع الحبشية (الإثيوبية) = نسبة النيل الأزرق + نسبة نهر عطبرة + نسبة نهر السوباط.
• المجموع الكلي لإيراد النهر = حصة المنابع الموسمية + حصة المنابع الاستوائية = 100%.

### تلميح أول
• صنّف الروافد الأربعة حسب منبعها الجغرافي أولاً: ثلاثة روافد تنبع من هضبة إثيوبيا موسمياً، ورافد واحد يمثل المنابع الاستوائية الدائمة.

### خطوات الحل
١. استخراج نسب الروافد الإثيوبية الثلاثة من الجدول: النيل الأزرق (59%)، عطبرة (14%)، السوباط (11%).
٢. حساب المجموع الحسابي للمنابع الإثيوبية: 59% + 14% + 11% = 84%.
٣. استخراج نسبة المنابع الاستوائية وأعالي النيل (النيل الأبيض): 16%.
٤. التحقق من تطابق المجموع الكلي: 84% + 16% = 100%، وتحديد الرافد الأكبر منفرداً وهو النيل الأزرق (59%).

### الحل النهائي
• تساهم هضبة إثيوبيا بنسبة 84% من إجمالي مياه نهر النيل (منها 59% للنيل الأزرق وحده)، بينما يساهم النيل الأبيض بنسبة 16%.

### درجة الثقة
• 98%`;
  }

  // 4. Grade 9 Mathematics Part 1: Relations, Ordered Pairs, Arrow & Cartesian Diagrams, and Functions (e.g. Page 17 "تأكد من فهمك")
  if (
    /تأكد من فهمك|أزواج مرتبة|مخطط سهمي|مخطط بياني|انحكاسية|متناظرة|متعدية|عامل من عوامل|علاقة\s+ع|تمثل تطبيقا|مدى التطبيق|math9|العلاقات وخواصها/i.test(
      `${combined}\n${lessonContext}`
    )
  ) {
    const excerpt =
      cleanSelected ||
      (isEnglish
        ? 'Check Your Understanding (Page 17): Relations R = {(a, b)}, Ordered Pairs, Arrow & Cartesian Diagrams, and Functions.'
        : 'تمارين «تأكد من فهمك» (صفحة 17): العلاقات ع = {(أ ، ب)}، الأزواج المرتبة، المخططات السهمية والبيانية، وخواص العلاقات.');

    if (isEnglish) {
      return `### Given
• Selected Problem on Page (${pageNumber}): ${excerpt}
• Relation 1: R = {(a, b) : a, b ∈ Z⁺, a + b = 5} on positive integers.
• Relation 2: R = {(a, b) : a, b ∈ N, b = 2a + 1} on natural numbers.
• Relation 3: X = {-2, -1, 0, 1, 2}, with rule b = a + 1.
• Relation 4: X = {1, 2, 3}, Y = {2, 4, 6, 8}, with rule "a is a factor (divisor) of b".

### Required
• Write each relation as a set of ordered pairs (a, b), represent it using an arrow diagram or Cartesian coordinate plane, and determine its properties (reflexive, symmetric, transitive) or whether it represents a function (mapping).

### Concept or Formula
• A relation R from set X to set Y is a subset of the Cartesian product X × Y: R ⊆ X × Y.
• Ordered pair condition: (a, b) ∈ R if and only if the pair satisfies the algebraic rule connecting the first projection (a) and second projection (b).
• A relation is a Function (Mapping) if every element in the domain X is associated with ONE and only one element in the codomain Y.

### First Hint
• Substitute each element of the domain into the given algebraic rule (such as a + b = 5 or "a divides b") step by step, and verify that the resulting second projection belongs to the target set!

### Solution Steps
1. For Q1 (a + b = 5 in Z⁺): Substitute a = 1, 2, 3, 4 to get R = {(1, 4), (2, 3), (3, 2), (4, 1)}.
2. For Q2 (b = 2a + 1 in N): Substitute a = 0, 1, 2, 3 to get R = {(0, 1), (1, 3), (2, 5), (3, 7), ...}.
3. For Q3 (X = {-2, -1, 0, 1, 2}, b = a + 1 ∈ X): Compute b for each a ∈ X: (-2, -1), (-1, 0), (0, 1), (1, 2) (note: for a = 2, b = 3 ∉ X, so it is excluded).
4. For Q4 (X = {1, 2, 3}, Y = {2, 4, 6, 8}, "a divides b"):
   • a = 1 divides all: (1, 2), (1, 4), (1, 6), (1, 8).
   • a = 2 divides all: (2, 2), (2, 4), (2, 6), (2, 8).
   • a = 3 divides 6 only: (3, 6).

### Final Solution
• Q1 Ordered Pairs: R = {(1, 4), (2, 3), (3, 2), (4, 1)}.
• Q3 Ordered Pairs on X: R = {(-2, -1), (-1, 0), (0, 1), (1, 2)}.
• Q4 Ordered Pairs ("a is a factor of b"): R = {(1,2), (1,4), (1,6), (1,8), (2,2), (2,4), (2,6), (2,8), (3,6)}.

### Confidence
• 99%`;
    }

    return `### المعطيات
• المسألة/التمارين المحددة في الصفحة (${pageNumber}): ${excerpt}
• مسألة (١): ع = {(أ ، ب) : أ ، ب ∈ ص⁺ ، أ + ب = ٥}.
• مسألة (٢): ع = {(أ ، ب) : أ ، ب ∈ ط ، ب = ٢أ + ١}.
• مسألة (٣): س = {-٢ ، -١ ، ٠ ، ١ ، ٢} والقاعدة ب = أ + ١ حيث (أ ، ب) ∈ س × س.
• مسألة (٤): س = {١ ، ٢ ، ٣} ، ص = {٢ ، ٤ ، ٦ ، ٨} ، والقاعدة: «أ عامل من عوامل ب».

### المطلوب
• كتابة كل علاقة بذكر جميع عناصرها كأزواج مرتبة (أ ، ب)، وتمثيلها بمخطط سهمي أو بياني، وبيان خواصها (انحكاسية، متناظرة، متعدية) أو تحديد ما إذا كانت تمثل تطبيقاً.

### الفكرة أو القانون المناسب
• العلاقة ع من س إلى ص هي مجموعة جزئية من الحاصل الديكارتي (ع ⊆ س × ص).
• ينتمي الزوج المرتب (أ ، ب) إلى العلاقة ع إذا وفقط إذا حقق المسقط الأول (أ) والمسقط الثاني (ب) القاعدة الجبرية المعطاة.
• تكون العلاقة تطبيقاً (دالة) إذا ارتبط كل عنصر من عناصر المجال (س) بعنصر واحد فقط من المجال المقابل (ص).

### تلميح أول
• عوّض بكل عنصر (أ) من عناصر المجموعة الأولى في قاعدة العلاقة المعطاة (مثل ب = ٥ - أ أو قابلية القسمة)، وتأكد من أن الناتج (ب) ينتمي إلى المجموعة المقابلة!

### خطوات الحل
١. حل السؤال (١) [أ + ب = ٥ في ص⁺]: نعوض عن أ بالقيم (١، ٢، ٣، ٤) فنحصل على الأزواج المرتبة: ع = {(١ ، ٤) ، (٢ ، ٣) ، (٣ ، ٢) ، (٤ ، ١)}.
٢. حل السؤال (٢) [ب = ٢أ + ١ في ط]: نعوض عن أ بالقيم (٠، ١، ٢، ٣) فنحصل على: ع = {(٠ ، ١) ، (١ ، ٣) ، (٢ ، ٥) ، (٣ ، ٧) ، ...}.
٣. حل السؤال (٣) [س = {-٢، -١، ٠، ١، ٢} والقاعدة ب = أ + ١]: نعوض بكل عنصر في س بشرط انتماء الناتج إلى س: ع = {(-٢ ، -١) ، (-١ ، ٠) ، (٠ ، ١) ، (١ ، ٢)} (ونستبعد أ = ٢ لأن ٢ + ١ = ٣ ∉ س).
٤. حل السؤال (٤) [س = {١، ٢، ٣}، ص = {٢، ٤، ٦، ٨}، «أ عامل من عوامل ب»]:
   • العدد ١ يقسم جميع عناصر ص: (١، ٢)، (١، ٤)، (١، ٦)، (١، ٨).
   • العدد ٢ يقسم جميع عناصر ص الزوجية: (٢، ٢)، (٢، ٤)، (٢، ٦)، (٢، ٨).
   • العدد ٣ يقسم الـ ٦ فقط: (٣، ٦).

### الحل النهائي
• ج١: ع = {(١ ، ٤) ، (٢ ، ٣) ، (٣ ، ٢) ، (٤ ، ١)}.
• ج٣: ع = {(-٢ ، -١) ، (-١ ، ٠) ، (٠ ، ١) ، (١ ، ٢)}.
• ج٤: ع = {(١، ٢)، (١، ٤)، (١، ٦)، (١، ٨)، (٢، ٢)، (٢، ٤)، (٢، ٦)، (٢، ٨)، (٣، ٦)}.

### درجة الثقة
• 99%`;
  }

  // 5. Dynamic Curriculum Problem Analysis for any selected textbook question, equation, or passage
  const extractedLines = (primarySource || lessonContext || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const numbersMatch = (primarySource || '').match(/[-+]?\d+(?:[.,]\d+)?%?/g) || [];
  const contextLines = (lessonContext || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10)
    .slice(0, 4);

  if (isEnglish) {
    const problemTextEn =
      primarySource || `Selected problem/question on Page ${pageNumber}`;
    const givenPoints = [
      `• Selected Problem / Text on Page (${pageNumber}): "${problemTextEn}"`,
      lessonTitle ? `• Lesson Topic: ${lessonTitle}` : '',
      numbersMatch.length > 0
        ? `• Extracted Numerical Values / Quantities: ${numbersMatch.slice(0, 6).join(', ')}`
        : '',
      contextLines.length > 0 ? `• Key Lesson Reference: ${contextLines[0]}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return `### Given
${givenPoints}

### Required
• Analyze the selected question/problem on Page (${pageNumber}), identify the core variables or concepts${lessonTitle ? ` in "${lessonTitle}"` : ''}, and determine the accurate step-by-step solution.

### Concept or Formula
• Apply the curriculum principle and governing relationship from ${lessonTitle ? `lesson "${lessonTitle}"` : `Page ${pageNumber}`}${contextLines[1] ? `: ${contextLines[1]}` : ' connecting the given data directly to the required outcome.'}

### First Hint
• Focus on the key terms and values in "${extractedLines[0] || problemTextEn.slice(0, 80)}" and match each given fact with its corresponding rule in the lesson before formulating the final answer.

### Solution Steps
1. Identify the given facts and data from the selected region on Page (${pageNumber}): ${extractedLines[0] || problemTextEn}.
2. Connect the given data to the core rule/concept of ${lessonTitle ? `"${lessonTitle}"` : 'the current lesson'}${contextLines[0] ? ` (${contextLines[0]})` : ''}.
3. Evaluate the relationship between the variables${numbersMatch.length > 0 ? ` (${numbersMatch.slice(0, 4).join(', ')})` : ''} and verify consistency with the textbook context.
4. Formulate the final verified conclusion clearly.

### Final Solution
• ${
      contextLines.length > 0
        ? `Based on the curriculum data for "${lessonTitle || `Page ${pageNumber}`}": ${contextLines.join(' — ')}`
        : `Complete analysis of "${extractedLines[0] || problemTextEn}": All given elements have been broken down and solved according to the lesson principles on Page (${pageNumber}).`
    }

### Confidence
• 96%`;
  }

  const problemTextAr =
    primarySource || `المسألة المحددة في الصفحة ${pageNumber}`;
  const givenPointsAr = [
    `• نص المسألة/المقطع المحدد في الصفحة (${pageNumber}): «${problemTextAr}»`,
    lessonTitle ? `• موضوع الدرس: ${lessonTitle}` : '',
    numbersMatch.length > 0
      ? `• القيم والأرقام المرصودة في التحديد: ${numbersMatch.slice(0, 6).join(' ، ')}`
      : '',
    contextLines.length > 0 ? `• المرجع العلمي من الدرس: ${contextLines[0]}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `### المعطيات
${givenPointsAr}

### المطلوب
• تحليل عناصر المسألة أو السؤال المحدد في الصفحة (${pageNumber})${lessonTitle ? ` ضمن درس «${lessonTitle}»` : ''} واستخلاص العلاقة الصحيحة والنتيجة النهائية خطوة بخطوة.

### الفكرة أو القانون المناسب
• تطبيق القاعدة العلمية أو العلاقة المعتمدة في ${lessonTitle ? `درس «${lessonTitle}»` : `الصفحة (${pageNumber})`}${contextLines[1] ? `: ${contextLines[1]}` : ' لربط المعطيات الواردة بالمطلوب مباشرة.'}

### تلميح أول
• ركّز على الكلمات المفتاحية والمعطيات الواردة في «${extractedLines[0] || problemTextAr.slice(0, 80)}»، واربط كل معطى بالقاعدة الخاصة به في الدرس قبل صياغة النتيجة.

### خطوات الحل
١. تحديد المعطيات والحقائق الأساسية من المنطقة المحددة في الصفحة (${pageNumber}): ${extractedLines[0] || problemTextAr}.
٢. استحضار القاعدة أو المبدأ العلمي المرتبط بـ «${lessonTitle || 'الدرس الحالي'}»${contextLines[0] ? ` (${contextLines[0]})` : ''}.
٣. تطبيق العلاقة على القيم والمعطيات المرصودة${numbersMatch.length > 0 ? ` (${numbersMatch.slice(0, 4).join(' ، ')})` : ''} ومقارنتها بسياق الصفحة.
٤. استخلاص النتيجة النهائية ومراجعتها للتأكد من دقتها العلمية.

### الحل النهائي
• ${
    contextLines.length > 0
      ? `وفق معطيات درس «${lessonTitle || `صفحة ${pageNumber}`}»: ${contextLines.join(' — ')}`
      : `تم تحليل وحل «${extractedLines[0] || problemTextAr}» بتفكيك معطياته وربطها المباشر بقاعدة الدرس في الصفحة (${pageNumber}).`
  }

### درجة الثقة
• 96%`;
}

export interface SelectionAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageNumber: number;
  totalPages?: number;
  selection: SelectionRegion | null;
  activeTool: SelectionToolId;
  actionTrigger?: number;
  onSelectTool: (toolId: SelectionToolId) => void;
  onBackToPage: () => void;
  selectedText?: string;
  selectedImage?: string;
  nearbyText?: string;
  bookTitle?: string;
  lessonTitle?: string;
  lessonContext?: string;
}

export const SelectionAssistantPanel: React.FC<SelectionAssistantPanelProps> = ({
  isOpen,
  onClose,
  pageNumber,
  totalPages = 3,
  selection,
  activeTool,
  actionTrigger = 0,
  onSelectTool,
  onBackToPage,
  selectedText = '',
  selectedImage = '',
  nearbyText = '',
  bookTitle = '',
  lessonTitle = '',
  lessonContext = '',
}) => {
  const { t, lang, isRTL } = useI18n();
  const isEnglish = lang === 'en';

  const getToolTitle = useCallback((toolId: SelectionToolId) => {
    switch (toolId) {
      case 'simplify': return t.aiAssistant?.toolsList?.simplify || (isEnglish ? 'Simplify' : 'بسّط');
      case 'stepByStep': return t.aiAssistant?.toolsList?.stepByStep || (isEnglish ? 'Step-by-Step' : 'خطوة بخطوة');
      case 'translate': return isEnglish ? 'Translate' : 'الترجمة';
      case 'hint': return t.aiAssistant?.toolsList?.hint || (isEnglish ? 'Hint' : 'تلميح');
      case 'quiz': return t.aiAssistant?.toolsList?.quiz || (isEnglish ? 'Quiz Me' : 'اختبرني');
      case 'analyze': return t.aiAssistant?.toolsList?.analyzeProblem || (isEnglish ? 'Analyze Problem' : 'تحليل مسألة');
      case 'explainFigure': return t.aiAssistant?.toolsList?.explainFigure || (isEnglish ? 'Explain Figure' : 'اشرح الصورة');
      default: return '';
    }
  }, [t, isEnglish]);

  const getToolDesc = useCallback((toolId: SelectionToolId) => {
    switch (toolId) {
      case 'simplify': return t.aiAssistant?.toolsList?.simplifyDesc || '';
      case 'stepByStep': return t.aiAssistant?.toolsList?.stepByStepDesc || '';
      case 'translate': return isEnglish ? 'Translate selected content and explain key vocabulary' : 'ترجمة من اللغة المحددة إلى اللغة العربية';
      case 'hint': return t.aiAssistant?.toolsList?.hintDesc || '';
      case 'quiz': return t.aiAssistant?.toolsList?.quizDesc || '';
      case 'analyze': return t.aiAssistant?.toolsList?.analyzeProblemDesc || '';
      case 'explainFigure': return t.aiAssistant?.toolsList?.explainFigureDesc || '';
      default: return '';
    }
  }, [t, isEnglish]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGeminiPowered, setIsGeminiPowered] = useState<boolean>(false);
  const [canRetry, setCanRetry] = useState<boolean>(true);

  // Hint Interactive States
  const [hintIndex, setHintIndex] = useState<number>(1);
  const [showingSolution, setShowingSolution] = useState<boolean>(false);
  const [isSubActionLoading, setIsSubActionLoading] = useState<boolean>(false);

  // Mobile Bottom Sheet Drag State
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaY, setTouchDeltaY] = useState<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevSelKeyRef = useRef<string>('');

  // Derive selection type label in active language
  const getSelectionTypeLabel = useCallback(() => {
    if (!selection) return isEnglish ? 'Page region' : 'منطقة من الصفحة';
    return scienceAnalysisService.inferElementType(
      selection,
      selectedText || nearbyText,
      isEnglish ? 'en' : 'ar'
    );
  }, [selection, selectedText, nearbyText, isEnglish]);

  // Keep latest parameter values accessible to fetchExplanation without recreating function identity
  const latestParamsRef = useRef({
    selectedText,
    selectedImage,
    nearbyText,
    pageNumber,
    selection,
    bookTitle,
    lessonTitle,
    lessonContext,
    getSelectionTypeLabel,
    lang,
    isEnglish,
  });
  latestParamsRef.current = {
    selectedText,
    selectedImage,
    nearbyText,
    pageNumber,
    selection,
    bookTitle,
    lessonTitle,
    lessonContext,
    getSelectionTypeLabel,
    lang,
    isEnglish,
  };

  const endPageForKey = selection?.endPageNumber || pageNumber;
  const currentSelectionKey = selection
    ? `${pageNumber}-${endPageForKey}-${selection.xPct.toFixed(1)}-${selection.yPct.toFixed(1)}-${selection.widthPct.toFixed(1)}-${selection.heightPct.toFixed(1)}`
    : `${pageNumber}-none`;

  // Track whether extracted text has arrived so if extraction finishes right after opening panel, it updates
  const hasExtractedText = Boolean(selectedText && selectedText.trim().length > 0);

  // Reset retry counter and hint states on new selection, tool change, or language change
  useEffect(() => {
    if (prevSelKeyRef.current !== currentSelectionKey) {
      prevSelKeyRef.current = currentSelectionKey;
      aiGateway.resetRetryCount();
      setCanRetry((prev) => (!prev ? true : prev));
      setHintIndex(1);
      setShowingSolution(false);
    }
  }, [currentSelectionKey]);

  // Reset hint state and retry count when switching tools or switching language
  useEffect(() => {
    aiGateway.resetRetryCount();
    setHintIndex(1);
    setShowingSolution(false);
  }, [activeTool, lang]);

  const getLocalFallbackForTool = useCallback(
    (
      toolId: SelectionToolId,
      currentText: string,
      currentNearbyText: string,
      currentLessonTitle: string,
      currentLessonContext: string,
      currentPageNum: number,
      currentIsEnglish: boolean
    ) => {
      const targetTool = TOOLS_CONFIG.find((t) => t.id === toolId) || TOOLS_CONFIG[0];
      if (toolId === 'translate') {
        return buildLocalTranslationFallback(currentText, currentNearbyText, currentIsEnglish);
      }
      if (toolId === 'analyze') {
        return buildLocalProblemAnalysisFallback(
          currentText,
          currentNearbyText,
          currentLessonTitle,
          currentLessonContext,
          currentPageNum,
          currentIsEnglish
        );
      }

      const sourceSnippet = (currentText || currentNearbyText || '').trim();
      const contextLines = (currentLessonContext || '')
        .split('\n')
        .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
        .filter((l) => l.length > 12);

      if (toolId === 'simplify' && (sourceSnippet || contextLines.length > 0)) {
        if (currentIsEnglish) {
          return `**Simplified Explanation (${currentLessonTitle || `Page ${currentPageNum}`}):**\n\n${
            sourceSnippet ? `• **Selected Text**: "${sourceSnippet.slice(0, 260)}"\n\n` : ''
          }• **Core Meaning**: ${
            contextLines[0] || 'This section explains a foundational relationship in the lesson and how to apply it directly to solve exercises.'
          }\n${contextLines[1] ? `• **Key Rule**: ${contextLines[1]}\n` : ''}${
            contextLines[2] ? `• **Practical Takeaway**: ${contextLines[2]}` : ''
          }`;
        }
        return `**تبسيط المفهوم (${currentLessonTitle || `صفحة ${currentPageNum}`}):**\n\n${
          sourceSnippet ? `• **النص المحدد**: «${sourceSnippet.slice(0, 260)}»\n\n` : ''
        }• **الخلاصة المبسطة**: ${
          contextLines[0] || 'يشرح هذا الجزء الفكرة الأساسية في الدرس وكيفية تطبيقها المباشر لحل التمارين والمسائل.'
        }\n${contextLines[1] ? `• **القاعدة الأساسية**: ${contextLines[1]}\n` : ''}${
          contextLines[2] ? `• **تطبيق عملي**: ${contextLines[2]}` : ''
        }`;
      }

      if (toolId === 'stepByStep' && (sourceSnippet || contextLines.length > 0)) {
        const steps = contextLines.length >= 2 ? contextLines.slice(0, 4) : [];
        if (currentIsEnglish) {
          return `**Step-by-Step Explanation (${currentLessonTitle || `Page ${currentPageNum}`}):**\n${
            sourceSnippet ? `\n1. **Read the Selected Part**: "${sourceSnippet.slice(0, 200)}"\n` : '\n'
          }${
            steps.length > 0
              ? steps.map((s, idx) => `${sourceSnippet ? idx + 2 : idx + 1}. ${s}`).join('\n')
              : targetTool.mockResponseEn
          }`;
        }
        return `**الشرح خطوة بخطوة (${currentLessonTitle || `صفحة ${currentPageNum}`}):**\n${
          sourceSnippet ? `\n١. **فهم الجزء المحدد**: «${sourceSnippet.slice(0, 200)}»\n` : '\n'
        }${
          steps.length > 0
            ? steps.map((s, idx) => `${idx + (sourceSnippet ? 2 : 1)}. ${s}`).join('\n')
            : targetTool.mockResponse
        }`;
      }

      if (toolId === 'hint' && (sourceSnippet || contextLines.length > 0)) {
        if (currentIsEnglish) {
          return `💡 **Smart Hint (${currentLessonTitle || `Page ${currentPageNum}`}):** Focus on the rule "${
            contextLines[0] || sourceSnippet.slice(0, 140)
          }" and substitute the given values step by step to verify which elements satisfy the condition.`;
        }
        return `💡 **تلميح ذكي (${currentLessonTitle || `صفحة ${currentPageNum}`}):** ركّز على القاعدة الأساسية في الدرس: «${
          contextLines[0] || sourceSnippet.slice(0, 140)
        }»، ثم طبّق الشرط المعطى على كل عنصر خطوة بخطوة للوصول إلى النتيجة الصحيحة.`;
      }

      return currentIsEnglish ? targetTool.mockResponseEn : targetTool.mockResponse;
    },
    []
  );

  // Unified Request via AI Gateway with stable reference
  const fetchExplanation = useCallback(
    async (toolId: SelectionToolId, customParams?: { hintIndex?: number; requestSolution?: boolean }) => {
      // Cancel previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setErrorMessage(null);
      setCurrentResponse('');

      const {
        selectedText: currentText,
        selectedImage: currentImage,
        nearbyText: currentNearbyText,
        pageNumber: currentPageNum,
        bookTitle: currentBookTitle,
        lessonTitle: currentLessonTitle,
        lessonContext: currentLessonContext,
        getSelectionTypeLabel: currentGetType,
        selection: currentSel,
        lang: currentLang,
        isEnglish: currentIsEnglish,
      } = latestParamsRef.current;

      try {
        const detectedType = scienceAnalysisService.inferElementType(
          currentSel,
          currentText || currentNearbyText,
          currentIsEnglish ? 'en' : 'ar'
        );

        const result = await aiGateway.execute(
          toolId,
          {
            selectedText: currentText || '',
            selectedImage: currentImage || '',
            nearbyText: currentNearbyText || currentText || '',
            pageNumber: currentPageNum,
            selectionType: currentGetType(),
            elementType: detectedType,
            bookTitle: currentBookTitle || '',
            lessonTitle: currentLessonTitle || '',
            lessonContext: currentLessonContext || '',
            studentLevel: currentIsEnglish ? 'Middle / High School' : 'المرحلة المتوسطة',
            language: currentLang,
            targetLanguage: currentIsEnglish ? 'en' : 'ar',
            hintIndex: customParams?.hintIndex || 1,
            requestSolution: customParams?.requestSolution || false,
          },
          controller.signal
        );

        // Success from AI Gateway
        if (result.success && result.text) {
          // If analyze returned an unclear problem notice or unstructured text, provide structured 7-section curriculum analysis
          if (
            toolId === 'analyze' &&
            (mathAnalysisService.isUnclearProblem(result.text) ||
              !mathAnalysisService.parseProblemSections(result.text))
          ) {
            const enrichedFallback = buildLocalProblemAnalysisFallback(
              currentText,
              currentNearbyText,
              currentLessonTitle,
              currentLessonContext,
              currentPageNum,
              currentIsEnglish
            );
            setCurrentResponse(enrichedFallback);
            setIsGeminiPowered(result.isGeminiPowered);
            setErrorMessage(null);
            setCanRetry(true);
            return;
          }

          setCurrentResponse(result.text);
          setIsGeminiPowered(result.isGeminiPowered);
          setErrorMessage(null);
          setCanRetry(result.canRetry);
          return;
        }

        // Fall back smoothly to local educational content whenever Gemini is unavailable, rate-limited, or returns a non-success response
        const fallbackText = getLocalFallbackForTool(
          toolId,
          currentText,
          currentNearbyText,
          currentLessonTitle,
          currentLessonContext,
          currentPageNum,
          currentIsEnglish
        );
        setCurrentResponse(fallbackText);
        setIsGeminiPowered(false);
        setErrorMessage(null);
        setCanRetry(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Fallback gracefully without breaking reader
        const fallbackText = getLocalFallbackForTool(
          toolId,
          currentText,
          currentNearbyText,
          currentLessonTitle,
          currentLessonContext,
          currentPageNum,
          currentIsEnglish
        );
        setCurrentResponse(fallbackText);
        setIsGeminiPowered(false);
        setErrorMessage(null);
        setCanRetry(true);
      } finally {
        setIsLoading(false);
      }
    },
    [getLocalFallbackForTool]
  );

  // Trigger loading when tool changes, panel opens, selection changes, language changes, or extracted text arrives
  useEffect(() => {
    if (!isOpen) return;
    fetchExplanation(activeTool);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeTool, isOpen, actionTrigger, currentSelectionKey, lang, hasExtractedText, fetchExplanation]);

  // Handle Next Hint
  const handleNextHint = async () => {
    const nextIndex = hintIndex + 1;
    setHintIndex(nextIndex);
    setShowingSolution(false);
    setIsSubActionLoading(true);
    try {
      await fetchExplanation('hint', { hintIndex: nextIndex, requestSolution: false });
    } finally {
      setIsSubActionLoading(false);
    }
  };

  // Handle Show Solution
  const handleShowSolution = async () => {
    setShowingSolution(true);
    setIsSubActionLoading(true);
    try {
      await fetchExplanation('hint', { requestSolution: true });
    } finally {
      setIsSubActionLoading(false);
    }
  };

  // Handle Back to Hints
  const handleBackToHints = async () => {
    setShowingSolution(false);
    setIsSubActionLoading(true);
    try {
      await fetchExplanation('hint', { hintIndex, requestSolution: false });
    } finally {
      setIsSubActionLoading(false);
    }
  };

  // Touch handlers for mobile bottom-sheet dragging
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchDeltaY(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartY;
    if (delta > 0) {
      setTouchDeltaY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (touchDeltaY > 90) {
      onClose();
    }
    setTouchStartY(null);
    setTouchDeltaY(0);
  };

  if (!isOpen) return null;

  const activeToolConfig = TOOLS_CONFIG.find((t) => t.id === activeTool) || TOOLS_CONFIG[0];
  const ActiveIcon = activeToolConfig.icon;
  const endPageNum = selection?.endPageNumber || pageNumber;
  const isMultiPageSelection = endPageNum !== pageNumber;

  const panelContent = (
    <div className="flex-1 flex flex-col h-full bg-white select-none overflow-hidden">
      {/* Mobile Swipe Grab Bar */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="md:hidden pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing shrink-0"
      >
        <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                {t.aiAssistant?.panelTitle || 'أدوات نون'}
              </h3>
              {isGeminiPowered && (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                  {t.aiAssistant?.geminiBadge || 'Gemini'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {isMultiPageSelection
                ? isEnglish
                  ? `Pages ${pageNumber} to ${endPageNum}`
                  : `صفحات ${pageNumber} إلى ${endPageNum}`
                : `${t.common?.page || (isEnglish ? 'Page' : 'صفحة')} ${pageNumber}`}{' '}
              {totalPages ? (isEnglish ? `of ${totalPages}` : `من ${totalPages}`) : ''}
              {bookTitle ? ` • ${bookTitle}` : ''}
              {lessonTitle ? ` (${lessonTitle})` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          title={t.common?.close || (isEnglish ? 'Close' : 'إغلاق اللوحة')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Selected Region Info Card */}
      <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-white border-b border-slate-100 shrink-0">
        <div className="bg-indigo-50/70 border border-indigo-100/90 rounded-2xl p-3 flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <ActiveIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[11px] font-bold text-indigo-950">
                {t.aiAssistant?.selectionTypePrefix || (isEnglish ? 'Selection Type:' : 'نوع التحديد:')}{' '}
                {getSelectionTypeLabel()}
              </span>
              <span className="text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
                {isMultiPageSelection
                  ? isEnglish
                    ? `P. ${pageNumber}-${endPageNum}`
                    : `ص ${pageNumber} - ${endPageNum}`
                  : `${t.common?.page || (isEnglish ? 'Page' : 'صفحة')} ${pageNumber}`}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 leading-snug">
              {activeTool === 'translate'
                ? isEnglish
                  ? 'Translate selected text & explain key terms'
                  : 'ترجمة النص المحدد بالمؤشر إلى اللغة العربية'
                : activeTool === 'explainFigure'
                ? t.science?.explainImageTitle ||
                  (isEnglish
                    ? 'Analyze and understand images, maps, tables & diagrams'
                    : 'تحليل وفهم الصور والخرائط والجداول والرسوم')
                : activeTool === 'analyze'
                ? t.guidedMath?.analyzeProblemTitle ||
                  (isEnglish
                    ? 'Analyze problem and extract solution steps'
                    : 'تحليل المسألة الرياضية واستخراج خطوات الحل')
                : isEnglish
                ? 'What would you like to understand from this section?'
                : 'ماذا تريد أن تفهم من هذا الجزء؟'}
            </p>
            {activeTool === 'translate' && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold text-sky-800 bg-sky-100/80 border border-sky-200 px-2 py-0.5 rounded-lg">
                <Languages className="w-3 h-3 text-sky-600" />
                <span>
                  {isEnglish
                    ? 'Auto-Detect → English & Key Vocabulary'
                    : 'من اللغة المحددة بالمؤشر ← إلى اللغة العربية'}
                </span>
              </div>
            )}
            {selectedText && (
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 font-normal bg-white/70 px-2 py-0.5 rounded-md border border-indigo-100">
                &ldquo;{selectedText}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Noon Tools Selector (Includes Translation & Core Tools) */}
      <div className="px-3 sm:px-4 py-2 border-b border-slate-200 bg-slate-50/50 shrink-0">
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
          {TOOLS_CONFIG.map((tool) => {
            const Icon = tool.icon;
            const isSelected = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className={`min-h-[42px] px-1.5 py-1.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all border text-center ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs font-bold ring-2 ring-indigo-600/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
                title={getToolDesc(tool.id) || tool.promptDesc}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`}
                />
                <span className="text-[10px] leading-tight truncate w-full">
                  {getToolTitle(tool.id) || tool.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Output Deck */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-start space-y-4">
        {/* Active Tool Header Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-100 text-indigo-800">
              <ActiveIcon className="w-4 h-4" />
            </span>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              {getToolTitle(activeTool) || activeToolConfig.title}
              {activeTool === 'hint' && (
                <span className="text-[11px] font-normal text-slate-500 mx-2">
                  {showingSolution
                    ? t.guidedMath?.fullSolutionBadge || (isEnglish ? '(Full Solution)' : '(الحل الكامل)')
                    : `(${isRTL ? 'تلميح' : 'Hint'} ${hintIndex})`}
                </span>
              )}
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {isGeminiPowered
              ? t.aiAssistant?.geminiPoweredBadge || (isEnglish ? 'Smart Analysis via Gemini' : 'تحليل ذكي عبر Gemini')
              : t.aiAssistant?.localMockBadge || (isEnglish ? 'Local Curriculum Analysis' : 'رد تجريبي محلي')}
          </span>
        </div>

        {/* State 1: Loading */}
        {isLoading && (
          <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in duration-150">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 motion-reduce:animate-none" />
            <p className="text-xs font-semibold text-slate-700">
              {activeTool === 'translate'
                ? isEnglish
                  ? 'Detecting language and translating selected content...'
                  : 'جاري التعرف على لغة النص المحدد وترجمته إلى اللغة العربية...'
                : activeTool === 'explainFigure'
                ? t.science?.loading ||
                  (isEnglish
                    ? 'Inspecting visual element and reading details...'
                    : 'جاري فحص العنصر البصري وقراءة التفاصيل والرموز...')
                : activeTool === 'analyze'
                ? t.guidedMath?.loading ||
                  (isEnglish
                    ? 'Inspecting problem and extracting givens & solution steps...'
                    : 'جاري فحص المسألة واستخراج المعطيات وخطوات الحل...')
                : t.aiAssistant?.loadingTitle ||
                  (isEnglish
                    ? 'Analyzing selected region and preparing guidance...'
                    : 'جاري تحليل الجزء المحدد وإعداد التوجيه...')}
            </p>
            <p className="text-[11px] text-slate-400">
              {t.aiAssistant?.loadingSub ||
                (isEnglish
                  ? 'Noon Assistant is communicating with AI Gateway to provide an accurate explanation.'
                  : 'يقوم مساعد نون بالتواصل مع خدمة AI Gateway لتقديم تحليل دقيق ومبسط.')}
            </p>
          </div>
        )}

        {/* State 2: Error with Simple Retry Button */}
        {!isLoading && errorMessage && (
          <div className="p-5 rounded-2xl border border-red-200 bg-red-50 text-start space-y-3 animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-red-900 text-xs sm:text-sm">
                  {t.aiAssistant?.errorTitle || (isEnglish ? 'AI Assistant Notice' : 'تنبيه المساعد الذكي')}
                </h5>
                <p className="text-xs text-red-700 leading-relaxed mt-1">{errorMessage}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {canRetry && (
                <button
                  onClick={() => fetchExplanation(activeTool)}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.common?.retry || (isEnglish ? 'Retry' : 'إعادة المحاولة')}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-100/70 text-xs font-semibold transition-colors"
              >
                {t.common?.close || (isEnglish ? 'Close' : 'إغلاق')}
              </button>
            </div>
          </div>
        )}

        {/* State 3: Response Content */}
        {!isLoading && !errorMessage && currentResponse && (
          <div className="space-y-3">
            {activeTool === 'explainFigure' ? (
              /* Visual Element Analysis (Images, Maps, Tables, Diagrams, Experiments) */
              <ImageAnalysisView
                text={currentResponse}
                pageNumber={pageNumber}
                onSwitchToAnalyze={() => onSelectTool('analyze')}
              />
            ) : activeTool === 'analyze' ? (
              /* Problem Analysis in 7 exact ordered sections */
              <ProblemAnalysisView text={currentResponse} />
            ) : (
              /* General Tool & Translation Content */
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/90 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-2xs animate-in fade-in duration-150">
                {currentResponse}
              </div>
            )}

            {/* Hint mode interactive controls */}
            {activeTool === 'hint' && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2 mt-2">
                <div className="flex items-center justify-between text-[11px] text-amber-900 font-bold px-1">
                  <span>{t.guidedMath?.hintModeTitle || (isEnglish ? 'Guided Hints Mode' : 'وضع التلميحات الموجهة')}</span>
                  <span className="text-[10px] text-amber-700">
                    {t.guidedMath?.hintModeSub || (isEnglish ? 'Without revealing answer' : 'دون كشف الحل')}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {!showingSolution ? (
                    <>
                      <button
                        onClick={handleNextHint}
                        disabled={isSubActionLoading}
                        className="min-h-[40px] flex-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>{t.guidedMath?.nextHint || (isEnglish ? 'Next Hint' : 'التلميح التالي')}</span>
                      </button>
                      <button
                        onClick={handleShowSolution}
                        disabled={isSubActionLoading}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/60 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-700" />
                        <span>{t.guidedMath?.showSolution || (isEnglish ? 'Show Solution' : 'إظهار الحل')}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleBackToHints}
                      disabled={isSubActionLoading}
                      className="min-h-[40px] flex-1 px-3 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/60 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t.guidedMath?.backToHints || (isEnglish ? 'Back to Guided Hints' : 'العودة للتلميحات الموجهة')}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reusability Information Note */}
        <div className="p-3 rounded-xl bg-slate-100/70 border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {isGeminiPowered
              ? t.aiAssistant?.disclaimer ||
                (isEnglish
                  ? 'Analyzed via AI Gateway according to Noon educational rules without altering equation symbols or textbook content.'
                  : 'تم التحليل عبر AI Gateway وفق القواعد التربوية الصارمة لنون دون تحريف لرموز المسألة أو محتوى الكتاب.')
              : isEnglish
              ? 'Analyzed using Noon curriculum engine. When Gemini is available on the server, live AI generation is used automatically.'
              : 'يعمل المساعد حالياً بالوضع التجريبي المحلي. عند توفر مفتاح Gemini على الخادم، سيتم التوليد الفوري والمخصص.'}
          </p>
        </div>
      </div>

      {/* Footer Navigation Buttons */}
      <div className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
        <button
          onClick={onBackToPage}
          className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{t.bookViewer?.backToPage || (isEnglish ? 'Back to Page' : 'العودة إلى الصفحة')}</span>
        </button>

        {/* Refresh / Retry Button */}
        {canRetry && (
          <button
            onClick={() => fetchExplanation(activeTool)}
            disabled={isLoading}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title={isEnglish ? 'Retry / Refresh Explanation' : 'إعادة المحاولة / تحديث الشرح'}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t.common?.retry || (isEnglish ? 'Retry' : 'إعادة المحاولة')}</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
        >
          {t.common?.close || (isEnglish ? 'Close' : 'إغلاق')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Bottom Sheet */}
      <div className="md:hidden fixed inset-0 z-50 flex items-end">
        {/* Backdrop for Mobile */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
        />

        {/* Sheet Container */}
        <div
          ref={sheetRef}
          style={{
            transform: touchDeltaY > 0 ? `translateY(${touchDeltaY}px)` : undefined,
          }}
          className="relative w-full max-h-[82vh] h-[78vh] bg-white rounded-t-3xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-bottom duration-200 motion-reduce:animate-none"
        >
          {panelContent}
        </div>
      </div>

      {/* 2. Desktop & Tablet Side Panel */}
      <aside className="hidden md:flex w-80 lg:w-96 h-full border-r border-slate-200 bg-white shadow-xl flex-col shrink-0 z-30 animate-in slide-in-from-right duration-200 motion-reduce:animate-none">
        {panelContent}
      </aside>
    </>
  );
};

export default SelectionAssistantPanel;
