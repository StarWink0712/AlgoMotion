import { z } from 'zod';
import { recorder } from '../recorder';
import { parseTree, serializeTree, type TreeNode } from '../tree-data';
import type { Trace } from '../types';
import type { TreeView } from './trees';

const integer = z.number().int().min(-10000).max(10000);
const tree = z.array(integer.nullable()).max(31).refine((a) => a.filter((v) => v !== null).length <= 15);
const distinct = z.array(integer).max(15).refine((a) => new Set(a).size === a.length);
export const advancedTreeSchemas = {
  'construct-binary-tree-from-preorder-and-inorder-traversal': z.object({ preorder: distinct, inorder: distinct }).strict().refine(({ preorder, inorder }) => {
    if (preorder.length !== inorder.length) return false;
    const positions = new Map(inorder.map((v, i) => [v, i])); let cursor = 0;
    const check = (lo: number, hi: number, depth: number): boolean => {
      if (lo > hi) return true;
      const mid = positions.get(preorder[cursor++]);
      return depth < 5 && mid !== undefined && mid >= lo && mid <= hi && check(lo, mid - 1, depth + 1) && check(mid + 1, hi, depth + 1);
    };
    return check(0, inorder.length - 1, 0) && cursor === preorder.length;
  }),
  'path-sum-iii': z.object({ tree, targetSum: z.number().int().min(-150000).max(150000) }).strict(),
  'lowest-common-ancestor-of-a-binary-tree': z.object({ tree, p: z.number().int().min(0).max(14), q: z.number().int().min(0).max(14) }).strict().refine(({ tree, p, q }) => {
    try { return Math.max(p, q) < parseTree(tree).length; } catch { return false; }
  }),
  'binary-tree-maximum-path-sum': z.object({ tree: tree.refine((a) => a.some((v) => v !== null)) }).strict(),
};
export type AdvancedTreeId = keyof typeof advancedTreeSchemas;

export function runAdvancedTree(id: AdvancedTreeId, input: unknown): Trace {
  const data = advancedTreeSchemas[id].parse(input), nodes: TreeNode[] = 'tree' in data ? parseTree(data.tree) : [];
  const { state, emit, finish } = recorder(id, input);
  const view: TreeView = { version: 1, slots: [], maxDepth: 4, stack: [], output: [], outputLabel: '已确定节点', metrics: {}, path: [], changed: [], retired: [], flat: false };
  const layout = (node: number | null, depth: number, slot: number) => {
    if (node === null) return;
    view.slots.push({ id: node, depth, slot }); layout(nodes[node].left, depth + 1, slot * 2); layout(nodes[node].right, depth + 1, slot * 2 + 1);
  };
  layout(nodes.length ? 0 : null, 0, 0);
  if (nodes.length) view.maxDepth = Math.max(...nodes.map((n) => n.depth));
  let callKey = 0;
  const focus = (node: number | null) => { state.active = node === null ? [] : [node]; state.pointers = { current: node }; };
  const record = (location: string, action: string, explanation: string, vars: Record<string, unknown> = {}) => {
    state.values = nodes.map((n) => n.value); state.links = []; state.edgeLabels = {};
    for (const node of nodes) for (const side of ['left', 'right'] as const) {
      const child = node[side]; if (child !== null) { state.links.push([node.id, child]); state.edgeLabels[`${node.id}-${child}`] = side === 'left' ? 'L' : 'R'; }
    }
    state.variables = { view, ...vars }; emit(location, action, explanation); view.changed = []; delete view.returning;
  };
  const enter = (node: number | null, label: string) => { view.stack.push({ key: callKey++, node, label }); focus(node); };
  const leave = (node: number | null, result: number | string | null) => {
    view.stack.pop(); focus(node);
    if (node !== null) view.returning = { from: node, to: view.stack.at(-1)?.node ?? null, value: result };
  };
  const done = (result: unknown) => { state.active = []; state.pointers = {}; view.changed = []; delete view.returning; return finish(result, 'return'); };

  if (id === 'construct-binary-tree-from-preorder-and-inorder-traversal') {
    const { preorder, inorder } = advancedTreeSchemas[id].parse(input);
    view.source = inorder; view.sourceLabel = '中序输入'; view.sequence = { label: '前序输入', values: preorder, cursor: 0 };
    const positions = new Map(inorder.map((v, i) => [v, i])); let cursor = 0;
    record('init', '前序定根，中序分左右', '两个序列值互异且描述同一棵树；只在实际递归创建时显示节点。');
    const build = (lo: number, hi: number, depth: number, slot: number): number | null => {
      enter(null, `[${lo},${hi}]`); view.range = [lo, hi];
      if (lo > hi) { leave(null, null); record('empty', '空区间返回', '这个位置没有孩子。'); return null; }
      const value = preorder[cursor++], mid = positions.get(value)!, node = nodes.length;
      nodes.push({ id: node, value, left: null, right: null, depth }); view.slots.push({ id: node, depth, slot });
      view.stack.at(-1)!.node = node; view.sequence!.cursor = cursor; focus(node);
      record('create', '消耗一个前序元素作为根', `值 ${value} 在中序位置 ${mid}，左右区间分别构造子树。`, { cursor, lo, hi, mid });
      for (const side of ['left', 'right'] as const) {
        const child = side === 'left' ? build(lo, mid - 1, depth + 1, slot * 2) : build(mid + 1, hi, depth + 1, slot * 2 + 1);
        nodes[node][side] = child; if (child !== null) view.changed = [{ from: node, to: child, side: side === 'left' ? 'L' : 'R' }];
        view.range = [lo, hi]; focus(node); record(side === 'left' ? 'attach-left' : 'attach-right', '接入已构造的子树', `#${node} 的${side === 'left' ? '左' : '右'}孩子为 ${child === null ? '空' : `#${child}`}。`);
      }
      leave(node, `#${node}`); record('built', '返回当前根', '这一段中序区间已全部构造。'); return node;
    };
    build(0, inorder.length - 1, 0, 0); delete view.range;
    return done(serializeTree(nodes));
  }
  if (id === 'path-sum-iii') {
    const { targetSum } = advancedTreeSchemas[id].parse(input);
    const counts = new Map<number, number>([[0, 1]]), path: number[] = [], prefixes = [0]; let total = 0;
    const badges = () => { view.frequencies = [...counts].map(([sum, count]) => ({ label: String(sum), value: count })); };
    badges(); record('init', '统计当前祖先路径的前缀和', '路径只能向下且非空，可以不从根开始；0 前缀出现一次。', { targetSum, total });
    const visit = (node: number | null, prefix: number): number => {
      if (node === null) return 0;
      enter(node, `前缀 #${node}`); path.push(node);
      const sum = prefix + nodes[node].value, need = sum - targetSum, found = counts.get(need) ?? 0;
      total += found; view.path = [...path]; view.matches = prefixes.flatMap((p, i) => p === need ? [path.slice(i)] : []);
      record('lookup', '先查询祖先前缀，再登记当前前缀', `${sum} − ${targetSum} = ${need}，命中 ${found} 条向下路径。`, { sum, targetSum, need, found, total });
      counts.set(sum, (counts.get(sum) ?? 0) + 1); prefixes.push(sum); badges(); view.matches = [];
      record('push', '前缀加入当前递归分支', '重复前缀按次数记录，不能只存是否出现。', { sum, total });
      const subtotal = found + visit(nodes[node].left, sum) + visit(nodes[node].right, sum);
      counts.set(sum, counts.get(sum)! - 1); if (!counts.get(sum)) counts.delete(sum);
      prefixes.pop(); path.pop(); badges(); view.path = [...path]; leave(node, subtotal);
      record('pop', '离开节点，撤销前缀', '当前节点的前缀不能污染兄弟分支；向父节点返回本子树找到的路径数。', { sum, subtotal, total }); return subtotal;
    };
    visit(nodes.length ? 0 : null, 0); return done(total);
  }
  if (id === 'lowest-common-ancestor-of-a-binary-tree') {
    const { p, q } = advancedTreeSchemas[id].parse(input); view.targets = [p, q];
    record('init', '用节点身份寻找最近公共祖先', `p=#${p}、q=#${q}；ID 按非空节点层序编号，不按值查找，允许同一个节点。`, { p, q });
    const search = (node: number | null): number | null => {
      enter(node, node === null ? '空' : `查找 #${node}`); record('enter', '进入当前子树', '命中目标直接返回它，否则查看两侧返回值。');
      if (node === null || node === p || node === q) {
        leave(node, node === null ? null : `#${node}`); record('base', '空树或命中目标', node === null ? '没有目标。' : `返回目标 #${node}，祖先可以是目标本身。`); return node;
      }
      const left = search(nodes[node].left), right = search(nodes[node].right), result = left !== null && right !== null ? node : left ?? right;
      view.metrics[node] = result === null ? '无目标' : `返回 #${result}`; leave(node, result === null ? null : `#${result}`);
      record('combine', '合并左右子树的返回值', '两侧都找到目标则当前节点是祖先；否则向上转交非空一侧。', { left, right, ancestor: result }); return result;
    };
    const result = search(0)!; view.path = [result]; view.output = [result]; view.outputLabel = '最近公共祖先';
    return done({ id: result, value: nodes[result].value });
  }
  let best: number | null = null; const down = new Map<number, number[]>();
  record('init', '单侧贡献上交，双侧路径更新答案', '路径至少包含一个节点；负贡献可以不取，但全负树不能返回空路径的 0。');
  const gain = (node: number | null): number => {
    enter(node, node === null ? '空' : `贡献 #${node}`);
    if (node === null) { leave(null, 0); record('base', '空树贡献 0', '空孩子不提供额外收益。'); return 0; }
    record('enter', '先计算两侧单边贡献', `进入 #${node}，返回父节点时只能选择一侧。`);
    const left = Math.max(0, gain(nodes[node].left)), right = Math.max(0, gain(nodes[node].right));
    const a = left > 0 ? down.get(nodes[node].left!)! : [], b = right > 0 ? down.get(nodes[node].right!)! : [];
    const candidate = left + nodes[node].value + right;
    if (best === null || candidate > best) { best = candidate; view.path = [...a].reverse().concat(node, b); }
    focus(node); record('candidate', '两侧相接，检查完整路径', `${left} + (${nodes[node].value}) + ${right} = ${candidate}，最大值 ${best}。`, { left, value: nodes[node].value, right, candidate, best });
    const result = nodes[node].value + Math.max(left, right); down.set(node, [node, ...(left >= right ? a : b)]); view.metrics[node] = `↑${result}`;
    leave(node, result); record('gain', '只把单侧路径交给父节点', `${nodes[node].value} + max(${left}, ${right}) = ${result}，不能把两条分支一起向上延伸。`, { left, right, gain: result, best }); return result;
  };
  gain(0); return done(best);
}
