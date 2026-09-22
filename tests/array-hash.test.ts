import { describe, expect, it } from 'vitest';
import { runProblem } from '../src/engine/run';
import { arrayHashView } from '../src/engine/presets/array-hash';
import type { ProblemId } from '../src/engine/types';

// Authored with batch 2; execution is deferred to the final consolidated validation.
describe('array/hash presets', () => {
  it.each([
    ['group-anagrams', { strs: ['A'] }],
    ['group-anagrams', { strs: ['你好'] }],
    ['group-anagrams', { strs: ['abcdefghi'] }],
    ['group-anagrams', { strs: Array(13).fill('a') }],
    ['group-anagrams', { strs: [1] }],
    ['longest-consecutive-sequence', { nums: [10001] }],
    ['longest-consecutive-sequence', { nums: Array(25).fill(1) }],
    ['product-of-array-except-self', { nums: [6] }],
    ['product-of-array-except-self', { nums: Array(13).fill(1) }],
    ['product-of-array-except-self', { nums: [1.5] }],
    ['subarray-sum-equals-k', { nums: [1], k: '1' }],
    ['subarray-sum-equals-k', { nums: [], k: 0, script: 'untrusted' }],
  ] as [ProblemId, unknown][])('rejects invalid %s: %j', (id, input) => {
    expect(() => runProblem(id, input)).toThrow('输入不符合要求');
  });

  it('differential-checks seeded inputs with independent frequency grouping, sorting, multiplication and interval enumeration', () => {
    let seed = 49560;
    const random = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
    for (let trial = 0; trial < 200; trial++) {
      const strs = Array.from({ length: random(13) }, () => Array.from({ length: random(9) }, () => 'abc'[random(3)]).join(''));
      const groups = new Map<string, string[]>();
      for (const word of strs) {
        const signature = [...'abc'].map((c) => [...word].filter((v) => v === c).length).join(':');
        groups.set(signature, [...groups.get(signature) ?? [], word]);
      }
      expect(runProblem('group-anagrams', { strs }).result).toEqual([...groups.values()]);
      const nums = Array.from({ length: random(25) }, () => random(31) - 15);
      const sorted = [...new Set(nums)].sort((a, b) => a - b);
      let streak = 0, best = 0;
      sorted.forEach((v, i) => { streak = i && v === sorted[i - 1] + 1 ? streak + 1 : 1; best = Math.max(best, streak); });
      expect(runProblem('longest-consecutive-sequence', { nums }).result).toBe(best);
      const factors = Array.from({ length: random(13) }, () => random(11) - 5);
      const expected = factors.map((_, skip) => factors.filter((_, i) => i !== skip).reduce((a, b) => a * b, 1) || 0);
      expect(runProblem('product-of-array-except-self', { nums: factors }).result).toEqual(expected);
      const k = random(9) - 4;
      let count = 0;
      for (let left = 0; left < nums.length; left++) for (let right = left; right < nums.length; right++) if (nums.slice(left, right + 1).reduce((a, b) => a + b, 0) === k) count++;
      expect(runProblem('subarray-sum-equals-k', { nums, k }).result).toBe(count);
    }
  });

  it('moves each duplicate or empty word into exactly one bucket without changing identity', () => {
    const strs = ['', 'ab', 'ba', '', 'ab'];
    const trace = runProblem('group-anagrams', { strs });
    let assigned = 0;
    for (const frame of trace.frames) {
      if (frame.location === 'assign') assigned++;
      const groups = arrayHashView(frame).groups!;
      const indices = groups.flatMap((group) => group.indices);
      expect(new Set(indices).size).toBe(assigned);
      expect(indices).toHaveLength(assigned);
      expect(frame.elementIds).toEqual(strs.map((_, i) => i));
      for (const group of groups) for (const index of group.indices) expect([...strs[index]].sort().join('')).toBe(group.key);
    }
  });

  it('uses set IDs for consecutive chains without requiring original input order', () => {
    const trace = runProblem('longest-consecutive-sequence', { nums: [4, 2, 1, 3, 3] });
    for (const frame of trace.frames) for (const path of [frame.path!, frame.bestPath!]) {
      for (let i = 1; i < path.length; i++) expect(Number(frame.values[path[i]]) - Number(frame.values[path[i - 1]])).toBe(1);
    }
    const final = trace.frames.at(-1)!;
    expect(final.path!.map((i) => final.values[i])).toEqual([1, 2, 3, 4]);
  });

  it('records left/right products excluding the current element, including zeros', () => {
    for (const nums of [[], [0], [-2, 3, -4], [0, 0, 2], Array(12).fill(5)]) {
      const trace = runProblem('product-of-array-except-self', { nums });
      for (const frame of trace.frames) {
        const { prefix, suffix } = arrayHashView(frame);
        prefix!.forEach((v, i) => { if (v !== null) expect(v).toBe(nums.slice(0, i).reduce((a, b) => a * b, 1) || 0); });
        suffix!.forEach((v, i) => { if (v !== null) expect(v).toBe(nums.slice(i + 1).reduce((a, b) => a * b, 1) || 0); });
        expect(JSON.parse(JSON.stringify(frame))).toEqual(frame);
      }
    }
  });

  it('matches only earlier prefix positions and counts repeated zero prefixes individually', () => {
    const nums = [0, 0, 0];
    const trace = runProblem('subarray-sum-equals-k', { nums, k: 0 });
    for (const frame of trace.frames.filter((f) => f.location === 'lookup')) {
      const i = Number(frame.variables.i), view = arrayHashView(frame);
      expect(view.matches).toEqual(Array.from({ length: i + 1 }, (_, j) => j));
      expect(frame.table).toEqual([['0', i + 1]]);
      for (const start of view.matches!) {
        expect(start).toBeLessThanOrEqual(i);
        expect(nums.slice(start, i + 1).reduce((a, b) => a + b, 0)).toBe(0);
      }
    }
    expect(trace.result).toBe(6);
    expect(trace.frames.at(-1)!.table).toEqual([['0', 4]]);
  });
});
