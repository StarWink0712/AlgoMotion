import { describe, expect, it } from 'vitest';
import { advancedCases } from './advanced-cases';
import { advancedProblems } from '../src/engine/presets/advanced-catalog';
import { runProblem } from '../src/engine/run';
import { describeFrame } from '../src/engine/presentation';
import { treeView } from '../src/engine/presets/trees';
import { linkedListView } from '../src/engine/presets/linked-lists';
import { cacheView, searchView } from '../src/engine/presets/search-cache';
import { codeLanguages, type ProblemId } from '../src/engine/types';

// Authored for consolidated acceptance; no model, container or native code is used here.
const canonical = (items: number[][]) => items.map((a) => JSON.stringify(a)).sort();
interface Node { value: number; children: Node[]; left: Node | null; right: Node | null; parent: Node | null }
function objectTree(values: (number | null)[]) {
  const make = (value: number, parent: Node | null): Node => ({ value, parent, children: [], left: null, right: null });
  const nodes: Node[] = values.length && values[0] !== null ? [make(values[0], null)] : [];
  let cursor = 1;
  for (const parent of nodes) for (const side of ['left', 'right'] as const) {
    if (cursor >= values.length) break;
    const value = values[cursor++]; if (value === null) continue;
    const node = make(value, parent); parent[side] = node; parent.children.push(node); nodes.push(node);
  }
  return nodes;
}
function orders(root: Node | null, pre: number[] = [], ino: number[] = []) {
  if (root) { pre.push(root.value); orders(root.left, pre, ino); ino.push(root.value); orders(root.right, pre, ino); }
  return { preorder: pre, inorder: ino };
}
function allPathMaximum(nodes: Node[]) {
  let best = -Infinity;
  for (const start of nodes) {
    const queue: [Node, Node | null, number][] = [[start, null, start.value]];
    for (const [node, previous, sum] of queue) {
      best = Math.max(best, sum);
      for (const neighbor of [...node.children, ...(node.parent ? [node.parent] : [])]) if (neighbor !== previous) queue.push([neighbor, node, sum + neighbor.value]);
    }
  }
  return best;
}
function ancestorPathCount(nodes: Node[], target: number) {
  let total = 0;
  for (const end of nodes) { let sum = 0; for (let node: Node | null = end; node; node = node.parent) { sum += node.value; if (sum === target) total++; } }
  return total;
}
const ancestors = (node: Node) => { const result: Node[] = []; for (let n: Node | null = node; n; n = n.parent) result.push(n); return result; };
let seed = 731;
const rand = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
function permutationOracle(nums: number[]) {
  let out: number[][] = [[]];
  for (const value of nums) out = out.flatMap((p) => Array.from({ length: p.length + 1 }, (_, i) => [...p.slice(0, i), value, ...p.slice(i)]));
  return out;
}
function combinationsByCounts(candidates: number[], target: number) {
  const nums = [...candidates].sort((a, b) => a - b), out: number[][] = [];
  const count = (i: number, sum: number, chosen: number[]) => {
    if (i === nums.length) { if (sum === target) out.push(chosen); return; }
    for (let copies = 0; sum + copies * nums[i] <= target; copies++) count(i + 1, sum + copies * nums[i], [...chosen, ...Array(copies).fill(nums[i])]);
  };
  count(0, 0, []); return out;
}

describe('batch 7 result fixtures and immutable semantic snapshots', () => {
  for (const [id, input, expected] of advancedCases) it(`${id} ${JSON.stringify(input)}`, () => {
    const before = JSON.stringify(input), trace = runProblem(id, input), problem = advancedProblems.find((p) => p.id === id)!;
    expect(trace.result).toEqual(expected); expect(JSON.stringify(input)).toBe(before); expect(trace.frames.length).toBeLessThanOrEqual(1000);
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
    trace.frames.forEach((frame, index) => {
      expect(frame.step).toBe(index); expect(describeFrame(id, frame).equation).not.toMatch(/undefined|NaN/);
      expect(frame.result === undefined || index === trace.frames.length - 1).toBe(true);
      for (const lang of codeLanguages) expect(problem.code[lang].locations[frame.location]).toBeGreaterThan(0);
      for (const node of frame.active) expect(node >= 0 && node < frame.values.length).toBe(true);
    });
    const first = structuredClone(trace.frames[0]); trace.frames.at(-1)!.values.push(999);
    expect(trace.frames[0]).toEqual(first);
    for (const lang of codeLanguages) expect(Object.keys(problem.code[lang].locations).sort()).toEqual(Object.keys(problem.code.java.locations).sort());
  });
});

describe('independent tree enumeration and identity checks', () => {
  it('compares 120 shapes against ancestor walks, graph paths, ancestor sets and known traversals', () => {
    for (let trial = 0; trial < 120; trial++) {
      const size = 1 + rand(15), values = Array.from({ length: size }, () => rand(19) - 9), nodes = objectTree(values);
      const targetSum = rand(21) - 10;
      expect(runProblem('path-sum-iii', { tree: values, targetSum }).result).toBe(ancestorPathCount(nodes, targetSum));
      const maxTrace = runProblem('binary-tree-maximum-path-sum', { tree: values }); expect(maxTrace.result).toBe(allPathMaximum(nodes));
      const path = treeView(maxTrace.frames.at(-1)!).path;
      expect(path.length).toBeGreaterThan(0); expect(new Set(path).size).toBe(path.length);
      expect(path.reduce((sum, id) => sum + values[id], 0)).toBe(maxTrace.result);
      for (let i = 1; i < path.length; i++) expect(nodes[path[i]].parent === nodes[path[i - 1]] || nodes[path[i - 1]].parent === nodes[path[i]]).toBe(true);
      const p = rand(size), q = rand(size), common = ancestors(nodes[p]).find((n) => ancestors(nodes[q]).includes(n))!;
      const lca = runProblem('lowest-common-ancestor-of-a-binary-tree', { tree: values, p, q });
      expect(lca.result).toEqual({ id: nodes.indexOf(common), value: common.value });
      for (const frame of lca.frames) { expect(frame.values).toEqual(values); expect(frame.links).toEqual(lca.frames[0].links); }
      const unique = objectTree(Array.from({ length: size }, (_, i) => i - 7)), input = orders(unique[0]);
      const build = runProblem('construct-binary-tree-from-preorder-and-inorder-traversal', input);
      expect(build.result).toEqual(unique.map((n) => n.value)); expect(build.frames[0].values).toEqual([]);
      const built = objectTree(build.result as number[]); expect(orders(built[0])).toEqual(input);
      let allocated = 0;
      for (const frame of build.frames) { if (frame.location === 'create') allocated++; expect(frame.values.length).toBe(allocated); expect(treeView(frame).slots.length).toBe(allocated); }
    }
  });
  it('counts repeated prefixes separately and removes them before a sibling', () => {
    const trace = runProblem('path-sum-iii', { tree: [0, 0, 0], targetSum: 0 });
    expect(trace.result).toBe(5);
    for (const frame of trace.frames.filter((f) => f.location === 'lookup')) {
      const view = treeView(frame); expect(view.matches!.length).toBe(frame.variables.found);
      for (const path of view.matches!) { expect(path.length).toBeGreaterThan(0); expect(path.reduce((sum, id) => sum + Number(frame.values[id]), 0)).toBe(0); }
    }
    expect(treeView(trace.frames.at(-1)!).frequencies).toEqual([{ label: '0', value: 1 }]);
  });
});

describe('linked sorting preserves objects rather than rewriting values', () => {
  for (const id of ['sort-list', 'merge-k-sorted-lists'] as const) it(`${id}: 120 independent stable order comparisons`, () => {
    for (let trial = 0; trial < 120; trial++) {
      const inputs = id === 'sort-list' ? [Array.from({ length: rand(13) }, () => rand(7) - 3)] : Array.from({ length: rand(5) }, () => Array.from({ length: rand(5) }, () => rand(7) - 3).sort((a, b) => a - b));
      const flat = inputs.flat(), trace = runProblem(id, id === 'sort-list' ? { values: flat } : { lists: inputs });
      const expected = flat.map((value, id) => ({ value, id })).sort((a, b) => a.value - b.value);
      expect(trace.result).toEqual(expected.map((n) => n.value));
      const end = trace.frames.at(-1)!, view = linkedListView(end);
      expect(view.output).toEqual(expected.map((n) => n.id));
      expect(new Map(end.links)).toEqual(new Map(view.output.slice(0, -1).map((node, i) => [node, view.output[i + 1]])));
      for (const frame of trace.frames) { expect(frame.values).toEqual(flat); expect(new Set((frame.links ?? []).map(([n]) => n)).size).toBe(frame.links!.length); }
    }
  });
});

describe('backtracking oracles and capacity bounds', () => {
  it('compares 120 inputs per algorithm with insertion, bit masks and count-vector enumeration', () => {
    for (let trial = 0; trial < 120; trial++) {
      const nums = Array.from({ length: rand(6) }, (_, i) => 2 * i - 3).reverse();
      expect(canonical(runProblem('permutations', { nums }).result as number[][])).toEqual(canonical(permutationOracle(nums)));
      const subsets = Array.from({ length: 2 ** nums.length }, (_, mask) => nums.filter((_, i) => mask & (1 << i)));
      expect(canonical(runProblem('subsets', { nums }).result as number[][])).toEqual(canonical(subsets));
      const candidates = Array.from({ length: rand(6) }, (_, i) => i + 1).reverse(), target = rand(11);
      expect(canonical(runProblem('combination-sum', { candidates, target }).result as number[][])).toEqual(canonical(combinationsByCounts(candidates, target)));
    }
  });
  for (const [id, input] of [
    ['permutations', { nums: [1, 2, 3, 4, 5] }], ['subsets', { nums: [1, 2, 3, 4, 5, 6, 7] }], ['combination-sum', { candidates: [1, 2, 3, 4, 5], target: 10 }],
  ] as [ProblemId, unknown][]) it(`${id}: full allowed search stays bounded and undo restores parent state`, () => {
    const trace = runProblem(id, input); expect(trace.frames.length).toBeLessThanOrEqual(1000); let collected = 0;
    const beforeChoices: ReturnType<typeof searchView>[] = [];
    trace.frames.forEach((frame, i) => {
      const view = searchView(frame);
      if (frame.location === 'save') collected++;
      expect(view.answers.length).toBe(collected);
      if (frame.location === 'choose') beforeChoices.push(structuredClone(searchView(trace.frames[i - 1])));
      if (frame.location === 'undo') {
        const parent = beforeChoices.pop()!; expect(view.path).toEqual(parent.path); expect(view.remaining).toBe(parent.remaining);
        expect(view.removed).toBeDefined();
      }
      if (id === 'permutations') expect(new Set(view.path.map((c) => c.source)).size).toBe(view.path.length);
      if (id === 'combination-sum') expect(view.path.reduce((sum, c) => sum + Number(frame.values[c.source]), 0) + view.remaining!).toBe(10);
    });
    expect(beforeChoices).toEqual([]); expect(searchView(trace.frames.at(-1)!).path).toEqual([]);
  });
});

describe('LRU uses independent array ordering as oracle', () => {
  it('checks 120 operation sequences, real prev/next symmetry and stable update identity', () => {
    for (let trial = 0; trial < 120; trial++) {
      const capacity = 1 + rand(6), operations = Array.from({ length: 24 }, () => rand(3) ? { op: 'put' as const, key: rand(9), value: rand(7) - 3 } : { op: 'get' as const, key: rand(9) });
      let order: { key: number; value: number }[] = []; const answers: (number | null)[] = [];
      const expectedOrders: number[][] = [];
      for (const op of operations) {
        const index = order.findIndex((n) => n.key === op.key), found = index < 0 ? null : order[index];
        if (op.op === 'get' && !found) answers.push(-1);
        else { const item = op.op === 'put' ? { key: op.key, value: op.value } : found!; order = [item, ...order.filter((n) => n.key !== op.key)].slice(0, capacity); answers.push(op.op === 'get' ? item.value : null); }
        expectedOrders.push(order.map((n) => n.key));
      }
      const trace = runProblem('lru-cache', { capacity, operations }); expect(trace.result).toEqual(answers);
      for (const frame of trace.frames) {
        const view = cacheView(frame);
        expect(view.entries.map((n) => n.id)).toEqual(view.order);
        expect(new Map(view.lookup)).toEqual(new Map(view.entries.map((n) => [n.key, n.id])));
        view.entries.forEach((n, i) => { expect(n.prev).toBe(view.order[i - 1] ?? null); expect(n.next).toBe(view.order[i + 1] ?? null); });
        expect(view.order.length).toBeLessThanOrEqual(capacity + (frame.location === 'insert' ? 1 : 0));
        if (frame.location === 'output' || frame.location === 'miss') expect(view.entries.map((n) => n.key)).toEqual(expectedOrders[view.operationIndex]);
      }
    }
    const updated = runProblem('lru-cache', { capacity: 1, operations: [{ op: 'put', key: 2, value: 3 }, { op: 'put', key: 2, value: 4 }] });
    expect(updated.frames.at(-1)!.values).toHaveLength(1); expect(cacheView(updated.frames.at(-1)!).entries[0].id).toBe(0);
  });
});

describe('strict visual input contracts', () => {
  const invalid: [ProblemId, unknown][] = [
    ['construct-binary-tree-from-preorder-and-inorder-traversal', { preorder: [1, 1], inorder: [1, 1] }],
    ['construct-binary-tree-from-preorder-and-inorder-traversal', { preorder: [1, 2, 3], inorder: [3, 1, 2] }],
    ['construct-binary-tree-from-preorder-and-inorder-traversal', { preorder: [1], inorder: [2] }],
    ['construct-binary-tree-from-preorder-and-inorder-traversal', { preorder: [1, 2, 3, 4, 5, 6], inorder: [1, 2, 3, 4, 5, 6] }],
    ['path-sum-iii', { tree: [null, 1], targetSum: 0 }], ['path-sum-iii', { tree: [1, null, null, 2], targetSum: 0 }],
    ['lowest-common-ancestor-of-a-binary-tree', { tree: [], p: 0, q: 0 }], ['lowest-common-ancestor-of-a-binary-tree', { tree: [1, null, 2], p: 2, q: 0 }],
    ['binary-tree-maximum-path-sum', { tree: [] }], ['binary-tree-maximum-path-sum', { tree: [null] }],
    ['sort-list', { values: Array(13).fill(0) }], ['merge-k-sorted-lists', { lists: [[2, 1]] }], ['merge-k-sorted-lists', { lists: [Array(9).fill(1), Array(9).fill(1)] }],
    ['lru-cache', { capacity: 0, operations: [] }], ['lru-cache', { capacity: 1, operations: [{ op: 'get', key: 0, value: 1 }] }],
    ['lru-cache', { capacity: 1, operations: [{ op: 'put', key: 1 }] }], ['lru-cache', { capacity: 1, operations: Array(25).fill({ op: 'get', key: 0 }) }],
    ['permutations', { nums: [1, 1] }], ['permutations', { nums: [1, 2, 3, 4, 5, 6] }], ['subsets', { nums: Array.from({ length: 8 }, (_, i) => i) }],
    ['combination-sum', { candidates: [0, 1], target: 1 }], ['combination-sum', { candidates: [-1], target: 1 }], ['combination-sum', { candidates: [1, 1], target: 2 }], ['combination-sum', { candidates: [1], target: 11 }],
  ];
  for (const [id, input] of invalid) it(`rejects ${id}: ${JSON.stringify(input)}`, () => expect(() => runProblem(id, input)).toThrow());
});
