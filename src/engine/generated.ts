import { z } from 'zod';
import { sceneSpecSchema, validateSceneBindings } from './scene-spec';
import { DataValidationError, parseJsonField } from './validation';

export const limits = { inputBytes: 32_768, sourceBytes: 48_000, frames: 600, traceBytes: 2_000_000, bundleBytes: 2_300_000, cells: 144 } as const;
const short = z.string().max(500);
const scalar = z.union([z.number().finite(), z.string().max(100), z.boolean(), z.null()]);
export function boundedJson(value: unknown, maxBytes: number = limits.inputBytes): boolean {
  let count = 0;
  const walk = (v: unknown, depth: number): boolean => {
    if (++count > 20_000 || depth > 16) return false;
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (Array.isArray(v)) return v.every((item) => walk(item, depth + 1));
    return typeof v === 'object' && Object.entries(v).every(([key, item]) => !['__proto__', 'constructor', 'prototype'].includes(key) && walk(item, depth + 1));
  };
  try { return walk(value, 0) && new TextEncoder().encode(JSON.stringify(value)).length <= maxBytes; } catch { return false; }
}
export const jsonValue = z.unknown().refine((v) => boundedJson(v), 'JSON exceeds depth/size limits or contains unsafe keys');
export const contractSchema = z.object({
  title: z.string().min(1).max(100), summary: z.string().min(1).max(2000),
  inputSchema: z.string().min(2).max(8000), outputDescription: z.string().min(1).max(2000),
  constraints: z.array(short).max(20), assumptions: z.array(short).max(20),
  questions: z.array(short).max(10), supported: z.boolean(), limitation: z.string().max(1000),
  examples: z.array(z.object({ input: jsonValue, expected: jsonValue, explanation: short }).strict()).min(1).max(3),
}).strict();
export type Contract = z.infer<typeof contractSchema>;
export const verificationSchema = z.enum(['none', 'grid-shortest-4', 'grid-min-right-down']);
export type Verification = z.infer<typeof verificationSchema>;
export const programSchema = z.object({
  source: z.string().min(1).max(6000), contract: contractSchema,
  python: z.string().min(1).max(limits.sourceBytes), verification: verificationSchema,
  presentation: sceneSpecSchema.optional(),
}).strict();
export type Program = z.infer<typeof programSchema>;

// A deliberately small, non-executable JSON Schema subset. No refs, regex or remote resolution.
const shape: z.ZodType<Shape> = z.lazy(() => z.object({
  type: z.enum(['object', 'array', 'integer', 'number', 'string', 'boolean', 'null']),
  properties: z.record(shape).optional(), required: z.array(z.string().max(80)).max(30).optional(),
  additionalProperties: z.literal(false).optional(), items: shape.optional(),
  minimum: z.number().finite().optional(), maximum: z.number().finite().optional(),
  minItems: z.number().int().min(0).max(144).optional(), maxItems: z.number().int().min(0).max(144).optional(),
  minLength: z.number().int().min(0).max(4000).optional(), maxLength: z.number().int().min(0).max(4000).optional(),
  description: short.optional(), enum: z.array(scalar).max(30).optional(),
}).strict());
type Shape = { type: 'object' | 'array' | 'integer' | 'number' | 'string' | 'boolean' | 'null'; properties?: Record<string, Shape>; required?: string[]; additionalProperties?: false; items?: Shape; minimum?: number; maximum?: number; minItems?: number; maxItems?: number; minLength?: number; maxLength?: number; description?: string; enum?: (string | number | boolean | null)[] };
export function inputShape(contract: Contract): Shape {
  const raw = parseJsonField(contract.inputSchema, ['inputSchema']);
  if (!boundedJson(raw, 8000)) throw new DataValidationError(['inputSchema'], 'JSON_LIMIT');
  const parsed = shape.safeParse(raw);
  if (!parsed.success) throw new z.ZodError(parsed.error.issues.map((issue) => ({ ...issue, path: ['inputSchema', ...issue.path] })));
  const schema = parsed.data;
  if (schema.type !== 'object') throw new DataValidationError(['inputSchema'], 'ROOT_OBJECT');
  return schema;
}
export function validateInput(contract: Contract, value: unknown) {
  if (!boundedJson(value)) throw new DataValidationError(['input'], 'JSON_LIMIT');
  const check = (s: Shape, v: unknown, path: (string | number)[]) => {
    const fail = (rule: ConstructorParameters<typeof DataValidationError>[1] = 'TYPE'): never => { throw new DataValidationError(path, rule); };
    if (s.enum && !s.enum.includes(v as never)) fail('ENUM');
    if (s.type === 'object') {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return fail();
      const obj = v as Record<string, unknown>, props = s.properties ?? {};
      if (Object.keys(obj).some((key) => !Object.hasOwn(props, key))) fail('EXTRA_FIELDS');
      for (const key of s.required ?? []) if (!Object.hasOwn(obj, key)) throw new DataValidationError([...path, key], 'REQUIRED');
      Object.entries(obj).forEach(([key, item]) => check(props[key], item, [...path, key]));
    } else if (s.type === 'array') {
      if (!Array.isArray(v)) return fail();
      if (v.length < (s.minItems ?? 0) || v.length > (s.maxItems ?? 144)) fail('LENGTH');
      if (!s.items) fail('ARRAY_ITEMS');
      v.forEach((item, i) => check(s.items!, item, [...path, i]));
    } else if (s.type === 'integer' || s.type === 'number') {
      if (typeof v !== 'number') return fail();
      if (!Number.isFinite(v) || (s.type === 'integer' && !Number.isSafeInteger(v)) || v < (s.minimum ?? -1e12) || v > (s.maximum ?? 1e12)) fail('RANGE');
    } else if (s.type === 'string') {
      if (typeof v !== 'string') return fail();
      if (v.length < (s.minLength ?? 0) || v.length > (s.maxLength ?? 4000)) fail('LENGTH');
    } else if (s.type === 'null' ? v !== null : typeof v !== 'boolean') fail();
  };
  check(inputShape(contract), value, ['input']);
}

const ids = z.array(z.number().int().min(0).max(limits.cells - 1)).max(limits.cells);
export const generatedFrameSchema = z.object({
  step: z.number().int().min(0), line: z.number().int().min(1).max(3000),
  action: z.string().min(1).max(100), explanation: z.string().max(1000),
  grid: z.array(z.array(scalar).min(1).max(limits.cells)).min(1).max(12),
  active: ids, visited: ids, blocked: ids, queue: ids, path: ids,
  dp: z.array(scalar).max(limits.cells),
  dependencies: z.array(z.object({ from: z.number().int().min(0), to: z.number().int().min(0), label: z.string().max(80), chosen: z.boolean() }).strict()).max(48),
  variables: z.record(jsonValue).refine((v) => Object.keys(v).length <= 20 && boundedJson(v, 4096)),
}).strict().superRefine((f, ctx) => {
  if (!f.grid.length) return;
  const n = f.grid.length * f.grid[0].length;
  if (n > limits.cells || f.grid.some((row) => row.length !== f.grid[0].length) || (f.dp.length !== 0 && f.dp.length !== n)
    || [...f.active, ...f.visited, ...f.blocked, ...f.queue, ...f.path, ...f.dependencies.flatMap((d) => [d.from, d.to])].some((id) => id >= n)) {
    ctx.addIssue({ code: 'custom', message: 'Grid dimensions or state references are invalid' });
  }
});
export type GeneratedFrame = z.infer<typeof generatedFrameSchema>;
export const generatedTraceSchema = z.object({
  version: z.literal(3), origin: z.literal('python-runtime'), input: jsonValue,
  frames: z.array(generatedFrameSchema).min(1).max(limits.frames), result: jsonValue,
}).strict().superRefine((trace, ctx) => {
  if (trace.frames.some((frame, i) => frame.step !== i) || !boundedJson(trace.result) || new TextEncoder().encode(JSON.stringify(trace)).length > limits.traceBytes) {
    ctx.addIssue({ code: 'custom', message: 'Trace steps or bytes exceed protocol limits' });
  }
});
export type GeneratedTrace = z.infer<typeof generatedTraceSchema>;
export const evidenceSchema = z.object({
  structure: z.literal('passed'), runtime: z.literal('passed'),
  examples: z.enum(['passed', 'failed', 'not_run']), independent: z.enum(['passed', 'failed', 'not_run']),
  details: z.array(z.string().max(500)).max(30),
  teaching: z.object({ status: z.enum(['passed', 'failed', 'not_run']), details: z.array(z.string().max(500)).max(12) }).strict().optional(),
  presentation: z.enum(['passed', 'failed', 'not_run']).optional(),
}).strict();
export const bundleSchema = z.object({
  format: z.literal('algomotion-generated'), version: z.union([z.literal(1), z.literal(2)]), program: programSchema,
  trace: generatedTraceSchema, evidence: evidenceSchema,
}).strict().superRefine((b, ctx) => {
  if (b.trace.frames.some((f) => f.line > b.program.python.split('\n').length)) ctx.addIssue({ code: 'custom', message: 'Source line outside Python program' });
  if ((b.version === 2) !== Boolean(b.program.presentation)) ctx.addIssue({ code: 'custom', message: 'Bundle v2 requires SceneSpec v1; legacy v1 has no presentation' });
});
export type Bundle = z.infer<typeof bundleSchema>;
export type Stage = 'generating' | 'executing' | 'checking' | 'designing' | 'complete' | 'failed';
export interface Job { id: string; stage: Stage; program?: Program; bundle?: Bundle; error?: { code: string; message: string }; }
export function parseBundle(raw: string): Bundle {
  if (new TextEncoder().encode(raw).length > limits.bundleBytes) throw new Error('保存文件超过 2.3 MB 上限。');
  const b = bundleSchema.parse(JSON.parse(raw));
  validateInput(b.program.contract, b.trace.input);
  if (b.program.presentation && validateSceneBindings(b.program.presentation, b.trace).length) throw new Error('展示描述与轨迹的数据绑定不一致。');
  return b;
}
