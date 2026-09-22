import { z } from 'zod';
import { recorder } from '../recorder';
import type { Frame, Trace } from '../types';

const integer = z.number().int().min(-10_000).max(10_000);
const values = z.array(integer).max(12);
const sorted = values.refine((a) => a.every((v, i) => i === 0 || a[i - 1] <= v));
const digits = z.array(z.number().int().min(0).max(9)).min(1).max(8).refine((a) => a.length === 1 || a.at(-1) !== 0);
const cyclic = z.object({ values, pos: z.number().int().min(-1).max(11) }).strict().refine(({ values, pos }) => pos < values.length);
export const linkedListSchemas = {
  'intersection-of-two-linked-lists': z.object({ prefixA: values, prefixB: values, shared: values }).strict().refine((x) => x.prefixA.length + x.prefixB.length + x.shared.length <= 18),
  'palindrome-linked-list': z.object({ values }).strict(),
  'linked-list-cycle': cyclic,
  'linked-list-cycle-ii': cyclic,
  'merge-two-sorted-lists': z.object({ a: sorted, b: sorted }).strict().refine(({ a, b }) => a.length + b.length <= 18),
  'add-two-numbers': z.object({ a: digits, b: digits }).strict(),
  'remove-nth-node-from-end-of-list': z.object({ values: values.min(1), n: z.number().int().min(1).max(12) }).strict().refine(({ values, n }) => n <= values.length),
  'swap-nodes-in-pairs': z.object({ values }).strict(),
  'reverse-nodes-in-k-group': z.object({ values, k: z.number().int().min(1).max(12) }).strict(),
  'copy-list-with-random-pointer': z.object({ nodes: z.array(z.tuple([integer, z.number().int().min(0).max(9).nullable()])).max(10) }).strict().refine(({ nodes }) => nodes.every(([, random]) => random === null || random < nodes.length)),
};
export type LinkedListId = keyof typeof linkedListSchemas;
export interface ListLane { label: string; ids: number[] }
export interface LinkedListView {
  version: 1;
  lanes: ListLane[];
  heads: Record<string, number | null>;
  dummy: number[];
  detached: number[];
  output: number[];
  outputLabel: string;
  randomLinks: [number, number][];
  copies: [number, number][];
  changed: [number, number][];
  retired: [number, number][];
  group: number[];
  work?: string[];
  edgeMode?: 'array-index';
  traversed?: [number, number][];
}
export const linkedListView = (frame: Frame) => frame.variables.view as LinkedListView;

export function runLinkedList(id: LinkedListId, input: unknown): Trace {
  const { state, emit, finish } = recorder(id, input);
  const next: (number | null)[] = [], random: (number | null)[] = [];
  const view: LinkedListView = { version: 1, lanes: [], heads: {}, dummy: [], detached: [], output: [], outputLabel: '已确定的结果节点', randomLinks: [], copies: [], changed: [], retired: [], group: [] };
  const node = (value: number, lane: number) => {
    const id = state.values.length; state.values.push(value); next.push(null); random.push(null); view.lanes[lane].ids.push(id); return id;
  };
  const list = (items: number[], label: string) => {
    const lane = view.lanes.length; view.lanes.push({ label, ids: [] });
    const ids = items.map((value) => node(value, lane));
    ids.forEach((id, i) => { next[id] = ids[i + 1] ?? null; });
    return ids;
  };
  const dummy = (head: number | null, lane = 0) => {
    const id = node(0, lane); view.lanes[lane].ids.pop(); view.lanes[lane].ids.unshift(id);
    next[id] = head; view.dummy.push(id); return id;
  };
  const focus = (pointers: Record<string, number | null>) => {
    state.pointers = pointers;
    state.active = [...new Set(Object.values(pointers).filter((n): n is number => n !== null))];
  };
  const record = (location: string, action: string, explanation: string, variables: Record<string, unknown> = {}) => {
    state.links = next.flatMap((to, from) => to === null ? [] : [[from, to] as [number, number]]);
    view.randomLinks = random.flatMap((to, from) => to === null ? [] : [[from, to] as [number, number]]);
    state.variables = { view, ...variables }; emit(location, action, explanation);
    view.changed = []; view.retired = [];
  };
  const rewire = (from: number, to: number | null) => {
    const before = next[from];
    if (before !== to) {
      if (before !== null) view.retired.push([from, before]);
      if (to !== null) view.changed.push([from, to]);
    }
    next[from] = to;
  };
  const collect = (head: number | null) => {
    const ids: number[] = [], seen = new Set<number>();
    for (let p = head; p !== null; p = next[p]) {
      if (seen.has(p)) throw new Error('内部错误：结果链表仍含环。');
      seen.add(p); ids.push(p);
    }
    return ids;
  };
  const done = (result: unknown) => {
    state.active = []; view.changed = []; view.retired = []; view.group = [];
    return finish(result, 'return');
  };
  const finishList = (head: number | null) => {
    view.heads.result = head; view.output = collect(head); view.outputLabel = '结果节点顺序';
    state.settled = [...view.output];
    return done(view.output.map((id) => state.values[id]));
  };

  if (id === 'intersection-of-two-linked-lists') {
    const { prefixA, prefixB, shared } = linkedListSchemas[id].parse(input);
    const a = list(prefixA, 'A 独有节点'), b = list(prefixB, 'B 独有节点'), common = list(shared, '共享尾部（同一批节点）');
    const commonHead = common[0] ?? null;
    if (a.length) next[a.at(-1)!] = commonHead;
    if (b.length) next[b.at(-1)!] = commonHead;
    const headA = a[0] ?? commonHead, headB = b[0] ?? commonHead;
    view.heads = { A: headA, B: headB };
    let p: number | null = headA, q: number | null = headB; focus({ p, q });
    record('init', '从两个头节点出发', '比较节点身份，不比较节点值；shared 表示真正共享的尾部。');
    while (p !== q) {
      p = p === null ? headB : next[p]; q = q === null ? headA : next[q]; focus({ p, q });
      record('advance', '走到末尾就换到另一条链', '两个指针分别走过 A+B 与 B+A，抵消独有前缀的长度差。');
    }
    if (p !== null) state.settled = [p];
    record('meet', p === null ? '同时走到空节点' : '指向同一节点', p === null ? '两条链没有共享节点。' : `相交节点为 #${p}，值为 ${state.values[p]}。`);
    return done(p === null ? null : { indexA: prefixA.length, indexB: prefixB.length, value: state.values[p] });
  }

  if (id === 'linked-list-cycle' || id === 'linked-list-cycle-ii') {
    const { values, pos } = linkedListSchemas[id].parse(input), ids = list(values, '输入节点');
    const head = ids[0] ?? null; view.heads = { head };
    if (pos >= 0) next[ids.at(-1)!] = ids[pos];
    let slow: number | null = head, fast: number | null = head, found = false; focus({ slow, fast });
    record('init', '快慢指针从头出发', 'slow 一次走一步，fast 一次走两步；只有移动后的相遇才说明有环。');
    while (fast !== null && next[fast] !== null) {
      slow = next[slow!]; fast = next[next[fast]!]; focus({ slow, fast });
      record('advance', '慢一步，快两步', `slow → ${slow === null ? 'null' : `#${slow}`}，fast → ${fast === null ? 'null' : `#${fast}`}。`);
      record('check', '比较节点身份', slow === fast ? '移动后相遇，存在环。' : '还未相遇，继续推进。');
      if (slow === fast) { found = true; break; }
    }
    if (id === 'linked-list-cycle') return done(found);
    if (!found) return done(null);
    let entry: number | null = head; focus({ entry, slow });
    record('reset', '一个指针回到头节点', '另一个留在相遇处；接下来都只走一步。');
    while (entry !== slow) {
      entry = next[entry!]; slow = next[slow!]; focus({ entry, slow });
      record('seek-entry', '同步向前一步', '下一次相遇的位置就是环入口。');
    }
    state.settled = entry === null ? [] : [entry];
    return done(entry);
  }

  if (id === 'copy-list-with-random-pointer') {
    const { nodes } = linkedListSchemas[id].parse(input), originals = list(nodes.map(([value]) => value), '原节点');
    originals.forEach((node, i) => { random[node] = nodes[i][1]; });
    const copyLane = view.lanes.length; view.lanes.push({ label: '新节点（独立对象）', ids: [] });
    const mapping = new Map<number, number>(); view.heads = { original: originals[0] ?? null, copy: null };
    focus({ current: originals[0] ?? null }); record('init', '先建节点，再连接指针', '新链表不能复用原节点；random 可以指向自己、前面或后面的节点。');
    for (const original of originals) {
      const copy = node(Number(state.values[original]), copyLane); mapping.set(original, copy); view.copies.push([original, copy]);
      focus({ original, copy });
      if (original === originals[0]) view.heads.copy = copy;
      record('allocate', '分配对应的新节点', `#${original} 对应新节点 #${copy}，值相同但身份不同。`);
    }
    for (const original of originals) {
      const copy = mapping.get(original)!; focus({ original, copy });
      rewire(copy, next[original] === null ? null : mapping.get(next[original]!)!);
      random[copy] = random[original] === null ? null : mapping.get(random[original]!)!;
      view.output.push(copy); state.settled.push(copy);
      record('connect', '只连接新节点', '通过映射设置 next 和 random，原链表保持不变。');
    }
    view.outputLabel = '复制链表的节点顺序';
    const copyOrder = collect(view.heads.copy);
    return done(copyOrder.map((copy) => [state.values[copy], random[copy] === null ? null : copyOrder.indexOf(random[copy]!)]));
  }

  if (id === 'merge-two-sorted-lists' || id === 'add-two-numbers') {
    const parsed = linkedListSchemas[id].parse(input);
    const a = list(parsed.a, '来源 A'), b = list(parsed.b, '来源 B');
    view.lanes.push({ label: id === 'add-two-numbers' ? '新建结果节点（低位在左）' : '辅助头节点', ids: [] });
    const root = dummy(null, 2); let tail = root, p: number | null = a[0] ?? null, q: number | null = b[0] ?? null;
    view.heads = { A: p, B: q, result: null }; focus({ p, q, tail });
    record('init', '准备哨兵与结果尾部', id === 'add-two-numbers' ? '从个位开始相加，逐位创建结果节点，不修改输入链表。' : '复用原节点，始终将较小的头节点接到结果尾部；同值先选 A。');
    if (id === 'add-two-numbers') {
      let carry = 0;
      while (p !== null || q !== null || carry) {
        const x = p === null ? 0 : Number(state.values[p]), y = q === null ? 0 : Number(state.values[q]), before = carry;
        const sum = x + y + before; carry = Math.floor(sum / 10); focus({ p, q, tail });
        record('sum', '加上两位与进位', `${x} + ${y} + ${before} = ${sum}；本位 ${sum % 10}，向高位进 ${carry}。`, { x, y, before, sum, digit: sum % 10, carry });
        const created = node(sum % 10, 2); rewire(tail, created); tail = created;
        view.heads.result = next[root]; view.output.push(created); state.settled.push(created); focus({ p, q, tail });
        record('append', '追加本位结果', `新节点 #${created} 保存 ${sum % 10}。`, { carry });
        p = p === null ? null : next[p]; q = q === null ? null : next[q]; focus({ p, q, tail });
        record('advance', '转向更高一位', '较短链表结束后按 0 参与，最终进位也要保留。', { carry });
      }
    } else {
      while (p !== null && q !== null) {
        focus({ p, q, tail });
        record('compare', '比较两个候选头节点', `${state.values[p]} ${Number(state.values[p]) <= Number(state.values[q]) ? '≤' : '>'} ${state.values[q]}。`, { a: state.values[p], b: state.values[q] });
        const takeA = Number(state.values[p]) <= Number(state.values[q]), chosen = takeA ? p : q;
        rewire(tail, chosen); tail = chosen;
        if (takeA) p = next[p]; else q = next[q];
        focus({ p, q, tail }); view.heads.result = next[root]; view.output.push(chosen); state.settled.push(chosen);
        record('append', '接入较小节点', `把 #${chosen} 接入已确定前缀，并推进对应链表。`);
      }
      const rest = p ?? q; rewire(tail, rest); view.heads.result = next[root];
      view.output.push(...collect(rest)); state.settled = [...view.output];
      record('remainder', '接上剩余有序尾部', '一条链已结束，另一条链的剩余部分可以整体接入。');
    }
    return finishList(next[root]);
  }

  const parsed = linkedListSchemas[id].parse(input), ids = list(parsed.values, '输入节点（位置保持，连接可变）');
  const head = ids[0] ?? null; view.heads = { head };
  if (id === 'palindrome-linked-list') {
    let slow: number | null = head, fast: number | null = head; focus({ slow, fast });
    record('init', '寻找前半段尾部', '反转后半段并逐个比较，结束前恢复原连接，即使发现不匹配也会恢复。');
    if (head === null || next[head] === null) return done(true);
    while (fast !== null && next[fast] !== null && next[next[fast]!] !== null) {
      slow = next[slow!]; fast = next[next[fast]!]; focus({ slow, fast });
      record('middle', '快慢指针找中间', 'slow 最终停在前半段的最后一个节点。');
    }
    let phase = '反转后半段';
    const reverse = (start: number | null) => {
      let previous: number | null = null, current = start;
      while (current !== null) {
        const saved = next[current]; focus({ middle: slow, current, previous, saved });
        rewire(current, previous); record('reverse-link', '翻转一个 next', `节点 #${current} 改为指向 ${previous === null ? 'null' : `#${previous}`}。`, { phase });
        previous = current; current = saved; focus({ middle: slow, current, previous });
        record('reverse-move', '推进反转指针', '继续处理已提前保存的后继。', { phase });
      }
      return previous;
    };
    const second = reverse(next[slow!]); rewire(slow!, second); view.heads.second = second;
    record('attach', '接上反转后的后半段', '两个比较指针分别从原头与反转后半段的头出发。');
    let p = head, q = second, valid = true;
    while (q !== null) {
      focus({ p, q }); const equal = state.values[p] === state.values[q];
      record('compare', '比较对应节点', `${state.values[p]} ${equal ? '=' : '≠'} ${state.values[q]}。`, { equal });
      if (!equal) { valid = false; break; }
      state.settled.push(p, q); p = next[p]!; q = next[q];
    }
    phase = '恢复原链表'; record('restore-start', '恢复原连接', '比较已经结束，反转后半段一次，把输入链表恢复原状。', { valid });
    const restored = reverse(second); rewire(slow!, restored); view.heads.second = restored;
    record('restore', '原链表已恢复', '本次判断不留下对原链表的修改。', { valid });
    view.output = collect(head); view.outputLabel = '恢复后的原链表';
    return done(valid);
  }

  const root = dummy(head); view.heads.result = head;
  if (id === 'remove-nth-node-from-end-of-list') {
    const { n } = linkedListSchemas[id].parse(input); let fast: number = root, slow = root; focus({ fast, slow });
    record('init', '建立固定间距', `fast 先走 ${n} 步，然后与 slow 同速前进。`, { n });
    for (let i = 0; i < n; i++) { fast = next[fast]!; focus({ fast, slow }); record('gap', '快指针先走一步', `已领先 ${i + 1} 步。`, { n, gap: i + 1 }); }
    while (next[fast] !== null) { fast = next[fast]!; slow = next[slow]!; focus({ fast, slow }); record('advance', '保持间距同步前进', 'fast 到最后一个节点时，slow 位于待删节点之前。', { n }); }
    const removed = next[slow]!; focus({ fast, slow, removed }); rewire(slow, next[removed]); view.detached = [removed]; view.heads.result = next[root];
    record('remove', '绕过待删节点', `把前驱直接接到 #${removed} 的后继；删除的是节点而不是仅替换其值。`, { n });
    return finishList(next[root]);
  }

  let before = root; focus({ before });
  record('init', '从哨兵开始', 'before 始终指向下一组之前的节点，节点值保持不变。');
  if (id === 'swap-nodes-in-pairs') {
    while (next[before] !== null && next[next[before]!] !== null) {
      const first = next[before]!, second = next[first]!, rest = next[second];
      view.group = [first, second]; focus({ before, first, second });
      record('pair', '选中一对相邻节点', `交换 #${first} 和 #${second}，保留后续链表。`);
      rewire(first, rest); record('bypass', '第一节点接向后续', '先保存后续连接，避免丢失剩余节点。');
      rewire(second, first); record('link-back', '第二节点指向第一节点', '这一步改变 next，不交换节点值。');
      rewire(before, second); view.heads.result = next[root]; view.output.push(second, first); state.settled.push(second, first);
      record('attach', '前一组接入新组头', '这一对交换完成。');
      before = first; view.group = []; focus({ before }); record('advance', '转向下一对', '奇数个节点时，最后一个保持原位。');
    }
    return finishList(next[root]);
  }

  const { k } = linkedListSchemas['reverse-nodes-in-k-group'].parse(input);
  while (true) {
    let kth: number | null = before;
    for (let i = 0; i < k && kth !== null; i++) {
      kth = next[kth]; focus({ before, kth });
      record('probe', '检查本组是否满 k 个', `本次探测 ${i + 1} / ${k}，${kth === null ? '已经到达链尾' : `到达 #${kth}`}。`, { k, checked: i + 1 });
    }
    if (kth === null) break;
    const after = next[kth], first = next[before]!;
    view.group = []; for (let p: number | null = first; p !== after; p = next[p!]) view.group.push(p!);
    let previous = after, current: number | null = first; focus({ before, kth, current, previous });
    record('group', '完整的一组可以反转', `本组 ${k} 个节点；反转过程中始终保存下一组入口。`, { k });
    while (current !== after) {
      const saved: number | null = next[current!]; rewire(current!, previous); focus({ before, current, previous, saved });
      record('reverse-link', '反转组内连接', `#${current} 的 next 指向 ${previous === null ? 'null' : `#${previous}`}。`, { k });
      previous = current; current = saved; focus({ before, current, previous });
      record('reverse-move', '推进到组内下一节点', '使用提前保存的后继继续，不沿刚翻转的连接走。', { k });
    }
    rewire(before, kth); view.heads.result = next[root]; view.output.push(...[...view.group].reverse()); state.settled = [...view.output];
    record('attach', '接回反转后的组头', '原组头变成组尾，仍连接下一组。', { k });
    before = first; view.group = []; focus({ before }); record('advance', '开始检查下一组', '不足 k 个的尾部保持原顺序。', { k });
  }
  return finishList(next[root]);
}
