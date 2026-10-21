import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  // Fail closed before any parser, logger, or middleware that could inspect a body.
  app.post('/api/assistant/explain', (_req: Request, res: Response) => {
    res.status(503).type('text/plain').send('Assistant unavailable');
  });
  app.use(express.json({ limit: '5mb' }));
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', assistantAvailable: false });
  });
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}
startServer();
