import React from 'react';
import { Book } from '../types';
import { PdfViewer } from '../features/book-viewer/PdfViewer';

interface BookViewerPageProps {
  book: Book;
  onBackToLibrary: () => void;
  onDeleteBook?: (bookId: string) => void;
  onUpdatePageNumber: (bookId: string, pageNum: number) => void;
  onQuizCompleted: (isCorrect: boolean) => void;
}

export const BookViewerPage: React.FC<BookViewerPageProps> = ({
  book,
  onBackToLibrary,
  onDeleteBook,
  onUpdatePageNumber,
  onQuizCompleted,
}) => {
  return (
    <PdfViewer
      book={book}
      onBackToLibrary={onBackToLibrary}
      onDeleteBook={onDeleteBook}
      onUpdatePageNumber={onUpdatePageNumber}
      onQuizCompleted={onQuizCompleted}
    />
  );
};
