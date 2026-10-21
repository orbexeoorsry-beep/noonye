import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { lessonQuizService, type QuizQuestion } from '../src/services/lessonQuizService';

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
