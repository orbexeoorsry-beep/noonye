import React, { useState, useMemo } from 'react';
import { Book, ActivePage } from '../types';
import { useI18n } from '../i18n';
import { BookCard } from '../features/library/BookCard';
import { EmptyState } from '../components/common/EmptyState';
import { AppIcon, IconButton } from '../design-system';

interface LibraryProps {
  books: Book[];
  onOpenBook: (bookId: string) => void;
  onNavigate: (page: ActivePage) => void;
  onDeleteBook?: (bookId: string) => void;
  onClearAllLocalBooks?: () => void;
}

export const Library: React.FC<LibraryProps> = ({
  books,
  onOpenBook,
  onNavigate,
  onDeleteBook,
  onClearAllLocalBooks,
}) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'demo' | 'local'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 1. Separate Admin / Curated Books from Local User Books strictly
  const noonBooks = useMemo(() => {
    if (!Array.isArray(books)) return [];
    return books.filter((b) => b.source === 'admin');
  }, [books]);

  const localBooks = useMemo(() => {
    if (!Array.isArray(books)) return [];
    return books.filter((b) => b.source === 'local');
  }, [books]);

  // 2. Filtered collections
  const filteredNoonBooks = useMemo(() => {
    if (filterType === 'local') return [];
    const query = (searchQuery || '').toLowerCase().trim();
    if (!query) return noonBooks;
    return noonBooks.filter((book) => {
      const title = (book.title || '').toLowerCase();
      const subject = (book.subject || '').toLowerCase();
      const grade = (book.gradeLevel || '').toLowerCase();
      return title.includes(query) || subject.includes(query) || grade.includes(query);
    });
  }, [noonBooks, searchQuery, filterType]);

  const filteredLocalBooks = useMemo(() => {
    if (filterType === 'demo') return [];
    const query = (searchQuery || '').toLowerCase().trim();
    if (!query) return localBooks;
    return localBooks.filter((book) => {
      const title = (book.title || '').toLowerCase();
      const subject = (book.subject || '').toLowerCase();
      const grade = (book.gradeLevel || '').toLowerCase();
      return title.includes(query) || subject.includes(query) || grade.includes(query);
    });
  }, [localBooks, searchQuery, filterType]);

  const handleClearAllConfirmed = () => {
    setShowClearConfirm(false);
    if (onClearAllLocalBooks) {
      onClearAllLocalBooks();
    }
  };

  const hasAnyResults = filteredNoonBooks.length > 0 || filteredLocalBooks.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            {t.library.pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans">
            {t.library.pageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {localBooks.length > 0 && onClearAllLocalBooks && (
            <IconButton
              name="delete"
              iconSize="sm"
              variant="danger"
              label={t.library.clearAllLocal}
              onClick={() => setShowClearConfirm(true)}
              className="px-3.5"
            >
              <span>{t.library.clearAllLocal}</span>
            </IconButton>
          )}

          <button
            type="button"
            onClick={() => onNavigate('add-book')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-all shadow-xs active:scale-[0.98] motion-reduce:transform-none flex items-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <AppIcon name="addBook" size="sm" />
            <span>{t.actions.addBook}</span>
          </button>
        </div>
      </div>

      {/* Search and Segmented Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
        {/* Search Input */}
        <div className="relative w-full sm:flex-1">
          <AppIcon
            name="search"
            size="sm"
            className="text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.library.searchPlaceholder}
            className="w-full min-h-[44px] pr-10 pl-9 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg"
              title={t.actions.clearSearch}
              aria-label={t.actions.clearSearch}
            >
              <AppIcon name="close" size="xs" />
            </button>
          )}
        </div>

        {/* Segmented Filter Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`min-h-[40px] flex-1 sm:flex-none px-3.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap active:scale-[0.98] motion-reduce:transform-none ${
              filterType === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.actions.all} ({noonBooks.length + localBooks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('demo')}
            className={`min-h-[40px] flex-1 sm:flex-none px-3.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap active:scale-[0.98] motion-reduce:transform-none ${
              filterType === 'demo'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.library.noonBooksSection} ({noonBooks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('local')}
            className={`min-h-[40px] flex-1 sm:flex-none px-3.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap active:scale-[0.98] motion-reduce:transform-none ${
              filterType === 'local'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.library.localBooksSection} ({localBooks.length})
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      {hasAnyResults ? (
        <div className="space-y-12">
          {/* SECTION 1: كتب نون (Admin Curated Textbooks) */}
          {(filterType === 'all' || filterType === 'demo') && filteredNoonBooks.length > 0 && (
            <section aria-labelledby="noon-books-heading" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <AppIcon name="sparkles" size="sm" />
                  </div>
                  <div>
                    <h2
                      id="noon-books-heading"
                      className="text-lg sm:text-xl font-bold text-slate-900 font-display flex items-center gap-2"
                    >
                      <span>{t.library.noonBooksSection}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-sans">
                        {filteredNoonBooks.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 font-sans">
                      {t.library.noonBooksSubtitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredNoonBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onOpen={onOpenBook}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 2: كتبي المحلية (Local User Documents from IndexedDB) */}
          {(filterType === 'all' || filterType === 'local') && (
            <section aria-labelledby="local-books-heading" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <AppIcon name="education" size="sm" />
                  </div>
                  <div>
                    <h2
                      id="local-books-heading"
                      className="text-lg sm:text-xl font-bold text-slate-900 font-display flex items-center gap-2"
                    >
                      <span>{t.library.localBooksSection}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-sans">
                        {localBooks.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 font-sans">
                      {t.library.localBooksSubtitle}
                    </p>
                  </div>
                </div>
              </div>

              {filteredLocalBooks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredLocalBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onOpen={onOpenBook}
                      onDelete={onDeleteBook}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center max-w-xl mx-auto my-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <AppIcon name="upload" size="md" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1 font-display">
                    {t.library.noLocalBooksYet}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 font-sans leading-relaxed">
                    {t.addBook.uploadSubtitle}
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('add-book')}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs active:scale-[0.98] inline-flex items-center gap-1.5"
                  >
                    <AppIcon name="addBook" size="xs" />
                    <span>{t.actions.addBook}</span>
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      ) : (
        <EmptyState
          title={searchQuery ? t.library.emptyTitle : t.library.empty}
          description={t.library.emptyDesc}
          actionLabel={searchQuery ? t.common.retry : t.actions.addBook}
          onAction={
            searchQuery ? () => setSearchQuery('') : () => onNavigate('add-book')
          }
          icon={searchQuery ? 'search' : 'library'}
        />
      )}

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 motion-reduce:animate-none">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AppIcon name="delete" size="md" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2 font-display">
              {t.library.confirmClearAll}
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed font-sans">
              {t.library.confirmDeleteBook}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleClearAllConfirmed}
                className="min-h-[44px] flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-xs active:scale-[0.98] motion-reduce:transform-none"
              >
                {t.common.confirm}
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors active:scale-[0.98] motion-reduce:transform-none"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
