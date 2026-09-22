import { describe, expect, it, vi } from 'vitest';
import { requestJson } from '../server/llm';
import { generatePython, parseProblem } from '../server/generation/model';
import { fixtureProgram, wireContract } from './generated-fixtures';

const config = { baseUrl: 'https://example.test/v1', key: 'SECRET_KEY', model: 'mock' };
const options = { system: 'test', user: 'test', schema: {}, name: 'test', tokens: 50 };
const p = fixtureProgram('grid-shortest-4');
const envelope = (raw: unknown) => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(raw) } }] }));
async function failure(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e) as Error & { code: string; status: number };
  expect(error).toBeInstanceOf(Error); expect(error.message).not.toContain('SECRET'); return error;
}

describe('safe contract/code diagnostics (MOCK provider)', () => {
  it.each(['inputJson', 'expectedJson'] as const)('pinpoints malformed %s without exposing its text', async (field) => {
    const raw = wireContract(p.contract); raw.examples[0][field] = '{SECRET';
    const error = await failure(parseProblem(p.source, config, vi.fn().mockResolvedValue(envelope(raw))));
    expect(error.code).toBe('MODEL_CONTRACT_JSON'); expect(error.message).toContain(`examples[0].${field}`); expect(error.message).toContain('JSON_SYNTAX');
  });
  it('separates malformed schema JSON from unsupported schema fields and a missing required declaration', async () => {
    const shape = JSON.parse(p.contract.inputSchema);
    for (const [schema, code, part] of [
      ['{SECRET', 'MODEL_CONTRACT_JSON', 'inputSchema'],
      [JSON.stringify({ ...shape, privateSECRET: 'SECRET' }), 'MODEL_CONTRACT_SCHEMA', '未允许字段'],
      [JSON.stringify({ ...shape, required: undefined }), 'MODEL_CONTRACT_INPUT', 'REQUIRED_DECLARATION'],
      [JSON.stringify({ ...shape, required: ['privateSECRET'] }), 'MODEL_CONTRACT_INPUT', 'REQUIRED_REFERENCE'],
    ]) {
      const error = await failure(parseProblem(p.source, config, vi.fn().mockResolvedValue(envelope({ ...wireContract(p.contract), inputSchema: schema }))));
      expect(error.code).toBe(code); expect(error.message).toContain(part);
    }
  });
  it('identifies missing or mistyped sample fields and masks arbitrary input property names', async () => {
    const raw = wireContract(p.contract);
    raw.examples[0].inputJson = JSON.stringify({ grid: 'SECRET', start: [0, 0], end: [0, 0] });
    let error = await failure(parseProblem('x', config, vi.fn().mockResolvedValue(envelope(raw))));
    expect(error.code).toBe('MODEL_CONTRACT_INPUT'); expect(error.message).toContain('examples[0].inputJson.grid');
    raw.inputSchema = JSON.stringify({ type: 'object', properties: { privateSECRET: { type: 'integer' } }, required: ['privateSECRET'], additionalProperties: false });
    raw.examples[0].inputJson = '{}';
    error = await failure(parseProblem('x', config, vi.fn().mockResolvedValue(envelope(raw))));
    expect(error.message).toContain('inputJson.*'); expect(error.message).toContain('REQUIRED');
  });
  it.each([{ python: 123 }, { python: '' }, { python: 'def solve(d,t): return 0', privateSECRET: 'SECRET' }, { privateSECRET: 'SECRET' }])('diagnoses invalid Python objects safely %#', async (raw) => {
    const error = await failure(generatePython('x', p.contract, config, vi.fn().mockResolvedValue(envelope(raw))));
    expect(error.code).toBe('MODEL_PYTHON_SCHEMA');
  });
  it('enforces the UTF-8 source limit, not just character count', async () => {
    const error = await failure(generatePython('x', p.contract, config, vi.fn().mockResolvedValue(envelope({ python: '#汉'.repeat(13000) }))));
    expect(error.code).toBe('MODEL_PYTHON_LIMIT');
  });
});

describe('safe transport diagnostics (MOCK provider)', () => {
  it.each([
    [() => new Response('SECRET', { status: 401 }), 'MODEL_HTTP_ERROR'],
    [() => new Response(null, { status: 204 }), 'MODEL_EMPTY_RESPONSE'],
    [() => new Response('SECRET'), 'MODEL_ENVELOPE_JSON'],
    [() => new Response(JSON.stringify({ choices: [] })), 'MODEL_ENVELOPE_SCHEMA'],
    [() => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '```SECRET```' } }] })), 'MODEL_CONTENT_JSON'],
    [() => new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: 'SECRET' } }] })), 'MODEL_TRUNCATED'],
    [() => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { refusal: 'SECRET', content: '{}' } }] })), 'MODEL_REFUSAL'],
  ] as const)('classifies response failures without raw provider content %#', async (response, code) => {
    const fetcher = vi.fn().mockResolvedValue(response());
    const error = await failure(requestJson(config, fetcher, options));
    expect(error.code).toBe(code); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('distinguishes byte limits, network errors, cancellation and timeout', async () => {
    expect((await failure(requestJson(config, vi.fn().mockResolvedValue(new Response('SECRET'.repeat(20))), { ...options, maxBytes: 10 }))).code).toBe('MODEL_RESPONSE_LIMIT');
    expect((await failure(requestJson(config, vi.fn().mockRejectedValue(new Error('SECRET')), options))).code).toBe('MODEL_TRANSPORT');
    const controller = new AbortController(); controller.abort(); const fetcher = vi.fn();
    expect((await failure(requestJson(config, fetcher, { ...options, signal: controller.signal }))).code).toBe('MODEL_CANCELLED'); expect(fetcher).not.toHaveBeenCalled();
    const wait: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(new Error('SECRET'))));
    expect((await failure(requestJson(config, wait, { ...options, timeout: 10 }))).code).toBe('MODEL_TIMEOUT');
  });
});
