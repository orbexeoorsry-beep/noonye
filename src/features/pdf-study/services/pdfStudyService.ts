import { textFromPdfItems } from './pdfTextLayout';
import type { DocumentExtraction, PdfDocumentProxyCompatible, StudyMaterial } from '../types';
import type { PdfStudyTranslations } from '../../../i18n/types';
import { pdfStudy as arPdfStudy } from '../../../i18n/ar/pdfStudy';

function message(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export async function extractDocumentText(doc: PdfDocumentProxyCompatible, signal?: AbortSignal, messages: PdfStudyTranslations = arPdfStudy): Promise<DocumentExtraction> {
  if (!Number.isInteger(doc.numPages) || doc.numPages < 0) throw new TypeError(messages.invalidPageCount);
  // Keep only one page's text content alive at a time; large books can exhaust memory
  // when every PDF.js page is requested concurrently.
  const pages: DocumentExtraction['pages'] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    if (signal?.aborted) throw new DOMException('Extraction cancelled', 'AbortError');
    try {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = textFromPdfItems(content.items);
      pages.push(text
        ? { pageNumber, status: 'ready' as const, text }
        : { pageNumber, status: 'empty' as const, text: '', reason: message(messages.emptyPage, { page: pageNumber, total: doc.numPages }) });
    } catch {
      pages.push({ pageNumber, status: 'error', text: '', reason: message(messages.errorPage, { page: pageNumber, total: doc.numPages }) });
    }
  }
  return { pageCount: doc.numPages, pages };
}

export function createStudyMaterial(
  extraction: DocumentExtraction,
  options: { title: string; startPage: number; endPage: number },
  messages: PdfStudyTranslations = arPdfStudy,
): StudyMaterial {
  const { startPage, endPage, title } = options;
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage < startPage || endPage > extraction.pageCount) {
    throw new RangeError(message(messages.invalidRange, { page: startPage, total: extraction.pageCount }));
  }
  const selectedPages = extraction.pages.filter(p => p.pageNumber >= startPage && p.pageNumber <= endPage);
  const allSentences = selectedPages.filter(p => p.status === 'ready').flatMap(page =>
    page.text.split(/(?<=[.!?؟])\s+|\n+/).map(text => text.trim()).filter(Boolean).map(text => ({ text, pageNumber: page.pageNumber })),
  );
  // Prefer substantive lines within each page, but never drop a short page entirely.
  const groups = selectedPages.filter(page => page.status === 'ready').map(page => {
    const lines = allSentences.filter(citation => citation.pageNumber === page.pageNumber);
    const substantive = lines.filter(citation => (citation.text.match(/[\p{L}\p{N}]+/gu) || []).length >= 5);
    return substantive.length ? substantive : lines;
  }).filter(lines => lines.length);
  const pageSampleCount = Math.min(5, groups.length);
  const sampledGroups = Array.from({ length: pageSampleCount }, (_, index) =>
    groups[pageSampleCount === 1 ? 0 : Math.round(index * (groups.length - 1) / (pageSampleCount - 1))]);
  const summary: StudyMaterial['summary'] = [];
  for (let line = 0; summary.length < 5 && sampledGroups.some(group => group[line]); line += 1) {
    for (const group of sampledGroups) if (group[line] && summary.length < 5) summary.push(group[line]);
  }
  summary.sort((left, right) => left.pageNumber - right.pageNumber);
  const adminText = /(?:هذا\s+مستند\s+اختبار(?:ي|ية)?|متن\s+اختبار\s+تجريبي|اختبار\s+تجريبي|نسخة\s+تجريبية|مستند\s+تجريبي|تنبيه|ملاحظات?\s+إدارية|تعليمات\s+(?:رفع|تحميل)|ارفع\s+(?:ملف|المستند)|حقوق\s+(?:النشر|الطبع)|جميع\s+الحقوق|رقم\s+الإصدار|الإصدار\s+رقم|\b(?:demo(?:nstration)?\s+(?:file|document|test)|sample\s+(?:test|document)|administrative\s+notes?|notice|warning|alert|test\s+(?:file|document)|upload\s+instructions?|all\s+rights\s+reserved|copyright|version\s*(?:number|no\.?|:)?\s*\d*)\b)/iu;
  const isQuestionCandidate = (text: string) => !adminText.test(text) && (text.match(/[\p{L}\p{N}]+/gu) || []).length >= 7;
  const questionLines = selectedPages.filter(p => p.status === 'ready').flatMap(page =>
    allSentences.filter(item => item.pageNumber === page.pageNumber && isQuestionCandidate(item.text)),
  );
  const questions = questionLines.slice(0, 5).map((citation, index) => {
    const words = [...citation.text.matchAll(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu)];
    const eligible = words.filter(word => word[0].length >= 4);
    if (!eligible.length) return null;
    const target = eligible[Math.floor((index + 1) * eligible.length / (questionLines.length + 1))];
    const suffix = ` (${message(messages.page, { page: citation.pageNumber, total: extraction.pageCount })})`;
    const prompt = `${citation.text.slice(0, target.index)}____${citation.text.slice(target.index! + target[0].length)}${suffix}`;
    return { prompt, answer: `${citation.text}${suffix}`, pageNumber: citation.pageNumber };
  }).filter((question): question is NonNullable<typeof question> => question !== null);
  const warnings = selectedPages.filter(p => p.status !== 'ready').map(p => {
    const key = p.status === 'empty' ? messages.emptyPage : p.status === 'error' ? messages.errorPage : messages.missingPage;
    return message(key, { page: p.pageNumber, total: extraction.pageCount });
  });
  return { title: title.trim() || messages.defaultTitle, startPage, endPage, summary, questions, ...(warnings.length ? { warnings } : {}) };
}
