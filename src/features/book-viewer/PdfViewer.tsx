import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Book, InteractiveElement, UserNote } from '../../types';
import { useI18n } from '../../i18n';
import { pdfService } from '../../services/pdfService';
import { localDocumentStore } from '../../services/localDocumentStore';
import { generateEducationalSamplePdf } from '../../services/samplePdfGenerator';
import { bookLessonsService, BookLesson } from '../../services/bookLessonsService';
import { LessonsBar } from './LessonsBar';
import { LessonQuizModal } from './LessonQuizModal';
import { LessonSummaryModal } from './LessonSummaryModal';
import { PdfPageView } from './PdfPageView';
import { NotesDrawer } from './NotesDrawer';
import { NoonToolsPanel } from '../ai-assistant/NoonToolsPanel';
import { storageService } from '../../services/storage';
import {
  PdfSelectionLayer,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const panContainerRef = useRef<HTMLDivElement>(null);
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
  const [pageJumpInput, setPageJumpInput] = useState<string>('');
  const [pageJumpError, setPageJumpError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAiToolsOpen, setIsAiToolsOpen] = useState(false);
  const [isLessonQuizOpen, setIsLessonQuizOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [quizTargetLessons, setQuizTargetLessons] = useState<BookLesson[]>([]);
  const [summaryTargetLessons, setSummaryTargetLessons] = useState<BookLesson[]>([]);
  const [isOverlayEnabled, setIsOverlayEnabled] = useState(true);
  const [selectedElement, setSelectedElement] = useState<InteractiveElement | null>(null);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Region Selection Tool States (Strictly controlled by the Top Bar button)
  const [isSelectionModeEnabled, setIsSelectionModeEnabled] = useState<boolean>(false);
  const [selection, setSelection] = useState<SelectionRegion | null>(null);
  const [activeSelectionPage, setActiveSelectionPage] = useState<number>(book.currentPage || 1);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [nearbyText, setNearbyText] = useState<string>('');
  const [isSelectionPanelOpen, setIsSelectionPanelOpen] = useState(false);
  const [activeSelectionTool, setActiveSelectionTool] = useState<SelectionToolId>('simplify');
  const [selectionActionNonce, setSelectionActionNonce] = useState<number>(0);
  const [actionFeedbackToast, setActionFeedbackToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSelectionKeyRef = useRef<string>('');
  const lastSavedPageRef = useRef<number>(book.currentPage || 1);

  const showToastMessage = useCallback((msg: string, duration = 2600) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setActionFeedbackToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setActionFeedbackToast(null);
    }, duration);
  }, []);

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

  // Smooth scroll to a target page container
  const scrollToPage = useCallback((pageNum: number) => {
    const target = Math.max(1, Math.min(totalPages, pageNum));
    setCurrentPage((prev) => (prev !== target ? target : prev));
    const element = document.getElementById(`page-container-${target}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  }, [currentPage, scrollToPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      scrollToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, scrollToPage]);

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
      }, 250);
    }, 350);
  }, [handlePrevPage, handleNextPage, totalPages, stopContinuousPageScroll]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
      if (longPressIntervalRef.current) clearInterval(longPressIntervalRef.current);
    };
  }, []);

  /**
   * Helper to extract high quality cropped base64 image from 1 or multiple pages
   * (stitches multiple page slices vertically when selection crosses page boundaries)
   */
  const getSelectedCropBase64 = useCallback(
    (sel: SelectionRegion | null, fallbackPageNum: number): string => {
      if (!sel) return '';

      const slices =
        sel.pageSlices && sel.pageSlices.length > 0
          ? sel.pageSlices
          : [
              {
                pageNumber: sel.pageNumber || fallbackPageNum,
                xPct: sel.xPct,
                yPct: sel.yPct,
                widthPct: sel.widthPct,
                heightPct: sel.heightPct,
              },
            ];

      try {
        const validParts: Array<{
          canvas: HTMLCanvasElement;
          x: number;
          y: number;
          w: number;
          h: number;
        }> = [];

        for (const slice of slices) {
          const canvas = canvasMapRef.current.get(slice.pageNumber);
          if (!canvas) continue;

          // Add a 1.5% margin around the selection so edge Arabic glyphs/math symbols are never clipped
          const padX = Math.round(canvas.width * 0.015);
          const padY = Math.round(canvas.height * 0.015);
          const rawX = (slice.xPct / 100) * canvas.width;
          const rawY = (slice.yPct / 100) * canvas.height;
          const rawW = (slice.widthPct / 100) * canvas.width;
          const rawH = (slice.heightPct / 100) * canvas.height;

          const x = Math.max(0, rawX - padX);
          const y = Math.max(0, rawY - padY);
          const w = Math.min(canvas.width - x, rawW + padX * 2);
          const h = Math.min(canvas.height - y, rawH + padY * 2);

          if (w >= 8 && h >= 8) {
            validParts.push({ canvas, x, y, w, h });
          }
        }

        if (validParts.length === 0) return '';

        const totalRawWidth = Math.max(...validParts.map((p) => p.w));
        const totalRawHeight = validParts.reduce((acc, p) => acc + p.h, 0);

        const maxDim = 1500;
        const scaleFactor = Math.min(1, maxDim / Math.max(totalRawWidth, totalRawHeight));

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = Math.max(1, Math.round(totalRawWidth * scaleFactor));
        cropCanvas.height = Math.max(1, Math.round(totalRawHeight * scaleFactor));

        const ctx = cropCanvas.getContext('2d');
        if (!ctx) return '';

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

        let currentDestY = 0;
        for (const part of validParts) {
          const destW = Math.round(part.w * scaleFactor);
          const destH = Math.round(part.h * scaleFactor);
          ctx.drawImage(part.canvas, part.x, part.y, part.w, part.h, 0, currentDestY, destW, destH);
          currentDestY += destH;
        }

        return cropCanvas.toDataURL('image/jpeg', 0.9);
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
    setLoadError(null);

    const currentBook = bookRef.current;
    try {
      let data: ArrayBuffer | Uint8Array | string | null = null;

      if (currentBook.source === 'local') {
        data = await localDocumentStore.getDocumentData(currentBook.id);
        if (!data) {
          const generated = generateEducationalSamplePdf();
          data = generated.buffer as ArrayBuffer;
        }
      } else if ('pdfUrl' in currentBook && currentBook.pdfUrl) {
        data = currentBook.pdfUrl;
      } else {
        const generated = generateEducationalSamplePdf();
        data = generated.buffer as ArrayBuffer;
      }

      if (!data || (typeof data !== 'string' && data.byteLength === 0)) {
        throw new Error(t.viewer.invalidFileError);
      }

      if (typeof data !== 'string' && data.byteLength > 150 * 1024 * 1024) {
        throw new Error(t.viewer.fileTooLargeError);
      }

      const doc = await pdfService.loadDocument(data);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);

      // Restore saved page
      const initialPage = Math.min(Math.max(1, currentBook.currentPage || 1), doc.numPages);
      setCurrentPage(initialPage);
      setActiveSelectionPage(initialPage);

      // Extract Book Lessons (from curriculum database, outline, table of contents, or dynamic page scanning)
      const extractedLessons = await bookLessonsService.extractLessonsFromBook(currentBook, doc);
      setLessons(extractedLessons);
      const initialLesson = bookLessonsService.findLessonForPage(extractedLessons, initialPage);
      setActiveLesson(initialLesson);
    } catch (err: unknown) {
      console.error('Failed to load PDF', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Invalid PDF') || errMsg.includes('corrupted')) {
        setLoadError(t.viewer.invalidFileError);
      } else if (errMsg.includes('large') || errMsg.includes('memory')) {
        setLoadError(t.viewer.fileTooLargeError);
      } else {
        setLoadError(t.viewer.invalidFileError);
      }
    } finally {
      setIsLoadingDoc(false);
    }
  }, [book.id, t.viewer.invalidFileError, t.viewer.fileTooLargeError]);

  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  // Keep activeLesson synchronized with currentPage
  useEffect(() => {
    if (lessons.length > 0) {
      const match = bookLessonsService.findLessonForPage(lessons, currentPage);
      if (match) {
        setActiveLesson((prev) => (prev?.id !== match.id ? match : prev));
      }
    }
  }, [currentPage, lessons]);

  // Extract text and cropped image from selection region (Supports Single Page & Multi-Page Slices)
  useEffect(() => {
    let isCancelled = false;
    if (selection && pdfDoc && selection.widthPct > 0 && selection.heightPct > 0) {
      const endP = selection.endPageNumber || activeSelectionPage;
      const selKey = `${activeSelectionPage}-${endP}-${selection.xPct.toFixed(1)}-${selection.yPct.toFixed(1)}-${selection.widthPct.toFixed(1)}-${selection.heightPct.toFixed(1)}-${selection.docRect?.height?.toFixed(0) || 0}`;
      if (prevSelectionKeyRef.current === selKey) return;
      prevSelectionKeyRef.current = selKey;

      const slices =
        selection.pageSlices && selection.pageSlices.length > 0
          ? selection.pageSlices
          : [
              {
                pageNumber: selection.pageNumber || activeSelectionPage,
                xPct: selection.xPct,
                yPct: selection.yPct,
                widthPct: selection.widthPct,
                heightPct: selection.heightPct,
              },
            ];

      const cropBase64 = getSelectedCropBase64(selection, activeSelectionPage);
      if (cropBase64) {
        setSelectedImage((prev) => (prev !== cropBase64 ? cropBase64 : prev));
      } else if (slices.length > 0) {
        // Offscreen fallback if page canvas is not yet mounted in DOM
        pdfService
          .renderPageToDataUrl(pdfDoc, slices[0].pageNumber, slices[0], 1400)
          .then((fallbackUrl) => {
            if (!isCancelled && fallbackUrl) {
              setSelectedImage((prev) => (prev !== fallbackUrl ? fallbackUrl : prev));
            }
          });
      }

      Promise.all([
        Promise.all(
          slices.map((slice) => pdfService.extractTextFromRegion(pdfDoc, slice.pageNumber, slice))
        ),
        Promise.all(
          slices.map((slice) => {
            const nearbyRegion = {
              xPct: Math.max(0, slice.xPct - 12),
              yPct: Math.max(0, slice.yPct - 10),
              widthPct: Math.min(100 - Math.max(0, slice.xPct - 12), slice.widthPct + 24),
              heightPct: Math.min(100 - Math.max(0, slice.yPct - 10), slice.heightPct + 20),
            };
            return pdfService.extractTextFromRegion(pdfDoc, slice.pageNumber, nearbyRegion);
          })
        ),
      ]).then(([texts, surroundingList]) => {
        if (isCancelled) return;

        const combined = texts
          .map((txt) => txt.trim())
          .filter(Boolean)
          .join('\n\n');
        setSelectedText((prev) => (prev !== combined ? combined : prev));

        const combinedSurrounding = surroundingList
          .map((txt) => txt.trim())
          .filter(Boolean)
          .join('\n\n');
        setNearbyText((prev) => (prev !== combinedSurrounding ? combinedSurrounding : prev));
      });
    } else {
      if (prevSelectionKeyRef.current !== '') {
        prevSelectionKeyRef.current = '';
        setSelectedText((prev) => (prev !== '' ? '' : prev));
        setSelectedImage((prev) => (prev !== '' ? '' : prev));
        setNearbyText((prev) => (prev !== '' ? '' : prev));
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
        localDocumentStore.saveLastPage(book.id, currentPage);
        onUpdatePageNumber(book.id, currentPage);
      }
      const pageNotes = storageService.getNotes(book.id, currentPage);
      setNotes((prev) => {
        if (prev.length === 0 && pageNotes.length === 0) return prev;
        return pageNotes;
      });
    }
  }, [book.id, currentPage, onUpdatePageNumber]);

  // Clean up toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

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

  // Toggle Selection Tool Mode from the Top Toolbar
  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionModeEnabled((prev) => {
      const next = !prev;
      if (!next) {
        setSelection(null);
        setIsSelectionPanelOpen(false);
        showToastMessage(isRTL ? 'تم إيقاف أداة التحديد' : 'Selection tool disabled', 1800);
      } else {
        showToastMessage(
          isRTL
            ? 'أداة التحديد مفعّلة — اسحب بالمؤشر لتحديد جزء أو أكثر من ورقة'
            : 'Selection tool enabled — drag across one or more pages',
          2800
        );
      }
      return next;
    });
  }, [isRTL, showToastMessage]);

  // Selection actions
  const handleSelectionAction = useCallback(async (action: SelectionActionType, pageNum: number) => {
    let toolId: SelectionToolId = 'simplify';
    if (action === 'explain') toolId = 'stepByStep';
    else if (action === 'simplify') toolId = 'simplify';
    else if (action === 'translate') toolId = 'translate';
    else if (action === 'hint') toolId = 'hint';
    else if (action === 'quiz') toolId = 'quiz';
    else if (action === 'analyze') toolId = 'analyze';
    else if (action === 'explainFigure') toolId = 'explainFigure';

    setActiveSelectionPage(pageNum);

    if (selection) {
      const crop = getSelectedCropBase64(selection, pageNum);
      if (crop) {
        setSelectedImage(crop);
      } else if (pdfDoc) {
        pdfService
          .renderPageToDataUrl(pdfDoc, pageNum, selection, 1400)
          .then((url) => {
            if (url) setSelectedImage(url);
          });
      }
    }

    // Open panel and activate tool immediately for instant UI responsiveness
    setActiveSelectionTool(toolId);
    setIsSelectionPanelOpen(true);
    setSelectionActionNonce((n) => n + 1);

    if (selection && pdfDoc) {
      try {
        const slices =
          selection.pageSlices && selection.pageSlices.length > 0
            ? selection.pageSlices
            : [
                {
                  pageNumber: selection.pageNumber || pageNum,
                  xPct: selection.xPct,
                  yPct: selection.yPct,
                  widthPct: selection.widthPct,
                  heightPct: selection.heightPct,
                },
              ];
        const [texts, surroundingList] = await Promise.all([
          Promise.all(slices.map((s) => pdfService.extractTextFromRegion(pdfDoc, s.pageNumber, s))),
          Promise.all(
            slices.map((s) => {
              const nearbyRegion = {
                xPct: Math.max(0, s.xPct - 12),
                yPct: Math.max(0, s.yPct - 10),
                widthPct: Math.min(100 - Math.max(0, s.xPct - 12), s.widthPct + 24),
                heightPct: Math.min(100 - Math.max(0, s.yPct - 10), s.heightPct + 20),
              };
              return pdfService.extractTextFromRegion(pdfDoc, s.pageNumber, nearbyRegion);
            })
          ),
        ]);
        const joined = texts.map((t) => t.trim()).filter(Boolean).join('\n\n');
        if (joined) {
          setSelectedText((prev) => (prev !== joined ? joined : prev));
        }

        const joinedNearby = surroundingList.map((t) => t.trim()).filter(Boolean).join('\n\n');
        if (joinedNearby) {
          setNearbyText((prev) => (prev !== joinedNearby ? joinedNearby : prev));
        }
      } catch {
        // Ignore extraction errors and rely on image crop + lesson context
      }
    }
  }, [selection, pdfDoc, getSelectedCropBase64]);

  const handlePageIntersect = useCallback((pNum: number) => {
    setCurrentPage((prev) => (prev !== pNum ? pNum : prev));
  }, []);

  const handleSelectionChange = useCallback((sel: SelectionRegion | null, pNum?: number) => {
    setSelection(sel);
    if (pNum) {
      setActiveSelectionPage((prev) => (prev !== pNum ? pNum : prev));
    } else if (sel?.pageNumber) {
      setActiveSelectionPage((prev) => (prev !== sel.pageNumber ? sel.pageNumber! : prev));
    }
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
      const autoSelection: SelectionRegion = {
        xPct: 4,
        yPct: 6,
        widthPct: 92,
        heightPct: 88,
        pageNumber: currentPage,
        endPageNumber: currentPage,
      };
      setIsSelectionModeEnabled(true);
      setActiveSelectionPage(currentPage);
      setSelection(autoSelection);
      const crop = getSelectedCropBase64(autoSelection, currentPage);
      if (crop) {
        setSelectedImage(crop);
      } else if (pdfDoc) {
        pdfService
          .renderPageToDataUrl(pdfDoc, currentPage, autoSelection, 1400)
          .then((url) => {
            if (url) setSelectedImage(url);
          });
      }
      setIsSelectionPanelOpen(true);
      setSelectionActionNonce((n) => n + 1);
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

  const handleFitWidth = () => {
    if (!panContainerRef.current) return;
    const containerWidth = panContainerRef.current.clientWidth - 40;
    const newScale = containerWidth / 595;
    setScale(Math.max(0.5, Math.min(2.5, +newScale.toFixed(2))));
  };

  // Element Selection
  const handleSelectElement = useCallback((elem: InteractiveElement) => {
    setSelectedElement(elem);
    setIsAiToolsOpen(true);
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
      className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden relative select-none"
    >
      {/* ============================================================== */}
      {/* Top Application Header (Contains Controls & Horizontal Lessons) */}
      {/* ============================================================== */}
      <header className="shrink-0 z-20 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        {/* Row 1: Back, Title, Zoom/Fit Tools, Notes & Primary CTA */}
        <div className="px-3 sm:px-6 py-2 flex items-center justify-between gap-2.5">
          {/* Back & Book Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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

          {/* Right Toolbar: Zoom controls, Fit width, Region selection toggle, Notes & Noon Tools */}
          <div className="flex items-center gap-1 sm:gap-1.5">
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

            {/* Region Selection Tool Toggle Button (Works ONLY when active in top bar) */}
            <IconButton
              name="crop"
              iconSize="sm"
              variant={isSelectionModeEnabled ? 'primary' : 'outline'}
              active={isSelectionModeEnabled}
              label={isRTL ? 'تحديد جزء' : 'Select'}
              tooltip={
                isSelectionModeEnabled
                  ? isRTL
                    ? 'أداة التحديد مفعّلة (اضغط لإغلاق التحديد)'
                    : 'Selection active (Click to disable)'
                  : isRTL
                  ? 'تفعيل أداة التحديد لتحديد جزء أو أكثر من ورقة'
                  : 'Enable selection tool'
              }
              onClick={handleToggleSelectionMode}
              className={`px-3 min-h-[44px] transition-all ${
                isSelectionModeEnabled
                  ? 'ring-2 ring-indigo-400/80 shadow-sm'
                  : ''
              }`}
            >
              <span className="hidden lg:inline">
                {isRTL ? 'تحديد جزء' : 'Select'}
              </span>
            </IconButton>

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
              onClick={handleOpenNoonTools}
              className={`min-h-[44px] px-3.5 sm:px-4 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs font-bold transition-all shadow-xs active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isSelectionPanelOpen
                  ? 'bg-indigo-700 text-white ring-2 ring-indigo-400'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <AppIcon name="sparkles" size="sm" />
              <span>{t.viewer.noonTools}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Horizontal Scrollable Lessons Bar */}
        <div className="px-3 sm:px-6 py-1.5 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <LessonsBar
            lessons={lessons}
            activeLesson={activeLesson}
            currentPage={currentPage}
            selectedLessonIds={selectedLessonIds}
            onToggleLessonSelect={handleToggleLessonSelect}
            onSelectLesson={handleSelectLesson}
            onStartQuiz={handleStartQuiz}
            onStartSummary={handleStartSummary}
          />
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

          {/* Load Error Card */}
          {loadError ? (
            <div className="bg-white border border-red-200 rounded-3xl p-8 max-w-md mx-auto text-center shadow-lg my-12">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AppIcon name="alert" size="xl" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-display">تعذر قراءة ملف PDF</h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed font-sans">{loadError}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={loadPdf}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center gap-2 active:scale-[0.98] motion-reduce:transform-none"
                >
                  <AppIcon name="refresh" size="sm" />
                  <span>إعادة المحاولة</span>
                </button>
                <button
                  type="button"
                  onClick={onBackToLibrary}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors active:scale-[0.98] motion-reduce:transform-none"
                >
                  العودة للمكتبة
                </button>
              </div>
            </div>
          ) : (
            /* Continuous Vertical List of Book Pages + Cross-Page Selection Layer */
            pdfDoc && (
              <div className="relative flex flex-col items-center w-fit max-w-full mx-auto pb-16">
                {pageList.map((pageNum) => (
                  <PdfPageView
                    key={pageNum}
                    doc={pdfDoc}
                    pageNumber={pageNum}
                    scale={scale}
                    isSelectionModeEnabled={isSelectionModeEnabled}
                    selectedElementId={selectedElement?.id || null}
                    onSelectElement={handleSelectElement}
                    isOverlayEnabled={isOverlayEnabled}
                    onPageIntersect={handlePageIntersect}
                    setCanvasRef={handleSetCanvasRef}
                  />
                ))}

                {/* Unified Cross-Page Selection Layer (Active ONLY when top-bar selection button is enabled) */}
                <PdfSelectionLayer
                  pageNumber={activeSelectionPage || currentPage}
                  selection={selection}
                  onSelectionChange={handleSelectionChange}
                  onActionClick={handleActionClick}
                  isEnabled={isSelectionModeEnabled}
                  scrollContainerRef={panContainerRef}
                />
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
            actionTrigger={selectionActionNonce}
            onSelectTool={(toolId) => {
              setActiveSelectionTool(toolId);
              setSelectionActionNonce((n) => n + 1);
            }}
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

      {/* Gemini Student Lesson Quiz Modal (Single Lesson or Multiple Lessons) */}
      <LessonQuizModal
        isOpen={isLessonQuizOpen}
        onClose={() => setIsLessonQuizOpen(false)}
        allLessons={lessons}
        initialLesson={quizTargetLessons[0] || activeLesson}
        onJumpToPage={(pNum) => scrollToPage(pNum)}
        onQuizCompleted={onQuizCompleted}
      />

      {/* Gemini Student Lesson Summary Modal (Single Lesson or Multiple Lessons) */}
      <LessonSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        selectedLessons={summaryTargetLessons}
        bookTitle={book.title}
        pdfDoc={pdfDoc}
        onJumpToPage={(pNum) => scrollToPage(pNum)}
      />

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
