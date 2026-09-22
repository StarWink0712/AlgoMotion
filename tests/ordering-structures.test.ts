import { describe, expect, it } from 'vitest';
import { runProblem } from '../src/engine/run';
import { describeFrame } from '../src/engine/presentation';
import { orderingView } from '../src/engine/presets/ordering';
import { structuresView } from '../src/engine/presets/structures';
import { orderingStructuresProblems } from '../src/engine/presets/ordering-structures-catalog';
import { codeLanguages, type ProblemId, type Frame } from '../src/engine/types';
import { orderingStructuresCases } from './ordering-structures-cases';

// Authored for deferred batch acceptance; no code here is claimed to have run yet.
const numericSort = (a: number[]) => [...a].sort((x, y) => x - y);
const median = (a: number[]) => { const s = numericSort(a); return (s[Math.floor((s.length - 1) / 2)] + s[Math.floor(s.length / 2)]) / 2; };
let seed = 901;
const rand = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
function checkHeapOrder(frame: Frame, frequency: boolean) {
  const view = structuresView(frame);
  for (const heap of view.heaps) heap.ids.slice(1).forEach((id, i) => {
    const parent = heap.ids[Math.floor(i / 2)], a = view.priorities[parent], b = view.priorities[id];
    expect(heap.max ? a >= b : a <= b).toBe(true);
    if (frequency && a === b) expect(Number(frame.values[parent]) >= Number(frame.values[id])).toBe(true);
  });
}

describe('batch 9 samples, boundaries and immutable semantic frames', () => {
  for (const [id, input, expected] of orderingStructuresCases) it(`${id} ${JSON.stringify(input)}`, () => {
    const before = structuredClone(input), trace = runProblem(id, input), problem = orderingStructuresProblems.find((p) => p.id === id)!;
    expect(trace.result).toEqual(expected); expect(input).toEqual(before); expect(trace.frames.length).toBeLessThanOrEqual(1000);
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
    trace.frames.forEach((frame, i) => {
      expect(frame.step).toBe(i); expect(frame.result === undefined || i === trace.frames.length - 1).toBe(true);
      expect(describeFrame(id, frame).equation).not.toMatch(/NaN|undefined/);
      for (const lang of codeLanguages) expect(problem.code[lang].locations[frame.location]).toBeGreaterThan(0);
      for (const node of frame.active) expect(node >= 0 && node < frame.values.length).toBe(true);
      if (frame.elementIds) expect([...frame.elementIds].sort((a, b) => a - b)).toEqual(frame.values.map((_, i) => i));
    });
    for (const lang of codeLanguages) expect(Object.keys(problem.code[lang].locations).sort()).toEqual(Object.keys(problem.code.java.locations).sort());
    const first = structuredClone(trace.frames[0]); trace.frames.at(-1)!.values.push('changed'); expect(trace.frames[0]).toEqual(first);
  });
});

describe('120 independent comparisons per ordering algorithm', () => {
  it('checks set membership, coordinate rotation, linear membership, minimum and sorted union', () => {
    for (let trial = 0; trial < 120; trial++) {
      const nums = Array.from({ length: rand(25) }, () => rand(31) - 10), seen = new Set(nums); let missing = 1; while (seen.has(missing)) missing++;
      const missingTrace = runProblem('first-missing-positive', { nums }); expect(missingTrace.result).toBe(missing);
      for (const frame of missingTrace.frames) expect(frame.values).toEqual(frame.elementIds!.map((i) => nums[i]));
      expect(numericSort(missingTrace.frames.at(-1)!.values as number[])).toEqual(numericSort(nums));
      const n = trial % 7, matrix = Array.from({ length: n }, () => Array.from({ length: n }, () => rand(7) - 3));
      const rotate = runProblem('rotate-image', { matrix }), expected = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => matrix[n - 1 - c][r]));
      expect(rotate.result).toEqual(expected);
      expect(rotate.frames.at(-1)!.elementIds).toEqual(Array.from({ length: n * n }, (_, index) => (n - 1 - index % n) * n + Math.floor(index / n)));
      for (const frame of rotate.frames) expect(frame.values).toEqual(frame.elementIds!.map((i) => matrix.flat()[i]));
      const rows = rand(7), cols = 1 + rand(6), sortedMatrix = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (r * cols + c) * 2 - 20)), target = rand(81) - 30;
      const search = runProblem('search-a-2d-matrix', { matrix: sortedMatrix, target }); expect(search.result).toBe(sortedMatrix.flat().includes(target));
      for (const frame of search.frames) if (sortedMatrix.flat().includes(target)) expect(orderingView(frame).allowed.some((i) => frame.values[i] === target)).toBe(true);
      const rowColSorted = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => r * 2 + c - 7));
      const staircase = runProblem('search-a-2d-matrix-ii', { matrix: rowColSorted, target }); expect(staircase.result).toBe(rowColSorted.flat().includes(target));
      for (const frame of staircase.frames) if (rowColSorted.flat().includes(target)) expect(orderingView(frame).allowed.some((i) => frame.values[i] === target)).toBe(true);
      const increasing = Array.from({ length: 1 + rand(24) }, (_, i) => i * 3 - 32), cut = rand(increasing.length), rotated = [...increasing.slice(cut), ...increasing.slice(0, cut)];
      const minimum = runProblem('find-minimum-in-rotated-sorted-array', { nums: rotated }); expect(minimum.result).toBe(Math.min(...rotated));
      for (const frame of minimum.frames) expect(rotated.slice(frame.window![0], frame.window![1] + 1)).toContain(Math.min(...rotated));
      const all = Array.from({ length: 1 + rand(24) }, () => rand(21) - 10), split = rand(all.length + 1), a = numericSort(all.slice(0, split)), b = numericSort(all.slice(split));
      const halves = runProblem('median-of-two-sorted-arrays', { a, b }); expect(halves.result).toBe(median(all));
      for (const frame of halves.frames) {
        const view = orderingView(frame); if (!view.cuts) continue;
        expect(view.cuts[0] + view.cuts[1]).toBe(Math.floor((all.length + 1) / 2));
        view.cuts.forEach((c, i) => expect(c >= 0 && c <= view.lanes![i].values.length).toBe(true));
        if (view.medianIds) expect(view.medianIds.every((id) => id >= 0 && id < all.length)).toBe(true);
      }
    }
  });
});

describe('120 independent comparisons per data structure', () => {
  it('compares heaps with full sorting and counts, including duplicate ranks and deterministic ties', () => {
    for (let trial = 0; trial < 120; trial++) {
      const nums = Array.from({ length: 1 + rand(24) }, () => rand(13) - 6), k = 1 + rand(nums.length);
      const kth = runProblem('kth-largest-element-in-an-array', { nums, k }); expect(kth.result).toBe(numericSort(nums).reverse()[k - 1]);
      for (const frame of kth.frames) {
        const view = structuresView(frame);
        expect(frame.values).toEqual(nums.slice(0, view.cursor + 1));
        if (frame.location === 'heap-ready') checkHeapOrder(frame, false);
        if (frame.location === 'discard' || frame.result !== undefined) {
          const kept = view.heaps[0].ids.map((id) => Number(frame.values[id])); expect(numericSort(kept)).toEqual(numericSort(nums.slice(0, view.cursor + 1)).slice(-k));
        }
      }
      const unique = [...new Set(nums)], count = (v: number) => nums.filter((x) => x === v).length, topK = 1 + rand(unique.length);
      const expected = unique.sort((a, b) => count(b) - count(a) || a - b).slice(0, topK), top = runProblem('top-k-frequent-elements', { nums, k: topK }); expect(top.result).toEqual(expected);
      for (const frame of top.frames) {
        const view = structuresView(frame);
        if (frame.location === 'heap-ready') checkHeapOrder(frame, true);
        if (frame.location === 'count') for (const c of view.counts) expect(c.count).toBe(nums.slice(0, view.cursor + 1).filter((v) => v === c.value).length);
        expect(new Set(view.heaps.flatMap((h) => h.ids)).size).toBe(view.heaps.reduce((n, h) => n + h.ids.length, 0));
      }
    }
  });
  it('compares stream medians with sorting after each prefix and checks both heap invariants', () => {
    for (let trial = 0; trial < 120; trial++) {
      const values = Array.from({ length: 1 + rand(12) }, () => rand(21) - 10), operations = values.flatMap((value) => [{ op: 'addNum', value }, { op: 'findMedian' }]);
      const trace = runProblem('find-median-from-data-stream', { operations }); expect(trace.result).toEqual(values.flatMap((_, i) => [null, median(values.slice(0, i + 1))]));
      for (const frame of trace.frames) {
        const view = structuresView(frame);
        if (frame.location === 'heap-ready') checkHeapOrder(frame, false);
        if (frame.location === 'added' || frame.location === 'median' || frame.result !== undefined) {
          const [lower, upper] = view.heaps.map((h) => h.ids.map((id) => Number(frame.values[id])));
          expect(lower.length === upper.length || lower.length === upper.length + 1).toBe(true);
          expect(lower.every((a) => upper.every((b) => a <= b))).toBe(true);
          expect(numericSort([...lower, ...upper])).toEqual(numericSort(values.slice(0, view.cursor + 1)));
        }
        if (view.median) expect(view.median.value).toBe(median(values.slice(0, view.cursor + 1)));
      }
    }
  });
  it('compares trie operations against a set and checks exact prefix allocation without query mutation', () => {
    for (let trial = 0; trial < 120; trial++) {
      const operations = Array.from({ length: 12 }, (_, i) => ({ op: ['insert', 'search', 'startsWith'][i % 3], word: Array.from({ length: rand(6) }, () => 'abc'[rand(3)]).join('') }));
      const words = new Set<string>(), expected = operations.map((op) => { if (op.op === 'insert') { words.add(op.word); return null; } return op.op === 'search' ? words.has(op.word) : op.word === '' || [...words].some((w) => w.startsWith(op.word)); });
      const trace = runProblem('implement-trie-prefix-tree', { operations }); expect(trace.result).toEqual(expected);
      const end = structuresView(trace.frames.at(-1)!), prefixes = new Set(['']); for (const w of words) for (let i = 1; i <= w.length; i++) prefixes.add(w.slice(0, i));
      expect(end.nodes.map((n) => n.prefix).sort()).toEqual([...prefixes].sort());
      expect(end.nodes.filter((n) => n.terminal).map((n) => n.prefix).sort()).toEqual([...words].sort());
      let nodes = 1;
      for (const frame of trace.frames) { if (frame.location === 'create') nodes++; expect(frame.values.length).toBe(nodes); const view = structuresView(frame); expect(view.nodes.length).toBe(nodes); expect(frame.links!.length).toBe(nodes - 1); }
    }
  });
});

describe('limits and invalid ordering contracts', () => {
  const maximums: [ProblemId, unknown][] = [
    ['first-missing-positive', { nums: Array.from({ length: 24 }, (_, i) => 24 - i) }], ['rotate-image', { matrix: Array.from({ length: 6 }, () => Array(6).fill(1)) }],
    ['kth-largest-element-in-an-array', { nums: Array.from({ length: 24 }, (_, i) => 24 - i), k: 12 }],
    ['top-k-frequent-elements', { nums: Array.from({ length: 24 }, (_, i) => i), k: 24 }],
    ['find-median-from-data-stream', { operations: [...Array.from({ length: 16 }, (_, i) => ({ op: 'addNum', value: i % 2 ? i : -i })), ...Array.from({ length: 8 }, () => ({ op: 'findMedian' }))] }],
    ['implement-trie-prefix-tree', { operations: ['abcde','fghij','klmno','pqrst','uvwx'].map((word) => ({ op: 'insert', word })) }],
  ];
  for (const [id, input] of maximums) it(`${id} maximum visualization case is complete and bounded`, () => expect(runProblem(id, input).frames.length).toBeLessThanOrEqual(1000));
  const invalid: [ProblemId, unknown][] = [
    ['first-missing-positive', { nums: Array(25).fill(1) }], ['first-missing-positive', { nums: [1.2] }], ['rotate-image', { matrix: [[1,2,3],[4,5,6]] }],
    ['rotate-image', { matrix: [[]] }], ['search-a-2d-matrix', { matrix: [[1,4],[2,5]], target: 3 }], ['search-a-2d-matrix', { matrix: [[1,1]], target: 1 }],
    ['search-a-2d-matrix-ii', { matrix: [[1,4],[0,5]], target: 0 }], ['search-a-2d-matrix-ii', { matrix: [[2,1]], target: 0 }],
    ['find-minimum-in-rotated-sorted-array', { nums: [] }], ['find-minimum-in-rotated-sorted-array', { nums: [1,1] }], ['find-minimum-in-rotated-sorted-array', { nums: [2,1,3] }],
    ['median-of-two-sorted-arrays', { a: [], b: [] }], ['median-of-two-sorted-arrays', { a: [2,1], b: [3] }], ['median-of-two-sorted-arrays', { a: Array(13).fill(1), b: Array(12).fill(1) }],
    ['kth-largest-element-in-an-array', { nums: [1], k: 2 }], ['top-k-frequent-elements', { nums: [1,1], k: 2 }], ['top-k-frequent-elements', { nums: [], k: 1 }],
    ['find-median-from-data-stream', { operations: [{ op: 'findMedian' }] }], ['find-median-from-data-stream', { operations: Array(17).fill({ op: 'addNum', value: 1 }) }],
    ['find-median-from-data-stream', { operations: [{ op: 'addNum', value: 1 }, { op: 'findMedian', value: 1 }] }],
    ['implement-trie-prefix-tree', { operations: [{ op: 'insert', word: 'Hello' }] }], ['implement-trie-prefix-tree', { operations: Array(5).fill({ op: 'insert', word: 'abcde' }) }],
    ['implement-trie-prefix-tree', { operations: [{ op: 'delete', word: 'a' }] }],
  ];
  for (const [id, input] of invalid) it(`rejects ${id} ${JSON.stringify(input)}`, () => expect(() => runProblem(id, input)).toThrow());
});
