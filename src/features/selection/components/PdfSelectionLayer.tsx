import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  Lightbulb,
  CheckSquare,
  Calculator,
  Layers,
  Languages,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Check,
  X,
  Move,
  FileStack,
} from 'lucide-react';
import { SelectionRegion, SelectionActionType, PageSliceRegion } from '../types';
import {
  selectionToolsConfigService,
  StudentSelectionToolsPreferences,
  SelectionMenuToolDefinition,
} from '../selectionToolsConfig';

export interface PdfSelectionLayerProps {
  pageNumber?: number;
  pageWidth?: number;
  pageHeight?: number;
  selection: SelectionRegion | null;
  onSelectionChange: (selection: SelectionRegion | null, primaryPage?: number) => void;
  onActionClick: (action: SelectionActionType, primaryPage: number) => void;
  isEnabled?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  isCustomizingExternal?: boolean;
  onCloseCustomizingExternal?: () => void;
}

type DragMode =
  | 'none'
  | 'creating'
  | 'moving'
  | 'resize-nw'
  | 'resize-n'
  | 'resize-ne'
  | 'resize-w'
  | 'resize-e'
  | 'resize-sw'
  | 'resize-s'
  | 'resize-se';

interface DocRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const getToolIcon = (action: SelectionActionType, className: string) => {
  switch (action) {
    case 'explain':
      return <BookOpen className={className} />;
    case 'simplify':
      return <Sparkles className={className} />;
    case 'translate':
      return <Languages className={className} />;
    case 'hint':
      return <Lightbulb className={className} />;
    case 'quiz':
      return <CheckSquare className={className} />;
    case 'analyze':
      return <Calculator className={className} />;
    case 'explainFigure':
      return <Layers className={className} />;
    default:
      return <Sparkles className={className} />;
  }
};

export const PdfSelectionLayer: React.FC<PdfSelectionLayerProps> = ({
  pageNumber = 1,
  pageWidth = 595,
  pageHeight = 842,
  selection,
  onSelectionChange,
  onActionClick,
  isEnabled = false,
  scrollContainerRef,
  isCustomizingExternal = false,
  onCloseCustomizingExternal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStartDoc, setDragStartDoc] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialDocRect, setInitialDocRect] = useState<DocRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [draftSelection, setDraftSelection] = useState<SelectionRegion | null>(null);

  // Student's customizable vertical menu preferences
  const [toolPrefs, setToolPrefs] = useState<StudentSelectionToolsPreferences>(() =>
    selectionToolsConfigService.getPreferences()
  );
  const [isCustomizingMenu, setIsCustomizingMenu] = useState<boolean>(false);

  useEffect(() => {
    if (isCustomizingExternal) {
      setIsCustomizingMenu(true);
    }
  }, [isCustomizingExternal]);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  /**
   * Finds all rendered page frames (`[data-page-frame]`) inside the document wrapper
   * and returns their bounding boxes relative to `containerRef`.
   */
  const getPageFrameBoxes = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [];

    const containerRect = container.getBoundingClientRect();
    const frameElements = container.parentElement
      ? Array.from(container.parentElement.querySelectorAll<HTMLElement>('[data-page-frame]'))
      : [];

    if (frameElements.length === 0) {
      // Fallback single-page frame
      return [
        {
          pageNumber,
          left: 0,
          top: 0,
          width: pageWidth || containerRect.width || 595,
          height: pageHeight || containerRect.height || 842,
          right: pageWidth || containerRect.width || 595,
          bottom: pageHeight || containerRect.height || 842,
        },
      ];
    }

    return frameElements
      .map((el) => {
        const pNum = parseInt(el.getAttribute('data-page-frame') || '1', 10);
        const r = el.getBoundingClientRect();
        const left = r.left - containerRect.left;
        const top = r.top - containerRect.top;
        return {
          pageNumber: pNum,
          left,
          top,
          width: r.width,
          height: r.height,
          right: left + r.width,
          bottom: top + r.height,
        };
      })
      .sort((a, b) => a.pageNumber - b.pageNumber);
  }, [pageNumber, pageWidth, pageHeight]);

  /**
   * Converts a continuous document rectangle (`DocRect`) into a `SelectionRegion`
   * that can span 1 or multiple pages seamlessly.
   */
  const buildSelectionFromDocRect = useCallback(
    (rect: DocRect): SelectionRegion | null => {
      const frames = getPageFrameBoxes();
      if (frames.length === 0) return null;

      // Constrain horizontal bounds to the horizontal paper area of pages
      const minPageLeft = Math.min(...frames.map((f) => f.left));
      const maxPageRight = Math.max(...frames.map((f) => f.right));
      const minPageTop = Math.min(...frames.map((f) => f.top));
      const maxPageBottom = Math.max(...frames.map((f) => f.bottom));

      const clampedX = clamp(rect.x, minPageLeft, maxPageRight - 4);
      const clampedY = clamp(rect.y, minPageTop, maxPageBottom - 4);
      const clampedW = clamp(rect.width, 0, maxPageRight - clampedX);
      const clampedH = clamp(rect.height, 0, maxPageBottom - clampedY);

      const finalDocRect: DocRect = {
        x: clampedX,
        y: clampedY,
        width: clampedW,
        height: clampedH,
      };

      const selRight = finalDocRect.x + finalDocRect.width;
      const selBottom = finalDocRect.y + finalDocRect.height;

      const slices: PageSliceRegion[] = [];

      for (const frame of frames) {
        const ix0 = Math.max(finalDocRect.x, frame.left);
        const iy0 = Math.max(finalDocRect.y, frame.top);
        const ix1 = Math.min(selRight, frame.right);
        const iy1 = Math.min(selBottom, frame.bottom);

        if (ix1 > ix0 && iy1 > iy0 && frame.width > 0 && frame.height > 0) {
          slices.push({
            pageNumber: frame.pageNumber,
            xPct: clamp(((ix0 - frame.left) / frame.width) * 100, 0, 100),
            yPct: clamp(((iy0 - frame.top) / frame.height) * 100, 0, 100),
            widthPct: clamp(((ix1 - ix0) / frame.width) * 100, 0, 100),
            heightPct: clamp(((iy1 - iy0) / frame.height) * 100, 0, 100),
          });
        }
      }

      // If dragged inside a gap between pages, anchor to nearest page
      if (slices.length === 0) {
        const nearest =
          frames.find((f) => finalDocRect.y >= f.top && finalDocRect.y <= f.bottom) || frames[0];
        const xPct = clamp(((finalDocRect.x - nearest.left) / nearest.width) * 100, 0, 100);
        const yPct = clamp(((finalDocRect.y - nearest.top) / nearest.height) * 100, 0, 100);
        const widthPct = clamp((finalDocRect.width / nearest.width) * 100, 0, 100 - xPct);
        const heightPct = clamp((finalDocRect.height / nearest.height) * 100, 0, 100 - yPct);

        return {
          pageNumber: nearest.pageNumber,
          endPageNumber: nearest.pageNumber,
          xPct,
          yPct,
          widthPct,
          heightPct,
          pageSlices: [
            {
              pageNumber: nearest.pageNumber,
              xPct,
              yPct,
              widthPct,
              heightPct,
            },
          ],
          docRect: finalDocRect,
        };
      }

      const firstSlice = slices[0];
      const lastSlice = slices[slices.length - 1];

      return {
        pageNumber: firstSlice.pageNumber,
        endPageNumber: lastSlice.pageNumber,
        xPct: firstSlice.xPct,
        yPct: firstSlice.yPct,
        widthPct: firstSlice.widthPct,
        heightPct: firstSlice.heightPct,
        pageSlices: slices,
        docRect: finalDocRect,
      };
    },
    [getPageFrameBoxes]
  );

  const activeSelection = dragMode !== 'none' && draftSelection ? draftSelection : selection;

  /**
   * Computes pixel rectangle (`DocRect`) for rendering the selection box across 1 or more pages.
   */
  const getPixelRect = useCallback(
    (targetSel: SelectionRegion | null = activeSelection): DocRect | null => {
      if (!targetSel) return null;
      if (targetSel.docRect && targetSel.docRect.width >= 0 && targetSel.docRect.height >= 0) {
        return targetSel.docRect;
      }

      const frames = getPageFrameBoxes();
      if (targetSel.pageSlices && targetSel.pageSlices.length > 0 && frames.length > 0) {
        const firstSlice = targetSel.pageSlices[0];
        const lastSlice = targetSel.pageSlices[targetSel.pageSlices.length - 1];
        const firstFrame = frames.find((f) => f.pageNumber === firstSlice.pageNumber) || frames[0];
        const lastFrame = frames.find((f) => f.pageNumber === lastSlice.pageNumber) || firstFrame;

        const x0 = firstFrame.left + (firstSlice.xPct / 100) * firstFrame.width;
        const y0 = firstFrame.top + (firstSlice.yPct / 100) * firstFrame.height;
        const x1 =
          lastFrame.left + ((lastSlice.xPct + lastSlice.widthPct) / 100) * lastFrame.width;
        const y1 =
          lastFrame.top + ((lastSlice.yPct + lastSlice.heightPct) / 100) * lastFrame.height;

        return {
          x: x0,
          y: y0,
          width: Math.max(0, x1 - x0),
          height: Math.max(0, y1 - y0),
        };
      }

      const x = (targetSel.xPct / 100) * pageWidth;
      const y = (targetSel.yPct / 100) * pageHeight;
      const width = (targetSel.widthPct / 100) * pageWidth;
      const height = (targetSel.heightPct / 100) * pageHeight;
      return { x, y, width, height };
    },
    [activeSelection, getPageFrameBoxes, pageWidth, pageHeight]
  );

  // Convert client pointer coordinates to document-relative coordinates
  const clientToDocCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Auto-scroll viewport when dragging near top or bottom edges so user can easily select across multiple pages
  const maybeAutoScroll = (clientY: number) => {
    const scrollEl = scrollContainerRef?.current;
    if (!scrollEl) return;

    const viewportRect = scrollEl.getBoundingClientRect();
    const edgeThreshold = 75;
    const maxScrollStep = 22;

    if (clientY > viewportRect.bottom - edgeThreshold) {
      const intensity = Math.min(
        1,
        (clientY - (viewportRect.bottom - edgeThreshold)) / edgeThreshold
      );
      scrollEl.scrollTop += Math.round(maxScrollStep * intensity);
    } else if (clientY < viewportRect.top + edgeThreshold) {
      const intensity = Math.min(
        1,
        (viewportRect.top + edgeThreshold - clientY) / edgeThreshold
      );
      scrollEl.scrollTop -= Math.round(maxScrollStep * intensity);
    }
  };

  // Pointer Down on Document Overlay (Start Creating New Selection)
  const handlePagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Strictly do nothing if selection tool in top bar is disabled
    if (!isEnabled || !containerRef.current) return;
    if (e.button !== 0) return;

    const frames = getPageFrameBoxes();
    const pt = clientToDocCoords(e.clientX, e.clientY);

    // Ensure click starts within or near the horizontal page column
    if (frames.length > 0) {
      const minLeft = Math.min(...frames.map((f) => f.left)) - 24;
      const maxRight = Math.max(...frames.map((f) => f.right)) + 24;
      if (pt.x < minLeft || pt.x > maxRight) return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsCustomizingMenu(false);

    const startRect: DocRect = { x: pt.x, y: pt.y, width: 0, height: 0 };
    setDragMode('creating');
    setDragStartDoc(pt);
    setInitialDocRect(startRect);

    const built = buildSelectionFromDocRect(startRect);
    if (built) {
      setDraftSelection(built);
    }
  };

  // Pointer Down on existing rectangle (Moving across pages)
  const handleMovePointerDown = (e: React.PointerEvent) => {
    if (!isEnabled || !selection || !containerRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const currentPixelRect = getPixelRect(selection);
    if (!currentPixelRect) return;

    const pt = clientToDocCoords(e.clientX, e.clientY);
    setDragMode('moving');
    setDragStartDoc(pt);
    setInitialDocRect(currentPixelRect);
    setDraftSelection(selection);
  };

  // Pointer Down on Resize Handle (Resizing across pages)
  const handleResizePointerDown = (mode: DragMode, e: React.PointerEvent) => {
    if (!isEnabled || !selection || !containerRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const currentPixelRect = getPixelRect(selection);
    if (!currentPixelRect) return;

    const pt = clientToDocCoords(e.clientX, e.clientY);
    setDragMode(mode);
    setDragStartDoc(pt);
    setInitialDocRect(currentPixelRect);
    setDraftSelection(selection);
  };

  // Pointer Move (Creating, Moving, or Resizing across 1 or more pages)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMode === 'none' || !containerRef.current || !isEnabled) return;

    // Auto-scroll when dragging near top/bottom of viewport to allow seamless multi-page selection
    maybeAutoScroll(e.clientY);

    const pt = clientToDocCoords(e.clientX, e.clientY);

    if (dragMode === 'creating') {
      const left = Math.min(dragStartDoc.x, pt.x);
      const top = Math.min(dragStartDoc.y, pt.y);
      const width = Math.abs(pt.x - dragStartDoc.x);
      const height = Math.abs(pt.y - dragStartDoc.y);

      const built = buildSelectionFromDocRect({ x: left, y: top, width, height });
      if (built) {
        setDraftSelection(built);
      }
      return;
    }

    if (dragMode === 'moving') {
      const dx = pt.x - dragStartDoc.x;
      const dy = pt.y - dragStartDoc.y;

      const built = buildSelectionFromDocRect({
        x: initialDocRect.x + dx,
        y: initialDocRect.y + dy,
        width: initialDocRect.width,
        height: initialDocRect.height,
      });
      if (built) {
        setDraftSelection(built);
      }
      return;
    }

    // Resizing modes (can extend across multiple pages freely)
    const dx = pt.x - dragStartDoc.x;
    const dy = pt.y - dragStartDoc.y;
    const minPx = 24;

    let x = initialDocRect.x;
    let y = initialDocRect.y;
    let w = initialDocRect.width;
    let h = initialDocRect.height;

    if (dragMode.includes('e')) {
      w = Math.max(minPx, initialDocRect.width + dx);
    }
    if (dragMode.includes('s')) {
      h = Math.max(minPx, initialDocRect.height + dy);
    }
    if (dragMode.includes('w')) {
      const right = initialDocRect.x + initialDocRect.width;
      x = Math.min(initialDocRect.x + dx, right - minPx);
      w = right - x;
    }
    if (dragMode.includes('n')) {
      const bottom = initialDocRect.y + initialDocRect.height;
      y = Math.min(initialDocRect.y + dy, bottom - minPx);
      h = bottom - y;
    }

    const built = buildSelectionFromDocRect({ x, y, width: w, height: h });
    if (built) {
      setDraftSelection(built);
    }
  };

  // Pointer Up / Release — Commit selection once when user releases the pointer
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMode === 'none') return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release capture errors
    }

    const finalSel = draftSelection || selection;
    const pixelRect = getPixelRect(finalSel);

    setDragMode('none');
    setDraftSelection(null);

    if (!finalSel || !pixelRect || pixelRect.width < 18 || pixelRect.height < 18) {
      onSelectionChange(null, pageNumber);
    } else {
      onSelectionChange(finalSel, finalSel.pageNumber);
    }
  };

  const pixelRect = getPixelRect(activeSelection);

  // Compute Vertical Floating Menu Position (next to or inside selection box, always within visible viewport)
  const getVerticalMenuPosition = () => {
    if (!pixelRect || !containerRef.current) {
      return { top: 0, left: 0 };
    }

    const wrapperWidth = containerRef.current.clientWidth || pageWidth || 600;
    const wrapperHeight = containerRef.current.clientHeight || pageHeight || 900;
    const menuWidth = isCustomizingMenu ? 260 : 195;
    const estimatedMenuHeight = isCustomizingMenu ? 380 : 330;
    const gap = 12;

    // Prefer placing the vertical menu to the left of the selection box (for RTL ergonomics) or right if no room on left,
    // or inside/beside the selection box if selection spans full page width.
    let left = pixelRect.x - menuWidth - gap;
    if (left < 12) {
      const rightCandidate = pixelRect.x + pixelRect.width + gap;
      if (rightCandidate + menuWidth <= wrapperWidth - 12) {
        left = rightCandidate;
      } else {
        left = clamp(pixelRect.x + 12, 12, Math.max(12, wrapperWidth - menuWidth - 12));
      }
    }

    // Align vertically starting from the top of the selection box, clamped to the currently visible scroll viewport
    let minVisibleTop = 12;
    let maxVisibleTop = Math.max(12, wrapperHeight - estimatedMenuHeight - 16);

    const scrollEl = scrollContainerRef?.current;
    if (scrollEl && containerRef.current) {
      const scrollRect = scrollEl.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const viewportTopInContainer = Math.max(0, scrollRect.top - containerRect.top + 8);
      const viewportBottomInContainer = Math.min(
        wrapperHeight,
        scrollRect.bottom - containerRect.top - 8
      );
      if (viewportBottomInContainer - viewportTopInContainer > estimatedMenuHeight) {
        minVisibleTop = viewportTopInContainer;
        maxVisibleTop = viewportBottomInContainer - estimatedMenuHeight;
      } else {
        minVisibleTop = viewportTopInContainer;
        maxVisibleTop = Math.max(viewportTopInContainer, wrapperHeight - estimatedMenuHeight - 12);
      }
    }

    const top = clamp(pixelRect.y, minVisibleTop, maxVisibleTop);

    return { top, left };
  };

  const menuPos = getVerticalMenuPosition();

  const isSelectionCommitted =
    isEnabled &&
    selection &&
    pixelRect &&
    pixelRect.width >= 18 &&
    pixelRect.height >= 18 &&
    dragMode === 'none';

  // Build ordered list of all tools and enabled tools
  const allToolsMap = new Map<SelectionActionType, SelectionMenuToolDefinition>(
    selectionToolsConfigService.getAllTools().map((t) => [t.action, t])
  );

  const orderedToolDefs = toolPrefs.orderedActions
    .map((action) => allToolsMap.get(action))
    .filter((t): t is SelectionMenuToolDefinition => Boolean(t));

  const visibleTools = orderedToolDefs.filter((t) =>
    toolPrefs.enabledActions.includes(t.action)
  );

  const handleToggleTool = (action: SelectionActionType) => {
    const updated = selectionToolsConfigService.toggleTool(action);
    setToolPrefs(updated);
  };

  const handleMoveTool = (action: SelectionActionType, direction: 'up' | 'down') => {
    const updated = selectionToolsConfigService.moveToolOrder(action, direction);
    setToolPrefs(updated);
  };

  const handleResetTools = () => {
    const updated = selectionToolsConfigService.resetToDefaults();
    setToolPrefs(updated);
  };

  const primaryPage = selection?.pageNumber || pageNumber;
  const endPage = selection?.endPageNumber || primaryPage;
  const isMultiPage = endPage !== primaryPage;

  // If selection mode is disabled in the top toolbar, disable pointer events completely
  if (!isEnabled) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePagePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="absolute inset-0 z-30 touch-none select-none cursor-crosshair pointer-events-auto"
    >
      {/* Selected Box Layer (Supports Single Page & Multi-Page Crossing) */}
      {pixelRect && pixelRect.width > 2 && pixelRect.height > 2 && (
        <div
          onPointerDown={handleMovePointerDown}
          className={`absolute transition-shadow duration-75 border-2 border-indigo-600 bg-indigo-500/15 shadow-lg rounded-sm ${
            dragMode === 'moving' ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            left: `${pixelRect.x}px`,
            top: `${pixelRect.y}px`,
            width: `${pixelRect.width}px`,
            height: `${pixelRect.height}px`,
          }}
        >
          <div className="absolute inset-0 ring-1 ring-white/70 pointer-events-none" />

          {/* Multi-Page Badge inside top-right of selection box when spanning >1 page */}
          {isMultiPage && (
            <div className="absolute top-2 right-2 z-20 pointer-events-none flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
              <FileStack className="w-3 h-3" />
              <span>
                عبر صفحات {primaryPage} إلى {endPage}
              </span>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            <span className="p-1.5 rounded-lg bg-slate-900/80 text-white shadow-sm">
              <Move className="w-4 h-4" />
            </span>
          </div>

          {/* 8 Drag / Resize Handles */}
          <div
            onPointerDown={(e) => handleResizePointerDown('resize-nw', e)}
            className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nwse-resize z-30 hover:scale-125 transition-transform"
            title="تغيير الحجم"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('resize-n', e)}
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ns-resize z-30 hover:scale-125 transition-transform"
            title="توسيع للأعلى (يمكن تجاوز الصفحة)"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('resize-ne', e)}
            className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nesw-resize z-30 hover:scale-125 transition-transform"
            title="تغيير الحجم"
          />

          <div
            onPointerDown={(e) => handleResizePointerDown('resize-w', e)}
            className="absolute top-1/2 -left-2 -translate-y-1/2 w-3.5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ew-resize z-30 hover:scale-125 transition-transform"
            title="تغيير العرض"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('resize-e', e)}
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ew-resize z-30 hover:scale-125 transition-transform"
            title="تغيير العرض"
          />

          <div
            onPointerDown={(e) => handleResizePointerDown('resize-sw', e)}
            className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nesw-resize z-30 hover:scale-125 transition-transform"
            title="تغيير الحجم"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('resize-s', e)}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ns-resize z-30 hover:scale-125 transition-transform"
            title="توسيع للأسفل (يمكن تجاوز الصفحة لورقة أخرى)"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('resize-se', e)}
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nwse-resize z-30 hover:scale-125 transition-transform"
            title="تغيير الحجم"
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* VERTICAL Floating Tools Menu (Appears upon releasing the pointer) */}
      {/* ================================================================= */}
      {isSelectionCommitted && pixelRect && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-40 animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
          }}
        >
          <div
            dir="rtl"
            className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/90 p-2 flex flex-col gap-1 ring-1 ring-black/25 min-w-[188px] max-w-[265px]"
          >
            {/* Menu Top Header: Page Indicator + Close Selection */}
            <div className="flex items-center justify-between gap-2 px-2 py-1 border-b border-slate-800/90 mb-0.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span>
                  {isMultiPage
                    ? `صفحات ${primaryPage} - ${endPage}`
                    : `صفحة ${primaryPage}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCustomizingMenu(false);
                  onCloseCustomizingExternal?.();
                  onSelectionChange(null, primaryPage);
                }}
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 flex items-center justify-center transition-colors"
                title="إلغاء التحديد"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {!isCustomizingMenu ? (
              /* 1. Normal Vertical Tools List */
              <>
                <div className="flex flex-col gap-1">
                  {visibleTools.map((tool) => (
                    <button
                      key={tool.action}
                      type="button"
                      onClick={() => onActionClick(tool.action, primaryPage)}
                      className="w-full min-h-[38px] px-3 py-2 rounded-xl hover:bg-slate-800/95 active:bg-slate-800 text-slate-100 hover:text-white flex items-center justify-between gap-2.5 text-xs font-bold transition-all active:scale-[0.98]"
                      title={tool.descAr}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getToolIcon(tool.action, `w-4 h-4 shrink-0 ${tool.iconColorClass}`)}
                        <span className="truncate">{tool.labelAr}</span>
                      </div>
                      {tool.badgeAr && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/30 shrink-0">
                          {tool.badgeAr}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Divider & Customize Tools Button */}
                <div className="border-t border-slate-800/90 mt-1 pt-1 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCustomizingMenu(true)}
                    className="w-full min-h-[34px] px-2.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors"
                    title="تخصيص الأدوات التي تظهر عند إفلات المؤشر"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>تخصيص الأدوات</span>
                  </button>
                </div>
              </>
            ) : (
              /* 2. Inline Tool Customization Panel inside the Vertical Menu */
              <div className="flex flex-col gap-2 pt-1 w-[245px]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-extrabold text-indigo-300">
                    اختر ورتّب أدوات القائمة العمودية:
                  </span>
                  <button
                    type="button"
                    onClick={handleResetTools}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-slate-800 transition-colors"
                    title="استعادة الترتيب والأدوات الافتراضية"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>افتراضي</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1 max-h-[230px] overflow-y-auto pr-0.5">
                  {orderedToolDefs.map((tool, idx) => {
                    const isChecked = toolPrefs.enabledActions.includes(tool.action);
                    const isLastEnabled =
                      isChecked && toolPrefs.enabledActions.length <= 1;

                    return (
                      <div
                        key={tool.action}
                        className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl border transition-colors ${
                          isChecked
                            ? 'bg-slate-800/90 border-slate-700 text-white'
                            : 'bg-slate-900/50 border-slate-800/70 text-slate-500'
                        }`}
                      >
                        <button
                          type="button"
                          disabled={isLastEnabled}
                          onClick={() => handleToggleTool(tool.action)}
                          className="flex items-center gap-2 flex-1 min-w-0 text-right disabled:opacity-60"
                        >
                          <span
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'border-slate-600 bg-slate-800 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </span>
                          {getToolIcon(
                            tool.action,
                            `w-3.5 h-3.5 shrink-0 ${
                              isChecked ? tool.iconColorClass : 'text-slate-500'
                            }`
                          )}
                          <div className="truncate">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              {tool.labelAr}
                            </div>
                            {tool.action === 'translate' && (
                              <div className="text-[9px] text-sky-300/90 leading-tight">
                                تلقائي ← اللغة العربية
                              </div>
                            )}
                          </div>
                        </button>

                        {/* Up / Down Order Controls */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveTool(tool.action, 'up')}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-25"
                            title="تحريك للأعلى"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === orderedToolDefs.length - 1}
                            onClick={() => handleMoveTool(tool.action, 'down')}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-25"
                            title="تحريك للأسفل"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Translation Language Info Box */}
                <div className="px-2.5 py-2 rounded-xl bg-sky-950/50 border border-sky-800/50 text-[10px] text-sky-200 leading-relaxed">
                  <div className="font-bold text-sky-300 mb-0.5 flex items-center gap-1">
                    <Languages className="w-3 h-3" />
                    <span>إعدادات أداة الترجمة:</span>
                  </div>
                  تترجم تلقائياً من اللغة المحددة بالمؤشر إلى <strong>اللغة العربية</strong> (وقابلة لإضافة لغات أخرى من لوحة التحكم).
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCustomizingMenu(false);
                    onCloseCustomizingExternal?.();
                  }}
                  className="w-full min-h-[34px] py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                >
                  تم الحفظ والعودة للقائمة
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfSelectionLayer;
