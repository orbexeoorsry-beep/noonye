import type { Express, Request, Response } from 'express';

/**
 * Review-stage boundary, NOT admin authentication or a Secret Manager adapter.
 * No provider is approved. No environment flag or supplied credential can open it.
 * Mount before body parsers and SPA fallback so keys are not parsed or echoed.
 */
export function mountAdminAiBoundary(app: Express): void {
  app.use('/api/admin/ai', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(503).json({
      success: false,
      code: 'ADMIN_AI_SETUP_UNAVAILABLE',
      aiEnabled: false,
      message: 'إدارة مزود الذكاء الاصطناعي غير متاحة قبل تجهيز مصادقة المدير وحفظ الأسرار ومراجعة أهلية القاصرين.',
    });
  });
}
