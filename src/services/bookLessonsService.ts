import * as pdfjsLib from 'pdfjs-dist';
import { Book } from '../types';
import { pdfService, cleanArabicPdfText } from './pdfService';

export interface BookLesson {
  id: string;
  title: string;
  unitTitle?: string;
  pageNumber: number; // 1-based page number where lesson starts
  endPageNumber?: number; // 1-based page number where lesson ends
  summary?: string;
  keyConcepts?: string[];
  curriculumContext?: string; // Rich curriculum facts for accurate exercise solving
}

/**
 * Known curriculum definitions for accurate pedagogical assistance and exercise solving
 */
const KNOWN_CURRICULA: Record<string, BookLesson[]> = {
  // 1. منهج الجغرافيا للصف التاسع
  geographic_9th: [
    {
      id: 'geo9-lesson-1',
      title: 'الدرس 1: الموقع الفلكي والجغرافي والحدود',
      unitTitle: 'الوحدة الأولى: الجغرافيا الطبيعية لليمن',
      pageNumber: 6,
      endPageNumber: 13,
      summary: 'الموقع الفلكي، الموقع الجغرافي، الحدود البرية والبحرية، المساحة، وأهمية موقع الجمهورية اليمنية والجزر التابعة لها.',
      keyConcepts: [
        'الموقع الفلكي: بين خطي عرض 12° و 19° شمالاً، وخطي طول 41° و 54° شرقاً',
        'الموقع الجغرافي: جنوب غرب شبه الجزيرة العربية وجنوب غرب قارة آسيا',
        'الحدود: شمالاً السعودية، جنوباً البحر العربي، شرقاً سلطنة عمان، غرباً البحر الأحمر ومضيق باب المندب',
        'المساحة: حوالي 555,000 كم²',
        'أهم الجزر: أرخبيل سقطرى (في البحر العربي)، ميون (في باب المندب)، كمران وحنيش (في البحر الأحمر)',
        'الأهمية الاستراتيجية: التحكم في مضيق باب المندب، ربط خطوط التجارة العالمية بين المحيط الهندي وقناة السويس',
      ],
      curriculumContext: `حقائق المنهج الدراسي للدرس الأول (تقويم الدرس والتمارين):
1. الموقع الفلكي: تقع الجمهورية اليمنية بين خطي عرض 12° و 19° شمال خط الاستواء، وبين خطي طول 41° و 54° شرق خط غرينتش.
2. الموقع الجغرافي: تقع في أقصى الجنوب الغربي لشبه الجزيرة العربية، وفي الجزء الجنوبي الغربي من قارة آسيا.
3. الحدود السياسية:
   - يحدها من الشمال: المملكة العربية السعودية.
   - يحدها من الجنوب: البحر العربي وخليج عدن.
   - يحدها من الشرق: سلطنة عمان.
   - يحدها من الغرب: البحر الأحمر ومضيق باب المندب.
4. المساحة الإجمالية: تبلغ حوالي 555,000 كم² (دون احتساب صحراء الربع الخالي).
5. الجزر والمضائق:
   - تمتلك الجمهورية اليمنية مضيق باب المندب الاستراتيجي.
   - أكبر الجزر اليمنية: أرخبيل سقطرى، ويقع في البحر العربي والمحيط الهندي.
   - جزر أخرى مهمة: جزيرة ميون، جزر كمران، جزر حنيش وزقر.
6. الأهمية الاستراتيجية والاقتصادية:
   - الإشراف المباشر على مضيق باب المندب الذي يتحكم في الملاحة الدولية بين الشرق والغرب وطريق ناقلات النفط والتجارة العالمية عبر قناة السويس.
   - امتلاك سواحل بحرية طويلة تزيد عن 2500 كم غنية بالأحياء البحرية وتضم موانئ استراتيجية مثل عدن والحديدة والمكلا.
   - موقع جغرافي وسيط يربط بين قارات العالم (آسيا، إفريقيا، وأوروبا).`,
    },
    {
      id: 'geo9-lesson-1-eval',
      title: 'تقويم الدرس الأول',
      unitTitle: 'الوحدة الأولى: الجغرافيا الطبيعية لليمن',
      pageNumber: 13,
      endPageNumber: 13,
      summary: 'تمارين وأسئلة تقويم الدرس الأول: الموقع الفلكي، الحدود، المساحة، وإكمال الفراغات، والأهمية الاستراتيجية.',
      keyConcepts: [
        'حل أسئلة تقويم الدرس الأول بدقة وفق معطيات المنهج المعتمد',
      ],
      curriculumContext: `حلول الأسئلة النموذجية لتقويم الدرس الأول في الصفحة 13:
- س1 (الموقع الفلكي): تقع بين خطي عرض 12° و 19° شمالاً، وخطي طول 41° و 54° شرقاً.
- س2 (الحدود): شمالاً السعودية، جنوباً البحر العربي، شرقاً سلطنة عمان، غرباً البحر الأحمر ومضيق باب المندب.
- س3 (المساحة): حوالي 555,000 كم².
- س3 (إكمال العبارات):
  أ- تقع الجمهورية اليمنية في جنوب [شبه الجزيرة العربية] وفي الجزء الجنوبي الغربي من قارة [آسيا].
  ب- يحد الجمهورية اليمنية من الجنوب [البحر العربي] ومن الشمال [المملكة العربية السعودية] ومن الشرق [سلطنة عمان] ومن الغرب [البحر الأحمر].
  ج- تمتلك الجمهورية اليمنية مضيق [باب المندب] وأكبر الجزر اليمنية أرخبيل [سقطرى] التي تقع في [البحر العربي والمحيط الهندي].
- س4 (الأهمية الاستراتيجية والاقتصادية): الإشراف على مضيق باب المندب الدولي، الموقع الجغرافي الرابط بين القارات، وطول السواحل البحرية الغنية بالثروات والموانئ.`,
    },
    {
      id: 'geo9-lesson-2',
      title: 'الدرس 2: تضاريس الجمهورية اليمنية وأقسام السطح',
      unitTitle: 'الوحدة الأولى: الجغرافيا الطبيعية لليمن',
      pageNumber: 14,
      endPageNumber: 23,
      summary: 'أقسام التضاريس: السهول الساحلية، المرتفعات الجبلية (الغربية، الوسطى، والجنوبية)، الهضاب الشرقية، وصحراء الربع الخالي.',
      keyConcepts: [
        'السهول الساحلية: سهل تهامة وسهل الساحل الجنوبي',
        'المرتفعات الجبلية: أعلى قمة جبل النبي شعيب (3666 م)',
        'الهضاب: هضبة حضرموت وهضبة المهرة',
        'الصحراء: أطراف الربع الخالي ورملة السبعتين',
      ],
      curriculumContext: `حقائق المنهج لتضاريس اليمن:
1. أعلى قمة جبلية في اليمن وشبه الجزيرة العربية هي قمة جبل النبي شعيب بارتفاع 3666 متراً فوق مستوى سطح البحر.
2. يقسم سطح اليمن تضاريسياً إلى خمسة أقاليم رئيسية: إقليم السهول الساحلية، إقليم المرتفعات الجبلية، إقليم الهضاب الشرقية، إقليم الصحراء (الربع الخالي)، وإقليم الجزر اليمنية.
3. سهل تهامة هو أكبر السهول الساحلية الغربية المطلة على البحر الأحمر.`,
    },
    {
      id: 'geo9-lesson-3',
      title: 'الدرس 3: المناخ والعوامل المؤثرة والأمطار',
      unitTitle: 'الوحدة الأولى: الجغرافيا الطبيعية لليمن',
      pageNumber: 24,
      endPageNumber: 33,
      summary: 'عوامل تشكيل المناخ: الموقع الفلكي، الارتفاع عن سطح البحر، القرب والبعد من البحر، والرياح الموسمية الصيفية والشتوية.',
      keyConcepts: [
        'تنوع المناخ في اليمن بتنوع التضاريس والارتفاع',
        'الأمطار تسقط في موسمين: موسم الربيع (إبريل ومايو) وموسم الصيف (يوليو وأغسطس)',
      ],
    },
    {
      id: 'geo9-lesson-4',
      title: 'الدرس 4: النبات الطبيعي والبيئات النباتية',
      unitTitle: 'الوحدة الأولى: الجغرافيا الطبيعية لليمن',
      pageNumber: 34,
      endPageNumber: 45,
      summary: 'أنواع النبات الطبيعي: نباتات المرتفعات الرطبة، نباتات السهول الجافة، النباتات الشوكية، وشجرة دم الأخوين الفريدة في سقطرى.',
      keyConcepts: [
        'ارتباط كثافة النبات الطبيعي بكمية الأمطار والتضاريس',
        'سقطرى موطن نباتات وأشجار نادرة عالمياً كشجرة دم الأخوين',
      ],
    },
    {
      id: 'geo9-lesson-5',
      title: 'الدرس 5: سكان اليمن والنمو والتوزيع',
      unitTitle: 'الوحدة الثانية: جغرافيا السكان والأنشطة الاقتصادية',
      pageNumber: 46,
      endPageNumber: 59,
      summary: 'النمو السكاني، الهجرة الداخلية والخارجية، التوزيع الجغرافي للسكان، والكثافة السكانية في المرتفعات والمدن.',
      keyConcepts: [
        'تركز الكثافة السكانية في المرتفعات والسهول الخصبة لاعتدال المناخ وتوفر المياه',
      ],
    },
    {
      id: 'geo9-lesson-6',
      title: 'الدرس 6: الأنشطة الاقتصادية (الزراعة والرعي)',
      unitTitle: 'الوحدة الثانية: جغرافيا السكان والأنشطة الاقتصادية',
      pageNumber: 60,
      endPageNumber: 73,
      summary: 'الزراعة المطرية والمروية، المدرجات الجبلية، الحبوب، الفواكه، محاصيل النقد كالبن والقطن، والثروة الحيوانية.',
      keyConcepts: [
        'نظام المدرجات الزراعية الجبلية الفريد في اليمن لحفظ التربة والمياه',
        'شهرة البن اليمني عالمياً (موكا)',
      ],
    },
    {
      id: 'geo9-lesson-7',
      title: 'الدرس 7: الثروة السمكية والنفطية والمعدنية',
      unitTitle: 'الوحدة الثانية: جغرافيا السكان والأنشطة الاقتصادية',
      pageNumber: 74,
      endPageNumber: 87,
      summary: 'المصائد البحرية في البحر الأحمر والعربي، إنتاج النفط والغاز الطبيعي، والمعادن والصخور الصناعية.',
      keyConcepts: [
        'طول السواحل البحرية وغناها بأنواع الأسماك والجمبري والقشريات',
        'حقول النفط والغاز في مأرب وشبوة وحضرموت',
      ],
    },
    {
      id: 'geo9-lesson-8',
      title: 'الدرس 8: الصناعة والتجارة والموانئ والمواصلات',
      unitTitle: 'الوحدة الثانية: جغرافيا السكان والأنشطة الاقتصادية',
      pageNumber: 88,
      endPageNumber: 114,
      summary: 'الصناعات التحويلية والغذائية، التجارة والصادرات، الموانئ البحرية الاستراتيجية (عدن، الحديدة، المكلا) وشبكات الطرق.',
      keyConcepts: [
        'ميناء عدن الطبيعي وأهميته كمركز تموين وخدمات ملاحية دولية',
        'مراجعة شاملة وتقويم نهائي للمقرر',
      ],
    },
  ],

  // 2. منهج الأحياء والعلوم العامة (الصف الثاني الثانوي)
  biology_grade11: [
    {
      id: 'bio11-lesson-1',
      title: 'الدرس 1: التركيب الخلوي والغشاء البلازمي',
      unitTitle: 'الوحدة الأولى: الخلية وعلم الأحياء الدقيقة',
      pageNumber: 1,
      endPageNumber: 18,
      summary: 'بنية الخلية الحية، العضيات السيتوبلازمية، نموذج الفسيفساء السائل، والدهون المفسفرة.',
      keyConcepts: [
        'الغشاء البلازمي: طبقة دهون مفسفرة مزدوجة ذات رؤوس قطبية محبة للماء وذيول كارهة للماء',
        'البروتينات الغشائية: قنوات ناقلة ومستقبلات إشارات خلوية',
        'النواة: مركز التحكم الوراثي الحاوي على المادة الوراثية DNA',
      ],
      curriculumContext: `حقائق الأحياء:
1. يتكون الغشاء البلازمي من طبقة ثنائية من الفوسفوليبيدات مع بروتينات مغمورة وجزيئات كولسترول.
2. الرؤوس الفوسفاتية قطبية محبة للماء تواجه السوائل المائية، الذيول الهيدروكربونية كارهة للماء تتجمع بالداخل.`,
    },
    {
      id: 'bio11-lesson-2',
      title: 'الدرس 2: النقل الخلوي والنفاذية الاختيارية',
      unitTitle: 'الوحدة الأولى: الخلية وعلم الأحياء الدقيقة',
      pageNumber: 19,
      endPageNumber: 38,
      summary: 'الانتشار البسيط، الخاصية الأسموزية، الانتشار الميسر، والنقل النشط عبر مضخة الصوديوم والبوتاسيوم.',
      keyConcepts: [
        'النفاذية الاختيارية: تحكم الغشاء في مرور المواد حسب حجمها وشحنتها',
        'الأسموزية: انتقال جزيئات الماء من الوسط الأقل تركيزاً للأملاح إلى الوسط الأعلى تركيزاً',
        'النقل النشط: حركة الجزيئات ضد منحدر التركيز باستهلاك طاقة ATP',
        'مضخة Na+/K+: طرد 3 أيونات صوديوم وإدخال أيوني بوتاسيوم',
      ],
    },
    {
      id: 'bio11-lesson-3',
      title: 'الدرس 3: البلعمة والإخراج الخلوي',
      unitTitle: 'الوحدة الأولى: الخلية وعلم الأحياء الدقيقة',
      pageNumber: 39,
      endPageNumber: 60,
      summary: 'النقل بالحويصلات، البلعمة (Phagocytosis)، الشرب الخلوي (Pinocytosis)، ودور الأجسام الهاضمة (الليسوسومات).',
      keyConcepts: [
        'البلعمة: ابتلاع الجسيمات الصلبة كالبكتيريا بواسطة حويصلات غشائية',
        'الليسوسومات: عضيات تحوي إنزيمات هيدروليكية لهضم المحتويات المبتلعة',
      ],
    },
    {
      id: 'bio11-lesson-4',
      title: 'الدرس 4: التنفس الخلوي وإنتاج الطاقة (ATP)',
      unitTitle: 'الوحدة الثانية: الطاقة والتمثيل الحيوي',
      pageNumber: 61,
      endPageNumber: 90,
      summary: 'التحلل السكري، دورة كريبس، وسلسلة نقل الإلكترون في الميتوكوندريا، ومعادلة التنفس الهوائي واللاهوائي.',
      keyConcepts: [
        'معادلة التنفس الهوائي: الجلوكوز + الأكسجين ⟶ ثاني أكسيد الكربون + ماء + 36-38 ATP',
        'الميتوكوندريا: مصنع الطاقة في الخلية ومقر دورة كريبس وسلسلة نقل الإلكترون',
      ],
    },
    {
      id: 'bio11-lesson-5',
      title: 'الدرس 5: الانقسام الخلوي (المتساوي والمنصف)',
      unitTitle: 'الوحدة الثالثة: التكاثر وعلم الوراثة',
      pageNumber: 91,
      endPageNumber: 120,
      summary: 'أطوار الانقسام الميتوزي (المتساوي) للنمو والتعويض، والانقسام الميوزي (المنصف) لإنتاج الأمشاج والتنوع الوراثي.',
      keyConcepts: [
        'الانقسام المتساوي: ينتج خليتين متطابقتين بـ 2n كروموسوم',
        'الانقسام المنصف: ينتج 4 خلايا أحادية المجموعة 1n مع ظاهرة العبور الوراثي',
      ],
    },
    {
      id: 'bio11-lesson-6',
      title: 'الدرس 6: الوراثة المندلية والصفات الجينية',
      unitTitle: 'الوحدة الثالثة: التكاثر وعلم الوراثة',
      pageNumber: 121,
      endPageNumber: 148,
      summary: 'قوانين مندل (السيادة التامة وانعزال العوامل)، مربع بانيت، والصفات المرتبطة بالجنس.',
      keyConcepts: [
        'الصفة السائدة والصفة المتنحية',
        'النسبة المندلية للجيل الثاني في الهجين الأحادي (3 : 1)',
      ],
    },
  ],

  // 3. منهج الرياضيات والجبر (الصف الأول الثانوي)
  math_grade10: [
    {
      id: 'math10-lesson-1',
      title: 'الدرس 1: الصورة العامة للمعادلة التربيعية',
      unitTitle: 'الوحدة الأولى: المعادلات والدوال التربيعية',
      pageNumber: 1,
      endPageNumber: 20,
      summary: 'الصورة القياسية ax² + bx + c = 0، تحديد المعاملات a و b و c، والتحليل إلى عوامل.',
      keyConcepts: [
        'الصورة القياسية: ax² + bx + c = 0 مع شرط a ≠ 0',
        'إيجاد الجذور بالتحليل، الفرق بين مربعين، وإكمال المربع',
      ],
    },
    {
      id: 'math10-lesson-2',
      title: 'الدرس 2: القانون العام والمميز الرياضي (Delta)',
      unitTitle: 'الوحدة الأولى: المعادلات والدوال التربيعية',
      pageNumber: 21,
      endPageNumber: 45,
      summary: 'صيغة القانون العام x = (-b ± √(b²-4ac)) / (2a)، وحالات المميز Δ لتحديد عدد ونوع الجذور.',
      keyConcepts: [
        'حساب المميز: Δ = b² - 4ac',
        'إذا كان Δ > 0 : جذران حقيقيان مختلفان',
        'إذا كان Δ = 0 : جذر حقيقي واحد مكرر',
        'إذا كان Δ < 0 : لا توجد حلول حقيقية (جذور مركبة)',
      ],
    },
    {
      id: 'math10-lesson-3',
      title: 'الدرس 3: التمثيل البياني للدالة التربيعية',
      unitTitle: 'الوحدة الأولى: المعادلات والدوال التربيعية',
      pageNumber: 46,
      endPageNumber: 75,
      summary: 'رسم القطع المكافئ، محور التماثل x = -b/(2a)، نقطة الرأس (القاع أو القمة)، ونقاط التقاطع مع المحاور.',
      keyConcepts: [
        'محور التماثل: x = -b / (2a)',
        'رأس المنحنى: ( -b/(2a) , f(-b/(2a)) )',
        'فتحة القطع للأعلى إذا كان a > 0، وللأسفل إذا كان a < 0',
      ],
    },
    {
      id: 'math10-lesson-4',
      title: 'الدرس 4: نظم المعادلات الخطية والتربيعية',
      unitTitle: 'الوحدة الثانية: النظم الجبرية والمصفوفات',
      pageNumber: 76,
      endPageNumber: 110,
      summary: 'حل نظام مكوّن من معادلة خطية وأخرى تربيعية بطريقة التعويض والحل البياني.',
      keyConcepts: [
        'طريقة التعويض: عزل أحد المتغيرين من المعادلة الخطية وتعويضه في المعادلة التربيعية',
      ],
    },
    {
      id: 'math10-lesson-5',
      title: 'الدرس 5: المصفوفات والمحددات وحساب القيم',
      unitTitle: 'الوحدة الثانية: النظم الجبرية والمصفوفات',
      pageNumber: 111,
      endPageNumber: 145,
      summary: 'رتبة المصفوفة، جمع وطرح وضرب المصفوفات، وحساب محدد الرتبة الثانية والثالثة وقاعدة كرامر.',
      keyConcepts: [
        'شرط ضرب مصفوفتين: عدد أعمدة الأولى يساوي عدد صفوف الثانية',
        'حساب محدد الرتبة الثانية: det(A) = ad - bc',
      ],
    },
    {
      id: 'math10-lesson-6',
      title: 'الدرس 6: حساب المثلثات والمتطابقات الأساسية',
      unitTitle: 'الوحدة الثالثة: حساب المثلثات والهندسة',
      pageNumber: 146,
      endPageNumber: 180,
      summary: 'النسب المثلثية (الجيب وجيب التمام والظل)، متطابقة فيثاغورس sin²θ + cos²θ = 1، وزوايا الارتفاع والانخفاض.',
      keyConcepts: [
        'متطابقة فيثاغورس الأساسية: sin²(x) + cos²(x) = 1',
        'tan(x) = sin(x) / cos(x)',
      ],
    },
  ],

  // 4. منهج الدراسات الجغرافية العامة (الصف الثالث الإعدادي)
  geography_grade9: [
    {
      id: 'geo-gen-1',
      title: 'الدرس 1: الملامح الطبيعية والتضاريسية للوطن العربي',
      unitTitle: 'الباب الأول: البيئة الطبيعية والموارد',
      pageNumber: 1,
      endPageNumber: 25,
      summary: 'الموقع الجغرافي للوطن العربي، السلاسل الجبلية الالتوائية والانكسارية، والسهول الفيضية والساحلية.',
      keyConcepts: [
        'الموقع الجغرافي للوطن العربي: يمتد في قارتي آسيا وإفريقيا ويطل على محيطين وثلاثة بحار',
        'الجبال الالتوائية كجبال أطلس وزاغروس، والجبال الانكسارية كجبال البحر الأحمر وبلاد الشام',
      ],
    },
    {
      id: 'geo-gen-2',
      title: 'الدرس 2: المناخ والأقاليم النباتية العربية',
      unitTitle: 'الباب الأول: البيئة الطبيعية والموارد',
      pageNumber: 26,
      endPageNumber: 50,
      summary: 'إقليم البحر المتوسط، الإقليم الصحراوي (الأكبر مساحة بنسبة 80%)، والإقليم المداري الحار.',
      keyConcepts: [
        'الإقليم الصحراوي يشغل أكثر من 80% من مساحة الوطن العربي',
        'إقليم البحر المتوسط: حار جاف صيفاً دافئ ممطر شتاءً',
      ],
    },
    {
      id: 'geo-gen-3',
      title: 'الدرس 3: حوض نهر النيل والموارد المائية العذبة',
      unitTitle: 'الباب الأول: البيئة الطبيعية والموارد',
      pageNumber: 51,
      endPageNumber: 75,
      summary: 'المنابع الاستوائية والموسمية (هضبة إثيوبيا بنسبة 84%)، مجرى النيل، وروافد النيل الأزرق وعطبرة.',
      keyConcepts: [
        'هضبة إثيوبيا (الحبشة) تمد نهر النيل بنحو 84% من إيراده المائي الموسمي في الصيف',
        'نهر النيل يتدفق من الجنوب المرتفع إلى الشمال المنخفض باتجاه البحر المتوسط',
        'آخر رافد يصب في النيل هو نهر عطبرة',
      ],
    },
    {
      id: 'geo-gen-4',
      title: 'الدرس 4: أحواض نهري دجلة والفرات والمياه الجوفية',
      unitTitle: 'الباب الثاني: الموارد المائية والأمن الغذائي',
      pageNumber: 76,
      endPageNumber: 100,
      summary: 'منابع دجلة والفرات في هضبة الأناضول، شط العرب، والواحات والمخزون الجوفي.',
      keyConcepts: [
        'ينبع دجلة والفرات من جبال طوروس في تركيا ويلتقيان في شط العرب بالعراق',
      ],
    },
    {
      id: 'geo-gen-5',
      title: 'الدرس 5: السكان والتنمية الاقتصادية المستدامة',
      unitTitle: 'الباب الثاني: الموارد المائية والأمن الغذائي',
      pageNumber: 101,
      endPageNumber: 124,
      summary: 'التوزيع السكاني، الهجرة، الأنشطة الزراعية والصناعية، والمحافظة على الموارد الطبيعية.',
      keyConcepts: [
        'تركز السكان في السهول الفيضية والمدن الساحلية ومناطق التعدين',
      ],
    },
  ],

  // 5. منهج الرياضيات - الجزء الأول - الصف التاسع الأساسي (الجمهورية اليمنية - المجموعات والعلاقات والتطبيقات)
  math_grade9_part1: [
    {
      id: 'math9-lesson-1',
      title: 'الدرس 1: المجموعات والعمليات عليها (التقاطع، الاتحاد، الفرق، المتممة)',
      unitTitle: 'الوحدة الأولى: المجموعات والعلاقات',
      pageNumber: 1,
      endPageNumber: 18,
      summary: 'طرق كتابة المجموعة (السرد والصفة المميزة)، الاحتواء والانتماء، تقاطع واتحاد المجموعات، الفرق التناظري، والمجموعة الشاملة والمتممة.',
      keyConcepts: [
        'الانتماء (∈) يربط عنصراً بمجموعة، والاحتواء (⊂) يربط مجموعة جزئية بمجموعة أخرى',
        'التقاطع (س ∩ ص): العناصر المشتركة بين س و ص',
        'الاتحاد (س ∪ ص): جميع عناصر س و ص دون تكرار',
        'الفرق (س \\ ص): العناصر التي تنتمي إلى س ولا تنتمي إلى ص',
      ],
      curriculumContext: `حقائق المنهج للوحدة الأولى (المجموعات):
- تكتب المجموعة بطريقة السرد (حصر العناصر بين حاصرتين { }) أو بطريقة الصفة المميزة { س : س يحقق خاصية معينة }.
- س ∩ ص = { أ : أ ∈ س وَ أ ∈ ص }.
- س ∪ ص = { أ : أ ∈ س أو أ ∈ ص }.
- متممة المجموعة س (س') = ش \\ س حيث ش المجموعة الشاملة.`,
    },
    {
      id: 'math9-lesson-2',
      title: 'الدرس 2: الضرب الديكارتي والعلاقات وخواصها',
      unitTitle: 'الوحدة الأولى: المجموعات والعلاقات',
      pageNumber: 19,
      endPageNumber: 33,
      summary: 'الأزواج المرتبة (أ ، ب)، حاصل الضرب الديكارتي س × ص، مفهوم العلاقة من مجموعة إلى أخرى، مجال العلاقة ومداها، وعلاقة الانعكاس والتناظر والتعدي.',
      keyConcepts: [
        'الزوج المرتب (أ ، ب) = (جـ ، د) إذا وفقط إذا كان أ = جـ وَ ب = د',
        'الضرب الديكارتي س × ص = { (أ ، ب) : أ ∈ س ، ب ∈ ص } وعدد عناصره ن(س × ص) = ن(س) × ن(ص)',
        'العلاقة ع من س إلى ص هي أي مجموعة جزئية من حاصل الضرب الديكارتي س × ص (ع ⊂ س × ص)',
      ],
      curriculumContext: `حقائق الضرب الديكارتي والعلاقات:
- في الزوج المرتب (أ ، ب) يسمى أ المسقط الأول ويسمى ب المسقط الثاني.
- تمثل العلاقة كأزواج مرتبة، أو بمخطط سهمي، أو بمخطط بياني (شبكة تربيعية).
- تكون العلاقة على س انعكاسية إذا ارتبط كل عنصر أ ∈ س بنفسه (أ ، أ) ∈ ع.
- تكون متناظرة إذا كان لكل (أ ، ب) ∈ ع فإن (ب ، أ) ∈ ع.
- تكون متعدية إذا كان (أ ، ب) ∈ ع وَ (ب ، جـ) ∈ ع يستلزم (أ ، جـ) ∈ ع.`,
    },
    {
      id: 'math9-lesson-3',
      title: 'الدرس 3: التطبيقات (الدوال) وقاعدة التطبيق ومدى التطبيق',
      unitTitle: 'الوحدة الأولى: المجموعات والعلاقات',
      pageNumber: 34,
      endPageNumber: 48,
      summary: 'متى تمثل العلاقة تطبيقاً (دالة)، مجال التطبيق ومجاله المقابل ومداه، قاعدة الاقتران ت(أ)، وتمارين الوحدة الأولى على العلاقات والتطبيقات (صفحات 39-42).',
      keyConcepts: [
        'شرط التطبيق: تسمى العلاقة ع من س إلى ص تطبيقاً إذا ارتبط كل عنصر من المجال س بعنصر واحد وواحد فقط من المجال المقابل ص',
        'في المخطط السهمي: يخرج من كل عنصر في المجال س سهم واحد فقط إلى المجال المقابل ص',
        'مدى التطبيق: هو مجموعة صور عناصر المجال س، والمدى دائماً مجموعة جزئية من المجال المقابل ص',
        'قاعدة التطبيق ت(أ): العلاقة الرياضية التي تحسب صورة كل عنصر أ من المجال',
      ],
      curriculumContext: `حقائق وحلول تمارين العلاقات والتطبيقات (صفحات 39 - 42 من كتاب الرياضيات للصف التاسع - الجزء الأول):
شرط التطبيق الأساسي: العلاقة من س إلى ص تمثل تطبيقاً إذا وفقط إذا ظهر كل عنصر من عناصر المجال س كمسقط أول مرة واحدة وواحدة فقط في أزواج العلاقة (أي يخرج منه سهم واحد فقط في المخطط السهمي).
- حل تمرين [5] (صفحة 39 / 41):
  المعطيات: س = {1، 2، 3، 4}، ص = {15، 34، 43، 55، 92}، والعلاقة ع = {(أ ، ب) : أ ∈ س ، ب ∈ ص ، أ رقم من أرقام العدد ب}.
  أ) أزواج العلاقة ع:
     • العنصر 1 رقم في العدد 15  (1 ، 15)
     • العنصر 2 رقم في العدد 92  (2 ، 92)
     • العنصر 3 رقم في العددين 34 و 43  (3 ، 34) ، (3 ، 43)
     • العنصر 4 رقم في العددين 34 و 43  (4 ، 34) ، (4 ، 43)
     إذن ع = { (1 ، 15) ، (2 ، 92) ، (3 ، 34) ، (3 ، 43) ، (4 ، 34) ، (4 ، 43) }.
  ب) هل ع تمثل تطبيقاً؟ ولماذا؟
     الجواب: لا، العلاقة ع لا تمثل تطبيقاً؛ لأن العنصر 3 ∈ س ارتبط بأكثر من عنصر في ص (ارتبط بـ 34 و 43)، وكذلك العنصر 4 ∈ س ارتبط بعنصرين هما 34 و 43 (خرج منهما أكثر من سهم).
- حل تمرين [6] (صفحة 39 / 41) المخططات السهمية شكل (1-29):
  • شكل (1-29 أ): العلاقة ت من س = {1، 2، 3} إلى ص = {5، 7، 9} تمثل تطبيقاً لأن كل عنصر في س خرج منه سهم واحد فقط: 1 ← 5 ، 2 ← 7 ، 3 ← 9.
    قاعدة التطبيق: ت(أ) = 2أ + 3. مدى التطبيق = {5، 7، 9}.
  • شكل (1-29 ب): العلاقة ت من ك = {1، 0، -1، -2} إلى ل = {1، 4} تمثل تطبيقاً لأن كل عنصر في ك خرج منه سهم واحد فقط. مدى التطبيق = {1، 4}.
  • شكل (1-29 جـ): العلاقة ت من م = {2، 4، 6} إلى ن = {1، 2، 3} تمثل تطبيقاً لأن كل عنصر في م خرج منه سهم واحد فقط: 2 ← 1 ، 4 ← 2 ، 6 ← 3.
    قاعدة التطبيق: ت(أ) = أ ÷ 2 (أو نصف أ). مدى التطبيق = {1، 2، 3}.
- حل تمرين [7] (صفحة 39 / 41):
  المعطيات: ك = {1، 2، 3، 4}، ل = {2، 3، 6، 11، 18}، والتطبيق ت : ك ← ل معرّف بالقاعدة: أ ← أ² + 2 (أي ت(أ) = أ² + 2).
  • صور عناصر المجال ك:
    ت(1) = (1)² + 2 = 1 + 2 = 3
    ت(2) = (2)² + 2 = 4 + 2 = 6
    ت(3) = (3)² + 2 = 9 + 2 = 11
    ت(4) = (4)² + 2 = 16 + 2 = 18
  • مدى التطبيق = {3، 6، 11، 18}.
- حل تمرين [8] (صفحة 39 / 41):
  المعطيات: ت تطبيق مجاله س = {0، 5، 10، 15}، ومجاله المقابل ط (مجموعة الأعداد الطبيعية)، وقاعدته هي: أ ← أ + 10 (أي ت(أ) = أ + 10).
  • حساب الصور:
    ت(0) = 0 + 10 = 10
    ت(5) = 5 + 10 = 15
    ت(10) = 10 + 10 = 20
    ت(15) = 15 + 10 = 25
  أ) مدى التطبيق = {10، 15، 20، 25}.
  ب) كتابة التطبيق كأزواج مرتبة: ت = { (0 ، 10) ، (5 ، 15) ، (10 ، 20) ، (15 ، 25) }.
- حل تمرين [9] (صفحة 39 / 41):
  المعطيات: ت تطبيق مجاله س = {0، 1، 2، -1، -2}، ومجاله المقابل ص (الأعداد الصحيحة)، معرّف بالقاعدة: أ ← أ² - 3 (أي ت(أ) = أ² - 3).
  • حساب الصور:
    ت(0) = (0)² - 3 = -3
    ت(1) = (1)² - 3 = 1 - 3 = -2
    ت(2) = (2)² - 3 = 4 - 3 = 1
    ت(-1) = (-1)² - 3 = 1 - 3 = -2
    ت(-2) = (-2)² - 3 = 4 - 3 = 1
  أ) كتابة التطبيق كأزواج مرتبة: ت = { (0 ، -3) ، (1 ، -2) ، (2 ، 1) ، (-1 ، -2) ، (-2 ، 1) }.
     مدى التطبيق (بدون تكرار العناصر) = {-3، -2، 1}.
  ب) المخطط السهمي: نوصل أسهماً من 0 إلى -3، ومن 1 و -1 إلى -2، ومن 2 و -2 إلى 1.
- حل تمرين [10] (صفحة 40 / 42):
  المعطيات: س = {1، 2، 3، 4، 5، 6}، أي العلاقات التالية المعرفة على س تمثل تطبيقاً؟ اذكر السبب:
  • ع1 = { (1 ، 6) ، (2 ، 5) ، (3 ، 4) ، (4 ، 3) ، (5 ، 2) ، (6 ، 1) }:
    نعم، ع1 تمثل تطبيقاً؛ لأن كل عنصر من عناصر المجموعة س = {1، 2، 3، 4، 5، 6} ظهر كمسقط أول مرة واحدة وواحدة فقط.
  • ع2 = { (أ ، ب) : أ ، ب ∈ س ، أ = 2ب }:
    أزواج ع2 هي: (2 ، 1) ، (4 ، 2) ، (6 ، 3).
    لا، ع2 لا تمثل تطبيقاً؛ لأن العناصر 1 ، 3 ، 5 ∈ س لم ترتبط بأي عنصر في س (لم تظهر كمسقط أول).
  • ع3 = { (أ ، ب) : أ ، ب ∈ س ، أ = 7 - ب }:
    أزواج ع3 هي: (6 ، 1) ، (5 ، 2) ، (4 ، 3) ، (3 ، 4) ، (2 ، 5) ، (1 ، 6).
    نعم، ع3 تمثل تطبيقاً؛ لأن كل عنصر من عناصر س ارتبط بعنصر وحيد في س.`,
    },
    {
      id: 'math9-lesson-4',
      title: 'الدرس 4: تحليل المقادير الجبرية (العامل المشترك، الفرق بين مربعين، المكعبين، والتجربة)',
      unitTitle: 'الوحدة الثانية: تحليل المقادير الجبرية',
      pageNumber: 49,
      endPageNumber: 85,
      summary: 'التحليل بإخراج العامل المشترك الأكبر، تحليل الفرق بين مربعين، تحليل المربع الكامل، تحليل المقدار الثلاثي بالتجربة والمقص، وتحليل مجموع وفرق مكعبين.',
      keyConcepts: [
        'الفرق بين مربعين: س² - ص² = (س - ص)(س + ص)',
        'مجموع مكعبين: س³ + ص³ = (س + ص)(س² - س ص + ص²)',
        'الفرق بين مكعبين: س³ - ص³ = (س - ص)(س² + س ص + ص²)',
      ],
    },
    {
      id: 'math9-lesson-5',
      title: 'الدرس 5: الكسور الجبرية والعمليات عليها',
      unitTitle: 'الوحدة الثالثة: الكسور الجبرية',
      pageNumber: 86,
      endPageNumber: 115,
      summary: 'مجال الكسر الجبري، اختصار الكسور الجبرية إلى أبسط صورة، توحيد المقامات، وجمع وطرح وضرب وقسمة الكسور الجبرية.',
      keyConcepts: [
        'أصفار المقام هي القيم التي تجعل المقام يساوي صفراً ويُستثنى منها مجال الكسر الجبري',
        'لاختصار كسر جبري نحلل البسط والمقام إلى عواملهما الأولية ثم نحذف العوامل المشتركة',
      ],
    },
    {
      id: 'math9-lesson-6',
      title: 'الدرس 6: المعادلات والمتراجحات الخطية والتمثيل البياني',
      unitTitle: 'الوحدة الرابعة: المعادلات والمتراجحات',
      pageNumber: 116,
      endPageNumber: 150,
      summary: 'حل معادلتين خطيتين في متغيرين بالحذف والتعويض وبيانياً، وحل المتراجحات الخطية وتمثيل مجموعة الحل على خط الأعداد.',
      keyConcepts: [
        'عند ضرب أو قسمة طرفي المتراجحة في عدد سالب تتغير جهة إشارة التباين',
      ],
    },
  ],
};

export const bookLessonsService = {
  /**
   * Identifies curriculum type from book metadata, subject, filename, AND actual extracted page text
   */
  detectCurriculumKey(book: Book, sampleText: string = ''): string | null {
    const title = (book.title || '').toLowerCase();
    const id = (book.id || '').toLowerCase();
    const subject = (book.subject || '').toLowerCase();
    const summary = (book.summary || '').toLowerCase();
    const textSample = (sampleText || '').toLowerCase();
    const combined = `${title} ${id} ${subject} ${summary} ${textSample}`;

    // 1. Exact Admin Book IDs first
    if (id === 'bio-grade11') return 'biology_grade11';
    if (id === 'math-grade10') return 'math_grade10';
    if (id === 'geo-grade9') return 'geography_grade9';

    // 2. Grade 9 Mathematics Part 1 (Yemen Curriculum - Sets, Relations, Functions, Algebraic Factoring)
    if (
      title.includes('mathematics_part1_9th') ||
      title.includes('math_9') ||
      id.includes('mathematics_part1_9th') ||
      (combined.includes('المجموعات والعلاقات') && combined.includes('التطبيق')) ||
      (combined.includes('المخططات السهمية') && combined.includes('مدى التطبيق')) ||
      (combined.includes('رياضيات') && (combined.includes('التاسع') || combined.includes('9th'))) ||
      (title.includes('math') && title.includes('9th'))
    ) {
      return 'math_grade9_part1';
    }

    // 3. Geography 9th (Yemen Geography)
    if (
      title.includes('graphic_9th') ||
      id.includes('geo9') ||
      id.includes('graphic_9th') ||
      (combined.includes('جغرافيا') && (combined.includes('اليمن') || combined.includes('التاسع'))) ||
      (combined.includes('الموقع الفلكي') && combined.includes('باب المندب'))
    ) {
      return 'geographic_9th';
    }

    // 4. Biology Grade 11 (Cell Membrane & Active Transport)
    if (
      combined.includes('الغشاء البلازمي') ||
      combined.includes('النفاذية الاختيارية') ||
      combined.includes('الفسيفساء السائل') ||
      title.includes('الخلية والتنفس') ||
      title.includes('الغشاء الخلوي')
    ) {
      return 'biology_grade11';
    }

    // 5. Mathematics Grade 10 (Quadratic Equations & Discriminant Delta)
    if (
      combined.includes('المميز الرياضي') ||
      combined.includes('القانون العام لحل المعادلة التربيعية') ||
      title.includes('الدوال التربيعية والقانون العام') ||
      title.includes('المعادلات والتحليل الرياضي')
    ) {
      return 'math_grade10';
    }

    // 6. General Geography (Nile Basin & Arab World Topography)
    if (
      combined.includes('حوض نهر النيل') ||
      combined.includes('هضبة إثيوبيا') ||
      title.includes('حوض وادي النيل') ||
      title.includes('التضاريس والموارد المائية')
    ) {
      return 'geography_grade9';
    }

    return null;
  },

  /**
   * Generates rich, contextual curriculum lessons for ANY custom / uploaded book
   */
  generateCurriculumForAnyBook(book: Book, totalPages: number): BookLesson[] {
    const total = Math.max(3, totalPages || book.totalPages || 24);
    const subjectName = book.subject || 'المنهاج الدراسي';
    const bookTitle = book.title || 'الكتاب المدرسي';

    const lessonCount = Math.max(4, Math.min(10, Math.ceil(total / 12)));
    const pagesPerLesson = Math.max(1, Math.floor(total / lessonCount));

    const topicTemplates = [
      {
        title: `الدرس 1: المدخل والمفاهيم الأساسية في ${subjectName}`,
        unit: 'الوحدة الأولى: الأسس والقواعد',
        summary: `مقدمة شاملة ومفاهيم البداية والتعريفات الأساسية لكتاب ${bookTitle}.`,
        concepts: [
          `استيعاب التعريفات الأولية والمصطلحات المعتمدة في ${subjectName}`,
          'التمييز بين النظريات والقواعد التطبيقية الأساسية',
        ],
      },
      {
        title: `الدرس 2: القوانين والتطبيقات المنهجية`,
        unit: 'الوحدة الأولى: الأسس والقواعد',
        summary: `شرح القوانين والمبادئ والقواعد المنهجية التطبيقية لموضوعات ${subjectName}.`,
        concepts: [
          'فهم القواعد العلمية وطرق تطبيقها في حل المسائل والأنشطة',
          'الربط بين المفاهيم النظرية والأمثلة التطبيقية',
        ],
      },
      {
        title: `الدرس 3: التحليل والدراسة التفصيلية`,
        unit: 'الوحدة الثانية: التحليل والتطبيق',
        summary: `دراسة تفصيلية للأمثلة والظواهر والمسائل المتقدمة في ${subjectName}.`,
        concepts: [
          'تحليل المعطيات واستنتاج النتائج بدقة وفق المنهج',
          'استخدام الرسوم والأشكال والبيانات التوضيحية',
        ],
      },
      {
        title: `الدرس 4: التمارين والأنشطة العملية`,
        unit: 'الوحدة الثانية: التحليل والتطبيق',
        summary: `حل التمارين النموذجية والتطبيقات العملية لتعميق الفهم والاستيعاب.`,
        concepts: [
          'مهارات حل الأسئلة المتنوعة والمسائل العملية خطوة بخطوة',
          'تقييم الإجابات ومقارنتها بالنماذج المعتمدة',
        ],
      },
      {
        title: `الدرس 5: الموضوعات المتقدمة والتكامل المعرفي`,
        unit: 'الوحدة الثالثة: التقييم والمراجعة',
        summary: `ربط أجزاء المنهج ببعضها وتناول الموضوعات التكميلية المتقدمة.`,
        concepts: [
          'التكامل بين محاور المنهج المختلفة والتطبيقات المعاصرة',
        ],
      },
      {
        title: `الدرس 6: التقويم الشامل والمراجعة النهائية`,
        unit: 'الوحدة الثالثة: التقييم والمراجعة',
        summary: `مراجعة عامة وتقويم ختامي لكافة موضوعات وأنشطة ${bookTitle}.`,
        concepts: [
          'الإتقان التام لكافة محاور ومفاهيم المنهج واستعداد الاختبارات',
        ],
      },
      {
        title: `الدرس 7: نماذج اختبارات وتطبيقات قياس الفهم`,
        unit: 'الوحدة الرابعة: الاختبارات القياسية',
        summary: `أسئلة قياس مستوى الاستيعاب واختبارات تجريبية وفق معايير جيمني.`,
        concepts: [
          'التدرب على الإجابة الدقيقة وإتقان المعايير التعليمية',
        ],
      },
      {
        title: `الدرس 8: الملحق المعرفي وحصاد المنهج`,
        unit: 'الوحدة الرابعة: الاختبارات القياسية',
        summary: `ملخص شامل لأهم المصطلحات والقوانين والقواعد الذهبية.`,
        concepts: [
          'تثبيت المعلومات الأساسية واسترجاع الحقائق المفتاحية',
        ],
      },
    ];

    const lessons: BookLesson[] = [];
    for (let i = 0; i < lessonCount; i++) {
      const template = topicTemplates[i % topicTemplates.length];
      const startPage = i * pagesPerLesson + 1;
      const endPage = i === lessonCount - 1 ? total : Math.min(total, (i + 1) * pagesPerLesson);

      lessons.push({
        id: `custom-book-${book.id}-lesson-${i + 1}`,
        title: `${template.title} (ص ${startPage}-${endPage})`,
        unitTitle: template.unit,
        pageNumber: startPage,
        endPageNumber: endPage,
        summary: template.summary,
        keyConcepts: template.concepts,
        curriculumContext: `حقائق ومعطيات الدرس ${i + 1} لكتاب ${bookTitle}: يغطي هذا الجزء الصفحات من ${startPage} إلى ${endPage} ويتضمن شروحات وتمارين ${subjectName}.`,
      });
    }

    return lessons;
  },

  /**
   * Dynamically scans pages across any uploaded PDF book to extract real headings,
   * topics, key concepts, and page content when no standard outline/TOC exists.
   */
  async scanBookPagesForDynamicLessons(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    book: Book,
    totalPages: number
  ): Promise<BookLesson[] | null> {
    try {
      const lessonCount = Math.max(4, Math.min(8, Math.ceil(totalPages / 14)));
      const pagesPerSegment = Math.max(1, Math.floor(totalPages / lessonCount));
      const dynamicLessons: BookLesson[] = [];

      for (let i = 0; i < lessonCount; i++) {
        const startPage = i * pagesPerSegment + 1;
        const endPage = i === lessonCount - 1 ? totalPages : Math.min(totalPages, (i + 1) * pagesPerSegment);
        const midPage = Math.min(endPage, startPage + Math.floor((endPage - startPage) / 3));

        const [startText, midText] = await Promise.all([
          pdfService.extractTextFromRegion(pdfDoc, startPage, null),
          midPage !== startPage ? pdfService.extractTextFromRegion(pdfDoc, midPage, null) : Promise.resolve(''),
        ]);

        const combinedSegmentText = [startText, midText].filter(Boolean).join('\n').trim();
        if (!combinedSegmentText) continue;

        const lines = combinedSegmentText
          .split('\n')
          .map((l) => cleanArabicPdfText(l))
          .filter((l) => l.length > 4 && !l.includes('http://') && !l.includes('www.'));

        // Look for an explicit heading line (الوحدة، الفصل، الدرس، الباب، الموضوع، Chapter, Unit, Lesson)
        let detectedTitle = lines.find(
          (l) =>
            l.length >= 6 &&
            l.length <= 95 &&
            /(الدرس|الوحدة|الفصل|الباب|الموضوع|تمارين|تطبيقات|المبحث|Chapter|Unit|Lesson|Section|Topic)/i.test(l)
        );

        if (!detectedTitle && lines.length > 0) {
          const candidate = lines.find((l) => l.length >= 8 && l.length <= 75);
          if (candidate) {
            detectedTitle = `الجزء ${i + 1}: ${candidate}`;
          }
        }

        const finalTitle = detectedTitle
          ? detectedTitle.startsWith('الدرس') || detectedTitle.startsWith('الوحدة') || detectedTitle.startsWith('الفصل')
            ? detectedTitle
            : `الدرس ${i + 1}: ${detectedTitle}`
          : `الدرس ${i + 1}: موضوعات الصفحات (${startPage}-${endPage})`;

        const conceptLines = lines
          .filter((l) => l.length >= 20 && l.length <= 160 && l !== detectedTitle)
          .slice(0, 4);

        dynamicLessons.push({
          id: `scanned-book-${book.id}-lesson-${i + 1}`,
          title: finalTitle,
          unitTitle: book.subject || 'وحدات الكتاب المنهجية',
          pageNumber: startPage,
          endPageNumber: endPage,
          summary:
            conceptLines.slice(0, 2).join(' · ') ||
            `محتويات وشروحات ${finalTitle} في الصفحات (${startPage}-${endPage}).`,
          keyConcepts:
            conceptLines.length > 0
              ? conceptLines
              : [`مفاهيم وتطبيقات ${finalTitle} (صفحات ${startPage}-${endPage})`],
          curriculumContext: `النص المنهجي المستخرج من صفحات الدرس (${startPage}-${endPage}):\n${combinedSegmentText.slice(0, 1800)}`,
        });
      }

      if (dynamicLessons.length >= 2) {
        return dynamicLessons;
      }
    } catch (e) {
      console.warn('Dynamic lesson scan notice:', e);
    }
    return null;
  },

  /**
   * Analyzes and extracts lessons from ANY book using curriculum database, PDF outline, TOC, or dynamic page scanner
   */
  async extractLessonsFromBook(
    book: Book,
    pdfDoc?: pdfjsLib.PDFDocumentProxy | null
  ): Promise<BookLesson[]> {
    // 1. Sample initial/mid pages text if pdfDoc is available so we accurately recognize any book
    let sampleText = '';
    if (pdfDoc) {
      try {
        const samplePages = Array.from(
          new Set([1, 2, 5, Math.min(15, pdfDoc.numPages), Math.min(40, pdfDoc.numPages)])
        ).filter((p) => p >= 1 && p <= pdfDoc.numPages);
        const texts = await Promise.all(
          samplePages.map((p) => pdfService.extractTextFromRegion(pdfDoc, p, null))
        );
        sampleText = texts.filter(Boolean).join('\n').slice(0, 4000);
      } catch {
        // Ignore sample text errors
      }
    }

    // 2. Check known curriculum database first (instant high-fidelity lessons & facts)
    const curriculumKey = this.detectCurriculumKey(book, sampleText);
    if (curriculumKey && KNOWN_CURRICULA[curriculumKey]) {
      return KNOWN_CURRICULA[curriculumKey];
    }

    // 3. Try PDF bookmarks/outline if pdfDoc is available
    if (pdfDoc) {
      try {
        const outline = await pdfDoc.getOutline();
        if (outline && outline.length >= 2) {
          const lessonsFromOutline: BookLesson[] = [];
          for (let i = 0; i < outline.length; i++) {
            const item = outline[i];
            let pageNum = 1;

            if (item.dest) {
              let dest: string | any[] | null = item.dest;
              if (typeof dest === 'string') {
                dest = await pdfDoc.getDestination(dest);
              }
              if (Array.isArray(dest) && dest[0]) {
                const pageIndex = await pdfDoc.getPageIndex(dest[0]);
                pageNum = pageIndex + 1;
              }
            }

            const cleanOutlineTitle = cleanArabicPdfText(item.title || '') || `الدرس ${i + 1}`;
            lessonsFromOutline.push({
              id: `outline-lesson-${i + 1}`,
              title: cleanOutlineTitle,
              pageNumber: pageNum,
              summary: `محتويات ${cleanOutlineTitle} من فهرس الكتاب.`,
              keyConcepts: [
                `مفاهيم وموضوعات ${cleanOutlineTitle}`,
                'حل الأنشطة والتدريبات المرفقة بالدرس',
              ],
            });
          }

          if (lessonsFromOutline.length >= 2) {
            lessonsFromOutline.sort((a, b) => a.pageNumber - b.pageNumber);
            for (let i = 0; i < lessonsFromOutline.length; i++) {
              const next = lessonsFromOutline[i + 1];
              lessonsFromOutline[i].endPageNumber = next
                ? Math.max(lessonsFromOutline[i].pageNumber, next.pageNumber - 1)
                : book.totalPages || pdfDoc.numPages || lessonsFromOutline[i].pageNumber;
            }
            return lessonsFromOutline;
          }
        }
      } catch (err) {
        console.warn('PDF outline extraction notice:', err);
      }

      // 4. Scan initial and ending pages for Table of Contents / Index text (فهرس المحتويات)
      try {
        const total = pdfDoc.numPages || book.totalPages || 20;
        const tocLessons = await this.scanForTableOfContents(pdfDoc, total);
        if (tocLessons && tocLessons.length >= 2) {
          return tocLessons;
        }
      } catch (err) {
        console.warn('TOC scan notice:', err);
      }

      // 5. Scan real book pages to extract actual headings, topics, and page content for ANY uploaded PDF book
      try {
        const total = pdfDoc.numPages || book.totalPages || 20;
        const dynamicScanned = await this.scanBookPagesForDynamicLessons(pdfDoc, book, total);
        if (dynamicScanned && dynamicScanned.length >= 2) {
          return dynamicScanned;
        }
      } catch (err) {
        console.warn('Dynamic page scan notice:', err);
      }
    }

    // 6. Generate structured, rich educational curriculum division for ANY book
    const numPages = (pdfDoc && pdfDoc.numPages) || book.totalPages || 24;
    return this.generateCurriculumForAnyBook(book, numPages);
  },

  /**
   * Scans candidate pages to detect a Table of Contents (فهرس الكتاب)
   */
  async scanForTableOfContents(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    totalPages: number
  ): Promise<BookLesson[] | null> {
    const candidatePages = [
      ...Array.from({ length: Math.min(10, totalPages) }, (_, i) => i + 1),
      ...Array.from({ length: Math.min(6, totalPages) }, (_, i) => Math.max(1, totalPages - i)),
    ];

    const uniqueCandidates = Array.from(new Set(candidatePages));

    for (const pageNum of uniqueCandidates) {
      try {
        const fullText = await pdfService.extractTextFromRegion(pdfDoc, pageNum, null);
        if (!fullText) continue;

        if (
          fullText.includes('فهرس') ||
          fullText.includes('المحتويات') ||
          fullText.includes('جدول المحتويات') ||
          fullText.includes('قائمة الدروس') ||
          fullText.includes('توزيع الموضوعات') ||
          fullText.includes('Contents') ||
          fullText.includes('Index')
        ) {
          const lines = fullText
            .split('\n')
            .map((s) => cleanArabicPdfText(s))
            .filter((str) => str.length > 3);

          const foundLessons: BookLesson[] = [];
          for (let j = 0; j < lines.length; j++) {
            const line = lines[j];
            if (
              line.includes('الدرس') ||
              line.includes('الوحدة') ||
              line.includes('الموضوع') ||
              line.includes('الفصل') ||
              line.includes('الباب') ||
              line.includes('تقويم') ||
              line.includes('Chapter') ||
              line.includes('Lesson') ||
              line.includes('Unit')
            ) {
              let targetPage = pageNum;
              for (let k = j; k < Math.min(lines.length, j + 3); k++) {
                // Match Western or Arabic-Indic page numbers
                const normalizedDigits = lines[k].replace(/[\u0660-\u0669]/g, (d) =>
                  String(d.charCodeAt(0) - 0x0660)
                );
                const numMatch = normalizedDigits.match(/\b([1-9][0-9]{0,2})\b/g);
                if (numMatch && numMatch.length > 0) {
                  const lastNum = parseInt(numMatch[numMatch.length - 1], 10);
                  if (lastNum > 0 && lastNum <= totalPages) {
                    targetPage = lastNum;
                    break;
                  }
                }
              }

              foundLessons.push({
                id: `toc-lesson-${foundLessons.length + 1}`,
                title: line.slice(0, 90),
                pageNumber: targetPage,
                summary: `محتويات ${line} في الصفحة ${targetPage}.`,
                keyConcepts: [
                  `مفاهيم وموضوعات ${line}`,
                  'حل الأنشطة والتدريبات المنهجية المقررة',
                ],
              });
            }
          }

          if (foundLessons.length >= 2) {
            foundLessons.sort((a, b) => a.pageNumber - b.pageNumber);
            for (let i = 0; i < foundLessons.length; i++) {
              const next = foundLessons[i + 1];
              foundLessons[i].endPageNumber = next
                ? Math.max(foundLessons[i].pageNumber, next.pageNumber - 1)
                : totalPages;
            }
            return foundLessons;
          }
        }
      } catch {
        continue;
      }
    }

    return null;
  },

  /**
   * Finds the active lesson for a given page number
   */
  findLessonForPage(lessons: BookLesson[], pageNumber: number): BookLesson | null {
    if (!lessons || lessons.length === 0) return null;

    // Look for exact range match
    for (const lesson of lessons) {
      if (
        pageNumber >= lesson.pageNumber &&
        (lesson.endPageNumber ? pageNumber <= lesson.endPageNumber : true)
      ) {
        return lesson;
      }
    }

    // Otherwise find closest preceding lesson
    let closest = lessons[0];
    for (const lesson of lessons) {
      if (lesson.pageNumber <= pageNumber) {
        closest = lesson;
      } else {
        break;
      }
    }

    return closest;
  },
};
