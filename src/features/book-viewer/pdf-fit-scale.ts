/** Compute the PDF.js render scale needed to fit a page without distorting it. */
export function calculatePdfFitScale(
  pageWidthAtScaleOne: number,
  availableWidth: number,
  zoom: number,
  gutter = 24
): number {
  if (!Number.isFinite(pageWidthAtScaleOne) || pageWidthAtScaleOne <= 0) return zoom;
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return zoom;
  const fitScale = Math.min(1, Math.max(0, availableWidth - gutter) / pageWidthAtScaleOne);
  return fitScale * zoom;
}
