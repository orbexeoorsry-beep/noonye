import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

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
  assert.match(service, /geminiFeedback: string/); // public result shape remains compatible
  assert.match(service, /scorePercent: number/);
  assert.match(service, /gradeBadge: 'excellent' \| 'very_good' \| 'good' \| 'needs_review'/);
});
