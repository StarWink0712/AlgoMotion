import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import type { Verification } from '../../src/engine/generated';

const point = z.tuple([z.number().int().min(0), z.number().int().min(0)]);
const grid = z.array(z.array(z.number().int().min(0).max(1_000_000)).min(1).max(12)).min(1).max(12)
  .refine((g) => g.every((row) => row.length === g[0].length), 'Grid must be rectangular');
export const verificationDescriptions: Record<Verification, string> = {
  none: '无独立验证器；模型样例通过不代表题意正确。',
  'grid-shortest-4': '固定约定：input={grid,start,end}；0 可走、1 障碍、四邻接；距离按边数；返回 {distance,path:[[r,c],...] }；无解 distance=-1,path=[]。',
  'grid-min-right-down': '固定约定：input={grid}；非负整数矩形；左上到右下，仅右/下，包含起终点权重；返回 {sum,path:[[r,c],...] }。',
};
export function verifierInput(kind: Verification, input: unknown) {
  if (kind === 'none') return;
  if (kind === 'grid-shortest-4') {
    const data = z.object({ grid, start: point, end: point }).strict().parse(input);
    if (data.grid.flat().some((n) => n !== 0 && n !== 1) || [data.start, data.end].some(([r, c]) => r >= data.grid.length || c >= data.grid[0].length)) throw new Error('独立验证器要求 0/1 网格，起终点必须在网格内。');
  } else z.object({ grid }).strict().parse(input);
}

// Trusted independent reference: repeated edge relaxation, not generated Python.
// Only the explicitly selected semantics above are claimed as independently checked.
export function verifyResult(kind: Verification, input: unknown, result: unknown): boolean {
  if (kind === 'none') return false;
  try {
    verifierInput(kind, input);
    const data = input as { grid: number[][]; start?: [number, number]; end?: [number, number] };
    const g = data.grid, rows = g.length, cols = g[0].length, count = rows * cols;
    const shortest = kind === 'grid-shortest-4';
    const start = shortest ? data.start! : [0, 0], end = shortest ? data.end! : [rows - 1, cols - 1];
    const sid = start[0] * cols + start[1], eid = end[0] * cols + end[1];
    const distances = Array<number>(count).fill(Infinity);
    if (!shortest || g[start[0]][start[1]] === 0) distances[sid] = shortest ? 0 : g[0][0];
    const moves = shortest ? [[0, 1], [1, 0], [0, -1], [-1, 0]] : [[0, 1], [1, 0]];
    for (let iteration = 0; iteration < count; iteration++) {
      let changed = false;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (shortest && g[r][c] !== 0) continue;
        for (const [dr, dc] of moves) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || shortest && g[nr][nc] !== 0) continue;
          const next = distances[r * cols + c] + (shortest ? 1 : g[nr][nc]);
          if (next < distances[nr * cols + nc]) { distances[nr * cols + nc] = next; changed = true; }
        }
      }
      if (!changed) break;
    }
    const output = shortest
      ? z.object({ distance: z.number().int(), path: z.array(point).max(144) }).strict().parse(result)
      : z.object({ sum: z.number().finite(), path: z.array(point).max(144) }).strict().parse(result);
    const path = output.path, optimum = distances[eid];
    const value = 'distance' in output ? output.distance : output.sum;
    if (!Number.isFinite(optimum)) return value === -1 && path.length === 0;
    if (value !== optimum || !path.length || !isDeepStrictEqual(path[0], start) || !isDeepStrictEqual(path.at(-1), end)) return false;
    let sum = 0;
    for (let i = 0; i < path.length; i++) {
      const [r, c] = path[i];
      if (r >= rows || c >= cols || shortest && g[r][c] !== 0) return false;
      sum += g[r][c];
      if (i > 0 && !moves.some(([dr, dc]) => r - path[i - 1][0] === dr && c - path[i - 1][1] === dc)) return false;
    }
    return shortest ? path.length - 1 === optimum : sum === optimum;
  } catch { return false; }
}
export function exampleMatches(kind: Verification, input: unknown, actual: unknown, expected: unknown) {
  if (kind === 'none') return isDeepStrictEqual(actual, expected);
  if (!verifyResult(kind, input, actual) || !verifyResult(kind, input, expected)) return false;
  // Both paths are legal and optimal. No arbitrary tie-breaking requirement.
  return true;
}
export function independentCases(kind: Verification): unknown[] {
  if (kind === 'grid-shortest-4') return [
    { grid: [[0]], start: [0, 0], end: [0, 0] },
    { grid: [[0, 1], [1, 0]], start: [0, 0], end: [1, 1] },
    { grid: [[1]], start: [0, 0], end: [0, 0] },
    { grid: [[0, 0, 0, 0]], start: [0, 3], end: [0, 0] },
    { grid: [[0, 0, 0], [0, 1, 0], [0, 0, 0]], start: [0, 0], end: [2, 2] },
    { grid: Array.from({ length: 12 }, () => Array(12).fill(0)), start: [0, 0], end: [11, 11] },
  ];
  if (kind === 'grid-min-right-down') return [
    { grid: [[0]] }, { grid: [[7, 0, 2]] }, { grid: [[5], [1], [3]] },
    { grid: [[1, 2, 1], [1, 9, 1], [1, 1, 1]] }, { grid: [[0, 0], [0, 0]] },
    { grid: Array.from({ length: 12 }, () => Array(12).fill(1_000_000)) },
  ];
  return [];
}
