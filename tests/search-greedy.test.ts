import { describe, expect, it } from 'vitest';
import { problems } from '../src/engine/catalog';
import { runProblem } from '../src/engine/run';
import { searchGreedySchemas } from '../src/engine/presets/search-greedy';
import { describeFrame } from '../src/engine/presentation';
import { problemIds, type ProblemId } from '../src/engine/types';

describe('Hot 100 search/greedy batch', () => {
  it('keeps the catalog and IDs complete and unique', () => {
    expect(problems).toHaveLength(problemIds.length);
    expect(Object.keys(searchGreedySchemas).every((id) => problems.some((p) => p.id === id))).toBe(true);
    expect(new Set(problems.map((p) => p.number)).size).toBe(problems.length);
    expect(problems.map((p) => p.id).sort()).toEqual([...problemIds].sort());
  });

  it.each([
    ['search-insert-position', { nums: [1, 1], target: 1 }],
    ['search-insert-position', { nums: [2, 1], target: 1 }],
    ['find-first-and-last-position-of-element-in-sorted-array', { nums: [2, 1], target: 1 }],
    ['search-in-rotated-sorted-array', { nums: [2, 1, 3], target: 1 }],
    ['search-in-rotated-sorted-array', { nums: [3, 2, 1], target: 1 }],
    ['search-in-rotated-sorted-array', { nums: [1, 1], target: 1 }],
    ['best-time-to-buy-and-sell-stock', { prices: [-1, 2] }],
    ['best-time-to-buy-and-sell-stock', { prices: [10001] }],
    ['jump-game', { nums: [] }],
    ['jump-game', { nums: [0, -1] }],
    ['jump-game', { nums: [1.5] }],
    ['jump-game', { nums: [1], surprise: true }],
    ['search-insert-position', { nums: Array.from({ length: 25 }, (_, i) => i), target: 1 }],
  ] as [ProblemId, unknown][])('rejects invalid %s: %j', (id, input) => {
    expect(() => runProblem(id, input)).toThrow('输入不符合要求');
  });

  it('differential-checks 200 seeded inputs per problem with linear scans, pair enumeration and reachability DP', () => {
    let seed = 552233;
    const random = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
    for (let attempt = 0; attempt < 200; attempt++) {
      const sorted = Array.from({ length: random(25) }, () => random(25) - 12).sort((a, b) => a - b);
      const unique = [...new Set(sorted)], target = random(31) - 15;
      expect(runProblem('search-insert-position', { nums: unique, target }).result).toBe(unique.filter((v) => v < target).length);
      expect(runProblem('find-first-and-last-position-of-element-in-sorted-array', { nums: sorted, target }).result).toEqual([sorted.indexOf(target), sorted.lastIndexOf(target)]);
      const pivot = random(unique.length + 1), rotated = [...unique.slice(pivot), ...unique.slice(0, pivot)];
      expect(runProblem('search-in-rotated-sorted-array', { nums: rotated, target }).result).toBe(rotated.indexOf(target));
      const prices = sorted.map(() => random(100));
      let profit = 0;
      for (let buy = 0; buy < prices.length; buy++) for (let sell = buy + 1; sell < prices.length; sell++) profit = Math.max(profit, prices[sell] - prices[buy]);
      const stock = runProblem('best-time-to-buy-and-sell-stock', { prices });
      expect(stock.result).toBe(profit);
      if (profit) {
        const [buy, sell] = stock.frames.at(-1)!.bestPath!;
        expect(buy).toBeLessThan(sell); expect(prices[sell] - prices[buy]).toBe(profit);
      } else expect(stock.frames.at(-1)!.bestPath ?? []).toEqual([]);
      const nums = Array.from({ length: random(24) + 1 }, () => random(5));
      const reachable = nums.map(() => false); reachable[0] = true;
      for (let i = 0; i < nums.length; i++) if (reachable[i]) for (let j = i + 1; j < nums.length && j <= i + nums[i]; j++) reachable[j] = true;
      expect(runProblem('jump-game', { nums }).result).toBe(reachable.at(-1));
    }
  });

  it('keeps both boundary-search passes truthful and never loses a boundary candidate', () => {
    for (const nums of [[], [1], [2, 2, 2], [0, 1, 1, 2, 4, 4, 9]]) for (const target of [-1, 0, 1, 2, 4, 10]) {
      const trace = runProblem('find-first-and-last-position-of-element-in-sorted-array', { nums, target });
      for (const frame of trace.frames.filter((f) => f.location !== 'return' && f.location !== 'not-found')) {
        const { left, right, phase } = frame.variables as { left: number; right: number; phase: string };
        const answer = nums.filter((v) => phase === '首个 > target' ? v <= target : v < target).length;
        expect(left).toBeLessThanOrEqual(answer); expect(right).toBeGreaterThanOrEqual(answer);
        expect(frame.window).toEqual([left, right - 1]);
      }
    }
  });

  it('accepts every rotation, rejects non-rotations and preserves the target within each shrinking range', () => {
    const nums = [-9, -2, 0, 5, 8];
    for (let pivot = 0; pivot < nums.length; pivot++) for (const target of [...nums, 10]) {
      const rotated = [...nums.slice(pivot), ...nums.slice(0, pivot)];
      const trace = runProblem('search-in-rotated-sorted-array', { nums: rotated, target });
      const found = rotated.indexOf(target);
      expect(trace.result).toBe(found);
      if (found >= 0) for (const frame of trace.frames) {
        expect(frame.window![0]).toBeLessThanOrEqual(found); expect(frame.window![1]).toBeGreaterThanOrEqual(found);
      }
    }
  });

  it('never uses an unreachable jump and clips only the picture, not the computed reach', () => {
    const blocked = runProblem('jump-game', { nums: [0, 10000] });
    expect(blocked.frames.filter((f) => f.location === 'extend').map((f) => f.variables.i)).toEqual([0]);
    const huge = runProblem('jump-game', { nums: [10000, 0] });
    expect(huge.frames.at(-1)!.variables.farthest).toBe(10000);
    expect(huge.frames.at(-1)!.window).toEqual([0, 1]);
  });

  it('keeps teaching cues and references finite, bounded and independent of playback direction', () => {
    for (const p of problems.filter((p) => p.id in searchGreedySchemas)) {
      const trace = runProblem(p.id, p.sample);
      const cues = trace.frames.map((frame, i) => describeFrame(p.id, frame, trace.frames[i - 1]));
      for (let i = trace.frames.length - 1; i >= 0; i--) {
        const cue = describeFrame(p.id, trace.frames[i], trace.frames[i - 1]);
        expect(cue).toEqual(cues[i]);
        expect(JSON.stringify(cue)).not.toMatch(/NaN|undefined/);
        for (const index of [...cue.relation?.from ?? [], ...cue.outside ?? [], ...(cue.relation ? [cue.relation.to] : [])]) {
          expect(index).toBeGreaterThanOrEqual(0); expect(index).toBeLessThan(trace.frames[i].values.length);
        }
      }
    }
  });
});
