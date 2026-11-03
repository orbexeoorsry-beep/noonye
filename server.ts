import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { mountAdminAiBoundary } from './server/security/admin-ai-boundary';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AI is deliberately unavailable until minor eligibility and safeguards are resolved.
const AI_DISABLED_MESSAGE = 'خدمات الذكاء الاصطناعي معطلة مؤقتاً إلى حين حسم أهلية القاصرين.';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;

  // No key-entry API exists until real auth, secret storage and eligibility are approved.
  mountAdminAiBoundary(app);

  // Body parser for JSON
  app.use(express.json({ limit: '5mb' }));

  // Status & Health Endpoint (Never returns API key)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      geminiAvailable: false,
      aiEnabled: false,
    });
  });

  // Preserve the endpoint contract while refusing all AI requests before processing content.
  app.post('/api/assistant/explain', (_req: Request, res: Response) => {
    return res.status(503).json({
      success: false,
      isGeminiReady: false,
      aiDisabled: true,
      message: AI_DISABLED_MESSAGE,
    });
  });

  // Development vs Production
  if (process.env.NODE_ENV === 'production') {
    const clientDir = path.resolve(__dirname, 'client');
    app.use('/api', (_req: Request, res: Response) => res.status(404).json({ error: 'Not found' }));
    app.use(express.static(clientDir));
    app.get('*', (req: Request, res: Response) => {
      if (path.extname(req.path)) return res.status(404).type('text').send('Not found');
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  } else {
    // Load the development server only in development; it is not part of production runtime.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Noon Learning Server running on port ${PORT}`);
  });
}

startServer();
