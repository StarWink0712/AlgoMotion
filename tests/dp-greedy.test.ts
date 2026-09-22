import { describe, expect, it } from 'vitest';
import { runProblem } from '../src/engine/run';
import { describeFrame } from '../src/engine/presentation';
import { dpGreedyProblems } from '../src/engine/presets/dp-greedy-catalog';
import { dpGreedyView, type DPGreedyId } from '../src/engine/presets/dp-greedy';
import { codeLanguages, type Trace } from '../src/engine/types';
import { dpGreedyCases, dpGreedyMaximums } from './dp-greedy-cases';

// Deferred acceptance tests: authored here, not executed during incremental filling.
function assertFrames(trace: Trace) {
  const problem = dpGreedyProblems.find((p) => p.id === trace.problemId)!;
  expect(trace.frames.length).toBeLessThanOrEqual(1000);
  expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
  for (const [index, frame] of trace.frames.entries()) {
    const view = dpGreedyView(frame), ids = new Set(view.cells.map((c) => c.id));
    frame.values.forEach((_, i) => ids.add(`s${i}`));
    expect(frame.step).toBe(index);
    expect(frame.result === undefined || index === trace.frames.length - 1).toBe(true);
    expect(new Set(view.cells.map((c) => c.id)).size).toBe(view.cells.length);
    expect(view.active === null || ids.has(view.active)).toBe(true);
    for (const i of [...frame.active, ...view.witness, ...view.otherWitness]) expect(i >= 0 && i < frame.values.length).toBe(true);
    for (const edge of view.deps) {
      expect(ids.has(edge.from) && ids.has(edge.to)).toBe(true);
      expect(edge.value).not.toBeNull();
      expect(!edge.chosen || edge.eligible).toBe(true);
      const source = edge.from.startsWith('s') ? frame.values[Number(edge.from.slice(1))] : view.cells.find((c) => c.id === edge.from)!.value;
      expect(edge.value).toBe(source);
    }
    expect(describeFrame(trace.problemId, frame).equation).not.toMatch(/NaN|undefined/);
    for (const language of codeLanguages) expect(problem.code[language].locations[frame.location]).toBeGreaterThan(0);
  }
  for (const language of codeLanguages) expect(Object.keys(problem.code[language].locations).sort()).toEqual(Object.keys(problem.code.java.locations).sort());
}
describe('batch 10 fixtures and semantic snapshots', () => {
  for (const [id, input, expected] of dpGreedyCases) it(`${id} ${JSON.stringify(input)}`, () => {
    const before = structuredClone(input), trace = runProblem(id, input);
    expect(trace.result).toEqual(expected); expect(input).toEqual(before); assertFrames(trace);
    const first = structuredClone(trace.frames[0]);
    trace.frames.at(-1)!.values.push('changed'); dpGreedyView(trace.frames.at(-1)!).witness.push(99);
    expect(trace.frames[0]).toEqual(first);
  });
});

let seed = 12093;
const rand = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
const choose = (n: number, k: number) => { let count = 1; for (let i = 1; i <= k; i++) count = count * (n - i + 1) / i; return Math.round(count); };
const selected = (nums: number[], mask: number) => nums.filter((_, i) => mask & 2 ** i);
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

function jumpOracle(nums: number[]) {
  const queue = [[0,0]], seen = new Set([0]);
  for (let head = 0; head < queue.length; head++) {
    const [position, distance] = queue[head]; if (position === nums.length - 1) return distance;
    for (let next = position + 1; next < nums.length && next <= position + nums[position]; next++) if (!seen.has(next)) { seen.add(next); queue.push([next, distance + 1]); }
  }
  return -1;
}
function partitionOracle(s: string) {
  if (!s.length) return [];
  let best: number[] = [];
  for (let mask = 0; mask < 2 ** (s.length - 1); mask++) {
    const parts: string[] = []; let start = 0;
    for (let i = 0; i < s.length; i++) if (i === s.length - 1 || mask & 2 ** i) { parts.push(s.slice(start, i + 1)); start = i + 1; }
    const seen = new Set<string>(); let valid = true;
    for (const part of parts) { const letters = new Set(part); if ([...letters].some((ch) => seen.has(ch))) valid = false; for (const ch of letters) seen.add(ch); }
    if (valid && parts.length > best.length) best = parts.map((s) => s.length);
  }
  return best;
}
function squareOracle(n: number) {
  const queue = [[0,0]], seen = new Set([0]);
  for (let head = 0; head < queue.length; head++) {
    const [amount, count] = queue[head]; if (amount === n) return count;
    for (let root = 1; amount + root * root <= n; root++) {
      const next = amount + root * root; if (!seen.has(next)) { seen.add(next); queue.push([next, count + 1]); }
    }
  }
  throw new Error('Every nonnegative integer is reachable using ones');
}
function wordOracle(s: string, words: string[]): boolean {
  const strings = [''], seen = new Set(['']);
  for (let head = 0; head < strings.length; head++) {
    const prefix = strings[head]; if (prefix === s) return true;
    for (const word of words) { const next = prefix + word; if (s.startsWith(next) && !seen.has(next)) { seen.add(next); strings.push(next); } }
  }
  return false;
}
function gridOracle(grid: number[][]) {
  const costs: number[] = [];
  const enumerate = (r: number, c: number, cost: number) => {
    const next = cost + grid[r][c];
    if (r === grid.length - 1 && c === grid[0].length - 1) costs.push(next);
    if (r + 1 < grid.length) enumerate(r + 1, c, next);
    if (c + 1 < grid[0].length) enumerate(r, c + 1, next);
  };
  enumerate(0,0,0); return Math.min(...costs);
}

describe('120 independent comparisons per new algorithm', () => {
  it('compares greedy jump layers against BFS and character partitions against all cut masks', () => {
    for (let trial = 0; trial < 120; trial++) {
      const nums = Array.from({ length: 1 + rand(24) }, () => rand(7));
      const trace = runProblem('jump-game-ii', { nums }); expect(trace.result).toBe(jumpOracle(nums));
      for (const frame of trace.frames) for (const range of dpGreedyView(frame).ranges) expect(range.start >= 0 && range.end < nums.length && range.start <= range.end).toBe(true);
      const s = Array.from({ length: rand(10) }, () => 'abcd'[rand(4)]).join(''), partition = runProblem('partition-labels', { s });
      expect(partition.result).toEqual(partitionOracle(s));
      for (const frame of partition.frames) {
        const view = dpGreedyView(frame);
        for (const part of view.segments) for (const ch of s.slice(part.start, part.end + 1)) expect(s.lastIndexOf(ch)).toBeLessThanOrEqual(part.end);
        expect(view.output).toEqual(view.segments.map((p) => p.end - p.start + 1));
      }
    }
  });
  it('compares Pascal with binomial coefficients and house choices with all nonadjacent subsets', () => {
    for (let trial = 0; trial < 120; trial++) {
      const numRows = rand(11), triangle = runProblem('pascals-triangle', { numRows });
      expect(triangle.result).toEqual(Array.from({ length: numRows }, (_, r) => Array.from({ length: r + 1 }, (_, c) => choose(r, c))));
      for (const [index, frame] of triangle.frames.entries()) {
        const cells = dpGreedyView(frame).cells;
        expect(cells.filter((c) => c.value !== null).length).toBe(Math.min(index, numRows * (numRows + 1) / 2));
      }
      const nums = Array.from({ length: rand(11) }, () => rand(101)); let best = 0;
      for (let mask = 0; mask < 2 ** nums.length; mask++) if (!(mask & (mask << 1))) best = Math.max(best, sum(selected(nums, mask)));
      const house = runProblem('house-robber', { nums }); expect(house.result).toBe(best);
      for (const frame of house.frames) {
        const view = dpGreedyView(frame), ids = view.witness;
        expect(ids.every((id, i) => !i || id > ids[i - 1] + 1)).toBe(true);
        if (frame.location === 'choose') expect(sum(ids.map((i) => nums[i]))).toBe(view.cells.find((c) => c.id === view.active)!.value);
      }
    }
  });
  it('compares squares with BFS over sums and word breaks with concatenated dictionary prefixes', () => {
    for (let trial = 0; trial < 120; trial++) {
      const n = trial % 41, square = runProblem('perfect-squares', { n }); expect(square.result).toBe(squareOracle(n));
      const last = square.frames.at(-1)!, chosen = dpGreedyView(last).witness;
      expect(chosen.length).toBe(square.result); expect(sum(chosen.map((i) => Number(last.values[i])))).toBe(n);
      const s = Array.from({ length: rand(9) }, () => 'abc'[rand(3)]).join('');
      const wordDict = [...new Set(Array.from({ length: rand(9) }, () => Array.from({ length: 1 + rand(3) }, () => 'abc'[rand(3)]).join('')))];
      const words = runProblem('word-break', { s, wordDict }); expect(words.result).toBe(wordOracle(s, wordDict));
      for (const frame of words.frames) {
        const segments = dpGreedyView(frame).segments;
        segments.forEach((segment, i) => {
          expect(segment.start).toBe(i ? segments[i - 1].end + 1 : 0);
          expect(wordDict).toContain(s.slice(segment.start, segment.end + 1));
        });
      }
      const segments = dpGreedyView(words.frames.at(-1)!).segments;
      if (words.result) expect(segments.map((p) => s.slice(p.start, p.end + 1)).join('')).toBe(s);
      else expect(segments).toEqual([]);
    }
  });
  it('compares products with all intervals and equal subsets with bit-mask enumeration', () => {
    for (let trial = 0; trial < 120; trial++) {
      const nums = Array.from({ length: 1 + rand(12) }, () => rand(11) - 5); let best = -Infinity;
      for (let start = 0; start < nums.length; start++) { let product = 1; for (let end = start; end < nums.length; end++) { product *= nums[end]; best = Math.max(best, product); } }
      const product = runProblem('maximum-product-subarray', { nums }); expect(product.result).toBe(best === 0 ? 0 : best);
      const witness = dpGreedyView(product.frames.at(-1)!).witness;
      expect(witness.length).toBeGreaterThan(0); expect(witness.every((id, i) => !i || id === witness[i - 1] + 1)).toBe(true);
      expect(witness.reduce((p, i) => p * nums[i], 1) || 0).toBe(product.result);
      for (const frame of product.frames.filter((f) => f.location === 'transition')) {
        const { i, beforeHigh, beforeLow, high, low } = frame.variables as Record<string, number>;
        const candidates = [nums[i], beforeHigh * nums[i], beforeLow * nums[i]];
        expect(high).toBe(Math.max(...candidates) || 0); expect(low).toBe(Math.min(...candidates) || 0);
        expect(dpGreedyView(frame).deps.filter((d) => d.chosen).length).toBe(2);
      }
      const items = Array.from({ length: 1 + rand(10) }, () => 1 + rand(6)), total = sum(items); let possible = false;
      for (let mask = 0; mask < 2 ** items.length; mask++) if (sum(selected(items, mask)) * 2 === total) possible = true;
      const partition = runProblem('partition-equal-subset-sum', { nums: items }); expect(partition.result).toBe(possible);
      for (const frame of partition.frames.filter((f) => f.location === 'update')) {
        const view = dpGreedyView(frame); expect(view.deps[0].epoch).toBeLessThan(view.round);
        expect(view.cells.find((c) => c.id === view.active)!.epoch).toBe(view.round);
      }
      const view = dpGreedyView(partition.frames.at(-1)!);
      if (possible) {
        expect([...view.witness, ...view.otherWitness].sort((a, b) => a - b)).toEqual(items.map((_, i) => i));
        expect(sum(view.witness.map((i) => items[i]))).toBe(sum(view.otherWitness.map((i) => items[i])));
      } else { expect(view.witness).toEqual([]); expect(view.otherWitness).toEqual([]); }
    }
  });
  it('compares grid counts with combinations and costs with all monotone paths, allowing tied optimal paths', () => {
    for (let trial = 0; trial < 120; trial++) {
      const m = 1 + rand(6), n = 1 + rand(6), paths = runProblem('unique-paths', { m, n });
      expect(paths.result).toBe(choose(m + n - 2, m - 1));
      for (const frame of paths.frames) expect(dpGreedyView(frame).witness).toEqual([]);
      const rows = 1 + rand(4), cols = 1 + rand(4), grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => rand(8)));
      const cost = runProblem('minimum-path-sum', { grid }); expect(cost.result).toBe(gridOracle(grid));
      for (const frame of cost.frames) {
        const view = dpGreedyView(frame); if (!view.witness.length) continue;
        expect(view.witness[0]).toBe(0);
        view.witness.slice(1).forEach((node, i) => { const prior = view.witness[i]; expect(node === prior + cols || (node === prior + 1 && Math.floor(node / cols) === Math.floor(prior / cols))).toBe(true); });
        expect(sum(view.witness.map((i) => grid.flat()[i]))).toBe(view.cells.find((c) => c.id === view.active)!.value);
      }
      expect(dpGreedyView(cost.frames.at(-1)!).witness.at(-1)).toBe(rows * cols - 1);
    }
  });
});

describe('bounded contracts and capacity', () => {
  for (const nums of [[24,0,0], [1,24,0,0], [24], [0,1]]) it(`clips greedy frontier bands for ${nums}`, () => {
    const trace = runProblem('jump-game-ii', { nums });
    for (const frame of trace.frames) for (const range of dpGreedyView(frame).ranges) {
      expect(range.start).toBeGreaterThanOrEqual(0);
      expect(range.end).toBeLessThan(nums.length);
      expect(range.start).toBeLessThanOrEqual(range.end);
    }
    expect(dpGreedyView(trace.frames.at(-1)!).ranges.some((r) => r.label === '下一跳候选')).toBe(false);
    expect(trace.result).toBe(jumpOracle(nums));
  });
  it('does not label a valid negative product as an unreachable jump', () => {
    const product = runProblem('maximum-product-subarray', { nums: [-1] });
    const jump = runProblem('jump-game-ii', { nums: [0,1] });
    expect(describeFrame(product.problemId, product.frames.at(-1)!).tone).toBe('success');
    expect(describeFrame(jump.problemId, jump.frames.at(-1)!).tone).toBe('blocked');
  });
  for (const [id, input] of dpGreedyMaximums) it(`accepts upper bound ${id}`, () => assertFrames(runProblem(id, input)));
  const invalid: [DPGreedyId, unknown][] = [
    ['jump-game-ii', { nums: [] }], ['jump-game-ii', { nums: [-1] }], ['jump-game-ii', { nums: Array(25).fill(1) }],
    ['partition-labels', { s: 'A' }], ['partition-labels', { s: 'a'.repeat(25) }],
    ['pascals-triangle', { numRows: 11 }], ['pascals-triangle', { numRows: -1 }], ['pascals-triangle', { numRows: 1.5 }],
    ['house-robber', { nums: [-1] }], ['house-robber', { nums: Array(17).fill(0) }],
    ['perfect-squares', { n: 41 }], ['perfect-squares', { n: -1 }],
    ['word-break', { s: 'a', wordDict: [''] }], ['word-break', { s: 'a', wordDict: ['a','a'] }], ['word-break', { s: 'a'.repeat(15), wordDict: [] }],
    ['maximum-product-subarray', { nums: [] }], ['maximum-product-subarray', { nums: [6] }], ['maximum-product-subarray', { nums: Array(13).fill(1) }],
    ['partition-equal-subset-sum', { nums: [] }], ['partition-equal-subset-sum', { nums: [0] }], ['partition-equal-subset-sum', { nums: [30,30,1] }],
    ['unique-paths', { m: 0, n: 1 }], ['unique-paths', { m: 1, n: 7 }],
    ['minimum-path-sum', { grid: [] }], ['minimum-path-sum', { grid: [[]] }], ['minimum-path-sum', { grid: [[1,2],[3]] }], ['minimum-path-sum', { grid: [[-1]] }],
  ];
  for (const [id, input] of invalid) it(`rejects ${id} ${JSON.stringify(input)}`, () => expect(() => runProblem(id, input)).toThrow('输入不符合要求'));
  for (const problem of dpGreedyProblems) it(`rejects unknown fields ${problem.id}`, () => expect(() => runProblem(problem.id, { ...problem.sample as object, extra: true })).toThrow('输入不符合要求'));
});
