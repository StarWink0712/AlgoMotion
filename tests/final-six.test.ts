import { describe, expect, it } from 'vitest';
import { runProblem } from '../src/engine/run';
import { describeFrame } from '../src/engine/presentation';
import { problems } from '../src/engine/catalog';
import { finalSixProblems } from '../src/engine/presets/final-six-catalog';
import { essentialView, type FinalSixId } from '../src/engine/presets/final-six';
import { dpGreedyView } from '../src/engine/presets/dp-greedy';
import { linkedListView } from '../src/engine/presets/linked-lists';
import { codeLanguages, problemIds, type Trace } from '../src/engine/types';
import { finalSixCases, finalSixMaximums } from './final-six-cases';

// Authored for consolidated acceptance. This batch only runs TypeScript compilation.
function checkFrames(trace: Trace) {
  const problem = finalSixProblems.find((p) => p.id === trace.problemId)!;
  expect(trace.version).toBe(2); expect(trace.frames.length).toBeLessThanOrEqual(1000);
  expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
  for (const [i, frame] of trace.frames.entries()) {
    expect(frame.step).toBe(i); expect(frame.result === undefined || i === trace.frames.length - 1).toBe(true);
    expect(describeFrame(problem.id,frame).equation).not.toMatch(/NaN|undefined/);
    for (const language of codeLanguages) expect(problem.code[language].locations[frame.location]).toBeGreaterThan(0);
    for (const index of frame.active) expect(index >= 0 && index < frame.values.length).toBe(true);
    if (problem.renderer === 'state-dp') {
      const view = dpGreedyView(frame), ids = new Set(view.cells.map((c) => c.id));
      expect(ids.size).toBe(view.cells.length);
      expect(view.active === null || ids.has(view.active)).toBe(true);
      expect(view.registerPath!.every((id) => ids.has(id))).toBe(true);
      for (const d of view.deps) { expect(ids.has(d.from) && ids.has(d.to)).toBe(true); expect(d.value).toBe(view.cells.find((c) => c.id === d.from)!.value); expect(d.value).not.toBeNull(); }
      if (!['reconstruct','backtrack','return'].includes(frame.location)) { expect(view.alignment).toEqual([]); expect(view.registerPath).toEqual([]); }
    }
  }
  for (const language of codeLanguages) expect(Object.keys(problem.code[language].locations).sort()).toEqual(Object.keys(problem.code.java.locations).sort());
}
describe('final six fixtures and catalog completion', () => {
  for (const [id,input,expected] of finalSixCases) it(`${id} ${JSON.stringify(input)}`, () => {
    const before = structuredClone(input), trace = runProblem(id,input); expect(trace.result).toEqual(expected); expect(input).toEqual(before); checkFrames(trace);
    const first = structuredClone(trace.frames[0]); trace.frames.at(-1)!.values.push('changed'); trace.frames.at(-1)!.variables.view = {};
    expect(trace.frames[0]).toEqual(first);
  });
  it('contains 100 distinct preset IDs and problem numbers, without counting generated problems', () => {
    expect(problems).toHaveLength(100); expect(problemIds).toHaveLength(100);
    expect(new Set(problems.map((p) => p.id)).size).toBe(100); expect(new Set(problems.map((p) => p.number)).size).toBe(100);
    expect(problems.map((p) => p.id).sort()).toEqual([...problemIds].sort());
  });
});
let seed = 87231;
const rand = (n: number) => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed % n; };
function shuffle(a: number[]) { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i],a[j]] = [a[j],a[i]]; } return a; }
const string = (n: number) => Array.from({ length: n }, () => 'abc'[rand(3)]).join('');
function isSubsequence(short: string, long: string) { let i = 0; for (const ch of long) if (short[i] === ch) i++; return i === short.length; }
function palindromeOracle(s: string) {
  let best = '';
  for (let l = 0; l < s.length; l++) for (let r = l + 1; r <= s.length; r++) { const piece = s.slice(l,r); if (piece === [...piece].reverse().join('') && piece.length > best.length) best = piece; }
  return best;
}
function lcsOracle(a: string, b: string) {
  let longest = 0;
  for (let mask = 0; mask < 2 ** a.length; mask++) { const sequence = [...a].filter((_, i) => mask & 2 ** i).join(''); if (isSubsequence(sequence,b)) longest = Math.max(longest,sequence.length); }
  return longest;
}
// Exhaustively enumerate monotone alignments, rather than reading the engine's DP table.
function editOracle(a: string, b: string): number {
  if (!a.length || !b.length) return a.length + b.length;
  return Math.min((a[0] === b[0] ? 0 : 1) + editOracle(a.slice(1),b.slice(1)), 1 + editOracle(a.slice(1),b), 1 + editOracle(a,b.slice(1)));
}
describe('120 independent comparisons per final algorithm', () => {
  it('checks every substring and all subsequence masks, including ties and non-contiguous matches', () => {
    for (let trial = 0; trial < 120; trial++) {
      const s = string(rand(17)), palindrome = runProblem('longest-palindromic-substring',{ s }); expect(palindrome.result).toBe(palindromeOracle(s));
      let knownBest = '';
      for (const frame of palindrome.frames) {
        const view = essentialView(frame); expect(view.bestText.length).toBeGreaterThanOrEqual(knownBest.length); knownBest = view.bestText;
        expect(view.bestText).toBe([...view.bestText].reverse().join(''));
        expect(view.bestText).toBe(view.best.map((i) => s[i]).join(''));
        expect(view.best.every((id, i) => !i || id === view.best[i - 1] + 1)).toBe(true);
        if (frame.location === 'expand') expect(s.slice(frame.window![0],frame.window![1] + 1)).toBe([...s.slice(frame.window![0],frame.window![1] + 1)].reverse().join(''));
      }
      const text1 = string(rand(9)), text2 = string(rand(9)), lcs = runProblem('longest-common-subsequence',{ text1,text2 }); expect(lcs.result).toBe(lcsOracle(text1,text2));
      const alignment = dpGreedyView(lcs.frames.at(-1)!).alignment!, sequence = alignment.map((x) => x.left).join('');
      expect(alignment.every((x) => x.kind === 'match' && x.left === x.right)).toBe(true);
      expect(sequence.length).toBe(lcs.result); expect(isSubsequence(sequence,text1) && isSubsequence(sequence,text2)).toBe(true);
      for (const frame of lcs.frames) {
        const view = dpGreedyView(frame), cell = view.cells.find((c) => c.id === view.active);
        if (cell && cell.value !== null) expect(cell.value).toBe(lcsOracle(text1.slice(0,cell.row),text2.slice(0,cell.col)));
      }
    }
  });
  it('checks edit distance by alignment enumeration and replays the recovered edits exactly', () => {
    for (let trial = 0; trial < 120; trial++) {
      const word1 = string(rand(5)), word2 = string(rand(5)), trace = runProblem('edit-distance',{ word1,word2 }); expect(trace.result).toBe(editOracle(word1,word2));
      const view = dpGreedyView(trace.frames.at(-1)!), alignment = view.alignment!;
      expect(alignment.map((c) => c.left).join('')).toBe(word1); expect(alignment.map((c) => c.right).join('')).toBe(word2);
      expect(alignment.filter((c) => c.kind !== 'keep').length).toBe(trace.result);
      let inputIndex = 0, output = '';
      for (const c of alignment) {
        if (c.kind !== 'insert') { expect(c.left).toBe(word1[inputIndex++]); }
        if (c.kind === 'keep') expect(c.left).toBe(c.right);
        if (c.kind === 'replace') expect(c.left).not.toBe(c.right);
        if (c.kind === 'delete') expect(c.right).toBe('');
        else output += c.right;
        if (c.kind === 'insert') expect(c.left).toBe('');
      }
      expect(inputIndex).toBe(word1.length); expect(output).toBe(word2);
      for (const frame of trace.frames) {
        const v = dpGreedyView(frame);
        expect(word1.endsWith(v.alignment!.map((c) => c.left).join(''))).toBe(true); expect(word2.endsWith(v.alignment!.map((c) => c.right).join(''))).toBe(true);
        v.registerPath!.slice(1).forEach((id, index) => { const current = v.cells.find((c) => c.id === id)!, prior = v.cells.find((c) => c.id === v.registerPath![index])!; expect(prior.row - current.row >= 0 && prior.row - current.row <= 1 && prior.col - current.col >= 0 && prior.col - current.col <= 1 && current.id !== prior.id).toBe(true); });
      }
    }
  });
  it('checks single and majority results by frequencies and all intermediate cancellation states', () => {
    for (let trial = 0; trial < 120; trial++) {
      const unique = rand(256) - 128, pairs = shuffle(Array.from({ length: 256 }, (_, i) => i - 128).filter((x) => x !== unique)).slice(0,rand(12));
      const nums = shuffle([unique,...pairs,...pairs]), trace = runProblem('single-number',{ nums });
      expect(trace.result).toBe(nums.find((x) => nums.filter((n) => n === x).length === 1));
      for (const frame of trace.frames.filter((f) => f.location === 'xor')) {
        const view = essentialView(frame), i = frame.pointers.i!, prefix = nums.slice(0,i + 1), odd = prefix.filter((x) => prefix.filter((n) => n === x).length % 2);
        expect(view.pending.map((id) => nums[id]).sort((a,b) => a - b)).toEqual(odd.sort((a,b) => a - b));
        if (view.pair.length) expect(nums[view.pair[0]]).toBe(nums[view.pair[1]]);
        for (let bit = 0; bit < 8; bit++) expect((view.after >>> bit) & 1).toBe(prefix.reduce((sum,x) => sum + ((x >>> bit) & 1),0) % 2);
      }
      const size = 1 + rand(24), majority = rand(21) - 10, data = shuffle([...Array(Math.floor(size / 2) + 1).fill(majority),...Array.from({ length: size - Math.floor(size / 2) - 1 }, () => majority + 1 + rand(3))]);
      const vote = runProblem('majority-element',{ nums: data }); expect(vote.result).toBe([...data].sort((a,b) => a - b)[Math.floor(size / 2)]);
      for (const frame of vote.frames) {
        const view = essentialView(frame); expect(view.pending.length).toBe(view.count); expect(view.pending.every((i) => data[i] === view.candidate)).toBe(true);
        if (view.pair.length) expect(data[view.pair[0]]).not.toBe(data[view.pair[1]]);
        expect(new Set([...frame.settled,...view.pending]).size).toBe(frame.settled.length + view.pending.length);
      }
      expect(vote.frames.at(-1)!.bestPath!.every((i) => data[i] === majority)).toBe(true);
    }
  });
  it('checks duplicate results by frequencies, immutable graph edges and each pointer hop', () => {
    for (let trial = 0; trial < 120; trial++) {
      const n = 1 + rand(12), repeated = 1 + rand(n), copies = 2 + rand(n), others = shuffle(Array.from({ length: n }, (_, i) => i + 1).filter((x) => x !== repeated)).slice(0,n + 1 - copies);
      const nums = shuffle([...Array(copies).fill(repeated),...others]), trace = runProblem('find-the-duplicate-number',{ nums });
      expect(trace.result).toBe(nums.find((x) => nums.filter((n) => n === x).length > 1));
      for (const [i,frame] of trace.frames.entries()) {
        expect(frame.values).toEqual(nums); expect(frame.links).toEqual(nums.map((x,i) => [i,x]));
        for (const pointer of Object.values(frame.pointers)) expect(pointer !== null && pointer >= 0 && pointer < nums.length).toBe(true);
        for (const [from,to] of linkedListView(frame).traversed!) expect(nums[from]).toBe(to);
        if (frame.location === 'advance') { const before = trace.frames[i - 1].pointers; expect(frame.pointers.slow).toBe(nums[before.slow!]); expect(frame.pointers.fast).toBe(nums[nums[before.fast!]]); }
        if (frame.location === 'entrance') { const before = trace.frames[i - 1].pointers; expect(frame.pointers.slow).toBe(nums[before.slow!]); expect(frame.pointers.finder).toBe(nums[before.finder!]); }
      }
      expect(linkedListView(trace.frames.at(-1)!).group).toEqual([repeated]);
    }
  });
});
describe('strict limits and invalid assumptions', () => {
  for (const [id,input] of finalSixMaximums) it(`upper bound ${id}`, () => checkFrames(runProblem(id,input)));
  const invalid: [FinalSixId,unknown][] = [
    ['longest-palindromic-substring',{ s: 'a'.repeat(17) }], ['longest-palindromic-substring',{ s: '中' }],
    ['longest-common-subsequence',{ text1: 'a'.repeat(9),text2: '' }], ['edit-distance',{ word1: '',word2: 'A' }],
    ['single-number',{ nums: [] }], ['single-number',{ nums: [1,2] }], ['single-number',{ nums: [1,1] }], ['single-number',{ nums: [1,1,1] }], ['single-number',{ nums: [128] }],
    ['majority-element',{ nums: [] }], ['majority-element',{ nums: [1,2] }], ['majority-element',{ nums: [1,1,2,2] }], ['majority-element',{ nums: [1,1,2,3] }],
    ['find-the-duplicate-number',{ nums: [1] }], ['find-the-duplicate-number',{ nums: [0,1] }], ['find-the-duplicate-number',{ nums: [1,2] }], ['find-the-duplicate-number',{ nums: [1,1,2,2] }],
  ];
  for (const [id,input] of invalid) it(`rejects ${id} ${JSON.stringify(input)}`, () => expect(() => runProblem(id,input)).toThrow('输入不符合要求'));
  for (const problem of finalSixProblems) it(`rejects unknown fields ${problem.id}`, () => expect(() => runProblem(problem.id,{ ...problem.sample,extra: true })).toThrow('输入不符合要求'));
});
