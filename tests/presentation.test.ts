import { describe, expect, it } from 'vitest';
import { problems } from '../src/engine/catalog';
import { runProblem } from '../src/engine/run';
import { describeFrame } from '../src/engine/presentation';
import { cases } from './reference-cases';

describe('teaching cues and motion metadata', () => {
  it.each(cases)('%s input %j has valid teaching relations', (id, input) => {
    const trace = runProblem(id, input);
    trace.frames.forEach((frame, i) => {
      const cue = describeFrame(id, frame, trace.frames[i - 1]);
      expect(cue.equation).not.toMatch(/NaN|undefined/);
      if (cue.relation) {
        expect(cue.relation.labels).toHaveLength(cue.relation.from.length);
        for (const index of [...cue.relation.from, cue.relation.to]) {
          expect(Number.isInteger(index)).toBe(true);
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(frame.values.length);
        }
      }
    });
  });

  it('LIS chains are genuine strictly increasing subsequences matching current DP length', () => {
    for (const nums of [[10, 9, 2, 5, 3, 7, 101, 18], [2, 2, 2], [-3, 4, -2, 0, 8], [], [4, 3, 2, 1], [1, 2, 3]]) {
      const trace = runProblem('longest-increasing-subsequence', { nums });
      trace.frames.forEach((frame) => {
        for (const chain of [frame.path!, frame.bestPath!]) chain.forEach((index, i) => {
          if (i) { expect(index).toBeGreaterThan(chain[i - 1]); expect(nums[index]).toBeGreaterThan(nums[chain[i - 1]]); }
        });
        if (frame.path!.length) expect(frame.path!.length).toBe(frame.dp![frame.path!.at(-1)!]);
        expect(frame.bestPath!.length).toBe(frame.variables.best);
      });
      expect(trace.frames.at(-1)!.bestPath!.length).toBe(trace.result);
    }
  });

  it('rejects an invalid predecessor and displays real before/after values', () => {
    const trace = runProblem('longest-increasing-subsequence', { nums: [10, 9, 2, 5] });
    const rejected = trace.frames.find((f) => f.location === 'compare')!;
    expect(describeFrame(trace.problemId, rejected).relation?.allowed).toBe(false);
    const i = trace.frames.findIndex((f) => f.location === 'transition');
    expect(describeFrame(trace.problemId, trace.frames[i], trace.frames[i - 1])).toMatchObject({ equation: 'dp[3] = max(1, 1 + 1) = 2', relation: { from: [2], to: 3, allowed: true } });
  });

  it('tracks duplicate elements by identity through swaps', () => {
    const nums = [0, 2, 0, 2];
    const trace = runProblem('move-zeroes', { nums });
    trace.frames.forEach((frame) => {
      expect(new Set(frame.elementIds).size).toBe(nums.length);
      frame.elementIds!.forEach((id, index) => expect(frame.values[index]).toBe(nums[id]));
    });
    expect(trace.frames.at(-1)!.elementIds).toEqual([1, 3, 2, 0]);
    expect(trace.frames[0].elementIds).toEqual([0, 1, 2, 3]);
  });

  it('stores queue node IDs separately from duplicate node values', () => {
    const trace = runProblem('binary-tree-level-order-traversal', { tree: [1, 1, 1] });
    trace.frames.forEach((frame) => {
      expect(new Set(frame.queue).size).toBe(frame.queue!.length);
      if (frame.variables.queue) expect(frame.queue!.map((id) => frame.values[id])).toEqual(frame.variables.queue);
    });
    expect(trace.frames.find((f) => f.location === 'enqueue-right')!.queue).toEqual([1, 2]);
  });

  it('replays the best water boundaries rather than the collapsed terminal pointers', () => {
    for (const heights of [[1, 8, 6, 2, 5, 4, 8, 3, 7], [0, 0], [3, 4]]) {
      const trace = runProblem('container-with-most-water', { heights });
      const frame = trace.frames.at(-1)!;
      const [left, right] = frame.bestPath!;
      expect(Math.min(heights[left], heights[right]) * (right - left)).toBe(trace.result);
      expect(describeFrame(trace.problemId, frame).label).toBe('回看面积最大的容器');
    }
  });

  it('all presets retain their reference location contracts', () => {
    for (const problem of problems) for (const frame of runProblem(problem.id, problem.sample).frames) {
      for (const code of Object.values(problem.code)) expect(code.locations[frame.location]).toBeGreaterThan(0);
    }
  });
});
