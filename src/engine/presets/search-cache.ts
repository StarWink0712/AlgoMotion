import { z } from 'zod';
import { recorder } from '../recorder';
import type { Frame, Trace } from '../types';

const integer = z.number().int().min(-10000).max(10000);
const distinct = z.array(integer).refine((a) => new Set(a).size === a.length);
export const searchCacheSchemas = {
  permutations: z.object({ nums: z.array(integer).max(5).pipe(distinct) }).strict(),
  subsets: z.object({ nums: z.array(integer).max(7).pipe(distinct) }).strict(),
  'combination-sum': z.object({ candidates: z.array(z.number().int().min(1).max(100)).max(5).pipe(distinct), target: z.number().int().min(0).max(10) }).strict(),
  'lru-cache': z.object({ capacity: z.number().int().min(1).max(6), operations: z.array(z.discriminatedUnion('op', [
    z.object({ op: z.literal('get'), key: integer }).strict(),
    z.object({ op: z.literal('put'), key: integer, value: integer }).strict(),
  ])).max(24) }).strict(),
};
export type SearchCacheId = keyof typeof searchCacheSchemas;
export interface Choice { key: number; source: number }
export interface SearchView {
  version: 1;
  path: Choice[];
  answers: number[][];
  available: number[];
  remaining: number | null;
  removed?: Choice;
  candidate: number | null;
}
export const searchView = (frame: Frame) => frame.variables.view as SearchView;
export interface CacheEntry { id: number; key: number; value: number; prev: number | null; next: number | null }
export interface CacheView {
  version: 1;
  capacity: number;
  order: number[];
  entries: CacheEntry[];
  lookup: [number, number][];
  outputs: (number | null)[];
  operation: { op: 'get' | 'put'; key: number; value?: number } | null;
  operationIndex: number;
  touched: number | null;
  removed?: CacheEntry;
}
export const cacheView = (frame: Frame) => frame.variables.view as CacheView;

export function runSearchCache(id: SearchCacheId, input: unknown): Trace {
  if (id === 'lru-cache') return runCache(input);
  const data = searchCacheSchemas[id].parse(input);
  const nums = 'nums' in data ? [...data.nums] : [...data.candidates].sort((a, b) => a - b);
  const { state, emit, finish } = recorder(id, input); state.values = nums;
  const view: SearchView = { version: 1, path: [], answers: [], available: nums.map((_, i) => i), remaining: 'target' in data ? data.target : null, candidate: null };
  let token = 0;
  const record = (location: string, action: string, explanation: string) => {
    state.active = view.candidate === null ? [] : [view.candidate]; state.settled = view.path.map((p) => p.source);
    state.variables = { view, depth: view.path.length, collected: view.answers.length, remaining: view.remaining };
    emit(location, action, explanation); delete view.removed;
  };
  record('init', '从空选择路径开始', id === 'permutations' ? '每个输入位置最多用一次；每层选择尚未使用的元素。' : id === 'subsets' ? '每次从上次位置之后继续，空集也算一个答案。' : '候选数互异且为正，可重复使用；从当前候选位置继续，避免重复组合。');
  const dfs = (start: number, remaining: number | null): void => {
    const available = nums.flatMap((_, i) => id === 'permutations' ? view.path.some((p) => p.source === i) ? [] : [i] : i >= start ? [i] : []);
    view.available = available; view.remaining = remaining;
    if (id === 'subsets' || (id === 'permutations' && view.path.length === nums.length) || remaining === 0) {
      view.answers.push(view.path.map((p) => nums[p.source])); view.candidate = null;
      record('save', '保存当前路径的副本', `第 ${view.answers.length} 个答案为 [${view.answers.at(-1)!.join(', ')}]；后续撤销不修改它。`);
      if (id !== 'subsets') return;
    }
    for (const source of available) {
      view.candidate = source; view.available = available;
      if (remaining !== null && nums[source] > remaining) {
        record('prune', '剩余总和不足，停止这一层', `${nums[source]} > ${remaining}；后面的候选更大，也不必尝试。`); break;
      }
      view.path.push({ key: token++, source }); view.remaining = remaining === null ? null : remaining - nums[source];
      view.available = nums.flatMap((_, i) => id === 'permutations' ? view.path.some((p) => p.source === i) ? [] : [i] : i >= (id === 'subsets' ? source + 1 : source) ? [i] : []);
      record('choose', '选择一个元素，进入下一层', `把 ${nums[source]} 加入路径${remaining === null ? '' : `，剩余 ${view.remaining}`}。`);
      dfs(id === 'subsets' ? source + 1 : source, view.remaining);
      view.removed = view.path.pop()!; view.available = available; view.remaining = remaining; view.candidate = source;
      record('undo', '撤销这次选择，恢复父层', `移除末项 ${nums[source]}，保留已收集答案，继续尝试同层其他候选。`);
    }
  };
  dfs(0, view.remaining); view.candidate = null; state.active = []; state.settled = [];
  return finish(view.answers, 'return');
}

function runCache(input: unknown): Trace {
  const { capacity, operations } = searchCacheSchemas['lru-cache'].parse(input);
  const { state, emit, finish } = recorder('lru-cache', input);
  const nodes: CacheEntry[] = [], map = new Map<number, number>(); let head: number | null = null, tail: number | null = null;
  const view: CacheView = { version: 1, capacity, entries: [], order: [], lookup: [], outputs: [], operation: null, operationIndex: -1, touched: null };
  const record = (location: string, action: string, explanation: string) => {
    const order: number[] = []; for (let p = head; p !== null; p = nodes[p].next) { if (order.includes(p)) throw new Error('内部错误：缓存链成环。'); order.push(p); }
    view.order = order; view.entries = order.map((id) => ({ ...nodes[id] })); view.lookup = [...map];
    state.values = nodes.map((n) => n.value); state.active = view.touched === null ? [] : [view.touched]; state.pointers = { MRU: head, LRU: tail };
    state.links = order.flatMap((id) => nodes[id].next === null ? [] : [[id, nodes[id].next!] as [number, number]]);
    state.variables = { view, size: map.size, capacity, operation: view.operationIndex + 1 };
    emit(location, action, explanation); delete view.removed;
  };
  const detach = (id: number) => {
    const n = nodes[id]; if (n.prev === null) head = n.next; else nodes[n.prev].next = n.next;
    if (n.next === null) tail = n.prev; else nodes[n.next].prev = n.prev;
    n.prev = null; n.next = null;
  };
  const front = (id: number) => {
    nodes[id].prev = null; nodes[id].next = head;
    if (head === null) tail = id; else nodes[head].prev = id;
    head = id;
  };
  record('init', '哈希定位，双向链表维护最近使用', '左侧 MRU 最近使用，右侧 LRU 最久未使用；get 命中与 put 都更新顺序。');
  operations.forEach((op, index) => {
    view.operation = op; view.operationIndex = index; const found = map.get(op.key); view.touched = found ?? null;
    record('lookup', '按 key 查找缓存节点', found === undefined ? `key=${op.key} 未命中。` : `key=${op.key} 定位到节点 #${found}。`);
    if (op.op === 'get' && found === undefined) { view.outputs.push(-1); record('miss', '未命中，返回 -1', '不改变任何已有节点的使用顺序。'); return; }
    if (found !== undefined) {
      if (op.op === 'put') { nodes[found].value = op.value; record('update', '更新原节点的值', `key 不变，值改为 ${op.value}，不创建重复节点。`); }
      detach(found); front(found); record('touch', '将同一个节点移到 MRU', '摘下并接到头部，前后邻居的双向连接同步更新。');
      view.outputs.push(op.op === 'get' ? nodes[found].value : null);
    } else if (op.op === 'put') {
      const id = nodes.length; nodes.push({ id, key: op.key, value: op.value, prev: null, next: null }); map.set(op.key, id); front(id); view.touched = id;
      record('insert', '新节点插入 MRU', `创建 #${id}；若暂时超过容量，下一步立即淘汰 LRU。`);
      if (map.size > capacity) {
        const victim = tail!; view.removed = { ...nodes[victim] }; detach(victim); map.delete(nodes[victim].key);
        record('evict', '淘汰最久未使用节点', `移除 key=${nodes[victim].key}，同时删除哈希条目与双向连接。`);
      }
      view.outputs.push(null);
    }
    record('output', '记录本次操作返回值', op.op === 'get' ? `get 返回 ${view.outputs.at(-1)}。` : 'put 无返回值，以 null 表示。');
  });
  view.touched = null; state.active = []; return finish(view.outputs, 'return');
}
