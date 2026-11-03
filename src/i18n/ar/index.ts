import { common } from './common';
import { library } from './library';
import { bookViewer } from './bookViewer';
import { localDocuments } from './localDocuments';
import { selection } from './selection';
import { aiAssistant } from './aiAssistant';
import { guidedMath } from './guidedMath';
import { scienceAnalysis } from './scienceAnalysis';
import { errors } from './errors';
import { settings } from './settings';
import { TranslationDictionary } from '../types';

export const ar: TranslationDictionary = {
  common,
  library,
  bookViewer,
  localDocuments,
  selection,
  aiAssistant,
  guidedMath,
  scienceAnalysis,
  errors,
  settings,

  // Backward compatibility aliases
  science: scienceAnalysis,
  viewer: bookViewer,
  noonTools: {
    title: aiAssistant.panelTitle,
    subtitle: 'أدوات القراءة (بعض الميزات غير متاحة)',
    currentlyAnalyzing: 'العنصر المحدد حالياً:',
    selectPrompt: 'اختر عنصراً من الصفحة للبدء',
    toolsList: aiAssistant.toolsList,
    quiz: aiAssistant.quizFeedback,
    audioPlayer: aiAssistant.audioPlayer,
  },
  nav: {
    home: common.home,
    library: common.library,
    addBook: common.addBook,
    progress: common.progress,
    bookViewer: bookViewer.backToLibrary,
  },
  actions: {
    startLearning: 'ابدأ التعلم',
    addBook: common.addBook,
    openBook: library.openBook,
    continueReading: library.continueReading,
    backToLibrary: bookViewer.backToLibrary,
    search: library.searchPlaceholder,
    close: common.close,
    cancel: common.cancel,
    confirm: common.confirm,
    save: common.save,
    delete: common.delete,
    share: 'مشاركة',
    retry: common.retry,
    clearSearch: 'مسح البحث',
    expand: 'تكبير',
    collapse: 'تصغير',
    reset: 'إعادة ضبط',
    selectElement: 'تحديد عنصر في الصفحة',
    addNote: 'إضافة ملاحظة',
    all: 'الكل',
    filterBy: 'تصفية',
  },
  home: {
    heroKicker: 'اقرأ كتبك بصيغتها الأصلية',
    heroTitle: 'كتابك وملاحظاتك في مكان واحد',
    heroSubtitle:
      'اقرأ صفحات كتابك المدرسي بصيغتها الأصلية. تبقى الكتب والملاحظات على هذا الجهاز، وأدوات الشرح والتوجيه غير متاحة حاليًا. تتوفر أسئلة تدريب محلية تجريبية لا تقيّم مستوى التعلم العام.',
    ctaPrimary: 'ابدأ القراءة الآن',
    ctaSecondary: 'إضافة كتاب مدرسي',
    featureHighlightTitle: 'أدوات القراءة المتاحة',
    feature1Title: 'صفحة الكتاب الأصلية',
    feature1Desc:
      'لا نعيد تشكيل النص ولا نشتت انتباهك؛ ترى الصفحة تمامًا كما طبعت في كتابك مع الرسومات والجداول.',
    feature2Title: 'أدوات القراءة',
    feature2Desc:
      'أدوات تحديد النص والصفحة غير متاحة حاليًا؛ يمكنك قراءة صفحات الكتاب المحفوظ محليًا.',
    feature3Title: 'خصوصية وأمان على جهازك',
    feature3Desc:
      'كتبك وملاحظاتك تحفظ محليًا على هذا المتصفح دون الحاجة لحسابات معقدة أو بطاقات بنكية.',
    quickStats: {
      authenticLayout: 'صفحات الكتاب الأصلية',
      interactiveTools: 'أدوات القراءة غير متاحة',
      offlineFriendly: 'حفظ محلي فوري',
    },
  },
  addBook: {
    ...localDocuments,
    pageTitle: 'إضافة كتاب مدرسي',
    pageSubtitle: 'ارفع ملف PDF لحفظه محليًا وقراءته',
    localNotice: 'في هذه المرحلة يحفظ الكتاب محليًا على هذا الجهاز.',
  },
  progress: {
    pageTitle: 'نشاط القراءة',
    pageSubtitle: 'سجل نشاط القراءة على هذا الجهاز',
    readPages: 'صفحة مقروءة',
    accuracy: 'دقة إجابات التدريب المحلي',
    streak: 'أيام متتالية',
    reviewedLessons: 'دروس مراجعة',
    recentActivity: 'النشاط الأخير',
    recentActivityTitle: 'سجل النشاط الأخير',
    needsReview: 'اقتراحات المراجعة غير متاحة',
    reviewBadge: 'غير متاح',
    noActivity: 'لا توجد أنشطة مسجلة مؤخراً. ابدأ القراءة لتسجيل إنجازك!',
    noReviews: 'اقتراحات المراجعة غير متاحة حاليًا.',
    difficultyEasy: 'سهل',
    difficultyMedium: 'متوسط',
    difficultyHard: 'صعب',
    startReview: 'بدء المراجعة الآن',
    statPages: 'صفحة مقروءة',
    statLessons: 'دروس مراجعة',
    statQuizzes: 'تدريبات محلية مكتملة',
    statAccuracy: 'دقة إجابات التدريب المحلي',
    conceptsNeedingReviewTitle: 'مفاهيم يُنصح بمراجعتها',
    conceptsNeedingReviewDesc: 'لا يقيّم التطبيق القراءة ولا يحدد مفاهيم للمراجعة.',
    reviewNow: 'مراجعة الآن',
  },
  appName: common.appName,
  appNameFull: common.appNameFull,
  appSlogan: common.appSlogan,
  appDescription: common.appDescription,
};

export default ar;
