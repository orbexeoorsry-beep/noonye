import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AI is deliberately unavailable until minor eligibility and safeguards are resolved.
const AI_DISABLED_MESSAGE = 'خدمات الذكاء الاصطناعي معطلة مؤقتاً إلى حين حسم أهلية القاصرين.';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite middlewares in development
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
