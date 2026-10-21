import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { setLanguage, ar, en } from '../src/i18n';
import { PdfStudyPanel } from '../src/features/pdf-study/PdfStudyPanel';

assert.deepEqual(Object.keys(ar.pdfStudy).sort(), Object.keys(en.pdfStudy).sort());
for (const key of Object.keys(en.pdfStudy) as Array<keyof typeof en.pdfStudy>) {
  assert.ok(ar.pdfStudy[key].trim(), `Arabic ${key} is not empty`);
  assert.ok(en.pdfStudy[key].trim(), `English ${key} is not empty`);
  assert.deepEqual(ar.pdfStudy[key].match(/\{\w+\}/g)?.sort(), en.pdfStudy[key].match(/\{\w+\}/g)?.sort(), `Matching placeholders: ${key}`);
  assert.doesNotMatch(en.pdfStudy[key], /[\u0600-\u06ff]/, `English UI has no Arabic leak: ${key}`);
}
for (const lang of ['ar', 'en'] as const) {
  setLanguage(lang);
  const html = renderToStaticMarkup(React.createElement(PdfStudyPanel, {
    document: { numPages: 2 } as any, bookId: 'locale-test', isOpen: true,
    onClose() {}, onPage() {},
  }));
  assert.match(html, new RegExp(`dir="${lang === 'ar' ? 'rtl' : 'ltr'}"`));
  assert.ok(html.includes((lang === 'ar' ? ar : en).pdfStudy.heading));
  assert.ok(html.includes((lang === 'ar' ? ar : en).pdfStudy.description));
  if (lang === 'en') assert.doesNotMatch(html, /[\u0600-\u06ff]/);
}
const panel = await readFile(new URL('../src/features/pdf-study/PdfStudyPanel.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(panel, /[\u0600-\u06ff]/, 'All panel UI text is provided by i18n');
setLanguage('ar');
console.log('PASS pdf-study i18n: complete AR/EN key and placeholder parity, headings, descriptions, RTL/LTR, no hardcoded Arabic UI');
