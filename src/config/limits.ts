/**
 * System and Feature Limits Configuration
 */
export const limits = {
  maxRequestsPerSession: 40,
  maxConsecutiveRetries: 3,
  maxPdfSizeMB: 100,
  minZoomScale: 0.5,
  maxZoomScale: 2.2,
  zoomStep: 0.15,
  defaultZoomScale: 1.0,
  mobileFitWidthBreakpoint: 768,
  minSelectionDimensionPx: 8,
  dragCloseThresholdPx: 90,
};

export default limits;
