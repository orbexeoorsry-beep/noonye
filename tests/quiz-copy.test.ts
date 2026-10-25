import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { lessonQuizService, type QuizQuestion } from '../src/services/lessonQuizService';
import { bookLessonsService } from '../src/services/bookLessonsService';
import { lessonSummaryService } from '../src/services/lessonSummaryService';
import type { AdminBook } from '../src/types/Book';

const modal = readFileSync(new URL('../src/features/book-viewer/LessonQuizModal.tsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/lessonQuizService.ts', import.meta.url), 'utf8');

test('quiz interface and every score tier are clearly local practice, not curriculum mastery claims', () => {
  assert.match(modal, /Local Practice \(Demo\)/);
  assert.match(modal, /تدريب محلي \(تجريبي\)/);
  assert.match(modal, /does not measure overall learning/);
  assert.match(modal, /لا تقيس النتيجة مستوى التعلم العام/);
  assert.doesNotMatch(modal.replace(/geminiFeedback/gi, ''), /GEMINI|Gemini/i);
  for (const copy of [
    'Practice score: 90% or higher', 'Practice score: 75–89%',
    'Practice score: 50–74%', 'Practice score: below 50%',
    'نتيجة التدريب: 90٪ فأكثر', 'نتيجة التدريب: 75–89٪',
    'نتيجة التدريب: 50–74٪', 'نتيجة التدريب: أقل من 50٪',
  ]) assert.ok(service.includes(copy), `missing score tier copy: ${copy}`);
  assert.doesNotMatch(service.replace(/geminiFeedback/gi, '').replace(/not Gemini feedback/gi, ''), /Gemini|جيمني|Exceptional Mastery|استيعاب استثنائي|إتقان تام للمنهج|مستوى رفيع ومتقن/i);
  assert.match(service, /geminiFeedback: string/);
  assert.match(service, /scorePercent: number/);
  assert.match(service, /gradeBadge: 'excellent' \| 'very_good' \| 'good' \| 'needs_review'/);
});

test('synthetic answers preserve scoring at every tier boundary without mastery or AI attribution', () => {
  const questions: QuizQuestion[] = Array.from({ length: 100 }, (_, i) => ({
    id: `synthetic-${i}`, lessonId: 'synthetic', lessonTitle: 'Synthetic lesson',
    question: 'Synthetic question', options: ['A', 'B', 'C', 'D'], correctIndex: 0,
    explanation: 'Synthetic explanation', hint: 'Synthetic hint',
  }));
  for (const lang of ['ar', 'en'] as const) {
    for (const correct of [0, 49, 50, 74, 75, 89, 90, 100]) {
      const answers = Object.fromEntries(questions.map((q, i) => [q.id, i < correct ? 0 : 1]));
      const result = lessonQuizService.evaluateQuiz(questions, answers, lang);
      assert.equal(result.scorePercent, correct);
      assert.equal(result.correctAnswers, correct);
      assert.equal(result.wrongAnswers, 100 - correct);
      assert.equal(result.answers.length, 100);
      assert.equal(result.gradeBadge, correct >= 90 ? 'excellent' : correct >= 75 ? 'very_good' : correct >= 50 ? 'good' : 'needs_review');
      assert.match(result.gradeLabel, lang === 'en' ? /Practice score/ : /نتيجة التدريب/);
      assert.match(result.geminiFeedback, lang === 'en' ? /local practice questions/ : /أسئلة التدريب المحلية/);
      assert.doesNotMatch(result.gradeLabel + result.geminiFeedback, /Gemini|جيمني|mastery|إتقان|متقن|جاهز تماماً/i);
    }
  }
});

test('lesson six curriculum quiz and local summary stay neutral in Arabic and English', () => {
  const book: AdminBook = {
    id: 'quiz-copy-regression', source: 'admin', status: 'demo',
    title: 'كتاب اصطناعي للاختبار', subject: 'موضوع اصطناعي', gradeLevel: 'اختبار',
    totalPages: 96, currentPage: 1, progressPercent: 0, lastOpened: '',
    summary: 'كتاب اصطناعي للتحقق من أسئلة الدرس.', accentColor: '#000000', pages: [],
  };
  const lessons = bookLessonsService.generateCurriculumForAnyBook(book, 96);
  assert.equal(lessons.length, 8);
  const lesson = lessons[5];
  assert.ok(lesson, '96-page book must include lesson six');
  const neutralConcept = 'مراجعة محاور ومفاهيم الدرس والأمثلة المرتبطة بها';
  const masteryOrReadinessClaim = /الإتقان|إتقان التام|استعداد الاختبارات|جاهزية|جاهز|mastery|readiness/i;

  for (const lang of ['ar', 'en'] as const) {
    const questions = lessonQuizService.generateQuestionsFromLesson(lesson, lang);
    assert.ok(questions.length > 0, `${lang}: lesson-six quiz must not be empty`);
    const conceptQuestion = questions.find((question) => question.question.includes(neutralConcept));
    assert.ok(conceptQuestion, `${lang}: neutral concept must be carried into a generated question`);
    assert.ok(conceptQuestion.options[conceptQuestion.correctIndex]?.includes(neutralConcept), `${lang}: correct answer must carry the neutral concept`);

    for (const question of questions) {
      const copy = [question.question, ...question.options, question.options[question.correctIndex], question.explanation].join('\n');
      assert.doesNotMatch(copy, masteryOrReadinessClaim, `${lang}: quiz content must not claim mastery or readiness`);
    }

    const summary = lessonSummaryService.buildSingleLessonCompleteSummary(lesson, book.title, '', lang);
    assert.ok(summary.reviewQuestions.length > 0, `${lang}: lesson-six local summary must include review questions`);
    for (const review of summary.reviewQuestions) {
      assert.doesNotMatch(`${review.question}\n${review.answer}`, masteryOrReadinessClaim, `${lang}: review content must not claim mastery or readiness`);
    }
  }
});

test('partial-source lesson six final summary stays page-scoped across every output field', () => {
  const book: AdminBook = {
    id: 'partial-summary-regression', source: 'admin', status: 'demo',
    title: 'كتاب اصطناعي للاختبار', subject: 'موضوع اصطناعي', gradeLevel: 'اختبار',
    totalPages: 96, currentPage: 1, progressPercent: 0, lastOpened: '',
    summary: '', accentColor: '#000000', pages: [],
  };
  const lesson = bookLessonsService.generateCurriculumForAnyBook(book, book.totalPages)[5];
  assert.equal(lesson.pageNumber, 61);
  assert.equal(lesson.endPageNumber, 72);
  assert.equal(lesson.endPageNumber - lesson.pageNumber + 1, 12);
  assert.ok(12 < book.totalPages, 'the source is only part of the book');
  const wholeCurriculumClaim = /شامل|ختامي|نهائي|كافة\s+الموضوعات|كافة\s+موضوعات|جميع\s+موضوعات|comprehensive|final\s+(?:review|assessment)|all\s+(?:topics|concepts)|entire\s+curriculum/i;

  for (const lang of ['ar', 'en'] as const) {
    const summary = lessonSummaryService.buildSingleLessonCompleteSummary(lesson, book.title, '', lang);
    assert.equal(summary.sourcePages, lang === 'en' ? 'Pages 61-72' : 'صفحات 61-72');
    assert.match(summary.overview, /هذا الجزء/);
    assert.match(summary.overview, /61-72 \(12 من 96 صفحة\)/);
    assert.ok(summary.sections.length > 0, `${lang}: final sections must not be empty`);
    assert.ok(summary.sections.some((section) => section.items.includes(summary.overview)), `${lang}: sections must carry the page-scoped overview`);
    assert.doesNotMatch(summary.overview, wholeCurriculumClaim, `${lang}: final overview must not claim full-book coverage`);
    assert.doesNotMatch(JSON.stringify(summary.sections), wholeCurriculumClaim, `${lang}: final section titles and items must not claim full-book coverage`);
    assert.doesNotMatch(JSON.stringify(summary), wholeCurriculumClaim, `${lang}: no final summary field may claim full-book coverage`);

    // Missing metadata must not reintroduce comprehensive wording through fallback copy.
    const fallback = lessonSummaryService.buildSingleLessonCompleteSummary({ ...lesson, summary: '' }, book.title, '', lang);
    assert.match(fallback.overview, /61-72/);
    assert.match(fallback.overview, lang === 'en' ? /limited to/ : /فقط/);
    assert.doesNotMatch(JSON.stringify(fallback), wholeCurriculumClaim, `${lang}: partial-source fallback must stay scoped`);
  }

  // Generated metadata is Arabic even in the English UI. Exercise English source copy
  // separately rather than treating a language switch as translation of that metadata.
  const englishLesson = {
    ...lesson,
    title: 'Lesson 6: Review of this part (pp. 61-72)',
    unitTitle: 'Review of this part',
    summary: 'Review of concepts, examples and activities in this part only, pages 61-72 (12 of 96 pages).',
    keyConcepts: ['Review the concepts and examples in this part.'],
    curriculumContext: 'This part covers pages 61-72 of the book only.',
  };
  for (const source of [englishLesson, { ...englishLesson, summary: '' }]) {
    const summary = lessonSummaryService.buildSingleLessonCompleteSummary(source, 'Synthetic test book', '', 'en');
    assert.equal(summary.sourcePages, 'Pages 61-72');
    assert.match(summary.overview, /61-72/);
    assert.match(summary.overview, /this part|limited to/);
    assert.doesNotMatch(JSON.stringify(summary), /[\u0600-\u06ff]/, 'English-source fixture must exercise English output, not Arabic metadata');
    assert.doesNotMatch(summary.overview, wholeCurriculumClaim);
    assert.doesNotMatch(JSON.stringify(summary.sections), wholeCurriculumClaim);
    assert.doesNotMatch(JSON.stringify(summary), wholeCurriculumClaim);
  }
  for (const claim of ['شامل', 'ختامي', 'كافة الموضوعات', 'كافة موضوعات الكتاب', 'Comprehensive', 'final assessment', 'all topics', 'entire curriculum']) {
    assert.match(claim, wholeCurriculumClaim, `regression guard must recognize ${claim}`);
  }
});
