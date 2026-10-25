import * as pdfjsLib from 'pdfjs-dist';

const PDFJS_VERSION = pdfjsLib.version || '4.0.379';
const CMAP_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`;
const STANDARD_FONT_DATA_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`;
export interface CancellablePdfLoadingTask {
  promise: Promise<pdfjsLib.PDFDocumentProxy>;
  cancel(): Promise<void>;
}

export type PdfLoadingTaskFactory = (
  source?: Parameters<typeof pdfjsLib.getDocument>[0]
) => CancellablePdfLoadingTask;

export function adaptPdfJsLoadingTask(
  task: Pick<ReturnType<typeof pdfjsLib.getDocument>, 'promise' | 'destroy'>
): CancellablePdfLoadingTask {
  return {
    promise: task.promise,
    // PDF.js exposes destroy(), not cancel(); this is its supported abort/worker cleanup API.
    cancel: () => task.destroy(),
  };
}

const createNativeLoadingTask: PdfLoadingTaskFactory = (source) => {
  const task = pdfjsLib.getDocument(source);
  return adaptPdfJsLoadingTask(task);
};

export function cancelPdfLoad(controller: AbortController | null | undefined): void {
  controller?.abort();
}

const loadingTaskByDocument = new WeakMap<
  pdfjsLib.PDFDocumentProxy,
  CancellablePdfLoadingTask
>();

// Configure PDF.js worker safely
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
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

export interface BookDetectedProfile {
  detectedTitle?: string;
  detectedSubject: string;
  detectedGrade: string;
  detectedSummary: string;
  sampleCleanText: string;
  isScannedOrImageBased: boolean;
}

/**
 * Normalizes Arabic Presentation Forms (FB50-FDFF, FE70-FEFF) into standard Unicode Arabic (0600-06FF),
 * strips Private Use Area (E000-F8FF) garbage glyphs from legacy non-Unicode fonts,
 * and repairs common spacing/ligature splits produced by PDF streams.
 */
export function cleanArabicPdfText(raw: string): string {
  if (!raw) return '';

  // 1. Strip Private Use Area characters and control characters (except newline/tab)
  let cleaned = raw
    .replace(/[\uE000-\uF8FF\uFFF0-\uFFFF]/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');

  // 2. Normalize Arabic Presentation Forms-A & B into canonical standard Arabic codepoints
  try {
    cleaned = cleaned.normalize('NFKC');
  } catch {
    // Ignore if normalize fails
  }

  // 3. Remove excessive tatweel (kashida) while keeping words connected
  cleaned = cleaned.replace(/\u0640+/g, '');

  // 4. Repair common PDF word-splitting artifacts in Arabic where final letters get separated by a single space
  // e.g. "المخططا ت" -> "المخططات", "كأزوا ج" -> "كأزواج", "الأعدا د" -> "الأعداد", "تطبيقا ت" -> "تطبيقات"
  cleaned = cleaned
    // Rejoin split plural feminine suffix "ا ت" at word end
    .replace(/([\u0627\u0623\u0625\u0622])\s+([\u062A\u0629])(?=\s|$|[،.؟!:؛)\]}])/g, '$1$2')
    // Rejoin split final letter after long vowel ا/و/ي when preceded by Arabic letters (e.g. "كأزوا ج", "الأعدا د", "المعلوما ت", "القانو ن")
    .replace(/([\u0621-\u064A]{2,}[\u0627\u0648\u064A])\s+([\u0628\u062A\u062B\u062C\u062D\u062E\u062F\u0630\u0631\u0632\u0633\u0634\u0635\u0636\u0637\u0638\u0639\u063A\u0641\u0642\u0643\u0644\u0645\u0646\u0647\u0629\u0621])(?=\s|$|[،.؟!:؛)\]}])/g, '$1$2')
    // Rejoin split definite article "ا لـ" or "الـ " at start of Arabic words
    .replace(/(^|\s)ا\s+ل([\u0621-\u064A]{2,})/g, '$1ال$2')
    .replace(/(^|\s)لأ\s*عدا\s*د/g, '$1الأعداد')
    .replace(/لأعددا\s+لطبيعية/g, 'الأعداد الطبيعية')
    .replace(/لأعددا\s+لصحيحة/g, 'الأعداد الصحيحة')
    .replace(/لأعددا\s+لحقيقية/g, 'الأعداد الحقيقية')
    .replace(/كأزوا\s*جمرتبة/g, 'كأزواج مرتبة')
    .replace(/المخططا\s*تالسهمية/g, 'المخططات السهمية')
    .replace(/المخططالبياني/g, 'المخطط البياني')
    .replace(/تمثلتطبيقا\s*ت/g, 'تمثل تطبيقات')
    .replace(/تمثلتطبيقا/g, 'تمثل تطبيقاً')
    .replace(/اذكرالسب\s*ب/g, 'اذكر السبب');

  // 5. Collapse multiple spaces on the same line
  cleaned = cleaned
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  return cleaned.trim();
}

/**
 * Checks whether extracted PDF text is empty, scanned, or corrupted by legacy non-Unicode font encoding (mojibake)
 */
export function isPdfTextGarbledOrEmpty(text: string): boolean {
  if (!text || text.trim().length < 4) return true;
  const trimmed = text.trim();

  // Count valid Arabic, basic Latin letters, digits, and standard math symbols
  const validChars = (
    trimmed.match(/[\u0600-\u06FFa-zA-Z0-9\u0660-\u0669+=×÷\-*/()[\]{}.,،؟:!<>∈∉⊂⊃∪∩√²³]/g) || []
  ).length;
  const nonSpaceLength = trimmed.replace(/\s+/g, '').length;
  if (nonSpaceLength === 0) return true;

  // Count Extended Latin-1 mojibake characters (0080-00FF) often produced by legacy WinSoft/AXt non-Unicode fonts
  const mojibakeChars = (trimmed.match(/[\u0080-\u00FF]/g) || []).length;
  if (mojibakeChars > nonSpaceLength * 0.25) {
    return true;
  }

  return validChars / nonSpaceLength < 0.35;
}

interface PositionedTextFragment {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

/**
 * Reconstructs natural reading-order lines and words from PDF.js textContent items,
 * handling RTL Arabic coordinate sorting and smart word-joining.
 */
function reconstructCleanTextFromItems(items: PositionedTextFragment[]): string {
  if (!items || items.length === 0) return '';

  // 1. Group items into horizontal visual lines by Y baseline
  const lines: Array<{ y: number; fontSize: number; items: PositionedTextFragment[] }> = [];

  for (const item of items) {
    const cleanedPiece = item.str
      .replace(/[\uE000-\uF8FF\uFFF0-\uFFFF]/g, '')
      .normalize('NFKC');
    if (!cleanedPiece || !cleanedPiece.trim()) continue;

    const normalizedItem: PositionedTextFragment = {
      ...item,
      str: cleanedPiece,
    };

    // Find an existing line within vertical tolerance
    const tolerance = Math.max(5, item.fontSize * 0.55);
    const existingLine = lines.find((l) => Math.abs(l.y - item.y) <= tolerance);
    if (existingLine) {
      existingLine.items.push(normalizedItem);
      // Update running average Y
      existingLine.y =
        existingLine.items.reduce((acc, it) => acc + it.y, 0) / existingLine.items.length;
    } else {
      lines.push({
        y: item.y,
        fontSize: item.fontSize,
        items: [normalizedItem],
      });
    }
  }

  // 2. Sort lines from top to bottom
  lines.sort((a, b) => a.y - b.y);

  // 3. Reconstruct each line according to its dominant script (RTL Arabic vs LTR Latin)
  const outputLines: string[] = [];

  for (const line of lines) {
    const rawLineSample = line.items.map((i) => i.str).join('');
    const arabicCount = (rawLineSample.match(/[\u0600-\u06FF]/g) || []).length;
    const latinCount = (rawLineSample.match(/[a-zA-Z]/g) || []).length;
    const isRTL = arabicCount >= latinCount && arabicCount > 0;

    if (line.items.length === 1) {
      outputLines.push(cleanArabicPdfText(line.items[0].str));
      continue;
    }

    // Sort items horizontally: Right-to-Left for Arabic lines, Left-to-Right for English lines
    const sorted = [...line.items].sort((a, b) => (isRTL ? b.x - a.x : a.x - b.x));

    let assembled = '';
    for (let i = 0; i < sorted.length; i++) {
      const curr = sorted[i];
      const currText = curr.str.trim();
      if (!currText) continue;

      if (i === 0) {
        assembled = currText;
        continue;
      }

      const prev = sorted[i - 1];
      const avgFont = (curr.fontSize + prev.fontSize) / 2 || 12;

      // Compute horizontal gap between the two fragments
      let gap = 0;
      if (isRTL) {
        // In RTL, `prev` is to the right (larger x) and `curr` is to the left (smaller x)
        const currRightEdge = curr.x + curr.width;
        gap = prev.x - currRightEdge;
      } else {
        const prevRightEdge = prev.x + prev.width;
        gap = curr.x - prevRightEdge;
      }

      const prevEndsWithArabic = /[\u0621-\u064A]$/.test(assembled);
      const currStartsWithArabic = /^[\u0621-\u064A]/.test(currText);
      const prevEndsWithNonConnector = /[اأإآدذرزوؤءة]$/.test(assembled);

      // If both fragments are Arabic letters and the horizontal gap is tiny, they are parts of the SAME word!
      const sameWordThreshold = prevEndsWithNonConnector ? avgFont * 0.16 : avgFont * 0.24;
      if (prevEndsWithArabic && currStartsWithArabic && gap > -avgFont * 0.6 && gap < sameWordThreshold) {
        assembled += currText;
      } else {
        assembled += ' ' + currText;
      }
    }

    const cleanedLine = cleanArabicPdfText(assembled);
    if (cleanedLine) {
      outputLines.push(cleanedLine);
    }
  }

  return cleanArabicPdfText(outputLines.join('\n'));
}

/**
 * Forces a 2D canvas context to remain strictly LTR so browser BiDi reordering
 * never shifts or overlaps Arabic glyphs, brackets, or mathematical arrows.
 */
function enforceLtrCanvasContext(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
  canvas.setAttribute('dir', 'ltr');
  canvas.dir = 'ltr';
  canvas.style.direction = 'ltr';
  canvas.style.unicodeBidi = 'isolate';
  canvas.style.fontVariantLigatures = 'none';
  canvas.style.fontFeatureSettings = '"liga" 0, "clig" 0, "calt" 0';

  context.direction = 'ltr';
  context.textAlign = 'left';

  const patchedContext = context as CanvasRenderingContext2D & { __ltrPatched?: boolean };
  if (!patchedContext.__ltrPatched) {
    patchedContext.__ltrPatched = true;
    const origRestore = context.restore.bind(context);
    context.restore = () => {
      origRestore();
      context.direction = 'ltr';
    };
    const origFillText = context.fillText.bind(context);
    context.fillText = (text: string, x: number, y: number, maxWidth?: number) => {
      context.direction = 'ltr';
      if (typeof maxWidth === 'number') {
        origFillText(text, x, y, maxWidth);
      } else {
        origFillText(text, x, y);
      }
    };
    const origStrokeText = context.strokeText.bind(context);
    context.strokeText = (text: string, x: number, y: number, maxWidth?: number) => {
      context.direction = 'ltr';
      if (typeof maxWidth === 'number') {
        origStrokeText(text, x, y, maxWidth);
      } else {
        origStrokeText(text, x, y);
      }
    };
  }
}

export async function normalizePdfSource(
  source: ArrayBuffer | Uint8Array | Blob | string
): Promise<ArrayBuffer | Uint8Array | string> {
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    return new Uint8Array((await source.arrayBuffer()).slice(0));
  }
  if (source instanceof ArrayBuffer) return new Uint8Array(source.slice(0));
  if (source instanceof Uint8Array) {
    return new Uint8Array(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
  }
  if (typeof source === 'string') return source;
  throw new TypeError('Unsupported PDF source');
}
export const pdfService = {
  /**
   * Loads any PDF Document resiliently from an ArrayBuffer, Uint8Array, Blob, or URL.
   * Uses `disableFontFace: true` so PDF.js renders embedded Arabic & math fonts as exact
   * vector Bezier paths (`CompiledFont`) at their native PDF coordinates, preventing
   * browser `@font-face` HarfBuzz double-shaping and RTL BiDi glyph collisions.
   */
  async loadDocument(
    source: ArrayBuffer | Uint8Array | Blob | string,
    signal?: AbortSignal,
    taskFactory: PdfLoadingTaskFactory = createNativeLoadingTask
  ): Promise<pdfjsLib.PDFDocumentProxy> {
    const resolvedSource = await normalizePdfSource(source);
    if (signal?.aborted) throw new Error('PDF load cancelled.');

    const baseParams = {
      cMapUrl: CMAP_URL,
      cMapPacked: true,
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
      // Vector glyph path rendering prevents overlapping/colliding Arabic letters on Canvas
      disableFontFace: true,
      useSystemFonts: false,
      isEvalSupported: true,
      stopAtErrors: false,
    };

    const loadingTask = taskFactory(
      typeof resolvedSource === 'string'
        ? { url: resolvedSource, ...baseParams }
        : { data: resolvedSource, ...baseParams }
    );
    const abortTask = () => {
      void loadingTask.cancel().catch(() => undefined);
    };
    signal?.addEventListener('abort', abortTask, { once: true });
    try {
      const document = await loadingTask.promise;
      if (signal?.aborted) {
        throw new Error('PDF load cancelled.');
      }
      loadingTaskByDocument.set(document, loadingTask);
      return document;
    } finally {
      signal?.removeEventListener('abort', abortTask);
    }
  },

  /** Destroy the owning loading task, which also releases the PDF.js worker. */
  async destroyDocument(document: pdfjsLib.PDFDocumentProxy): Promise<void> {
    const loadingTask = loadingTaskByDocument.get(document);
    loadingTaskByDocument.delete(document);
    if (loadingTask) {
      await loadingTask.cancel();
      return;
    }
    await document.cleanup();
  },

  /**
   * Renders a specific page onto an HTML5 Canvas element with strict LTR coordinate isolation
   * and crisp high-DPI vector glyph rendering.
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

    // Ensure crisp rendering on both desktop and mobile screens
    const rawPixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const pixelRatio = Math.min(Math.max(rawPixelRatio, 1.5), 2.5);
    const viewport = page.getViewport({ scale: scale * pixelRatio });
    const originalViewport = page.getViewport({ scale: 1.0 });

    // Force LTR on canvas BEFORE getting 2D context so initial canvas state stack is LTR
    canvas.setAttribute('dir', 'ltr');
    canvas.dir = 'ltr';
    canvas.style.direction = 'ltr';

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    // CSS display size
    const displayWidth = Math.floor(viewport.width / pixelRatio);
    const displayHeight = Math.floor(viewport.height / pixelRatio);
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Canvas 2D context not available');
    }

    enforceLtrCanvasContext(canvas, context);

    // Fill clean white paper background before rendering
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: context,
      canvas: canvas,
      viewport: viewport,
      intent: 'display' as const,
      background: 'rgb(255, 255, 255)',
    };

    const renderTask = page.render(renderContext);

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
      width: displayWidth,
      height: displayHeight,
      originalWidth: originalViewport.width,
      originalHeight: originalViewport.height,
    };
  },

  /**
   * Renders a PDF page (or specific percentage crop region) to an offscreen canvas Data URL.
   * Enables Gemini Vision OCR & visual reading even when a page is not currently mounted in the DOM.
   */
  async renderPageToDataUrl(
    doc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    region?: { xPct: number; yPct: number; widthPct: number; heightPct: number } | null,
    maxDimension = 1200
  ): Promise<string> {
    if (typeof document === 'undefined') return '';
    try {
      const safePage = Math.max(1, Math.min(doc.numPages, pageNumber));
      const page = await doc.getPage(safePage);
      const baseViewport = page.getViewport({ scale: 1.0 });
      const renderScale = Math.min(2.0, maxDimension / Math.max(baseViewport.width, baseViewport.height));
      const viewport = page.getViewport({ scale: renderScale });

      const offscreen = document.createElement('canvas');
      offscreen.setAttribute('dir', 'ltr');
      offscreen.dir = 'ltr';
      offscreen.width = Math.max(1, Math.floor(viewport.width));
      offscreen.height = Math.max(1, Math.floor(viewport.height));

      const ctx = offscreen.getContext('2d', { alpha: false });
      if (!ctx) return '';

      enforceLtrCanvasContext(offscreen, ctx);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);

      await page.render({
        canvasContext: ctx,
        canvas: offscreen,
        viewport,
        intent: 'display',
      }).promise;

      if (!region) {
        return offscreen.toDataURL('image/jpeg', 0.84);
      }

      const cropX = Math.max(0, Math.floor((region.xPct / 100) * offscreen.width));
      const cropY = Math.max(0, Math.floor((region.yPct / 100) * offscreen.height));
      const cropW = Math.min(offscreen.width - cropX, Math.floor((region.widthPct / 100) * offscreen.width));
      const cropH = Math.min(offscreen.height - cropY, Math.floor((region.heightPct / 100) * offscreen.height));

      if (cropW < 8 || cropH < 8) {
        return offscreen.toDataURL('image/jpeg', 0.84);
      }

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d', { alpha: false });
      if (!cropCtx) return '';

      cropCtx.fillStyle = '#ffffff';
      cropCtx.fillRect(0, 0, cropW, cropH);
      cropCtx.drawImage(offscreen, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      return cropCanvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return '';
    }
  },

  /**
   * Extracts and reconstructs clean, properly ordered Arabic/English text from a page or percentage region.
   */
  async extractTextFromRegion(
    doc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    region?: { xPct: number; yPct: number; widthPct: number; heightPct: number } | null
  ): Promise<string> {
    try {
      const safePage = Math.max(1, Math.min(doc.numPages, pageNumber));
      const page = await doc.getPage(safePage);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const allFragments: PositionedTextFragment[] = [];
      const selectedFragments: PositionedTextFragment[] = [];
      const bandFragments: PositionedTextFragment[] = [];

      const minX = region ? (region.xPct / 100) * viewport.width : 0;
      const maxX = region ? ((region.xPct + region.widthPct) / 100) * viewport.width : viewport.width;
      const minY = region ? (region.yPct / 100) * viewport.height : 0;
      const maxY = region ? ((region.yPct + region.heightPct) / 100) * viewport.height : viewport.height;

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

        const fragment: PositionedTextFragment = {
          str: strItem.str,
          x,
          y,
          width: itemWidth,
          height: itemHeight,
          fontSize,
        };

        allFragments.push(fragment);

        if (region) {
          const itemLeft = Math.min(x, x + itemWidth);
          const itemRight = Math.max(x, x + itemWidth);
          const itemTop = y - itemHeight;
          const itemBottom = y + itemHeight * 0.35;

          const overlapsY = itemBottom >= minY - 14 && itemTop <= maxY + 14;
          const overlapsX = itemRight >= minX - 14 && itemLeft <= maxX + 14;

          if (overlapsX && overlapsY) {
            selectedFragments.push(fragment);
          } else if (itemBottom >= minY - 22 && itemTop <= maxY + 22) {
            bandFragments.push(fragment);
          }
        }
      }

      if (!region) {
        const reconstructed = reconstructCleanTextFromItems(allFragments);
        return isPdfTextGarbledOrEmpty(reconstructed) ? '' : reconstructed;
      }

      if (selectedFragments.length > 0) {
        const reconstructed = reconstructCleanTextFromItems(selectedFragments);
        if (!isPdfTextGarbledOrEmpty(reconstructed)) {
          return reconstructed;
        }
      }

      if (bandFragments.length > 0) {
        const reconstructed = reconstructCleanTextFromItems(bandFragments);
        if (!isPdfTextGarbledOrEmpty(reconstructed)) {
          return reconstructed;
        }
      }

      return '';
    } catch {
      return '';
    }
  },

  /**
   * Automatically inspects any uploaded PDF book to detect its subject, grade level,
   * summary, and whether it is a scanned/image PDF or text PDF.
   */
  async analyzeBookProfile(
    doc: pdfjsLib.PDFDocumentProxy,
    fileName: string
  ): Promise<BookDetectedProfile> {
    const cleanFileName = fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
    const pagesToSample = Array.from(
      new Set([1, 2, 3, Math.min(5, doc.numPages), Math.min(10, doc.numPages), Math.min(20, doc.numPages)])
    ).filter((p) => p >= 1 && p <= doc.numPages);

    const sampledTexts: string[] = [];
    for (const p of pagesToSample) {
      const txt = await this.extractTextFromRegion(doc, p, null);
      if (txt && !isPdfTextGarbledOrEmpty(txt)) {
        sampledTexts.push(txt.slice(0, 1200));
      }
    }

    let metaTitle = '';
    try {
      const meta = await doc.getMetadata();
      const info = meta?.info as Record<string, any> | undefined;
      if (info?.Title && typeof info.Title === 'string' && info.Title.trim().length > 2) {
        const candidate = cleanArabicPdfText(info.Title.trim());
        if (!isPdfTextGarbledOrEmpty(candidate) && !candidate.toLowerCase().includes('untitled')) {
          metaTitle = candidate;
        }
      }
    } catch {
      // Ignore metadata errors
    }

    const combinedText = `${cleanFileName} ${metaTitle} ${sampledTexts.join('\n')}`;
    const lower = combinedText.toLowerCase();
    const isScannedOrImageBased = sampledTexts.length === 0;

    // Detect Subject
    let detectedSubject = 'المنهاج الدراسي العام';
    if (
      /رياضيات|جبر|هندسة|حساب المثلثات|المجموعات والعلاقات|التطبيقات|المعادلات|تفاضل|تكامل|mathematics|math|algebra|geometry|calculus/.test(
        lower
      )
    ) {
      detectedSubject = 'الرياضيات والجبر';
    } else if (/فيزياء|الحركة|القوة|الطاقة|الكهرباء|المغناطيسية|الموجات|physics|mechanics/.test(lower)) {
      detectedSubject = 'الفيزياء والعلوم التطبيقية';
    } else if (/كيمياء|الذرة|الجدول الدوري|التفاعلات|المحاليل|الأحماض|chemistry/.test(lower)) {
      detectedSubject = 'الكيمياء والعلوم الجزيئية';
    } else if (/أحياء|احياء|الخلية|الغشاء البلازمي|الوراثة|التنفس الخلوي|النبات|الحيوان|biology|science/.test(lower)) {
      detectedSubject = 'الأحياء والعلوم الطبيعية';
    } else if (/جغرافيا|جغرافية|التضاريس|المناخ|السكان|الموقع الفلكي|خريطة|geography|graphic/.test(lower)) {
      detectedSubject = 'الجغرافيا والدراسات الاجتماعية';
    } else if (/تاريخ|الحضارة|الدولة|العصر|الخلافة|history/.test(lower)) {
      detectedSubject = 'التاريخ والحضارة';
    } else if (/قرآن|إسلامية|توحيد|فقه|حديث|تفسير|سيرة/.test(lower)) {
      detectedSubject = 'التربية الإسلامية وعلوم القرآن';
    } else if (/نحو|صرف|بلاغة|أدب|قراءة|اللغة العربية|arabic/.test(lower)) {
      detectedSubject = 'اللغة العربية وآدابها';
    } else if (/english|grammar|vocabulary|reading comprehension/.test(lower)) {
      detectedSubject = 'اللغة الإنجليزية (English)';
    } else if (/علوم|الطاقة|المادة|البيئة/.test(lower)) {
      detectedSubject = 'العلوم العامة';
    }

    // Detect Grade Level
    let detectedGrade = 'المرحلة الدراسية المعتمدة';
    if (/الصف التاسع|تاسع|9th|grade\s*9/.test(lower)) {
      detectedGrade = 'الصف التاسع الأساسي';
    } else if (/الصف الثامن|ثامن|8th|grade\s*8/.test(lower)) {
      detectedGrade = 'الصف الثامن الأساسي';
    } else if (/الصف السابع|سابع|7th|grade\s*7/.test(lower)) {
      detectedGrade = 'الصف السابع الأساسي';
    } else if (/الأول الثانوي|أول ثانوي|العاشر|10th|grade\s*10/.test(lower)) {
      detectedGrade = 'الصف الأول الثانوي';
    } else if (/الثاني الثانوي|ثاني ثانوي|الحادي عشر|11th|grade\s*11/.test(lower)) {
      detectedGrade = 'الصف الثاني الثانوي';
    } else if (/الثالث الثانوي|ثالث ثانوي|الثاني عشر|12th|grade\s*12|بكالوريا/.test(lower)) {
      detectedGrade = 'الصف الثالث الثانوي';
    }

    // Build meaningful summary from real sampled text
    const firstMeaningfulLines = sampledTexts
      .join('\n')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 20 && l.length < 180 && !l.includes('http://') && !l.includes('www.'))
      .slice(0, 3);

    const detectedSummary =
      firstMeaningfulLines.length > 0
        ? `${detectedSubject} (${detectedGrade}) — ${firstMeaningfulLines.join(' · ').slice(0, 220)}`
        : `كتاب ${detectedSubject} (${detectedGrade}) — يضم ${doc.numPages} صفحة جاهزة للقراءة.`;

    return {
      detectedTitle: metaTitle || undefined,
      detectedSubject,
      detectedGrade,
      detectedSummary,
      sampleCleanText: sampledTexts.join('\n\n').slice(0, 4000),
      isScannedOrImageBased,
    };
  },
};
