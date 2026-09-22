import { z } from 'zod';
import { recorder } from '../recorder';
import { parseTree, serializeTree, isStrictBST, type TreeNode } from '../tree-data';
import type { Frame, Scalar, Trace } from '../types';

const integer = z.number().int().min(-10_000).max(10_000);
const tree = z.array(integer.nullable()).max(31).refine((a) => a.filter((v) => v !== null).length <= 15);
const treeInput = z.object({ tree }).strict();
export const treeSchemas = {
  'binary-tree-inorder-traversal': treeInput,
  'maximum-depth-of-binary-tree': treeInput,
  'invert-binary-tree': treeInput,
  'symmetric-tree': treeInput,
  'diameter-of-binary-tree': treeInput,
  'convert-sorted-array-to-binary-search-tree': z.object({ nums: z.array(integer).max(15).refine((a) => a.every((v, i) => i === 0 || a[i - 1] < v)) }).strict(),
  'validate-binary-search-tree': treeInput,
  'kth-smallest-element-in-a-bst': z.object({ tree, k: z.number().int().min(1).max(15) }).strict().refine(({ tree, k }) => {
    try { const nodes = parseTree(tree); return isStrictBST(nodes) && k <= nodes.length; } catch { return false; }
  }),
  'binary-tree-right-side-view': treeInput,
  'flatten-binary-tree-to-linked-list': treeInput,
};
export type TreeId = keyof typeof treeSchemas;
export interface TreeSlot { id: number; depth: number; slot: number }
export interface TreeEdge { from: number; to: number; side: 'L' | 'R' }
export interface TreeCall { key: number; node: number | null; label: string }
export interface TreeView {
  version: 1;
  slots: TreeSlot[];
  maxDepth: number;
  stack: TreeCall[];
  output: number[];
  outputLabel: string;
  metrics: Record<string, Scalar>;
  path: number[];
  changed: TreeEdge[];
  retired: TreeEdge[];
  beforeSlots?: TreeSlot[];
  returning?: { from: number; to: number | null; value: Scalar };
  pair?: [number | null, number | null];
  bounds?: { node: number; low: number | null; high: number | null };
  source?: number[];
  sourceLabel?: string;
  sequence?: { label: string; values: number[]; cursor: number };
  frequencies?: { label: string; value: number }[];
  matches?: number[][];
  targets?: number[];
  range?: [number, number];
  flat: boolean;
}
export const treeView = (frame: Frame) => frame.variables.view as TreeView;

export function runTree(id: TreeId, input: unknown): Trace {
  const parsed = treeSchemas[id].parse(input);
  const nodes: TreeNode[] = 'tree' in parsed ? parseTree(parsed.tree) : [];
  const { state, emit, finish } = recorder(id, input);
  const view: TreeView = { version: 1, slots: [], maxDepth: Math.max(0, ...nodes.map((n) => n.depth)), stack: [], output: [], outputLabel: '已确定的节点顺序', metrics: {}, path: [], changed: [], retired: [], flat: id === 'flatten-binary-tree-to-linked-list' };
  let callKey = 0;
  const root = (): number | null => nodes.length ? 0 : null;
  const layout = () => {
    const slots: TreeSlot[] = [];
    const walk = (node: number | null, depth: number, slot: number) => {
      if (node === null) return;
      slots.push({ id: node, depth, slot }); walk(nodes[node].left, depth + 1, slot * 2); walk(nodes[node].right, depth + 1, slot * 2 + 1);
    };
    walk(root(), 0, 0); view.slots = slots;
  };
  layout();
  const focus = (pointers: Record<string, number | null>) => { state.pointers = pointers; state.active = [...new Set(Object.values(pointers).filter((n): n is number => n !== null))]; };
  const sync = () => {
    state.values = nodes.map((node) => node.value); state.links = []; state.edgeLabels = {};
    for (const node of nodes) for (const side of ['left', 'right'] as const) {
      const to = node[side]; if (to !== null) { state.links.push([node.id, to]); state.edgeLabels[`${node.id}-${to}`] = side === 'left' ? 'L' : 'R'; }
    }
  };
  const record = (location: string, action: string, explanation: string, variables: Record<string, unknown> = {}) => {
    sync(); state.variables = { view, ...variables }; emit(location, action, explanation);
    view.changed = []; view.retired = []; delete view.beforeSlots; delete view.returning;
  };
  const setChild = (node: number, side: 'left' | 'right', to: number | null) => {
    const before = nodes[node][side], label = side === 'left' ? 'L' : 'R';
    if (before !== to) {
      if (before !== null) view.retired.push({ from: node, to: before, side: label });
      if (to !== null) view.changed.push({ from: node, to, side: label });
    }
    nodes[node][side] = to;
  };
  const enter = (node: number | null, label: string) => { view.stack.push({ key: callKey++, node, label }); focus({ current: node }); };
  const leave = (node: number | null, value: Scalar) => {
    view.stack.pop(); focus({ current: node });
    if (node !== null) { view.returning = { from: node, to: view.stack.at(-1)?.node ?? null, value }; if (!state.settled.includes(node)) state.settled.push(node); }
  };
  const done = (result: unknown) => {
    sync(); state.active = []; state.pointers = {}; delete view.returning; delete view.bounds; delete view.pair;
    return finish(result, 'return');
  };

  if (id === 'convert-sorted-array-to-binary-search-tree') {
    const { nums } = treeSchemas[id].parse(input); view.source = nums;
    view.maxDepth = Math.max(0, Math.ceil(Math.log2(nums.length + 1)) - 1);
    record('init', '从有序数组构造树', '每次选择区间的中点，左边构造左子树，右边构造右子树；偶数长度选靠左中点。');
    const build = (left: number, right: number, depth: number, slot: number): number | null => {
      enter(null, `[${left}, ${right}]`); view.range = [left, right];
      record('range', '处理当前区间', `当前闭区间 [${left}, ${right}]。`, { left, right });
      if (left > right) { leave(null, null); record('empty', '空区间返回空树', '没有元素，不分配节点。'); return null; }
      const mid = Math.floor((left + right) / 2), node = nodes.length;
      nodes.push({ id: node, value: nums[mid], left: null, right: null, depth });
      view.slots.push({ id: node, depth, slot }); view.stack.at(-1)!.node = node;
      focus({ current: node }); record('create', '用中点创建根节点', `nums[${mid}] = ${nums[mid]}，创建节点 #${node}。`, { left, right, mid });
      const l = build(left, mid - 1, depth + 1, slot * 2);
      setChild(node, 'left', l); view.range = [left, right]; focus({ current: node, child: l });
      record('attach-left', '左子树返回并接入', '左侧更小的元素已经构造成左子树。');
      const r = build(mid + 1, right, depth + 1, slot * 2 + 1);
      setChild(node, 'right', r); view.range = [left, right]; focus({ current: node, child: r });
      record('attach-right', '右子树返回并接入', '右侧更大的元素已经构造成右子树。');
      leave(node, `#${node}`); record('built', '返回当前子树', `以 #${node} 为根的子树构造完成。`); return node;
    };
    build(0, nums.length - 1, 0, 0); delete view.range;
    return done(serializeTree(nodes));
  }

  if (id === 'binary-tree-inorder-traversal' || id === 'kth-smallest-element-in-a-bst') {
    let current = root(); const stack: number[] = [];
    const k = id === 'kth-smallest-element-in-a-bst' ? treeSchemas[id].parse(input).k : null;
    const stackSync = () => { view.stack = stack.map((node) => ({ key: node, node, label: `#${node}` })); };
    record('init', '沿左侧先走到底', k === null ? '中序顺序：左子树、当前节点、右子树。' : `严格搜索树的中序序列递增；访问第 ${k} 个就停止。`, { k });
    while (current !== null || stack.length) {
      while (current !== null) {
        stack.push(current); stackSync(); focus({ current }); record('push', '记录待访问节点', `#${current} 入栈，先处理它的左子树。`);
        current = nodes[current].left; focus({ current }); record('left', '转向左子树', '遇到空节点后才开始出栈访问。');
      }
      current = stack.pop()!; stackSync(); focus({ current }); record('pop', '取出最近的待访问节点', `#${current} 的左子树已经处理完。`);
      view.output.push(current); state.settled.push(current); view.metrics[current] = `第 ${view.output.length}`;
      record('visit', '访问当前节点', `第 ${view.output.length} 个值是 ${nodes[current].value}。`, { rank: view.output.length, value: nodes[current].value, k });
      if (k !== null && view.output.length === k) { view.path = [current]; return done(nodes[current].value); }
      current = nodes[current].right; focus({ current }); record('right', '转向右子树', '继续按相同顺序访问右子树。');
    }
    return done(view.output.map((n) => nodes[n].value));
  }

  if (id === 'maximum-depth-of-binary-tree' || id === 'diameter-of-binary-tree') {
    let best = 0; const down = new Map<number, number[]>();
    record('init', '自底向上汇总高度', id === 'maximum-depth-of-binary-tree' ? '空树高度为 0，叶子高度为 1；最大深度按节点数计。' : '左右高度之和是经过当前节点的路径边数，最长路径不一定经过根。');
    const height = (node: number | null): number => {
      enter(node, node === null ? '空树' : `高度 #${node}`); record('enter', '进入子问题', node === null ? '检查空子树。' : `计算 #${node} 的子树高度。`);
      if (node === null) { leave(null, 0); record('base', '空树返回 0', '空子树不贡献高度。'); return 0; }
      const l = height(nodes[node].left), r = height(nodes[node].right);
      const leftPath = nodes[node].left === null ? [] : down.get(nodes[node].left!)!, rightPath = nodes[node].right === null ? [] : down.get(nodes[node].right!)!;
      down.set(node, [node, ...(l >= r ? leftPath : rightPath)]);
      focus({ current: node });
      if (id === 'diameter-of-binary-tree') {
        if (l + r > best) { best = l + r; view.path = [...leftPath].reverse().concat(node, rightPath); }
        record('diameter', '用两侧高度检查直径', `${l} + ${r} = ${l + r} 条边，历史最大为 ${best}。`, { left: l, right: r, candidate: l + r, best });
      }
      const result = Math.max(l, r) + 1; view.metrics[node] = `h=${result}`;
      leave(node, result); record('height', '高度返回父节点', `max(${l}, ${r}) + 1 = ${result}。`, { left: l, right: r, height: result }); return result;
    };
    const depth = height(root());
    if (id === 'maximum-depth-of-binary-tree') view.path = nodes.length ? down.get(0)! : [];
    else if (nodes.length && !view.path.length) view.path = [0];
    return done(id === 'maximum-depth-of-binary-tree' ? depth : best);
  }

  if (id === 'invert-binary-tree') {
    record('init', '逐个交换左右子树', '节点的值与身份不变，只调整左右孩子；输出为紧凑层序数组。');
    const invert = (node: number | null): void => {
      enter(node, node === null ? '空树' : `翻转 #${node}`); record('enter', '进入子树', node === null ? '空树不需要交换。' : `处理节点 #${node}。`);
      if (node === null) { leave(null, null); record('empty', '返回空树', '没有节点可翻转。'); return; }
      const left = nodes[node].left, right = nodes[node].right; view.beforeSlots = structuredClone(view.slots);
      setChild(node, 'left', right); setChild(node, 'right', left); layout();
      record('swap', '交换左右孩子', `#${node} 的左右子树交换位置。`);
      invert(nodes[node].left); invert(nodes[node].right);
      leave(node, `#${node}`); record('complete', '当前子树翻转完成', '两个孩子也已递归完成翻转。');
    };
    invert(root()); return done(serializeTree(nodes));
  }

  if (id === 'symmetric-tree') {
    record('init', '成对比较镜像位置', '比较左右子树的外侧与内侧；值相同但结构不同也不对称。');
    const mirror = (a: number | null, b: number | null): boolean => {
      enter(a, `${a === null ? '∅' : `#${a}`} ↔ ${b === null ? '∅' : `#${b}`}`); view.pair = [a, b]; focus({ a, b });
      record('compare', '比较一对镜像节点', '同时为空则匹配，只有一个为空或值不同则失败。');
      if (a === null && b === null) { leave(null, 'true'); record('empty', '两个空位置匹配', '此处结构对称。'); return true; }
      if (a === null || b === null || nodes[a].value !== nodes[b].value) {
        leave(a, 'false'); focus({ a, b }); record('mismatch', '发现镜像不匹配', '停止检查这一对，不把相同值误当成相同结构。'); return false;
      }
      const valid = mirror(nodes[a].left, nodes[b].right) && mirror(nodes[a].right, nodes[b].left);
      view.pair = [a, b]; leave(a, String(valid)); focus({ a, b }); record('return-pair', '返回这一对的判断', `镜像检查结果为 ${valid}。`, { valid }); return valid;
    };
    return done(nodes.length ? mirror(nodes[0].left, nodes[0].right) : true);
  }

  if (id === 'validate-binary-search-tree') {
    record('init', '把祖先约束传给子树', '每个节点必须严格落在所有祖先共同限定的开区间内；不允许重复值。');
    const check = (node: number | null, low: number | null, high: number | null): boolean => {
      enter(node, node === null ? '空树' : `验证 #${node}`);
      if (node === null) { delete view.bounds; leave(null, 'true'); record('empty', '空子树合法', '空子树不违反搜索树规则。'); return true; }
      view.bounds = { node, low, high }; const value = nodes[node].value;
      record('check', '检查祖先给定的开区间', `${low ?? '−∞'} < ${value} < ${high ?? '+∞'}。`, { low, value, high });
      if ((low !== null && value <= low) || (high !== null && value >= high)) {
        leave(node, 'false'); view.metrics[node] = '越界'; record('reject', '不满足严格大小关系', '这个节点违反祖先边界或与边界值重复。', { low, value, high }); return false;
      }
      const valid = check(nodes[node].left, low, value) && check(nodes[node].right, value, high);
      view.bounds = { node, low, high }; view.metrics[node] = valid ? '合法' : '子树失败'; leave(node, String(valid));
      record('checked', '返回当前子树的判断', `当前子树${valid ? '满足' : '不满足'}搜索树条件。`, { valid }); return valid;
    };
    return done(check(root(), null, null));
  }

  if (id === 'binary-tree-right-side-view') {
    const queue = nodes.length ? [0] : []; state.queue = [...queue];
    record('init', '按层读取最右节点', '从队首取出，左孩子先入队、右孩子后入队；每层最后取出的节点就是右侧可见节点。');
    let level = 0;
    while (queue.length) {
      const size = queue.length; level++; record('level', '固定本层节点数', `这一层有 ${size} 个节点，下一层新入队的节点不计入本层。`, { level, size });
      for (let i = 0; i < size; i++) {
        const node = queue.shift()!; state.queue = [...queue]; focus({ current: node });
        record('dequeue', '从队首取出节点', `本层第 ${i + 1} / ${size} 个节点 #${node}。`, { level, i, size });
        if (nodes[node].left !== null) queue.push(nodes[node].left!);
        if (nodes[node].right !== null) queue.push(nodes[node].right!);
        state.queue = [...queue]; record('enqueue', '左孩子先入队，再放右孩子', '保持下一层从左到右的处理顺序。');
        state.settled.push(node);
        if (i === size - 1) { view.output.push(node); view.metrics[node] = '右侧可见'; record('visible', '记录本层最右节点', `第 ${level} 层从右侧看到 ${nodes[node].value}。`, { level, value: nodes[node].value }); }
      }
    }
    return done(view.output.map((n) => nodes[n].value));
  }

  let current = root(); focus({ current });
  record('init', '按前序顺序展开', '左子树接到右侧，原右子树接到左子树的最右节点；不交换或复制节点值。');
  while (current !== null) {
    focus({ current }); record('inspect', '检查当前节点左子树', nodes[current].left === null ? '没有左子树，可以沿右边继续。' : '先找到左子树中最右的节点。');
    if (nodes[current].left !== null) {
      let predecessor = nodes[current].left!; focus({ current, predecessor });
      record('predecessor', '寻找连接原右子树的位置', '沿左子树的右指针向下走。');
      while (nodes[predecessor].right !== null) { predecessor = nodes[predecessor].right!; focus({ current, predecessor }); record('walk-right', '继续向右寻找', '保留原右子树的连接位置。'); }
      setChild(predecessor, 'right', nodes[current].right); record('bridge', '接上原右子树', '原右子树先连接到前驱，不丢失任何节点。');
      setChild(current, 'right', nodes[current].left); setChild(current, 'left', null);
      record('lift', '左子树移到右侧，清空左指针', '当前节点完成展开，后续仍按相同方式处理。');
    }
    view.output.push(current); state.settled.push(current); current = nodes[current].right; focus({ current });
    record('advance', '沿右链处理下一个节点', '下方依次排出已经展开的节点，身份与值保持不变。');
  }
  view.outputLabel = '前序展开后的右链'; return done(view.output.map((n) => nodes[n].value));
}
