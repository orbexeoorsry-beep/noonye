import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { inspectPdfUpload, PdfUploadError } from '../src/features/local-documents/services/pdf-upload';

const fixture = async (name: string) => new Blob([await readFile(new URL(`./fixtures/${name}`, import.meta.url))], { type: 'application/pdf' });
const load = (data: ArrayBuffer) => getDocument({ data, useSystemFonts: true }).promise;
const limit = 50 * 1024 * 1024;
const valid = await inspectPdfUpload(await fixture('lesson-text.pdf'), limit, load);
assert.equal(valid.numPages, 3);
await valid.loadingTask.destroy();
for (const [name, message] of [
  ['fake.pdf', /ليس PDF صالحًا/], ['empty.pdf', /فارغ/],
  ['corrupt.pdf', /تالف/], ['password-protected.pdf', /محمي بكلمة مرور/],
] as const) {
  await assert.rejects(async () => inspectPdfUpload(await fixture(name), limit, load), message);
}
const scan = await inspectPdfUpload(await fixture('scanned-only.pdf'), limit, load);
assert.equal(scan.numPages, 1, 'Scanned files can be saved as actual PDF; text extraction decides study availability');
await scan.loadingTask.destroy();
let calls = 0;
await assert.rejects(() => inspectPdfUpload(new Blob(['%PDF-oversized']), 5, async () => { calls++; throw new Error(); }), /يتجاوز/);
assert.equal(calls, 0, 'Oversized PDF is rejected before parsing');
let destroyed = false;
await assert.rejects(() => inspectPdfUpload(new Blob(['%PDF-empty-pages']), limit, async () => ({ numPages: 0, loadingTask: { async destroy() { destroyed = true; } } })), /لا يحتوي/);
assert.equal(destroyed, true);
console.log('PDF upload: valid binary/parser, empty, spoofed, corrupt, password, size limit, scanned and cleanup tests passed');
