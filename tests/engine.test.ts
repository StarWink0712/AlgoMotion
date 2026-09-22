import { describe, expect, it } from 'vitest';
import { problems } from '../src/engine/catalog';
import { parseTree, runProblem } from '../src/engine/run';
import { codeLanguages, type ProblemId } from '../src/engine/types';

import { cases } from './reference-cases';

describe('deterministic presets', () => {
  it.each(cases)('%s: %j -> %j', (id, input, expected) => {
    const original = structuredClone(input);
    const trace = runProblem(id, input);
    expect(trace.result).toEqual(expected);
    expect(input).toEqual(original);
    expect(trace.frames.at(-1)?.result).toEqual(expected);
    expect(trace.frames.at(-1)?.action).toBe('完成');
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
    expect(runProblem(id, input)).toEqual(trace);
    const code = problems.find((p) => p.id === id)!.code;
    expect(trace.version).toBe(2);
    trace.frames.forEach((frame, step) => {
      expect(frame.step).toBe(step);
      for (const language of codeLanguages) {
        const line = code[language].locations[frame.location];
        expect(line, `${id}/${language}/${frame.location}`).toBeGreaterThan(0);
        expect(line).toBeLessThanOrEqual(code[language].lines.length);
      }
      frame.active.concat(frame.settled).forEach((i) => { expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(frame.values.length); });
      frame.links?.forEach(([a, b]) => { expect(a).toBeLessThan(frame.values.length); expect(b).toBeLessThan(frame.values.length); });
    });
  });

  it.each(problems)('$id sample has independent snapshots', (p) => {
    const trace = runProblem(p.id, p.sample);
    const first = structuredClone(trace.frames[0]);
    trace.frames.at(-1)!.values.push('mutation');
    trace.frames.at(-1)!.variables.test = true;
    expect(trace.frames[0]).toEqual(first);
  });

  it.each([
    ['two-sum', { nums: ['2'], target: 1 }],
    ['move-zeroes', { nums: Array(25).fill(0) }],
    ['maximum-subarray', { nums: [] }],
    ['coin-change', { coins: [0], amount: 2 }],
    ['coin-change', { coins: [1, 1], amount: 2 }],
    ['coin-change', { coins: [1], amount: 25 }],
    ['climbing-stairs', { n: 1.5 }],
    ['container-with-most-water', { heights: [-1, 3] }],
    ['reverse-linked-list', { values: Array(13).fill(1) }],
    ['longest-substring-without-repeating-characters', { s: 'x'.repeat(25) }],
    ['two-sum', { nums: [], target: 1, script: 'bad' }],
    ['binary-tree-level-order-traversal', { tree: [null, 2] }],
    ['binary-tree-level-order-traversal', { tree: [1, null, null, 3] }],
  ] as [ProblemId, unknown][])('rejects invalid %s input %j', (id, input) => {
    expect(() => runProblem(id, input)).toThrow();
  });

  it('rejects too deep trees', () => expect(() => parseTree([1, null, 2, null, 3, null, 4, null, 5, null, 6])).toThrow('5 层'));
  it('records actual reverse-list edges before and after rewiring', () => {
    const trace = runProblem('reverse-linked-list', { values: [7, 7, 9] });
    expect(trace.frames[0].links).toEqual([[0, 1], [1, 2]]);
    expect(trace.frames.at(-1)?.links).toEqual([[1, 0], [2, 1]]);
    expect(trace.frames.at(-1)?.pointers).toEqual({ prev: 2, curr: null });
  });
});

describe('seeded differential checks', () => {
  let seed = 12345;
  const random = (max: number) => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed % max; };
  const run = (id: ProblemId, input: unknown) => runProblem(id, input).result;

  it('checks 100 small random cases for each of eight algorithms against independent references', () => {
    for (let test = 0; test < 100; test++) {
      const array = Array.from({ length: random(7) + 2 }, () => random(13) - 6);
      const target = random(15) - 7;
      const pairs = array.flatMap((a, i) => array.flatMap((b, j) => j > i && a + b === target ? [[i, j]] : []));
      const pair = run('two-sum', { nums: array, target }) as number[];
      if (pairs.length) expect(pairs).toContainEqual(pair); else expect(pair).toEqual([]);

      expect(run('move-zeroes', { nums: array })).toEqual([...array.filter((n) => n !== 0), ...array.filter((n) => n === 0)]);
      expect(run('reverse-linked-list', { values: array })).toEqual([...array].reverse());
      const heights = array.map(Math.abs);
      let area = 0, maxSum = -Infinity;
      for (let i = 0; i < array.length; i++) {
        for (let j = i; j < array.length; j++) {
          area = Math.max(area, Math.min(heights[i], heights[j]) * (j - i));
          maxSum = Math.max(maxSum, array.slice(i, j + 1).reduce((a, b) => a + b, 0));
        }
      }
      expect(run('container-with-most-water', { heights })).toBe(area);
      expect(run('maximum-subarray', { nums: array })).toBe(maxSum);

      const s = array.map((n) => 'abcde'[Math.abs(n) % 5]).join('');
      let unique = 0, lis = 0;
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) {
        const chars = s.slice(i, j); if (new Set(chars).size === chars.length) unique = Math.max(unique, chars.length);
      }
      for (let mask = 1; mask < (1 << array.length); mask++) {
        const sequence = array.filter((_, i) => mask & (1 << i));
        if (sequence.every((v, i) => i === 0 || v > sequence[i - 1])) lis = Math.max(lis, sequence.length);
      }
      expect(run('longest-substring-without-repeating-characters', { s })).toBe(unique);
      expect(run('longest-increasing-subsequence', { nums: array })).toBe(lis);

      const coins = [...new Set([1 + random(5), 1 + random(5)])], amount = random(15);
      const queue: [number, number][] = [[0, 0]], seen = new Set([0]); let expected = -1;
      for (let i = 0; i < queue.length; i++) {
        const [total, depth] = queue[i]; if (total === amount) { expected = depth; break; }
        for (const coin of coins) if (total + coin <= amount && !seen.has(total + coin)) { seen.add(total + coin); queue.push([total + coin, depth + 1]); }
      }
      expect(run('coin-change', { coins, amount })).toBe(expected);
    }
  });
});
