import React from 'react';
import { useI18n } from '../../i18n';
import { AppIcon, IconButton } from '../../design-system';

interface ViewerToolbarProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  isFullscreen: boolean;
  notesCount: number;
  isNotesOpen: boolean;
  isAiToolsOpen: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleFullscreen: () => void;
  onToggleNotes: () => void;
  onToggleAiTools: () => void;
  onBackToLibrary: () => void;
  bookTitle: string;
}

export const ViewerToolbar: React.FC<ViewerToolbarProps> = ({
  currentPage,
  totalPages,
  scale,
  isFullscreen,
  notesCount,
  isNotesOpen,
  isAiToolsOpen,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFullscreen,
  onToggleNotes,
  onToggleAiTools,
  onBackToLibrary,
  bookTitle,
}) => {
  const { t, format, isRTL } = useI18n();

  return (
    <>
      {/* Desktop & Tablet Top Bar */}
      <div className="sticky top-0 z-20 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center justify-between gap-3 shadow-xs">
        {/* Left: Back to library & Book info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <IconButton
            name={isRTL ? 'arrowRight' : 'arrowLeft'}
            iconSize="sm"
            variant="ghost"
            label={t.actions.backToLibrary}
            onClick={onBackToLibrary}
          >
            <span className="hidden sm:inline font-sans text-xs">{t.actions.backToLibrary}</span>
          </IconButton>

          <span className="hidden sm:inline text-slate-300">|</span>

          <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[160px] sm:max-w-xs md:max-w-md">
            {bookTitle}
          </h2>
        </div>

        {/* Right: Zoom & Tool Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Controls (Hidden on narrow mobile, available in bottom bar) */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/90 rounded-xl p-1">
            <IconButton
              name="zoomOut"
              iconSize="sm"
              variant="ghost"
              label={t.viewer.zoomOut}
              onClick={onZoomOut}
              className="min-h-[36px] min-w-[36px] p-1 rounded-lg text-slate-600"
            />
            <span className="px-1.5 text-[11px] font-mono tabular-nums text-slate-700 select-none">
              {Math.round(scale * 100)}%
            </span>
            <IconButton
              name="zoomIn"
              iconSize="sm"
              variant="ghost"
              label={t.viewer.zoomIn}
              onClick={onZoomIn}
              className="min-h-[36px] min-w-[36px] p-1 rounded-lg text-slate-600"
            />
            <IconButton
              name="rotate"
              iconSize="xs"
              variant="ghost"
              label={t.viewer.resetZoom}
              onClick={onResetZoom}
              className="min-h-[36px] min-w-[36px] p-1 rounded-lg text-slate-600"
            />
          </div>

          {/* Fullscreen Button */}
          <IconButton
            name={isFullscreen ? 'exitFullscreen' : 'fullscreen'}
            iconSize="sm"
            variant="ghost"
            label={isFullscreen ? t.viewer.exitFullscreen : t.viewer.fullscreen}
            onClick={onToggleFullscreen}
            className="hidden sm:flex"
          />

          {/* Notes Button */}
          <IconButton
            name="notes"
            iconSize="sm"
            variant={isNotesOpen ? 'solid' : 'ghost'}
            label={t.viewer.notes}
            badgeCount={notesCount}
            onClick={onToggleNotes}
          >
            <span className="hidden sm:inline font-sans text-xs">{t.viewer.notes}</span>
          </IconButton>

          {/* Noon Tools Trigger Button (Primary Focal CTA) */}
          <button
            type="button"
            onClick={onToggleAiTools}
            className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-xs active:scale-[0.98] select-none motion-reduce:transform-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isAiToolsOpen
                ? 'bg-indigo-700 text-white ring-2 ring-indigo-400'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <AppIcon name="sparkles" size="sm" />
            <span>{t.viewer.noonTools}</span>
          </button>
        </div>
      </div>

      {/* Mobile Sticky Bottom Floating Action Bar */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-30 flex items-center justify-between gap-2 bg-slate-900/95 backdrop-blur-md text-white px-3 py-1.5 rounded-2xl shadow-xl border border-slate-700/80">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 text-slate-300">
          <button
            type="button"
            onClick={onZoomOut}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-[0.98] motion-reduce:transform-none"
            title={t.viewer.zoomOut}
            aria-label={t.viewer.zoomOut}
          >
            <AppIcon name="zoomOut" size="sm" />
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-[0.98] motion-reduce:transform-none"
            title={t.viewer.zoomIn}
            aria-label={t.viewer.zoomIn}
          >
            <AppIcon name="zoomIn" size="sm" />
          </button>
        </div>

        {/* Primary Tools Trigger */}
        <button
          type="button"
          onClick={onToggleAiTools}
          className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-[0.98] motion-reduce:transform-none select-none"
        >
          <AppIcon name="sparkles" size="sm" />
          <span>{t.viewer.noonTools}</span>
        </button>
      </div>
    </>
  );
};
