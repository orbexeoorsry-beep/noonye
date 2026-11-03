import * as pdfjsLib from 'pdfjs-dist';
import { Book } from '../types';

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
};

export const bookLessonsService = {
  /**
   * Identifies curriculum type from book metadata, subject, or filename
   */
  detectCurriculumKey(book: Book): string | null {
    const title = (book.title || '').toLowerCase();
    const id = (book.id || '').toLowerCase();
    const subject = (book.subject || '').toLowerCase();
    const summary = (book.summary || '').toLowerCase();

    // 1. Geography 9th
    if (
      title.includes('graphic_9th') ||
      title.includes('جغرافيا') ||
      title.includes('جغرافية') ||
      title.includes('التاسع') ||
      id.includes('geo9') ||
      id.includes('graphic_9th') ||
      summary.includes('اليمن')
    ) {
      return 'geographic_9th';
    }

    // 2. Biology (الأحياء)
    if (
      title.includes('أحياء') ||
      title.includes('احياء') ||
      title.includes('خلية') ||
      title.includes('biology') ||
      id.includes('bio') ||
      subject.includes('أحياء') ||
      subject.includes('طبيعية')
    ) {
      return 'biology_grade11';
    }

    // 3. Mathematics (الرياضيات)
    if (
      title.includes('رياضيات') ||
      title.includes('جبر') ||
      title.includes('معادلات') ||
      title.includes('math') ||
      id.includes('math') ||
      subject.includes('رياضيات') ||
      subject.includes('جبر')
    ) {
      return 'math_grade10';
    }

    // 4. General Geography (الدراسات الجغرافية)
    if (
      title.includes('تضاريس') ||
      title.includes('نيل') ||
      title.includes('بيئة') ||
      id.includes('geo') ||
      subject.includes('جغرافيا')
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

    // Calculate realistic lesson count (between 4 and 10 lessons)
    const lessonCount = Math.max(4, Math.min(10, Math.ceil(total / 10)));
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
   * Analyzes and extracts lessons from ANY book using curriculum database, PDF outline, TOC, or dynamic generator
   */
  async extractLessonsFromBook(
    book: Book,
    pdfDoc?: pdfjsLib.PDFDocumentProxy | null
  ): Promise<BookLesson[]> {
    // 1. Check known curriculum database first (instant high-fidelity lessons & facts)
    const curriculumKey = this.detectCurriculumKey(book);
    if (curriculumKey && KNOWN_CURRICULA[curriculumKey]) {
      return KNOWN_CURRICULA[curriculumKey];
    }

    // 2. Try PDF bookmarks/outline if pdfDoc is available
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

            lessonsFromOutline.push({
              id: `outline-lesson-${i + 1}`,
              title: item.title || `الدرس ${i + 1}`,
              pageNumber: pageNum,
              summary: `محتويات ${item.title || `الدرس ${i + 1}`} من فهرس الكتاب.`,
              keyConcepts: [
                `مفاهيم وموضوعات ${item.title || `الدرس ${i + 1}`}`,
                'حل الأنشطة والتدريبات المرفقة بالدرس',
              ],
            });
          }

          if (lessonsFromOutline.length >= 2) {
            // Sort by page number and set end pages
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

      // 3. Scan initial and ending pages for Table of Contents / Index text (فهرس المحتويات)
      try {
        const total = pdfDoc.numPages || book.totalPages || 20;
        const tocLessons = await this.scanForTableOfContents(pdfDoc, total);
        if (tocLessons && tocLessons.length >= 2) {
          return tocLessons;
        }
      } catch (err) {
        console.warn('TOC scan notice:', err);
      }
    }

    // 4. Generate structured, rich educational curriculum division for ANY book
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
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const fullText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');

        if (
          fullText.includes('فهرس') ||
          fullText.includes('المحتويات') ||
          fullText.includes('جدول المحتويات') ||
          fullText.includes('قائمة الدروس') ||
          fullText.includes('Contents') ||
          fullText.includes('Index')
        ) {
          const lines = textContent.items
            .map((item) => ('str' in item ? item.str.trim() : ''))
            .filter((str) => str.length > 2);

          const foundLessons: BookLesson[] = [];
          for (let j = 0; j < lines.length; j++) {
            const line = lines[j];
            if (
              line.includes('الدرس') ||
              line.includes('الوحدة') ||
              line.includes('الموضوع') ||
              line.includes('الفصل') ||
              line.includes('تقويم') ||
              line.includes('Chapter') ||
              line.includes('Lesson')
            ) {
              let targetPage = pageNum;
              for (let k = j; k < Math.min(lines.length, j + 4); k++) {
                const numMatch = lines[k].match(/\b([1-9][0-9]{0,2})\b/);
                if (numMatch) {
                  const parsed = parseInt(numMatch[1], 10);
                  if (parsed > 0 && parsed <= totalPages) {
                    targetPage = parsed;
                    break;
                  }
                }
              }

              foundLessons.push({
                id: `toc-lesson-${foundLessons.length + 1}`,
                title: line,
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
