import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = path.resolve(process.env.E2E_ARTIFACT_DIR || '/workspace/noonye-review-artifacts-v2');
const BASE = new URL(process.env.PREVIEW_URL || 'http://127.0.0.1:4173');
assert.ok(['localhost', '127.0.0.1'].includes(BASE.hostname) || (BASE.protocol === 'https:' && BASE.hostname.endsWith('.manus.computer')), 'Refusing to test production or an unapproved origin');
const executablePath = process.env.CHROMIUM_BIN || '/usr/bin/chromium';
const scenarios: Array<{ name: string; passed: boolean; error?: string }> = [];
const requests: string[] = [];
const forbidden: string[] = [];
let browser: Browser;

async function context(mobile = false): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
  ctx.setDefaultTimeout(10000);
  ctx.on('request', request => {
    const url = new URL(request.url());
    if (!['http:', 'https:'].includes(url.protocol)) return;
    const descriptor = `${request.method()} ${url.origin}${url.pathname}`;
    if (url.origin !== BASE.origin) requests.push(descriptor);
    // Font CSS/woff GETs are existing presentation assets, never student/PDF transmission.
    const fontAsset = request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
    if ((url.origin !== BASE.origin && !fontAsset) || /generativelanguage|openai\.com|anthropic\.com|\/api\/assistant/i.test(url.href)) forbidden.push(descriptor);
  });
  return ctx;
}
async function scenario(name: string, run: () => Promise<void>) {
  try { await run(); scenarios.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { scenarios.push({ name, passed: false, error: error instanceof Error ? error.stack : String(error) }); console.error(`FAIL ${name}: ${error}`); }
}
async function addPage(page: Page) {
  await page.goto(BASE.href, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'إضافة كتاب', exact: true }).click();
}
async function upload(page: Page, fixture: string, open = true) {
  await addPage(page);
  await page.getByLabel('ملف PDF للرفع', { exact: true }).setInputFiles(path.join(ROOT, 'tests/fixtures', fixture));
  if (open) await page.getByRole('button', { name: 'فتح الكتاب في العارض', exact: true }).click();
}
async function study(page: Page) {
  await page.getByRole('button', { name: 'مراجعة الدرس', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'مراجعة الدرس بالصفحات', exact: true });
  await dialog.getByText(/استُخرج نص \d+ من \d+ صفحة\./).waitFor();
  return dialog;
}
async function screenshot(page: Page, name: string) { await page.screenshot({ path: path.join(ARTIFACTS, name), fullPage: false }); }
async function assertCanvasFits(page: Page, pageNumber: number) {
  await page.waitForFunction((number) => {
    const container = document.getElementById(`page-container-${number}`);
    const canvas = container?.querySelector('canvas');
    if (!canvas || container?.getAttribute('aria-busy') !== 'false') return false;
    const box = canvas.getBoundingClientRect();
    return box.width > 0 && box.left >= 0 && box.right <= innerWidth + 1;
  }, pageNumber);
  const metrics = await page.locator(`#page-container-${pageNumber} canvas`).evaluate(canvas => {
    const box = canvas.getBoundingClientRect();
    return { left: box.left, right: box.right, width: box.width, viewport: innerWidth };
  });
  assert.ok(metrics.left >= 0 && metrics.right <= metrics.viewport + 1, JSON.stringify(metrics));
  return metrics;
}
async function assertCitationAtTop(page: Page, pageNumber: number) {
  await page.waitForFunction(number => {
    const target = document.getElementById(`page-container-${number}`);
    const pane = target?.parentElement?.parentElement;
    return !!target && !!pane && Math.abs(target.getBoundingClientRect().top - pane.getBoundingClientRect().top) < 3;
  }, pageNumber);
}
async function switchLanguage(page: Page, language: 'ar' | 'en') {
  await page.getByRole('button', { name: /Switch language/ }).click();
  await page.waitForFunction(lang => document.documentElement.lang === lang, language);
}
async function run() {
  await mkdir(ARTIFACTS, { recursive: true });
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  await scenario('desktop: binary PDF upload, 3-page extraction, 2–3 lesson citations, saved lesson reload', async () => {
    const ctx = await context();
    try {
      const page = await ctx.newPage();
      await upload(page, 'lesson-text.pdf');
      const dialog = await study(page);
      assert.match(await dialog.innerText(), /استُخرج نص 3 من 3 صفحة/);
      await dialog.getByLabel('اسم الدرس', { exact: true }).fill('النقل عبر الغشاء');
      await dialog.getByLabel('من صفحة PDF', { exact: true }).fill('2');
      await dialog.getByLabel('إلى صفحة PDF', { exact: true }).fill('3');
      await dialog.getByRole('button', { name: 'عرض الملخص والتدريب', exact: true }).click();
      const material = dialog.getByTestId('study-material');
      await material.waitFor();
      const text = await material.innerText();
      assert.match(text, /Active transport/); assert.match(text, /Osmosis/);
      assert.doesNotMatch(text, /Cell membranes control|Diffusion moves|Lesson source page 1/);
      assert.match(text, /____/); assert.match(text, /بدون درجات/);
      await material.scrollIntoViewIfNeeded();
      await screenshot(page, 'desktop-summary-questions.png');
      const cited = material.locator('article').filter({ has: page.locator('blockquote') }).filter({ hasText: 'Active transport' });
      await cited.getByRole('button', { name: 'الانتقال إلى صفحة PDF 2', exact: true }).click();
      await dialog.waitFor({ state: 'detached' });
      await page.waitForFunction(() => {
        const page2 = document.getElementById('page-container-2');
        if (!page2) return false;
        const top = page2.getBoundingClientRect().top;
        const pane = page2.parentElement?.parentElement;
        return !!pane && Math.abs(top - pane.getBoundingClientRect().top) < 3 && page2.getAttribute('aria-busy') === 'false';
      });
      await screenshot(page, 'desktop-cited-page-2.png');
      await page.reload();
      await page.getByRole('navigation').getByRole('button', { name: 'المكتبة', exact: true }).click();
      await page.getByRole('button').filter({ has: page.getByRole('heading', { name: 'lesson-text', exact: true }) }).click();
      const restored = await study(page);
      await restored.getByLabel('اختيار درس محفوظ', { exact: true }).selectOption({ label: 'النقل عبر الغشاء · 2–3' });
      assert.equal(await restored.getByLabel('اسم الدرس', { exact: true }).inputValue(), 'النقل عبر الغشاء');
      assert.equal(await restored.getByLabel('من صفحة PDF', { exact: true }).inputValue(), '2');
      assert.equal(await restored.getByLabel('إلى صفحة PDF', { exact: true }).inputValue(), '3');
      await screenshot(page, 'desktop-saved-lesson.png');
    } finally { await ctx.close(); }
  });
  await scenario('desktop: changed range clears stale output and reversed range reports failure', async () => {
    const ctx = await context();
    try {
      const page = await ctx.newPage(); await upload(page, 'lesson-text.pdf'); const dialog = await study(page);
      await dialog.getByLabel('اسم الدرس', { exact: true }).fill('اختبار النطاق');
      await dialog.getByRole('button', { name: 'عرض الملخص والتدريب', exact: true }).click();
      await dialog.getByTestId('study-material').waitFor();
      await dialog.getByLabel('من صفحة PDF', { exact: true }).fill('3');
      assert.equal(await dialog.getByTestId('study-material').count(), 0);
      await dialog.getByLabel('إلى صفحة PDF', { exact: true }).fill('2');
      await dialog.getByRole('button', { name: 'عرض الملخص والتدريب', exact: true }).click();
      assert.match(await dialog.getByRole('alert').innerText(), /نطاق الصفحات غير صالح/);
      await screenshot(page, 'desktop-invalid-range.png');
    } finally { await ctx.close(); }
  });
  await scenario('scanned PDF: explicit no-text cause, no substitute material or scores', async () => {
    const ctx = await context();
    try {
      const page = await ctx.newPage(); await upload(page, 'scanned-only.pdf'); const dialog = await study(page);
      assert.match(await dialog.innerText(), /استُخرج نص 0 من 1 صفحة/);
      assert.match(await dialog.innerText(), /OCR غير متاح/);
      assert.equal(await dialog.getByRole('button', { name: 'عرض الملخص والتدريب', exact: true }).isDisabled(), true);
      assert.equal(await dialog.getByTestId('study-material').count(), 0);
      await screenshot(page, 'desktop-scanned-no-text.png');
    } finally { await ctx.close(); }
  });
  await scenario('mixed PDF: page-specific warning and no summary/questions for empty-only lesson', async () => {
    const ctx = await context();
    try {
      const page = await ctx.newPage(); await upload(page, 'mixed-pages.pdf'); const dialog = await study(page);
      assert.match(await dialog.innerText(), /استُخرج نص 1 من 2 صفحة/);
      assert.match(await dialog.innerText(), /الصفحة 2/);
      await dialog.getByLabel('اسم الدرس', { exact: true }).fill('الصفحة الممسوحة');
      await dialog.getByLabel('من صفحة PDF', { exact: true }).fill('2');
      await dialog.getByLabel('إلى صفحة PDF', { exact: true }).fill('2');
      await dialog.getByRole('button', { name: 'عرض الملخص والتدريب', exact: true }).click();
      const output = dialog.getByTestId('study-material'); await output.waitFor();
      assert.equal(await output.locator('blockquote').count(), 0);
      assert.equal(await output.locator('article').count(), 0);
      assert.match(await output.innerText(), /لم يُنشأ ملخص أو تدريب/);
      await output.scrollIntoViewIfNeeded(); await screenshot(page, 'desktop-mixed-empty-lesson.png');
    } finally { await ctx.close(); }
  });
  for (const [fixture, cause] of [ ['fake.pdf', /ليس PDF صالحًا/], ['corrupt.pdf', /تالف/], ['empty.pdf', /فارغ/], ['password-protected.pdf', /محمي بكلمة مرور/] ] as const) {
    await scenario(`invalid upload: ${fixture} reports actual cause without saving substitute`, async () => {
      const ctx = await context();
      try {
        const page = await ctx.newPage(); await upload(page, fixture, false);
        await page.getByRole('heading', { name: 'تعذر تحميل الملف', exact: true }).waitFor();
        assert.match(await page.locator('body').innerText(), cause);
        assert.equal(await page.getByRole('button', { name: 'فتح الكتاب في العارض', exact: true }).count(), 0);
        const savedCount = await page.evaluate(async () => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => { const req = indexedDB.open('noon_learning_db', 2); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
          const count = await new Promise<number>((resolve, reject) => { const req = db.transaction('documents_metadata', 'readonly').objectStore('documents_metadata').count(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
          db.close(); return count;
        });
        assert.equal(savedCount, 0, 'Invalid upload must not save substitute metadata');
        await screenshot(page, `desktop-error-${fixture.replace('.pdf', '')}.png`);
      } finally { await ctx.close(); }
    });
  }
  await scenario('Arabic PDF: readable logical text and page-2 grounded review without generated facts', async () => {
    const ctx = await context();
    try {
      const page = await ctx.newPage(); await upload(page, 'arabic-lesson.pdf'); const dialog = await study(page);
      assert.match(await dialog.innerText(), /استُخرج نص 2 من 2 صفحة/);
      await dialog.getByLabel('اسم الدرس', { exact: true }).fill('النقل النشط');
      await dialog.getByLabel('من صفحة PDF', { exact: true }).fill('2');
      await dialog.getByLabel('إلى صفحة PDF', { exact: true }).fill('2');
      await dialog.getByRole('button', { name: 'عرض الملخص والتدريب', exact: true }).click();
      const material = dialog.getByTestId('study-material'); await material.waitFor();
      assert.match(await material.innerText(), /النقل النشط يحتاج إلى طاقة/);
      assert.doesNotMatch(await material.innerText(), /التركيز المرتفع/);
      for (const article of await material.locator('article').filter({ has: page.locator('details') }).all()) assert.doesNotMatch(await article.innerText(), /هذا مستند اختباري/);
      await material.scrollIntoViewIfNeeded(); await screenshot(page, 'desktop-arabic-study.png');
      await material.locator('article').filter({ has: page.locator('blockquote') }).first().getByRole('button').click();
      await page.waitForFunction(() => document.getElementById('page-container-2')?.getAttribute('aria-busy') === 'false');
      await screenshot(page, 'desktop-arabic-original-pdf.png');
    } finally { await ctx.close(); }
  });
  await scenario('mobile 390x844 touch emulation: upload, usable toolbar and page-grounded review', async () => {
    const ctx = await context(true);
    try {
      const page = await ctx.newPage(); await upload(page, 'lesson-text.pdf');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'No whole-page horizontal overflow');
      await assertCanvasFits(page, 1);
      await screenshot(page, 'mobile-reader-390x844.png');
      const dialog = await study(page);
      await dialog.getByLabel('اسم الدرس', { exact: true }).fill('مراجعة الهاتف');
      await dialog.getByLabel('من صفحة PDF', { exact: true }).fill('2');
      await dialog.getByLabel('إلى صفحة PDF', { exact: true }).fill('3');
      await dialog.getByRole('button', { name: 'عرض الملخص والتدريب', exact: true }).click();
      const material = dialog.getByTestId('study-material'); await material.waitFor();
      await material.scrollIntoViewIfNeeded();
      assert.match(await material.innerText(), /Active transport/);
      await screenshot(page, 'mobile-study-390x844.png');
      await material.locator('article').filter({ has: page.locator('blockquote') }).filter({ hasText: 'Active transport' }).getByRole('button', { name: 'الانتقال إلى صفحة PDF 2', exact: true }).click();
      await dialog.waitFor({ state: 'detached' });
      await assertCanvasFits(page, 2);
      await assertCitationAtTop(page, 2);
      await screenshot(page, 'mobile-cited-page-2-390x844.png');
      const nextDialog = await study(page);
      await nextDialog.getByLabel('اختيار درس محفوظ', { exact: true }).selectOption({ label: 'مراجعة الهاتف · 2–3' });
      await nextDialog.getByRole('button', { name: 'عرض الملخص والتدريب', exact: true }).click();
      await nextDialog.getByTestId('study-material').locator('article').filter({ has: page.locator('blockquote') }).filter({ hasText: 'Osmosis' }).getByRole('button', { name: 'الانتقال إلى صفحة PDF 3', exact: true }).click();
      await assertCanvasFits(page, 3);
      await assertCitationAtTop(page, 3);
      await screenshot(page, 'mobile-cited-page-3-390x844.png');
    } finally { await ctx.close(); }
  });
  await scenario('mobile: AR to EN to AR switches review UI, validation, saved lesson and RTL/LTR', async () => {
    const ctx = await context(true);
    try {
      const page = await ctx.newPage(); await upload(page, 'lesson-text.pdf');
      await switchLanguage(page, 'en');
      assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
      await page.getByRole('button', { name: 'Review lesson', exact: true }).click();
      let dialog = page.getByRole('dialog', { name: 'Review lesson by page', exact: true });
      await dialog.getByText('Extracted text from 3 of 3 pages.', { exact: true }).waitFor();
      assert.equal(await dialog.getAttribute('dir'), 'ltr');
      assert.doesNotMatch(await dialog.innerText(), /[\u0600-\u06ff]/);
      await dialog.getByRole('button', { name: 'Show summary and practice', exact: true }).click();
      assert.equal(await dialog.getByRole('alert').innerText(), 'Enter a lesson name first.');
      await dialog.getByLabel('Lesson name', { exact: true }).fill('Membrane transport');
      await dialog.getByLabel('From PDF page', { exact: true }).fill('2');
      await dialog.getByLabel('To PDF page', { exact: true }).fill('3');
      await dialog.getByRole('button', { name: 'Show summary and practice', exact: true }).click();
      const material = dialog.getByTestId('study-material'); await material.waitFor();
      assert.doesNotMatch(await dialog.innerText(), /[\u0600-\u06ff]/);
      assert.match(await dialog.innerText(), /not a comprehension assessment/);
      await material.scrollIntoViewIfNeeded(); await screenshot(page, 'mobile-en-study-ltr.png');
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await assertCanvasFits(page, 1);
      await screenshot(page, 'mobile-en-reader-ltr.png');
      await switchLanguage(page, 'ar');
      assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
      dialog = await study(page);
      assert.equal(await dialog.getAttribute('dir'), 'rtl');
      await dialog.getByLabel('اختيار درس محفوظ', { exact: true }).selectOption({ label: 'Membrane transport · 2–3' });
      await dialog.getByRole('button', { name: 'عرض الملخص والتدريب', exact: true }).click();
      assert.match(await dialog.innerText(), /ليس تقييمًا للفهم/);
      await dialog.getByTestId('study-material').scrollIntoViewIfNeeded();
      await screenshot(page, 'mobile-ar-study-after-language-switch.png');
    } finally { await ctx.close(); }
  });
  await scenario('English: scanned/mixed warnings, invalid range and empty lesson use English only', async () => {
    for (const fixture of ['scanned-only.pdf', 'mixed-pages.pdf']) {
      const ctx = await context(true);
      try {
        const page = await ctx.newPage(); await upload(page, fixture); await switchLanguage(page, 'en');
        await page.getByRole('button', { name: 'Review lesson', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Review lesson by page', exact: true });
        await dialog.getByText(/Extracted text from/).waitFor();
        assert.doesNotMatch(await dialog.innerText(), /[\u0600-\u06ff]/);
        if (fixture === 'scanned-only.pdf') {
          assert.match(await dialog.innerText(), /OCR is not available/);
          assert.ok(await dialog.getByRole('button', { name: 'Show summary and practice', exact: true }).isDisabled());
        } else {
          await dialog.getByLabel('Lesson name', { exact: true }).fill('Empty range');
          await dialog.getByLabel('From PDF page', { exact: true }).fill('2');
          await dialog.getByRole('button', { name: 'Show summary and practice', exact: true }).click();
          assert.match(await dialog.getByRole('alert').innerText(), /Invalid page range/);
          await dialog.getByLabel('To PDF page', { exact: true }).fill('2');
          await dialog.getByRole('button', { name: 'Show summary and practice', exact: true }).click();
          const material = dialog.getByTestId('study-material'); await material.waitFor();
          assert.match(await material.innerText(), /No summary or practice was created/);
          assert.doesNotMatch(await dialog.innerText(), /[\u0600-\u06ff]/);
          await material.scrollIntoViewIfNeeded();
        }
        await screenshot(page, `mobile-en-${fixture.replace('.pdf', '')}.png`);
      } finally { await ctx.close(); }
    }
  });
  await scenario('privacy: no AI request or external PDF/student transmission', async () => { assert.deepEqual(forbidden, []); });
  const summary = { preview: BASE.href, browser: await browser.version(), executablePath, profiles: ['desktop Linux 1440x1000', 'mobile touch emulation 390x844 (not physical device)'], scenarios, externalAssetRequests: [...new Set(requests)], forbiddenRequests: forbidden, passed: scenarios.filter(s => s.passed).length, failed: scenarios.filter(s => !s.passed).length };
  await writeFile(path.join(ARTIFACTS, 'pdf-study-e2e-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  if (summary.failed) process.exitCode = 1;
}
void run().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1; });
