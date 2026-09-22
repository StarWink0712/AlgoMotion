import { describe, expect, it } from 'vitest';
import { problems } from '../src/engine/catalog';
import { runProblem } from '../src/engine/run';
import { describeFrame } from '../src/engine/presentation';
import { linkedListSchemas, linkedListView } from '../src/engine/presets/linked-lists';
import { codeLanguages, type Frame, type ProblemId } from '../src/engine/types';
import { linkedListCases } from './linked-list-cases';

// Batch 5 tests are authored here; execution is deferred by the user's workflow.
function reachable(frame: Frame, head: number | null): number[] {
  const next = new Map(frame.links), seen = new Set<number>(), result: number[] = [];
  while (head !== null && !seen.has(head)) { seen.add(head); result.push(head); head = next.get(head) ?? null; }
  return result;
}

describe('linked-list presets', () => {
  it.each(linkedListCases)('%s fixture %j', (id, input, expected) => {
    const before = structuredClone(input), trace = runProblem(id, input);
    expect(trace.result).toEqual(expected); expect(input).toEqual(before);
    expect(runProblem(id, input)).toEqual(trace);
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
    const problem = problems.find((p) => p.id === id)!;
    for (const frame of trace.frames) {
      const view = linkedListView(frame), indices = view.lanes.flatMap((lane) => lane.ids);
      expect([...indices].sort((a, b) => a - b)).toEqual(frame.values.map((_, i) => i));
      expect(new Set((frame.links ?? []).map(([from]) => from)).size).toBe(frame.links?.length);
      for (const language of codeLanguages) expect(problem.code[language].locations[frame.location], `${id}/${language}/${frame.location}`).toBeGreaterThan(0);
      const ids = [...frame.active, ...frame.settled, ...Object.values(frame.pointers).filter((v): v is number => v !== null), ...(frame.links ?? []).flat(), ...view.randomLinks.flat(), ...view.output];
      for (const node of ids) expect(node >= 0 && node < frame.values.length).toBe(true);
      for (const edge of view.changed) expect(frame.links).toContainEqual(edge);
      for (const edge of view.retired) expect(frame.links).not.toContainEqual(edge);
      expect(describeFrame(id, frame).equation).not.toMatch(/undefined|NaN|Infinity/);
    }
    const first = structuredClone(trace.frames[0]);
    linkedListView(trace.frames.at(-1)!).lanes[0].ids.push(999);
    expect(trace.frames[0]).toEqual(first);
  });

  it.each([
    ['intersection-of-two-linked-lists', { prefixA: Array(10).fill(1), prefixB: Array(9).fill(1), shared: [] }],
    ['intersection-of-two-linked-lists', { prefixA: [], prefixB: [], shared: ['1'] }],
    ['palindrome-linked-list', { values: Array(13).fill(1) }],
    ['linked-list-cycle', { values: [], pos: 0 }], ['linked-list-cycle', { values: [1], pos: 1 }],
    ['linked-list-cycle-ii', { values: [1], pos: -2 }], ['linked-list-cycle-ii', { values: [1], pos: 0.5 }],
    ['merge-two-sorted-lists', { a: [2, 1], b: [] }], ['merge-two-sorted-lists', { a: [], b: [1, -1] }],
    ['merge-two-sorted-lists', { a: Array(10).fill(0), b: Array(9).fill(1) }],
    ['add-two-numbers', { a: [], b: [1] }], ['add-two-numbers', { a: [10], b: [1] }],
    ['add-two-numbers', { a: [1, 0], b: [0] }], ['add-two-numbers', { a: Array(9).fill(9), b: [1] }],
    ['remove-nth-node-from-end-of-list', { values: [], n: 1 }], ['remove-nth-node-from-end-of-list', { values: [1], n: 2 }],
    ['remove-nth-node-from-end-of-list', { values: [1], n: 0 }], ['swap-nodes-in-pairs', { values: [1], extra: 1 }],
    ['reverse-nodes-in-k-group', { values: [1], k: 0 }], ['reverse-nodes-in-k-group', { values: [1], k: 1.5 }],
    ['copy-list-with-random-pointer', { nodes: [[1, -1]] }], ['copy-list-with-random-pointer', { nodes: [[1, 1]] }],
    ['copy-list-with-random-pointer', { nodes: [[1, 0, 0]] }], ['copy-list-with-random-pointer', { nodes: Array(11).fill([1, null]) }],
  ] as [ProblemId, unknown][])('rejects malformed %s input %j', (id, input) => expect(() => runProblem(id, input)).toThrow());

  it('compares intersection by identity, including equal-valued nonshared prefixes', () => {
    const trace = runProblem('intersection-of-two-linked-lists', { prefixA: [8, 8], prefixB: [8], shared: [8] });
    expect(trace.frames[0].values).toEqual([8, 8, 8, 8]);
    expect(trace.result).toEqual({ indexA: 2, indexB: 1, value: 8 });
    expect(trace.frames.at(-1)!.pointers).toEqual({ p: 3, q: 3 });
    for (const frame of trace.frames) expect(frame.links).toEqual(trace.frames[0].links);
    expect(runProblem('intersection-of-two-linked-lists', { prefixA: [8], prefixB: [8], shared: [] }).result).toBeNull();
  });

  it.each([[1, 2, 2, 1], [1, 2, 3, 1], [], [7]].map((values) => ({ values })))('restores palindrome input links and values for $values', ({ values }) => {
    const trace = runProblem('palindrome-linked-list', { values });
    expect(trace.frames.at(-1)!.values).toEqual(trace.frames[0].values);
    expect(trace.frames.at(-1)!.links).toEqual(trace.frames[0].links);
    if (values.length > 1) {
      expect(trace.frames.some((f) => f.location === 'reverse-link' && f.variables.phase === '恢复原链表')).toBe(true);
      expect(trace.frames.some((f) => f.location === 'restore')).toBe(true);
    }
  });

  it('represents a self-loop finitely and does not confuse initial pointer equality with a cycle', () => {
    const cyclic = runProblem('linked-list-cycle', { values: [5], pos: 0 });
    expect(cyclic.frames[0].links).toEqual([[0, 0]]);
    expect(cyclic.frames.some((f) => f.location === 'advance')).toBe(true);
    expect(cyclic.result).toBe(true);
    const acyclic = runProblem('linked-list-cycle', { values: [5], pos: -1 });
    expect(acyclic.result).toBe(false);
    expect(acyclic.frames).toHaveLength(2);
  });

  it('merges stable identities instead of sorting a value copy', () => {
    const trace = runProblem('merge-two-sorted-lists', { a: [1, 1, 3], b: [1, 2, 3] }), final = trace.frames.at(-1)!;
    expect(linkedListView(final).output).toEqual([0, 1, 3, 4, 2, 5]);
    expect(final.values.slice(0, 6)).toEqual([1, 1, 3, 1, 2, 3]);
    expect(reachable(final, linkedListView(final).heads.result)).toEqual(linkedListView(final).output);
    expect(final.values).toHaveLength(7); // Six reused nodes and one sentinel only.
  });

  it('removes the correct duplicate node without pretending the object was destroyed', () => {
    const trace = runProblem('remove-nth-node-from-end-of-list', { values: [7, 7, 7], n: 2 }), final = trace.frames.at(-1)!;
    expect(linkedListView(final).output).toEqual([0, 2]);
    expect(linkedListView(final).detached).toEqual([1]);
    expect(final.values[1]).toBe(7);
    expect(final.links).toContainEqual([1, 2]); // The detached object's next was not cleared by the algorithm.
  });

  it('reorders equal-valued nodes by actual links for pairs and k-groups', () => {
    for (const [id, input, expected] of [
      ['swap-nodes-in-pairs', { values: [7, 7, 7, 7, 7] }, [1, 0, 3, 2, 4]],
      ['reverse-nodes-in-k-group', { values: [7, 7, 7, 7, 7], k: 3 }, [2, 1, 0, 3, 4]],
    ] as [ProblemId, unknown, number[]][]) {
      const trace = runProblem(id, input), final = trace.frames.at(-1)!, view = linkedListView(final);
      expect(view.output).toEqual(expected);
      expect(reachable(final, view.heads.result)).toEqual(expected);
      expect(final.values.slice(0, 5)).toEqual(Array(5).fill(7));
    }
  });

  it('allocates a disjoint random-pointer graph and never mutates the original', () => {
    const nodes = [[1, 2], [1, 0], [1, 2]];
    const trace = runProblem('copy-list-with-random-pointer', { nodes }), final = trace.frames.at(-1)!, view = linkedListView(final);
    expect(view.copies).toEqual([[0, 3], [1, 4], [2, 5]]);
    expect(view.randomLinks).toEqual([[0, 2], [1, 0], [2, 2], [3, 5], [4, 3], [5, 5]]);
    for (const frame of trace.frames) {
      expect(frame.links!.filter(([from]) => from < nodes.length)).toEqual([[0, 1], [1, 2]]);
      expect(linkedListView(frame).randomLinks.filter(([from]) => from < nodes.length)).toEqual([[0, 2], [1, 0], [2, 2]]);
      for (const [from, to] of [...frame.links!, ...linkedListView(frame).randomLinks]) if (from >= nodes.length) expect(to).toBeGreaterThanOrEqual(nodes.length);
    }
    expect(trace.result).toEqual(nodes);
  });

  it('keeps the maximum teaching inputs within bounded trace and node budgets', () => {
    const examples: [ProblemId, unknown][] = [
      ['intersection-of-two-linked-lists', { prefixA: Array(6).fill(1), prefixB: Array(6).fill(1), shared: Array(6).fill(1) }],
      ['palindrome-linked-list', { values: Array(12).fill(1) }],
      ['linked-list-cycle', { values: Array(12).fill(1), pos: 11 }],
      ['linked-list-cycle-ii', { values: Array(12).fill(1), pos: 11 }],
      ['merge-two-sorted-lists', { a: Array(9).fill(1), b: Array(9).fill(1) }],
      ['add-two-numbers', { a: Array(8).fill(9), b: Array(8).fill(9) }],
      ['remove-nth-node-from-end-of-list', { values: Array(12).fill(1), n: 12 }],
      ['swap-nodes-in-pairs', { values: Array(12).fill(1) }],
      ['reverse-nodes-in-k-group', { values: Array(12).fill(1), k: 1 }],
      ['copy-list-with-random-pointer', { nodes: Array.from({ length: 10 }, (_, i) => [1, i]) }],
    ];
    for (const [id, input] of examples) {
      const trace = runProblem(id, input);
      expect(trace.frames.length).toBeLessThan(1000);
      expect(Math.max(...trace.frames.map((f) => f.values.length))).toBeLessThanOrEqual(26);
    }
    expect(Object.keys(linkedListSchemas)).toHaveLength(10);
  });
});

describe('independent linked-list oracles (deferred)', () => {
  let seed = 502;
  const random = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed >>> 8) % n; };
  const array = (n: number) => Array.from({ length: n }, () => random(7) - 3);

  it('compares 120 inputs per preset using known graph construction, arrays and BigInt arithmetic', () => {
    for (let test = 0; test < 120; test++) {
      const prefixA = array(random(5)), prefixB = array(random(5)), shared = array(random(5));
      expect(runProblem('intersection-of-two-linked-lists', { prefixA, prefixB, shared }).result).toEqual(shared.length ? { indexA: prefixA.length, indexB: prefixB.length, value: shared[0] } : null);
      const values = array(random(13));
      const palindrome = runProblem('palindrome-linked-list', { values });
      expect(palindrome.result).toBe(values.every((value, i) => value === values[values.length - 1 - i]));
      expect(palindrome.frames.at(-1)!.links).toEqual(palindrome.frames[0].links);
      const pos = values.length ? random(values.length + 1) - 1 : -1;
      // The oracle follows constructed successors and tracks visited identities, not Floyd's algorithm.
      const seen = new Set<number>(); let current: number | null = values.length ? 0 : null;
      while (current !== null && !seen.has(current)) { seen.add(current); current = current + 1 < values.length ? current + 1 : pos < 0 ? null : pos; }
      expect(runProblem('linked-list-cycle', { values, pos }).result).toBe(current !== null);
      expect(runProblem('linked-list-cycle-ii', { values, pos }).result).toBe(current);
      const a = array(random(9)).sort((a, b) => a - b), b = array(random(9)).sort((a, b) => a - b);
      const sorted = [...a, ...b].map((value, id) => ({ value, id })).sort((a, b) => a.value - b.value || a.id - b.id);
      const merged = runProblem('merge-two-sorted-lists', { a, b });
      expect(merged.result).toEqual(sorted.map((node) => node.value));
      expect(linkedListView(merged.frames.at(-1)!).output).toEqual(sorted.map((node) => node.id));
      const digits = () => { const d = Array.from({ length: random(8) + 1 }, () => random(10)); if (d.length > 1 && !d.at(-1)) d[d.length - 1] = 1; return d; };
      const da = digits(), db = digits(), total = BigInt([...da].reverse().join('')) + BigInt([...db].reverse().join(''));
      const added = runProblem('add-two-numbers', { a: da, b: db }), final = added.frames.at(-1)!;
      expect(added.result).toEqual([...total.toString()].reverse().map(Number));
      expect(linkedListView(final).output.every((id) => id > da.length + db.length)).toBe(true);
      expect(final.links!.filter(([from]) => from < da.length + db.length)).toEqual(added.frames[0].links!.filter(([from]) => from < da.length + db.length));
      const nonempty = values.length ? values : [0], n = random(nonempty.length) + 1;
      const removed = runProblem('remove-nth-node-from-end-of-list', { values: nonempty, n });
      expect(removed.result).toEqual(nonempty.filter((_, i) => i !== nonempty.length - n));
      expect(linkedListView(removed.frames.at(-1)!).output).toEqual(nonempty.flatMap((_, i) => i === nonempty.length - n ? [] : [i]));
      const swapOrder = values.map((_, i) => i % 2 ? i - 1 : i + 1 < values.length ? i + 1 : i);
      const swapped = runProblem('swap-nodes-in-pairs', { values });
      expect(swapped.result).toEqual(swapOrder.map((i) => values[i]));
      expect(linkedListView(swapped.frames.at(-1)!).output).toEqual(swapOrder);
      const k = random(12) + 1, order: number[] = [];
      for (let i = 0; i < values.length; i += k) {
        const block = values.slice(i, i + k).map((_, offset) => i + offset);
        order.push(...(block.length === k ? block.reverse() : block));
      }
      const grouped = runProblem('reverse-nodes-in-k-group', { values, k });
      expect(grouped.result).toEqual(order.map((i) => values[i]));
      expect(linkedListView(grouped.frames.at(-1)!).output).toEqual(order);
      const nodes = array(random(11)).map((value, _, all) => [value, random(all.length + 1) - 1] as [number, number | null]);
      nodes.forEach((node) => { if (node[1] === -1) node[1] = null; });
      const copied = runProblem('copy-list-with-random-pointer', { nodes }), view = linkedListView(copied.frames.at(-1)!);
      expect(copied.result).toEqual(nodes);
      const mapping = new Map(view.copies), targets = new Map(view.randomLinks);
      nodes.forEach(([, target], i) => {
        expect(mapping.get(i)).toBeGreaterThanOrEqual(nodes.length);
        expect(targets.get(mapping.get(i)!) ?? null).toBe(target === null ? null : mapping.get(target));
      });
    }
  });
});
