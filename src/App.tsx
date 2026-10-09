import React, { useState, useEffect, useCallback } from 'react';
import { ActivePage, Book, StudentProgress } from './types';
import { storageService } from './services/storage';
import { AdminBookStore } from './services/adminBookStore';
import { localDocumentStore } from './services/localDocumentStore';
import { INITIAL_ADMIN_BOOKS } from './mock-data/books';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { Footer } from './components/common/Footer';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { AddBook } from './pages/AddBook';
import { BookViewerPage } from './pages/BookViewerPage';
import { ProgressPage } from './pages/ProgressPage';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [books, setBooks] = useState<Book[]>(() => storageService.getBooks());
  const [progress, setProgress] = useState<StudentProgress>(() => storageService.getProgress());
  const [activeBookId, setActiveBookId] = useState<string>(() => {
    const initial = storageService.getBooks();
    return initial.length > 0 ? initial[0].id : INITIAL_ADMIN_BOOKS[0].id;
  });

  // Sync books with AdminBookStore and IndexedDB LocalDocumentStore on startup
  useEffect(() => {
    async function syncBooks() {
      // 1. Curated Admin Books
      const adminBooks = AdminBookStore.getBooks();

      // 2. Synchronize with IndexedDB documents for local user books
      try {
        const idbLocalBooks = await localDocumentStore.getLocalBooks();
        if (idbLocalBooks.length > 0) {
          storageService.saveLocalBooks(idbLocalBooks);
          const combined = [...adminBooks, ...idbLocalBooks];
          setBooks(combined);
          return;
        }
      } catch (e) {
        console.warn('Could not sync local books from IndexedDB', e);
      }

      const cached = storageService.getBooks();
      setBooks(cached);
    }

    syncBooks();
  }, []);

  const handleNavigate = useCallback((page: ActivePage) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenBook = useCallback((bookId: string) => {
    setActiveBookId(bookId);
    setActivePage('viewer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenBookToPage = useCallback((bookId: string, pageNumber: number) => {
    setActiveBookId(bookId);
    storageService.updateBookPage(bookId, pageNumber);
    setBooks(storageService.getBooks());
    setActivePage('viewer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAddBook = useCallback((newBook: Book) => {
    const updated = storageService.addBook(newBook);
    setBooks(updated);
  }, []);

  const handleDeleteBook = useCallback(async (bookId: string) => {
    // Admin books can NEVER be deleted
    if (AdminBookStore.isAdminBook(bookId)) {
      return;
    }

    try {
      await localDocumentStore.deleteDocument(bookId);
    } catch (e) {
      console.warn('Failed to delete book from IndexedDB', e);
    }
    const updated = storageService.deleteBook(bookId);
    setBooks(updated);
    setActiveBookId((prev) => {
      if (prev === bookId) {
        return updated[0]?.id || INITIAL_ADMIN_BOOKS[0].id;
      }
      return prev;
    });
    setActivePage('library');
  }, []);

  const handleClearAllLocalBooks = useCallback(async () => {
    try {
      await localDocumentStore.clearAllDocuments();
    } catch (e) {
      console.warn('Failed to clear documents from IndexedDB', e);
    }
    storageService.saveLocalBooks([]);
    const adminBooks = AdminBookStore.getBooks();
    setBooks(adminBooks);
    if (adminBooks.length > 0) {
      setActiveBookId(adminBooks[0].id);
    }
  }, []);

  const handleUpdatePageNumber = useCallback((bookId: string, pageNumber: number) => {
    storageService.updateBookPage(bookId, pageNumber);
    setBooks((prevBooks) => {
      const target = prevBooks.find((b) => b.id === bookId);
      if (target && target.currentPage === pageNumber) {
        return prevBooks;
      }
      return prevBooks.map((b) => (b.id === bookId ? { ...b, currentPage: pageNumber } : b));
    });

    // Update progress pages read if advancing
    setProgress((prev) => {
      const updatedProgress: StudentProgress = {
        ...prev,
        totalPagesRead: prev.totalPagesRead + 1,
      };
      storageService.saveProgress(updatedProgress);
      return updatedProgress;
    });
  }, []);

  const handleQuizCompleted = useCallback((isCorrect: boolean) => {
    setProgress((prev) => {
      const newTotal = prev.quizzesCompleted + 1;
      const currentCorrect = Math.round((prev.quizzesAccuracy / 100) * prev.quizzesCompleted);
      const newCorrect = currentCorrect + (isCorrect ? 1 : 0);
      const newAccuracy = Math.round((newCorrect / newTotal) * 100);

      const updatedProgress: StudentProgress = {
        ...prev,
        quizzesCompleted: newTotal,
        quizzesAccuracy: newAccuracy,
      };
      storageService.saveProgress(updatedProgress);
      return updatedProgress;
    });
  }, []);

  const activeBook = books.find((b) => b.id === activeBookId) || books[0] || INITIAL_ADMIN_BOOKS[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f8fc] text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      {/* Top Header */}
      <Header activePage={activePage} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {activePage === 'home' && (
          <Home
            onNavigate={handleNavigate}
            onOpenBook={handleOpenBook}
            featuredBook={activeBook}
          />
        )}

        {activePage === 'library' && (
          <Library
            books={books}
            onOpenBook={handleOpenBook}
            onNavigate={handleNavigate}
            onDeleteBook={handleDeleteBook}
            onClearAllLocalBooks={handleClearAllLocalBooks}
          />
        )}

        {activePage === 'add-book' && (
          <AddBook
            onAddBook={handleAddBook}
            onOpenBook={handleOpenBook}
            onNavigate={handleNavigate}
          />
        )}

        {activePage === 'viewer' && activeBook && (
          <BookViewerPage
            book={activeBook}
            onBackToLibrary={() => handleNavigate('library')}
            onDeleteBook={handleDeleteBook}
            onUpdatePageNumber={handleUpdatePageNumber}
            onQuizCompleted={handleQuizCompleted}
          />
        )}

        {activePage === 'progress' && (
          <ProgressPage
            progress={progress}
            onOpenBookToPage={handleOpenBookToPage}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation (Hidden on viewer page to maximize canvas space) */}
      {activePage !== 'viewer' && (
        <BottomNav activePage={activePage} onNavigate={handleNavigate} />
      )}

      {/* Quiet Footer (Hidden on viewer page for distraction-free reading) */}
      {activePage !== 'viewer' && <Footer />}
    </div>
  );
}
