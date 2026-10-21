import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { generateEducationalSamplePdf } from '../src/services/samplePdfGenerator';
import { createStudyMaterial, extractDocumentText } from '../src/features/pdf-study/services/pdfStudyService';
import type { PdfDocumentProxyCompatible } from '../src/features/pdf-study/types';
import { pdfStudy as arMessages } from '../src/i18n/ar/pdfStudy';
import { pdfStudy as enMessages } from '../src/i18n/en/pdfStudy';

function makeImageOnlyPdf(): Uint8Array {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 4 0 R >>',
    '<< /Length 22 >>\nstream\n0 0 200 200 re f\nendstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

async function run() {
  const pdf = await getDocument({ data: generateEducationalSamplePdf(), useSystemFonts: true }).promise;
  const real = await extractDocumentText(pdf as unknown as PdfDocumentProxyCompatible);
  assert.equal(real.pageCount, 3);
  assert.equal(real.pages.length, 3);
  assert.ok(real.pages.some(p => p.status === 'ready' && p.text.includes('selective permeability')));

  const fake: PdfDocumentProxyCompatible = {
    numPages: 4,
    async getPage(pageNumber) {
      if (pageNumber === 2) throw new Error('damaged page');
      return { async getTextContent() {
        if (pageNumber === 1) return { items: [{ str: 'Unique factual sentence. Another reliable detail.' }] };
        if (pageNumber === 3) return { items: [] };
        return { items: [{ str: 'A separate grounded fact appears here with useful detail.' }] };
      } };
    },
  };
  let active = 0;
  let maximumActive = 0;
  const measuredFake: PdfDocumentProxyCompatible = {
    numPages: fake.numPages,
    async getPage(pageNumber) {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        const page = await fake.getPage(pageNumber);
        return { async getTextContent() { try { return await page.getTextContent(); } finally { active -= 1; } } };
      } catch (error) {
        active -= 1;
        throw error;
      }
    },
  };
  const partial = await extractDocumentText(measuredFake);
  assert.equal(maximumActive, 1, 'pages should be extracted sequentially');
  assert.equal(partial.pages[1].status, 'error');
  assert.match(partial.pages[1].reason ?? '', /الصفحة 2.*تعذّر/);
  assert.equal(partial.pages[2].status, 'empty');
  assert.match(partial.pages[2].reason ?? '', /الصفحة 3.*ممسوحة ضوئياً/);
  assert.equal(partial.pages[3].status, 'ready');
  for (const [startPage, endPage] of [[0, 1], [2, 5], [3, 2], [1.5, 2], [1, 5]] as const) {
    assert.throws(() => createStudyMaterial(partial, { title: 'اختبار', startPage, endPage }), RangeError);
  }
  const material = createStudyMaterial(partial, { title: 'اختبار', startPage: 1, endPage: 4 });
  assert.equal(material.summary[0].text, 'Unique factual sentence.');
  assert.equal(material.summary[0].pageNumber, 1);
  assert.ok(material.questions.length > 0);
  assert.ok(material.questions.every(q => q.prompt.includes('____') && q.answer.includes(`(صفحة PDF ${q.pageNumber})`)));
  assert.ok(material.questions.every(q => partial.pages[q.pageNumber - 1].text.includes(q.answer.split(' (صفحة PDF')[0])));
  assert.ok(material.summary.every(c => partial.pages.filter(p => p.status === 'ready').some(p => p.text.includes(c.text))));
  assert.ok(material.warnings?.some(w => w.includes('الصفحة 2')));
  assert.ok(material.warnings?.some(w => w.includes('الصفحة 3')));
  assert.ok(!JSON.stringify(material).includes('fabricated'));

  const adminAndLesson = {
    pageCount: 1,
    pages: [{ pageNumber: 1, status: 'ready' as const, text: 'هذا مستند اختباري. تعليمات رفع الملف هنا. رقم الإصدار 2. يجب أن تمر المواد عبر الغشاء الخلوي وفق تدرج التركيز. تنتقل جزيئات الماء عبر الغشاء شبه المنفذ بعملية الانتشار.' }],
  };
  const filteredAr = createStudyMaterial(adminAndLesson, { title: '', startPage: 1, endPage: 1 }, arMessages);
  assert.equal(filteredAr.title, arMessages.defaultTitle);
  assert.ok(filteredAr.questions.length > 0);
  assert.ok(filteredAr.questions.every(q => !/اختباري|تعليمات رفع|الإصدار/.test(q.answer)));
  const adminOnly = { pageCount: 1, pages: [{ pageNumber: 1, status: 'ready' as const, text: 'هذا مستند اختباري. هذا تنبيه إداري لرفع الملف.' }] };
  assert.equal(createStudyMaterial(adminOnly, { title: 'x', startPage: 1, endPage: 1 }).questions.length, 0);
  const englishAdmin = { pageCount: 1, pages: [{ pageNumber: 1, status: 'ready' as const, text: 'This is a demonstration file. Upload instructions are listed here. Water molecules cross a selectively permeable membrane through osmosis. Active transport moves particles against their concentration gradient using energy.' }] };
  const filteredEn = createStudyMaterial(englishAdmin, { title: 'x', startPage: 1, endPage: 1 }, enMessages);
  assert.ok(filteredEn.questions.length > 0);
  assert.ok(filteredEn.questions.every(q => !/demonstration file|upload instructions/i.test(q.answer)));
  for (const text of ['This is a test document intended only for reviewing the application interface.', 'Alert: this document must not be used as a real textbook.', 'Warning: upload instructions are intended for administrators and not students.']) {
    const admin = { pageCount: 1, pages: [{ pageNumber: 1, status: 'ready' as const, text }] };
    assert.equal(createStudyMaterial(admin, { title: 'Admin', startPage: 1, endPage: 1 }, enMessages).questions.length, 0, text);
  }
  const shortOnly = { pageCount: 1, pages: [{ pageNumber: 1, status: 'ready' as const, text: 'Cells use energy.' }] };
  assert.equal(createStudyMaterial(shortOnly, { title: 'x', startPage: 1, endPage: 1 }).questions.length, 0);
  const localizedEmpty = await extractDocumentText({ numPages: 1, async getPage() { return { async getTextContent() { return { items: [] }; } }; } }, undefined, enMessages);
  assert.match(localizedEmpty.pages[0].reason ?? '', /^Page 1:/);
  assert.match(createStudyMaterial(partial, { title: 'x', startPage: 1, endPage: 4 }, enMessages).warnings?.[0] ?? '', /^Page 2:/);
  assert.throws(() => createStudyMaterial(partial, { title: 'x', startPage: 0, endPage: 4 }, enMessages), new RegExp(enMessages.invalidRange.replace('{total}', '4')));
  await assert.rejects(() => extractDocumentText({ numPages: -1, async getPage() { throw new Error(); } }, undefined, enMessages), new RegExp(enMessages.invalidPageCount));

  const manyPages: PdfDocumentProxyCompatible = {
    numPages: 6,
    async getPage(pageNumber) { return { async getTextContent() { return { items: [{ str: `Page ${pageNumber} contains a distinctive grounded observation.` }] }; } }; },
  };
  const broad = await extractDocumentText(manyPages);
  const broadMaterial = createStudyMaterial(broad, { title: 'Across range', startPage: 1, endPage: 6 });
  assert.equal(broadMaterial.summary.length, 5);
  assert.equal(new Set(broadMaterial.summary.map(c => c.pageNumber)).size, 5);
  assert.equal(broadMaterial.summary[0].pageNumber, 1);
  assert.equal(broadMaterial.summary.at(-1)?.pageNumber, 6);

  const empty = await extractDocumentText({ numPages: 1, async getPage() { return { async getTextContent() { return { items: [{ str: '   ' }] }; } }; } });
  assert.equal(empty.pages[0].status, 'empty');
  assert.throws(() => createStudyMaterial(empty, { title: '', startPage: 1, endPage: 2 }), RangeError);

  const imageOnly = await getDocument({ data: makeImageOnlyPdf(), useSystemFonts: true }).promise;
  const scanned = await extractDocumentText(imageOnly as unknown as PdfDocumentProxyCompatible);
  assert.equal(scanned.pages[0].status, 'empty', 'image-only scanned page has no extractable text');

  await assert.rejects(getDocument({ data: new TextEncoder().encode('not a PDF; deliberately corrupt') }).promise);
  const arabicPdf = await getDocument({ data: new Uint8Array(await readFile(new URL('./fixtures/arabic-lesson.pdf', import.meta.url))), useSystemFonts: true }).promise;
  const arabic = await extractDocumentText(arabicPdf as unknown as PdfDocumentProxyCompatible);
  assert.equal(arabic.pageCount, 2);
  assert.ok(arabic.pages.every(page => page.status === 'ready'));
  assert.match(arabic.pages[1].text, /النقل النشط/);
  const arabicStudy = createStudyMaterial(arabic, { title: 'النقل', startPage: 2, endPage: 2 });
  assert.ok(arabicStudy.summary.every(item => item.pageNumber === 2 && arabic.pages[1].text.includes(item.text)));
  assert.ok(arabicStudy.questions.every(question => question.prompt.includes('____')));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => extractDocumentText(manyPages, controller.signal), { name: 'AbortError' });
  await pdf.loadingTask.destroy(); await imageOnly.loadingTask.destroy(); await arabicPdf.loadingTask.destroy();
  console.log('pdf-study tests passed (including actual Arabic PDF and cancellation)');
}

void run();
