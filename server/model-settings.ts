import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { modelSettingsSchema, profileLimit, profileNameSchema, providerDefaults, providerForUrl, settingsUpdateSchema, type PublicModelSettings, type SettingsUpdate } from '../src/engine/model-settings';
import { isConfigured, LlmError, normalizeBaseUrl, requestJson, type LlmConfig } from './llm';
import { localOnly } from './local-only';

export const settingsFilePath = resolve(fileURLToPath(new URL('..', import.meta.url)), '.algomotion', 'model-settings.json');
const configSchema = modelSettingsSchema.extend({ key: z.string().min(1).max(4096).regex(/^[^\x00-\x1f\x7f]*$/) }).strict();
const legacySchema = configSchema.extend({ version: z.literal(1) }).strict();
const profileSchema = z.object({ id: z.string().uuid(), name: profileNameSchema, config: configSchema }).strict();
const storedSchema = z.object({ version: z.literal(2), activeProfileId: z.string().uuid().nullable(), profiles: z.array(profileSchema).max(profileLimit) }).strict()
  .refine((s) => new Set(s.profiles.map((p) => p.id)).size === s.profiles.length && (s.activeProfileId === null || s.profiles.some((p) => p.id === s.activeProfileId)));
type Profile = z.infer<typeof profileSchema>;
const fileBytes = 200_000;
const fingerprint = (raw: string) => createHash('sha256').update(raw).digest('hex');

// One local API instance, not per-user public hosting. Keys never leave this class via publicView().
export class ModelSettingsStore {
  private override?: LlmConfig;
  private profiles: Profile[] = [];
  private activeProfileId: string | null = null;
  private revision = randomUUID();
  private diskFingerprint: string | null = null;
  private loadError = false;
  constructor(private environment: LlmConfig = {}, private file?: string) {
    this.environment = { ...environment };
    if (file && existsSync(file)) {
      try {
        this.checkFile();
        const text = readFileSync(file, 'utf8'), raw = JSON.parse(text);
        const stored = raw.version === 1 ? (() => {
          const { version: _, ...config } = legacySchema.parse(raw), id = randomUUID();
          return { profiles: [{ id, name: '原有配置', config }], activeProfileId: id };
        })() : storedSchema.parse(raw);
        for (const profile of stored.profiles) profile.config.baseUrl = normalizeBaseUrl(profile.config.baseUrl, profile.config.provider);
        this.profiles = stored.profiles; this.activeProfileId = stored.activeProfileId;
        this.diskFingerprint = fingerprint(text);
      } catch { this.loadError = true; }
    }
  }
  current(): LlmConfig { return { ...(this.override ?? this.profiles.find((p) => p.id === this.activeProfileId)?.config ?? this.environment) }; }
  publicView(): PublicModelSettings {
    const c = this.current(), provider = c.provider ?? providerForUrl(c.baseUrl);
    const defaults = providerDefaults(provider);
    return {
      ...defaults, baseUrl: c.baseUrl ?? defaults.baseUrl, model: c.model ?? '',
      format: ['json_object', 'json_schema', 'prompt'].includes(c.format ?? '') ? c.format as PublicModelSettings['format'] : c.provider ? defaults.format : 'json_schema',
      tokenParameter: c.tokenParameter ?? (provider === 'custom' ? 'max_completion_tokens' : defaults.tokenParameter), thinking: c.thinking ?? 'default',
      maxOutputTokens: c.maxOutputTokens ?? 8192, hasKey: Boolean(c.key), configured: isConfigured(c),
      source: this.override ? 'session' : this.activeProfileId ? 'disk' : 'environment', diskAvailable: Boolean(this.file), loadError: this.loadError,
      profiles: this.profiles.map(({ id, name, config: { key, ...config } }) => ({ id, name, ...config, hasKey: Boolean(key) })),
      activeProfileId: this.override ? null : this.activeProfileId, revision: this.revision,
    };
  }
  candidate(input: SettingsUpdate): LlmConfig {
    const parsed = settingsUpdateSchema.parse(input);
    this.checkRevision(parsed.revision);
    const { apiKey, persistence: _, profileId: __, name: ___, revision: ____, ...config } = parsed;
    config.baseUrl = normalizeBaseUrl(config.baseUrl, config.provider);
    const id = this.targetId(parsed), previous = id ? this.profile(id).config : parsed.profileId === null ? {} : this.current();
    let key = apiKey;
    if (!key) {
      let sameEndpoint = false;
      try { sameEndpoint = config.baseUrl === normalizeBaseUrl(previous.baseUrl ?? '') && config.provider === (previous.provider ?? providerForUrl(previous.baseUrl)); } catch { /* No previous configuration. */ }
      if (!sameEndpoint || !previous.key) throw new LlmError(400, '请填写 API Key。新增配置或供应商/地址改变时，不会把原密钥转发到新地址。');
      key = previous.key;
    }
    return { ...config, key };
  }
  save(input: SettingsUpdate) {
    input = settingsUpdateSchema.parse(input);
    const next = this.candidate(input);
    if (input.persistence === 'disk' && !this.file) throw new LlmError(400, '当前服务禁用了磁盘保存，请选择仅本次服务。');
    if (input.persistence === 'disk') {
      const existingId = this.targetId(input), id = existingId ?? randomUUID();
      if (!existingId && this.profiles.length >= profileLimit) throw new LlmError(400, `最多保存 ${profileLimit} 套配置，请先删除不再使用的配置。`);
      const profile = profileSchema.parse({ id, name: input.name ?? (existingId ? this.profile(existingId).name : `${next.provider} / ${next.model}`.slice(0, 80)), config: next });
      const profiles = [...this.profiles.filter((p) => p.id !== id), profile];
      this.persist(profiles, id);
      this.profiles = profiles; this.activeProfileId = id; this.override = undefined;
    } else {
      // A temporary override must never delete the user's saved profiles.
      this.override = next;
    }
    this.revision = randomUUID();
    return this.publicView();
  }
  activate(id: string | null, revision?: string) {
    this.checkRevision(revision);
    if (id !== null) this.profile(id);
    if (this.file) this.persist(this.profiles, id);
    this.activeProfileId = id; this.override = undefined; this.revision = randomUUID();
    return this.publicView();
  }
  remove(id: string, revision?: string) {
    this.checkRevision(revision); this.profile(id);
    const profiles = this.profiles.filter((p) => p.id !== id), activeId = this.activeProfileId === id ? null : this.activeProfileId;
    this.persist(profiles, activeId);
    this.profiles = profiles; this.activeProfileId = activeId; this.revision = randomUUID();
    return this.publicView();
  }
  reset(revision?: string) {
    this.checkRevision(revision);
    try {
      if (this.file && existsSync(dirname(this.file)) && lstatSync(dirname(this.file)).isSymbolicLink()) throw new Error('symlink');
      if (this.file) rmSync(this.file, { force: true });
    } catch { throw new LlmError(500, '无法删除本机配置，原配置仍保留。'); }
    this.override = undefined; this.profiles = []; this.activeProfileId = null; this.loadError = false; this.diskFingerprint = null; this.revision = randomUUID();
    return this.publicView();
  }
  private checkRevision(revision?: string) {
    if (revision !== undefined && revision !== this.revision) throw new LlmError(409, '配置已在其他页面修改，请刷新配置后重试。未覆盖现有配置。');
  }
  private targetId(input: SettingsUpdate) { return input.profileId === undefined ? this.override ? undefined : this.activeProfileId ?? undefined : input.profileId ?? undefined; }
  private profile(id: string) { const profile = this.profiles.find((p) => p.id === id); if (!profile) throw new LlmError(404, '配置不存在或已删除，请刷新配置。'); return profile; }
  private checkFile() {
    if (!this.file) return;
    if (existsSync(dirname(this.file)) && lstatSync(dirname(this.file)).isSymbolicLink()) throw new Error('unsafe settings directory');
    if (existsSync(this.file)) { const stat = lstatSync(this.file); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > fileBytes) throw new Error('unsafe settings file'); }
  }
  private persist(profiles: Profile[], activeProfileId: string | null) {
    if (!this.file) throw new LlmError(400, '当前服务禁用了磁盘保存。');
    if (this.loadError) throw new LlmError(409, '本机配置文件未能加载。为避免覆盖原数据，请检查文件，或明确清除全部配置后重建。');
    let temp: string | undefined;
    try {
      this.checkFile();
      const currentFingerprint = existsSync(this.file) ? fingerprint(readFileSync(this.file, 'utf8')) : null;
      if (currentFingerprint !== this.diskFingerprint) throw new LlmError(409, '本机配置文件已被其他服务或编辑器修改。请重启当前服务后重新打开设置，未覆盖磁盘内容。');
      const raw = JSON.stringify(storedSchema.parse({ version: 2, profiles, activeProfileId }));
      if (Buffer.byteLength(raw) > fileBytes) throw new Error('settings limit');
      const directory = dirname(this.file);
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      if (process.platform !== 'win32') chmodSync(directory, 0o700);
      temp = `${this.file}.${randomUUID()}.tmp`;
      writeFileSync(temp, raw, { flag: 'wx', mode: 0o600 }); renameSync(temp, this.file);
      this.diskFingerprint = fingerprint(raw);
    } catch (error) {
      if (temp) { try { rmSync(temp, { force: true }); } catch { /* Never expose disk paths, contents or secrets. */ } }
      if (error instanceof LlmError) throw error;
      throw new LlmError(500, '无法安全保存本机配置，原生效配置未更改。请检查目录权限。');
    }
  }
}

export function modelSettingsRouter(store: ModelSettingsStore, fetcher: typeof fetch) {
  const router = Router(), token = randomUUID();
  let checking = false;
  router.use(localOnly);
  router.get('/', (_req, res) => res.json({ settings: store.publicView(), token }));
  router.use((req, res, next) => {
    if (req.get('X-AlgoMotion-Settings-Token') !== token) { res.status(403).json({ error: '设置会话已失效，请重新打开模型设置。' }); return; }
    next();
  });
  router.use(rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: '设置请求过于频繁，请稍后重试。' } }));
  const fail = (res: import('express').Response, error: unknown) => res.status(error instanceof LlmError ? error.status : 400).json({ error: error instanceof LlmError ? error.message : '配置格式不合法，请检查字段。' });
  router.post('/', (req, res) => { try { res.json({ settings: store.save(settingsUpdateSchema.parse(req.body)) }); } catch (e) { fail(res, e); } });
  const revisionSchema = z.object({ revision: z.string().uuid().optional() }).strict();
  router.delete('/', (req, res) => { try { res.json({ settings: store.reset(revisionSchema.parse(req.body ?? {}).revision) }); } catch (e) { fail(res, e); } });
  router.post('/activate', (req, res) => { try { const input = revisionSchema.extend({ profileId: z.string().uuid().nullable() }).strict().parse(req.body); res.json({ settings: store.activate(input.profileId, input.revision) }); } catch (e) { fail(res, e); } });
  router.delete('/profiles/:id', (req, res) => { try { const id = z.string().uuid().parse(req.params.id), input = revisionSchema.parse(req.body ?? {}); res.json({ settings: store.remove(id, input.revision) }); } catch (e) { fail(res, e); } });
  router.post('/test', async (req, res) => {
    if (checking) { res.status(429).json({ error: '已有连接测试正在进行。' }); return; }
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    try {
      const parsed = settingsUpdateSchema.extend({ consent: z.literal(true) }).strict().parse(req.body);
      const { consent: _, ...input } = parsed;
      const config = store.candidate(input); checking = true;
      const start = Date.now();
      const result = await requestJson(config, fetcher, {
        system: 'This is a connection/JSON compatibility check. Return exactly {"ok":true}.', user: 'Return JSON {"ok":true}.',
        schema: { type: 'object', properties: { ok: { type: 'boolean', enum: [true] } }, required: ['ok'], additionalProperties: false },
        name: 'connection_check', tokens: 2048, timeout: 30_000, maxBytes: 64000, signal: controller.signal,
      });
      if (!z.object({ ok: z.literal(true) }).strict().safeParse(result).success) throw new LlmError(502, '模型未返回约定的连接测试 JSON。请检查兼容参数；配置未自动保存。');
      res.json({ ok: true, elapsedMs: Date.now() - start, message: '连接与简短 JSON 响应通过。尚未验证完整生成或算法正确性；本次测试未保存配置。' });
    } catch (e) { fail(res, e); }
    finally { checking = false; }
  });
  return router;
}
