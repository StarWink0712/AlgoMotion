import { describe, expect, it } from 'vitest';
import { runProblem } from '../src/engine/run';
import { explorationProblems } from '../src/engine/presets/exploration-catalog';
import { explorationView, type ExplorationId } from '../src/engine/presets/exploration';
import { describeFrame } from '../src/engine/presentation';
import { codeLanguages, type ProblemId } from '../src/engine/types';
import { explorationCases } from './exploration-cases';

// Deferred batch 8 checks: independent oracles, not generated code or model fixtures.
const canonical = (items: unknown[]) => items.map((item) => JSON.stringify(item)).sort();
const adjacent = (a: number, b: number, cols: number) => Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs(a % cols - b % cols) === 1;
let seed = 809;
const rand = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
function phoneProduct(digits: string) {
  const letters: Record<string, string> = { '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl', '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz' };
  return digits ? [...digits].reduce((out, digit) => out.flatMap((prefix) => [...letters[digit]].map((c) => prefix + c)), ['']) : [];
}
function bracketMasks(n: number) {
  const out: string[] = [];
  for (let bits = 0; bits < 2 ** (2 * n); bits++) {
    let balance = 0, valid = true, s = '';
    for (let i = 0; i < 2 * n; i++) { const open = !!(bits & (1 << i)); balance += open ? 1 : -1; s += open ? '(' : ')'; if (balance < 0) valid = false; }
    if (valid && balance === 0) out.push(s);
  }
  return out;
}
function partitionMasks(s: string) {
  if (!s) return [[]]; const out: string[][] = [];
  for (let mask = 0; mask < 2 ** (s.length - 1); mask++) {
    const parts: string[] = []; let start = 0;
    for (let i = 0; i < s.length; i++) if (i === s.length - 1 || mask & (1 << i)) { parts.push(s.slice(start, i + 1)); start = i + 1; }
    if (parts.every((part) => [...part].reverse().join('') === part)) out.push(parts);
  }
  return out;
}
function wordBreadth(board: string[][], word: string) {
  if (!word) return true; const flat = board.flat(), cols = board[0]?.length ?? 0;
  let paths = flat.flatMap((c, id) => c === word[0] ? [[id]] : []);
  for (let i = 1; i < word.length; i++) paths = paths.flatMap((path) => flat.flatMap((c, id) => c === word[i] && !path.includes(id) && adjacent(path.at(-1)!, id, cols) ? [[...path, id]] : []));
  return paths.length > 0;
}
function queenPermutations(n: number) {
  let permutations: number[][] = [[]];
  for (let c = 0; c < n; c++) permutations = permutations.flatMap((p) => Array.from({ length: p.length + 1 }, (_, i) => [...p.slice(0, i), c, ...p.slice(i)]));
  return permutations.filter((p) => p.every((c, r) => p.every((other, row) => row === r || Math.abs(row - r) !== Math.abs(other - c)))).map((p) => p.map((c) => '.'.repeat(c) + 'Q' + '.'.repeat(n - c - 1)));
}
function islandUnion(grid: number[][]) {
  const flat = grid.flat(), cols = grid[0]?.length ?? 0, parent = flat.map((_, i) => i);
  const root = (i: number): number => parent[i] === i ? i : root(parent[i]);
  flat.forEach((v, a) => { if (v === 1) for (let b = 0; b < a; b++) if (flat[b] === 1 && adjacent(a, b, cols)) parent[root(a)] = root(b); });
  return new Set(flat.flatMap((v, i) => v === 1 ? [root(i)] : [])).size;
}
function synchronousRot(grid: number[][]) {
  let cells = grid.flat(), minute = 0; const cols = grid[0]?.length ?? 0, times: (number | null)[] = cells.map((c) => c === 2 ? 0 : null);
  while (cells.includes(1)) {
    const next = cells.map((v, i) => v === 1 && cells.some((u, j) => u === 2 && adjacent(i, j, cols)) ? 2 : v);
    if (next.every((v, i) => v === cells[i])) return { result: -1, times, cells };
    minute++; next.forEach((v, i) => { if (v === 2 && cells[i] === 1) times[i] = minute; }); cells = next;
  }
  return { result: minute, times, cells };
}
function acyclicClosure(n: number, pairs: number[][]) {
  const reachable = Array.from({ length: n }, () => Array(n).fill(false) as boolean[]);
  for (const [a, b] of pairs) reachable[b][a] = true;
  for (let k = 0; k < n; k++) for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) reachable[a][b] ||= reachable[a][k] && reachable[k][b];
  return reachable.every((row, i) => !row[i]);
}
function spiralWalk(matrix: number[][]) {
  const rows = matrix.length, cols = matrix[0]?.length ?? 0, out: number[] = [], ids: number[] = [], dirs = [[0,1],[1,0],[0,-1],[-1,0]];
  let r = 0, c = 0, direction = 0;
  for (let i = 0; i < rows * cols; i++) {
    out.push(matrix[r][c]); ids.push(r * cols + c);
    let a = r + dirs[direction][0], b = c + dirs[direction][1];
    if (a < 0 || a >= rows || b < 0 || b >= cols || ids.includes(a * cols + b)) { direction = (direction + 1) % 4; a = r + dirs[direction][0]; b = c + dirs[direction][1]; }
    r = a; c = b;
  }
  return { out, ids };
}
function zeroByOriginal(matrix: number[][]) {
  return matrix.map((row, r) => row.map((value, c) => matrix[r].includes(0) || matrix.some((line) => line[c] === 0) ? 0 : value));
}

describe('batch 8 fixture outputs and semantic snapshot contract', () => {
  for (const [id, input, expected] of explorationCases) it(`${id}: ${JSON.stringify(input)}`, () => {
    const before = structuredClone(input), trace = runProblem(id, input), problem = explorationProblems.find((p) => p.id === id)!;
    expect(trace.result).toEqual(expected); expect(input).toEqual(before); expect(trace.frames.length).toBeLessThanOrEqual(1000);
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
    trace.frames.forEach((frame, i) => {
      expect(frame.step).toBe(i); expect(describeFrame(id, frame).equation).not.toMatch(/NaN|undefined/);
      for (const lang of codeLanguages) expect(problem.code[lang].locations[frame.location]).toBeGreaterThan(0);
      for (const node of frame.active) expect(node >= 0 && node < frame.values.length).toBe(true);
      const view = explorationView(frame);
      expect(new Set(view.queue).size).toBe(view.queue.length);
      expect(frame.result === undefined || i === trace.frames.length - 1).toBe(true);
      for (const arrow of view.arrows) expect([arrow.from, arrow.to].every((node) => node >= 0 && node < frame.values.length)).toBe(true);
    });
    for (const lang of codeLanguages) expect(Object.keys(problem.code[lang].locations).sort()).toEqual(Object.keys(problem.code.java.locations).sort());
    const first = structuredClone(trace.frames[0]); explorationView(trace.frames.at(-1)!).labels.push('changed'); expect(trace.frames[0]).toEqual(first);
  });
});

describe('120 independent comparisons per new algorithm', () => {
  it('uses Cartesian products, bit masks, cut masks, BFS paths and column permutations', () => {
    for (let trial = 0; trial < 120; trial++) {
      const digits = Array.from({ length: rand(4) }, () => String(2 + rand(8))).join('');
      expect(canonical(runProblem('letter-combinations-of-a-phone-number', { digits }).result as string[])).toEqual(canonical(phoneProduct(digits)));
      const n = trial % 5; expect(canonical(runProblem('generate-parentheses', { n }).result as string[])).toEqual(canonical(bracketMasks(n)));
      const s = Array.from({ length: rand(8) }, () => 'aAb'[rand(3)]).join('');
      expect(canonical(runProblem('palindrome-partitioning', { s }).result as string[][])).toEqual(canonical(partitionMasks(s)));
      const board = Array.from({ length: 1 + rand(4) }, () => Array.from({ length: 3 }, () => 'AB'[rand(2)])), word = Array.from({ length: rand(5) }, () => 'ABC'[rand(3)]).join('');
      const wordTrace = runProblem('word-search', { board, word }); expect(wordTrace.result).toBe(wordBreadth(board, word));
      expect(wordTrace.frames.at(-1)!.values).toEqual(board.flat()); expect(explorationView(wordTrace.frames.at(-1)!).path).toEqual([]);
      if (wordTrace.result) {
        const path = explorationView(wordTrace.frames.at(-1)!).witness;
        expect(path.map((node) => board.flat()[node]).join('')).toBe(word); expect(new Set(path).size).toBe(path.length);
        path.slice(1).forEach((node, i) => expect(adjacent(path[i], node, 3)).toBe(true));
      }
      const queens = runProblem('n-queens', { n: n + 1 }); expect(canonical(queens.result as string[][])).toEqual(canonical(queenPermutations(n + 1)));
      expect(queens.frames.at(-1)!.values.every((v) => v === '.')).toBe(true);
    }
  });
  it('uses union-find, synchronous full-grid waves, transitive closure, walking and original zero sets', () => {
    for (let trial = 0; trial < 120; trial++) {
      const rows = rand(7), cols = 1 + rand(6), grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => rand(2)));
      const islands = runProblem('number-of-islands', { grid }); expect(islands.result).toBe(islandUnion(grid)); expect(islands.frames.at(-1)!.values).toEqual(grid.flat());
      const orangeGrid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => rand(3))), expected = synchronousRot(orangeGrid);
      const oranges = runProblem('rotting-oranges', { grid: orangeGrid }); expect(oranges.result).toBe(expected.result); expect(oranges.frames.at(-1)!.values).toEqual(expected.cells);
      for (const frame of oranges.frames) {
        const view = explorationView(frame);
        view.labels.forEach((label, i) => { if (label) expect(label).toBe(`${expected.times[i]} 分钟`); });
        if (frame.location === 'infect') {
          const { from, to } = view.arrows[0]; expect(adjacent(from, to, cols)).toBe(true); expect(expected.times[to]).toBe(expected.times[from]! + 1);
        }
      }
      const numCourses = rand(11), prerequisites: number[][] = [];
      for (let a = 0; a < numCourses; a++) for (let b = 0; b < numCourses; b++) if (rand(6) === 0 && prerequisites.length < 24) prerequisites.push([a, b]);
      const courses = runProblem('course-schedule', { numCourses, prerequisites }); expect(courses.result).toBe(acyclicClosure(numCourses, prerequisites));
      for (const frame of courses.frames) {
        const view = explorationView(frame), learned = view.output as number[];
        for (const node of learned) for (const [child, parent] of prerequisites) if (child === node) expect(learned.indexOf(parent) >= 0 && learned.indexOf(parent) < learned.indexOf(node)).toBe(true);
        for (const node of view.queue) expect(view.labels[node]).toBe('入度 0');
      }
      const matrix = Array.from({ length: rows }, () => Array.from({ length: cols }, () => rand(7) - 3)), walk = spiralWalk(matrix);
      const spiral = runProblem('spiral-matrix', { matrix }); expect(spiral.result).toEqual(walk.out); expect(explorationView(spiral.frames.at(-1)!).path).toEqual(walk.ids);
      expect(new Set(explorationView(spiral.frames.at(-1)!).path).size).toBe(rows * cols);
      expect(runProblem('set-matrix-zeroes', { matrix }).result).toEqual(zeroByOriginal(matrix));
    }
  });
});

describe('bounded complete search and causality', () => {
  const maximums: [ExplorationId, unknown][] = [
    ['letter-combinations-of-a-phone-number', { digits: '777' }], ['generate-parentheses', { n: 4 }], ['palindrome-partitioning', { s: 'aaaaaaa' }],
    ['word-search', { board: Array.from({ length: 4 }, () => Array(4).fill('A')), word: 'AAAB' }], ['n-queens', { n: 5 }],
    ['number-of-islands', { grid: Array.from({ length: 6 }, () => Array(6).fill(1)) }],
    ['rotting-oranges', { grid: Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => !r && !c ? 2 : 1)) }],
    ['course-schedule', { numCourses: 10, prerequisites: Array.from({ length: 24 }, (_, i) => [Math.floor(i / 10), i % 10]) }],
    ['spiral-matrix', { matrix: Array.from({ length: 6 }, () => Array(6).fill(1)) }], ['set-matrix-zeroes', { matrix: Array.from({ length: 6 }, () => Array(6).fill(0)) }],
  ];
  for (const [id, input] of maximums) it(`${id} stays below 1000 frames without revealing future answers`, () => {
    const trace = runProblem(id, input); expect(trace.frames.length).toBeLessThanOrEqual(1000);
    let collected = 0;
    for (const frame of trace.frames) { if (frame.location === 'save') collected++; expect(explorationView(frame).answers.length).toBe(collected); }
  });
  it('restores exact selected tokens on undo, including after a completed answer', () => {
    for (const id of ['letter-combinations-of-a-phone-number', 'generate-parentheses', 'palindrome-partitioning'] as const) {
      const p = explorationProblems.find((p) => p.id === id)!, trace = runProblem(id, p.sample), stack: unknown[] = [];
      trace.frames.forEach((frame, i) => {
        if (frame.location === 'choose') stack.push(structuredClone(explorationView(trace.frames[i - 1]).tokens));
        if (frame.location === 'undo') expect(explorationView(frame).tokens).toEqual(stack.pop());
      }); expect(stack).toEqual([]);
    }
  });
  it('does not let new zeros propagate into unrelated rows/columns', () => {
    const matrix = [[1,1,1],[1,0,1],[1,1,1]], trace = runProblem('set-matrix-zeroes', { matrix });
    const marker = trace.frames.find((f) => f.location === 'mark')!;
    expect(marker.values).toEqual([1,0,1,0,0,1,1,1,1]); expect(explorationView(marker).arrows).toEqual([{ from: 4, to: 3 }, { from: 4, to: 1 }]);
    expect(trace.result).toEqual([[1,0,1],[0,0,0],[1,0,1]]);
  });
});

describe('strict input rejection', () => {
  const invalid: [ProblemId, unknown][] = [
    ['letter-combinations-of-a-phone-number', { digits: '10' }], ['letter-combinations-of-a-phone-number', { digits: '2345' }],
    ['generate-parentheses', { n: -1 }], ['generate-parentheses', { n: 5 }], ['generate-parentheses', { n: 1.5 }],
    ['palindrome-partitioning', { s: 'aaaaaaaa' }], ['palindrome-partitioning', { s: '中文' }],
    ['word-search', { board: [['A','B'],['C']], word: 'A' }], ['word-search', { board: [['AB']], word: 'AB' }], ['word-search', { board: [['A']], word: 'ABCDE' }],
    ['n-queens', { n: 0 }], ['n-queens', { n: 6 }], ['number-of-islands', { grid: [[2]] }], ['rotting-oranges', { grid: [[3]] }],
    ['course-schedule', { numCourses: 1, prerequisites: [[1,0]] }], ['course-schedule', { numCourses: 2, prerequisites: [[1,0],[1,0]] }],
    ['course-schedule', { numCourses: 0, prerequisites: [[0,0]] }], ['course-schedule', { numCourses: 11, prerequisites: [] }],
    ['spiral-matrix', { matrix: [[]] }], ['set-matrix-zeroes', { matrix: [[1],[2,3]] }], ['set-matrix-zeroes', { matrix: [[10001]] }],
    ['number-of-islands', { grid: Array.from({ length: 7 }, () => [0]) }], ['spiral-matrix', { matrix: [[1]], extra: true }],
  ];
  for (const [id, input] of invalid) it(`rejects ${id} ${JSON.stringify(input)}`, () => expect(() => runProblem(id, input)).toThrow());
});
