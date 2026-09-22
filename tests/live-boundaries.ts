// Deterministic additional acceptance on real generated programs, Docker only, no model API.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { DockerSandbox, dockerCommand } from '../server/generation/sandbox';
import { verifierInput, verifyResult } from '../server/generation/verify';
import { parseBundle, validateInput } from '../src/engine/generated';
import { validateSceneBindings } from '../src/engine/scene-spec';
import { checkTeaching } from '../server/generation/quality';

const path = resolve(process.argv[2]);
const { program } = parseBundle(await readFile(path, 'utf8'));
const bfs = program.verification === 'grid-shortest-4';
const stack = process.argv[3] === 'temperatures';
assert(bfs || program.verification === 'grid-min-right-down' || stack && program.verification === 'none');
const tests: unknown[] = stack ? [
  { temperatures: [] }, { temperatures: [5] }, { temperatures: [5, 5, 5] },
  { temperatures: [5, 4, 3, 2, 1] }, { temperatures: [-100, 100, -100, 100] },
] : bfs ? [
  { grid: [[0]], start: [0, 0], end: [0, 0] },
  { grid: [[1]], start: [0, 0], end: [0, 0] },
  { grid: [[0, 1], [1, 0]], start: [0, 0], end: [1, 1] },
  { grid: [Array(12).fill(0)], start: [0, 11], end: [0, 0] },
  { grid: Array.from({ length: 12 }, () => Array(12).fill(0)), start: [0, 0], end: [11, 11] },
] : [
  { grid: [[0]] }, { grid: [[1_000_000]] },
  { grid: Array.from({ length: 12 }, (_, i) => [i % 4]) },
  { grid: [Array.from({ length: 12 }, (_, i) => i % 5)] },
  { grid: Array.from({ length: 12 }, () => Array(12).fill(1_000_000)) },
];
let seed = 9222026;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
for (let i = 0; i < 6; i++) {
  if (stack) { tests.push({ temperatures: Array.from({ length: i === 5 ? 40 : random() % 20 + 1 }, () => random() % 201 - 100) }); continue; }
  const rows = random() % 6 + 1, cols = random() % 6 + 1;
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => bfs ? Number(random() % 5 === 0) : random() % 20));
  tests.push(bfs ? { grid, start: [random() % rows, random() % cols], end: [random() % rows, random() % cols] } : { grid });
}
let executions = 0;
const sandbox = new DockerSandbox(async (args, options) => { if (args[0] === 'start') executions++; return dockerCommand(args, options); });
const results: { case: number; input: unknown; result?: unknown; frames?: number; independent: string; teaching?: string; presentation?: string; presentationIssues?: string[]; maxDependencies?: number; error?: string }[] = [];
for (const [i, input] of tests.entries()) {
  try {
    validateInput(program.contract, input); verifierInput(program.verification, input);
    const trace = await sandbox.run(program, input);
    let passed: boolean;
    if (stack) {
      // Independent quadratic reference, not the generated monotonic-stack implementation.
      const values = (input as { temperatures: number[] }).temperatures;
      const waits = values.map((v, at) => { for (let j = at + 1; j < values.length; j++) if (values[j] > v) return j - at; return 0; });
      try { assert.deepEqual(trace.result, { waits }); passed = true; } catch { passed = false; }
    } else passed = verifyResult(program.verification, input, trace.result);
    const presentationIssues = program.presentation ? validateSceneBindings(program.presentation, trace) : [];
    results.push({ case: i + 1, input, result: trace.result, frames: trace.frames.length, independent: passed ? 'passed' : 'failed', teaching: checkTeaching(trace, program.verification).status,
      presentation: program.presentation ? presentationIssues.length ? 'failed' : 'passed' : 'not_run', presentationIssues, maxDependencies: Math.max(...trace.frames.map((f) => f.dependencies.length)) });
  } catch (e) {
    results.push({ case: i + 1, input, independent: 'not_run', error: e instanceof Error ? e.message : 'Execution failed' });
  }
}
const invalid = stack ? [{}, { temperatures: null }, { temperatures: [101] }, { temperatures: [1.5] }, { temperatures: Array(41).fill(0) }] : bfs ? [
  {}, { grid: [], start: [0, 0], end: [0, 0] },
  { grid: [[0], [0, 0]], start: [0, 0], end: [0, 0] },
  { grid: [[0]], start: [1, 0], end: [0, 0] },
  { grid: [Array(13).fill(0)], start: [0, 0], end: [0, 0] },
] : [{}, { grid: [] }, { grid: [[0], [0, 0]] }, { grid: [[-1]] }, { grid: [Array(13).fill(0)] }];
for (const input of invalid) {
  assert.throws(() => { validateInput(program.contract, input); verifierInput(program.verification, input); });
}
assert.equal(executions, tests.length);
const passed = results.filter((r) => r.independent === 'passed').length;
const teachingFailures = results.filter((r) => r.teaching === 'failed').length, presentationFailures = results.filter((r) => r.presentation === 'failed').length;
const report = { modelCalls: 0, realDockerExecutions: executions, originalPythonUnchanged: true, independentPassed: passed, failed: tests.length - passed, teachingFailures, presentationFailures, invalidRejectedBeforeExecution: invalid.length, results };
await writeFile(resolve(dirname(path), `${basename(path, '.bundle.json')}-boundaries.json`), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ kind: stack ? 'temperatures-test-only' : program.verification, executions, independentPassed: passed, failed: tests.length - passed, teachingFailures, presentationFailures, invalidRejected: invalid.length, maximumFrames: Math.max(...results.map((r) => r.frames ?? 0)) }));
if (passed !== tests.length || teachingFailures || presentationFailures) process.exitCode = 1;
