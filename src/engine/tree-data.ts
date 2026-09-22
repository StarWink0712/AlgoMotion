export interface TreeNode { id: number; value: number; left: number | null; right: number | null; depth: number }

// Compact level order, not heap indices; keep the original preset's parsing semantics.
export function parseTree(values: (number | null)[]): TreeNode[] {
  if (!values.length) return [];
  if (values[0] === null) {
    if (values.some((v) => v !== null)) throw new Error('空根节点后不能出现非空节点。');
    return [];
  }
  const nodes: TreeNode[] = [{ id: 0, value: values[0], left: null, right: null, depth: 0 }];
  let pos = 1;
  for (let parent = 0; parent < nodes.length && pos < values.length; parent++) {
    for (const side of ['left', 'right'] as const) {
      if (pos >= values.length) break;
      const value = values[pos++];
      if (value !== null) {
        const node = { id: nodes.length, value, left: null, right: null, depth: nodes[parent].depth + 1 };
        if (node.depth > 4) throw new Error('可视化最多支持 5 层二叉树。');
        nodes[parent][side] = node.id;
        nodes.push(node);
      }
    }
  }
  if (values.slice(pos).some((v) => v !== null)) throw new Error('层序序列包含没有父节点的值。');
  return nodes;
}

export function serializeTree(nodes: TreeNode[], root: number | null = nodes.length ? 0 : null): (number | null)[] {
  const result: (number | null)[] = [], queue: (number | null)[] = root === null ? [] : [root], seen = new Set<number>();
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (id === null) result.push(null);
    else {
      if (seen.has(id)) throw new Error('内部错误：输出不是一棵树。');
      seen.add(id); result.push(nodes[id].value); queue.push(nodes[id].left, nodes[id].right);
    }
  }
  while (result.at(-1) === null) result.pop();
  return result;
}

export function isStrictBST(nodes: TreeNode[]): boolean {
  const check = (id: number | null, low: number, high: number): boolean => id === null || (nodes[id].value > low && nodes[id].value < high && check(nodes[id].left, low, nodes[id].value) && check(nodes[id].right, nodes[id].value, high));
  return check(nodes.length ? 0 : null, -Infinity, Infinity);
}
