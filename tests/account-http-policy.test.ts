import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountPageHeaders } from '../server/features/accounts/http-policy';

test('production accounts CSP forbids inline scripts and eval while preserving required styles and isolation', () => {
  const headers = accountPageHeaders(true);
  const csp = headers['Content-Security-Policy'];
  const scripts = csp.split(';').map(x => x.trim()).find(x => x.startsWith('script-src '));
  assert.equal(scripts, "script-src 'self'");
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /style-src 'self' 'unsafe-inline'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /form-action 'self'/);
  assert.match(csp, /base-uri 'none'/);
  assert.equal(headers['Cache-Control'], 'no-store');
});

test('only development accounts permit the inline Vite preamble', () => {
  const csp = accountPageHeaders(false)['Content-Security-Policy'];
  assert.match(csp, /script-src 'self' 'unsafe-inline'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.doesNotMatch(accountPageHeaders(true)['Content-Security-Policy'], /script-src[^;]*unsafe-inline/);
});
