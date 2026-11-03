import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { featureFlags } from '../src/config/feature-flags';

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const values = (x: unknown): string[] => typeof x === 'string' ? [x] : x && typeof x === 'object' ? Object.values(x).flatMap(values) : [];
const unsupportedClaims = /Gemini|جيمني|جيميني|مدعوم.{0,12}بالذكاء|مساعد.{0,12}ذكي|تعلم.{0,12}ذكي|أدوات ذكية|تلميح ذكي|تحليل ذكي|AI[- ]powered|powered by AI|intelligent assistant|smart (?:learning|tools|assistant|hint)|instant (?:understanding|comprehension)|Exceptional Mastery|استيعاب استثنائي|إتقان تام/i;
const unsupportedReviewClaims = /Comprehensive Lesson Summary|Complete summary of|Preparing Complete Study Summary|full curriculum details|analyzing full page contents|complete scrollable summary|Scrollable comprehensive summary|ملخص مراجعة الدرس الشامل|ملخص تفصيلي شامل|إعداد الملخص الدراسي الشامل|تحليل كامل محتوى|المفاهيم الكاملة|الملخص الشامل|ملخص شامل قابل للتمرير|Interactive Quiz|Clear Voice|صوت عربي واضح|strengthen critical thinking|تنشيط التفكير النقدي|reinforces both visual and auditory|تعزيز التركيز البصري/i;

test('Arabic and English product copy makes no unsupported provider, intelligence or assessment claims', () => {
  for (const [lang, dictionary] of Object.entries({ ar, en })) {
    assert.doesNotMatch(values(dictionary).join('\n'), unsupportedClaims, `${lang} dictionary`);
  }
  for (const file of ['src/pages/Home.tsx', 'index.html', 'metadata.json', 'src/config/appConfig.ts', 'src/features/ai-assistant/components/NoonToolsPanel.tsx', 'src/features/book-viewer/LessonSummaryModal.tsx']) {
    assert.doesNotMatch(read(file), unsupportedClaims, file);
  }
});

test('home, tools and summary do not promise learning gains, complete coverage or real audio', () => {
  for (const dictionary of [ar, en]) {
    assert.doesNotMatch(values(dictionary.home).join('\n'), /فهمك أفضل|understanding better|100%|تنسيق أصلي 100|Start Learning Now|ابدأ التعلم الآن/i);
  }
  for (const file of ['src/features/ai-assistant/components/NoonToolsPanel.tsx', 'src/features/book-viewer/LessonSummaryModal.tsx']) {
    // Block comments describe implementation, not user-facing copy. Rendered
    // loading/ready states and tool tabs are checked by the browser test too.
    assert.doesNotMatch(read(file).replace(/\/\*[\s\S]*?\*\//g, ''), unsupportedReviewClaims, file);
  }
  const tools = read('src/features/ai-assistant/components/NoonToolsPanel.tsx');
  assert.match(tools, /not AI output or a learning assessment/);
  assert.match(tools, /ليست مخرجات ذكاء اصطناعي أو تقييمًا للتعلم/);
  assert.match(tools, /do not play audio/);
  assert.match(tools, /لا تشغّل صوتًا فعليًا/);
  const summary = read('src/features/book-viewer/LessonSummaryModal.tsx');
  assert.match(summary, /not AI output, a learning assessment, or a guarantee of curriculum coverage/);
  assert.match(summary, /ليس مخرجات ذكاء اصطناعي أو تقييمًا للتعلم أو ضمانًا لتغطية المنهج/);
});

test('AI off remains the default and guards precede child component mounting', () => {
  assert.equal(featureFlags.aiAssistantEnabled, false);
  assert.equal(featureFlags.selectionEnabled, false);
  assert.equal(featureFlags.lessonSummaryEnabled, false);
  assert.match(read('src/features/book-viewer/PdfInteractionOverlay.tsx'), /if \(!isFeatureEnabled\('aiAssistantEnabled'\)[^\n]*return null;/);
  const tools = read('src/features/ai-assistant/components/NoonToolsPanel.tsx');
  assert.match(tools, /if \(!isFeatureEnabled\('aiAssistantEnabled'\) \|\| !props.isOpen\) return null;[\s\S]*?return <EnabledNoonToolsPanel/);
  const summary = read('src/features/book-viewer/LessonSummaryModal.tsx');
  assert.match(summary, /if \(!isFeatureEnabled\('lessonsEnabled'\) \|\| !isFeatureEnabled\('lessonSummaryEnabled'\) \|\| !props.isOpen\) return null;[\s\S]*?return <EnabledLessonSummaryModal/);
  const viewer = read('src/features/book-viewer/PdfViewer.tsx');
  assert.match(viewer, /const handleSelectElement[\s\S]*?if \(!aiAssistantEnabled\) return;[\s\S]*?setIsAiToolsOpen\(true\)/);
  assert.match(viewer, /isOverlayEnabled=\{aiAssistantEnabled && isOverlayEnabled\}/);
  assert.match(viewer, /isOpen=\{aiAssistantEnabled && isAiToolsOpen\}/);
  const selection = read('src/features/ai-assistant/components/SelectionAssistantPanel.tsx');
  assert.match(selection, /if \(!isFeatureEnabled\('aiAssistantEnabled'\)\) return null;[\s\S]*?return <EnabledSelectionAssistantPanel/);
});
