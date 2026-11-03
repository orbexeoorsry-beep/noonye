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
 * Rich pedagogical question bank aligned with official curriculum
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
      explanation: 'وفق المنهج المعتمد، يمتد موقع اليمن الفلكي بين خطي عرض 12° و 19° شمال خط الاستواء، وخطي طول 41° و 54° شرق خط غرينتش.',
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

export const lessonQuizService = {
  /**
   * Retrieves high quality questions for a selected set of lessons from ANY book
   */
  getQuestionsForLessons(lessons: BookLesson[]): QuizQuestion[] {
    if (!lessons || lessons.length === 0) return [];

    const resultQuestions: QuizQuestion[] = [];

    // Collect questions from known curricula bank or generate contextual questions
    for (const lesson of lessons) {
      if (CURRICULUM_QUESTIONS_BANK[lesson.id] && CURRICULUM_QUESTIONS_BANK[lesson.id].length > 0) {
        resultQuestions.push(...CURRICULUM_QUESTIONS_BANK[lesson.id]);
      } else {
        const dynamicQuestions = this.generateQuestionsFromLesson(lesson);
        resultQuestions.push(...dynamicQuestions);
      }
    }

    // Ensure we always have at least 4-6 rich questions for single lesson, or more for multiple
    if (resultQuestions.length < 4 && lessons[0]) {
      const extraQuestions = this.generateQuestionsFromLesson(lessons[0]);
      extraQuestions.forEach((eq) => {
        if (!resultQuestions.some((rq) => rq.id === eq.id || rq.question === eq.question)) {
          resultQuestions.push(eq);
        }
      });
    }

    return resultQuestions;
  },

  /**
   * Generates dynamic Gemini-style curriculum questions for ANY book lesson
   */
  generateQuestionsFromLesson(lesson: BookLesson): QuizQuestion[] {
    const list: QuizQuestion[] = [];
    const title = lesson.title;
    const pageNum = lesson.pageNumber;
    const unitTitle = lesson.unitTitle || 'الوحدة الدراسية';
    const summary = lesson.summary || `موضوعات وأنشطة ${title}`;

    // 1. Generate questions based on key concepts if available
    if (lesson.keyConcepts && lesson.keyConcepts.length > 0) {
      lesson.keyConcepts.forEach((concept, idx) => {
        const parts = concept.split(':');
        const header = parts[0]?.trim() || 'المفهوم الرئيسي';
        const detail = parts[1]?.trim() || concept;

        list.push({
          id: `${lesson.id}-concept-${idx + 1}`,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          question: `في ضوء دراستك لموضوع (${header}) في هذا الدرس: ما هي العبارة المنهجية الصحيحة؟`,
          options: [
            detail,
            `تتعارض هذه القاعدة مع المبادئ الأساسية لمقرر ${unitTitle}`,
            `لا يرتبط مفهوم (${header}) بموضوعات هذا الدرس إطلاقاً`,
            `تقتصر دراسة هذا المفهوم على مراحل متقدمة أخرى خارج المنهج`,
          ],
          correctIndex: 0,
          explanation: `وفقاً للمنهاج الدراسي المعتمد: ${detail}`,
          hint: `تذكر ما ورد في شرح الدرس حول موضوع (${header}) وموقعه في الصفحة ${pageNum}.`,
          topic: header,
        });
      });
    }

    // 2. Add contextual pedagogical questions for this lesson
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
        question: `عند حل أنشطة وتقويم (${title})، ما هي المنهجية المعتمدة للوصول للإجابة الصحيحة؟`,
        options: [
          'الاستدلال من القواعد والحقائق المنهجية الواردة بالدرس وتطبيق خطوات الحل بدقة',
          'تخمين الإجابة عشوائياً دون مراجعة المعطيات أو القوانين',
          'الاكتفاء بالحل الشفهي وتجاهل كتابة الخطوات والتعليلات العلمية',
          'تخطي المسائل والأنشطة والتركيز على قراءة العناوين فقط',
        ],
        correctIndex: 0,
        explanation: 'الفهم المنهجي وحل تمارين الدرس يعتمد على ربط المعطيات بالقواعد العلمية المستفادة وتطبيق خطوات الحل المنطقي.',
        hint: 'التركيز على الفهم العميق للدرس والربط المنطقي للمعطيات.',
        topic: 'مهارات الحل والتقويم',
      },
      {
        id: `${lesson.id}-q-application`,
        lessonId: lesson.id,
        lessonTitle: title,
        question: `ما الفائدة العلمية والتطبيقية من دراسة المفاهيم المقررة في (${title})؟`,
        options: [
          'بناء قاعدة معرفية راسخة تُمكن الطالب من التفوق في الاختبارات وربط المنهج بالواقع',
          'مجرد ملء صفحات الكتاب دون أي تطبيق عملي في الحياة اليومية',
          'إلغاء الحاجة لدراسة باقي وحدات المقرر الدراسي',
          'تكرار نفس المفاهيم السابقة دون أي إضافة علمية جديدة',
        ],
        correctIndex: 0,
        explanation: 'دراسة محاور الدرس تسهم في ترسيخ الفهم الأكاديمي وتطوير مهارات التفكير والاستنتاج لدى الطالب.',
        hint: 'ربط المفاهيم النظرية بالتطبيقات العملية وحل الأسئلة المنهجية.',
        topic: 'التطبيق العملي',
      },
      {
        id: `${lesson.id}-q-review`,
        lessonId: lesson.id,
        lessonTitle: title,
        question: `كيف يتحقق الطالب من استيعابه التام لجميع محاور (${title})؟`,
        options: [
          'بحل أسئلة التقويم الذاتي واختبارات جيمني التفاعلية ومراجعة الإجابات النموذجية',
          'بقراءة الدرس مرة واحدة فقط دون حل أي تدريبات أو مراجعة',
          'بالاعتماد على التخمين في الاختبارات دون فهم المادة العلمية',
          'بمقارنة عدد الصفحات دون التدقيق في المفاهيم والقوانين',
        ],
        correctIndex: 0,
        explanation: 'التقويم المستمر وحل الأسئلة التفاعلية يضمن تثبيت المعلومات واكتشاف أي نقاط تحتاج لمراجعة.',
        hint: 'حل الأسئلة والتمارين ومقارنة النتيجة مع التغذية الراجعة لجيمني.',
        topic: 'التقويم الذاتي',
      }
    );

    return list;
  },

  /**
   * Calculates comprehensive Gemini test score, evaluation grade, and feedback
   */
  evaluateQuiz(
    questions: QuizQuestion[],
    selectedAnswers: Record<string, number>
  ): QuizResult {
    let correctCount = 0;
    const details: QuizResult['answers'] = [];

    questions.forEach((q) => {
      const selected = selectedAnswers[q.id];
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) correctCount++;

      details.push({
        questionId: q.id,
        question: q.question,
        selectedOption: selected !== undefined ? q.options[selected] : 'لم تتم الإجابة',
        correctOption: q.options[q.correctIndex],
        isCorrect,
        explanation: q.explanation,
        lessonTitle: q.lessonTitle,
      });
    });

    const total = questions.length || 1;
    const scorePercent = Math.round((correctCount / total) * 100);

    let gradeLabel = 'ممتاز! إتقان تام للمنهج 🏆';
    let gradeBadge: QuizResult['gradeBadge'] = 'excellent';
    let geminiFeedback =
      'أداء رائع ومبهر! لقد استوعبت حقائق المنهج والمفاهيم الأساسية بشكل متقن جداً، وأنت جاهز تماماً للاختبارات النهائية.';

    if (scorePercent >= 90) {
      gradeLabel = 'ممتاز! استيعاب استثنائي للمنهج 🏆';
      gradeBadge = 'excellent';
      geminiFeedback =
        'مستوى رفيع ومتقن! إجاباتك دقيقة وتطابق المعايير المنهجية المعتمدة بنجاح تام.';
    } else if (scorePercent >= 75) {
      gradeLabel = 'جيد جداً! استيعاب قوي 🌟';
      gradeBadge = 'very_good';
      geminiFeedback =
        'أحسنت! إجاباتك تظهر فهماً واسعاً لأغلب محاور الدرس، مع وجود فرصة لتعزيز التفاصيل الصغيرة في الأسئلة التي لم توفق فيها.';
    } else if (scorePercent >= 50) {
      gradeLabel = 'جيد - يُنصح بمراجعة بعض النقاط 📖';
      gradeBadge = 'good';
      geminiFeedback =
        'محاولة طيبة، لديك أساس جيد للموضوع ولكن بعض المفاهيم الدقيقة تحتاج لمراجعة ورقة الدرس مرة أخرى لضمان الدرجة الكاملة.';
    } else {
      gradeLabel = 'بحاجة لمراجعة الدرس وإعادة المحاولة 💡';
      gradeBadge = 'needs_review';
      geminiFeedback =
        'لا تقلق! التعلم يحتاج إلى التكرار. راجع صفحات الدرس في الكتاب بتركيز ثم أعد الاختبار لترسخ المعلومات في ذهنك.';
    }

    return {
      totalQuestions: total,
      correctAnswers: correctCount,
      wrongAnswers: total - correctCount,
      scorePercent,
      gradeLabel,
      gradeBadge,
      geminiFeedback,
      answers: details,
    };
  },
};
