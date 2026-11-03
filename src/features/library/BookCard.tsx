import React from 'react';
import { Book } from '../../types';
import { useI18n } from '../../i18n';
import { formatFileSize } from '../../services/local-document-store/config';
import { AppIcon, IconButton } from '../../design-system';

interface BookCardProps {
  book: Book;
  onOpen: (bookId: string) => void;
  onDelete?: (bookId: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onOpen, onDelete }) => {
  const { t, format, isRTL } = useI18n();

  if (!book) return null;

  return (
    <div
      onClick={() => onOpen(book.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(book.id);
        }
      }}
      className="group text-start bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between active:scale-[0.99] motion-reduce:transform-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600 relative overflow-hidden"
    >
      {/* Top Section */}
      <div>
        {/* Unboxed Metadata Line with typographic separators */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3 gap-2 font-sans">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-medium text-slate-700">{book.subject || (isRTL ? 'منهاج دراسي' : 'Curriculum')}</span>
            {book.fileSize && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px] text-slate-600">{formatFileSize(book.fileSize)}</span>
              </>
            )}
          </div>

          {/* Status Label & Delete Action */}
          <div className="flex items-center gap-2 text-[11px] shrink-0 font-medium">
            {book.source === 'admin' ? (
              <span className="text-indigo-700 bg-indigo-50/90 border border-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold text-[10px] font-sans">
                <AppIcon name="sparkles" size="xs" className="text-indigo-600" />
                <span>{t.library.noonBooksSection}</span>
              </span>
            ) : (
              <div className="flex items-center gap-1.5 font-sans">
                <span className="text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold text-[10px]">
                  <AppIcon name="education" size="xs" className="text-emerald-600" />
                  <span>{t.library.savedOnDevice}</span>
                </span>
                {onDelete && (
                  <IconButton
                    name="delete"
                    iconSize="xs"
                    variant="ghost"
                    label={t.viewer.deleteBook}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(book.id);
                    }}
                    className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-red-600 hover:bg-red-50 p-1"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Book Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug mb-2 line-clamp-2 font-display">
          {book.title}
        </h3>

        {/* Short Summary */}
        <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4 font-sans">
          {book.summary}
        </p>
      </div>

      {/* Bottom Progress & Action Section */}
      <div className="pt-3 border-t border-slate-100 mt-2 font-sans">
        {/* Progress & Pages Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2 tabular-nums">
          <span className="flex items-center gap-1">
            <AppIcon name="library" size="xs" className="text-slate-400" />
            <span>
              {format(t.library.pageProgress, {
                current: book.currentPage || 1,
                total: book.totalPages,
              })}
            </span>
          </span>
          <span className="font-semibold text-slate-700">
            {format(t.library.progressPercent, { percent: book.progressPercent || 1 })}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-3.5">
          <div
            className="h-full rounded-full transition-all duration-300 motion-reduce:transition-none"
            style={{
              width: `${Math.max(3, book.progressPercent || 1)}%`,
              backgroundColor: book.accentColor || '#4338ca',
            }}
          />
        </div>

        {/* CTA Strip */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-sans">
            <AppIcon name="award" size="xs" className="text-slate-300" />
            <span>{format(t.library.lastOpened, { time: book.lastOpened || 'الآن' })}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 group-hover:text-indigo-600 group-hover:gap-1.5 transition-all">
            <span>{t.actions.openBook}</span>
            <AppIcon name={isRTL ? 'arrowLeft' : 'arrowRight'} size="xs" />
          </span>
        </div>
      </div>
    </div>
  );
};
