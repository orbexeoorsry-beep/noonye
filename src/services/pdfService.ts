import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker safely
if (typeof window !== 'undefined') {
  try {
    // Primary worker path using standard matching cdnjs/unpkg for the installed version
    const version = pdfjsLib.version || '4.0.379';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker initialization notice', e);
  }
}

export interface PdfDocumentInfo {
  numPages: number;
  title?: string;
}

export interface RenderResult {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

export const pdfService = {
  /**
   * Loads a PDF Document from an ArrayBuffer, Uint8Array, or URL
   */
  async loadDocument(source: ArrayBuffer | Uint8Array | string): Promise<pdfjsLib.PDFDocumentProxy> {
    const loadingTask = pdfjsLib.getDocument(
      typeof source === 'string'
        ? { url: source, cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`, cMapPacked: true }
        : { data: source, cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`, cMapPacked: true }
    );
    return await loadingTask.promise;
  },

  /**
   * Renders a specific page onto an HTML5 Canvas element
   */
  async renderPage(
    doc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale = 1.0,
    cancellationToken?: { isCancelled: boolean }
  ): Promise<RenderResult> {
    const page = await doc.getPage(pageNumber);

    if (cancellationToken?.isCancelled) {
      throw new Error('Render cancelled');
    }

    // High DPI display sharpness
    const pixelRatio = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * pixelRatio });
    const originalViewport = page.getViewport({ scale: 1.0 });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    // CSS display size
    canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
    canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Canvas 2D context not available');
    }

    const renderContext = {
      canvasContext: context,
      canvas: canvas,
      viewport: viewport,
      intent: 'display' as const,
    };

    const renderTask = page.render(renderContext);

    // Allow cancel if token is triggered
    if (cancellationToken) {
      const checkInterval = setInterval(() => {
        if (cancellationToken.isCancelled) {
          renderTask.cancel();
          clearInterval(checkInterval);
        }
      }, 50);

      try {
        await renderTask.promise;
      } finally {
        clearInterval(checkInterval);
      }
    } else {
      await renderTask.promise;
    }

    return {
      width: Math.floor(viewport.width / pixelRatio),
      height: Math.floor(viewport.height / pixelRatio),
      originalWidth: originalViewport.width,
      originalHeight: originalViewport.height,
    };
  },

  /**
   * Extracts text from a specific percentage region on a page (if text exists)
   */
  async extractTextFromRegion(
    doc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    region?: { xPct: number; yPct: number; widthPct: number; heightPct: number } | null
  ): Promise<string> {
    try {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      if (!region) {
        return textContent.items
          .map((item) => ('str' in item ? (item as { str: string }).str : ''))
          .filter(Boolean)
          .join(' ')
          .trim();
      }

      const minX = (region.xPct / 100) * viewport.width;
      const maxX = ((region.xPct + region.widthPct) / 100) * viewport.width;
      const minY = (region.yPct / 100) * viewport.height;
      const maxY = ((region.yPct + region.heightPct) / 100) * viewport.height;

      const selectedStrings: string[] = [];
      const bandStrings: string[] = [];

      for (const item of textContent.items) {
        if (!('str' in item)) continue;
        const strItem = item as {
          str: string;
          transform: number[];
          width?: number;
          height?: number;
        };
        if (!strItem.str || !strItem.str.trim()) continue;

        const x = strItem.transform[4];
        // PDF coordinates start from bottom-left; convert to top-down baseline
        const y = viewport.height - strItem.transform[5];

        const fontSize =
          Math.hypot(strItem.transform[0], strItem.transform[1]) ||
          Math.abs(strItem.transform[3]) ||
          12;
        const itemWidth =
          typeof strItem.width === 'number' && strItem.width > 0
            ? strItem.width
            : strItem.str.length * (fontSize * 0.52);
        const itemHeight =
          typeof strItem.height === 'number' && strItem.height > 0 ? strItem.height : fontSize;

        const itemLeft = Math.min(x, x + itemWidth);
        const itemRight = Math.max(x, x + itemWidth);
        const itemTop = y - itemHeight;
        const itemBottom = y + itemHeight * 0.35;

        const overlapsY = itemBottom >= minY - 12 && itemTop <= maxY + 12;
        const overlapsX = itemRight >= minX - 12 && itemLeft <= maxX + 12;

        if (overlapsX && overlapsY) {
          selectedStrings.push(strItem.str.trim());
        } else if (itemBottom >= minY - 20 && itemTop <= maxY + 20) {
          bandStrings.push(strItem.str.trim());
        }
      }

      // If bounding box yielded text, return it; otherwise fall back to lines on the same vertical band
      if (selectedStrings.length > 0) {
        return selectedStrings.join(' ').trim();
      }
      if (bandStrings.length > 0) {
        return bandStrings.join(' ').trim();
      }

      // Otherwise return empty string (indicates figure/image/diagram or non-OCR text)
      return '';
    } catch {
      return '';
    }
  },
};
