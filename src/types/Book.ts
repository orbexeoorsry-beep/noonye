export type BookStatus = 'demo' | 'local';

export type BookSource = 'admin' | 'local';

export type ElementType = 'paragraph' | 'figure' | 'equation' | 'exercise' | 'table';

export interface InteractiveElement {
  id: string;
  type: ElementType;
  title: string;
  content: string;
  badge?: string;
  mockAiAnalysis: {
    simplified: string;
    stepByStep: string[];
    hint: string;
    quizQuestion: {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };
    audioTranscript?: string;
    figureExplanation?: string;
    equationAnalysis?: {
      variables: { symbol: string; meaning: string }[];
      derivation: string;
      application: string;
    };
  };
}

export interface BookPage {
  pageNumber: number;
  chapterTitle: string;
  lessonTitle: string;
  elements: InteractiveElement[];
  pageNotesCount?: number;
}

export interface BaseBook {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  totalPages: number;
  currentPage: number;
  progressPercent: number;
  lastOpened: string;
  summary: string;
  accentColor: string;
  pages: BookPage[];
  fileSize?: number;
  lastOpenedAt?: string;
  mimeType?: string;
}

/**
 * AdminBook: Curated textbook managed by Noon platform administrators.
 * Read-only from mock-data, cannot be deleted by end-users.
 */
export interface AdminBook extends BaseBook {
  source: 'admin';
  status: 'demo';
  pdfUrl?: string;
}

/**
 * LocalBook: User textbook uploaded and stored strictly on IndexedDB / local device.
 * Can be opened, deleted, and is marked as "محفوظ على هذا الجهاز".
 */
export interface LocalBook extends BaseBook {
  source: 'local';
  status: 'local';
  sourceType: 'local-user-book';
  fileSize: number;
  mimeType: string;
}

export type Book = AdminBook | LocalBook;

export interface UserNote {
  id: string;
  bookId: string;
  pageNumber: number;
  text: string;
  createdAt: string;
  color?: string;
}
