import { describe, expect, it } from 'vitest';
import { runProblem } from '../src/engine/run';
import { arrayTransformView } from '../src/engine/presets/array-transform';
import type { ProblemId } from '../src/engine/types';

// Authored during incremental implementation; execution is deferred to final acceptance.
const lex = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};
function permutations(values: number[]): number[][] {
  if (!values.length) return [[]];
  return values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index)).map((tail) => [value, ...tail]));
}
function connectedIntervals(intervals: number[][]): number[][] {
  const seen = new Set<number>(), result: number[][] = [];
  for (let i = 0; i < intervals.length; i++) {
    if (seen.has(i)) continue;
    seen.add(i); const queue = [i];
    for (let head = 0; head < queue.length; head++) {
      const [start, end] = intervals[queue[head]];
      for (let j = 0; j < intervals.length; j++) if (!seen.has(j) && intervals[j][0] <= end && start <= intervals[j][1]) { seen.add(j); queue.push(j); }
    }
    result.push([Math.min(...queue.map((j) => intervals[j][0])), Math.max(...queue.map((j) => intervals[j][1]))]);
  }
  return result.sort(lex);
}

describe('array transformations and interval merging', () => {
  it.each([
    ['3sum', { nums: Array(17).fill(0) }],
    ['sort-colors', { nums: [0, 3] }],
    ['sort-colors', { nums: [-1] }],
    ['sort-colors', { nums: [1.5] }],
    ['rotate-array', { nums: [1, 2], k: -1 }],
    ['rotate-array', { nums: [1], k: 1000000001 }],
    ['rotate-array', { nums: [1], k: 0.5 }],
    ['next-permutation', { nums: Array(25).fill(0) }],
    ['next-permutation', { nums: ['1'] }],
    ['merge-intervals', { intervals: [[2, 1]] }],
    ['merge-intervals', { intervals: [[1]] }],
    ['merge-intervals', { intervals: [[0, 1, 2]] }],
    ['merge-intervals', { intervals: [[-101, 2]] }],
    ['merge-intervals', { intervals: Array(13).fill([0, 1]) }],
    ['merge-intervals', { intervals: [], extra: true }],
  ] as [ProblemId, unknown][])('rejects invalid %s: %j', (id, input) => {
    expect(() => runProblem(id, input)).toThrow('输入不符合要求');
  });

  it('compares 120 seeded examples per algorithm against independent enumeration and connected components', () => {
    let seed = 1575189;
    const random = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
    for (let trial = 0; trial < 120; trial++) {
      const nums = Array.from({ length: random(13) }, () => random(17) - 8);
      const triples = new Map<string, number[]>();
      for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) for (let k = j + 1; k < nums.length; k++) {
        if (nums[i] + nums[j] + nums[k] === 0) { const triple = [nums[i], nums[j], nums[k]].sort((a, b) => a - b); triples.set(JSON.stringify(triple), triple); }
      }
      expect(runProblem('3sum', { nums }).result).toEqual([...triples.values()].sort(lex));
      const colors = nums.map((value) => Math.abs(value) % 3);
      expect(runProblem('sort-colors', { nums: colors }).result).toEqual([...colors].sort((a, b) => a - b));
      const k = random(100), shifted = Array(nums.length).fill(0);
      nums.forEach((value, i) => { shifted[(i + k) % nums.length] = value; });
      expect(runProblem('rotate-array', { nums, k }).result).toEqual(shifted);
      const permutation = Array.from({ length: random(7) }, () => random(5) - 2);
      const possibilities = [...new Map(permutations(permutation).map((p) => [JSON.stringify(p), p])).values()].sort(lex);
      const current = possibilities.findIndex((p) => JSON.stringify(p) === JSON.stringify(permutation));
      expect(runProblem('next-permutation', { nums: permutation }).result).toEqual(possibilities[(current + 1) % possibilities.length]);
      const intervals = Array.from({ length: random(13) }, () => { const start = random(21) - 10; return [start, start + random(6)]; });
      expect(runProblem('merge-intervals', { intervals }).result).toEqual(connectedIntervals(intervals));
    }
  });

  it('preserves identities throughout sorting, reversal and duplicate swaps', () => {
    for (const [id, input] of [
      ['3sum', { nums: [-1, 0, 1, 2, -1, -4] }],
      ['sort-colors', { nums: [2, 0, 2, 1, 1, 0] }],
      ['rotate-array', { nums: [1, 1, 2, 2], k: 2 }],
      ['next-permutation', { nums: [1, 3, 3, 2] }],
    ] as [ProblemId, { nums: number[]; k?: number }][]) {
      const original = structuredClone(input), trace = runProblem(id, input);
      for (const frame of trace.frames) {
        expect(new Set(frame.elementIds).size).toBe(input.nums.length);
        frame.elementIds!.forEach((identity, index) => expect(frame.values[index]).toBe(input.nums[identity]));
      }
      expect(input).toEqual(original);
    }
  });

  it('keeps the color partition invariant at every snapshot and rechecks the swapped-in value', () => {
    const trace = runProblem('sort-colors', { nums: [1, 2, 0] });
    for (const frame of trace.frames) {
      const { low, mid, high } = frame.variables as { low: number; mid: number; high: number };
      expect(frame.values.slice(0, low).every((v) => v === 0)).toBe(true);
      expect(frame.values.slice(low, mid).every((v) => v === 1)).toBe(true);
      expect(frame.values.slice(high + 1).every((v) => v === 2)).toBe(true);
    }
    const placed = trace.frames.findIndex((f) => f.location === 'place-two');
    expect(trace.frames[placed + 1].location).toBe('check');
    expect(trace.frames[placed + 1].pointers.mid).toBe(trace.frames[placed].pointers.mid);
  });

  it('stores only discovered triplets, without duplicates or later-state mutation', () => {
    const trace = runProblem('3sum', { nums: [-2, 0, 0, 2, 2] });
    let count = 0;
    for (const frame of trace.frames) {
      if (frame.location === 'collect') count++;
      const groups = arrayTransformView(frame).triplets!;
      expect(groups).toHaveLength(count);
      expect(new Set(groups.map((group) => JSON.stringify(group))).size).toBe(count);
      for (const group of groups) expect(group.reduce((a, b) => a + b, 0)).toBe(0);
    }
  });

  it('tracks interval origins and never shortens a containing output interval', () => {
    const trace = runProblem('merge-intervals', { intervals: [[2, 3], [1, 10], [10, 12], [20, 20]] });
    for (const frame of trace.frames) {
      const view = arrayTransformView(frame);
      expect(view.items!.map((item) => item.id)).toEqual(frame.elementIds);
      const members = view.merged!.flatMap((item) => item.members);
      expect(new Set(members).size).toBe(members.length);
      for (const output of view.merged!) {
        const sources = view.items!.filter((item) => output.members.includes(item.id));
        expect(output.start).toBe(Math.min(...sources.map((item) => item.start)));
        expect(output.end).toBe(Math.max(...sources.map((item) => item.end)));
      }
    }
    expect(trace.result).toEqual([[1, 12], [20, 20]]);
  });
});
