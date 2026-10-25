import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const port = 43000 + Math.floor(Math.random() * 10000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn('node_modules/.bin/tsx', ['server.ts'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), NODE_ENV: 'development', DISABLE_HMR: 'true' }, stdio: 'ignore' });
let browser;
const fixture = { id: 'synthetic-p0-book', source: 'admin', title: 'Synthetic test book', subject: 'Synthetic', gradeLevel: 'Synthetic', totalPages: 1, currentPage: 1, progressPercent: 1, status: 'demo', lastOpened: 'Synthetic', summary: 'Synthetic fixture only', accentColor: '#0284c7', pages: [{ pageNumber: 1, chapterTitle: 'Synthetic chapter', lessonTitle: 'Synthetic lesson', pageNotesCount: 0, elements: [] }] };
const unsupported = /Gemini|جيمني|جيميني|أدوات ذكية|مساعد نون الذكي|مدعومة بالذكاء|AI[- ]Powered|Smart Tools|Intelligent Assistant|Exceptional Mastery|إتقان تام/i;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  assert.ok(ready, 'local app did not become ready');
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const lang of ['ar', 'en']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const assistantRequests = [];
    const dataRequests = [];
    const sockets = [];
    let fixtureLoaded = false;
    await page.addInitScript(language => localStorage.setItem('noon_language', language), lang);
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { await route.abort('blockedbyclient'); return; }
      if (url.pathname === '/src/mock-data/books.ts') {
        fixtureLoaded = true;
        await route.fulfill({ contentType: 'application/javascript', body: `export const INITIAL_ADMIN_BOOKS=${JSON.stringify([fixture])}; export const INITIAL_BOOKS=INITIAL_ADMIN_BOOKS;` }); return;
      }
      if (url.pathname === '/__ai_off_harness') {
        await route.fulfill({ contentType: 'text/html', body: '<html><body><div id="harness"></div></body></html>' }); return;
      }
      await route.continue();
    });
    page.on('request', r => {
      if (r.url().includes('/api/assistant')) assistantRequests.push(r.url());
      if (['fetch', 'xhr', 'eventsource', 'ping'].includes(r.resourceType())) dataRequests.push(r.url());
    });
    page.on('websocket', socket => sockets.push(socket.url()));
    await page.goto(origin);
    await page.locator('button').filter({ hasText: /Continue Reading|متابعة القراءة/ }).first().waitFor();
    assert.ok(fixtureLoaded, 'synthetic fixture must replace demo catalog');
    assert.equal(await page.locator('html').getAttribute('lang'), lang);
    assert.doesNotMatch(await page.locator('body').innerText(), unsupported, `${lang} home copy`);
    await page.locator('button').filter({ hasText: /Continue Reading|متابعة القراءة/ }).first().click();
    // The title is localized, so locate the primary unavailable assistant by title instead.
    const disabled = page.locator('button[title="Assistant temporarily unavailable"], button[title="المساعد غير متاح حالياً"]');
    await disabled.waitFor({ state: 'attached', timeout: 15000 });
    assert.equal(await disabled.isDisabled(), true);
    assert.equal(await disabled.getAttribute('aria-disabled'), 'true');
    await disabled.evaluate(el => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    await disabled.click({ force: true }).catch(() => {});
    await page.keyboard.press('Enter'); await page.keyboard.press('Space');
    assert.equal(await page.locator('[title*="Click to open Noon Tools"], [title*="اضغط لفتح أدوات نون حول"]').count(), 0, 'no enabled hotspots in actual viewer');
    const gateway = await page.evaluate(async language => {
      const { aiGateway } = await import('/src/services/aiGateway.ts');
      const original = window.fetch; let fetchCalls = 0;
      window.fetch = (...args) => { fetchCalls++; return original(...args); };
      try {
        const tools = ['explain', 'simplify', 'translate', 'hint', 'quiz', 'analyzeProblem', 'explainImage', 'stepByStep', 'explainFigure', 'unknown'];
        const results = [];
        for (const tool of tools) results.push(await aiGateway.execute(tool, { pageNumber: 1, selectedText: 'Synthetic question', selectedImage: 'data:image/png;base64,c3ludGhldGlj', selectionType: 'image', language, lessonContext: 'Synthetic only' }));
        return { fetchCalls, allBlocked: results.every(r => !r.success && !r.isGeminiPowered && !r.canRetry) };
      } finally { window.fetch = original; }
    }, lang);
    assert.deepEqual(gateway, { fetchCalls: 0, allBlocked: true });
    assert.equal(assistantRequests.length, 0);

    // Force isOpen/isEnabled props at the component boundary. Disabled children must
    // neither render hotspots/mock output nor mount effects or touch network APIs.
    await page.goto(`${origin}/__ai_off_harness`);
    // This route is intentionally not transformed by Vite's HTML pipeline.
    // Install the same refresh preamble before dynamically importing TSX modules.
    await page.evaluate(async () => {
      const { default: runtime } = await import('/@react-refresh');
      runtime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    });
    const forced = await page.evaluate(async language => {
      let callbacks = 0, network = 0, summaryCalls = 0, mockReads = 0;
      const originalFetch = window.fetch, originalOpen = XMLHttpRequest.prototype.open;
      const originalWS = window.WebSocket, originalES = window.EventSource, originalBeacon = navigator.sendBeacon;
      const blocked = () => { network++; throw new Error('Unexpected network from disabled AI'); };
      window.fetch = blocked; XMLHttpRequest.prototype.open = blocked; window.WebSocket = blocked; window.EventSource = blocked; navigator.sendBeacon = blocked;
      const [{ default: React }, { default: { createRoot } }, { NoonToolsPanel }, { PdfInteractionOverlay }, { SelectionAssistantPanel }, { LessonSummaryModal }, { AuthenticBookPage }, { setLanguage }, { featureFlags }, { lessonSummaryService }] = await Promise.all([
        import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'),
        import('/src/features/ai-assistant/NoonToolsPanel.tsx'), import('/src/features/book-viewer/PdfInteractionOverlay.tsx'),
        import('/src/features/ai-assistant/components/SelectionAssistantPanel.tsx'), import('/src/features/book-viewer/LessonSummaryModal.tsx'),
        import('/src/features/book-viewer/AuthenticBookPage.tsx'), import('/src/i18n/index.ts'), import('/src/config/feature-flags.ts'), import('/src/services/lessonSummaryService.ts')
      ]);
      setLanguage(language);
      const originalSummary = lessonSummaryService.generateSummary;
      lessonSummaryService.generateSummary = async () => { summaryCalls++; throw new Error('Disabled summary invoked'); };
      const elem = { id: 'synthetic-element', type: 'paragraph', title: 'Synthetic paragraph', content: 'Synthetic content', get mockAiAnalysis() { mockReads++; throw new Error('Disabled mock read'); } };
      const lesson = { id: 'synthetic-lesson', title: 'Synthetic lesson', pageNumber: 1, endPageNumber: 1 };
      const root = createRoot(document.getElementById('harness'));
      try {
        root.render(React.createElement(React.Fragment, null,
          React.createElement('div', { id: 'tools' }, React.createElement(NoonToolsPanel, { isOpen: true, onClose() {}, selectedElement: elem, onQuizCompleted() { callbacks++; } })),
          React.createElement('div', { id: 'hotspots' }, React.createElement(PdfInteractionOverlay, { pageNumber: 1, width: 600, height: 800, selectedElementId: null, isEnabled: true, onSelectElement() { callbacks++; } })),
          React.createElement('div', { id: 'selection' }, React.createElement(SelectionAssistantPanel, { isOpen: true, onClose() {}, pageNumber: 1, selection: { x: 0, y: 0, width: 10, height: 10 }, activeTool: 'simplify', actionTrigger: 1, selectedText: 'Synthetic only' })),
          React.createElement('div', { id: 'summary' }, React.createElement(LessonSummaryModal, { isOpen: true, onClose() {}, selectedLessons: [lesson] })),
          React.createElement('div', { id: 'authentic' }, React.createElement(AuthenticBookPage, { book: { subject: 'Synthetic' }, page: { pageNumber: 1, chapterTitle: 'Synthetic chapter', lessonTitle: 'Synthetic lesson', elements: [elem] }, scale: 1, selectedElementId: null, onSelectElement() { callbacks++; } }))
        ));
        await new Promise(r => setTimeout(r, 250));
        for (const el of document.querySelectorAll('#authentic *')) {
          el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        }
        await new Promise(r => setTimeout(r, 100));
        return { aiFlag: featureFlags.aiAssistantEnabled, empty: ['tools', 'hotspots', 'selection', 'summary'].every(id => document.getElementById(id).innerHTML === ''), authenticButtons: document.querySelectorAll('#authentic [role="button"], #authentic [tabindex="0"]').length, callbacks, network, summaryCalls, mockReads };
      } finally {
        root.unmount(); window.fetch = originalFetch; XMLHttpRequest.prototype.open = originalOpen; window.WebSocket = originalWS; window.EventSource = originalES; navigator.sendBeacon = originalBeacon; lessonSummaryService.generateSummary = originalSummary;
      }
    }, lang);
    assert.deepEqual(forced, { aiFlag: false, empty: true, authenticButtons: 0, callbacks: 0, network: 0, summaryCalls: 0, mockReads: 0 }, `${lang} forced-open components`);
    assert.equal(assistantRequests.length, 0);
    const copy = await page.evaluate(async language => {
      const [{ default: React }, { default: { createRoot } }, { NoonToolsPanel }, { LessonSummaryModal }, { featureFlags }, { lessonSummaryService }, { bookLessonsService }] = await Promise.all([
        import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'),
        import('/src/features/ai-assistant/NoonToolsPanel.tsx'), import('/src/features/book-viewer/LessonSummaryModal.tsx'),
        import('/src/config/feature-flags.ts'), import('/src/services/lessonSummaryService.ts'),
        import('/src/services/bookLessonsService.ts')
      ]);
      const originalFlags = { ...featureFlags };
      const originalSummary = lessonSummaryService.generateSummary;
      const originalFetch = window.fetch, originalOpen = XMLHttpRequest.prototype.open;
      const originalWS = window.WebSocket, originalES = window.EventSource, originalBeacon = navigator.sendBeacon;
      let network = 0, summaryCalls = 0;
      const blocked = () => { network++; throw new Error('Unexpected network in synthetic UI test'); };
      window.fetch = blocked; XMLHttpRequest.prototype.open = blocked;
      window.WebSocket = blocked; window.EventSource = blocked; navigator.sendBeacon = blocked;
      // 96 pages produce eight templates, including the seventh lesson whose
      // summary previously attributed local examples to Gemini standards.
      const book = { id: 'synthetic-curriculum', title: 'Synthetic curriculum', subject: 'Synthetic', totalPages: 96 };
      const lessons = bookLessonsService.generateCurriculumForAnyBook(book, 96);
      const lesson = lessons[6];
      const summaryFixture = {
        ...lessonSummaryService.buildSingleLessonCompleteSummary(lesson, book.title, '', language),
        confidence: 0,
      };
      const elem = { id: 'synthetic-copy', title: 'Synthetic element', type: 'paragraph', content: 'Synthetic content', mockAiAnalysis: {
        simplified: 'Preset example', stepByStep: ['Preset step'], hint: 'Preset hint', audioTranscript: 'Preset transcript',
        figureExplanation: 'Preset figure', quizQuestion: { question: 'Preset question?', options: ['Example A', 'Example B'], correctIndex: 0, explanation: 'Preset answer explanation' }
      } };
      const root = createRoot(document.getElementById('harness'));
      const wait = () => new Promise(resolve => setTimeout(resolve, 100));
      const texts = [], cases = [];
      let resolveSummary;
      // Delay only delivery for the loading-state assertion. The resolved data
      // comes unchanged from the real local builder above, not a copy-hiding
      // preset. Never invoke generateSummary's gateway/provider path.
      lessonSummaryService.generateSummary = () => { summaryCalls++; return new Promise(resolve => { resolveSummary = resolve; }); };
      try {
        for (const [lessons, summary, open] of [[true, false, true], [false, true, true], [true, true, false]]) {
          featureFlags.lessonsEnabled = lessons; featureFlags.lessonSummaryEnabled = summary;
          root.render(React.createElement(LessonSummaryModal, { isOpen: open, selectedLessons: [lesson], onClose() {} }));
          await wait();
          cases.push(document.getElementById('harness').innerHTML === '' && summaryCalls === 0);
        }
        featureFlags.aiAssistantEnabled = true;
        root.render(React.createElement(NoonToolsPanel, { isOpen: false, selectedElement: elem, onClose() {} }));
        await wait(); cases.push(document.getElementById('harness').innerHTML === '');
        root.render(React.createElement(NoonToolsPanel, { isOpen: true, selectedElement: elem, onClose() {} }));
        await wait(); texts.push(document.getElementById('harness').innerText);
        // Check the rendered hint, practice result and simulated audio controls.
        for (const label of language === 'en' ? ['Hint (unavailable)', 'Quiz (unavailable)', 'Listen'] : ['تلميح (غير متاح)', 'اختبار (غير متاح)', 'استمع']) {
          const button = [...document.querySelectorAll('#harness button')].find(el => el.textContent.trim() === label);
          if (!button) throw new Error(`Missing synthetic tool tab: ${label}`);
          button.click(); await wait();
          if (label.includes('Quiz') || label.includes('اختبار')) {
            [...document.querySelectorAll('#harness button')].find(el => el.textContent.trim() === 'Example A').click();
            await wait();
            [...document.querySelectorAll('#harness button')].find(el => /^(Check Answer|تحقق من الإجابة)$/.test(el.textContent.trim())).click();
            await wait();
          }
          texts.push(document.getElementById('harness').innerText);
        }
        featureFlags.aiAssistantEnabled = false;
        root.render(React.createElement(NoonToolsPanel, { isOpen: true, selectedElement: elem, onClose() {} }));
        await wait(); cases.push(document.getElementById('harness').innerHTML === '');
        featureFlags.lessonsEnabled = true; featureFlags.lessonSummaryEnabled = true;
        root.render(React.createElement(LessonSummaryModal, { isOpen: true, selectedLessons: [lesson], onClose() {} }));
        await wait(); texts.push(document.getElementById('harness').innerText);
        resolveSummary(summaryFixture);
        await wait(); texts.push(document.getElementById('harness').innerText);
        const readySummary = document.getElementById('harness').innerText;
        featureFlags.lessonSummaryEnabled = false;
        root.render(React.createElement(LessonSummaryModal, { isOpen: true, selectedLessons: [lesson], onClose() {} }));
        await wait(); cases.push(document.getElementById('harness').innerHTML === '');
        return { cases, texts, network, summaryCalls, readySummary, summaryFixture, lessonSummary: lesson.summary, lessonCount: lessons.length };
      } finally {
        root.unmount(); Object.assign(featureFlags, originalFlags); lessonSummaryService.generateSummary = originalSummary;
        window.fetch = originalFetch; XMLHttpRequest.prototype.open = originalOpen;
        window.WebSocket = originalWS; window.EventSource = originalES; navigator.sendBeacon = originalBeacon;
      }
    }, lang);
    assert.ok(copy.cases.every(Boolean), `${lang} independent off/closed/unmount guards`);
    assert.equal(copy.network, 0);
    assert.equal(copy.summaryCalls, 1, 'only the explicit flag-on case receives the real local summary fixture');
    assert.equal(copy.lessonCount, 8, 'exercise the actual seventh curriculum template');
    assert.ok(copy.lessonSummary.length > 0);
    assert.equal(copy.summaryFixture.overview, copy.lessonSummary, 'preserve the actual template summary without sanitizing');
    assert.ok(copy.summaryFixture.sections.some(section => section.items.includes(copy.lessonSummary)));
    assert.ok(copy.summaryFixture.reviewQuestions.some(item => item.answer === copy.lessonSummary));
    assert.ok(copy.readySummary.includes(copy.lessonSummary), `${lang} actual summary content must render with flags on`);
    assert.doesNotMatch(JSON.stringify(copy.summaryFixture), /Gemini|جيمني|جيميني/i, `${lang} real summary fixture has no provider reference`);
    assert.doesNotMatch(copy.readySummary, /Gemini|جيمني|جيميني/i, `${lang} flag-on summary has no provider reference`);
    for (const text of copy.texts) {
      assert.doesNotMatch(text, unsupported);
      assert.doesNotMatch(text, /Comprehensive Lesson Summary|Complete summary of|full curriculum details|Interactive Quiz|Clear Voice|strengthen critical thinking|ملخص مراجعة الدرس الشامل|تحليل كامل محتوى|صوت عربي واضح|تنشيط التفكير النقدي/i);
      assert.match(text, /Experimental demo|Experimental review|عرض تجريبي|عرض مراجعة تجريبي/);
    }
    assert.equal(assistantRequests.length, 0);
    assert.deepEqual(dataRequests, [], `${lang} no fetch/XHR/eventsource/beacon requests, including component imports`);
    // Vite's injected development client still attempts its local HMR socket
    // with hmr:false. Account for it explicitly, never as assistant traffic.
    // Component-level WebSocket attempts remain intercepted and counted above.
    const nonHmrSockets = sockets.filter(address => {
      const url = new URL(address);
      return !(url.protocol === 'ws:' && url.hostname === '127.0.0.1' && url.port === '24678' && url.pathname === '/' && url.searchParams.has('token'));
    });
    assert.deepEqual(nonHmrSockets, [], `${lang} no application WebSockets beyond Vite development HMR`);
    console.log(`INFO ${lang}: ${sockets.length} local Vite development HMR connection attempts; excluded from assistant network counts`);
    console.log(`PASS ${lang}: rendered preset tool copy and real curriculum summary fixture with flags on; no Gemini reference; independent flag-off/closed/unmount guards; zero network APIs`);
    console.log(`PASS ${lang}: home copy neutral; disabled click/Enter/Space/forced click; no hotspots or forced-open panels; zero callbacks/mock reads/summary calls/network APIs; all gateway tools blocked`);
    await context.close();
  }
} finally { await browser?.close(); server.kill('SIGTERM'); }
