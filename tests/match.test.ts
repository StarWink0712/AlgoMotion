import { afterEach, describe, expect, it, vi } from 'vitest';
import { localMatch, matchProblem } from '../server/match';
import { createApp } from '../server/app';
import type { Server } from 'node:http';

const config = { baseUrl: 'https://example.test/v1', key: 'test-key-never-in-browser', model: 'test-model' };
const goodBody = { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ problemId: 'two-sum', explanation: '匹配到两个数求和的题意。' }) } }] };
const response = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

describe('local import', () => {
  it.each(['两数之和', 'Two Sum', '1', 'two-sum', 'https://leetcode.cn/problems/two-sum/', 'https://leetcode.com/problems/two-sum/description/'])('matches %s without a model', async (source) => {
    const fetcher = vi.fn();
    expect(await matchProblem(source, {}, fetcher)).toMatchObject({ problemId: 'two-sum', method: 'local' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not use substring titles to guess semantic matches', () => expect(localMatch('这道题不是两数之和')).toBeNull());
  it('does not fetch unknown hosts', () => expect(() => localMatch('http://127.0.0.1/secrets')).toThrow('力扣题目链接'));
  it('rejects unsupported slugs', () => expect(() => localMatch('https://leetcode.cn/problems/unknown/')).toThrow('预设执行器'));
  it('does not guess when AI is unconfigured', async () => await expect(matchProblem('给你一个陌生的新问题', {})).rejects.toMatchObject({ status: 503 }));
});

describe('model boundary', () => {
  it('sends strict schema server-side and validates result', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(goodBody));
    expect(await matchProblem('找到两个加起来等于目标值的元素下标', config, fetcher)).toMatchObject({ problemId: 'two-sum', method: 'ai' });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://example.test/v1/chat/completions');
    expect(JSON.parse(options.body).response_format.json_schema.strict).toBe(true);
    expect(options.redirect).toBe('error');
  });
  it.each([
    { choices: [{ finish_reason: 'stop', message: { content: '<script>alert(1)</script>' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '{"problemId":"arbitrary-code","explanation":"oops"}' } }] },
    { choices: [{ finish_reason: 'length', message: { content: '{}' } }] },
    { choices: [{ finish_reason: 'stop', message: { refusal: 'no', content: '{}' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '{"problemId":"two-sum","explanation":"ok","code":"alert(1)"}' } }] },
  ])('rejects malformed / refused / extra-field model response', async (body) => {
    await expect(matchProblem('custom text', config, vi.fn().mockResolvedValue(response(body)))).rejects.toMatchObject({ status: 502 });
  });
  it('rejects output beyond the response byte limit', async () => {
    await expect(matchProblem('custom text', config, vi.fn().mockResolvedValue(new Response('x'.repeat(64_001))))).rejects.toMatchObject({ status: 502 });
  });
  it('handles unsupported problems honestly', async () => {
    const body = { choices: [{ finish_reason: 'stop', message: { content: '{"problemId":null,"explanation":"unsupported"}' } }] };
    await expect(matchProblem('custom text', config, vi.fn().mockResolvedValue(response(body)))).rejects.toMatchObject({ status: 422 });
  });
  it('does not return upstream response bodies or credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('secret provider debug details', { status: 401 }));
    await expect(matchProblem('custom text', config, fetcher)).rejects.toThrow('HTTP 401');
  });
  it('handles unreachable providers', async () => await expect(matchProblem('custom text', config, vi.fn().mockRejectedValue(new Error('network')))).rejects.toMatchObject({ status: 502 }));
});

describe('HTTP API', () => {
  let server: Server | undefined;
  afterEach(async () => { if (server) await new Promise<void>((resolve) => server!.close(() => resolve())); });
  async function start() {
    server = createApp(config).listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    return `http://127.0.0.1:${address.port}`;
  }
  it('health never exposes the key', async () => {
    const base = await start();
    expect(await (await fetch(`${base}/api/health`)).json()).toEqual({ ok: true, aiConfigured: true });
  });
  it('validates requests and supports local matching', async () => {
    const base = await start();
    const send = (body: unknown) => fetch(`${base}/api/match`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    expect((await send({ source: '' })).status).toBe(400);
    expect((await send({ source: 'x'.repeat(6001) })).status).toBe(400);
    expect(await (await send({ source: '反转链表' })).json()).toMatchObject({ problemId: 'reverse-linked-list', method: 'local' });
  });
  it('rate limits costly endpoints', async () => {
    const base = await start();
    for (let i = 0; i < 10; i++) await fetch(`${base}/api/match`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: '1' }) });
    const rejected = await fetch(`${base}/api/match`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: '1' }) });
    expect(rejected.status).toBe(429);
  });
});
