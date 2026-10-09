import React, { useState, useRef, useCallback } from 'react';
import {
  BookOpen,
  Sparkles,
  Lightbulb,
  CheckSquare,
  Calculator,
  Layers,
  X,
  Move,
} from 'lucide-react';
import { SelectionRegion, SelectionActionType } from '../types';

export interface PdfSelectionLayerProps {
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  selection: SelectionRegion | null;
  onSelectionChange: (selection: SelectionRegion | null) => void;
  onActionClick: (action: SelectionActionType) => void;
  isEnabled?: boolean;
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

export const PdfSelectionLayer: React.FC<PdfSelectionLayerProps> = ({
  pageNumber,
  pageWidth,
  pageHeight,
  selection,
  onSelectionChange,
  onActionClick,
  isEnabled = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialRect, setInitialRect] = useState<{
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
  }>({ xPct: 0, yPct: 0, wPct: 0, hPct: 0 });

  // Convert normalized percentages to pixels
  const getPixelRect = useCallback(() => {
    if (!selection) return null;
    const x = (selection.xPct / 100) * pageWidth;
    const y = (selection.yPct / 100) * pageHeight;
    const w = (selection.widthPct / 100) * pageWidth;
    const h = (selection.heightPct / 100) * pageHeight;
    return { x, y, w, h };
  }, [selection, pageWidth, pageHeight]);

  // Clamping helper
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  // Pointer Down on Page (Start Creating New Selection or Clear)
  const handlePagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEnabled || !containerRef.current) return;

    // Only respond to primary click / single touch
    if (e.button !== 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    // Capture pointer
    e.currentTarget.setPointerCapture(e.pointerId);

    const startXPct = clamp((startX / pageWidth) * 100, 0, 100);
    const startYPct = clamp((startY / pageHeight) * 100, 0, 100);

    setDragMode('creating');
    setDragStart({ x: startX, y: startY });
    setInitialRect({ xPct: startXPct, yPct: startYPct, wPct: 0, hPct: 0 });

    // Initial draft selection
    onSelectionChange({
      pageNumber,
      xPct: startXPct,
      yPct: startYPct,
      widthPct: 0,
      heightPct: 0,
    });
  };

  // Pointer Down on existing rectangle (Moving)
  const handleMovePointerDown = (e: React.PointerEvent) => {
    if (!isEnabled || !selection || !containerRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    setDragMode('moving');
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialRect({
      xPct: selection.xPct,
      yPct: selection.yPct,
      wPct: selection.widthPct,
      hPct: selection.heightPct,
    });
  };

  // Pointer Down on Resize Handle
  const handleResizePointerDown = (mode: DragMode, e: React.PointerEvent) => {
    if (!isEnabled || !selection || !containerRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    setDragMode(mode);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialRect({
      xPct: selection.xPct,
      yPct: selection.yPct,
      wPct: selection.widthPct,
      hPct: selection.heightPct,
    });
  };

  // Pointer Move (handles creating, moving, and resizing)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMode === 'none' || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (dragMode === 'creating') {
      const leftPx = Math.min(dragStart.x, currentX);
      const topPx = Math.min(dragStart.y, currentY);
      const widthPx = Math.abs(currentX - dragStart.x);
      const heightPx = Math.abs(currentY - dragStart.y);

      const xPct = clamp((leftPx / pageWidth) * 100, 0, 100);
      const yPct = clamp((topPx / pageHeight) * 100, 0, 100);
      const widthPct = clamp((widthPx / pageWidth) * 100, 0, 100 - xPct);
      const heightPct = clamp((heightPx / pageHeight) * 100, 0, 100 - yPct);

      onSelectionChange({
        pageNumber,
        xPct,
        yPct,
        widthPct,
        heightPct,
      });
      return;
    }

    if (dragMode === 'moving') {
      const dxPx = e.clientX - dragStart.x;
      const dyPx = e.clientY - dragStart.y;

      const dxPct = (dxPx / pageWidth) * 100;
      const dyPct = (dyPx / pageHeight) * 100;

      const newXPct = clamp(initialRect.xPct + dxPct, 0, 100 - initialRect.wPct);
      const newYPct = clamp(initialRect.yPct + dyPct, 0, 100 - initialRect.hPct);

      onSelectionChange({
        pageNumber,
        xPct: newXPct,
        yPct: newYPct,
        widthPct: initialRect.wPct,
        heightPct: initialRect.hPct,
      });
      return;
    }

    // Resizing modes
    const dxPx = e.clientX - dragStart.x;
    const dyPx = e.clientY - dragStart.y;
    const dxPct = (dxPx / pageWidth) * 100;
    const dyPct = (dyPx / pageHeight) * 100;

    const minPct = 2.5;
    let x = initialRect.xPct;
    let y = initialRect.yPct;
    let w = initialRect.wPct;
    let h = initialRect.hPct;

    if (dragMode.includes('e')) {
      w = clamp(initialRect.wPct + dxPct, minPct, 100 - x);
    }
    if (dragMode.includes('s')) {
      h = clamp(initialRect.hPct + dyPct, minPct, 100 - y);
    }
    if (dragMode.includes('w')) {
      const right = initialRect.xPct + initialRect.wPct;
      x = clamp(initialRect.xPct + dxPct, 0, right - minPct);
      w = right - x;
    }
    if (dragMode.includes('n')) {
      const bottom = initialRect.yPct + initialRect.hPct;
      y = clamp(initialRect.yPct + dyPct, 0, bottom - minPct);
      h = bottom - y;
    }

    onSelectionChange({
      pageNumber,
      xPct: x,
      yPct: y,
      widthPct: w,
      heightPct: h,
    });
  };

  // Pointer Up / End
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMode === 'none') return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release capture errors
    }

    if (dragMode === 'creating') {
      const pixelW = (selection?.widthPct || 0) * (pageWidth / 100);
      const pixelH = (selection?.heightPct || 0) * (pageHeight / 100);

      if (pixelW < 18 || pixelH < 18) {
        onSelectionChange(null);
      }
    }

    setDragMode('none');
  };

  const pixelRect = getPixelRect();

  // Compute Action Bar Positioning (above or below selection)
  const getActionBarPosition = () => {
    if (!pixelRect) return { top: 0, left: 0, flipBelow: false };

    const actionBarHeight = 52;
    const margin = 10;
    const isTooCloseToTop = pixelRect.y - actionBarHeight - margin < 8;

    const top = isTooCloseToTop
      ? pixelRect.y + pixelRect.h + margin
      : pixelRect.y - actionBarHeight - margin;

    const centerX = pixelRect.x + pixelRect.w / 2;
    const left = clamp(centerX, 140, pageWidth - 140);

    return { top, left, flipBelow: isTooCloseToTop };
  };

  const actionBarPos = getActionBarPosition();

  const isSelectionCommitted =
    selection &&
    selection.widthPct > 1 &&
    selection.heightPct > 1 &&
    dragMode !== 'creating';

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePagePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute inset-0 z-20 touch-none select-none ${
        dragMode === 'creating' ? 'cursor-crosshair' : 'cursor-default'
      }`}
      style={{ width: `${pageWidth}px`, height: `${pageHeight}px` }}
    >
      {/* Selected Box Layer */}
      {pixelRect && pixelRect.w > 2 && pixelRect.h > 2 && (
        <div
          onPointerDown={handleMovePointerDown}
          className={`absolute transition-shadow duration-100 border-2 border-indigo-600 bg-indigo-500/15 shadow-lg rounded-sm ${
            dragMode === 'moving' ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            left: `${pixelRect.x}px`,
            top: `${pixelRect.y}px`,
            width: `${pixelRect.w}px`,
            height: `${pixelRect.h}px`,
          }}
        >
          <div className="absolute inset-0 ring-1 ring-white/70 pointer-events-none" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            <span className="p-1 rounded-md bg-slate-900/80 text-white shadow-sm">
              <Move className="w-3.5 h-3.5" />
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
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ns-resize z-30 hover:scale-125 transition-transform"
            title="تغيير الارتفاع"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('resize-ne', e)}
            className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nesw-resize z-30 hover:scale-125 transition-transform"
            title="تغيير الحجم"
          />

          <div
            onPointerDown={(e) => handleResizePointerDown('resize-w', e)}
            className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ew-resize z-30 hover:scale-125 transition-transform"
            title="تغيير العرض"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('resize-e', e)}
            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ew-resize z-30 hover:scale-125 transition-transform"
            title="تغيير العرض"
          />

          <div
            onPointerDown={(e) => handleResizePointerDown('resize-sw', e)}
            className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nesw-resize z-30 hover:scale-125 transition-transform"
            title="تغيير الحجم"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('resize-s', e)}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ns-resize z-30 hover:scale-125 transition-transform"
            title="تغيير الارتفاع"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('resize-se', e)}
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nwse-resize z-30 hover:scale-125 transition-transform"
            title="تغيير الحجم"
          />
        </div>
      )}

      {/* Floating Action Menu for Selected Region */}
      {isSelectionCommitted && pixelRect && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute z-40 -translate-x-1/2 animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: `${actionBarPos.top}px`,
            left: `${actionBarPos.left}px`,
          }}
        >
          <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 p-1.5 flex items-center gap-1 sm:gap-1.5 ring-1 ring-black/20">
            {/* 1. شرح */}
            <button
              onClick={() => onActionClick('explain')}
              className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-100 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
              title="شرح هذا الجزء"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>شرح</span>
            </button>

            {/* 2. تبسيط */}
            <button
              onClick={() => onActionClick('simplify')}
              className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-100 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
              title="تبسيط المفهوم"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>تبسيط</span>
            </button>

            {/* 3. تلميح */}
            <button
              onClick={() => onActionClick('hint')}
              className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-100 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
              title="إعطاء تلميح توجيهي"
            >
              <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
              <span>تلميح</span>
            </button>

            {/* 4. اختبرني */}
            <button
              onClick={() => onActionClick('quiz')}
              className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-100 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
              title="سؤال تدريبي على هذا الجزء"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>اختبرني</span>
            </button>

            {/* 5. تحليل */}
            <button
              onClick={() => onActionClick('analyze')}
              className="min-h-[40px] px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-100 hover:text-white flex items-center gap-1 text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
              title="تحليل المسألة"
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-400" />
              <span>تحليل</span>
            </button>

            {/* 6. صورة */}
            <button
              onClick={() => onActionClick('explainFigure')}
              className="min-h-[40px] px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-100 hover:text-white flex items-center gap-1 text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
              title="اشرح الصورة أو المخطط"
            >
              <Layers className="w-3.5 h-3.5 text-pink-400" />
              <span>صورة</span>
            </button>

            {/* Close / Dismiss Selection */}
            <button
              onClick={() => onSelectionChange(null)}
              className="min-h-[40px] min-w-[36px] px-1.5 py-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 flex items-center justify-center transition-colors mr-0.5"
              title="إلغاء التحديد"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfSelectionLayer;
