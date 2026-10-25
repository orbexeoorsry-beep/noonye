import express, { type Request, type Response, type NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { AccountError, AccountStore, csrfFor, validateCredentials } from './store';
import { ClassroomStore } from '../classrooms/store';
import { DashboardStore } from '../dashboards/store';

export interface AccountsOptions { store?: AccountStore; origin: string; enabled: boolean; mode?: 'proxy-production'; proxyAddress?: string }
function sessionToken(req: Request, cookie: string) {
  const values = (req.headers.cookie || '').split(';').map(v => v.trim()).filter(v => v.startsWith(`${cookie}=`));
  return values.length === 1 ? values[0].slice(cookie.length + 1) : '';
}
function equal(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function createAccountsRouter({ store, origin, enabled, mode, proxyAddress }: AccountsOptions) {
  const router = express.Router();
  const classrooms = enabled && store ? new ClassroomStore(store) : undefined;
  const dashboards = enabled && store ? new DashboardStore(store) : undefined;
  const host = new URL(origin).host;
  const production = mode === 'proxy-production';
  if (production && (new URL(origin).protocol !== 'https:' || proxyAddress !== '127.0.0.1')) throw new Error('Verified HTTPS loopback proxy required');
  const cookie = production ? '__Host-noon_session' : 'noon_local_session';
  const cookieOptions = { httpOnly: true, sameSite: 'strict' as const, path: production ? '/' : '/api', secure: production };
  const session = (req: Request) => sessionToken(req, cookie);
  const attempts = new Map<string, { count: number; until: number }>();
  router.use((req, res, next) => {
    if (!/^\/(accounts|schools|classes|readings)(\/|$)/.test(req.path)) { next('router'); return; }
    res.set({ 'Cache-Control': 'no-store', 'Pragma': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Cookie, Origin' });
    if (production) {
      const peer = req.socket.remoteAddress?.replace(/^::ffff:/, '');
      if (peer !== proxyAddress || req.get('x-forwarded-proto') !== 'https' || !req.secure ||
          (req.get('x-forwarded-host') && req.get('x-forwarded-host') !== host)) {
        res.status(403).json({ error: 'https_proxy_required' }); return;
      }
      res.set('Strict-Transport-Security', 'max-age=31536000');
    }
    if (req.get('sec-fetch-site') === 'cross-site') { res.status(403).json({ error: 'origin_rejected' }); return; }
    if (req.method === 'GET' && req.path === '/accounts/status') {
      res.json({ enabled, mode: enabled ? (production ? 'proxy-production' : 'local-only') : 'disabled' }); return;
    }
    if (!enabled || !store || !classrooms) { res.status(503).json({ error: 'accounts_disabled' }); return; }
    // Raw Host is checked, never req.hostname (which may use X-Forwarded-Host).
    if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== origin)) { res.status(403).json({ error: 'origin_rejected' }); return; }
    if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== origin) { res.status(403).json({ error: 'origin_rejected' }); return; }
    next();
  });
  router.use(express.json({ limit: '8kb', strict: true }));
  const run = (fn: (req: Request, res: Response) => unknown) => (req: Request, res: Response, next: NextFunction) => Promise.resolve().then(() => fn(req, res)).catch(next);
  function token(req: Request) { const value = session(req); store!.identity(value); return value; }
  function mutation(req: Request) {
    const value = token(req);
    if (!equal(req.get('x-csrf-token') || '', csrfFor(value))) throw new AccountError('csrf_rejected', 403);
    return value;
  }
  function throttle(req: Request) {
    const now = Date.now(), key = production ? req.ip || 'unknown' : req.socket.remoteAddress || 'local';
    const entry = attempts.get(key);
    if (!entry && attempts.size >= 1024) {
      for (const [address, attempt] of attempts) if (attempt.until <= now) attempts.delete(address);
      if (attempts.size >= 1024) throw new AccountError('try_later', 429);
    }
    if (!entry || entry.until <= now) { attempts.set(key, { count: 1, until: now + 15 * 60 * 1000 }); return; }
    if (++entry.count > 30) throw new AccountError('try_later', 429);
  }
  router.post('/accounts/login', run(async (req, res) => {
    throttle(req);
    const value = validateCredentials(req.body);
    const fresh = await store!.login(value.schoolSlug as string, value.username as string, value.password as string);
    const old = session(req);
    if (old) store!.logout(old);
    res.cookie(cookie, fresh, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
    res.json(store!.identity(fresh));
  }));
  router.post('/accounts/accept-invite', run(async (req, res) => {
    throttle(req);
    res.status(201).json({ member: await classrooms!.acceptInvitation(req.body) });
  }));
  router.get('/accounts/me', run((req, res) => res.json(store!.identity(token(req)))));
  router.get('/accounts/dashboard', run((req, res) => res.json(dashboards!.get(token(req)))));
  router.post('/accounts/logout', run((req, res) => {
    store!.logout(mutation(req));
    res.clearCookie(cookie, cookieOptions);
    res.status(204).end();
  }));
  router.get('/schools/:schoolId/members', run((req, res) => res.json({ members: store!.listMembers(token(req), req.params.schoolId) })));
  router.post('/schools/:schoolId/members', run(async (req, res) => res.status(201).json({ member: await store!.createMember(mutation(req), req.params.schoolId, req.body) })));
  router.get('/schools/:schoolId/classes', run((req, res) => res.json({ classes: classrooms!.listSchoolClasses(token(req), req.params.schoolId) })));
  router.post('/schools/:schoolId/classes', run((req, res) => res.status(201).json({ classroom: classrooms!.createClass(mutation(req), req.params.schoolId, req.body) })));
  router.get('/accounts/classes', run((req, res) => res.json({ classes: classrooms!.listClasses(token(req)) })));
  router.patch('/classes/:classId', run((req, res) => res.json({ classroom: dashboards!.rename(mutation(req), req.params.classId, req.body) })));
  router.get('/classes/:classId/members', run((req, res) => res.json({ members: dashboards!.listMembers(token(req), req.params.classId) })));
  router.post('/classes/:classId/members', run((req, res) => {
    const result = dashboards!.addMember(mutation(req), req.params.classId, req.body);
    res.status(result.replay ? 200 : 201).json({ membership: result.membership });
  }));
  router.delete('/classes/:classId/members/:userId', run((req, res) => {
    dashboards!.removeMember(mutation(req), req.params.classId, req.params.userId);
    res.status(204).end();
  }));
  router.post('/classes/:classId/invitations', run((req, res) => res.status(201).json(classrooms!.createInvitation(mutation(req), req.params.classId, req.body))));
  router.get('/classes/:classId/readings', run((req, res) => res.json({ readings: classrooms!.listReadings(token(req), req.params.classId) })));
  router.post('/classes/:classId/readings', run((req, res) => res.status(201).json({ reading: classrooms!.createReading(mutation(req), req.params.classId, req.body) })));
  router.post('/readings/:readingId/completion', run((req, res) => {
    const result = classrooms!.completeReading(mutation(req), req.params.readingId, req.body);
    res.status(result.replay ? 200 : 201).json({ completion: result.completion });
  }));
  router.get('/readings/:readingId/completions', run((req, res) => res.json({ completions: classrooms!.listCompletions(token(req), req.params.readingId) })));
  router.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof AccountError) { res.status(error.status).json({ error: error.code }); return; }
    const parser = error as { type?: string };
    if (parser.type === 'entity.too.large') { res.status(413).json({ error: 'request_too_large' }); return; }
    if (parser.type === 'entity.parse.failed') { res.status(400).json({ error: 'invalid_json' }); return; }
    // Never log request bodies, passwords, invite tokens, or database errors.
    res.status(500).json({ error: 'internal_error' });
  });
  return router;
}
