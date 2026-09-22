import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { isConfigured, matchProblem, MatchError, type LlmConfig } from './match';
import { generationRouter } from './generation/routes';
import type { Sandbox } from './generation/sandbox';
import { ModelSettingsStore, modelSettingsRouter } from './model-settings';
import { localOnly } from './local-only';

const requestSchema = z.object({ source: z.string().trim().min(1).max(6000) }).strict();

export function createApp(config: LlmConfig = {}, fetcher: typeof fetch = fetch, sandbox?: Sandbox, settings = new ModelSettingsStore(config)) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:'], 'upgrade-insecure-requests': null } } }));
  app.use('/api/generate', express.json({ limit: '128kb' }), generationRouter(() => settings.current(), fetcher, sandbox));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/model-settings', modelSettingsRouter(settings, fetcher));
  app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: isConfigured(settings.current()) }));
  const limit = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: '请求过于频繁，请一分钟后重试。' } });
  let inFlight = 0;
  app.post('/api/match', localOnly, limit, async (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: '请提交 1–6000 字符的题目描述或链接。' }); return; }
    if (inFlight >= 3) { res.status(429).json({ error: '当前生成任务较多，请稍后重试。' }); return; }
    inFlight++;
    try { res.json(await matchProblem(parsed.data.source, settings.current(), fetcher)); }
    catch (error) {
      res.status(error instanceof MatchError ? error.status : 500).json({ error: error instanceof MatchError ? error.message : '服务处理失败，请检查服务端配置。' });
    } finally { inFlight--; }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: '接口不存在。' }));
  const dist = resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  }
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status === 413 ? 413 : 400).json({ error: '请求体无效或过大。' });
  });
  return app;
}
