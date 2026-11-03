import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { aiGateway } from '../src/services/aiGateway';
import { featureFlags } from '../src/config/featureFlags';

const originalFetch = globalThis.fetch;
let fetchCalls = 0;
globalThis.fetch = (async () => {
  fetchCalls += 1;
  throw new Error('Network must not be reached');
}) as typeof fetch;

try {
  assert.equal(featureFlags.enableGeminiAI, false);
  assert.equal(featureFlags.enableMathAnalysis, false);
  assert.equal(featureFlags.enableScienceAnalysis, false);

  const params = { pageNumber: 1, selectionType: 'text' };
  for (const tool of ['explain', 'quiz', 'lessonSummary', 'lessonQuiz', 'guidedMath', 'analyzeProblem']) {
    const result = await aiGateway.execute(tool, params);
    assert.equal(result.success, false, `${tool} must fail closed`);
    assert.equal(result.isGeminiPowered, false, `${tool} must not claim AI output`);
    assert.equal(result.canRetry, false, `${tool} must not retry or trigger fallback`);
    assert.match(result.errorMessage || '', /معطلة مؤقتاً/);
  }
  assert.equal(fetchCalls, 0, 'AI gateway must reject before network');

  const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(server, /geminiAvailable:\s*false/);
  assert.match(server, /aiDisabled:\s*true/);
  assert.match(server, /status\(503\)/);
  assert.doesNotMatch(server, /GoogleGenAI|generateContent/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('AI safety hard-disable tests passed');
