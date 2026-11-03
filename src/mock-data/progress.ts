import { StudentProgress } from '../types';

export const INITIAL_PROGRESS: StudentProgress = {
  totalPagesRead: 85,
  lessonsReviewed: 14,
  quizzesCompleted: 38,
  quizzesAccuracy: 89,
  streakDays: 5,
  conceptsNeedingReview: [
    {
      id: 'cr-1',
      title: 'مضخة الصوديوم والبوتاسيوم واستهلاك ATP',
      subject: 'الأحياء والعلوم الطبيعية',
      bookId: 'bio-grade11',
      pageNumber: 42,
      difficulty: 'hard',
      reason: 'أخطأت في تحديد عدد أيونات الصوديوم التي تخرج مقابل البوتاسيوم.',
    },
    {
      id: 'cr-2',
      title: 'حساب المميز في المعادلة التربيعية وحالاته',
      subject: 'الرياضيات والجبر',
      bookId: 'math-grade10',
      pageNumber: 28,
      difficulty: 'medium',
      reason: 'تحتاج إلى تدريب إضافي على إشارة الحد الثابت c وتأثيرها على المميز.',
    },
    {
      id: 'cr-3',
      title: 'النسبة المئوية لإيراد النيل من هضبة إثيوبيا',
      subject: 'الجغرافيا والبيئة',
      bookId: 'geo-grade9',
      pageNumber: 15,
      difficulty: 'easy',
      reason: 'التمييز بين المنابع الاستوائية الدائمة والمنابع الحبشية الموسمية.',
    },
  ],
  recentActivities: [
    {
      id: 'act-1',
      bookTitle: 'الأحياء والعلوم العامة: الخلية والتنفس الخلوي',
      action: 'إكمال اختبار تجريبي: النفاذية الاختيارية للغشاء البلازمي',
      timeAgo: 'منذ ساعتين',
      pageNumber: 42,
    },
    {
      id: 'act-2',
      bookTitle: 'الأحياء والعلوم العامة: الخلية والتنفس الخلوي',
      action: 'طلب شرح خطوة بخطوة لشكل نموذج الفسيفساء السائل',
      timeAgo: 'منذ ساعتين و 20 دقيقة',
      pageNumber: 42,
    },
    {
      id: 'act-3',
      bookTitle: 'الرياضيات: المعادلات والتحليل الرياضي',
      action: 'تدوين ملاحظة دراسية حول القانون العام',
      timeAgo: 'أمس',
      pageNumber: 28,
    },
    {
      id: 'act-4',
      bookTitle: 'الدراسات الجغرافية: التضاريس والموارد المائية',
      action: 'قراءة صوتية لفقرة المنابع الاستوائية',
      timeAgo: 'منذ يومين',
      pageNumber: 15,
    },
  ],
};
