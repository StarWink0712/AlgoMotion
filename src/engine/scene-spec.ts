import { z } from 'zod';
import type { GeneratedFrame, GeneratedTrace } from './generated';

// A data-only presentation language. No expressions, markup, URLs, CSS or event handlers.
const binding = z.string().max(120).regex(/^(grid|dp|queue|path|dependencies|variables(?:\.[a-zA-Z0-9_]+){0,4}|input(?:\.[a-zA-Z0-9_]+){0,4}|result(?:\.[a-zA-Z0-9_]+){0,4})$/)
  .refine((s) => !s.split('.').some((p) => ['__proto__', 'constructor', 'prototype'].includes(p)), 'Unsafe binding');
const common = { id: z.string().regex(/^[a-z][a-z0-9-]{0,30}$/), title: z.string().min(1).max(60) };
export const panelSchema = z.discriminatedUnion('kind', [
  z.object({ ...common, kind: z.literal('grid'), source: z.literal('grid') }).strict(),
  z.object({ ...common, kind: z.literal('sequence'), source: binding, style: z.enum(['tiles', 'bars']) }).strict(),
  z.object({ ...common, kind: z.literal('graph'), source: binding, edges: binding, layout: z.enum(['circle', 'rows']) }).strict(),
  z.object({ ...common, kind: z.literal('queue'), source: binding }).strict(),
  z.object({ ...common, kind: z.literal('stack'), source: binding }).strict(),
  z.object({ ...common, kind: z.literal('path'), source: binding }).strict(),
  z.object({ ...common, kind: z.literal('values'), source: binding }).strict(),
  z.object({ ...common, kind: z.literal('result'), source: binding.refine((s) => s === 'result' || s.startsWith('result.')) }).strict(),
]);
export const sceneSpecSchema = z.object({
  version: z.literal(1), title: z.string().min(1).max(100), description: z.string().max(400),
  theme: z.enum(['sky', 'mint', 'sand', 'rose']), layout: z.enum(['split', 'stacked']),
  panels: z.array(panelSchema).min(1).max(6),
}).strict().superRefine((s, ctx) => {
  if (!s.panels.length) return; // min(1) reports the error; do not dereference untrusted empty arrays.
  if (new Set(s.panels.map((p) => p.id)).size !== s.panels.length) ctx.addIssue({ code: 'custom', message: 'Panel IDs must be unique' });
  if (!['grid', 'sequence', 'graph'].includes(s.panels[0].kind)) ctx.addIssue({ code: 'custom', message: 'First panel must visualize runtime state' });
  if (/^(input|result)(\.|$)/.test(s.panels[0].source)) ctx.addIssue({ code: 'custom', message: 'Primary panel must bind recorded runtime state, not static input or final output' });
  if (s.panels.filter((p) => p.kind === 'grid').length > 1) ctx.addIssue({ code: 'custom', message: 'Only one grid panel is allowed' });
});
export type SceneSpec = z.infer<typeof sceneSpecSchema>;
export type ScenePanel = z.infer<typeof panelSchema>;
export type SceneContext = { frame: GeneratedFrame; input: unknown; result: unknown; final: boolean };
// Free-form AI text is archival metadata, not an input-bound execution statement.
export function panelHeading(panel: ScenePanel): string {
  const labels = { grid: '网格与状态', sequence: panel.source === 'dp' ? 'DP 状态' : '运行序列', graph: '状态关系', queue: 'FIFO 队列', stack: '栈 · 栈顶在上', path: '记录路径', values: '运行状态', result: '实际返回值' };
  return labels[panel.kind];
}
export function currentSceneSummary(spec: SceneSpec, context: SceneContext): string {
  const panel = spec.panels[0], value = resolveBinding(panel.source, context);
  const prefix = `第 ${context.frame.step + 1} 帧`;
  if (value === undefined) return `${prefix} · 主面板状态尚未记录`;
  if (panel.kind === 'grid') return `${prefix} · 当前网格 ${context.frame.grid.length} 行 × ${context.frame.grid[0].length} 列`;
  if (panel.kind === 'sequence') return `${prefix} · 当前序列 ${sequenceValues(value).length} 项`;
  if (panel.kind === 'graph') {
    const graph = graphValues(value, resolveBinding(panel.edges, context), panel.source === 'grid');
    return `${prefix} · 当前图 ${graph.nodes.length} 个节点、${graph.edges.length} 条关系`;
  }
  return prefix;
}
export function resolveBinding(source: string, context: SceneContext): unknown {
  if (!binding.safeParse(source).success) return undefined;
  const [root, ...parts] = source.split('.');
  if (root === 'result' && !context.final) return undefined;
  let value: unknown = root === 'input' ? context.input : root === 'result' ? context.result : context.frame[root as keyof GeneratedFrame];
  for (const part of parts) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}
const scalar = z.union([z.string().max(100), z.number().finite(), z.boolean(), z.null()]);
export function sequenceValues(value: unknown, flatten = true): (string | number | boolean | null)[] {
  if (!Array.isArray(value)) throw new Error('expected array');
  return z.array(scalar).max(144).parse(flatten ? value.flat() : value);
}
const graphNode = z.object({ id: z.union([z.string().min(1).max(40), z.number().finite()]), label: z.string().max(100) }).strict();
const graphEdge = z.object({ from: z.union([z.string().max(40), z.number().finite()]), to: z.union([z.string().max(40), z.number().finite()]), label: z.string().max(80).optional(), chosen: z.boolean().optional() }).strict();
class BindingError extends Error {}
export function graphValues(nodes: unknown, edges: unknown, gridSource: boolean) {
  const nodeCount = gridSource && Array.isArray(nodes) ? nodes.flat().length : Array.isArray(nodes) ? nodes.length : 0;
  if (nodeCount > 48) throw new BindingError(`图节点数 ${nodeCount} 超过容量上限 48；请使用网格面板或较小的运行时关系图。`);
  if (Array.isArray(edges) && edges.length > 48) throw new BindingError('图边数量超过容量上限 48。');
  const parsedNodes = gridSource ? sequenceValues(nodes).map((v, i) => ({ id: String(i), label: String(v ?? '·') }))
    : z.array(graphNode).max(48).parse(nodes).map((n) => ({ ...n, id: String(n.id) }));
  const parsedEdges = z.array(graphEdge).max(48).parse(edges ?? []).map((e) => ({ ...e, from: String(e.from), to: String(e.to) }));
  const ids = new Set(parsedNodes.map((n) => n.id));
  if (ids.size !== parsedNodes.length) throw new BindingError('图节点 ID 重复。');
  if (parsedEdges.some((e) => !ids.has(e.from) || !ids.has(e.to))) throw new BindingError('图边引用了不存在的节点。');
  return { nodes: parsedNodes, edges: parsedEdges };
}
export function validateSceneBindings(spec: SceneSpec, trace: GeneratedTrace): string[] {
  const issues: string[] = [];
  for (const [index, panel] of spec.panels.entries()) {
    const location = `panels[${index}] (${panel.kind})`;
    let present = false;
    for (const frame of trace.frames) {
      const context = { frame, input: trace.input, result: trace.result, final: frame.step === trace.frames.length - 1 };
      const value = resolveBinding(panel.source, context);
      if (value === undefined) continue; // Fields may first appear later in execution.
      present = true;
      try {
        if (panel.kind === 'sequence' || ['queue', 'stack', 'path'].includes(panel.kind)) {
          const values = sequenceValues(value, panel.kind === 'sequence');
          if (panel.kind === 'sequence' && panel.style === 'bars' && values.some((v) => typeof v !== 'number')) throw new BindingError('柱状序列要求全部为有限数字，不接受 null、字符串或布尔值。');
        } else if (panel.kind === 'graph') graphValues(value, resolveBinding(panel.edges, context), panel.source === 'grid');
        else if (panel.kind === 'grid' && value !== frame.grid) throw new Error();
      } catch (e) { issues.push(`${location} 第 ${frame.step + 1} 帧：${e instanceof BindingError ? e.message : '数据类型/引用不匹配。'}`); break; }
    }
    if (!present) issues.push(`${location}.source：数据源在轨迹中不存在。`);
    if (panel.kind === 'graph' && !trace.frames.some((frame) => resolveBinding(panel.edges, { frame, input: trace.input, result: trace.result, final: true }) !== undefined)) issues.push(`${location}.edges：边数据源不存在。`);
  }
  return issues.slice(0, 8);
}

export interface SceneCheck { label: string; trace: GeneratedTrace }
export function validateSceneChecks(spec: SceneSpec, checks: readonly SceneCheck[]): string[] {
  return checks.flatMap(({ label, trace }) => validateSceneBindings(spec, trace).map((issue) => `${label}: ${issue}`)).slice(0, 8);
}
export function sceneCheckSummary(checks: readonly SceneCheck[]) {
  let maxRows = 0, maxColumns = 0, maxGridCells = 0, maxQueueItems = 0, maxPathItems = 0, maxDependencies = 0;
  for (const { trace } of checks) for (const f of trace.frames) {
    maxRows = Math.max(maxRows, f.grid.length); maxColumns = Math.max(maxColumns, f.grid[0].length);
    maxGridCells = Math.max(maxGridCells, f.grid.length * f.grid[0].length);
    maxQueueItems = Math.max(maxQueueItems, f.queue.length); maxPathItems = Math.max(maxPathItems, f.path.length);
    maxDependencies = Math.max(maxDependencies, f.dependencies.length);
  }
  return { executedInputs: checks.length, maxRows, maxColumns, maxGridCells, maxQueueItems, maxPathItems, maxDependencies };
}

const string = { type: 'string' };
const wirePanel = (kind: string, extra: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, properties: { id: string, title: string, kind: { type: 'string', enum: [kind] }, source: string, ...extra }, required: ['id', 'title', 'kind', 'source', ...Object.keys(extra)] });
export const sceneOutputSchema = { type: 'object', additionalProperties: false, properties: {
  version: { type: 'integer', enum: [1] }, title: string, description: string,
  theme: { type: 'string', enum: ['sky', 'mint', 'sand', 'rose'] }, layout: { type: 'string', enum: ['split', 'stacked'] },
  panels: { type: 'array', items: { anyOf: [wirePanel('grid', {}), wirePanel('sequence', { style: { type: 'string', enum: ['tiles', 'bars'] } }), wirePanel('graph', { edges: string, layout: { type: 'string', enum: ['circle', 'rows'] } }), ...['queue', 'stack', 'path', 'values', 'result'].map((kind) => wirePanel(kind, {}))] } },
}, required: ['version', 'title', 'description', 'theme', 'layout', 'panels'] };
