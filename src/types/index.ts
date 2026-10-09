export * from './Book';
export * from './LocalDocument';
export * from './PageSelection';
export * from './AIRequest';
export * from './AIResponse';
export * from './MathAnalysis';
export * from './ImageAnalysis';

export interface StudentProgress {
  totalPagesRead: number;
  lessonsReviewed: number;
  quizzesCompleted: number;
  quizzesAccuracy: number;
  streakDays: number;
  conceptsNeedingReview: {
    id: string;
    title: string;
    subject: string;
    bookId: string;
    pageNumber: number;
    difficulty: 'easy' | 'medium' | 'hard';
    reason: string;
  }[];
  recentActivities: {
    id: string;
    bookTitle: string;
    action: string;
    timeAgo: string;
    pageNumber: number;
  }[];
}

export type NoonToolType =
  | 'simplify'
  | 'stepByStep'
  | 'hint'
  | 'quiz'
  | 'readAloud'
  | 'analyzeProblem'
  | 'explainFigure';

export type ActivePage = 'home' | 'library' | 'add-book' | 'viewer' | 'progress';
