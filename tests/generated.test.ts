import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from '../server/app';
import { generatePython, parseProblem } from '../server/generation/model';
import { DockerSandbox, SandboxError, isolationArgs, type DockerCommand, type Sandbox } from '../server/generation/sandbox';
import { exampleMatches, independentCases, verifyResult } from '../server/generation/verify';
import { boundedJson, generatedTraceSchema, parseBundle, validateInput, type Job } from '../src/engine/generated';
import { fixtureProgram, fixtureResult, mockBundle, mockPresentation, mockTrace, wireContract } from './generated-fixtures';

const config = { baseUrl: 'https://example.test/v1', key: 'SECRET-not-in-browser', model: 'mock-model' };
const envelope = (value: unknown) => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] }));
const fixture = fixtureProgram('grid-shortest-4');

describe('open generation model boundary (MOCK upstream, no real API)', () => {
  it('parses an unknown task without a catalog and generates only Python', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(envelope(wireContract(fixture.contract))).mockResolvedValueOnce(envelope({ python: fixture.python }));
    const contract = await parseProblem(fixture.source, config, fetcher);
    expect(contract.title).toEqual(fixture.contract.title);
    expect(await generatePython(fixture.source, contract, config, fetcher)).toBe(fixture.python);
    const [url, options] = fetcher.mock.calls[1];
    expect(url).toBe('https://example.test/v1/chat/completions');
    expect(JSON.parse(options.body).messages[0].content).toContain('trace.snapshot');
    expect(JSON.parse(options.body).messages[0].content).not.toContain('two-sum');
    expect(JSON.parse(options.body).response_format.json_schema.strict).toBe(true);
    expect(options.redirect).toBe('error');
  });
  it('refuses missing model configuration', async () => { await expect(parseProblem('unknown', {})).rejects.toMatchObject({ status: 503 }); });
  it.each([
    '<script>bad</script>', { python: 'def solve(d,t): return 1', frames: [] }, { python: 'a'.repeat(48001) }, { python: 42 },
  ])('rejects invalid code response %#', async (raw) => { await expect(generatePython('x', fixture.contract, config, vi.fn().mockResolvedValue(envelope(raw)))).rejects.toMatchObject({ status: 502 }); });
  it('rejects malformed contract and invalid input schema', async () => {
    await expect(parseProblem('x', config, vi.fn().mockResolvedValue(envelope({ ...wireContract(fixture.contract), inputSchema: '{"$ref":"https://bad"}' })))).rejects.toThrow('结构');
  });
  it.each([
    new Response('x'.repeat(180001)),
    new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] })),
    new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { refusal: 'secret', content: '{}' } }] })),
    new Response('SECRET provider details', { status: 401 }),
  ])('never leaks refused, truncated, oversized or upstream diagnostics %#', async (response) => {
    await expect(parseProblem('x', config, vi.fn().mockResolvedValue(response))).rejects.not.toThrow('SECRET');
  });
  it('requests autonomous defaults but preserves explicit requirements and genuinely blocking questions', async () => {
    const source = '请用末元素基准、Lomuto 分区实现原地快速排序，降序，保留重复元素。';
    const fetcher = vi.fn().mockResolvedValue(envelope(wireContract(fixture.contract)));
    await parseProblem(source, config, fetcher);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    const prompt = body.messages[0].content;
    expect(prompt).toContain('DEFAULT-FIRST CONTRACT POLICY');
    expect(prompt).toContain('return questions=[]');
    expect(prompt).toContain('Respect every explicit task requirement');
    expect(prompt).toContain('Autonomously choose implementation strategies');
    expect(prompt).toContain('JSON results carry values, not references');
    expect(prompt).toContain('nondecreasing order, preserving duplicates');
    expect(prompt).toContain('no reasonable default exists');
    expect(prompt).toContain('never bundle an implementation questionnaire into one entry');
    expect(prompt).toContain('ANSWER / ANIMATION SEPARATION');
    expect(prompt).toContain("ONLY the algorithm's final answer");
    expect(prompt).toContain('Each must parse directly as JSON without repair');
    expect(JSON.parse(body.messages[1].content)).toEqual({ source });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('passes model defaults through without inventing questions or changing assumptions', async () => {
    const proposed = { ...fixture.contract, assumptions: ['默认：上下左右移动，距离按边数计算。'], questions: [] };
    const fetcher = vi.fn().mockResolvedValue(envelope(wireContract(proposed)));
    expect(await parseProblem('普通网格最短路径', config, fetcher)).toEqual(proposed);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['目标缺失', ['网格问题需要求什么结果？']],
    ['规则冲突', ['严格递增与保留重复值冲突，需要保留哪项要求？']],
    ['旧格式兼容', Array.from({ length: 10 }, (_, i) => `尚未明确的规则 ${i + 1}`)],
  ])('retains unresolved questions without silently answering or truncating: %s', async (_, questions) => {
    const contract = await parseProblem('ambiguous task', config, vi.fn().mockResolvedValue(envelope({ ...wireContract(fixture.contract), questions })));
    expect(contract.questions).toEqual(questions);
  });
});

describe('v3 untrusted schemas and independent verification', () => {
  it('rejects deep, dangerous-key and oversized input', () => {
    expect(boundedJson(JSON.parse('{"__proto__":{}}'))).toBe(false);
    let deep: unknown = 1; for (let i = 0; i < 20; i++) deep = [deep];
    expect(boundedJson(deep)).toBe(false);
    expect(boundedJson('x'.repeat(32769))).toBe(false);
    expect(() => validateInput(fixture.contract, { grid: [], start: [0, 0], end: [0, 0] })).toThrow();
    expect(() => validateInput(fixture.contract, { ...fixture.contract.examples[0].input as object, extra: 1 })).toThrow();
  });
  it('imports only versioned bounded bundles and valid references', () => {
    const b = mockBundle('grid-shortest-4');
    expect(parseBundle(JSON.stringify(b)).version).toBe(1);
    expect(() => parseBundle(JSON.stringify({ ...b, version: 2 }))).toThrow();
    b.trace.frames[1].active = [143]; expect(() => parseBundle(JSON.stringify(b))).toThrow();
  });
  it('rejects non-contiguous steps, non-rectangular grid and too many events', () => {
    const trace = mockBundle('grid-shortest-4').trace;
    expect(generatedTraceSchema.safeParse({ ...trace, frames: Array(601).fill(trace.frames[0]) }).success).toBe(false);
    trace.frames[0].step = 9; expect(generatedTraceSchema.safeParse(trace).success).toBe(false);
    trace.frames[0].step = 0; trace.frames[0].grid = [[0], [0, 0]]; expect(generatedTraceSchema.safeParse(trace).success).toBe(false);
    trace.frames[0].grid = []; expect(generatedTraceSchema.safeParse(trace).success).toBe(false);
  });
  it.each(['grid-shortest-4', 'grid-min-right-down'] as const)('%s independently checks boundary cases', (kind) => {
    for (const input of independentCases(kind)) expect(verifyResult(kind, input, fixtureResult(kind, input))).toBe(true);
  });
  it('accepts multiple optimal paths, but rejects illegal, suboptimal and wrong-count paths', () => {
    const input = { grid: [[0, 0], [0, 0]], start: [0, 0], end: [1, 1] };
    const a = { distance: 2, path: [[0, 0], [1, 0], [1, 1]] }, b = { distance: 2, path: [[0, 0], [0, 1], [1, 1]] };
    expect(exampleMatches('grid-shortest-4', input, a, b)).toBe(true);
    expect(verifyResult('grid-shortest-4', input, { ...a, distance: 3 })).toBe(false);
    expect(verifyResult('grid-shortest-4', input, { distance: 2, path: [[0, 0], [1, 1]] })).toBe(false);
    expect(verifyResult('grid-shortest-4', input, { distance: 4, path: [[0, 0], [1, 0], [0, 0], [1, 0], [1, 1]] })).toBe(false);
  });
  it('distinguishes example success from independent evidence', () => {
    expect(exampleMatches('none', {}, 123, 123)).toBe(true);
    expect(verifyResult('none', {}, 123)).toBe(false);
  });
});

describe('Docker orchestration (MOCK CLI, not isolation evidence)', () => {
  const image = `sha256:${'a'.repeat(64)}`;
  const probe = { code: 0, stdout: JSON.stringify({ Id: image, Config: { Labels: { 'org.algomotion.runner': '1' } } }) };
  it('uses no network, mounts, credentials or root; includes all resource limits', () => {
    const args = isolationArgs('algomotion-test', image).join(' ');
    for (const flag of ['--network=none', '--read-only', '--user=65532:65532', '--cap-drop=ALL', '--security-opt=no-new-privileges:true', '--memory=128m', '--memory-swap=128m', '--cpus=0.5', '--pids-limit=32', 'size=16m', '--log-driver=none']) expect(args).toContain(flag);
    expect(args).not.toMatch(/--volume|--mount|--env|docker\.sock|\/Users/);
  });
  it('fails closed when Docker or image is unavailable', async () => {
    const command = vi.fn().mockRejectedValue(new Error('missing'));
    const sandbox = new DockerSandbox(command);
    expect((await sandbox.probe()).available).toBe(false);
    await expect(sandbox.run(fixture, fixture.contract.examples[0].input)).rejects.toMatchObject({ code: 'DOCKER_UNAVAILABLE' });
    expect(command.mock.calls.every(([args]) => args[0] === 'image')).toBe(true);
  });
  it.each(['TIMEOUT', 'OUTPUT_LIMIT', 'CANCELLED'])('force-removes exactly its own container on %s', async (code) => {
    const calls: string[][] = [];
    const command: DockerCommand = async (args) => { calls.push(args); if (args[0] === 'image') return probe; if (args[0] === 'start') throw new SandboxError(code, 'test failure'); return { code: 0, stdout: '' }; };
    await expect(new DockerSandbox(command).run(fixture, fixture.contract.examples[0].input)).rejects.toMatchObject({ code });
    const create = calls.find((c) => c[0] === 'create')!, remove = calls.find((c) => c[0] === 'rm')!;
    expect(remove).toEqual(['rm', '--force', create[2]]); expect(remove[2]).toMatch(/^algomotion-[a-f0-9-]+$/);
  });
  it('disables further execution when cleanup cannot be confirmed', async () => {
    const command: DockerCommand = async (args) => { if (args[0] === 'image') return probe; if (args[0] === 'start') throw new SandboxError('TIMEOUT', 'x'); return { code: args[0] === 'rm' ? 1 : 0, stdout: '' }; };
    const sandbox = new DockerSandbox(command);
    await expect(sandbox.run(fixture, fixture.contract.examples[0].input)).rejects.toMatchObject({ code: 'CLEANUP_FAILED' });
    expect((await sandbox.probe()).available).toBe(false);
  });
  it('rejects fabricated or invalid transport output even after exit 0', async () => {
    const command: DockerCommand = async (args) => args[0] === 'image' ? probe : { code: 0, stdout: args[0] === 'start' ? '<html>bad</html>' : '' };
    await expect(new DockerSandbox(command).run(fixture, fixture.contract.examples[0].input)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  });
});

describe('generation HTTP pipeline (MOCK model AND sandbox)', () => {
  let server: Server;
  afterEach(async () => { if (server) await new Promise<void>((resolve) => server.close(() => resolve())); });
  async function start(kind: 'grid-shortest-4' | 'grid-min-right-down', customSandbox?: Sandbox) {
    const p = fixtureProgram(kind);
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const prompt = JSON.parse(String(options.body)).messages[0].content;
      return prompt.startsWith('Analyze') ? envelope(wireContract(p.contract)) : prompt.startsWith('Design') ? envelope(mockPresentation) : envelope({ python: p.python });
    });
    const sandbox: Sandbox = customSandbox ?? { probe: async () => ({ available: true, message: 'MOCK' }), run: async (program, input) => mockTrace(program, input) };
    server = createApp(config, fetcher, sandbox).listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address(); if (!address || typeof address === 'string') throw new Error();
    const base = `http://127.0.0.1:${address.port}/api/generate`;
    const post = async (path: string, body: unknown) => fetch(`${base}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const wait = async (id: string) => { for (let i = 0; i < 100; i++) { const job = await (await fetch(`${base}/jobs/${id}`)).json() as Job; if (['complete', 'failed'].includes(job.stage)) return job; await new Promise((r) => setTimeout(r, 5)); } throw new Error('job timeout'); };
    return { base, post, wait, fetcher, p };
  }
  it.each(['grid-shortest-4', 'grid-min-right-down'] as const)('%s parses, generates, checks and reruns without another model request', async (kind) => {
    const { post, wait, fetcher, p } = await start(kind);
    const parsed = await (await post('parse', { source: p.source })).json();
    const created = await (await post('jobs', { source: p.source, contract: parsed.contract, verification: kind, confirmed: true })).json();
    const job = await wait(created.id);
    expect(job.stage).toBe('complete'); expect(job.bundle?.evidence.independent).toBe('passed'); expect(fetcher).toHaveBeenCalledTimes(2);
    const again = await (await post('jobs', { program: job.program, input: p.contract.examples[0].input, confirmed: true })).json();
    expect((await wait(again.id)).stage).toBe('complete'); expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(job)).not.toContain(config.key);
  });
  it('requires explicit confirmation and resolved ambiguity', async () => {
    const { post, p, fetcher } = await start('grid-shortest-4');
    expect((await post('jobs', { source: p.source, contract: p.contract, verification: 'none' })).status).toBe(400);
    expect((await post('jobs', { source: p.source, contract: { ...p.contract, questions: ['which directions?'] }, verification: 'none', confirmed: true })).status).toBe(422);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects an empty untrusted presentation with HTTP 400 instead of throwing', async () => {
    const { post, p, fetcher } = await start('grid-shortest-4');
    const response = await post('jobs', { program: { ...p, presentation: { ...mockPresentation, panels: [] } }, input: p.contract.examples[0].input, confirmed: true });
    expect(response.status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it('designs v2, reuses source and layout on input changes, and only repairs on explicit request', async () => {
    const { post, wait, fetcher, p } = await start('grid-shortest-4');
    const created = await (await post('jobs', { source: p.source, contract: p.contract, verification: p.verification, confirmed: true, design: true })).json();
    const job = await wait(created.id);
    expect(job.stage).toBe('complete'); expect(job.bundle?.version).toBe(2);
    expect(job.bundle?.evidence.presentation).toBe('passed'); expect(fetcher).toHaveBeenCalledTimes(2);
    const input = { grid: [[0]], start: [0, 0], end: [0, 0] };
    const run = await (await post('jobs', { program: job.program, input, confirmed: true })).json();
    const rerun = await wait(run.id);
    expect(rerun.stage).toBe('complete'); expect(rerun.program).toEqual(job.program); expect(fetcher).toHaveBeenCalledTimes(2);
    const repair = await (await post('jobs', { program: job.program, input, confirmed: true, repair: true, design: true, feedback: 'explicit repair' })).json();
    expect((await wait(repair.id)).stage).toBe('complete'); expect(fetcher).toHaveBeenCalledTimes(4);
    expect(JSON.parse(fetcher.mock.calls[2][1].body).messages[1].content).toContain('explicit repair');
  });
  it('preserves raw execution after bad AI design and does not retry', async () => {
    const { post, wait, fetcher, p } = await start('grid-shortest-4');
    fetcher.mockResolvedValueOnce(envelope({ python: p.python })).mockResolvedValueOnce(envelope({ html: '<script />' }));
    const created = await (await post('jobs', { source: p.source, contract: p.contract, verification: p.verification, confirmed: true, design: true })).json();
    const job = await wait(created.id);
    expect(job.stage).toBe('failed'); expect(job.bundle?.version).toBe(1);
    expect(parseBundle(JSON.stringify(job.bundle)).evidence.presentation).toBe('failed');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('fails teaching before paying for a design even when numeric results pass', async () => {
    const { post, wait, fetcher, p } = await start('grid-shortest-4', { probe: async () => ({ available: true, message: 'MOCK' }), run: async (program, input) => {
      const trace = mockTrace(program, input); trace.frames.at(-1)!.active = [0]; return trace;
    } });
    const created = await (await post('jobs', { source: p.source, contract: p.contract, verification: p.verification, confirmed: true, design: true })).json();
    const job = await wait(created.id);
    expect(job.error?.code).toBe('TEACHING_FAILED'); expect(job.bundle?.evidence.independent).toBe('passed'); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('drops incompatible bindings on a new input, preserving a readable diagnostic bundle', async () => {
    const { post, wait, fetcher, p } = await start('grid-shortest-4');
    p.presentation = { ...mockPresentation, panels: [{ id: 'missing', kind: 'sequence', style: 'tiles', title: 'Missing', source: 'variables.absent' }] };
    const created = await (await post('jobs', { program: p, input: p.contract.examples[0].input, confirmed: true })).json();
    const job = await wait(created.id);
    expect(job.error?.code).toBe('PRESENTATION_BINDING'); expect(parseBundle(JSON.stringify(job.bundle)).version).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects a newly designed small-grid graph before completion when an executed boundary has 144 cells', async () => {
    const { post, wait, fetcher, p } = await start('grid-min-right-down');
    const graph = { ...mockPresentation, panels: [{ id: 'graph', kind: 'graph', title: 'x', source: 'grid', edges: 'dependencies', layout: 'rows' }] };
    fetcher.mockResolvedValueOnce(envelope({ python: p.python })).mockResolvedValueOnce(envelope(graph));
    const created = await (await post('jobs', { source: p.source, contract: p.contract, verification: p.verification, confirmed: true, design: true })).json();
    const job = await wait(created.id);
    expect(job.stage).toBe('failed'); expect(job.error).toMatchObject({ code: 'PRESENTATION_BINDING', message: expect.stringMatching(/独立边界 6.*144.*48/) });
    expect(parseBundle(JSON.stringify(job.bundle))).toMatchObject({ version: 1, evidence: { independent: 'passed', presentation: 'failed' } });
    expect(job.program?.presentation).toBeUndefined(); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rechecks a saved plan on boundary inputs even when the current input fits; makes no model request', async () => {
    const { post, wait, fetcher, p } = await start('grid-min-right-down');
    p.presentation = { ...mockPresentation, panels: [{ id: 'graph', kind: 'graph', title: 'x', source: 'grid', edges: 'dependencies', layout: 'rows' }] };
    const created = await (await post('jobs', { program: p, input: p.contract.examples[0].input, confirmed: true })).json();
    const job = await wait(created.id);
    expect(job.error?.code).toBe('PRESENTATION_BINDING'); expect(job.bundle?.evidence.independent).toBe('passed');
    expect(parseBundle(JSON.stringify(job.bundle)).version).toBe(1); expect(fetcher).not.toHaveBeenCalled();
  });
  it('also checks model sample inputs when no independent verifier exists', async () => {
    const { post, wait, fetcher, p } = await start('grid-min-right-down');
    const large = { grid: Array.from({ length: 12 }, () => Array(12).fill(1)) };
    p.verification = 'none'; p.contract.examples.push({ input: large, expected: fixtureResult('grid-min-right-down', large), explanation: 'MOCK large sample' });
    p.presentation = { ...mockPresentation, panels: [{ id: 'graph', kind: 'graph', title: 'x', source: 'grid', edges: 'dependencies', layout: 'rows' }] };
    const created = await (await post('jobs', { program: p, input: p.contract.examples[0].input, confirmed: true })).json();
    const job = await wait(created.id);
    expect(job.error?.message).toMatch(/模型样例 2.*144.*48/); expect(job.bundle?.evidence.independent).toBe('not_run'); expect(fetcher).not.toHaveBeenCalled();
  });
  it('returns stage-specific safe model diagnostics through the HTTP boundary', async () => {
    const { post, wait, fetcher, p } = await start('grid-shortest-4');
    fetcher.mockResolvedValueOnce(envelope({ python: 42, privateSECRET: 'SECRET' }));
    const created = await (await post('jobs', { source: p.source, contract: p.contract, verification: p.verification, confirmed: true })).json();
    const job = await wait(created.id);
    expect(job.error).toMatchObject({ code: 'MODEL_PYTHON_SCHEMA', message: expect.stringContaining('python: 应为 string，实际为 number') });
    expect(JSON.stringify(job)).not.toContain('SECRET');
  });
  it('fails before a paid code generation if Docker is unavailable', async () => {
    const { post, p, fetcher } = await start('grid-shortest-4', { probe: async () => ({ available: false, message: 'no Docker' }), run: vi.fn() });
    const response = await post('jobs', { source: p.source, contract: p.contract, verification: p.verification, confirmed: true });
    expect(response.status).toBe(422); expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects cross-site requests', async () => {
    const { base } = await start('grid-shortest-4');
    expect((await fetch(`${base}/status`, { headers: { Origin: 'https://evil.example' } })).status).toBe(403);
  });
  it('keeps diagnostics and trace on independent validation failure', async () => {
    const { post, p, wait } = await start('grid-shortest-4', { probe: async () => ({ available: true, message: 'MOCK' }), run: async (program, input) => ({ ...mockTrace(program, input), result: { distance: 99, path: [] } }) });
    const created = await (await post('jobs', { source: p.source, contract: p.contract, verification: p.verification, confirmed: true })).json();
    const job = await wait(created.id); expect(job.stage).toBe('failed'); expect(job.bundle?.evidence).toMatchObject({ runtime: 'passed', examples: 'failed', independent: 'failed' });
  });
});
