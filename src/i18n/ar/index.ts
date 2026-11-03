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
import { pdfStudy } from './pdfStudy';
import { TranslationDictionary } from '../types';

export const ar: TranslationDictionary = {
  pdfStudy,
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
    subtitle: 'مساعد فوري لتفسير عناصر الصفحة',
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
    heroKicker: 'قراءة PDF ومراجعة موثّقة بالصفحات',
    heroTitle: 'كتابك كما هو، وفهمك أفضل',
    heroSubtitle:
      'ارفع كتابك بصيغة PDF، وحدّد الدرس وصفحاته، ثم راجع مقتطفات نصه وأسئلة تدريب ذاتي مرتبطة بصفحات الملف. دون خدمات ذكاء اصطناعي أو درجات آلية.',
    ctaPrimary: 'ابدأ التعلم الآن',
    ctaSecondary: 'إضافة كتاب مدرسي',
    featureHighlightTitle: 'لماذا يحب الطلاب نون؟',
    feature1Title: 'صفحة الكتاب الأصلية',
    feature1Desc:
      'لا نعيد تشكيل النص ولا نشتت انتباهك؛ ترى الصفحة تمامًا كما طبعت في كتابك مع الرسومات والجداول.',
    feature2Title: 'مراجعة من النص الحقيقي',
    feature2Desc:
      'اختر نطاق الدرس للحصول على مقتطفات وأسئلة إكمال موثّقة. إذا تعذر استخراج النص، نوضح السبب دون اختلاق محتوى.',
    feature3Title: 'خصوصية وأمان على جهازك',
    feature3Desc:
      'كتبك وملاحظاتك تحفظ محليًا على هذا المتصفح دون الحاجة لحسابات معقدة أو بطاقات بنكية.',
    quickStats: {
      authenticLayout: 'تنسيق أصلي 100%',
      interactiveTools: '7 أدوات مساعدة',
      offlineFriendly: 'حفظ محلي فوري',
    },
  },
  addBook: {
    ...localDocuments,
    pageTitle: 'إضافة كتاب مدرسي',
    pageSubtitle: 'ارفع ملف الكتاب بصيغة PDF لتبدأ تجربة التعلم التفاعلية',
    localNotice: 'في هذه المرحلة يحفظ الكتاب محليًا على هذا الجهاز.',
  },
  progress: {
    pageTitle: 'لوحة تقدم التعلم',
    pageSubtitle: 'متابعة تفاعلية لمستوى قراءتك وإنجازك في الكتب والمسائل',
    readPages: 'صفحة مقروءة',
    accuracy: 'دقة الاختبارات',
    streak: 'أيام متتالية',
    reviewedLessons: 'دروس مراجعة',
    recentActivity: 'النشاط الأخير',
    recentActivityTitle: 'سجل النشاط الأخير',
    needsReview: 'مفاهيم يُنصح بمراجعتها',
    reviewBadge: 'مراجعة موصى بها',
    noActivity: 'لا توجد أنشطة مسجلة مؤخراً. ابدأ القراءة لتسجيل إنجازك!',
    noReviews: 'أداؤك ممتاز! لا توجد مفاهيم تحتاج لمراجعة حالياً.',
    difficultyEasy: 'سهل',
    difficultyMedium: 'متوسط',
    difficultyHard: 'صعب',
    startReview: 'بدء المراجعة الآن',
    statPages: 'صفحة مقروءة',
    statLessons: 'دروس مراجعة',
    statQuizzes: 'اختبارات مكتملة',
    statAccuracy: 'دقة الاختبارات',
    conceptsNeedingReviewTitle: 'مفاهيم يُنصح بمراجعتها',
    conceptsNeedingReviewDesc: 'مفاهيم حددها النظام للمراجعة والتدريب بناءً على قراءتك',
    reviewNow: 'مراجعة الآن',
  },
  appName: common.appName,
  appNameFull: common.appNameFull,
  appSlogan: common.appSlogan,
  appDescription: common.appDescription,
};

export default ar;
