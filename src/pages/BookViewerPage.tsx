import React from 'react';
import { Book } from '../types';
import { PdfViewer } from '../features/book-viewer/PdfViewer';
import type { LocalDocumentStoreInterface } from '../services/local-document-store/types';
import type { AccountStorageService } from '../services/storage';

interface BookViewerPageProps {
  book: Book;
  onBackToLibrary: () => void;
  onDeleteBook?: (bookId: string) => void;
  onUpdatePageNumber: (bookId: string, pageNum: number) => void;
  onQuizCompleted: (isCorrect: boolean) => void;
  documents: LocalDocumentStoreInterface;
  storage: AccountStorageService;
}

export const BookViewerPage: React.FC<BookViewerPageProps> = ({
  book,
  onBackToLibrary,
  onDeleteBook,
  onUpdatePageNumber,
  onQuizCompleted,
  documents,
  storage,
}) => {
  return (
    <PdfViewer
      book={book}
      onBackToLibrary={onBackToLibrary}
      onDeleteBook={onDeleteBook}
      onUpdatePageNumber={onUpdatePageNumber}
      onQuizCompleted={onQuizCompleted}
      documents={documents}
      storage={storage}
    />
  );
};
