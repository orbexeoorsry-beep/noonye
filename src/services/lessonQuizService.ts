import { BookLesson } from './bookLessonsService';

export interface QuizQuestion {
  id: string;
  lessonId: string;
  lessonTitle: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint: string;
  topic?: string;
}

export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  scorePercent: number;
  gradeLabel: string;
  gradeBadge: 'excellent' | 'very_good' | 'good' | 'needs_review';
  /** @deprecated Compatibility field; contains static local-practice copy, not Gemini feedback. */
  geminiFeedback: string;
  answers: {
    questionId: string;
    question: string;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    explanation: string;
    lessonTitle: string;
  }[];
}

/**
 * Static local practice question bank
 */
const CURRICULUM_QUESTIONS_BANK: Record<string, QuizQuestion[]> = {
  // ==========================================
  // 1. جغرافيا الصف التاسع
  // ==========================================
  'geo9-lesson-1': [
    {
      id: 'geo9-q1',
      lessonId: 'geo9-lesson-1',
      lessonTitle: 'الدرس 1: الموقع الفلكي والجغرافي والحدود',
      question: 'أين تقع الجمهورية اليمنية من حيث الموقع الفلكي بالنسبة لخط الاستواء وخط غرينتش؟',
      options: [
        'بين خطي عرض 12° و 19° شمالاً، وخطي طول 41° و 54° شرقاً',
        'بين خطي عرض 20° و 30° شمالاً، وخطي طول 30° و 40° شرقاً',
        'بين خطي عرض 5° و 10° جنوباً، وخطي طول 50° و 60° شرقاً',
        'بين خطي عرض 15° و 25° شمالاً، وخطي طول 35° و 45° غرباً',
      ],
      correctIndex: 0,
      explanation: 'يمتد الموقع الفلكي لليمن بين خطي عرض 12° و 19° شمال خط الاستواء، وخطي طول 41° و 54° شرق خط غرينتش.',
      hint: 'تقع اليمن بالكامل في نصف الكرة الشمالي ونصف الكرة الشرقي جنوب مدار السرطان.',
      topic: 'الموقع الفلكي',
    },
    {
      id: 'geo9-q2',
      lessonId: 'geo9-lesson-1',
      lessonTitle: 'الدرس 1: الموقع الفلكي والجغرافي والحدود',
      question: 'ما هي الحدود السياسية التي تحد الجمهورية اليمنية من جهة الشمال وجهة الجنوب؟',
      options: [
        'شمالاً المملكة العربية السعودية، وجنوباً البحر العربي وخليج عدن',
        'شمالاً سلطنة عمان، وجنوباً البحر الأحمر',
        'شمالاً البحر الأحمر، وجنوباً المحيط الهندي',
        'شمالاً السعودية، وجنوباً سلطنة عمان',
      ],
      correctIndex: 0,
      explanation: 'يحد الجمهورية اليمنية من الشمال المملكة العربية السعودية، ومن الجنوب البحر العربي وخليج عدن.',
      hint: 'تذكر الدولة المجاورة الكبرى في الشمال والمسطح المائي المفتوح في الجنوب.',
      topic: 'الحدود السياسية',
    },
    {
      id: 'geo9-q3',
      lessonId: 'geo9-lesson-1',
      lessonTitle: 'الدرس 1: الموقع الفلكي والجغرافي والحدود',
      question: 'كم تبلغ المساحة التقريبية للجمهورية اليمنية دون احتساب الربع الخالي؟',
      options: [
        'حوالي 555,000 كم²',
        'حوالي 350,000 كم²',
        'حوالي 750,000 كم²',
        'حوالي 250,000 كم²',
      ],
      correctIndex: 0,
      explanation: 'تبلغ مساحة الجمهورية اليمنية الإجمالية حوالي 555,000 كم² دون احتساب صحراء الربع الخالي.',
      hint: 'الرقم مكوّن من ثلاثة أرقام متشابهة متبوعة بثلاثة أصفار.',
      topic: 'المساحة',
    },
    {
      id: 'geo9-q4',
      lessonId: 'geo9-lesson-1',
      lessonTitle: 'الدرس 1: الموقع الفلكي والجغرافي والحدود',
      question: 'ما هو المضيق المائي الاستراتيجي الذي تتحكم فيه الجمهورية اليمنية؟',
      options: [
        'مضيق باب المندب',
        'مضيق هرمز',
        'مضيق جبل طارق',
        'مضيق البوسفور',
      ],
      correctIndex: 0,
      explanation: 'تمتلك الجمهورية اليمنية مضيق باب المندب الاستراتيجي الذي يربط البحر الأحمر بالمحيط الهندي عبر خليج عدن.',
      hint: 'مضيق يقع في المدخل الجنوبي للبحر الأحمر وتشرف عليه جزيرة ميون اليمنية.',
      topic: 'المضائق البحرية',
    },
    {
      id: 'geo9-q5',
      lessonId: 'geo9-lesson-1',
      lessonTitle: 'الدرس 1: الموقع الفلكي والجغرافي والحدود',
      question: 'ما هو أكبر الأرخبيلات والجزر التابعة للجمهورية اليمنية وأين تقع؟',
      options: [
        'أرخبيل سقطرى، ويقع في البحر العربي والمحيط الهندي',
        'جزيرة كمران، وتقع في البحر العربي',
        'جزيرة ميون، وتقع في خليج عمان',
        'أرخبيل حنيش، ويقع في المحيط الأطلسي',
      ],
      correctIndex: 0,
      explanation: 'أكبر الجزر اليمنية هو أرخبيل سقطرى، ويقع في البحر العربي عند مدخل المحيط الهندي ويتميز بتنوع بيئي نباتي فريد.',
      hint: 'أرخبيل يمني شهير بشجرة دم الأخوين المصنفة ضمن التراث العالمي.',
      topic: 'الجزر اليمنية',
    },
  ],

  'geo9-lesson-1-eval': [
    {
      id: 'geo9-eval-q1',
      lessonId: 'geo9-lesson-1-eval',
      lessonTitle: 'تقويم الدرس الأول',
      question: 'تقع الجمهورية اليمنية في جنوب شبه الجزيرة العربية، وفي أي جزء من قارة آسيا؟',
      options: [
        'الجزء الجنوبي الغربي',
        'الجزء الشمالي الشرقي',
        'الجزء الجنوبي الشرقي',
        'الجزء الأوسط',
      ],
      correctIndex: 0,
      explanation: 'تقع اليمن في أقصى الجنوب الغربي لشبه الجزيرة العربية، وفي الركن الجنوبي الغربي من قارة آسيا.',
      hint: 'حدد زاوية التقاء قارة آسيا مع قارة إفريقيا.',
      topic: 'تقويم الدرس',
    },
    {
      id: 'geo9-eval-q2',
      lessonId: 'geo9-lesson-1-eval',
      lessonTitle: 'تقويم الدرس الأول',
      question: 'ما الذي يحد الجمهورية اليمنية من جهة الشرق وجهة الغرب؟',
      options: [
        'شرقاً سلطنة عمان، وغرباً البحر الأحمر ومضيق باب المندب',
        'شرقاً البحر الأحمر، وغرباً سلطنة عمان',
        'شرقاً المملكة العربية السعودية، وغرباً خليج عدن',
        'شرقاً المحيط الهندي، وغرباً البحر الميت',
      ],
      correctIndex: 0,
      explanation: 'يحد اليمن من الشرق سلطنة عمان ومن الغرب البحر الأحمر ومضيق باب المندب.',
      hint: 'تذكر الدولة الخليجية الشقيقة في الشرق والمسطح المائي الملاحي في الغرب.',
      topic: 'تقويم الدرس',
    },
  ],

  'geo9-lesson-2': [
    {
      id: 'geo9-l2-q1',
      lessonId: 'geo9-lesson-2',
      lessonTitle: 'الدرس 2: تضاريس الجمهورية اليمنية وأقسام السطح',
      question: 'ما هي أعلى قمة جبلية في الجمهورية اليمنية وشبه الجزيرة العربية وكم يبلغ ارتفاعها؟',
      options: [
        'قمة جبل النبي شعيب بارتفاع 3666 متراً',
        'قمة جبل صبر بارتفاع 2800 متراً',
        'قمة جبل عيبان بارتفاع 3000 متراً',
        'قمة جبل شمسين بارتفاع 2400 متراً',
      ],
      correctIndex: 0,
      explanation: 'جبل النبي شعيب في محافظة صنعاء هو أعلى قمة جبلية بارتفاع 3666 متراً فوق مستوى سطح البحر.',
      hint: 'أعلى قمة جبلية في غرب آسيا وشبه الجزيرة العربية.',
      topic: 'المرتفعات الجبلية',
    },
    {
      id: 'geo9-l2-q2',
      lessonId: 'geo9-lesson-2',
      lessonTitle: 'الدرس 2: تضاريس الجمهورية اليمنية وأقسام السطح',
      question: 'إلى كم إقليماً تضاريسياً رئيسياً يُقسم سطح الجمهورية اليمنية؟',
      options: [
        'خمسة أقاليم تضاريسية رئيسية',
        'ثلاثة أقاليم فقط',
        'سبعة أقاليم',
        'إقليمان اثنان',
      ],
      correctIndex: 0,
      explanation: 'الأقاليم الخمسة هي: السهول الساحلية، المرتفعات الجبلية، الهضاب الشرقية، الصحراء، والجزر اليمنية.',
      hint: 'يشمل السهول والمرتفعات والهضاب والصحراء والجزر.',
      topic: 'أقاليم التضاريس',
    },
    {
      id: 'geo9-l2-q3',
      lessonId: 'geo9-lesson-2',
      lessonTitle: 'الدرس 2: تضاريس الجمهورية اليمنية وأقسام السطح',
      question: 'ما هو أكبر السهول الساحلية الغربية المطلة على البحر الأحمر في اليمن؟',
      options: [
        'سهل تهامة',
        'سهل أبين',
        'سهل ميفعة',
        'سهل الجوف',
      ],
      correctIndex: 0,
      explanation: 'سهل تهامة هو أكبر وأوسع السهول الساحلية الغربية الممتدة بمحاذاة البحر الأحمر.',
      hint: 'سهل زراعي واسع يمتد من ميدي شمالاً حتى باب المندب جنوباً.',
      topic: 'السهول الساحلية',
    },
    {
      id: 'geo9-l2-q4',
      lessonId: 'geo9-lesson-2',
      lessonTitle: 'الدرس 2: تضاريس الجمهورية اليمنية وأقسام السطح',
      question: 'ما هي أهم الهضاب الشرقية في تضاريس الجمهورية اليمنية؟',
      options: [
        'هضبة حضرموت وهضبة المهرة',
        'هضبة الجولان وهضبة الدكن',
        'هضبة التبت وهضبة الأناضول',
        'هضبة الشطوط وهضبة البحيرات',
      ],
      correctIndex: 0,
      explanation: 'إقليم الهضاب الشرقية يضم هضبة حضرموت الشمالية والجنوبية وهضبة المهرة المنحدرة نحو صحراء الربع الخالي.',
      hint: 'هضاب تقع في شرق اليمن وتتدرج انحداراً نحو الشمال.',
      topic: 'الهضاب الشرقية',
    },
    {
      id: 'geo9-l2-q5',
      lessonId: 'geo9-lesson-2',
      lessonTitle: 'الدرس 2: تضاريس الجمهورية اليمنية وأقسام السطح',
      question: 'ما اسم الإقليم الصحراوي الرملي الواقع في شمال وشمال شرق اليمن؟',
      options: [
        'صحراء الربع الخالي ورملة السبعتين',
        'صحراء النقب',
        'صحراء الدهناء',
        'صحراء سيناء',
      ],
      correctIndex: 0,
      explanation: 'إقليم الصحراء يشمل أطراف صحراء الربع الخالي الكبرى وصحراء رملة السبعتين بين مأرب وشبوة وحضرموت.',
      hint: 'أكبر صحراء رملية متصلة في العالم يقع جزء منها شمال اليمن.',
      topic: 'إقليم الصحراء',
    },
  ],

  // ==========================================
  // 2. منهج الأحياء والعلوم العامة (الصف الثاني الثانوي)
  // ==========================================
  'bio11-lesson-1': [
    {
      id: 'bio11-l1-q1',
      lessonId: 'bio11-lesson-1',
      lessonTitle: 'الدرس 1: التركيب الخلوي والغشاء البلازمي',
      question: 'مما يتكون التركيب الأساسي للغشاء البلازمي وفق نموذج الفسيفساء السائل؟',
      options: [
        'طبقة ثنائية من الدهون المفسفرة تتخللها بروتينات ناقلة',
        'طبقة صلبة من السليلوز واللجنين فقط',
        'سلاسل من الكربوهيدرات والسكريات الأحادية دون دهون',
        'بروتينات ليفية غير منفذة للماء',
      ],
      correctIndex: 0,
      explanation: 'يتكون الغشاء من طبقة دهون مفسفرة مزدوجة (رؤوس محبة للماء وذيول كارهة للماء) مع بروتينات غشائية ناقلة.',
      hint: 'فوسفوليبيدات ثنائية الطبقة تسمح بمرونة الغشاء وحركته.',
      topic: 'بنية الغشاء الخلوي',
    },
    {
      id: 'bio11-l1-q2',
      lessonId: 'bio11-lesson-1',
      lessonTitle: 'الدرس 1: التركيب الخلوي والغشاء البلازمي',
      question: 'أين تتجه الذيول الكارهة للماء (Hydrophobic) في الغشاء البلازمي؟',
      options: [
        'تتجه نحو الداخل بعيداً عن البيئة المائية',
        'تتجه نحو السيتوبلازم الخارجي المائي',
        'تتجه نحو السائل خارج الخلوي مباشرة',
        'ترتبط مباشرة بالنواة المركزية',
      ],
      correctIndex: 0,
      explanation: 'الذيول غير القطبية تتجمع في مركز الغشاء هرباً من الماء لتشكل حاجزاً عازلاً للمواد الذائبة.',
      hint: 'الذيول دهنية غير قطبية تبتعد عن السوائل المائية.',
      topic: 'الدهون المفسفرة',
    },
  ],

  'bio11-lesson-2': [
    {
      id: 'bio11-l2-q1',
      lessonId: 'bio11-lesson-2',
      lessonTitle: 'الدرس 2: النقل الخلوي والنفاذية الاختيارية',
      question: 'ما هي الخاصية الحيوية التي تصف قدرة الغشاء البلازمي على اختيار المواد المارة من خلاله؟',
      options: [
        'خاصية النفاذية الاختيارية (Selective Permeability)',
        'خاصية النفاذية المطلقة لجميع الجزيئات',
        'خاصية عدم النفاذية الكاملة',
        'خاصية الترسيب الكيميائي',
      ],
      correctIndex: 0,
      explanation: 'النفاذية الاختيارية تسمح للخلية بالتحكم في دخول وخروج المواد وفق حاجة الخلية وحجم الجزيئات وشحنتها.',
      hint: 'خاصية تختار وتفرز المواد التي تعبر الغشاء.',
      topic: 'النفاذية الاختيارية',
    },
    {
      id: 'bio11-l2-q2',
      lessonId: 'bio11-lesson-2',
      lessonTitle: 'الدرس 2: النقل الخلوي والنفاذية الاختيارية',
      question: 'في مضخة الصوديوم والبوتاسيوم (Na+/K+)، ما هي النسبة الصحيحة لتبادل الأيونات باستهلاك جزيء ATP؟',
      options: [
        'طرد 3 أيونات صوديوم خارج الخلية مقابل إدخال أيوني بوتاسيوم',
        'طرد أيوني صوديوم مقابل إدخال 3 أيونات بوتاسيوم',
        'طرد 4 أيونات صوديوم دون إدخال أي بوتاسيوم',
        'إدخال 3 أيونات صوديوم وطرد أيوني بوتاسيوم',
      ],
      correctIndex: 0,
      explanation: 'المضخة تستهلك جزيء ATP واحد لضخ 3 Na+ نحو الخارج وإدخال 2 K+ نحو الداخل ضد منحدر التركيز.',
      hint: 'النسبة هي 3 صوديوم للخارج مقابل 2 بوتاسيوم للداخل.',
      topic: 'النقل النشط',
    },
    {
      id: 'bio11-l2-q3',
      lessonId: 'bio11-lesson-2',
      lessonTitle: 'الدرس 2: النقل الخلوي والنفاذية الاختيارية',
      question: 'ماذا يحدث لخلية الدم الحمراء عند وضعها في محلول مائي عالي التركيز (Hypertonic 2.5%)؟',
      options: [
        'تنكمش الخلية بسبب خروج الماء منها باتجاه المحلول الخارجي',
        'تنتفخ الخلية وتنفجر نتيجة دخول كميات هائلة من الماء',
        'يبقى حجم الخلية ثابتاً دون أي تغير',
        'تنقسم الخلية انقساماً ميتوزياً سريعاً',
      ],
      correctIndex: 0,
      explanation: 'وفق القاعدة الأسموزية، يتدفق الماء من التركيز الأقل للأملاح داخل الخلية إلى التركيز الأعلى خارجها مما يسبب انكماشها.',
      hint: 'المحلول عالي التركيز يسحب الماء من داخل الخلية.',
      topic: 'الخاصية الأسموزية',
    },
  ],

  'bio11-lesson-3': [
    {
      id: 'bio11-l3-q1',
      lessonId: 'bio11-lesson-3',
      lessonTitle: 'الدرس 3: البلعمة والإخراج الخلوي',
      question: 'ما العضية الخلوية التي تندمج مع الحويصلة المبتلعة لهضم محتوياتها داخل الخلية؟',
      options: [
        'الأجسام الهاضمة (الليسوسومات)',
        'الميتوكوندريا',
        'جهاز جولجي',
        'الريبوسومات الحرة',
      ],
      correctIndex: 0,
      explanation: 'الليسوسومات تحتوي على إنزيمات هيدروليكية هاضمة تقوم بتفكيك الجسيمات المبتلعة والأجسام الغريبة.',
      hint: 'عضيات الهضم والتحليل في الخلية الحية.',
      topic: 'البلعمة والإخراج',
    },
  ],

  // ==========================================
  // 3. منهج الرياضيات والجبر (الصف الأول الثانوي)
  // ==========================================
  'math10-lesson-1': [
    {
      id: 'math10-l1-q1',
      lessonId: 'math10-lesson-1',
      lessonTitle: 'الدرس 1: الصورة العامة للمعادلة التربيعية',
      question: 'ما هي الصورة القياسية العامة للمعادلة التربيعية في متغير واحد (x)؟',
      options: [
        'ax² + bx + c = 0 (حيث a ≠ 0)',
        'ax + b = 0 (حيث a ≠ 0)',
        'ax³ + bx² + cx + d = 0',
        'a/x + b = c',
      ],
      correctIndex: 0,
      explanation: 'الصورة القياسية هي ax² + bx + c = 0 مع شرط أساسي ألا يساوي المعامل a صفراً حتى تظل المعادلة من الدرجة الثانية.',
      hint: 'معادلة الدرجة الثانية تحتوي على س أس 2 كأعلى قوة وتساوي صفراً.',
      topic: 'الصورة القياسية',
    },
    {
      id: 'math10-l1-q2',
      lessonId: 'math10-lesson-1',
      lessonTitle: 'الدرس 1: الصورة العامة للمعادلة التربيعية',
      question: 'عند تحويل المعادلة 2x² - 6 = 5x إلى الصورة القياسية، ما هي قيم المعاملات (a, b, c)؟',
      options: [
        'a = 2 , b = -5 , c = -6',
        'a = 2 , b = 5 , c = 6',
        'a = -5 , b = 2 , c = -6',
        'a = 2 , b = 0 , c = -1',
      ],
      correctIndex: 0,
      explanation: 'بنقل 5x للطرف الأيمن: 2x² - 5x - 6 = 0، وبالتالي a=2 و b=-5 و c=-6.',
      hint: 'رتب الحدود تنازلياً حسب قوى x واجعل الطرف الأيسر صفراً.',
      topic: 'تحديد المعاملات',
    },
  ],

  'math10-lesson-2': [
    {
      id: 'math10-l2-q1',
      lessonId: 'math10-lesson-2',
      lessonTitle: 'الدرس 2: القانون العام والمميز الرياضي (Delta)',
      question: 'ما هو المقدار الرياضي الذي يمثل المميز (Δ) للمعادلة التربيعية ax² + bx + c = 0؟',
      options: [
        'Δ = b² - 4ac',
        'Δ = b² + 4ac',
        'Δ = 2a - 4bc',
        'Δ = -b ± 2ac',
      ],
      correctIndex: 0,
      explanation: 'المميز الرياضي هو المقدار الواقع تحت الجذر في القانون العام: b² - 4ac.',
      hint: 'المقدار الذي يحدد عدد ونوع جذور المعادلة التربيعية.',
      topic: 'المميز الرياضي',
    },
    {
      id: 'math10-l2-q2',
      lessonId: 'math10-lesson-2',
      lessonTitle: 'الدرس 2: القانون العام والمميز الرياضي (Delta)',
      question: 'إذا كانت قيمة المميز (b² - 4ac = 0)، فما هي طبيعة جذور المعادلة التربيعية؟',
      options: [
        'يوجد جذر حقيقي واحد مكرر (حل وحيد)',
        'يوجد جذران حقيقيان مختلفان',
        'لا توجد أي حلول حقيقية (جذور مركبة)',
        'يوجد عدد لا نهائي من الحلول',
      ],
      correctIndex: 0,
      explanation: 'عندما يساوي المميز صفراً، ينعدم الحد ±√Δ فيصبح الحل الوحيد المكرر هو x = -b / (2a).',
      hint: 'الجذر التربيعي للصفر يساوي صفراً مما يعطي حلاً حقيقياً واحداً.',
      topic: 'حالات المميز',
    },
  ],

  'math10-lesson-3': [
    {
      id: 'math10-l3-q1',
      lessonId: 'math10-lesson-3',
      lessonTitle: 'الدرس 3: التمثيل البياني للدالة التربيعية',
      question: 'ما هي معادلة خط التماثل الرأسي للقطع المكافئ الممثل للدالة f(x) = ax² + bx + c؟',
      options: [
        'x = -b / (2a)',
        'x = b / (2a)',
        'x = -c / a',
        'x = -b / a',
      ],
      correctIndex: 0,
      explanation: 'معادلة خط التماثل الرأسي الذي يقسم القطع المكافئ لنصفين متطابقين هي x = -b / (2a).',
      hint: 'الإحداثي السيني لنقطة رأس القطع المكافئ.',
      topic: 'محور التماثل',
    },
  ],

  // ==========================================
  // 4. منهج الدراسات الجغرافية العامة (الصف الثالث الإعدادي)
  // ==========================================
  'geo-gen-3': [
    {
      id: 'geo-gen-3-q1',
      lessonId: 'geo-gen-3',
      lessonTitle: 'الدرس 3: حوض نهر النيل والموارد المائية العذبة',
      question: 'ما هي الهضبة التي تساهم بالنسبة الأكبر (نحو 84%) في إيراد نهر النيل المائي السنوي؟',
      options: [
        'هضبة إثيوبيا (الحبشة) بأمطارها الصيفية الموسمية الغزيرة',
        'هضبة البحيرات الاستوائية الدائمة المطر',
        'هضبة الشطوط في بلاد المغرب العربي',
        'هضبة نجد في شبه الجزيرة العربية',
      ],
      correctIndex: 0,
      explanation: 'تساهم هضبة إثيوبيا بنحو 84% من مجمل مياه النيل عبر أنهار النيل الأزرق وعطبرة والسوباط في فصل الصيف.',
      hint: 'هضبة منابع النيل الموسمية الصيفية الشرقية.',
      topic: 'منابع نهر النيل',
    },
    {
      id: 'geo-gen-3-q2',
      lessonId: 'geo-gen-3',
      lessonTitle: 'الدرس 3: حوض نهر النيل والموارد المائية العذبة',
      question: 'ما هو آخر رافد يصب في مجرى نهر النيل قبل انطلاقه في الأراضي الصحراوية نحو المصب؟',
      options: [
        'نهر عطبرة',
        'نهر النيل الأزرق',
        'نهر السوباط',
        'بحر الجبل',
      ],
      correctIndex: 0,
      explanation: 'نهر عطبرة هو آخر روافد نهر النيل، وبعده يقطع النهر مسافة طويلة دون أي روافد أخرى حتى مصبه في البحر المتوسط.',
      hint: 'رافد ينبع من إثيوبيا ويلتقي بالنيل شمال الخرطوم.',
      topic: 'روافد النيل',
    },
  ],
};

const CURRICULUM_QUESTIONS_BANK_EN: Record<string, QuizQuestion[]> = {
  'geo9-lesson-1': [
    {
      id: 'geo9-q1',
      lessonId: 'geo9-lesson-1',
      lessonTitle: 'Lesson 1: Astronomical & Geographical Location and Borders',
      question: 'Where is the Republic of Yemen located astronomically relative to the Equator and the Prime Meridian?',
      options: [
        'Between latitudes 12° and 19° North, and longitudes 41° and 54° East',
        'Between latitudes 20° and 30° North, and longitudes 30° and 40° East',
        'Between latitudes 5° and 10° South, and longitudes 50° and 60° East',
        'Between latitudes 15° and 25° North, and longitudes 35° and 45° West',
      ],
      correctIndex: 0,
      explanation: 'According to the lesson material, Yemen extends astronomically between latitudes 12° and 19° North of the Equator, and longitudes 41° and 54° East of the Prime Meridian.',
      hint: 'Yemen lies entirely in the Northern and Eastern hemispheres south of the Tropic of Cancer.',
      topic: 'Astronomical Location',
    },
    {
      id: 'geo9-q2',
      lessonId: 'geo9-lesson-1',
      lessonTitle: 'Lesson 1: Astronomical & Geographical Location and Borders',
      question: 'What are the political borders of the Republic of Yemen to the North and South?',
      options: [
        'North: Kingdom of Saudi Arabia; South: Arabian Sea and Gulf of Aden',
        'North: Sultanate of Oman; South: Red Sea',
        'North: Red Sea; South: Indian Ocean',
        'North: Saudi Arabia; South: Sultanate of Oman',
      ],
      correctIndex: 0,
      explanation: 'Yemen is bordered to the north by the Kingdom of Saudi Arabia, and to the south by the Arabian Sea and the Gulf of Aden.',
      hint: 'Recall the major neighboring country to the north and the open water body to the south.',
      topic: 'Political Borders',
    },
    {
      id: 'geo9-q3',
      lessonId: 'geo9-lesson-1',
      lessonTitle: 'Lesson 1: Astronomical & Geographical Location and Borders',
      question: 'What is the approximate total area of the Republic of Yemen (excluding the Rub\' al Khali)?',
      options: [
        'About 555,000 km²',
        'About 350,000 km²',
        'About 750,000 km²',
        'About 250,000 km²',
      ],
      correctIndex: 0,
      explanation: 'The total area of the Republic of Yemen is approximately 555,000 km².',
      hint: 'The number consists of three identical digits followed by three zeros.',
      topic: 'Total Area',
    },
    {
      id: 'geo9-q4',
      lessonId: 'geo9-lesson-1',
      lessonTitle: 'Lesson 1: Astronomical & Geographical Location and Borders',
      question: 'Which strategic maritime strait is controlled by the Republic of Yemen?',
      options: [
        'Bab el-Mandeb Strait',
        'Strait of Hormuz',
        'Strait of Gibraltar',
        'Bosphorus Strait',
      ],
      correctIndex: 0,
      explanation: 'Yemen controls the strategic Bab el-Mandeb Strait linking the Red Sea to the Indian Ocean via the Gulf of Aden.',
      hint: 'A strait located at the southern entrance of the Red Sea overseen by the Yemeni island of Mayyun.',
      topic: 'Maritime Straits',
    },
  ],
};

export const lessonQuizService = {
  /**
   * Retrieves high quality questions for a selected set of lessons from ANY book
   */
  getQuestionsForLessons(lessons: BookLesson[], lang: 'ar' | 'en' = 'ar'): QuizQuestion[] {
    if (!lessons || lessons.length === 0) return [];
    const isEnglish = lang === 'en';

    const resultQuestions: QuizQuestion[] = [];

    // Collect questions from known curricula bank or generate contextual questions
    for (const lesson of lessons) {
      if (isEnglish && CURRICULUM_QUESTIONS_BANK_EN[lesson.id]?.length) {
        resultQuestions.push(...CURRICULUM_QUESTIONS_BANK_EN[lesson.id]);
      } else if (!isEnglish && CURRICULUM_QUESTIONS_BANK[lesson.id]?.length) {
        resultQuestions.push(...CURRICULUM_QUESTIONS_BANK[lesson.id]);
      } else {
        const dynamicQuestions = this.generateQuestionsFromLesson(lesson, lang);
        resultQuestions.push(...dynamicQuestions);
      }
    }

    // Add local prompts when the available question bank has fewer than four questions.
    if (resultQuestions.length < 4 && lessons[0]) {
      const extraQuestions = this.generateQuestionsFromLesson(lessons[0], lang);
      extraQuestions.forEach((eq) => {
        if (!resultQuestions.some((rq) => rq.id === eq.id || rq.question === eq.question)) {
          resultQuestions.push(eq);
        }
      });
    }

    return resultQuestions;
  },

  /**
   * Builds local practice prompts from available lesson metadata
   */
  generateQuestionsFromLesson(lesson: BookLesson, lang: 'ar' | 'en' = 'ar'): QuizQuestion[] {
    const isEnglish = lang === 'en';
    const list: QuizQuestion[] = [];
    const title = lesson.title;
    const pageNum = lesson.pageNumber;
    const unitTitle = lesson.unitTitle || (isEnglish ? 'Study Unit' : 'الوحدة الدراسية');
    const summary = lesson.summary || (isEnglish ? `Core topics and activities of ${title}` : `موضوعات وأنشطة ${title}`);

    // 1. Generate questions based on key concepts if available
    if (lesson.keyConcepts && lesson.keyConcepts.length > 0) {
      lesson.keyConcepts.forEach((concept, idx) => {
        const parts = concept.split(':');
        const header = parts[0]?.trim() || (isEnglish ? 'Core Concept' : 'المفهوم الرئيسي');
        const detail = parts[1]?.trim() || concept;

        list.push({
          id: `${lesson.id}-concept-${idx + 1}`,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          question: isEnglish
            ? `Based on your study of (${header}) in this lesson, which statement is accurate based on the available lesson information?`
            : `في ضوء دراستك لموضوع (${header}) في هذا الدرس: ما العبارة التي تطابق المعلومات المتاحة؟`,
          options: isEnglish
            ? [
                detail,
                `This rule contradicts the fundamental principles of ${unitTitle}`,
                `The concept of (${header}) is completely unrelated to this lesson`,
                `This topic is only studied outside the scope of this lesson material`,
              ]
            : [
                detail,
                `تتعارض هذه القاعدة مع المبادئ الأساسية لمقرر ${unitTitle}`,
                `لا يرتبط مفهوم (${header}) بموضوعات هذا الدرس إطلاقاً`,
                `هذا الموضوع لا يرتبط بمعلومات الدرس المتاحة`,
              ],
          correctIndex: 0,
          explanation: isEnglish
            ? `Based on the available lesson summary: ${detail}`
            : `استناداً إلى ملخص الدرس المتاح: ${detail}`,
          hint: isEnglish
            ? `Recall what was explained in the lesson regarding (${header}) on Page ${pageNum}.`
            : `تذكر ما ورد في شرح الدرس حول موضوع (${header}) وموقعه في الصفحة ${pageNum}.`,
          topic: header,
        });
      });
    }

    // 2. Add contextual pedagogical questions for this lesson
    if (isEnglish) {
      list.push(
        {
          id: `${lesson.id}-q-main-objective`,
          lessonId: lesson.id,
          lessonTitle: title,
          question: `What is the main focus and learning objective of (${title})?`,
          options: [
            summary,
            'Studying general historical topics with no practical applications or exercises',
            'Memorizing Latin terms only without understanding the scientific meaning',
            'Reading introductory paragraphs without solving the attached assessment questions',
          ],
          correctIndex: 0,
          explanation: `This lesson primarily focuses on: ${summary}`,
          hint: `Look at the lesson title on Page ${pageNum} and the concepts of ${unitTitle}.`,
          topic: 'Lesson Objectives',
        },
        {
          id: `${lesson.id}-q-methodology`,
          lessonId: lesson.id,
          lessonTitle: title,
          question: `When solving the activities and assessment of (${title}), what is the correct methodology to reach the accurate answer?`,
          options: [
            'Applying the lesson rules and facts from the lesson and following logical solution steps accurately',
            'Guessing the answer randomly without reviewing given data or laws',
            'Relying only on verbal answers and ignoring written steps and scientific justifications',
            'Skipping exercises and focusing only on reading headings',
          ],
          correctIndex: 0,
          explanation: 'These sample prompts are based on available lesson metadata and may not represent all lesson content.',
          hint: 'Focus on deep comprehension of the lesson and logical connection of the given data.',
          topic: 'Problem-Solving Skills',
        },
        {
          id: `${lesson.id}-q-application`,
          lessonId: lesson.id,
          lessonTitle: title,
          question: `What is the scientific and practical benefit of studying the concepts in (${title})?`,
          options: [
            'Reviewing the available lesson summary and related concepts',
            'Merely filling textbook pages without any real-world application',
            'Eliminating the need to study the remaining units of the course',
            'Repeating previous concepts without adding any new scientific value',
          ],
          correctIndex: 0,
          explanation: 'Studying the lesson themes consolidates academic understanding and develops critical thinking and deduction skills.',
          hint: 'Connect theoretical concepts with practical applications and lesson material questions.',
          topic: 'Practical Application',
        },
        {
          id: `${lesson.id}-q-review`,
          lessonId: lesson.id,
          lessonTitle: title,
          question: `How can a student review topics in (${title})?`,
          options: [
            'By solving self-assessment questions, interactive practice questions, and reviewing model answers',
            'By reading the lesson only once without solving any exercises or reviewing',
            'By relying on guesswork during exams without understanding the material',
            'By counting pages without examining the concepts and formulas',
          ],
          correctIndex: 0,
          explanation: 'Practice questions can help learners review available lesson topics.',
          hint: 'Solve exercises and compare your result with the practice feedback.',
          topic: 'Self-Assessment',
        }
      );
    } else {
      list.push(
        {
          id: `${lesson.id}-q-main-objective`,
          lessonId: lesson.id,
          lessonTitle: title,
          question: `ما هو المحور الأساسي والهدف التعليمي الذي يركز عليه (${title})؟`,
          options: [
            summary,
            'دراسة موضوعات تاريخية عامة لا تتضمن أي تطبيقات عملية أو أنشطة',
            'حفظ المصطلحات اللاتينية فقط دون فهم المعنى العلمي والتطبيقي',
            'قراءة نصوص تمهيدية دون حل أسئلة التقويم المرفقة',
          ],
          correctIndex: 0,
          explanation: `يركز هذا الدرس بشكل رئيسي على: ${summary}`,
          hint: `انظر إلى عنوان الدرس في الصفحة ${pageNum} ومفاهيم ${unitTitle}.`,
          topic: 'أهداف الدرس',
        },
        {
          id: `${lesson.id}-q-methodology`,
          lessonId: lesson.id,
          lessonTitle: title,
          question: `عند حل أنشطة وتقويم (${title})، ما الطريقة المناسبة للوصول إلى إجابة؟`,
          options: [
            'الاستدلال من القواعد والحقائق الواردة بالدرس وتطبيق خطوات الحل بدقة',
            'تخمين الإجابة عشوائياً دون مراجعة المعطيات أو القوانين',
            'الاكتفاء بالحل الشفهي وتجاهل كتابة الخطوات والتعليلات العلمية',
            'تخطي المسائل والأنشطة والتركيز على قراءة العناوين فقط',
          ],
          correctIndex: 0,
          explanation: 'هذه أسئلة تدريبية مبنية على بيانات الدرس المتاحة وقد لا تمثل كامل محتواه.',
          hint: 'التركيز على الفهم العميق للدرس والربط المنطقي للمعطيات.',
          topic: 'مهارات الحل والتقويم',
        },
        {
          id: `${lesson.id}-q-application`,
          lessonId: lesson.id,
          lessonTitle: title,
          question: `ما الفائدة العلمية والتطبيقية من دراسة المفاهيم المقررة في (${title})؟`,
          options: [
            'مراجعة ملخص الدرس المتاح والمفاهيم المرتبطة به',
            'مجرد ملء صفحات الكتاب دون أي تطبيق عملي في الحياة اليومية',
            'إلغاء الحاجة لدراسة باقي وحدات المقرر الدراسي',
            'تكرار نفس المفاهيم السابقة دون أي إضافة علمية جديدة',
          ],
          correctIndex: 0,
          explanation: 'دراسة محاور الدرس تسهم في ترسيخ الفهم الأكاديمي وتطوير مهارات التفكير والاستنتاج لدى الطالب.',
          hint: 'ربط المفاهيم النظرية بالتطبيقات العملية وحل أسئلة التدريب.',
          topic: 'التطبيق العملي',
        },
        {
          id: `${lesson.id}-q-review`,
          lessonId: lesson.id,
          lessonTitle: title,
          question: `كيف يمكن للطالب مراجعة موضوعات (${title})؟`,
          options: [
            'بحل أسئلة التقويم الذاتي وأسئلة التدريب التفاعلية ومراجعة الإجابات النموذجية',
            'بقراءة الدرس مرة واحدة فقط دون حل أي تدريبات أو مراجعة',
            'بالاعتماد على التخمين في الاختبارات دون فهم المادة العلمية',
            'بمقارنة عدد الصفحات دون التدقيق في المفاهيم والقوانين',
          ],
          correctIndex: 0,
          explanation: 'قد تساعد أسئلة التدريب على مراجعة موضوعات الدرس المتاحة.',
          hint: 'حل الأسئلة والتمارين ومقارنة النتيجة مع التغذية الراجعة.',
          topic: 'التقويم الذاتي',
        }
      );
    }

    return list;
  },

  /**
   * Calculates a local practice score and neutral result copy
   */
  evaluateQuiz(
    questions: QuizQuestion[],
    selectedAnswers: Record<string, number>,
    lang: 'ar' | 'en' = 'ar'
  ): QuizResult {
    const isEnglish = lang === 'en';
    let correctCount = 0;
    const details: QuizResult['answers'] = [];

    questions.forEach((q) => {
      const selected = selectedAnswers[q.id];
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) correctCount++;

      details.push({
        questionId: q.id,
        question: q.question,
        selectedOption:
          selected !== undefined ? q.options[selected] : isEnglish ? 'Unanswered' : 'لم تتم الإجابة',
        correctOption: q.options[q.correctIndex],
        isCorrect,
        explanation: q.explanation,
        lessonTitle: q.lessonTitle,
      });
    });

    const total = questions.length || 1;
    const scorePercent = Math.round((correctCount / total) * 100);

    let gradeLabel = isEnglish ? 'Practice result' : 'نتيجة التدريب';
    let gradeBadge: QuizResult['gradeBadge'] = 'excellent';
    let feedback = isEnglish
      ? 'This score reflects answers to these local practice questions only; it does not measure overall learning or exam readiness.'
      : 'تعكس هذه النتيجة إجابات أسئلة التدريب المحلية هذه فقط؛ ولا تقيس مستوى التعلم العام أو الاستعداد للاختبارات.';

    if (scorePercent >= 90) {
      gradeLabel = isEnglish ? 'Practice score: 90% or higher' : 'نتيجة التدريب: 90٪ فأكثر';
      gradeBadge = 'excellent';
      feedback = isEnglish
        ? 'You answered at least 90% of these local practice questions correctly. This score does not measure overall learning.'
        : 'أجبت إجابة صحيحة عن 90٪ على الأقل من أسئلة التدريب المحلية هذه. لا تقيس النتيجة مستوى التعلم العام.';
    } else if (scorePercent >= 75) {
      gradeLabel = isEnglish ? 'Practice score: 75–89%' : 'نتيجة التدريب: 75–89٪';
      gradeBadge = 'very_good';
      feedback = isEnglish
        ? 'You answered 75–89% of these local practice questions correctly.'
        : 'أجبت إجابة صحيحة عن 75–89٪ من أسئلة التدريب المحلية هذه.';
    } else if (scorePercent >= 50) {
      gradeLabel = isEnglish ? 'Practice score: 50–74%' : 'نتيجة التدريب: 50–74٪';
      gradeBadge = 'good';
      feedback = isEnglish
        ? 'You answered 50–74% of these local practice questions correctly.'
        : 'أجبت إجابة صحيحة عن 50–74٪ من أسئلة التدريب المحلية هذه.';
    } else {
      gradeLabel = isEnglish ? 'Practice score: below 50%' : 'نتيجة التدريب: أقل من 50٪';
      gradeBadge = 'needs_review';
      feedback = isEnglish
        ? 'You answered fewer than half of these local practice questions correctly. You can review the answers or try again.'
        : 'أجبت إجابة صحيحة عن أقل من نصف أسئلة التدريب المحلية هذه. يمكنك مراجعة الإجابات أو المحاولة مجدداً.';
    }

    return {
      totalQuestions: total,
      correctAnswers: correctCount,
      wrongAnswers: total - correctCount,
      scorePercent,
      gradeLabel,
      gradeBadge,
      geminiFeedback: feedback,
      answers: details,
    };
  },
};
