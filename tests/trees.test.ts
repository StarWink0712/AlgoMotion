import { describe, expect, it } from 'vitest';
import { problems } from '../src/engine/catalog';
import { runProblem } from '../src/engine/run';
import { describeFrame } from '../src/engine/presentation';
import { treeSchemas, treeView } from '../src/engine/presets/trees';
import { codeLanguages, type Frame, type ProblemId } from '../src/engine/types';
import { treeCases } from './tree-cases';

// Authored for consolidated acceptance; not run during incremental additions.
function children(frame: Frame, node: number) {
  const edges = (frame.links ?? []).filter(([from]) => from === node);
  return ['L', 'R'].map((side) => edges.find(([from, to]) => frame.edgeLabels![`${from}-${to}`] === side)?.[1] ?? null);
}
function preorderIds(frame: Frame, root: number | null = frame.values.length ? 0 : null): number[] {
  if (root === null) return [];
  const [left, right] = children(frame, root);
  return [root, ...preorderIds(frame, left), ...preorderIds(frame, right)];
}

describe('tree presets', () => {
  it.each(treeCases)('%s fixture %j', (id, input, expected) => {
    const before = structuredClone(input), trace = runProblem(id, input), problem = problems.find((p) => p.id === id)!;
    expect(trace.result).toEqual(expected); expect(input).toEqual(before);
    expect(runProblem(id, input)).toEqual(trace); expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
    for (const frame of trace.frames) {
      const view = treeView(frame);
      expect(view.slots.map((s) => s.id).sort((a, b) => a - b)).toEqual(frame.values.map((_, i) => i));
      const edgeKeys = frame.links!.map(([from, to]) => `${from}:${frame.edgeLabels![`${from}-${to}`]}`);
      expect(new Set(edgeKeys).size).toBe(edgeKeys.length);
      for (const index of [...frame.active, ...frame.settled, ...frame.links!.flat(), ...view.output, ...view.path]) expect(index >= 0 && index < frame.values.length).toBe(true);
      for (const edge of view.changed) { expect(frame.links).toContainEqual([edge.from, edge.to]); expect(frame.edgeLabels![`${edge.from}-${edge.to}`]).toBe(edge.side); }
      for (const edge of view.retired) expect(frame.edgeLabels![`${edge.from}-${edge.to}`]).not.toBe(edge.side);
      for (const language of codeLanguages) expect(problem.code[language].locations[frame.location], `${id}/${language}/${frame.location}`).toBeGreaterThan(0);
      expect(describeFrame(id, frame).equation).not.toMatch(/undefined|NaN|Infinity/);
    }
    const first = structuredClone(trace.frames[0]); treeView(trace.frames.at(-1)!).slots.push({ id: 999, depth: 0, slot: 0 });
    expect(trace.frames[0]).toEqual(first);
  });

  it.each([
    ['binary-tree-inorder-traversal', { tree: [null, 1] }],
    ['maximum-depth-of-binary-tree', { tree: [1, null, null, 2] }],
    ['maximum-depth-of-binary-tree', { tree: [1, null, 2, null, 3, null, 4, null, 5, null, 6] }],
    ['invert-binary-tree', { tree: Array(32).fill(null) }], ['symmetric-tree', { tree: Array(16).fill(1) }],
    ['diameter-of-binary-tree', { tree: ['1'] }], ['binary-tree-right-side-view', { tree: [1], extra: true }],
    ['flatten-binary-tree-to-linked-list', { tree: [10001] }],
    ['convert-sorted-array-to-binary-search-tree', { nums: [2, 1] }],
    ['convert-sorted-array-to-binary-search-tree', { nums: [1, 1] }],
    ['convert-sorted-array-to-binary-search-tree', { nums: Array.from({ length: 16 }, (_, i) => i) }],
    ['kth-smallest-element-in-a-bst', { tree: [], k: 1 }],
    ['kth-smallest-element-in-a-bst', { tree: [2, 1, 2], k: 1 }],
    ['kth-smallest-element-in-a-bst', { tree: [5, 1, 7, null, null, 4, 8], k: 1 }],
    ['kth-smallest-element-in-a-bst', { tree: [1], k: 0 }], ['kth-smallest-element-in-a-bst', { tree: [1], k: 2 }],
    ['kth-smallest-element-in-a-bst', { tree: [1], k: 1.5 }],
  ] as [ProblemId, unknown][])('rejects malformed %s input %j', (id, input) => expect(() => runProblem(id, input)).toThrow());

  it('keeps the original level-order parser behavior and limits after extraction', () => {
    expect(runProblem('binary-tree-level-order-traversal', { tree: [1, null, 2, 3] }).result).toEqual([[1], [2], [3]]);
    expect(() => runProblem('binary-tree-level-order-traversal', { tree: Array(16).fill(null) })).toThrow();
  });

  it('distinguishes depth in nodes from diameter in edges and finds a diameter outside the root', () => {
    const tree = [0, 1, null, 2, 3, 4, null, null, 5, 6, null, null, 7];
    expect(runProblem('maximum-depth-of-binary-tree', { tree }).result).toBe(5);
    const trace = runProblem('diameter-of-binary-tree', { tree }), final = trace.frames.at(-1)!, path = treeView(final).path;
    expect(trace.result).toBe(6); expect(path).toHaveLength(7); expect(path).not.toContain(0);
    expect(new Set(path).size).toBe(path.length);
    for (let i = 1; i < path.length; i++) expect(final.links!.some(([a, b]) => (a === path[i - 1] && b === path[i]) || (b === path[i - 1] && a === path[i]))).toBe(true);
    for (const frame of trace.frames.filter((f) => f.location === 'height')) expect(frame.variables.height).toBe(Math.max(Number(frame.variables.left), Number(frame.variables.right)) + 1);
  });

  it('swaps child sides on the same equal-valued nodes', () => {
    const trace = runProblem('invert-binary-tree', { tree: [7, 7, 7] }), final = trace.frames.at(-1)!;
    expect(final.values).toEqual(trace.frames[0].values);
    expect(children(trace.frames[0], 0)).toEqual([1, 2]); expect(children(final, 0)).toEqual([2, 1]);
    const swap = trace.frames.find((f) => f.location === 'swap')!;
    expect(treeView(swap).beforeSlots).toEqual(treeView(trace.frames[0]).slots);
    expect(treeView(swap).slots.find((s) => s.id === 1)?.slot).toBe(1);
  });

  it('rejects an ancestor-bound violation rather than only checking parent-child order', () => {
    const trace = runProblem('validate-binary-search-tree', { tree: [5, 1, 7, null, null, 4, 8] });
    const rejected = trace.frames.find((f) => f.location === 'reject')!;
    expect(treeView(rejected).bounds).toEqual({ node: 3, low: 5, high: 7 });
    expect(trace.result).toBe(false);
  });

  it('does not output future inorder values when kth-smallest returns early', () => {
    const trace = runProblem('kth-smallest-element-in-a-bst', { tree: [3, 1, 4, null, 2], k: 1 });
    expect(treeView(trace.frames.at(-1)!).output).toEqual([1]);
    expect(trace.frames.filter((f) => f.location === 'visit')).toHaveLength(1);
    expect(trace.frames.every((f) => f.links?.length === 3)).toBe(true);
  });

  it('actually rewires flattening instead of returning a preorder array from the unchanged tree', () => {
    const trace = runProblem('flatten-binary-tree-to-linked-list', { tree: [7, 7, 7, 7, 7] });
    const expected = preorderIds(trace.frames[0]), final = trace.frames.at(-1)!;
    expect(treeView(final).output).toEqual(expected);
    expect(final.values).toEqual(trace.frames[0].values);
    expect(final.links).toHaveLength(expected.length - 1);
    expected.forEach((id, i) => expect(children(final, id)).toEqual([null, expected[i + 1] ?? null]));
    expect(trace.frames.some((f) => f.location === 'bridge' && treeView(f).changed.length > 0)).toBe(true);
  });

  it('records only allocated construction nodes and completed right-side levels', () => {
    const built = runProblem('convert-sorted-array-to-binary-search-tree', { nums: [1, 2, 3, 4, 5] });
    expect(built.frames[0].values).toEqual([]);
    let created = 0;
    for (const frame of built.frames) { if (frame.location === 'create') created++; expect(frame.values).toHaveLength(created); }
    expect(created).toBe(5);
    const visible = runProblem('binary-tree-right-side-view', { tree: [1, 2, 3, 4, null, null, null, 5] });
    expect(treeView(visible.frames[0]).output).toEqual([]);
    expect(visible.result).toEqual([1, 3, 4, 5]);
    expect(treeView(visible.frames.at(-1)!).path).toEqual([]); // Right view is not necessarily a connected path.
  });
});

interface RefNode { value: number; left: RefNode | null; right: RefNode | null }
function encode(root: RefNode | null): (number | null)[] {
  const queue = root ? [root] as (RefNode | null)[] : [], out: (number | null)[] = [];
  for (const node of queue) { out.push(node?.value ?? null); if (node) queue.push(node.left, node.right); }
  while (out.at(-1) === null) out.pop(); return out;
}
function decode(values: (number | null)[]): RefNode | null {
  if (!values.length || values[0] === null) return null;
  const root: RefNode = { value: values[0], left: null, right: null }, queue = [root]; let pos = 1;
  for (const node of queue) for (const side of ['left', 'right'] as const) {
    if (pos >= values.length) break;
    const value = values[pos++]; if (value !== null) { node[side] = { value, left: null, right: null }; queue.push(node[side]!); }
  }
  return root;
}
const inorder = (node: RefNode | null): number[] => node ? [...inorder(node.left), node.value, ...inorder(node.right)] : [];
const pre = (node: RefNode | null): number[] => node ? [node.value, ...pre(node.left), ...pre(node.right)] : [];
const mirror = (node: RefNode | null): RefNode | null => node ? { value: node.value, left: mirror(node.right), right: mirror(node.left) } : null;
function balancedHeight(node: RefNode | null): number {
  if (!node) return 0;
  const left = balancedHeight(node.left), right = balancedHeight(node.right);
  expect(Math.abs(left - right)).toBeLessThanOrEqual(1); return Math.max(left, right) + 1;
}

describe('independent tree oracles (deferred)', () => {
  let seed = 602;
  const random = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed >>> 8) % n; };
  const run = (id: ProblemId, input: unknown) => runProblem(id, input).result;
  it('compares 120 cases per preset with object trees, graph distances, DFS view and structural checks', () => {
    for (let test = 0; test < 120; test++) {
      let budget = 15;
      const make = (depth: number): RefNode | null => {
        if (!budget || depth > 4 || random(4) === 0) return null;
        budget--; return { value: random(11) - 5, left: make(depth + 1), right: make(depth + 1) };
      };
      const root = make(0), tree = encode(root), order = inorder(root);
      expect(run('binary-tree-inorder-traversal', { tree })).toEqual(order);
      const levels: [RefNode, number][] = root ? [[root, 1]] : [], graph = new Map<RefNode, RefNode[]>(); let depth = 0;
      for (const [node, level] of levels) {
        depth = Math.max(depth, level); if (!graph.has(node)) graph.set(node, []);
        for (const child of [node.left, node.right]) if (child) { levels.push([child, level + 1]); graph.get(node)!.push(child); graph.set(child, [node]); }
      }
      expect(run('maximum-depth-of-binary-tree', { tree })).toBe(depth);
      let diameter = 0;
      for (const node of graph.keys()) {
        const seen = new Set([node]), queue: [RefNode, number][] = [[node, 0]];
        for (const [current, distance] of queue) { diameter = Math.max(diameter, distance); for (const next of graph.get(current)!) if (!seen.has(next)) { seen.add(next); queue.push([next, distance + 1]); } }
      }
      expect(run('diameter-of-binary-tree', { tree })).toBe(diameter);
      const inverted = run('invert-binary-tree', { tree }); expect(inverted).toEqual(encode(mirror(root)));
      expect(run('invert-binary-tree', { tree: inverted })).toEqual(tree);
      expect(run('symmetric-tree', { tree })).toBe(!root || JSON.stringify(encode(root.left)) === JSON.stringify(encode(mirror(root.right))));
      expect(run('validate-binary-search-tree', { tree })).toBe(order.every((value, i) => i === 0 || order[i - 1] < value));
      const right: number[] = [];
      const rightFirst = (node: RefNode | null, level: number) => { if (!node) return; if (right[level] === undefined) right[level] = node.value; rightFirst(node.right, level + 1); rightFirst(node.left, level + 1); };
      rightFirst(root, 0); expect(run('binary-tree-right-side-view', { tree })).toEqual(right);
      expect(run('flatten-binary-tree-to-linked-list', { tree })).toEqual(pre(root));
      const nums = Array.from({ length: random(16) }, (_, i) => i * 3 - 20);
      const built = decode(run('convert-sorted-array-to-binary-search-tree', { nums }) as (number | null)[]);
      expect(inorder(built)).toEqual(nums); balancedHeight(built);
      const bst = decode(tree) ?? { value: 0, left: null, right: null }; let index = 0;
      const assign = (node: RefNode | null) => { if (!node) return; assign(node.left); node.value = index++ * 2 - 15; assign(node.right); };
      assign(bst); const k = random(index) + 1;
      expect(run('kth-smallest-element-in-a-bst', { tree: encode(bst), k })).toBe(inorder(bst)[k - 1]);
    }
  });

  it('covers maximum teaching capacities and long flattened chains without excessive traces', () => {
    for (const id of Object.keys(treeSchemas) as (keyof typeof treeSchemas)[]) {
      const input = id === 'convert-sorted-array-to-binary-search-tree' ? { nums: Array.from({ length: 15 }, (_, i) => i) }
        : id === 'kth-smallest-element-in-a-bst' ? { tree: [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15], k: 15 }
        : { tree: Array.from({ length: 15 }, (_, i) => i) };
      const trace = runProblem(id, input);
      expect(trace.frames.length).toBeLessThan(1000);
      expect(trace.frames.every((f) => f.values.length <= 15 && treeView(f).maxDepth <= 4)).toBe(true);
    }
  });
});
