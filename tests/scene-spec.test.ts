import { describe, expect, it, vi } from 'vitest';
import { currentSceneSummary, graphValues, panelHeading, resolveBinding, sceneCheckSummary, sceneSpecSchema, validateSceneBindings, validateSceneChecks, type SceneSpec } from '../src/engine/scene-spec';
import { generatedTraceSchema, parseBundle } from '../src/engine/generated';
import { checkTeaching } from '../server/generation/quality';
import { designPresentation, generatePython, parseProblem } from '../server/generation/model';
import { validationHint } from '../server/generation/diagnostics';
import { fixtureProgram, mockBundle, mockPresentation, mockTrace, wireContract } from './generated-fixtures';

const p = fixtureProgram('grid-shortest-4');
const config = { baseUrl: 'https://example.test/v1', key: 'MOCK-SECRET', model: 'mock-model' };
const envelope = (value: unknown) => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] }));

describe('SceneSpec v1 data-only presentation boundary', () => {
  it('accepts bound panels and round-trips v2 without breaking v1', () => {
    const b = mockBundle('grid-shortest-4');
    expect(parseBundle(JSON.stringify(b)).version).toBe(1);
    b.program.presentation = mockPresentation; b.version = 2;
    expect(parseBundle(JSON.stringify(b)).program.presentation).toEqual(mockPresentation);
    b.version = 1; expect(() => parseBundle(JSON.stringify(b))).toThrow();
  });
  it('uses current runtime summaries and trusted headings, never archived AI conclusions', () => {
    const spec = { ...mockPresentation, title: '旧答案是6', description: '原终点3,3，距离6' };
    const trace = mockTrace(p, { grid: [[0]], start: [0, 0], end: [0, 0] });
    const context = { frame: trace.frames[0], input: trace.input, result: trace.result, final: false };
    expect(currentSceneSummary(spec, context)).toBe('第 1 帧 · 当前网格 1 行 × 1 列');
    expect(panelHeading({ id: 'stack', title: '底→顶，旧答案6', kind: 'stack', source: 'variables.stack' })).toBe('栈 · 栈顶在上');
  });
  it('checks graph capacity against additional inputs, not just the current small example', () => {
    const program = fixtureProgram('grid-min-right-down');
    const small = mockTrace(program, program.contract.examples[0].input);
    const large = mockTrace(program, { grid: Array.from({ length: 12 }, () => Array(12).fill(1)) });
    const spec: SceneSpec = { ...mockPresentation, panels: [{ id: 'graph', title: 'x', kind: 'graph', source: 'grid', edges: 'dependencies', layout: 'rows' }] };
    const checks = [{ label: '当前输入', trace: small }, { label: '独立边界 6', trace: large }];
    expect(validateSceneBindings(spec, small)).toEqual([]);
    expect(sceneCheckSummary(checks)).toMatchObject({ executedInputs: 2, maxGridCells: 144 });
    expect(validateSceneChecks(spec, checks).join()).toMatch(/独立边界 6.*144.*48/);
  });
  it.each(['html', 'javascript', 'css', 'onClick', 'url'])('rejects executable or unknown field %s', (key) => {
    expect(sceneSpecSchema.safeParse({ ...mockPresentation, [key]: '<script>alert(1)</script>' }).success).toBe(false);
    expect(sceneSpecSchema.safeParse({ ...mockPresentation, panels: [{ ...mockPresentation.panels[0], [key]: 'bad' }] }).success).toBe(false);
  });
  it.each(['variables.__proto__.x', 'input.constructor', 'result.prototype', 'fetch("https://bad")', 'grid[0]'])('rejects unsafe binding %s', (source) => {
    expect(sceneSpecSchema.safeParse({ ...mockPresentation, panels: [{ id: 'x', title: 'x', kind: 'sequence', style: 'tiles', source }] }).success).toBe(false);
  });
  it('rejects duplicate panel IDs, too many panels and missing primary scene', () => {
    expect(sceneSpecSchema.safeParse({ ...mockPresentation, panels: [] }).success).toBe(false);
    expect(sceneSpecSchema.safeParse({ ...mockPresentation, panels: [mockPresentation.panels[0], mockPresentation.panels[0]] }).success).toBe(false);
    expect(sceneSpecSchema.safeParse({ ...mockPresentation, panels: Array(7).fill(mockPresentation.panels[1]) }).success).toBe(false);
    expect(sceneSpecSchema.safeParse({ ...mockPresentation, panels: [mockPresentation.panels[1]] }).success).toBe(false);
    expect(sceneSpecSchema.safeParse({ ...mockPresentation, panels: [{ id: 'answer', title: 'x', kind: 'sequence', style: 'tiles', source: 'result' }] }).success).toBe(false);
  });
  it('never reveals result before final frame or follows inherited properties', () => {
    const trace = mockTrace(p, p.contract.examples[0].input);
    const context = { frame: trace.frames[0], input: Object.create({ secret: 99 }), result: trace.result, final: false };
    expect(resolveBinding('result.path', context)).toBeUndefined();
    expect(resolveBinding('input.secret', context)).toBeUndefined();
    expect(resolveBinding('result', { ...context, final: true })).toEqual(trace.result);
  });
  it('validates every frame, not only model samples, and rejects missing sources', () => {
    const b = mockBundle('grid-shortest-4');
    b.version = 2; b.program.presentation = { ...mockPresentation, panels: [{ id: 'dp', title: 'DP', kind: 'sequence', source: 'dp', style: 'bars' }] };
    b.trace.frames[2].dp = b.trace.frames[2].grid.flat().map(() => null);
    expect(validateSceneBindings(b.program.presentation, b.trace).join()).toContain('第 3 帧');
    expect(() => parseBundle(JSON.stringify(b))).toThrow();
    b.program.presentation.panels = [{ id: 'x', title: 'x', kind: 'sequence', source: 'variables.absent', style: 'tiles' }];
    expect(validateSceneBindings(b.program.presentation, b.trace).join()).toContain('不存在');
  });
  it('does not silently flatten coordinate pairs in a path/queue/stack panel', () => {
    const trace = mockTrace(p, p.contract.examples[0].input);
    const spec: SceneSpec = { ...mockPresentation, panels: [mockPresentation.panels[0], { id: 'route', title: 'x', kind: 'path', source: 'result.path' }] };
    expect(validateSceneBindings(spec, trace).join()).toContain('不匹配');
  });
  it('checks graph types, size, normalized unique IDs and edge references', () => {
    const nodes = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    expect(graphValues(nodes, [{ from: 'a', to: 'b' }], false).edges).toHaveLength(1);
    expect(() => graphValues(nodes, [{ from: 'a', to: 'missing' }], false)).toThrow();
    expect(() => graphValues([{ id: 1, label: 'a' }, { id: '1', label: 'b' }], [], false)).toThrow();
    expect(() => graphValues(Array(49).fill(nodes[0]), [], false)).toThrow();
  });
});

describe('teaching diagnostics are separate from result correctness', () => {
  it.each(['grid-shortest-4', 'grid-min-right-down'] as const)('%s MOCK teaching snapshots pass only their finite checks', (kind) => {
    const program = fixtureProgram(kind), trace = mockTrace(program, program.contract.examples[0].input);
    expect(checkTeaching(trace, kind).status).toBe('passed');
    expect(checkTeaching(trace, 'none').status).toBe('not_run');
  });
  it('detects stale terminal state, missing obstacles and staged whole-path reconstruction', () => {
    const trace = mockTrace(p, p.contract.examples[0].input);
    trace.frames = trace.frames.filter((f) => f.path.length === 0 || f.path.length === trace.frames.at(-1)!.path.length);
    trace.frames.forEach((f, i) => { f.step = i; f.blocked = []; });
    trace.frames.at(-1)!.active = [0];
    expect(checkTeaching(trace, p.verification).details.join()).toMatch(/最终帧.*逐步路径重建.*blocked/);
  });
  it('handles malformed returned paths safely; independent checker decides correctness', () => {
    const trace = mockTrace(p, p.contract.examples[0].input);
    for (const result of [null, { path: [null] }, { path: [[0]] }]) {
      trace.result = result; expect(() => checkTeaching(trace, p.verification)).not.toThrow();
    }
  });
  it('reports only safe field paths and limits for dp=null, coordinate IDs and excessive dependencies', () => {
    const trace = mockTrace(p, p.contract.examples[0].input);
    const bad = { ...trace, frames: [{ ...trace.frames[0], dp: null, path: [[0, 0]], dependencies: Array(49).fill({ from: 0, to: 1, label: 'SECRET', chosen: true }), variables: { privateSECRET: undefined } }] };
    const result = generatedTraceSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = validationHint(result.error);
      expect(message).toContain('dp'); expect(message).toContain('48'); expect(message).not.toContain('SECRET');
    }
  });
});

describe('MOCK model presentation and explicit repair protocol', () => {
  it('designs from actual snapshots, not an executable page or fabricated timeline', async () => {
    const fetcher = vi.fn().mockResolvedValue(envelope(mockPresentation)), trace = mockTrace(p, p.contract.examples[0].input);
    expect(await designPresentation(p, trace, config, fetcher)).toEqual(mockPresentation);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('No HTML');
    expect(JSON.parse(body.messages[1].content).frames[0]).toEqual(trace.frames[0]);
    expect(body.response_format.json_schema.name).toBe('trace_presentation');
    expect(JSON.stringify(body)).not.toContain(config.key);
  });
  it('sends executed capacity to the model and rejects designs that fail a boundary', async () => {
    const program = fixtureProgram('grid-min-right-down');
    const small = mockTrace(program, program.contract.examples[0].input), large = mockTrace(program, { grid: Array.from({ length: 12 }, () => Array(12).fill(1)) });
    const fetcher = vi.fn().mockResolvedValue(envelope({ ...mockPresentation, panels: [{ id: 'graph', title: 'x', kind: 'graph', source: 'grid', edges: 'dependencies', layout: 'rows' }] }));
    await expect(designPresentation(program, small, config, fetcher, undefined, [{ label: '当前输入', trace: small }, { label: '独立边界 6', trace: large }])).rejects.toMatchObject({ code: 'PRESENTATION_BINDING' });
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(JSON.parse(body.messages[1].content).validationCoverage.maxGridCells).toBe(144);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects unbound or executable model designs without automatic retries', async () => {
    for (const raw of [{ ...mockPresentation, html: '<script />' }, { ...mockPresentation, panels: [{ id: 'x', title: 'x', kind: 'sequence', style: 'bars', source: 'variables.absent' }] }]) {
      const fetcher = vi.fn().mockResolvedValue(envelope(raw));
      await expect(designPresentation(p, mockTrace(p, p.contract.examples[0].input), config, fetcher)).rejects.toMatchObject({ status: 502 });
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
  it('sends previous source and diagnostic feedback only for explicit repair', async () => {
    const fetcher = vi.fn().mockResolvedValue(envelope({ python: p.python }));
    await generatePython(p.source, p.contract, config, fetcher, undefined, { python: 'broken', feedback: 'dp must be a list' });
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(JSON.parse(body.messages[1].content).previousAttempt).toEqual({ python: 'broken', feedback: 'dp must be a list' });
  });
  it('rejects new model contracts with missing required declarations', async () => {
    const wire = wireContract(p.contract), shape = JSON.parse(wire.inputSchema); delete shape.required;
    await expect(parseProblem('x', config, vi.fn().mockResolvedValue(envelope({ ...wire, inputSchema: JSON.stringify(shape) })))).rejects.toMatchObject({ status: 502 });
  });
});
