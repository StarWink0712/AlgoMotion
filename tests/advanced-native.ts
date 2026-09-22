import type { CodeLanguage, ProblemId } from '../src/engine/types';
import { linkedJavaHelpers, linkedGoHelpers, linkedPythonHelpers } from './linked-list-native';

export const advancedNativeMethods = {
  'construct-binary-tree-from-preorder-and-inorder-traversal': 'buildTree', 'path-sum-iii': 'pathSum',
  'lowest-common-ancestor-of-a-binary-tree': 'lowestCommonAncestor', 'binary-tree-maximum-path-sum': 'maxPathSum',
  'sort-list': 'sortList', 'merge-k-sorted-lists': 'mergeKLists',
  'lru-cache': 'runOperations', permutations: 'permute', subsets: 'subsets', 'combination-sum': 'combinationSum',
} as const;
type Literal = (value: unknown, language: CodeLanguage, nullable?: boolean, strings?: boolean, matrix?: boolean) => string;
export function advancedInvocation(id: ProblemId, input: unknown, language: CodeLanguage, literal: Literal): string | undefined {
  if (!(id in advancedNativeMethods)) return;
  const data = input as Record<string, unknown>, value = (v: unknown) => literal(v, language);
  const prefix = language === 'java' ? 'new Solution().' : language === 'python' ? 'Solution().' : '';
  const method = language === 'go' && id === 'construct-binary-tree-from-preorder-and-inorder-traversal' ? 'buildTreeFromOrders' : advancedNativeMethods[id as keyof typeof advancedNativeMethods];
  const call = (args: string[]) => `${prefix}${method}(${args.join(', ')})`;
  if (id === 'construct-binary-tree-from-preorder-and-inorder-traversal') return `collectTree(${call([value(data.preorder), value(data.inorder)])})`;
  if (id === 'lowest-common-ancestor-of-a-binary-tree') return `lcaResult(${literal(data.tree, language, true)}, ${value(data.p)}, ${value(data.q)})`;
  if (id === 'path-sum-iii' || id === 'binary-tree-maximum-path-sum') return call([`buildTree(${literal(data.tree, language, true)})`, ...(id === 'path-sum-iii' ? [value(data.targetSum)] : [])]);
  if (id === 'sort-list' || id === 'merge-k-sorted-lists') return `mergeResult(${literal(id === 'sort-list' ? [data.values] : data.lists, language, false, false, true)})`;
  if (id === 'lru-cache') {
    const ops = data.operations as { op: string; key: number; value?: number }[];
    return call([value(data.capacity), value(ops.map((o) => o.op === 'get' ? 0 : 1)), value(ops.map((o) => o.key)), value(ops.map((o) => o.value ?? 0))]);
  }
  return call(id === 'combination-sum' ? [value(data.candidates), value(data.target)] : [value(data.nums)]);
}

export function advancedNativeHelpers(id: keyof typeof advancedNativeMethods, language: CodeLanguage): string {
  if (id === 'lowest-common-ancestor-of-a-binary-tree') {
    if (language === 'java') return `
  static Object lcaResult(Integer[] values, int p, int q) {
    TreeNode root = buildTree(values); java.util.List<TreeNode> queue = new java.util.ArrayList<>(); queue.add(root);
    for (int i = 0; i < queue.size(); i++) {
      TreeNode n = queue.get(i); if (n.left != null) queue.add(n.left); if (n.right != null) queue.add(n.right);
    }
    String before = collectTree(root).toString();
    TreeNode answer = new Solution().lowestCommonAncestor(root, queue.get(p), queue.get(q));
    int index = queue.indexOf(answer);
    if (index < 0 || !before.equals(collectTree(root).toString())) throw new AssertionError("Invalid LCA identity or mutation");
    java.util.Map<String, Integer> out = new java.util.LinkedHashMap<>(); out.put("id", index); out.put("value", answer.val); return out;
  }
`;
    if (language === 'go') return `
func lcaResult(values []any, p, q int) any {
    root := buildTree(values); queue := []*TreeNode{root}
    for i := 0; i < len(queue); i++ { n := queue[i]; if n.Left != nil { queue = append(queue, n.Left) }; if n.Right != nil { queue = append(queue, n.Right) } }
    before := collectTree(root)
    answer := lowestCommonAncestor(root, queue[p], queue[q]); after := collectTree(root)
    if len(before) != len(after) { panic("LCA mutated tree") }; for i := range before { if before[i] != after[i] { panic("LCA mutated tree") } }
    for i, n := range queue { if n == answer { return map[string]int{"id": i, "value": answer.Val} } }
    panic("Invalid LCA identity")
}
`;
    return `
def lcaResult(values, p, q):
    root = buildTree(values)
    queue = [root]
    for node in queue:
        if node.left is not None:
            queue.append(node.left)
        if node.right is not None:
            queue.append(node.right)
    before = [(n.val, n.left, n.right) for n in queue]
    answer = Solution().lowestCommonAncestor(root, queue[p], queue[q])
    assert answer in queue and before == [(n.val, n.left, n.right) for n in queue]
    return {'id': queue.index(answer), 'value': answer.val}
`;
  }
  if (id !== 'sort-list' && id !== 'merge-k-sorted-lists') return '';
  const sort = id === 'sort-list';
  if (language === 'java') return linkedJavaHelpers['merge-two-sorted-lists']! + `
  static Object mergeResult(int[][] values) {
    ListNode[] heads = new ListNode[values.length]; java.util.List<ListNode> expected = new java.util.ArrayList<>();
    java.util.Map<ListNode, Integer> old = new java.util.IdentityHashMap<>();
    for (int i = 0; i < values.length; i++) { heads[i] = buildList(values[i]); expected.addAll(listNodes(heads[i])); }
    for (ListNode n : expected) old.put(n, n.val);
    expected.sort((a, b) -> Integer.compare(old.get(a), old.get(b)));
    ListNode result = new Solution().${sort ? 'sortList(heads[0])' : 'mergeKLists(heads)'};
    java.util.List<ListNode> actual = listNodes(result);
    if (!actual.equals(expected)) throw new AssertionError("Lost, copied, reordered duplicate or extra nodes");
    for (ListNode n : actual) if (n.val != old.get(n)) throw new AssertionError("Node value changed");
    return collectList(result);
  }
`;
  if (language === 'go') return linkedGoHelpers['merge-two-sorted-lists']! + `
func mergeResult(values [][]int) []int {
    heads, expected, old := []*ListNode{}, []*ListNode{}, map[*ListNode]int{}
    for _, items := range values { head := buildList(items); heads = append(heads, head); expected = append(expected, listNodes(head)...)}
    for _, n := range expected { old[n] = n.Val }
    // Independent stable insertion ordering of original node identities.
    for i := 1; i < len(expected); i++ { n, j := expected[i], i; for j > 0 && old[expected[j-1]] > old[n] { expected[j] = expected[j-1]; j-- }; expected[j] = n }
    result := ${sort ? 'sortList(heads[0])' : 'mergeKLists(heads)'}
    actual := listNodes(result)
    if len(actual) != len(expected) { panic("Node count changed") }
    for i, n := range actual { if n != expected[i] || n.Val != old[n] { panic("Node identity, value or duplicate stability changed") } }
    return collectList(result)
}
`;
  return linkedPythonHelpers['merge-two-sorted-lists']! + `
def mergeResult(values):
    heads = [buildList(items) for items in values]
    original = [node for head in heads for node in listNodes(head)]
    old = {node: node.val for node in original}
    expected = sorted(original, key=lambda n: old[n])
    result = Solution().${sort ? 'sortList(heads[0])' : 'mergeKLists(heads)'}
    actual = listNodes(result)
    assert actual == expected, 'Node identity or duplicate stability changed'
    assert all(node.val == old[node] for node in actual), 'Node value changed'
    return collectList(result)
`;
}
