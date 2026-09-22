import { describe, expect, it } from 'vitest';
import { problems } from '../src/engine/catalog';
import { runProblem } from '../src/engine/run';
import { describeFrame } from '../src/engine/presentation';
import { stackWindowSchemas, stackWindowView, validEncoding } from '../src/engine/presets/stack-window';
import { codeLanguages, type ProblemId } from '../src/engine/types';
import { stackWindowCases } from './stack-window-cases';

// Authored during batch 4; execution is deferred to the consolidated acceptance run.
describe('stack and window presets', () => {
  it.each(stackWindowCases)('%s fixture %j', (id, input, expected) => {
    const before = structuredClone(input), trace = runProblem(id, input);
    expect(trace.result).toEqual(expected);
    expect(input).toEqual(before);
    expect(runProblem(id, input)).toEqual(trace);
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
    const problem = problems.find((p) => p.id === id)!;
    for (const frame of trace.frames) {
      expect(frame.step).toBeLessThan(1000);
      for (const language of codeLanguages) expect(problem.code[language].locations[frame.location], `${language}/${frame.location}`).toBeGreaterThan(0);
      for (const index of [...frame.active, ...frame.settled]) expect(index >= 0 && index < frame.values.length).toBe(true);
      const cue = describeFrame(id, frame, trace.frames[frame.step - 1]);
      expect(cue.equation).not.toMatch(/undefined|NaN|Infinity/);
      expect(new Set(stackWindowView(frame).entries.map((entry) => entry.id)).size).toBe(stackWindowView(frame).entries.length);
    }
    const first = structuredClone(trace.frames[0]);
    stackWindowView(trace.frames.at(-1)!).entries.push({ id: 999, value: 'test' });
    expect(trace.frames[0]).toEqual(first);
  });

  it.each([
    ['valid-parentheses', { s: 'abc' }], ['valid-parentheses', { s: '('.repeat(33) }],
    ['min-stack', { operations: [{ op: 'pop' }] }], ['min-stack', { operations: [{ op: 'top' }] }],
    ['min-stack', { operations: [{ op: 'getMin' }] }], ['min-stack', { operations: [{ op: 'push' }] }],
    ['min-stack', { operations: [{ op: 'push', value: 1 }, { op: 'pop', value: 2 }] }],
    ['min-stack', { operations: [{ op: 'push', value: 1 }, { op: 'pop' }, { op: 'top' }] }],
    ['min-stack', { operations: Array(25).fill({ op: 'push', value: 1 }) }],
    ['daily-temperatures', { temperatures: [101] }], ['daily-temperatures', { temperatures: ['10'] }],
    ['largest-rectangle-in-histogram', { heights: [-1] }], ['trapping-rain-water', { heights: [1.5] }],
    ['trapping-rain-water', { heights: Array(25).fill(1) }],
    ['sliding-window-maximum', { nums: [], k: 1 }], ['sliding-window-maximum', { nums: [1], k: 0 }],
    ['sliding-window-maximum', { nums: [1], k: 2 }], ['sliding-window-maximum', { nums: [1], k: 1.5 }],
    ['find-all-anagrams-in-a-string', { s: 'abc', p: '' }], ['find-all-anagrams-in-a-string', { s: '🙂', p: 'a' }],
    ['minimum-window-substring', { s: 'abc', t: 'a', code: 'ignore' }], ['minimum-window-substring', { s: 'a'.repeat(33), t: 'a' }],
    ['longest-valid-parentheses', { s: '[]' }], ['decode-string', { s: '20[20[a]]' }],
  ] as [ProblemId, unknown][])('rejects invalid %s input %j', (id, input) => expect(() => runProblem(id, input)).toThrow());

  it.each(['[a]', '2a', '2[]', '0[a]', '21[a]', '2[a', 'a]', '2[a]3', '1[1[1[1[1[1[1[a]]]]]]]', '2[a!]'])('rejects malformed encoding %s', (s) => {
    expect(validEncoding(s)).toBe(false);
    expect(() => runProblem('decode-string', { s })).toThrow();
  });

  it('retains repeated minima and independent input identities', () => {
    const trace = runProblem('min-stack', { operations: [{ op: 'push', value: 1 }, { op: 'push', value: 1 }, { op: 'pop' }, { op: 'getMin' }] });
    const pushed = trace.frames.filter((frame) => frame.location === 'push').at(-1)!;
    expect(stackWindowView(pushed).entries).toEqual([{ id: 0, value: 1, detail: 'min 1' }, { id: 1, value: 1, detail: 'min 1' }]);
    expect(trace.result).toEqual([null, null, null, 1]);
  });

  it('does not present unresolved temperatures as final zero answers', () => {
    const trace = runProblem('daily-temperatures', { temperatures: [5, 5, 6] });
    expect(stackWindowView(trace.frames[0]).output).toEqual([null, null, null]);
    for (const frame of trace.frames.filter((f) => f.location === 'resolve')) {
      const waiting = Number(frame.variables.waiting), i = Number(frame.variables.i);
      expect(Number(frame.values[i])).toBeGreaterThan(Number(frame.values[waiting]));
      expect(stackWindowView(frame).output[waiting]).toBe(i - waiting);
    }
    expect(trace.result).toEqual([2, 1, 0]);
  });

  it('records real per-column water without double counting layers', () => {
    const heights = [5, 2, 1, 2, 1, 5], trace = runProblem('trapping-rain-water', { heights });
    let previous = 0;
    for (const frame of trace.frames) {
      const amounts = stackWindowView(frame).water!, total = amounts.reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThanOrEqual(previous); previous = total;
      for (let i = 0; i < amounts.length; i++) {
        expect(amounts[i]).toBeGreaterThanOrEqual(0);
        expect(amounts[i]).toBeLessThanOrEqual(Math.min(Math.max(...heights.slice(0, i + 1)), Math.max(...heights.slice(i))) - heights[i]);
      }
      if (frame.location === 'fill') expect(total).toBe(frame.variables.total);
    }
    expect(stackWindowView(trace.frames.at(-1)!).water).toEqual([0, 3, 4, 3, 4, 0]);
  });

  it('measures only rectangles that lie under the actual histogram', () => {
    const heights = [2, 1, 5, 6, 2, 3], trace = runProblem('largest-rectangle-in-histogram', { heights });
    for (const frame of trace.frames.filter((f) => f.location === 'measure')) {
      const area = stackWindowView(frame).rectangle!;
      expect(area.area).toBe(area.height * (area.right - area.left + 1));
      expect(area.left).toBeGreaterThanOrEqual(0); expect(area.right).toBeLessThan(heights.length);
      expect(heights.slice(area.left, area.right + 1).every((height) => height >= area.height)).toBe(true);
    }
  });

  it('keeps queue candidates in-window and strictly decreasing after each push', () => {
    const nums = [4, 4, 3, 1, 5, 2, 6], k = 3, trace = runProblem('sliding-window-maximum', { nums, k });
    for (const frame of trace.frames.filter((f) => f.location === 'push')) {
      const entries = stackWindowView(frame).entries, right = Number(frame.variables.i);
      entries.forEach((entry, i) => {
        expect(entry.id).toBeGreaterThan(right - k); expect(entry.id).toBeLessThanOrEqual(right);
        if (i) { expect(entry.id).toBeGreaterThan(entries[i - 1].id); expect(Number(entry.value)).toBeLessThan(Number(entries[i - 1].value)); }
      });
    }
    expect(stackWindowView(trace.frames.find((f) => f.location === 'push' && f.variables.i === 1)!).entries.map((e) => e.id)).toEqual([1]);
  });

  it('binds frequency counts and best ranges to each snapshot rather than the final input result', () => {
    const s = 'AAABBC', trace = runProblem('minimum-window-substring', { s, t: 'AABC' });
    for (const frame of trace.frames) {
      const view = stackWindowView(frame), [left, right] = frame.window!;
      const chars = [...s.slice(left, right + 1)];
      for (const entry of view.frequencies!) expect(entry.have).toBe(chars.filter((c) => c === entry.char).length);
      expect(frame.variables.missing).toBe(view.frequencies!.reduce((sum, entry) => sum + Math.max(0, entry.need - entry.have), 0));
      if (view.bestRange) expect(view.text).toBe(s.slice(view.bestRange[0], view.bestRange[1] + 1));
    }
  });

  it('supports the largest teaching inputs within the recorder bound', () => {
    const examples: [ProblemId, unknown][] = [
      ['valid-parentheses', { s: '('.repeat(32) }],
      ['min-stack', { operations: Array.from({ length: 24 }, (_, i) => ({ op: 'push', value: -i })) }],
      ['daily-temperatures', { temperatures: [...Array(23).fill(0), 100] }],
      ['largest-rectangle-in-histogram', { heights: Array.from({ length: 24 }, (_, i) => i) }],
      ['trapping-rain-water', { heights: [100, ...Array(22).fill(0), 100] }],
      ['sliding-window-maximum', { nums: Array.from({ length: 24 }, (_, i) => 24 - i), k: 24 }],
      ['find-all-anagrams-in-a-string', { s: 'a'.repeat(32), p: 'a'.repeat(12) }],
      ['minimum-window-substring', { s: 'a'.repeat(32), t: 'a'.repeat(12) }],
      ['longest-valid-parentheses', { s: '('.repeat(32) }],
      ['decode-string', { s: '20[abcdef]' }],
    ];
    for (const [id, input] of examples) {
      const trace = runProblem(id, input);
      expect(trace.frames.length).toBeLessThan(1000);
      expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
    }
    expect(runProblem('decode-string', { s: '20[abcdef]' }).result).toHaveLength(120);
    expect(Object.keys(stackWindowSchemas)).toHaveLength(10);
  });
});

describe('independent small-input oracles (deferred)', () => {
  let seed = 419;
  const random = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed >>> 8) % n; };
  const run = (id: ProblemId, input: unknown) => runProblem(id, input).result;
  const balanced = (s: string) => {
    let depth = 0;
    for (const c of s) { depth += c === '(' ? 1 : -1; if (depth < 0) return false; }
    return depth === 0;
  };

  it('compares numeric presets with enumeration, direct scans and per-column water levels', () => {
    for (let test = 0; test < 120; test++) {
      const heights = Array.from({ length: random(9) }, () => random(7));
      let rectangle = 0;
      for (let left = 0; left < heights.length; left++) for (let right = left; right < heights.length; right++) rectangle = Math.max(rectangle, Math.min(...heights.slice(left, right + 1)) * (right - left + 1));
      expect(run('largest-rectangle-in-histogram', { heights })).toBe(rectangle);
      const water = heights.reduce((sum, height, i) => sum + Math.min(Math.max(...heights.slice(0, i + 1)), Math.max(...heights.slice(i))) - height, 0);
      expect(run('trapping-rain-water', { heights })).toBe(water);
      const temperatures = heights.map((h) => h - 3);
      expect(run('daily-temperatures', { temperatures })).toEqual(temperatures.map((t, i) => {
        const offset = temperatures.slice(i + 1).findIndex((later) => later > t); return offset < 0 ? 0 : offset + 1;
      }));
      const nums = temperatures.length ? temperatures : [0], k = random(nums.length) + 1;
      expect(run('sliding-window-maximum', { nums, k })).toEqual(Array.from({ length: nums.length - k + 1 }, (_, i) => Math.max(...nums.slice(i, i + k))));
    }
  });

  it('compares string windows with all-substring enumeration and canonical sorting', () => {
    for (let test = 0; test < 120; test++) {
      const s = Array.from({ length: random(9) }, () => 'abAB'[random(4)]).join('');
      const target = Array.from({ length: random(4) + 1 }, () => 'abAB'[random(4)]).join('');
      const canonical = (s: string) => [...s].sort().join('');
      const expected = Array.from({ length: Math.max(0, s.length - target.length + 1) }, (_, i) => i).filter((i) => canonical(s.slice(i, i + target.length)) === canonical(target));
      expect(run('find-all-anagrams-in-a-string', { s, p: target })).toEqual(expected);
      let best = '';
      for (let left = 0; left < s.length; left++) for (let right = left + 1; right <= s.length; right++) {
        const part = s.slice(left, right), pool = [...part];
        const covers = [...target].every((c) => { const i = pool.indexOf(c); if (i < 0) return false; pool.splice(i, 1); return true; });
        if (covers && (!best || part.length < best.length)) best = part;
      }
      expect(run('minimum-window-substring', { s, t: target })).toBe(best);
    }
  });

  it('compares bracket matching with pair reduction and longest length with balance enumeration', () => {
    for (let test = 0; test < 120; test++) {
      const s = Array.from({ length: random(11) }, () => '()[]{}'[random(6)]).join('');
      let reduced = s, previous: string;
      do { previous = reduced; reduced = reduced.replace(/\(\)|\[\]|\{\}/g, ''); } while (reduced !== previous);
      expect(run('valid-parentheses', { s })).toBe(reduced === '');
      const parens = Array.from({ length: random(11) }, () => random(2) ? '(' : ')').join('');
      let best = 0;
      for (let left = 0; left < parens.length; left++) for (let end = left + 1; end <= parens.length; end++) if (balanced(parens.slice(left, end))) best = Math.max(best, end - left);
      expect(run('longest-valid-parentheses', { s: parens })).toBe(best);
    }
  });

  it('compares min-stack with direct minimum scans after random legal operations', () => {
    for (let test = 0; test < 120; test++) {
      const values: number[] = [], operations: { op: string; value?: number }[] = [], expected: (number | null)[] = [];
      for (let i = 0; i < 24; i++) {
        const op = values.length ? random(4) : 0;
        if (op === 0) { const value = random(15) - 7; values.push(value); operations.push({ op: 'push', value }); expected.push(null); }
        else if (op === 1) { values.pop(); operations.push({ op: 'pop' }); expected.push(null); }
        else if (op === 2) { operations.push({ op: 'top' }); expected.push(values.at(-1)!); }
        else { operations.push({ op: 'getMin' }); expected.push(Math.min(...values)); }
      }
      expect(run('min-stack', { operations })).toEqual(expected);
    }
  });

  it('compares decoding with independently constructed expression trees', () => {
    const expression = (depth: number): { code: string; value: string } => {
      const literal = 'abc'[random(3)];
      if (!depth || random(3) === 0) return { code: literal, value: literal };
      const child = expression(depth - 1), repeat = random(3) + 1;
      return { code: `${literal}${repeat}[${child.code}]`, value: literal + Array(repeat).fill(child.value).join('') };
    };
    for (let test = 0; test < 120; test++) {
      const tree = expression(3); expect(run('decode-string', { s: tree.code })).toBe(tree.value);
    }
  });
});
