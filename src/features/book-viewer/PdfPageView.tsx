import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { pdfService, RenderResult } from '../../services/pdfService';
import { PdfInteractionOverlay } from './PdfInteractionOverlay';
import {
  PdfSelectionLayer,
  SelectionRegion,
  SelectionActionType,
} from '../selection';
import { InteractiveElement } from '../../types';
import { calculatePdfFitScale } from './pdf-fit-scale';
import { useI18n } from '../../i18n';

interface PdfPageViewProps {
  doc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  selection: SelectionRegion | null;
  isSelectionActive: boolean;
  onSelectionChange: (sel: SelectionRegion | null, pageNumber: number) => void;
  onActionClick: (action: SelectionActionType, pageNumber: number) => void;
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
  selection,
  isSelectionActive,
  onSelectionChange,
  onActionClick,
  selectedElementId,
  onSelectElement,
  isOverlayEnabled,
  onPageIntersect,
  setCanvasRef,
}) => {
  const { t, format } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const [dimensions, setDimensions] = useState<RenderResult>({
    width: 595,
    height: 842,
    originalWidth: 595,
    originalHeight: 842,
  });
  const [isInViewport, setIsInViewport] = useState(false);
  const [availableWidth, setAvailableWidth] = useState(0);

  const onPageIntersectRef = useRef(onPageIntersect);
  onPageIntersectRef.current = onPageIntersect;

  const setCanvasRefRef = useRef(setCanvasRef);
  setCanvasRefRef.current = setCanvasRef;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => setAvailableWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // IntersectionObserver to observe visibility and report active page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport(true);
            if (entry.intersectionRatio >= 0.5) {
              onPageIntersectRef.current(pageNumber);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '200px 0px 200px 0px', // Pre-render 200px before scroll enters
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
    setRenderError(false);

    if (setCanvasRefRef.current) {
      setCanvasRefRef.current(pageNumber, canvas);
    }

    doc.getPage(pageNumber)
      .then((page) => {
        if (cancellationToken.isCancelled) return undefined;
        const pageWidthAtOne = page.getViewport({ scale: 1 }).width;
        return pdfService.renderPage(
          doc,
          pageNumber,
          canvas,
          calculatePdfFitScale(pageWidthAtOne, availableWidth, scale),
          cancellationToken
        );
      })
      .then((dims) => {
        if (dims && !cancellationToken.isCancelled) {
          setDimensions(dims);
          setIsRendered(true);
        }
      })
      .catch((err) => {
        if (!cancellationToken.isCancelled) {
          setRenderError(true);
          console.warn(`Render notice on page ${pageNumber}:`, err);
        }
      });

    return () => {
      cancellationToken.isCancelled = true;
    };
  }, [doc, pageNumber, scale, isInViewport, availableWidth]);

  return (
    <div
      ref={containerRef}
      id={`page-container-${pageNumber}`}
      data-page-number={pageNumber}
      aria-busy={!isRendered && !renderError}
      className="relative flex w-full flex-col items-center my-4 transition-all"
    >
      {/* Page Header / Number Badge */}
      <div className="w-full flex items-center justify-between px-3 py-1 mb-1 text-[11px] text-slate-400 font-mono select-none">
        <span className="bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
          {format(t.pdfStudy.page, { page: pageNumber })}
        </span>
      </div>

      {/* Page Paper Frame */}
      <div
        className="relative shadow-xl rounded-sm border border-slate-300/80 bg-white overflow-hidden transition-all duration-100"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          minHeight: `${dimensions.height}px`,
        }}
      >
        {/* Placeholder skeleton while loading/rendering */}
        {!isRendered && !renderError && (
          <div className="absolute inset-0 bg-slate-50 flex items-center justify-center animate-pulse">
            <span className="text-xs text-slate-400 font-medium">
              {format(t.pdfStudy.loadingPage, { page: pageNumber })}
            </span>
          </div>
        )}

        {renderError && <p role="alert" className="absolute inset-0 bg-red-50 p-6 text-red-900 text-sm leading-7">{format(t.pdfStudy.renderError, { page: pageNumber })}</p>}
        {/* HTML5 Canvas */}
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Smart Interaction Overlay Layer */}
        {isRendered && isOverlayEnabled && (
          <PdfInteractionOverlay
            pageNumber={pageNumber}
            width={dimensions.width}
            height={dimensions.height}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
            isEnabled={isOverlayEnabled}
          />
        )}

        {/* Region Selection Layer */}
        {isRendered && isOverlayEnabled && (
          <PdfSelectionLayer
            pageNumber={pageNumber}
            pageWidth={dimensions.width}
            pageHeight={dimensions.height}
            selection={isSelectionActive ? selection : null}
            onSelectionChange={(sel) => onSelectionChange(sel, pageNumber)}
            onActionClick={(action) => onActionClick(action, pageNumber)}
            isEnabled={isOverlayEnabled}
          />
        )}
      </div>
    </div>
  );
};
