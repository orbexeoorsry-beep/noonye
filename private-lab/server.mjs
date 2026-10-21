import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Test-only process. Never imported by the application, Vite, or production server.
const key = process.env.NOON_GEMINI_TEST_KEY;
if (!key || process.env.NODE_ENV === 'production') {
  console.error('Private lab requires a test key and refuses production mode.');
  process.exit(1);
}
delete process.env.NOON_GEMINI_TEST_KEY;
const port = 4180;
const publicOrigin = 'https://4180-ijf2txc87pss5rc8rd379-967f4b9b.us2.manus.computer';
const allowedOrigins = new Set([publicOrigin, 'http://127.0.0.1:4180']);
const token = randomBytes(32).toString('hex');
const expires = Date.now() + 2 * 60 * 60 * 1000;
const apiBase = 'https://generativelanguage.googleapis.com/v1beta/';
const accessPath = '/workspace/noon-gemini-lab-private-access.json';
const html = await readFile(fileURLToPath(new URL('./index.html', import.meta.url)));
const samples = {
  membrane: 'الأسموزية هي انتقال الماء عبر غشاء شبه منفذ من المحلول الأقل تركيزًا بالمذاب إلى المحلول الأعلى تركيزًا بالمذاب.',
  math: 'مسألة اصطناعية: حل المعادلة 2x + 3 = 11.',
};
const instructions = {
  explain: 'اشرح العينة خطوة بخطوة في ثلاث نقاط قصيرة.',
  simplify: 'بسّط العينة في جملتين قصيرتين.',
  hint: 'أعط تلميحًا واحدًا قصيرًا دون كشف الإجابة النهائية.',
  quiz: 'اكتب سؤال اختيار من متعدد واحدًا بثلاثة خيارات، ثم الإجابة وتعليلها باختصار.',
};
let selectedModel;
try {
  const response = await fetch(`${apiBase}models?pageSize=1000`, {
    headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    console.error(JSON.stringify({ phase: 'model-list', status: response.status }));
    process.exit(1);
  }
  const data = await response.json();
  const names = (data.models || []).filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => m.name);
  selectedModel = ['models/gemini-3.5-flash-lite', 'models/gemini-2.5-flash-lite', 'models/gemini-3.8-flash', 'models/gemini-2.5-flash'].find(n => names.includes(n));
  if (!selectedModel) {
    console.error(JSON.stringify({ phase: 'model-selection', status: 'no-approved-text-model' }));
    process.exit(1);
  }
} catch {
  console.error(JSON.stringify({ phase: 'model-list', status: 'network-error' }));
  process.exit(1);
}
function equal(a, b) {
  const aa = Buffer.from(a || ''); const bb = Buffer.from(b || '');
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function authenticated(req) {
  const cookies = String(req.headers.cookie || '').split(';').map(c => c.trim());
  const candidate = cookies.find(c => c.startsWith('noon_lab='))?.slice('noon_lab='.length);
  return equal(candidate, token);
}
function send(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
let calls = 0; let active = false; let lastCall = 0;
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
  if (Date.now() > expires) return send(res, 410, { success: false, message: 'انتهت جلسة المختبر الخاصة.' });
  // Only an unguessable capability URL grants a browser session. Never log it.
  if (req.method === 'GET' && equal(req.url, `/open/${token}`)) {
    const secure = req.headers['x-forwarded-proto'] === 'https' || req.headers.host === new URL(publicOrigin).host;
    res.setHeader('Set-Cookie', `noon_lab=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200${secure ? '; Secure' : ''}`);
    res.writeHead(303, { Location: '/' }); return res.end();
  }
  if (!authenticated(req)) return send(res, 401, { success: false, message: 'هذه واجهة خاصة. افتح رابط الجلسة المخصص.' });
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(html);
  }
  if (req.method === 'GET' && req.url === '/api/status') return send(res, 200, { privateLab: true, model: selectedModel, calls, maxCalls: 10, expiresAt: new Date(expires).toISOString() });
  if (req.method !== 'POST' || req.url !== '/api/test') return send(res, 404, { success: false });
  if (!allowedOrigins.has(req.headers.origin) || req.headers['content-type']?.split(';')[0] !== 'application/json') return send(res, 403, { success: false, message: 'مصدر الطلب غير مصرح.' });
  let data;
  try {
    let body = ''; for await (const chunk of req) {
      body += chunk; if (Buffer.byteLength(body) > 512) return send(res, 413, { success: false, message: 'حجم الطلب غير مسموح.' });
    }
    data = JSON.parse(body);
    if (Object.keys(data).some(k => !['tool', 'sample'].includes(k)) || !Object.hasOwn(samples, data.sample) || !Object.hasOwn(instructions, data.tool)) return send(res, 400, { success: false, message: 'المختبر يقبل الأدوات والعينات الاصطناعية المحددة فقط.' });
  } catch { return send(res, 400, { success: false, message: 'طلب غير صالح.' }); }
  if (active || Date.now() - lastCall < 5000 || calls >= 10) return send(res, 429, { success: false, message: 'انتظر خمس ثوانٍ. حد المختبر عشرة طلبات في الجلسة.' });
  active = true; lastCall = Date.now(); calls++;
  try {
    const response = await fetch(`${apiBase}${selectedModel}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'أنت مختبر تقني خاص للمطور ببيانات تعليمية اصطناعية فقط. أجب بالعربية وباختصار من العينة المعطاة. لا تدّع اعتمادًا تربويًا أو نسبة ثقة. لا تطلب بيانات شخصية. لا أدوات ولا ملفات.' }] },
        contents: [{ role: 'user', parts: [{ text: `${instructions[data.tool]}\nالعينة: ${samples[data.sample]}` }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.2 },
      }), signal: AbortSignal.timeout(40000),
    });
    if (!response.ok) {
      // Never propagate upstream error text: it can contain request metadata or secrets.
      return send(res, 502, { success: false, providerStatus: response.status, message: `تعذر طلب Gemini (HTTP ${response.status}). لم يُستخدم رد بديل.` });
    }
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.filter(p => typeof p.text === 'string' && !p.thought).map(p => p.text).join('\n') || '';
    if (!text.trim()) return send(res, 502, { success: false, message: 'لم يُرجع Gemini نصًا متاحًا. لم يُستخدم رد بديل.' });
    send(res, 200, { success: true, text, model: selectedModel, syntheticOnly: true });
  } catch { send(res, 502, { success: false, message: 'تعذر الاتصال بـ Gemini أو انتهت مهلة الطلب. لم يُستخدم رد بديل.' }); }
  finally { active = false; }
});
await writeFile(accessPath, JSON.stringify({ url: `${publicOrigin}/open/${token}`, localURL: `http://127.0.0.1:4180/open/${token}`, expiresAt: new Date(expires).toISOString() }, null, 2) + '\n', { mode: 0o600 });
server.listen(port, '0.0.0.0', () => console.log(JSON.stringify({ status: 'private-lab-ready', port, model: selectedModel, maxCalls: 10, syntheticOnly: true })));
