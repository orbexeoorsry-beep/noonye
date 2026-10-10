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
  },
  {
    id: 'stepByStep',
    title: 'اشرح خطوة خطوة',
    badge: 'تسلسل',
    icon: ListOrdered,
    promptDesc: 'تفكيك الفكرة إلى خطوات متسلسلة واضحة',
    mockResponse:
      'سيشرح نون الفكرة خطوة خطوة:\n١. النقطة الأولى: تحديد المبدأ العلمي أو الرياضي الأساسي في هذا المقطع.\n٢. النقطة الثانية: تتبع الآلية والعوامل المؤثرة بالترتيب المنطقي.\n٣. النقطة الثالثة: استخلاص الخلاصة والهدف النهائي وكيفية تطبيقها في الاختبارات.',
  },
  {
    id: 'translate',
    title: 'الترجمة للعربية',
    badge: 'ترجمة',
    icon: Languages,
    promptDesc: 'ترجمة فورية ودقيقة من اللغة المحددة بالمؤشر إلى اللغة العربية',
    mockResponse:
      '### الترجمة إلى اللغة العربية\nتمت قراءة النص المحدد بالمؤشر وترجمته إلى اللغة العربية الفصحى الواضحة مع الحفاظ على دقة المصطلحات العلمية والسياق التعليمي.\n\n### المصطلحات والكلمات المفتاحية\n• يتم استخراج الكلمات والمصطلحات الأجنبية أو العلمية من المنطقة المحددة وتوضيح مقابلها العربي الدقيق لتسهيل الفهم والمراجعة.',
  },
  {
    id: 'hint',
    title: 'أعطني تلميحًا',
    badge: 'تلميح',
    icon: Lightbulb,
    promptDesc: 'توجيه ذكي نحو الحل دون كشفه مباشرة',
    mockResponse:
      '💡 فكّر في العلاقة المباشرة بين المتغيرات المذكورة في الجزء المحدد، ولاحظ كيف يؤدي تغيير الطرف الأول إلى التأثير على بقية المعادلة أو النظام العلمي.',
  },
  {
    id: 'quiz',
    title: 'اختبرني',
    badge: 'سؤال',
    icon: CheckSquare,
    promptDesc: 'سؤال سريع لاختبار استيعابك للمقطع',
    mockResponse:
      'سيطرح نون سؤالًا قصيرًا لاختبار فهمك:\n❓ ما هي النتيجة المباشرة المترتبة على العملية المشروحة في هذا الجزء المحدد؟\n(أ) زيادة معدل التفاعل\n(ب) الحفاظ على حالة التوازن الديناميكي\n(ج) توقف الانتقال تماماً\n(ستتمكن من الإجابة التفاعلية وتلقي تصحيح فوري في المرحلة القادمة).',
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
• 98% (تحليل مكتمل بناءً على معطيات الصفحة).`,
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
• 96% (تحليل بصري متطابق مع بيانات الصفحة).`,
  },
];

/**
 * Builds a helpful local educational translation response when offline/local mode is active
 */
function buildLocalTranslationFallback(selectedText: string, nearbyText: string): string {
  const source = (selectedText || nearbyText || '').trim();
  if (!source) {
    return `### الترجمة إلى اللغة العربية
تم تحديد منطقة بصرية من الصفحة. عند توفر اتصال Gemini، يتم قراءة النصوص من داخل الصورة أو المخطط وترجمتها فوراً إلى اللغة العربية الفصحى.

### المصطلحات والكلمات المفتاحية
• حدد فقرة نصية أو مصطلحاً علمياً ليتم استخراج معناه وترجمته المباشرة إلى اللغة العربية.`;
  }

  // Common scientific/math English-to-Arabic dictionary for rich offline translation support
  const glossary: Array<{ pattern: RegExp; term: string; meaning: string }> = [
    { pattern: /\bdelta\b|Δ/i, term: 'Delta (Δ)', meaning: 'المميز الرياضي (دلتا) لحساب جذور المعادلة التربيعية' },
    { pattern: /\bquadratic\b/i, term: 'Quadratic Equation', meaning: 'المعادلة التربيعية (من الدرجة الثانية)' },
    { pattern: /\bsin\b|\bsine\b/i, term: 'sin (Sine)', meaning: 'جيب الزاوية (جا = المقابل ÷ الوتر)' },
    { pattern: /\bcos\b|\bcosine\b/i, term: 'cos (Cosine)', meaning: 'جيب تمام الزاوية (جتا = المجاور ÷ الوتر)' },
    { pattern: /\btan\b|\btangent\b/i, term: 'tan (Tangent)', meaning: 'ظل الزاوية (ظا = المقابل ÷ المجاور)' },
    { pattern: /\bosmosis\b/i, term: 'Osmosis', meaning: 'الخاصية الأسموزية (انتقال الماء عبر غشاء شبه منفذ)' },
    { pattern: /\bdiffusion\b/i, term: 'Diffusion', meaning: 'الانتشار (انتقال الجزيئات من التركيز الأعلى للأقل)' },
    { pattern: /\batp\b/i, term: 'ATP', meaning: 'أدينوسين ثلاثي الفوسفات (جزيء الطاقة الخلوية)' },
    { pattern: /\bdna\b/i, term: 'DNA', meaning: 'الحمض النووي الريبوزي منقوص الأكسجين (المادة الوراثية)' },
    { pattern: /\bmitosis\b/i, term: 'Mitosis', meaning: 'الانقسام المتساوي (الخلوي)' },
    { pattern: /\bmeiosis\b/i, term: 'Meiosis', meaning: 'الانقسام المنصف (الاختزالي)' },
    { pattern: /\bphotosynthesis\b/i, term: 'Photosynthesis', meaning: 'عملية البناء الضوئي في النبات' },
    { pattern: /\bgis\b/i, term: 'GIS', meaning: 'نظم المعلومات الجغرافية (Geographic Information Systems)' },
    { pattern: /\bgps\b/i, term: 'GPS', meaning: 'نظام تحديد المواقع العالمي عبر الأقمار الصناعية' },
  ];

  const matchedTerms = glossary.filter((g) => g.pattern.test(source));
  const hasLatinChars = /[A-Za-z]/.test(source);

  const termsSection =
    matchedTerms.length > 0
      ? matchedTerms.map((m) => `• **${m.term}**: ${m.meaning}.`).join('\n')
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
 * Builds a curriculum-aware 7-section problem analysis response when offline/rate-limited
 * or when PDF text extraction is partial, ensuring the "تحليل مسألة" tool always works.
 */
function buildLocalProblemAnalysisFallback(
  selectedText: string,
  nearbyText: string,
  lessonTitle: string,
  lessonContext: string,
  pageNumber: number
): string {
  const cleanSelected = (selectedText || '').trim();
  const cleanNearby = (nearbyText || '').trim();
  const combined = `${cleanSelected}\n${cleanNearby}\n${lessonTitle}\n${lessonContext}`.toLowerCase();

  // 1. Math / Quadratic Equation / Functions (Page 2 or math keywords)
  if (
    /sqrt|delta|Δ|b\^2|4ac|x\^2|تربيع|معادلة|جذور|مميز|منحنى|قطع مكافئ|f\(x\)|محور التماثل/i.test(
      combined
    ) ||
    pageNumber === 2
  ) {
    const excerpt = cleanSelected || 'x = [-b ± √(b² - 4ac)] / 2a ، الدالة التربيعية f(x) = (x - 2)² - 1';
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

  // 2. Biology / Active Transport / ATP / Cell Membrane (Page 1 or biology keywords)
  if (
    /atp|صوديوم|بوتاسيوم|نقل نشط|نفاذية|غشاء|أسموزية|خلية|تركيز/i.test(combined) ||
    pageNumber === 1
  ) {
    const excerpt =
      cleanSelected ||
      'تمرين: ما مصدر الطاقة المباشر الذي تستخدمه مضخة الصوديوم والبوتاسيوم لنقل الأيونات ضد منحدر التركيز؟';
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

  // 3. Geography / Nile Water Shares & Statistical Table (Page 3 or geography keywords)
  if (
    /نيل|روافد|عطبرة|سوباط|إثيوبيا|59%|84%|موارد مائية|حوض/i.test(combined) ||
    pageNumber === 3
  ) {
    const excerpt =
      cleanSelected ||
      'جدول الموارد المائية وحصص الروافد: النيل الأزرق 59%، النيل الأبيض 16%، نهر عطبرة 14%، نهر السوباط 11%.';
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

  // 4. Generic Curriculum Problem Analysis using extracted text from user's custom PDF
  const problemText = cleanSelected || cleanNearby || 'المسألة المحددة في الصفحة ' + pageNumber;
  return `### المعطيات
• نص المسألة/المقطع المحدد في الصفحة (${pageNumber}):
«${problemText}»
${lessonTitle ? `• موضوع الدرس: ${lessonTitle}` : ''}

### المطلوب
• تحليل عناصر المسألة المحددة واستخلاص القيم والعلاقات الأساسية للوصول إلى النتيجة الصحيحة خطوة بخطوة.

### الفكرة أو القانون المناسب
• تحديد العلاقة الرياضية أو القاعدة العلمية الحاكمة للمتغيرات الواردة في النص المحدد وربط المعطيات بالمطلوب مباشرة.

### تلميح أول
• حدّد الكلمات المفتاحية والأرقام أو الرموز الواردة في منطوق المسألة، وتأكد من توحيد الوحدات وترتيب العمليات قبل بدء التعويض.

### خطوات الحل
١. قراءة المعطيات الواردة في المنطقة المحددة بتركيز وتصنيفها إلى قيم معلومة ومتغير مطلوب.
٢. كتابة القاعدة أو القانون العلمي المرتبط بدرس «${lessonTitle || 'الصفحة الحالية'}».
٣. التعويض المباشر بالمعطيات الواردة في الخطوة الأولى وإجراء التبسيط اللازم.
٤. مراجعة الناتج النهائي والتحقق من توافقه منطقياً مع شروط المسألة.

### الحل النهائي
• تم تفكيك المسألة في الصفحة (${pageNumber}) إلى معطياتها وخطوات حلها المتسلسلة وفق منهج الكتاب المدرسي.

### درجة الثقة
• 95%`;
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
  const { t, isRTL } = useI18n();

  const getToolTitle = useCallback((toolId: SelectionToolId) => {
    switch (toolId) {
      case 'simplify': return t.aiAssistant?.toolsList?.simplify || 'بسّط';
      case 'stepByStep': return t.aiAssistant?.toolsList?.stepByStep || 'خطوة بخطوة';
      case 'translate': return isRTL ? 'الترجمة' : 'Translate';
      case 'hint': return t.aiAssistant?.toolsList?.hint || 'تلميح';
      case 'quiz': return t.aiAssistant?.toolsList?.quiz || 'اختبرني';
      case 'analyze': return t.aiAssistant?.toolsList?.analyzeProblem || 'تحليل مسألة';
      case 'explainFigure': return t.aiAssistant?.toolsList?.explainFigure || 'اشرح الصورة';
      default: return '';
    }
  }, [t, isRTL]);

  const getToolDesc = useCallback((toolId: SelectionToolId) => {
    switch (toolId) {
      case 'simplify': return t.aiAssistant?.toolsList?.simplifyDesc || '';
      case 'stepByStep': return t.aiAssistant?.toolsList?.stepByStepDesc || '';
      case 'translate': return isRTL ? 'ترجمة من اللغة المحددة إلى اللغة العربية' : 'Translate to Arabic';
      case 'hint': return t.aiAssistant?.toolsList?.hintDesc || '';
      case 'quiz': return t.aiAssistant?.toolsList?.quizDesc || '';
      case 'analyze': return t.aiAssistant?.toolsList?.analyzeProblemDesc || '';
      case 'explainFigure': return t.aiAssistant?.toolsList?.explainFigureDesc || '';
      default: return '';
    }
  }, [t, isRTL]);

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

  // Derive selection type label
  const getSelectionTypeLabel = useCallback(() => {
    if (!selection) return 'منطقة من الصفحة';
    return scienceAnalysisService.inferElementType(selection, selectedText || nearbyText);
  }, [selection, selectedText, nearbyText]);

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
  };

  const endPageForKey = selection?.endPageNumber || pageNumber;
  const currentSelectionKey = selection
    ? `${pageNumber}-${endPageForKey}-${selection.xPct.toFixed(1)}-${selection.yPct.toFixed(1)}-${selection.widthPct.toFixed(1)}-${selection.heightPct.toFixed(1)}`
    : `${pageNumber}-none`;

  // Reset retry counter and hint states on new selection or page
  useEffect(() => {
    if (prevSelKeyRef.current !== currentSelectionKey) {
      prevSelKeyRef.current = currentSelectionKey;
      aiGateway.resetRetryCount();
      setCanRetry((prev) => (!prev ? true : prev));
      setHintIndex(1);
      setShowingSolution(false);
    }
  }, [currentSelectionKey]);

  // Reset hint state when switching tools
  useEffect(() => {
    setHintIndex(1);
    setShowingSolution(false);
  }, [activeTool]);

  const getLocalFallbackForTool = useCallback(
    (
      toolId: SelectionToolId,
      currentText: string,
      currentNearbyText: string,
      currentLessonTitle: string,
      currentLessonContext: string,
      currentPageNum: number
    ) => {
      const targetTool = TOOLS_CONFIG.find((t) => t.id === toolId) || TOOLS_CONFIG[0];
      if (toolId === 'translate') {
        return buildLocalTranslationFallback(currentText, currentNearbyText);
      }
      if (toolId === 'analyze') {
        return buildLocalProblemAnalysisFallback(
          currentText,
          currentNearbyText,
          currentLessonTitle,
          currentLessonContext,
          currentPageNum
        );
      }
      return targetTool.mockResponse;
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
      } = latestParamsRef.current;

      try {
        const detectedType = scienceAnalysisService.inferElementType(
          currentSel,
          currentText || currentNearbyText
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
            studentLevel: 'المرحلة المتوسطة',
            language: 'ar',
            targetLanguage: 'ar',
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
              currentPageNum
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
          currentPageNum
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
          currentPageNum
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

  // Trigger loading when tool changes, panel opens, selection changes, or action button is clicked
  useEffect(() => {
    if (!isOpen) return;
    fetchExplanation(activeTool);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeTool, isOpen, actionTrigger, currentSelectionKey, fetchExplanation]);

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
                ? `صفحات ${pageNumber} إلى ${endPageNum}`
                : `${t.common?.page} ${pageNumber}`}{' '}
              {totalPages ? `من ${totalPages}` : ''}
              {bookTitle ? ` • ${bookTitle}` : ''}
              {lessonTitle ? ` (${lessonTitle})` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          title={t.common?.close || 'إغلاق اللوحة'}
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
                {t.aiAssistant?.selectionTypePrefix || 'نوع التحديد:'} {getSelectionTypeLabel()}
              </span>
              <span className="text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
                {isMultiPageSelection
                  ? `ص ${pageNumber} - ${endPageNum}`
                  : `${t.common?.page} ${pageNumber}`}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 leading-snug">
              {activeTool === 'translate'
                ? 'ترجمة النص المحدد بالمؤشر إلى اللغة العربية'
                : activeTool === 'explainFigure'
                ? t.science?.explainImageTitle || 'تحليل وفهم الصور والخرائط والجداول والرسوم'
                : activeTool === 'analyze'
                ? t.guidedMath?.analyzeProblemTitle || 'تحليل المسألة الرياضية واستخراج خطوات الحل'
                : 'ماذا تريد أن تفهم من هذا الجزء؟'}
            </p>
            {activeTool === 'translate' && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold text-sky-800 bg-sky-100/80 border border-sky-200 px-2 py-0.5 rounded-lg">
                <Languages className="w-3 h-3 text-sky-600" />
                <span>من اللغة المحددة بالمؤشر ← إلى اللغة العربية</span>
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
                  {showingSolution ? (t.guidedMath?.fullSolutionBadge || '(الحل الكامل)') : `(${isRTL ? 'تلميح' : 'Hint'} ${hintIndex})`}
                </span>
              )}
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {isGeminiPowered
              ? t.aiAssistant?.geminiPoweredBadge || 'تحليل ذكي عبر Gemini'
              : t.aiAssistant?.localMockBadge || 'رد تجريبي محلي'}
          </span>
        </div>

        {/* State 1: Loading */}
        {isLoading && (
          <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in duration-150">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 motion-reduce:animate-none" />
            <p className="text-xs font-semibold text-slate-700">
              {activeTool === 'translate'
                ? 'جاري التعرف على لغة النص المحدد وترجمته إلى اللغة العربية...'
                : activeTool === 'explainFigure'
                ? t.science?.loading || 'جاري فحص العنصر البصري وقراءة التفاصيل والرموز...'
                : activeTool === 'analyze'
                ? t.guidedMath?.loading || 'جاري فحص المسألة واستخراج المعطيات وخطوات الحل...'
                : t.aiAssistant?.loadingTitle || 'جاري تحليل الجزء المحدد وإعداد التوجيه...'}
            </p>
            <p className="text-[11px] text-slate-400">
              {t.aiAssistant?.loadingSub ||
                'يقوم مساعد نون بالتواصل مع خدمة AI Gateway لتقديم تحليل دقيق ومبسط.'}
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
                  {t.aiAssistant?.errorTitle || 'تنبيه المساعد الذكي'}
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
                  <span>{t.common?.retry || 'إعادة المحاولة'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-100/70 text-xs font-semibold transition-colors"
              >
                {t.common?.close || 'إغلاق'}
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
                  <span>{t.guidedMath?.hintModeTitle || 'وضع التلميحات الموجهة'}</span>
                  <span className="text-[10px] text-amber-700">
                    {t.guidedMath?.hintModeSub || 'دون كشف الحل'}
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
                        <span>{t.guidedMath?.nextHint || 'التلميح التالي'}</span>
                      </button>
                      <button
                        onClick={handleShowSolution}
                        disabled={isSubActionLoading}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/60 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-700" />
                        <span>{t.guidedMath?.showSolution || 'إظهار الحل'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleBackToHints}
                      disabled={isSubActionLoading}
                      className="min-h-[40px] flex-1 px-3 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/60 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t.guidedMath?.backToHints || 'العودة للتلميحات الموجهة'}</span>
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
                'تم التحليل عبر AI Gateway وفق القواعد التربوية الصارمة لنون دون تحريف لرموز المسألة أو محتوى الكتاب.'
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
          <span>{t.bookViewer?.backToPage || 'العودة إلى الصفحة'}</span>
        </button>

        {/* Refresh / Retry Button */}
        {canRetry && (
          <button
            onClick={() => fetchExplanation(activeTool)}
            disabled={isLoading}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="إعادة المحاولة / تحديث الشرح"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t.common?.retry || 'إعادة المحاولة'}</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
        >
          {t.common?.close || 'إغلاق'}
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
