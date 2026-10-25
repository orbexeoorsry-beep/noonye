import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { safeAccountHttpPath, assertNoSymlinkPath } from './server/features/accounts/config';
import { accountsRuntimeConfig, configureAccountsProxy } from './server/features/accounts/runtime';
import { AccountStore } from './server/features/accounts/store';
import { createAccountsRouter } from './server/features/accounts/router';
import { accountPageHeaders } from './server/features/accounts/http-policy';
const __filename = fileURLToPath(import.meta.url);
const serverDirectory = path.dirname(realpathSync(__filename));
const isPackagedEntrypoint = path.basename(__filename) === 'server.js' && path.basename(serverDirectory) === 'dist';
const applicationRoot = isPackagedEntrypoint ? path.dirname(serverDirectory) : serverDirectory;
const publicDirectory = path.join(applicationRoot, 'dist');

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  // Fail closed before any parser, logger, or middleware that could inspect a body.
  app.post('/api/assistant/explain', (_req: Request, res: Response) => {
    res.status(503).type('text/plain').send('Assistant unavailable');
  });
  const accounts = accountsRuntimeConfig(process.env, applicationRoot);
  configureAccountsProxy(app, 'proxyAddress' in accounts ? accounts.proxyAddress : undefined);
  if (accounts.enabled) process.umask(0o077);
  const accountStore = accounts.enabled ? new AccountStore(accounts.database!, applicationRoot) : undefined;
  const trustedViteFiles: string[] = [];
  if (process.env.NODE_ENV !== 'production') {
    const packageRoot = path.dirname(realpathSync(createRequire(import.meta.url).resolve('vite/package.json')));
    const clientEnv = path.join(packageRoot, 'dist/client/env.mjs');
    assertNoSymlinkPath(clientEnv);
    if (realpathSync(clientEnv) !== clientEnv) throw new Error('Vite client environment module must be the exact physical public file');
    trustedViteFiles.push(clientEnv);
  }
  app.use((req, res, next) => {
    if (!safeAccountHttpPath(req.originalUrl, applicationRoot, accounts.enabled, accounts.database, trustedViteFiles)) {
      res.status(404).set('Cache-Control', 'no-store').type('text/plain').send('Not found'); return;
    }
    next();
  });
  app.use('/api', createAccountsRouter({ ...accounts, store: accountStore }));
  app.use(express.json({ limit: '5mb' }));
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', assistantAvailable: false });
  });
  const accountShell = (html: string) => html.replace(/<link\b[^>]*https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, '');
  const accountHeaders = accountPageHeaders(process.env.NODE_ENV === 'production');
  if (process.env.NODE_ENV === 'production') {
    app.get(['/accounts', '/accounts/'], (_req: Request, res: Response) => {
      res.set(accountHeaders).type('html').send(accountShell(readFileSync(path.join(publicDirectory, 'index.html'), 'utf8')));
    });
    app.use(express.static(publicDirectory));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(publicDirectory, 'index.html'));
    });
  } else {
    const vite = await createViteServer({ root: applicationRoot, server: { middlewareMode: true, fs: { strict: true, allow: [applicationRoot] } }, appType: 'spa' });
    app.get(['/accounts', '/accounts/'], async (_req: Request, res: Response, next) => {
      try {
        const html = accountShell(readFileSync(path.resolve(applicationRoot, 'index.html'), 'utf8'));
        res.set(accountHeaders).type('html').send(await vite.transformIndexHtml('/accounts', html));
      } catch (error) { next(error); }
    });
    app.use(vite.middlewares);
  }
  // Both account modes bind loopback only; a production proxy must share this host/network.
  const server = app.listen(PORT, accounts.enabled ? '127.0.0.1' : '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  const shutdown = () => server.close(() => { accountStore?.close(); process.exit(0); });
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
startServer();
