import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AccountsPage } from './features/accounts/AccountsPage';
import { ActivePage, Book, StudentProgress } from './types';
import { fetchAuthenticatedUserId } from './features/accounts/sessionIdentity';
import { subscribeToSchoolSessionChanges } from './features/accounts/sessionSignals';
import {
  SchoolLibrarySessionController,
  type AccountLibraryScope,
} from './services/accountLibraryScope';
import { INITIAL_ADMIN_BOOKS } from './mock-data/books';
import { isFeatureEnabled } from './config/feature-flags';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { Footer } from './components/common/Footer';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { AddBook } from './pages/AddBook';
import { BookViewerPage } from './pages/BookViewerPage';
import { ProgressPage } from './pages/ProgressPage';

function LibraryApp({ scope }: { scope: AccountLibraryScope }) {
  const localBooksAllowed = isFeatureEnabled('localBooksEnabled');
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [books, setBooks] = useState<Book[]>(() => scope.adminBooks.getBooks());
  const [progress, setProgress] = useState<StudentProgress>(() => scope.storage.getProgress());
  const [activeBookId, setActiveBookId] = useState<string>(
    () => scope.adminBooks.getBooks()[0]?.id || INITIAL_ADMIN_BOOKS[0].id
  );

  // Guard direct URL links (pathname, hash, or search params) for disabled features
  useEffect(() => {
    const enforceDirectUrlFeatureFlags = () => {
      if (typeof window === 'undefined') return;
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const pageParam = (params.get('page') || params.get('view') || '').toLowerCase();
      const langParam = (params.get('lang') || '').toLowerCase();

      if (langParam === 'en' && !isFeatureEnabled('englishLanguageEnabled')) {
        params.delete('lang');
      }

      const targetsAddBook =
        pathname.includes('add-book') || hash === 'add-book' || pageParam === 'add-book';

      if (targetsAddBook && !isFeatureEnabled('localBooksEnabled')) {
        setActivePage('library');
        window.history.replaceState(null, '', '/');
        return;
      }

      if (targetsAddBook && isFeatureEnabled('localBooksEnabled')) {
        setActivePage('add-book');
      } else if (pathname.includes('library') || hash === 'library' || pageParam === 'library') {
        setActivePage('library');
      } else if (pathname.includes('progress') || hash === 'progress' || pageParam === 'progress') {
        setActivePage('progress');
      }
    };

    enforceDirectUrlFeatureFlags();
    window.addEventListener('hashchange', enforceDirectUrlFeatureFlags);
    window.addEventListener('popstate', enforceDirectUrlFeatureFlags);
    return () => {
      window.removeEventListener('hashchange', enforceDirectUrlFeatureFlags);
      window.removeEventListener('popstate', enforceDirectUrlFeatureFlags);
    };
  }, []);

  // Sync only the authenticated account's document database with the admin catalog.
  useEffect(() => {
    let cancelled = false;
    async function syncBooks() {
      const adminBooks = scope.adminBooks.getBooks();
      setBooks(adminBooks);
      if (!isFeatureEnabled('localBooksEnabled')) {
        return;
      }

      try {
        const accountBooks = await scope.documents.getLocalBooks();
        if (!cancelled) setBooks([...adminBooks, ...accountBooks]);
      } catch (e) {
        if (!cancelled) console.warn('Could not sync account documents', e);
      }
    }

    void syncBooks();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const handleNavigate = useCallback((page: ActivePage) => {
    if (page === 'add-book' && !isFeatureEnabled('localBooksEnabled')) {
      setActivePage('library');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenBook = useCallback(
    (bookId: string) => {
      const target = books.find((b) => b.id === bookId);
      if (target && target.source === 'local' && !isFeatureEnabled('localBooksEnabled')) {
        return;
      }
      setActiveBookId(bookId);
      setActivePage('viewer');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [books]
  );

  const handleOpenBookToPage = useCallback((bookId: string, pageNumber: number) => {
    const target = books.find((b) => b.id === bookId);
    if (target && target.source === 'local' && !isFeatureEnabled('localBooksEnabled')) {
      return;
    }
    setActiveBookId(bookId);
    if (scope.adminBooks.isAdminBook(bookId)) {
      scope.adminBooks.updateBookPage(bookId, pageNumber);
    } else {
      void scope.documents.saveLastPage(bookId, pageNumber);
    }
    setBooks((previous) => previous.map((book) =>
      book.id === bookId
        ? {
            ...book,
            currentPage: pageNumber,
            progressPercent: Math.min(100, Math.round((pageNumber / Math.max(1, book.totalPages)) * 100)),
            lastOpened: 'الآن',
          }
        : book
    ));
    setActivePage('viewer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [books, scope]);

  const handleAddBook = useCallback((newBook: Book) => {
    if (!isFeatureEnabled('localBooksEnabled')) return;
    setBooks((previous) => [newBook, ...previous.filter((book) => book.id !== newBook.id)]);
  }, []);

  const handleDeleteBook = useCallback(async (bookId: string) => {
    if (!isFeatureEnabled('localBooksEnabled')) return;
    // Admin books can NEVER be deleted
    if (scope.adminBooks.isAdminBook(bookId)) {
      return;
    }

    try {
      await scope.documents.deleteDocument(bookId);
    } catch (e) {
      console.warn('Failed to delete book from IndexedDB', e);
    }
    const updated = books.filter((book) => book.id !== bookId);
    setBooks(updated);
    setActiveBookId((prev) => {
      if (prev === bookId) {
        return updated[0]?.id || INITIAL_ADMIN_BOOKS[0].id;
      }
      return prev;
    });
    setActivePage('library');
  }, [books, scope]);

  const handleClearAllLocalBooks = useCallback(async () => {
    if (!isFeatureEnabled('localBooksEnabled')) return;
    try {
      await scope.documents.clearAllDocuments();
    } catch (e) {
      console.warn('Failed to clear documents from IndexedDB', e);
    }
    const adminBooks = scope.adminBooks.getBooks();
    setBooks(adminBooks);
    if (adminBooks.length > 0) {
      setActiveBookId(adminBooks[0].id);
    }
  }, [scope]);

  const handleUpdatePageNumber = useCallback((bookId: string, pageNumber: number) => {
    if (scope.adminBooks.isAdminBook(bookId)) {
      scope.adminBooks.updateBookPage(bookId, pageNumber);
    }
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
      scope.storage.saveProgress(updatedProgress);
      return updatedProgress;
    });
  }, [scope]);

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
      scope.storage.saveProgress(updatedProgress);
      return updatedProgress;
    });
  }, [scope]);

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

        {(activePage === 'library' ||
          (activePage === 'add-book' && !isFeatureEnabled('localBooksEnabled'))) && (
          <Library
            books={books}
            onOpenBook={handleOpenBook}
            onNavigate={handleNavigate}
            onDeleteBook={isFeatureEnabled('localBooksEnabled') ? handleDeleteBook : undefined}
            onClearAllLocalBooks={
              isFeatureEnabled('localBooksEnabled') ? handleClearAllLocalBooks : undefined
            }
          />
        )}

        {activePage === 'add-book' && isFeatureEnabled('localBooksEnabled') && (
          <AddBook
            onAddBook={handleAddBook}
            onOpenBook={handleOpenBook}
            onNavigate={handleNavigate}
            documents={scope.documents}
          />
        )}

        {activePage === 'viewer' && activeBook && (
          <BookViewerPage
            book={activeBook}
            onBackToLibrary={() => handleNavigate('library')}
            onDeleteBook={isFeatureEnabled('localBooksEnabled') ? handleDeleteBook : undefined}
            onUpdatePageNumber={handleUpdatePageNumber}
            onQuizCompleted={handleQuizCompleted}
            documents={scope.documents}
            storage={scope.storage}
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

type LibraryGateState =
  | { status: 'loading' }
  | { status: 'locked'; message: string }
  | { status: 'ready'; userId: string; scope: AccountLibraryScope };

function AuthenticatedLibraryGate() {
  const controllerRef = useRef<SchoolLibrarySessionController>(
    new SchoolLibrarySessionController()
  );
  const controller = controllerRef.current;
  const requestEpoch = useRef(0);
  const [gate, setGate] = useState<LibraryGateState>({ status: 'loading' });

  const lock = useCallback((message: string) => {
    requestEpoch.current += 1;
    controller.invalidate();
    setGate({ status: 'locked', message });
  }, [controller]);

  const refreshSession = useCallback(async () => {
    const epoch = ++requestEpoch.current;
    if (!controller.currentScope) setGate({ status: 'loading' });
    try {
      const userId = await fetchAuthenticatedUserId();
      if (epoch !== requestEpoch.current) return;
      if (!userId) {
        lock('تحتاج المكتبة إلى جلسة مدرسة نشطة. سجّل الدخول لمتابعة الوصول إلى ملفاتك.');
        return;
      }
      const scope = controller.activate(userId);
      setGate({ status: 'ready', userId, scope });
    } catch {
      if (epoch !== requestEpoch.current) return;
      lock('تعذر التحقق من جلسة المدرسة. أُقفلت المكتبة محليًا حتى ينجح التحقق.');
    }
  }, [controller, lock]);

  useEffect(() => {
    void refreshSession();
    const unsubscribe = subscribeToSchoolSessionChanges(() => {
      lock('تغيّرت الجلسة؛ جارٍ التحقق قبل فتح المكتبة مجددًا.');
      void refreshSession();
    });
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        lock('جارٍ إعادة التحقق من الجلسة قبل عرض المكتبة.');
        void refreshSession();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshSession();
    }, 60_000);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(timer);
      requestEpoch.current += 1;
      controller.invalidate();
    };
  }, [controller, lock, refreshSession]);

  if (gate.status === 'ready') {
    return <LibraryApp key={gate.userId} scope={gate.scope} />;
  }

  if (gate.status === 'loading') {
    return <main dir="rtl" lang="ar" className="min-h-screen bg-slate-50 p-8 text-slate-700">جارٍ التحقق من جلسة المدرسة…</main>;
  }

  return (
    <main dir="rtl" lang="ar" className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">المكتبة مقفلة</h1>
        <p role="status" className="mt-3 leading-7 text-slate-700">{gate.message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => void refreshSession()} className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white">
            إعادة التحقق
          </button>
          <a href="/accounts" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700">
            تسجيل الدخول
          </a>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  if (
    typeof window !== 'undefined' &&
    (window.location.pathname === '/accounts' || window.location.pathname === '/accounts/')
  ) {
    return <AccountsPage />;
  }
  return <AuthenticatedLibraryGate />;
}
