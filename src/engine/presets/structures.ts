import { z } from 'zod';
import { recorder } from '../recorder';
import type { Frame, Trace } from '../types';

const integer = z.number().int().min(-10000).max(10000), nums = z.array(integer).min(1).max(24);
const word = z.string().regex(/^[a-z]{0,5}$/);
export const structuresSchemas = {
  'kth-largest-element-in-an-array': z.object({ nums, k: z.number().int().min(1).max(24) }).strict().refine(({ nums, k }) => k <= nums.length),
  'top-k-frequent-elements': z.object({ nums, k: z.number().int().min(1).max(24) }).strict().refine(({ nums, k }) => k <= new Set(nums).size),
  'find-median-from-data-stream': z.object({ operations: z.array(z.discriminatedUnion('op', [z.object({ op: z.literal('addNum'), value: integer }).strict(), z.object({ op: z.literal('findMedian') }).strict()])).max(24) }).strict().refine(({ operations }) => {
    let size = 0; for (const op of operations) { if (op.op === 'addNum') size++; else if (!size) return false; } return size <= 16;
  }),
  'implement-trie-prefix-tree': z.object({ operations: z.array(z.object({ op: z.enum(['insert', 'search', 'startsWith']), word }).strict()).max(12) }).strict().refine(({ operations }) => operations.reduce((n, op) => n + (op.op === 'insert' ? op.word.length : 0), 0) <= 24),
};
export type StructuresId = keyof typeof structuresSchemas;
export interface HeapView { name: string; max: boolean; ids: number[] }
export interface TrieNodeView { id: number; parent: number | null; char: string; prefix: string; terminal: boolean }
export interface StructuresView {
  version: 1;
  kind: 'heap' | 'trie';
  heaps: HeapView[];
  priorities: number[];
  source: number[];
  cursor: number;
  held: number | null;
  counts: { id: number; value: number; count: number }[];
  nodes: TrieNodeView[];
  path: number[];
  outputs: (number | boolean | null)[];
  outputLabel: string;
  operation: string;
  equation: string;
  connection?: [number, number];
  median?: { ids: number[]; value: number };
}
export const structuresView = (frame: Frame) => frame.variables.view as StructuresView;

// Heap operations mutate real identity slots. Snapshots are emitted after each elementary change.
export function tracedHeap(ids: number[], before: (a: number, b: number) => boolean, record: (location: string, active: number[]) => void) {
  const swap = (a: number, b: number) => { [ids[a], ids[b]] = [ids[b], ids[a]]; record('heap-swap', [ids[a], ids[b]]); };
  return {
    push(id: number) {
      ids.push(id); record('heap-push', [id]); let i = ids.length - 1;
      while (i > 0) {
        const parent = Math.floor((i - 1) / 2); record('heap-compare', [ids[i], ids[parent]]);
        if (!before(ids[i], ids[parent])) break; swap(i, parent); i = parent;
      }
      record('heap-ready', []);
    },
    pop() {
      if (!ids.length) throw new Error('内部错误：空堆不能出堆。');
      const root = ids[0], last = ids.pop()!; if (ids.length) ids[0] = last;
      record('heap-remove', [root]); let i = 0;
      while (i * 2 + 1 < ids.length) {
        let child = i * 2 + 1;
        if (child + 1 < ids.length) { record('heap-compare', [ids[child], ids[child + 1]]); if (before(ids[child + 1], ids[child])) child++; }
        record('heap-compare', [ids[child], ids[i]]); if (!before(ids[child], ids[i])) break;
        swap(i, child); i = child;
      }
      record('heap-ready', []); return root;
    },
  };
}

export function runStructures(id: StructuresId, input: unknown): Trace {
  if (id === 'implement-trie-prefix-tree') return runTrie(input);
  const data = structuresSchemas[id].parse(input), { state, emit, finish } = recorder(id, input);
  const view: StructuresView = { version: 1, kind: 'heap', heaps: [], priorities: [], source: 'nums' in data ? data.nums : data.operations.flatMap((op) => op.op === 'addNum' ? [op.value] : []), cursor: -1, held: null, counts: [], nodes: [], path: [], outputs: [], outputLabel: '已完成操作的返回值', operation: '', equation: '' };
  const record = (location: string, action: string, explanation: string, equation: string, vars: Record<string, unknown> = {}) => {
    view.equation = equation; state.variables = { view, ...vars }; emit(location, action, explanation);
  };
  const allocate = (value: number, priority = value) => { const node = state.values.length; state.values.push(value); view.priorities.push(priority); return node; };
  const heap = (name: string, max = false, frequency = false) => {
    const h: HeapView = { name, max, ids: [] }; view.heaps.push(h);
    const before = (a: number, b: number) => frequency ? view.priorities[a] < view.priorities[b] || (view.priorities[a] === view.priorities[b] && Number(state.values[a]) > Number(state.values[b])) : max ? view.priorities[a] > view.priorities[b] : view.priorities[a] < view.priorities[b];
    const api = tracedHeap(h.ids, before, (location, active) => {
      state.active = active; if (location === 'heap-push') view.held = null; if (location === 'heap-remove') view.held = active[0];
      const title: Record<string, string> = { 'heap-push': '新节点放到堆尾', 'heap-remove': '取走堆顶，末项补到根', 'heap-compare': '比较堆内优先级', 'heap-swap': '交换父子位置', 'heap-ready': '当前堆调整完成' };
      record(location, title[location], `${name}：${location === 'heap-ready' ? '父子优先级恢复，堆数组不是完整排序。' : '逐步上浮或下沉，调整中暂时可能不满足堆序。'}`, `${name} · ${h.ids.length} 个节点`, { heap: name });
    });
    return { ...api, ids: h.ids };
  };
  if (id === 'find-median-from-data-stream') {
    const { operations } = structuresSchemas[id].parse(input), lower = heap('较小半边 · 大顶堆', true), upper = heap('较大半边 · 小顶堆');
    record('init', '用两个堆守住中间边界', '较小半边用大顶堆，较大半边用小顶堆；小半边数量等于大半边或多一个。', '空数据流');
    for (const op of operations) {
      delete view.median; view.held = null; view.operation = op.op === 'addNum' ? `addNum(${op.value})` : 'findMedian()';
      if (op.op === 'addNum') {
        view.cursor++; const node = allocate(op.value); view.held = node; state.active = [node];
        record('add', '按下半堆顶决定插入侧', '小于等于较小半边最大值则放左堆，否则放右堆。', `加入 ${op.value}`);
        if (!lower.ids.length || op.value <= Number(state.values[lower.ids[0]])) lower.push(node); else upper.push(node);
        if (lower.ids.length > upper.ids.length + 1) {
          record('balance', '左边多两个，移动最大值到右边', '跨堆移动的是同一个节点，不复制或改写其值。', '左堆 → 右堆'); const moved = lower.pop(); upper.push(moved);
        } else if (upper.ids.length > lower.ids.length) {
          record('balance', '右边较多，移动最小值到左边', '恢复左边等长或多一个的约定。', '右堆 → 左堆'); const moved = upper.pop(); lower.push(moved);
        }
        view.outputs.push(null); state.active = []; record('added', '插入与平衡结束', 'null 表示 addNum 没有返回值；此时两个堆的容量关系已恢复。', `${lower.ids.length} : ${upper.ids.length}`);
      } else {
        const ids = lower.ids.length > upper.ids.length ? [lower.ids[0]] : [lower.ids[0], upper.ids[0]];
        const value = ids.reduce((sum, node) => sum + Number(state.values[node]), 0) / ids.length;
        view.median = { ids, value }; view.outputs.push(value); state.active = ids;
        record('median', '只读取堆顶计算中位数', '已平衡的堆顶就是排序后中间的一项或两项。', `${ids.map((n) => state.values[n]).join(' + ')}${ids.length === 2 ? ' 除以 2' : ''} = ${value}`);
      }
    }
    state.active = []; return finish(view.outputs, 'return');
  }
  const { nums, k } = structuresSchemas[id].parse(input), frequency = id === 'top-k-frequent-elements', selected = heap(frequency ? '候选小顶堆 · 最弱在顶' : '前 k 大 · 小顶堆', false, frequency);
  record('init', frequency ? '先计数，再维护前 k 个候选' : '保留已经读过的前 k 大元素', frequency ? '低频更弱；同频时较大的值更弱，最终同频按数值升序输出。' : '重复值分别计数；堆顶是保留集合中最小值，即当前第 k 大。', `k = ${k}`, { k });
  const ids: number[] = [];
  if (frequency) {
    const counts = new Map<number, number>();
    nums.forEach((value, i) => {
      let node = counts.get(value); if (node === undefined) { node = allocate(value, 0); counts.set(value, node); ids.push(node); }
      view.priorities[node]++; view.cursor = i; state.active = [node]; view.counts = [...counts].map(([value, id]) => ({ id, value, count: view.priorities[id] }));
      record('count', '累计已读元素的频次', '只展示读到当前位置时的计数，尚未出现的值不提前创建。', `${value} → ${view.priorities[node]} 次`, { k });
    });
    for (const node of ids) {
      view.held = node; state.active = [node]; record('candidate', '把一个去重值作为候选', `值 ${state.values[node]} 出现 ${view.priorities[node]} 次。`, `候选 ${state.values[node]}`, { k }); selected.push(node);
      if (selected.ids.length > k) { selected.pop(); record('discard', '超过 k 个，淘汰最弱候选', '同频时淘汰较大的值，使输出顺序可重现。', `保留 ${k} 个`, { k }); }
    }
    view.outputLabel = '从弱到强取出，完成后反转'; view.held = null;
    while (selected.ids.length) { const node = selected.pop(); view.outputs.push(Number(state.values[node])); record('collect', '取出剩余候选', '小顶堆逐个取出的是由弱到强顺序。', `已取出 ${view.outputs.length} 个`); }
    view.outputs.reverse(); view.outputLabel = '频次降序，同频数值升序'; view.held = null; state.active = []; return finish(view.outputs, 'return');
  }
  nums.forEach((value, i) => {
    const node = allocate(value); view.cursor = i; view.held = node; state.active = [node];
    record('candidate', '读取一个输入元素', '每个输入位置都是独立节点，重复值也占一个排名。', `读取 nums[${i}] = ${value}`, { k }); selected.push(node);
    if (selected.ids.length > k) { selected.pop(); record('discard', '淘汰当前最小候选', '保留已读元素中最大的 k 个，不是只保留 k 个不同值。', `保留 ${k} 个`, { k }); }
  });
  view.held = null; state.active = []; state.settled = [selected.ids[0]]; return finish(state.values[selected.ids[0]], 'return');
}

function runTrie(input: unknown): Trace {
  const { operations } = structuresSchemas['implement-trie-prefix-tree'].parse(input), { state, emit, finish } = recorder('implement-trie-prefix-tree', input);
  const view: StructuresView = { version: 1, kind: 'trie', heaps: [], priorities: [], source: [], cursor: -1, held: null, counts: [], nodes: [{ id: 0, parent: null, char: 'root', prefix: '', terminal: false }], path: [], outputs: [], outputLabel: '已完成操作的返回值', operation: '', equation: '' };
  const children: Map<string, number>[] = [new Map()]; state.values = ['root']; state.links = [];
  const record = (location: string, action: string, explanation: string, equation: string) => { view.equation = equation; state.variables = { view }; emit(location, action, explanation); delete view.connection; };
  record('init', '从空根节点开始', '边代表一个字母，终止标记代表完整单词；能走到前缀不等于插入过该单词。', '只有根节点');
  for (const op of operations) {
    view.operation = `${op.op}("${op.word}")`; view.path = [0]; let node = 0, missing = false; state.active = [node];
    record('operation', '从根逐字处理', '每个操作重新从根开始；空串对应根本身。', view.operation);
    for (const char of op.word) {
      let next = children[node].get(char);
      if (next === undefined) {
        if (op.op !== 'insert') { missing = true; record('missing', '没有这条字符边', '完整单词和前缀查询都失败，不为查询创建节点。', `缺少 ${char}`); break; }
        next = view.nodes.length; children.push(new Map()); children[node].set(char, next);
        view.nodes.push({ id: next, parent: node, char, prefix: view.nodes[node].prefix + char, terminal: false }); state.values.push(char); state.links!.push([node, next]); view.connection = [node, next]; state.active = [node, next];
        record('create', '只为缺失的字符创建节点', '已有公共前缀直接复用；相同字母在不同前缀下仍是不同节点。', `#${node} —${char}→ #${next}`);
      }
      const before = node; node = next; view.path.push(node); state.active = [node]; view.connection = [before, node]; record('follow', '沿字符边前进', `已匹配前缀 ${view.nodes[node].prefix}。`, `到达 #${node}`);
    }
    if (op.op === 'insert') { view.nodes[node].terminal = true; state.active = [node]; view.outputs.push(null); record('mark', '标记单词结束', '重复插入不会创建重复节点；插入空串则标记根。', `"${op.word}" 已插入`); }
    else { const found = !missing && (op.op === 'startsWith' || view.nodes[node].terminal); view.outputs.push(found); record('answer', '区分前缀存在与单词结束', op.op === 'search' ? '完整单词必须走完全部字符且终点有结束标记。' : '前缀只需要走完字符；空前缀始终存在。', `${op.op} → ${found}`); }
  }
  state.active = []; return finish(view.outputs, 'return');
}
