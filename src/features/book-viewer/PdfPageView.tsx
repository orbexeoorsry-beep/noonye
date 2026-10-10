import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { pdfService, RenderResult } from '../../services/pdfService';
import { PdfInteractionOverlay } from './PdfInteractionOverlay';
import {
  SelectionRegion,
  SelectionActionType,
} from '../selection';
import { InteractiveElement } from '../../types';

interface PdfPageViewProps {
  doc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  selection?: SelectionRegion | null;
  isSelectionActive?: boolean;
  isSelectionModeEnabled?: boolean;
  onSelectionChange?: (sel: SelectionRegion | null, pageNumber: number) => void;
  onActionClick?: (action: SelectionActionType, pageNumber: number) => void;
  selectedElementId: string | null;
  onSelectElement: (element: InteractiveElement) => void;
  isOverlayEnabled: boolean;
  onPageIntersect: (pageNumber: number) => void;
  setCanvasRef?: (pageNumber: number, canvas: HTMLCanvasElement | null) => void;
}

export const PdfPageView: React.FC<PdfPageViewProps> = ({
  doc,
  pageNumber,
  scale,
  isSelectionModeEnabled = false,
  selectedElementId,
  onSelectElement,
  isOverlayEnabled,
  onPageIntersect,
  setCanvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [dimensions, setDimensions] = useState<RenderResult>({
    width: 595,
    height: 842,
    originalWidth: 595,
    originalHeight: 842,
  });
  const [isInViewport, setIsInViewport] = useState(false);

  const onPageIntersectRef = useRef(onPageIntersect);
  onPageIntersectRef.current = onPageIntersect;

  const setCanvasRefRef = useRef(setCanvasRef);
  setCanvasRefRef.current = setCanvasRef;

  // IntersectionObserver to observe visibility and report active page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport((prev) => (prev ? prev : true));
            if (entry.intersectionRatio >= 0.5) {
              onPageIntersectRef.current(pageNumber);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '300px 0px 300px 0px', // Pre-render 300px before scroll enters for smooth multi-page selection
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber]);

  // Render canvas when page comes near viewport or scale changes
  useEffect(() => {
    if (!isInViewport || !canvasRef.current || !doc) return;

    const cancellationToken = { isCancelled: false };
    const canvas = canvasRef.current;

    if (setCanvasRefRef.current) {
      setCanvasRefRef.current(pageNumber, canvas);
    }

    pdfService
      .renderPage(doc, pageNumber, canvas, scale, cancellationToken)
      .then((dims) => {
        if (!cancellationToken.isCancelled) {
          setDimensions((prev) =>
            prev.width === dims.width &&
            prev.height === dims.height &&
            prev.originalWidth === dims.originalWidth &&
            prev.originalHeight === dims.originalHeight
              ? prev
              : dims
          );
          setIsRendered((prev) => (prev ? prev : true));
        }
      })
      .catch((err) => {
        if (!cancellationToken.isCancelled) {
          console.warn(`Render notice on page ${pageNumber}:`, err);
        }
      });

    return () => {
      cancellationToken.isCancelled = true;
    };
  }, [doc, pageNumber, scale, isInViewport]);

  return (
    <div
      ref={containerRef}
      id={`page-container-${pageNumber}`}
      data-page-number={pageNumber}
      className="relative flex flex-col items-center my-4 transition-all"
    >
      {/* Page Header / Number Badge */}
      <div className="w-full flex items-center justify-between px-3 py-1 mb-1 text-[11px] text-slate-400 font-mono select-none">
        <span className="bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
          صفحة {pageNumber}
        </span>
      </div>

      {/* Page Paper Frame */}
      <div
        id={`page-frame-${pageNumber}`}
        data-page-frame={pageNumber}
        className="relative shadow-xl rounded-sm border border-slate-300/80 bg-white overflow-hidden transition-all duration-100"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          minHeight: `${dimensions.height}px`,
        }}
      >
        {/* Placeholder skeleton while loading/rendering */}
        {!isRendered && (
          <div className="absolute inset-0 bg-slate-50 flex items-center justify-center animate-pulse">
            <span className="text-xs text-slate-400 font-medium">
              جارٍ تحميل صفحة {pageNumber}...
            </span>
          </div>
        )}

        {/* HTML5 Canvas */}
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Smart Interaction Overlay Layer (Disabled while Region Selection Tool is active) */}
        {isRendered && (
          <PdfInteractionOverlay
            pageNumber={pageNumber}
            width={dimensions.width}
            height={dimensions.height}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
            isEnabled={isOverlayEnabled && !isSelectionModeEnabled}
          />
        )}
      </div>
    </div>
  );
};
