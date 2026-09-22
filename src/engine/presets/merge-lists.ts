import { z } from 'zod';
import { recorder } from '../recorder';
import type { Trace } from '../types';
import type { LinkedListView } from './linked-lists';

const values = z.array(z.number().int().min(-10000).max(10000)).max(12);
export const mergeListSchemas = {
  'sort-list': z.object({ values }).strict(),
  'merge-k-sorted-lists': z.object({ lists: z.array(values.refine((a) => a.every((v, i) => i === 0 || a[i - 1] <= v))).max(4) }).strict().refine(({ lists }) => lists.flat().length <= 16),
};
export type MergeListId = keyof typeof mergeListSchemas;

export function runMergeList(id: MergeListId, input: unknown): Trace {
  const data = mergeListSchemas[id].parse(input), inputs = 'values' in data ? [data.values] : data.lists;
  const { state, emit, finish } = recorder(id, input); const next: (number | null)[] = [];
  const view: LinkedListView = { version: 1, lanes: [], heads: {}, dummy: [], detached: [], output: [], outputLabel: '当前合并的已选前缀（不含未选尾部）', randomLinks: [], copies: [], changed: [], retired: [], group: [], work: [] };
  const heads = inputs.map((items, lane) => {
    const ids = items.map((value) => { const node = state.values.length; state.values.push(value); next.push(null); return node; });
    ids.forEach((node, i) => { next[node] = ids[i + 1] ?? null; }); view.lanes.push({ label: `来源 ${lane + 1}`, ids });
    const head = ids[0] ?? null; view.heads[`origin${lane}`] = head; return head;
  });
  const focus = (pointers: Record<string, number | null>) => { state.pointers = pointers; state.active = [...new Set(Object.values(pointers).filter((v): v is number => v !== null))]; };
  const record = (location: string, action: string, explanation: string) => {
    state.links = next.flatMap((to, from) => to === null ? [] : [[from, to] as [number, number]]); state.variables = { view };
    emit(location, action, explanation); view.changed = []; view.retired = [];
  };
  const link = (from: number, to: number | null) => {
    if (next[from] !== to) { if (next[from] !== null) view.retired.push([from, next[from]!]); if (to !== null) view.changed.push([from, to]); next[from] = to; }
  };
  const collect = (head: number | null) => {
    const ids: number[] = []; for (let p = head; p !== null; p = next[p]) { if (ids.includes(p)) throw new Error('内部错误：合并结果含环。'); ids.push(p); } return ids;
  };
  record('init', '分治后逐条重连', '保留节点身份，不把值取出排序后写回；相同值先选左侧。');
  const merge = (a: number | null, b: number | null): number | null => {
    let head: number | null = null, tail: number | null = null; view.output = [];
    focus({ a, b, tail }); record('merge', '合并两条有序链', '每次接入较小的头节点。');
    while (a !== null && b !== null) {
      focus({ a, b, tail }); record('compare', '比较候选头节点', `${state.values[a]} 与 ${state.values[b]}，相等时取左侧。`);
      const takeA = Number(state.values[a]) <= Number(state.values[b]), chosen = takeA ? a : b;
      if (takeA) a = next[a]; else b = next[b];
      if (tail === null) head = chosen; else link(tail, chosen);
      tail = chosen; view.output.push(chosen); view.heads.partial = head;
      focus({ a, b, tail }); record('append', '接入一个原节点', `已选节点 #${chosen}；还未选中的尾部不计入结果前缀。`);
    }
    const rest = a ?? b; if (tail === null) head = rest; else link(tail, rest);
    view.output.push(...collect(rest)); view.heads.partial = head; focus({ a, b, tail });
    record('remainder', '接入剩余有序尾部', '当前子问题合并完成；它还可能参与上层合并。'); return head;
  };
  const sort = (head: number | null): number | null => {
    view.output = []; view.heads.partial = null;
    view.work!.push(head === null ? '空链' : `排序 #${head}`); focus({ head });
    if (head === null || next[head] === null) { view.work!.pop(); record('base', '空链或单节点已排序', '无需断开或分配节点。'); return head; }
    let slow = head; let fast: number | null = next[head];
    while (fast !== null && next[fast] !== null) { slow = next[slow]!; fast = next[next[fast]!]; focus({ slow, fast }); record('middle', '快慢指针寻找中间', 'slow 停在左半段的末尾。'); }
    const right = next[slow]; link(slow, null); focus({ left: head, right, slow }); view.output = [];
    record('split', '断开左右两半', '两条独立子链分别排序，然后按节点重连。');
    const a = sort(head), b = sort(right), result = merge(a, b); view.work!.pop();
    focus({ head: result }); record('sorted', '返回已排序的子链', '当前子问题的所有节点已按非递减顺序连接。'); return result;
  };
  const mergeRange = (lo: number, hi: number): number | null => {
    view.output = []; view.heads.partial = null;
    view.work!.push(`链 [${lo},${hi})`);
    if (hi - lo <= 1) { view.work!.pop(); focus({ head: heads[lo] ?? null }); record('base', '至多一条链，无需合并', '空范围返回空链；单条链直接复用。'); return heads[lo] ?? null; }
    const mid = Math.floor((lo + hi) / 2); record('divide', '分成两组链表', `[${lo},${mid}) 与 [${mid},${hi})，避免每次重复扫描全部链头。`);
    const a = mergeRange(lo, mid), b = mergeRange(mid, hi), result = merge(a, b); view.work!.pop();
    focus({ head: result }); record('merged', '返回这一组的合并头', '合并层数为 log k，每层处理各节点一次。'); return result;
  };
  const result = id === 'sort-list' ? sort(heads[0] ?? null) : mergeRange(0, heads.length);
  view.heads = { result }; view.output = collect(result); view.outputLabel = '最终结果节点顺序'; state.settled = [...view.output]; state.active = []; state.pointers = {};
  return finish(view.output.map((node) => state.values[node]), 'return');
}
