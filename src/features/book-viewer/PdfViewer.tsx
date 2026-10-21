import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Book, InteractiveElement, UserNote } from '../../types';
import { useI18n } from '../../i18n';
import { pdfService, RenderResult } from '../../services/pdfService';
import { localDocumentStore, LocalDocumentError, localDocumentErrorMessage } from '../../services/localDocumentStore';
import { loadBookDocumentData } from './document-source';
import { bookLessonsService, BookLesson } from '../../services/bookLessonsService';
import { PdfStudyPanel } from '../pdf-study/PdfStudyPanel';
import { PdfPageView } from './PdfPageView';
import { NotesDrawer } from './NotesDrawer';
import { NoonToolsPanel } from '../ai-assistant/NoonToolsPanel';
import { storageService } from '../../services/storage';
import {
  SelectionRegion,
  SelectionActionType,
  SelectionToolId,
} from '../selection';
import { SelectionAssistantPanel } from '../ai-assistant';
import { AppIcon, IconButton } from '../../design-system';
import * as pdfjsLib from 'pdfjs-dist';

interface PdfViewerProps {
  book: Book;
  onBackToLibrary: () => void;
  onDeleteBook?: (bookId: string) => void;
  onUpdatePageNumber: (bookId: string, pageNum: number) => void;
  onQuizCompleted: (isCorrect: boolean) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  book,
  onBackToLibrary,
  onDeleteBook,
  onUpdatePageNumber,
  onQuizCompleted,
}) => {
  const { t, format, isRTL } = useI18n();
  const localeRef = useRef({ t, isRTL });
  localeRef.current = { t, isRTL };
  const containerRef = useRef<HTMLDivElement>(null);
  const panContainerRef = useRef<HTMLDivElement>(null);
  const initialPageRef = useRef(book.currentPage || 1);
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // PDF Document & Page State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(book.currentPage || 1);
  const [totalPages, setTotalPages] = useState<number>(book.totalPages || 3);
  const [scale, setScale] = useState<number>(1.0);

  // Lessons State
  const [lessons, setLessons] = useState<BookLesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<BookLesson | null>(null);

  // UI States
  const [isLoadingDoc, setIsLoadingDoc] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [positionSaveError, setPositionSaveError] = useState<string | null>(null);
  const [pageJumpInput, setPageJumpInput] = useState<string>('');
  const [pageJumpError, setPageJumpError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAiToolsOpen, setIsAiToolsOpen] = useState(false);
  const [isLessonQuizOpen, setIsLessonQuizOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isStudyOpen, setIsStudyOpen] = useState(false);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [quizTargetLessons, setQuizTargetLessons] = useState<BookLesson[]>([]);
  const [summaryTargetLessons, setSummaryTargetLessons] = useState<BookLesson[]>([]);
  const [isOverlayEnabled, setIsOverlayEnabled] = useState(false);
  const [selectedElement, setSelectedElement] = useState<InteractiveElement | null>(null);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Region Selection states
  const [selection, setSelection] = useState<SelectionRegion | null>(null);
  const [activeSelectionPage, setActiveSelectionPage] = useState<number>(book.currentPage || 1);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [nearbyText, setNearbyText] = useState<string>('');
  const [isSelectionPanelOpen, setIsSelectionPanelOpen] = useState(false);
  const [activeSelectionTool, setActiveSelectionTool] = useState<SelectionToolId>('simplify');
  const [actionFeedbackToast, setActionFeedbackToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSelectionKeyRef = useRef<string>('');
  const lastSavedPageRef = useRef<number>(book.currentPage || 1);

  // Floating vertical page widget auto-hide state & timer
  const [isFloatingNavVisible, setIsFloatingNavVisible] = useState(true);
  const floatingHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetFloatingNavTimer = useCallback(() => {
    setIsFloatingNavVisible(true);
    if (floatingHideTimeoutRef.current) {
      clearTimeout(floatingHideTimeoutRef.current);
    }
    floatingHideTimeoutRef.current = setTimeout(() => {
      setIsFloatingNavVisible(false);
    }, 2200);
  }, []);

  useEffect(() => {
    resetFloatingNavTimer();
    return () => {
      if (floatingHideTimeoutRef.current) {
        clearTimeout(floatingHideTimeoutRef.current);
      }
    };
  }, [resetFloatingNavTimer]);

  // Continuous page scrolling during long press (holding arrow keys)
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopContinuousPageScroll = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = null;
    }
    resetFloatingNavTimer();
  }, [resetFloatingNavTimer]);

  const startContinuousPageScroll = useCallback((direction: 'prev' | 'next') => {
    stopContinuousPageScroll();
    setIsFloatingNavVisible(true);

    // Initial click action
    if (direction === 'prev') {
      handlePrevPage();
    } else {
      handleNextPage();
    }

    // Set delay before starting rapid repetitions to distinguish a click from a hold
    longPressTimeoutRef.current = setTimeout(() => {
      longPressIntervalRef.current = setInterval(() => {
        if (direction === 'prev') {
          setCurrentPage((prev) => {
            if (prev > 1) {
              const target = prev - 1;
              const element = document.getElementById(`page-container-${target}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
              return target;
            }
            stopContinuousPageScroll();
            return prev;
          });
        } else {
          setCurrentPage((prev) => {
            if (prev < totalPages) {
              const target = prev + 1;
              const element = document.getElementById(`page-container-${target}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
              return target;
            }
            stopContinuousPageScroll();
            return prev;
          });
        }
      }, 250); // repetition speed
    }, 350); // delay before holding starts repeating
  }, [handlePrevPage, handleNextPage, totalPages, stopContinuousPageScroll]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
      if (longPressIntervalRef.current) clearInterval(longPressIntervalRef.current);
    };
  }, []);

  // Helper to extract high quality cropped base64 image from the rendered canvas of a specific page
  const getSelectedCropBase64 = useCallback(
    (sel: SelectionRegion | null, pageNum: number): string => {
      if (!sel) return '';
      const canvas = canvasMapRef.current.get(pageNum);
      if (!canvas) return '';

      try {
        const x = Math.max(0, (sel.xPct / 100) * canvas.width);
        const y = Math.max(0, (sel.yPct / 100) * canvas.height);
        const w = Math.min(canvas.width - x, (sel.widthPct / 100) * canvas.width);
        const h = Math.min(canvas.height - y, (sel.heightPct / 100) * canvas.height);

        if (w < 8 || h < 8) return '';

        const cropCanvas = document.createElement('canvas');
        const maxDim = 1000;
        const scaleFactor = Math.min(1, maxDim / Math.max(w, h));
        cropCanvas.width = Math.round(w * scaleFactor);
        cropCanvas.height = Math.round(h * scaleFactor);

        const ctx = cropCanvas.getContext('2d');
        if (!ctx) return '';
        ctx.drawImage(canvas, x, y, w, h, 0, 0, cropCanvas.width, cropCanvas.height);
        return cropCanvas.toDataURL('image/jpeg', 0.82);
      } catch {
        return '';
      }
    },
    []
  );

  const bookRef = useRef(book);
  bookRef.current = book;

  // Load PDF Document & extract structured curriculum lessons
  const loadPdf = useCallback(async () => {
    setIsLoadingDoc(true);
    setIsStudyOpen(false);
    setLoadError(null);
    setPdfDoc(null);
    setLessons([]);
    setActiveLesson(null);

    const currentBook = bookRef.current;
    const { t, isRTL } = localeRef.current;
    try {
      const data = await loadBookDocumentData(currentBook);

      if (!data || data.byteLength === 0) {
        throw new Error(t.viewer.invalidFileError);
      }

      if (data.byteLength > 150 * 1024 * 1024) {
        throw new Error(t.viewer.fileTooLargeError);
      }

      const doc = await pdfService.loadDocument(data);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);

      // Restore saved page
      const initialPage = Math.min(Math.max(1, currentBook.currentPage || 1), doc.numPages);
      initialPageRef.current = initialPage;
      setCurrentPage(initialPage);
      setActiveSelectionPage(initialPage);

      // Lessons are explicitly selected from this PDF in PdfStudyPanel.
      // Never infer curriculum facts or page ranges from the file name.
    } catch (err: unknown) {
      console.error('Failed to load PDF', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === 'PasswordException') {
        setLoadError(t.pdfStudy.passwordProtected);
      } else if (err instanceof LocalDocumentError) {
        setLoadError(localDocumentErrorMessage(err, isRTL));
      } else if (errMsg.includes('Invalid PDF') || errMsg.includes('corrupted')) {
        setLoadError(t.viewer.invalidFileError);
      } else if (errMsg.includes('large') || errMsg.includes('memory')) {
        setLoadError(t.viewer.fileTooLargeError);
      } else {
        setLoadError(t.viewer.invalidFileError);
      }
    } finally {
      setIsLoadingDoc(false);
    }
  }, [book.id]);

  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  // Keep activeLesson synchronized with currentPage
  useEffect(() => {
    if (lessons.length > 0) {
      const match = bookLessonsService.findLessonForPage(lessons, currentPage);
      if (match && match.id !== activeLesson?.id) {
        setActiveLesson(match);
      }
    }
  }, [currentPage, lessons, activeLesson?.id]);

  // Extract text and cropped image from selection region
  useEffect(() => {
    let isCancelled = false;
    if (selection && pdfDoc && selection.widthPct > 0 && selection.heightPct > 0) {
      const selKey = `${activeSelectionPage}-${selection.xPct.toFixed(1)}-${selection.yPct.toFixed(1)}-${selection.widthPct.toFixed(1)}-${selection.heightPct.toFixed(1)}`;
      if (prevSelectionKeyRef.current === selKey) return;
      prevSelectionKeyRef.current = selKey;

      const cropBase64 = getSelectedCropBase64(selection, activeSelectionPage);
      if (cropBase64) {
        setSelectedImage(cropBase64);
      }

      pdfService.extractTextFromRegion(pdfDoc, activeSelectionPage, selection).then((text) => {
        if (!isCancelled) {
          setSelectedText((prev) => (prev !== text ? text : prev));
        }
      });

      // Extract surrounding text for context
      const nearbyRegion = {
        xPct: Math.max(0, selection.xPct - 8),
        yPct: Math.max(0, selection.yPct - 8),
        widthPct: Math.min(100 - Math.max(0, selection.xPct - 8), selection.widthPct + 16),
        heightPct: Math.min(100 - Math.max(0, selection.yPct - 8), selection.heightPct + 16),
      };
      pdfService.extractTextFromRegion(pdfDoc, activeSelectionPage, nearbyRegion).then((surrounding) => {
        if (!isCancelled && surrounding) {
          setNearbyText((prev) => (prev !== surrounding ? surrounding : prev));
        }
      });
    } else {
      if (prevSelectionKeyRef.current !== '') {
        prevSelectionKeyRef.current = '';
        setSelectedText('');
        setSelectedImage('');
        setNearbyText('');
      }
    }
    return () => {
      isCancelled = true;
    };
  }, [selection, activeSelectionPage, pdfDoc, getSelectedCropBase64]);

  // Save current page locally in IndexedDB & load notes
  useEffect(() => {
    if (currentPage > 0) {
      if (lastSavedPageRef.current !== currentPage) {
        lastSavedPageRef.current = currentPage;
        if (book.source === 'local') {
          localDocumentStore.saveLastPage(book.id, currentPage).then(
            () => setPositionSaveError(null),
            (error: unknown) => setPositionSaveError(localDocumentErrorMessage(
              error instanceof LocalDocumentError ? error : new LocalDocumentError('save'), isRTL
            ))
          );
        }
        onUpdatePageNumber(book.id, currentPage);
      }
      const pageNotes = storageService.getNotes(book.id, currentPage);
      setNotes(pageNotes);
    }
  }, [book.id, book.source, currentPage, onUpdatePageNumber, isRTL]);

  // Clean up toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Smooth scroll to a target page container
  const scrollToPage = useCallback((pageNum: number) => {
    const target = Math.max(1, Math.min(totalPages, pageNum));
    setCurrentPage(target);
    const element = document.getElementById(`page-container-${target}`);
    if (element) {
      const pane = panContainerRef.current;
      if (pane) pane.scrollTo({ top: pane.scrollTop + element.getBoundingClientRect().top - pane.getBoundingClientRect().top, behavior: 'smooth' });
    }
  }, [totalPages]);

  // Restore the visible PDF page, not just its number in the navigation badge.
  useEffect(() => {
    if (!pdfDoc) return;
    const frame = requestAnimationFrame(() => {
      const target = Math.min(Math.max(1, initialPageRef.current), pdfDoc.numPages);
      const element = document.getElementById(`page-container-${target}`);
      const pane = panContainerRef.current;
      if (element && pane) pane.scrollTo({ top: pane.scrollTop + element.getBoundingClientRect().top - pane.getBoundingClientRect().top, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [pdfDoc]);

  // Handle lesson selection from the horizontal LessonsBar
  const handleSelectLesson = useCallback((lesson: BookLesson) => {
    setActiveLesson(lesson);
    scrollToPage(lesson.pageNumber);
  }, [scrollToPage]);

  // Toggle checkmark (✅) on lesson square icon
  const handleToggleLessonSelect = useCallback((lessonId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLessonIds((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  }, []);

  // Launch Gemini student quiz for single lesson or multiple selected lessons
  const handleStartQuiz = useCallback((lessonsToTest: BookLesson[]) => {
    if (!lessonsToTest || lessonsToTest.length === 0) return;
    setQuizTargetLessons(lessonsToTest);
    setIsLessonQuizOpen(true);
  }, []);

  // Launch Gemini student lesson summary for single or multiple selected lessons
  const handleStartSummary = useCallback((lessonsToSummarize: BookLesson[]) => {
    if (!lessonsToSummarize || lessonsToSummarize.length === 0) return;
    setSummaryTargetLessons(lessonsToSummarize);
    setIsSummaryOpen(true);
  }, []);

  // Selection actions
  const handleSelectionAction = useCallback(async (action: SelectionActionType, pageNum: number) => {
    let toolId: SelectionToolId = 'simplify';
    if (action === 'explain') toolId = 'stepByStep';
    else if (action === 'simplify') toolId = 'simplify';
    else if (action === 'hint') toolId = 'hint';
    else if (action === 'quiz') toolId = 'quiz';
    else if (action === 'analyze') toolId = 'analyze';
    else if (action === 'explainFigure') toolId = 'explainFigure';

    setActiveSelectionPage(pageNum);

    if (selection) {
      const crop = getSelectedCropBase64(selection, pageNum);
      if (crop) {
        setSelectedImage(crop);
      }
    }
    if (selection && pdfDoc && !selectedText) {
      const text = await pdfService.extractTextFromRegion(pdfDoc, pageNum, selection);
      if (text) {
        setSelectedText(text);
      }
    }

    setActiveSelectionTool(toolId);
    setIsSelectionPanelOpen(true);
  }, [selection, pdfDoc, selectedText, getSelectedCropBase64]);

  const handlePageIntersect = useCallback((pNum: number) => {
    setCurrentPage((prev) => (prev !== pNum ? pNum : prev));
  }, []);

  const handleSelectionChange = useCallback((sel: SelectionRegion | null, pNum: number) => {
    setSelection(sel);
    setActiveSelectionPage(pNum);
    if (!sel) {
      setIsSelectionPanelOpen(false);
    }
  }, []);

  const handleActionClick = useCallback((action: SelectionActionType, pNum: number) => {
    setActiveSelectionPage(pNum);
    handleSelectionAction(action, pNum);
  }, [handleSelectionAction]);

  const handleSetCanvasRef = useCallback((pNum: number, canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      canvasMapRef.current.set(pNum, canvas);
    } else {
      canvasMapRef.current.delete(pNum);
    }
  }, []);

  const handleOpenNoonTools = () => {
    if (!selection) {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      setActionFeedbackToast(isRTL ? 'حدد فقرة أو صورة أو مسألة أولًا.' : 'Please select a paragraph or problem first.');
      toastTimeoutRef.current = setTimeout(() => {
        setActionFeedbackToast(null);
      }, 3000);
      return;
    }
    setIsSelectionPanelOpen(true);
  };

  // Zoom Operations
  const handleZoomIn = () => {
    setScale((prev) => Math.min(2.5, +(prev + 0.15).toFixed(2)));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.5, +(prev - 0.15).toFixed(2)));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  const handleFitWidth = () => {
    // Each page computes its own fit baseline from its actual PDF dimensions.
    // Reset only the user zoom multiplier, including for citation pages of varying widths.
    setScale(1.0);
  };

  // Page Switcher Navigation
  function handlePrevPage() {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  }

  function handleNextPage() {
    if (currentPage < totalPages) {
      scrollToPage(currentPage + 1);
    }
  }

  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageJumpInput.trim(), 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
      setPageJumpError(format(t.viewer.invalidPageError, { total: totalPages }));
      setTimeout(() => setPageJumpError(null), 3500);
      return;
    }
    scrollToPage(pageNum);
    setPageJumpInput('');
    setPageJumpError(null);
  };

  // Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Element Selection
  const handleSelectElement = useCallback((elem: InteractiveElement) => {
    setSelectedElement(elem);
    if (window.innerWidth < 768) {
      setIsAiToolsOpen(true);
    }
  }, []);

  // Notes
  const handleAddNote = (text: string) => {
    const newNote = storageService.addNote({
      bookId: book.id,
      pageNumber: currentPage,
      text,
    });
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleDeleteNote = (noteId: string) => {
    storageService.deleteNote(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  // Delete Book
  const handleDeleteBookConfirmed = async () => {
    await localDocumentStore.deleteDocument(book.id);
    if (onDeleteBook) {
      onDeleteBook(book.id);
    } else {
      onBackToLibrary();
    }
  };

  // Build page list for vertical continuous rendering
  const pageList = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div
      ref={containerRef}
      className="flex flex-col flex-1 min-h-0 bg-slate-100 overflow-hidden relative select-none"
    >
      {/* ============================================================== */}
      {/* Top Application Header (Contains Controls & Horizontal Lessons) */}
      {/* ============================================================== */}
      <header className="shrink-0 z-20 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        {/* Row 1: Back, Title, Zoom/Fit Tools, Notes & Primary CTA */}
        <div className="px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5">
          {/* Back & Book Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto">
            <IconButton
              name={isRTL ? 'arrowRight' : 'arrowLeft'}
              iconSize="sm"
              variant="ghost"
              label={t.actions.backToLibrary}
              onClick={onBackToLibrary}
              className="px-3 min-h-[44px]"
            >
              <span className="hidden sm:inline">{t.actions.backToLibrary}</span>
            </IconButton>

            <span className="hidden sm:inline text-slate-300">|</span>

            <div className="truncate">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                {book.title}
              </h2>
              {activeLesson && (
                <span className="text-[10px] text-indigo-600 font-medium hidden sm:block truncate">
                  {activeLesson.unitTitle ? `${activeLesson.unitTitle} · ` : ''}
                  {activeLesson.title}
                </span>
              )}
            </div>
          </div>

          {/* Right Toolbar: Zoom controls, Fit width, Region selection, Notes & Noon Tools */}
          <div className="flex items-center justify-between gap-1 sm:gap-1.5 w-full sm:w-auto">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/60">
              <IconButton
                name="zoomOut"
                iconSize="xs"
                variant="ghost"
                label={t.viewer.zoomOut}
                onClick={handleZoomOut}
                className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-white"
              />

              <span className="px-1 text-[11px] font-mono tabular-nums text-slate-700 select-none min-w-[36px] text-center">
                {Math.round(scale * 100)}%
              </span>

              <IconButton
                name="zoomIn"
                iconSize="xs"
                variant="ghost"
                label={t.viewer.zoomIn}
                onClick={handleZoomIn}
                className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-white"
              />

              <IconButton
                name="mobileFit"
                iconSize="xs"
                variant="ghost"
                label={t.viewer.fitWidth}
                onClick={handleFitWidth}
                className="min-h-[40px] px-2 rounded-lg hover:bg-white text-[11px]"
              >
                <span className="hidden md:inline">{t.viewer.fitWidth}</span>
              </IconButton>
            </div>

            {/* Notes Button */}
            <IconButton
              name="notes"
              iconSize="sm"
              variant={isNotesOpen ? 'solid' : 'outline'}
              label={t.viewer.notes}
              badgeCount={notes.length}
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className="px-3 min-h-[44px]"
              iconClassName="text-amber-500"
            >
              <span className="hidden md:inline">{t.viewer.notes}</span>
            </IconButton>

            {/* Delete Book Button (strictly for local user books) */}
            {book.source === 'local' && onDeleteBook && (
              <IconButton
                name="delete"
                iconSize="sm"
                variant="ghost"
                label={t.viewer.deleteBook}
                onClick={() => setShowDeleteConfirm(true)}
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 min-h-[44px] min-w-[44px]"
              />
            )}

            {/* Primary Focal CTA: Noon Smart Tools */}
            <button
              type="button"
              onClick={() => setIsStudyOpen(true)}
              disabled={!pdfDoc || Boolean(loadError)}
              className={`min-h-[44px] px-3.5 sm:px-4 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs font-bold transition-all shadow-xs active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isSelectionPanelOpen
                  ? 'bg-indigo-700 text-white ring-2 ring-indigo-400'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <AppIcon name="sparkles" size="sm" />
              <span>{t.pdfStudy.button}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Horizontal Scrollable Lessons Bar */}
        <div className="px-3 sm:px-6 py-1.5 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <p className="text-xs leading-6 text-slate-600">{book.source === 'admin' ? t.pdfStudy.demoNotice : t.pdfStudy.localNotice}</p>
        </div>
      </header>

      {/* Floating Vertical Page Navigation Control (Right side, Vertically Centered) */}
      <div
        onMouseEnter={() => {
          setIsFloatingNavVisible(true);
          if (floatingHideTimeoutRef.current) {
            clearTimeout(floatingHideTimeoutRef.current);
          }
        }}
        onMouseLeave={resetFloatingNavTimer}
        className={`fixed right-3.5 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-slate-900/40 hover:bg-slate-900/85 backdrop-blur-md text-white border border-white/20 shadow-xl transition-all duration-300 select-none w-12 sm:w-14 ${
          isFloatingNavVisible
            ? 'opacity-85 hover:opacity-100 pointer-events-auto scale-100 translate-x-0'
            : 'opacity-0 pointer-events-none scale-95 translate-x-3'
        }`}
      >
        {/* Scroll Upwards towards start of book (Supports continuous scroll on hold) */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.stopPropagation();
            startContinuousPageScroll('prev');
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            e.preventDefault();
            startContinuousPageScroll('prev');
          }}
          onMouseUp={stopContinuousPageScroll}
          onMouseLeave={stopContinuousPageScroll}
          onTouchEnd={stopContinuousPageScroll}
          onTouchCancel={stopContinuousPageScroll}
          onClick={(e) => {
            e.stopPropagation();
          }}
          disabled={currentPage <= 1 || isLoadingDoc}
          title={t.viewer.previousPage}
          aria-label={t.viewer.previousPage}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white/95 hover:text-white hover:bg-white/20 active:scale-90 disabled:opacity-20 transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-300 cursor-pointer"
        >
          <AppIcon name="chevronUp" size="md" />
        </button>

        {/* Dynamic Page Number (Only current page number, no total) */}
        <span className="text-xs sm:text-sm font-extrabold font-mono tracking-tight text-white tabular-nums px-1 rounded-md text-center min-w-[32px] drop-shadow-xs">
          {currentPage}
        </span>

        {/* Scroll Downwards towards end of book (Supports continuous scroll on hold) */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.stopPropagation();
            startContinuousPageScroll('next');
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            e.preventDefault();
            startContinuousPageScroll('next');
          }}
          onMouseUp={stopContinuousPageScroll}
          onMouseLeave={stopContinuousPageScroll}
          onTouchEnd={stopContinuousPageScroll}
          onTouchCancel={stopContinuousPageScroll}
          onClick={(e) => {
            e.stopPropagation();
          }}
          disabled={currentPage >= totalPages || isLoadingDoc}
          title={t.viewer.nextPage}
          aria-label={t.viewer.nextPage}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white/95 hover:text-white hover:bg-white/20 active:scale-90 disabled:opacity-20 transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-300 cursor-pointer"
        >
          <AppIcon name="chevronDown" size="md" />
        </button>
      </div>

      {/* Temporary Feedback Toast */}
      {actionFeedbackToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200 motion-reduce:animate-none pointer-events-none">
          <div className="bg-slate-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold pointer-events-auto">
            <AppIcon name="sparkles" size="sm" className="text-indigo-400" />
            <span>{actionFeedbackToast}</span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Viewport Area: Continuous Vertical Scroll of All Book Pages */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden relative" onClick={resetFloatingNavTimer}>
        <div
          ref={panContainerRef}
          onScroll={resetFloatingNavTimer}
          onClick={resetFloatingNavTimer}
          className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex flex-col items-center relative select-none scroll-smooth"
        >
          {/* Loading Indicator */}
          {isLoadingDoc && (
            <div className="absolute inset-0 z-30 bg-slate-100/70 backdrop-blur-2xs flex flex-col items-center justify-center pointer-events-none">
              <div className="bg-white/95 rounded-2xl p-5 shadow-lg border border-slate-200 flex flex-col items-center gap-3">
                <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-800">{t.viewer.loadingPage}</span>
              </div>
            </div>
          )}

          {positionSaveError && (
            <p role="alert" className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-sm text-amber-900 mb-4">
              {isRTL ? 'لم يتم حفظ موضع القراءة: ' : 'Reading position was not saved: '}{positionSaveError}
            </p>
          )}

          {/* Load Error Card */}
          {loadError ? (
            <div role="alert" className="bg-white border border-red-200 rounded-3xl p-8 max-w-md mx-auto text-center shadow-lg my-12">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AppIcon name="alert" size="xl" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-display">{isRTL ? 'تعذر قراءة ملف PDF' : 'Could not open PDF'}</h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed font-sans">{loadError}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={loadPdf}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center gap-2 active:scale-[0.98] motion-reduce:transform-none"
                >
                  <AppIcon name="refresh" size="sm" />
                  <span>{t.actions.retry}</span>
                </button>
                <button
                  type="button"
                  onClick={onBackToLibrary}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors active:scale-[0.98] motion-reduce:transform-none"
                >
                  {t.actions.backToLibrary}
                </button>
              </div>
            </div>
          ) : (
            /* Continuous Vertical List of Book Pages */
            pdfDoc && (
              <div className="flex flex-col items-center w-full max-w-full pb-16">
                {pageList.map((pageNum) => (
                  <PdfPageView
                    key={pageNum}
                    doc={pdfDoc}
                    pageNumber={pageNum}
                    scale={scale}
                    selection={activeSelectionPage === pageNum ? selection : null}
                    isSelectionActive={activeSelectionPage === pageNum && Boolean(selection)}
                    onSelectionChange={handleSelectionChange}
                    onActionClick={handleActionClick}
                    selectedElementId={selectedElement?.id || null}
                    onSelectElement={handleSelectElement}
                    isOverlayEnabled={false}
                    onPageIntersect={handlePageIntersect}
                    setCanvasRef={handleSetCanvasRef}
                  />
                ))}
              </div>
            )
          )}
        </div>

        {/* Selection-Linked Noon Assistant Panel with Full Lesson Context */}
        {isSelectionPanelOpen && (
          <SelectionAssistantPanel
            isOpen={isSelectionPanelOpen}
            onClose={() => setIsSelectionPanelOpen(false)}
            pageNumber={activeSelectionPage || currentPage}
            totalPages={totalPages}
            selection={selection}
            activeTool={activeSelectionTool}
            onSelectTool={(toolId) => setActiveSelectionTool(toolId)}
            onBackToPage={() => setIsSelectionPanelOpen(false)}
            selectedText={selectedText}
            selectedImage={selectedImage}
            nearbyText={nearbyText}
            bookTitle={book.title}
            lessonTitle={activeLesson?.title || ''}
            lessonContext={activeLesson?.curriculumContext || ''}
          />
        )}
      </div>

      {/* Notes Drawer */}
      <NotesDrawer
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        pageNumber={currentPage}
        notes={notes}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
      />

      {/* Noon Tools AI Assistant Sheet / Sidebar */}
      <NoonToolsPanel
        isOpen={isAiToolsOpen}
        onClose={() => setIsAiToolsOpen(false)}
        selectedElement={selectedElement}
        onQuizCompleted={onQuizCompleted}
      />

      {pdfDoc && <PdfStudyPanel key={book.id} document={pdfDoc} bookId={book.id} isOpen={isStudyOpen}
        onClose={() => setIsStudyOpen(false)} onPage={scrollToPage} />}
      {/* Delete Book Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AppIcon name="delete" size="xl" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">{t.viewer.deleteBook}</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              {t.viewer.confirmDeleteBook}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleDeleteBookConfirmed}
                className="min-h-[44px] flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors"
              >
                {t.common.confirm}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
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
