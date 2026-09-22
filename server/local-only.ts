import type { RequestHandler } from 'express';

export const localOnly: RequestHandler = (req, res, next) => {
  const local = ['127.0.0.1', 'localhost', '[::1]', '::1'];
  let originOK = true;
  try { if (req.headers.origin) originOK = local.includes(new URL(req.headers.origin).hostname); } catch { originOK = false; }
  if (!local.includes(req.hostname) || !originOK || req.headers['sec-fetch-site'] === 'cross-site') { res.status(403).json({ error: '该 API 仅接受本机同站请求。' }); return; }
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) { res.status(415).json({ error: '仅接受 application/json。' }); return; }
  res.setHeader('Cache-Control', 'no-store'); next();
};
