import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, realpathSync } from 'node:fs';
import dotenv from 'dotenv';
import { accountsConfig, safeAccountHttpPath } from './server/features/accounts/config';
import { AccountStore } from './server/features/accounts/store';
import { createAccountsRouter } from './server/features/accounts/router';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(realpathSync(__filename));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  // Fail closed before any parser, logger, or middleware that could inspect a body.
  app.post('/api/assistant/explain', (_req: Request, res: Response) => {
    res.status(503).type('text/plain').send('Assistant unavailable');
  });
  const accounts = accountsConfig(process.env, __dirname);
  if (accounts.enabled) process.umask(0o077);
  const accountStore = accounts.enabled ? new AccountStore(accounts.database!, __dirname) : undefined;
  app.use((req, res, next) => {
    if (!safeAccountHttpPath(req.originalUrl, __dirname, accounts.enabled)) {
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
  const accountHeaders = {
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; img-src 'self' data: blob:; worker-src 'self' blob:; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
    'Referrer-Policy': 'no-referrer',
  };
  if (process.env.NODE_ENV === 'production') {
    app.get(['/accounts', '/accounts/'], (_req: Request, res: Response) => {
      res.set(accountHeaders).type('html').send(accountShell(readFileSync(path.resolve(__dirname, 'dist/index.html'), 'utf8')));
    });
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({ root: __dirname, server: { middlewareMode: true, fs: { strict: true, allow: [__dirname] } }, appType: 'spa' });
    app.get(['/accounts', '/accounts/'], async (_req: Request, res: Response, next) => {
      try {
        const html = accountShell(readFileSync(path.resolve(__dirname, 'index.html'), 'utf8'));
        res.set(accountHeaders).type('html').send(await vite.transformIndexHtml('/accounts', html));
      } catch (error) { next(error); }
    });
    app.use(vite.middlewares);
  }
  // The account slice is intentionally unavailable on public interfaces, even in production builds.
  const server = app.listen(PORT, accounts.enabled ? '127.0.0.1' : '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  const shutdown = () => server.close(() => { accountStore?.close(); process.exit(0); });
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
startServer();
