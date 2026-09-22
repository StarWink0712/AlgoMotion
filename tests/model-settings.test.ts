import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { request as httpRequest } from 'node:http';
import { ModelSettingsStore } from '../server/model-settings';
import { completionBody, normalizeBaseUrl, requestJson, type LlmConfig } from '../server/llm';
import { createApp } from '../server/app';
import { providerDefaults, type SettingsUpdate } from '../src/engine/model-settings';
import { fixtureProgram, mockTrace, wireContract } from './generated-fixtures';
import type { Sandbox } from '../server/generation/sandbox';

const key = 'MOCK-private-key-never-returned';
const environment: LlmConfig = { baseUrl: 'https://api.deepseek.com', key, model: 'mock-model', format: 'json_object' };
const update = (patch: Partial<SettingsUpdate> = {}): SettingsUpdate => ({ ...providerDefaults('deepseek'), model: 'mock-deepseek', apiKey: key, persistence: 'session', ...patch });
const envelope = (value: unknown) => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] }));
const options = { system: 'system', user: 'user', schema: { type: 'object' }, name: 'test', tokens: 1000 };
const temporary: string[] = [];
const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>((r) => server.close(() => r()));
  for (const path of temporary.splice(0)) rmSync(path, { force: true, recursive: true });
});
function file() { const directory = mkdtempSync(join(tmpdir(), 'algomotion-settings-')); temporary.push(directory); return join(directory, 'settings.json'); }

describe('local settings storage (temporary test files, never workspace credentials)', () => {
  it('returns only metadata; current snapshots are independent', () => {
    const store = new ModelSettingsStore(environment);
    expect(store.publicView()).toMatchObject({ hasKey: true, configured: true, source: 'environment', provider: 'deepseek' });
    expect(JSON.stringify(store.publicView())).not.toContain(key);
    const snapshot = store.current(); snapshot.key = 'changed';
    expect(store.current().key).toBe(key);
  });
  it('session changes do not overwrite the environment; reset restores it', () => {
    const store = new ModelSettingsStore(environment);
    store.save(update({ model: 'another' }));
    expect(store.current().model).toBe('another'); expect(environment.model).toBe('mock-model');
    expect(store.reset().model).toBe('mock-model');
  });
  it('normalizes a full endpoint and preserves a blank key only for the same provider/address', () => {
    const store = new ModelSettingsStore(environment);
    store.save(update({ baseUrl: 'https://api.deepseek.com/chat/completions/', apiKey: '' }));
    expect(store.current().baseUrl).toBe('https://api.deepseek.com');
    expect(store.current().key).toBe(key);
    expect(() => store.save(update({ apiKey: '', baseUrl: 'https://api.deepseek.com/v1' }))).toThrow('不会把原密钥');
    expect(() => store.save(update({ apiKey: '', provider: 'custom' }))).toThrow('不会把原密钥');
  });
  it('requires a key when none exists and rejects disk saves when unavailable', () => {
    const store = new ModelSettingsStore();
    expect(() => store.save(update({ apiKey: '' }))).toThrow('API Key');
    expect(() => store.save(update({ persistence: 'disk' }))).toThrow('禁用了磁盘保存');
  });
  it('disk profiles survive restart; a temporary override preserves all saved credentials', () => {
    const path = file(), store = new ModelSettingsStore(environment, path);
    store.save(update({ persistence: 'disk' }));
    expect(JSON.parse(readFileSync(path, 'utf8'))).toMatchObject({ version: 2, profiles: [{ config: { key } }] });
    if (process.platform !== 'win32') expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(new ModelSettingsStore(environment, path).publicView()).toMatchObject({ source: 'disk', model: 'mock-deepseek' });
    store.save(update({ persistence: 'session', apiKey: '' }));
    expect(existsSync(path)).toBe(true);
    expect(new ModelSettingsStore(environment, path).current().model).toBe('mock-deepseek');
  });
  it('reset removes a disk override without modifying any .env', () => {
    const path = file(), store = new ModelSettingsStore(environment, path);
    store.save(update({ persistence: 'disk' })); store.reset();
    expect(existsSync(path)).toBe(false); expect(store.current()).toEqual(environment);
  });
  it.each(['{"key":"MOCK-private-key-never-returned"}', 'x'.repeat(20001)])('rejects invalid or oversized stored config without leaking its contents', (raw) => {
    const path = file(); writeFileSync(path, raw);
    const store = new ModelSettingsStore(environment, path);
    expect(store.publicView()).toMatchObject({ source: 'environment', loadError: true });
    expect(JSON.stringify(store.publicView())).not.toContain(key);
  });
  it.skipIf(process.platform === 'win32')('does not follow a settings-file symlink', () => {
    const path = file(), target = file(); writeFileSync(target, JSON.stringify({ ...update(), key, version: 1 })); symlinkSync(target, path);
    expect(new ModelSettingsStore(environment, path).publicView().loadError).toBe(true);
  });
  it('invalid edits leave the working config unchanged', () => {
    const store = new ModelSettingsStore(environment);
    expect(() => store.save(update({ apiKey: 'bad\nkey' }))).toThrow();
    expect(store.current()).toEqual(environment);
    expect(() => store.save(update({ maxOutputTokens: 100000 }))).toThrow();
  });
});

describe('persistent named profiles (real temporary files, MOCK credentials)', () => {
  const second = (patch: Partial<SettingsUpdate> = {}): SettingsUpdate => ({ ...providerDefaults('moonshot'), model: 'mock-kimi', apiKey: 'MOCK-other-profile-key', persistence: 'disk', profileId: null, name: 'Kimi 长文本', ...patch });
  it('persists multiple providers and the active selection across fresh store instances', () => {
    const path = file(), store = new ModelSettingsStore(environment, path);
    const first = store.save(update({ persistence: 'disk', name: 'DeepSeek 日常' })).activeProfileId!;
    const last = store.save(second()).activeProfileId!;
    expect(first).not.toBe(last); expect(store.publicView().profiles).toHaveLength(2);
    store.activate(first, store.publicView().revision);
    const fresh = new ModelSettingsStore(environment, path);
    expect(fresh.publicView()).toMatchObject({ activeProfileId: first, source: 'disk' });
    expect(fresh.current().key).toBe(key);
    fresh.activate(last); expect(fresh.current().key).toBe('MOCK-other-profile-key');
    expect(new ModelSettingsStore(environment, path).current().model).toBe('mock-kimi');
    expect(JSON.stringify(fresh.publicView())).not.toContain(key);
    expect(JSON.stringify(fresh.publicView())).not.toContain('MOCK-other-profile-key');
    const snapshot = fresh.current(); fresh.activate(first); expect(snapshot.key).toBe('MOCK-other-profile-key');
  });
  it('keeps profiles separate even for the same provider/endpoint and reuses only the selected profile key', () => {
    const store = new ModelSettingsStore({}, file());
    const a = store.save(update({ persistence: 'disk', name: 'A' })).activeProfileId!;
    const b = store.save(update({ persistence: 'disk', profileId: null, name: 'B', apiKey: 'MOCK-B' })).activeProfileId!;
    store.save(update({ persistence: 'disk', profileId: a, apiKey: '', model: 'edited-A', name: 'A renamed' }));
    expect(store.current().key).toBe(key); expect(store.publicView().profiles).toHaveLength(2);
    store.activate(b); expect(store.current().key).toBe('MOCK-B');
    expect(store.candidate(update({ profileId: a, apiKey: '' })).key).toBe(key);
    expect(() => store.candidate(update({ profileId: null, apiKey: '' }))).toThrow('新增配置');
    expect(() => store.save(second({ profileId: a, apiKey: '' }))).toThrow('不会把原密钥');
    expect(() => store.save(update({ profileId: a, apiKey: '', baseUrl: 'https://api.deepseek.com/v1' }))).toThrow('不会把原密钥');
    expect(store.current().key).toBe('MOCK-B');
  });
  it('loads v1 without rewriting it and migrates all original credentials only on explicit disk save', () => {
    const path = file(), { apiKey: _, persistence: __, ...config } = update();
    const original = JSON.stringify({ ...config, key, version: 1 }); writeFileSync(path, original);
    const store = new ModelSettingsStore(environment, path), old = store.publicView().activeProfileId!;
    expect(store.publicView().profiles[0].name).toBe('原有配置');
    expect(store.current().key).toBe(key); expect(readFileSync(path, 'utf8')).toBe(original);
    store.save(second());
    const fresh = new ModelSettingsStore(environment, path);
    expect(fresh.publicView().profiles).toHaveLength(2); fresh.activate(old);
    expect(fresh.current().key).toBe(key); expect(JSON.parse(readFileSync(path, 'utf8')).version).toBe(2);
  });
  it('temporary settings leave disk bytes unchanged; environment selection keeps profiles', () => {
    const path = file(), store = new ModelSettingsStore(environment, path);
    store.save(update({ persistence: 'disk' })); const before = readFileSync(path, 'utf8');
    store.save(second({ persistence: 'session' }));
    expect(store.publicView()).toMatchObject({ source: 'session', activeProfileId: null });
    expect(readFileSync(path, 'utf8')).toBe(before);
    expect(new ModelSettingsStore(environment, path).current().key).toBe(key);
    store.activate(null); expect(store.current()).toEqual(environment);
    expect(new ModelSettingsStore(environment, path).publicView()).toMatchObject({ source: 'environment', activeProfileId: null });
    expect(store.publicView().profiles).toHaveLength(1);
  });
  it('deleting inactive/active profiles preserves others without switching to an arbitrary paid provider', () => {
    const path = file(), store = new ModelSettingsStore(environment, path);
    const a = store.save(update({ persistence: 'disk' })).activeProfileId!;
    const b = store.save(second()).activeProfileId!;
    store.remove(a); expect(store.current().model).toBe('mock-kimi');
    expect(new ModelSettingsStore(environment, path).publicView().profiles).toHaveLength(1);
    store.remove(b); expect(store.current()).toEqual(environment);
    expect(store.publicView().profiles).toEqual([]);
    expect(readFileSync(path, 'utf8')).not.toContain('MOCK-other-profile-key');
  });
  it('rejects stale saves, switches, tests and deletions without changing memory or disk', () => {
    const path = file(), store = new ModelSettingsStore(environment, path), stale = store.publicView().revision;
    const id = store.save(update({ persistence: 'disk' })).activeProfileId!, raw = readFileSync(path, 'utf8');
    for (const operation of [() => store.save(update({ revision: stale })), () => store.activate(id, stale), () => store.remove(id, stale), () => store.reset(stale), () => store.candidate(update({ revision: stale }))]) expect(operation).toThrow('其他页面修改');
    expect(readFileSync(path, 'utf8')).toBe(raw);
  });
  it('refuses to overwrite configuration changed by another service instance', () => {
    const path = file(), first = new ModelSettingsStore({}, path);
    first.save(update({ persistence: 'disk' }));
    const secondStore = new ModelSettingsStore({}, path); secondStore.save(second());
    const raw = readFileSync(path, 'utf8');
    expect(() => first.save(update({ persistence: 'disk', name: 'stale' }))).toThrow('其他服务或编辑器修改');
    expect(readFileSync(path, 'utf8')).toBe(raw); expect(first.current().key).toBe(key);
  });
  it('caps profiles at 20, supports updates at capacity and rejects unknown IDs', () => {
    const store = new ModelSettingsStore({}, file());
    for (let i = 0; i < 20; i++) store.save(update({ persistence: 'disk', profileId: null, name: `P${i}` }));
    expect(() => store.save(second())).toThrow('20');
    store.save(update({ persistence: 'disk', apiKey: '', profileId: store.publicView().activeProfileId, name: 'Renamed' }));
    expect(store.publicView().profiles).toHaveLength(20);
    const missing = '265f1782-0020-4058-bac2-62f7b81c4c6f';
    expect(() => store.activate(missing)).toThrow('不存在');
    expect(() => store.remove(missing)).toThrow('不存在');
    expect(() => store.save(update({ profileId: missing }))).toThrow('不存在');
  });
  it('rejects invalid v2 profile IDs, duplicate IDs and malformed metadata without rewriting original files', () => {
    const path = file(), store = new ModelSettingsStore({}, path); store.save(update({ persistence: 'disk' }));
    const valid = JSON.parse(readFileSync(path, 'utf8'));
    for (const value of [{ ...valid, activeProfileId: '265f1782-0020-4058-bac2-62f7b81c4c6f' }, { ...valid, profiles: [valid.profiles[0], valid.profiles[0]] }, { ...valid, profiles: [{ ...valid.profiles[0], name: '' }] }]) {
      const raw = JSON.stringify(value); writeFileSync(path, raw);
      const fresh = new ModelSettingsStore(environment, path);
      expect(fresh.publicView()).toMatchObject({ loadError: true, profiles: [] });
      expect(() => fresh.save(update({ persistence: 'disk' }))).toThrow('避免覆盖');
      expect(readFileSync(path, 'utf8')).toBe(raw);
    }
  });
  it('failed writes leave the active profile unchanged and clean up owned temporary files', () => {
    const path = file(), store = new ModelSettingsStore({}, path); store.save(update({ persistence: 'disk' }));
    const before = store.publicView(), raw = readFileSync(path, 'utf8');
    renameSync(path, `${path}.backup`); mkdirSync(path);
    expect(() => store.save(second())).toThrow('原生效配置未更改');
    expect(store.publicView()).toEqual(before); expect(readFileSync(`${path}.backup`, 'utf8')).toBe(raw);
    expect(readdirSync(join(path, '..')).some((name) => name.endsWith('.tmp'))).toBe(false);
  });
  it.skipIf(process.platform === 'win32')('rejects a replaced symlink without modifying its target', () => {
    const path = file(), target = file(), store = new ModelSettingsStore({}, path);
    store.save(update({ persistence: 'disk' })); const before = store.publicView();
    rmSync(path); writeFileSync(target, 'do not overwrite'); symlinkSync(target, path);
    expect(() => store.save(second())).toThrow('原生效配置未更改');
    expect(readFileSync(target, 'utf8')).toBe('do not overwrite'); expect(store.publicView()).toEqual(before);
  });
});

describe('provider compatibility (MOCK HTTP, not real provider evidence)', () => {
  it.each(['deepseek', 'moonshot', 'openai', 'custom'] as const)('uses %s protocol defaults and includes the schema in its prompt', async (provider) => {
    const config = { ...providerDefaults(provider), baseUrl: provider === 'custom' ? 'https://mock.example/v1' : providerDefaults(provider).baseUrl, key, model: 'mock-model' };
    const fetcher = vi.fn().mockResolvedValue(envelope({ ok: true }));
    expect(await requestJson(config, fetcher, options)).toEqual({ ok: true });
    const [url, init] = fetcher.mock.calls[0], body = JSON.parse(init.body);
    expect(url).toBe(`${config.baseUrl}/chat/completions`);
    expect(body[config.tokenParameter]).toBe(1000);
    expect(body.response_format.type).toBe(config.format);
    expect(body.messages[0].content).toContain('"type":"object"');
    expect(init.headers.Authorization).toBe(`Bearer ${key}`); expect(init.redirect).toBe('error');
    expect(body.thinking).toEqual(provider === 'deepseek' ? { type: 'disabled' } : undefined);
  });
  it('prompt-only omits unsupported response_format; token budget is capped', () => {
    const body = completionBody({ ...environment, format: 'prompt', maxOutputTokens: 500, tokenParameter: 'max_tokens' }, 's', 'u', {}, 'n', 10000);
    expect(body).not.toHaveProperty('response_format'); expect(body).toMatchObject({ max_tokens: 500 });
  });
  it.each(['http://remote.example/v1', 'https://user:pass@api.deepseek.com', 'https://api.deepseek.com/?key=secret', 'https://api.deepseek.com/#x', 'javascript:bad'])('rejects unsafe endpoint %s', (url) => {
    expect(() => normalizeBaseUrl(url)).toThrow();
  });
  it('requires explicit custom selection for proxies, allows local compatible servers', () => {
    expect(() => normalizeBaseUrl('https://proxy.example/v1', 'deepseek')).toThrow('自定义');
    expect(normalizeBaseUrl('http://127.0.0.1:9999/v1/chat/completions', 'custom')).toBe('http://127.0.0.1:9999/v1');
  });
  it('never retries or includes rejected provider content in diagnostics', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(key, { status: 401 }));
    await expect(requestJson(environment, fetcher, options)).rejects.toThrow('HTTP 401');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('bounds response bytes and reports timeouts without transport details', async () => {
    await expect(requestJson(environment, vi.fn().mockResolvedValue(new Response(key.repeat(100))), { ...options, maxBytes: 10 })).rejects.not.toThrow(key);
    const fetcher: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(new Error(key))));
    await expect(requestJson(environment, fetcher, { ...options, timeout: 10 })).rejects.toThrow('超时');
  });
});

async function start(fetcher: typeof fetch = vi.fn(), store = new ModelSettingsStore(), customSandbox?: Sandbox) {
  const sandbox: Sandbox = customSandbox ?? { probe: async () => ({ available: true, message: 'MOCK sandbox' }), run: async (program, input) => mockTrace(program, input) };
  const server = createApp({}, fetcher, sandbox, store).listen(0, '127.0.0.1'); servers.push(server);
  await new Promise<void>((r) => server.once('listening', r));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error();
  const base = `http://127.0.0.1:${address.port}/api`;
  const initial = await fetch(`${base}/model-settings`), { token } = await initial.json();
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) => fetch(`${base}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AlgoMotion-Settings-Token': token, ...headers }, body: JSON.stringify(body) });
  return { base, post, token, store };
}

describe('live local settings API (MOCK model and runner)', () => {
  it('named-profile API switches for free, strips credentials, guards nonce and does not test unless asked', async () => {
    const fetcher = vi.fn().mockResolvedValue(envelope({ ok: true })), store = new ModelSettingsStore({}, file());
    const { base, post, token } = await start(fetcher, store);
    const a = await (await post('model-settings', update({ persistence: 'disk', name: 'A' }))).json();
    const idA = a.settings.activeProfileId;
    const b = await (await post('model-settings', update({ persistence: 'disk', name: 'B', profileId: null, apiKey: 'MOCK-B' }))).json();
    const idB = b.settings.activeProfileId;
    const switched = await post('model-settings/activate', { profileId: idA, revision: b.settings.revision });
    expect(switched.status).toBe(200); expect(await switched.text()).not.toContain(key); expect(fetcher).not.toHaveBeenCalled();
    expect((await post('model-settings/activate', { profileId: idB }, { 'X-AlgoMotion-Settings-Token': '' })).status).toBe(403);
    expect((await post('model-settings/activate', { profileId: idB, revision: a.settings.revision })).status).toBe(409);
    const tested = await post('model-settings/test', { ...update({ apiKey: '', profileId: idB }), consent: true });
    expect(tested.status).toBe(200); expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer MOCK-B');
    expect(store.current().key).toBe(key);
    const denied = await fetch(`${base}/model-settings/profiles/${idB}`, { method: 'DELETE', headers: { 'X-AlgoMotion-Settings-Token': '', 'Content-Type': 'application/json' }, body: '{}' });
    expect(denied.status).toBe(403);
    const removed = await fetch(`${base}/model-settings/profiles/${idB}`, { method: 'DELETE', headers: { 'X-AlgoMotion-Settings-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: store.publicView().revision }) });
    expect(removed.status).toBe(200); expect(await removed.text()).not.toContain('MOCK-B');
    expect(store.publicView().profiles).toHaveLength(1);
  });
  it('saves for free, updates health immediately, omits keys in all config reads', async () => {
    const fetcher = vi.fn(), { base, post } = await start(fetcher);
    expect(await (await fetch(`${base}/health`)).json()).toMatchObject({ aiConfigured: false });
    const result = await post('model-settings', update());
    expect(result.status).toBe(200); expect(await result.text()).not.toContain(key);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await (await fetch(`${base}/health`)).json()).toMatchObject({ aiConfigured: true });
    expect(await (await fetch(`${base}/generate/status`)).json()).toMatchObject({ model: true });
    const read = await fetch(`${base}/model-settings`);
    expect(read.headers.get('cache-control')).toBe('no-store'); expect(await read.text()).not.toContain(key);
  });
  it('rejects missing nonce, foreign Origin, rebind Host, cross-site metadata and non-JSON writes', async () => {
    const { base, post } = await start();
    expect((await post('model-settings', update(), { 'X-AlgoMotion-Settings-Token': '' })).status).toBe(403);
    expect((await post('model-settings', update(), { Origin: 'https://evil.test' })).status).toBe(403);
    // Node fetch may replace Host, so use the HTTP client to exercise actual DNS-rebind headers.
    const rebindStatus = await new Promise((resolve, reject) => {
      const req = httpRequest(`${base}/model-settings`, { headers: { Host: 'rebind.example' } }, (res) => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject); req.end();
    });
    expect(rebindStatus).toBe(403);
    expect((await post('model-settings', update(), { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403);
    expect((await post('model-settings', update(), { 'Content-Type': 'text/plain' })).status).toBe(415);
    expect((await post('model-settings', update({ apiKey: 'x'.repeat(17000) }))).status).toBe(413);
  });
  it('tests only with explicit cost consent; draft test neither saves nor echoes the key', async () => {
    const fetcher = vi.fn().mockResolvedValue(envelope({ ok: true })), { base, post } = await start(fetcher);
    expect((await post('model-settings/test', update())).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
    const result = await post('model-settings/test', { ...update(), consent: true });
    expect(result.status).toBe(200); expect(await result.text()).not.toContain(key);
    expect(await (await fetch(`${base}/health`)).json()).toMatchObject({ aiConfigured: false });
  });
  it('rejects false-positive connection responses and strips upstream errors', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(envelope({ ok: false })).mockResolvedValueOnce(new Response(key, { status: 403 }));
    const { post } = await start(fetcher);
    expect((await post('model-settings/test', { ...update(), consent: true })).status).toBe(502);
    const failed = await post('model-settings/test', { ...update(), consent: true });
    expect(failed.status).toBe(502); expect(await failed.text()).not.toContain(key);
  });
  it('uses new settings for matching and contract parsing without a restart', async () => {
    const p = fixtureProgram('grid-shortest-4');
    const fetcher = vi.fn().mockResolvedValueOnce(envelope({ problemId: 'two-sum', explanation: 'mock match' })).mockResolvedValueOnce(envelope(wireContract(p.contract)));
    const { post } = await start(fetcher);
    await post('model-settings', update());
    expect((await post('match', { source: 'a longer algorithm description' })).status).toBe(200);
    await post('model-settings', { ...providerDefaults('moonshot'), apiKey: 'MOCK-kimi-key', model: 'mock-kimi', persistence: 'session' });
    expect((await post('generate/parse', { source: p.source })).status).toBe(200);
    expect(fetcher.mock.calls[0][0]).toBe('https://api.deepseek.com/chat/completions');
    expect(fetcher.mock.calls[1][0]).toBe('https://api.moonshot.cn/v1/chat/completions');
    expect(JSON.parse(fetcher.mock.calls[1][1].body).model).toBe('mock-kimi');
  });
  it('an already accepted generation job retains its config even if settings change during probe', async () => {
    const p = fixtureProgram('grid-shortest-4');
    let release!: () => void;
    const wait = new Promise<void>((r) => { release = r; });
    const probe = vi.fn().mockImplementation(async () => { await wait; return { available: true, message: 'MOCK' }; });
    const fetcher = vi.fn().mockResolvedValue(envelope({ python: p.python }));
    const { post } = await start(fetcher, new ModelSettingsStore(environment), { probe, run: async (program, input) => mockTrace(program, input) });
    const pending = post('generate/jobs', { source: p.source, contract: p.contract, verification: 'none', confirmed: true });
    await vi.waitFor(() => expect(probe).toHaveBeenCalled());
    await post('model-settings', update({ model: 'changed-after-submit', apiKey: 'new-key' })); release();
    expect((await pending).status).toBe(202);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${key}`);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).model).toBe('mock-model');
  });
});
