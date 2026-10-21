import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { extractDocumentText, createStudyMaterial } from './services/pdfStudyService';
import type { DocumentExtraction, ExtractedPage } from './types';
import { useI18n } from '../../i18n';

interface LessonRange { title: string; startPage: number; endPage: number }
interface Props {
  document: PDFDocumentProxy;
  bookId: string;
  isOpen: boolean;
  onClose(): void;
  onPage(page: number): void;
}

/** This feature deliberately never imports an AI gateway or quiz score service. */
export function PdfStudyPanel({ document: doc, bookId, isOpen, onClose, onPage }: Props) {
  const { t, format, isRTL } = useI18n();
  const s = t.pdfStudy;
  const [extraction, setExtraction] = useState<DocumentExtraction | null>(null);
  const [failure, setFailure] = useState('');
  const [retry, setRetry] = useState(0);
  const [title, setTitle] = useState('');
  const [startPage, setStartPage] = useState('1');
  const [endPage, setEndPage] = useState('1');
  const [materialRange, setMaterialRange] = useState<LessonRange | null>(null);
  const material = extraction && materialRange ? createStudyMaterial(extraction, materialRange, s) : null;
  const pageReason = (page: ExtractedPage) => format(page.status === 'error' ? s.errorPage : s.emptyPage, { page: page.pageNumber });
  const [validation, setValidation] = useState('');
  const [lessons, setLessons] = useState<LessonRange[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const storageKey = `noon_pdf_lessons_v1:${bookId}`;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setExtraction(null); setFailure(''); setMaterialRange(null);
    extractDocumentText(doc, controller.signal).then(result => { if (!cancelled) setExtraction(result); })
      .catch(() => { if (!cancelled) setFailure('extractionFailed'); });
    return () => { cancelled = true; controller.abort(); };
  }, [doc, retry]);

  useEffect(() => {
    setLessons([]); setTitle(''); setStartPage('1'); setEndPage('1'); setSaveMessage('');
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(saved)) throw new Error('Invalid lessons');
      setLessons(saved.filter(item => item && typeof item.title === 'string' && Number.isInteger(item.startPage)
        && Number.isInteger(item.endPage) && item.startPage >= 1 && item.endPage >= item.startPage && item.endPage <= doc.numPages));
    } catch { setSaveMessage('restoreFailed'); }
  }, [storageKey, doc.numPages]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = window.document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', keydown);
    return () => { window.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [isOpen, onClose]);

  const changeRange = (next: LessonRange) => {
    setTitle(next.title); setStartPage(String(next.startPage)); setEndPage(String(next.endPage));
    setMaterialRange(null); setValidation(''); setSaveMessage('');
  };
  const build = (event: React.FormEvent) => {
    event.preventDefault(); setMaterialRange(null); setValidation(''); setSaveMessage('');
    if (!extraction) return;
    if (!title.trim()) { setValidation('titleRequired'); return; }
    const range = { title: title.trim(), startPage: Number(startPage), endPage: Number(endPage) };
    try {
      createStudyMaterial(extraction, range, s);
      setMaterialRange(range);
      const next = [...lessons.filter(item => item.title !== range.title), range];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); setLessons(next); setSaveMessage('saved'); }
      catch { setSaveMessage('saveFailed'); }
    } catch (error) { setValidation('invalidRange'); }
  };
  const cite = (page: number) => <button type="button" aria-label={format(s.goToPage, { page })} className="min-h-11 px-3 text-indigo-700 underline text-sm font-bold" onClick={() => { onClose(); onPage(page); }}>{format(s.page, { page })} ↗</button>;
  const ready = extraction?.pages.filter(page => page.status === 'ready').length || 0;

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 flex justify-end" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="pdf-study-heading" dir={isRTL ? 'rtl' : 'ltr'}
        className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl text-slate-900 select-text"
        onClick={event => event.stopPropagation()}
        onKeyDown={event => {
          if (event.key !== 'Tab') return;
          const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, summary, [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
          const first = targets[0]; const last = targets[targets.length - 1];
          if (event.shiftKey && window.document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && window.document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        <header className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center gap-4">
          <div><p className="text-xs text-indigo-700 font-bold mb-1">{s.source}</p><h2 id="pdf-study-heading" className="text-lg font-bold">{s.heading}</h2></div>
          <button ref={closeRef} type="button" onClick={onClose} className="min-h-11 px-4 rounded-xl border border-slate-300">{s.close}</button>
        </header>
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
          <p className="text-sm leading-7 text-slate-600">{s.description}</p>
          {!extraction && !failure && <p role="status" className="rounded-xl bg-indigo-50 p-4">{format(s.extracting, { total: doc.numPages })}</p>}
          {failure && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">{s.extractionFailed}<button type="button" className="underline min-h-11 block" onClick={() => setRetry(value => value + 1)}>{s.retry}</button></div>}
          {extraction && <>
            <div role="status" className={`p-4 rounded-xl border text-sm leading-7 ${ready ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
              {format(s.extracted, { ready, total: extraction.pageCount })}
              {ready === 0 && <p>{s.noText}</p>}
              {extraction.pages.some(page => page.status !== 'ready') && <ul className="list-disc ps-5">{extraction.pages.filter(page => page.status !== 'ready').map(page => <li key={page.pageNumber}>{pageReason(page)}</li>)}</ul>}
            </div>
            <form onSubmit={build} className="space-y-3 rounded-2xl border border-slate-200 p-4 bg-slate-50">
              {lessons.length > 0 && <label className="block text-sm font-bold">{s.savedLesson}<select aria-label={s.selectSavedLesson} className="mt-2 w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3" defaultValue="" onChange={event => { if (event.target.value !== '') changeRange(lessons[Number(event.target.value)]); }}><option value="">{s.chooseLesson}</option>{lessons.map((lesson, index) => <option key={`${lesson.title}-${index}`} value={index}>{lesson.title} · {lesson.startPage}–{lesson.endPage}</option>)}</select></label>}
              <label className="block text-sm font-bold">{s.lessonName}<input value={title} maxLength={120} onChange={event => { setTitle(event.target.value); setMaterialRange(null); }} className="block w-full mt-2 min-h-11 rounded-lg border border-slate-300 px-3 bg-white" placeholder={s.lessonPlaceholder} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold">{s.fromPage}<input type="number" min="1" max={doc.numPages} step="1" value={startPage} onChange={event => { setStartPage(event.target.value); setMaterialRange(null); }} className="block w-full min-h-11 rounded-lg border border-slate-300 px-3 bg-white mt-2" /></label>
                <label className="text-sm font-bold">{s.toPage}<input type="number" min="1" max={doc.numPages} step="1" value={endPage} onChange={event => { setEndPage(event.target.value); setMaterialRange(null); }} className="block w-full min-h-11 rounded-lg border border-slate-300 px-3 bg-white mt-2" /></label>
              </div>
              <button type="submit" disabled={!ready} className="w-full min-h-12 bg-indigo-600 text-white rounded-xl px-4 font-bold disabled:bg-slate-300 disabled:text-slate-600">{s.build}</button>
              {validation && <p role="alert" className="text-red-700 text-sm">{validation === 'titleRequired' ? s.titleRequired : format(s.invalidRange, { total: doc.numPages })}</p>}
              {saveMessage && <p role="status" className="text-xs text-slate-600 leading-6">{s[saveMessage as keyof typeof s]}</p>}
            </form>
            <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-bold min-h-8">{s.extractedText}</summary><div className="space-y-4 mt-4">{extraction.pages.map(page => <article key={page.pageNumber} className="border-t border-slate-100 pt-3">{cite(page.pageNumber)}<p dir="auto" className="text-sm leading-7 whitespace-pre-wrap break-words">{page.text || pageReason(page)}</p></article>)}</div></details>
          </>}
          {material && <section data-testid="study-material" className="space-y-5">
            <h3 className="text-lg font-bold">{format(s.materialTitle, { title: material.title, start: material.startPage, end: material.endPage })}</h3>
            {material.warnings?.map((warning, index) => <p role="alert" key={index} className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm leading-7">{warning}</p>)}
            {!material.summary.length ? <p role="alert" className="bg-amber-50 rounded-xl p-4">{s.emptyRange}</p> : <>
              <h4 className="font-bold">{s.summaryHeading}</h4>
              {material.summary.map((item, index) => <article key={index} className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4"><blockquote dir="auto" className="leading-8 text-sm break-words">{item.text}</blockquote>{cite(item.pageNumber)}</article>)}
              <h4 className="font-bold">{s.questionsHeading}</h4>
              {!material.questions.length && <p role="status" className="text-sm leading-7 text-slate-600">{s.noQuestions}</p>}
              {material.questions.map((question, index) => <article key={index} className="border border-slate-200 rounded-xl p-4"><p dir="auto" className="leading-8 text-sm break-words">{question.prompt}</p>{cite(question.pageNumber)}<details><summary className="cursor-pointer text-indigo-700 min-h-11 pt-3 font-bold text-sm">{s.showReference}</summary><p dir="auto" className="text-sm leading-8 mt-3 break-words">{question.answer}</p></details></article>)}
            </>}
          </section>}
        </div>
      </section>
    </div>
  );
}
