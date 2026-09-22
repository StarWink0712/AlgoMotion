import type { CodeLanguage, ProblemId } from '../src/engine/types';

export const treeNativeMethods = {
  'binary-tree-inorder-traversal': 'inorderTraversal', 'maximum-depth-of-binary-tree': 'maxDepth',
  'invert-binary-tree': 'invertTree', 'symmetric-tree': 'isSymmetric', 'diameter-of-binary-tree': 'diameterOfBinaryTree',
  'convert-sorted-array-to-binary-search-tree': 'sortedArrayToBST', 'validate-binary-search-tree': 'isValidBST',
  'kth-smallest-element-in-a-bst': 'kthSmallest', 'binary-tree-right-side-view': 'rightSideView',
  'flatten-binary-tree-to-linked-list': 'flatten',
} as const;
export function treeInvocation(id: ProblemId, input: unknown, language: CodeLanguage, literal: (value: unknown, language: CodeLanguage, nullable?: boolean) => string): string | undefined {
  if (!(id in treeNativeMethods)) return;
  const key = id as keyof typeof treeNativeMethods, data = input as Record<string, unknown>;
  if (id === 'flatten-binary-tree-to-linked-list' || id === 'invert-binary-tree') return `mutatedTree(${literal(data.tree, language, true)})`;
  const build = id === 'convert-sorted-array-to-binary-search-tree';
  const args = [build ? literal(data.nums, language) : `buildTree(${literal(data.tree, language, true)})`];
  if (id === 'kth-smallest-element-in-a-bst') args.push(literal(data.k, language));
  const call = `${language === 'java' ? 'new Solution().' : language === 'python' ? 'Solution().' : ''}${treeNativeMethods[key]}(${args.join(', ')})`;
  return build ? `collectTree(${call})` : call;
}

const javaSerialize = `
  static java.util.List<Integer> collectTree(TreeNode root) {
    java.util.List<Integer> result = new java.util.ArrayList<>();
    java.util.List<TreeNode> queue = new java.util.ArrayList<>();
    java.util.Set<TreeNode> seen = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
    if (root != null) queue.add(root);
    for (int i = 0; i < queue.size(); i++) {
      TreeNode node = queue.get(i);
      if (node == null) result.add(null);
      else {
        if (!seen.add(node) || seen.size() > 100) throw new AssertionError("Not a finite tree");
        result.add(node.val); queue.add(node.left); queue.add(node.right);
      }
    }
    while (!result.isEmpty() && result.get(result.size()-1) == null) result.remove(result.size()-1);
    return result;
  }
  static void preorder(TreeNode root, java.util.List<TreeNode> out) {
    if (root == null) return;
    if (out.contains(root) || out.size() > 100) throw new AssertionError("Not a finite tree");
    out.add(root); preorder(root.left, out); preorder(root.right, out);
  }
`;
const goSerialize = `
  func collectTree(root *TreeNode) []any {
    result, queue, seen := []any{}, []*TreeNode{}, map[*TreeNode]bool{}
    if root != nil { queue = append(queue, root) }
    for i := 0; i < len(queue); i++ {
      node := queue[i]
      if node == nil { result = append(result, nil) } else {
        if seen[node] || len(seen) > 100 { panic("Not a finite tree") }; seen[node] = true
        result = append(result, node.Val); queue = append(queue, node.Left, node.Right)
      }
    }
    for len(result) > 0 && result[len(result)-1] == nil { result = result[:len(result)-1] }
    return result
  }
  func preorder(root *TreeNode, out *[]*TreeNode) {
    if root == nil { return }
    if len(*out) > 100 { panic("Not a finite tree") }
    for _, node := range *out { if node == root { panic("Not a finite tree") } }
    *out = append(*out, root); preorder(root.Left, out); preorder(root.Right, out)
  }
`;
const pythonSerialize = `
def collectTree(root):
    result, queue, seen = [], [root] if root is not None else [], set()
    for node in queue:
        if node is None:
            result.append(None)
        else:
            assert node not in seen and len(seen) < 100, 'Not a finite tree'
            seen.add(node)
            result.append(node.val)
            queue.extend([node.left, node.right])
    while result and result[-1] is None:
        result.pop()
    return result

def preorder(root, out):
    if root is None:
        return
    assert root not in out and len(out) < 100, 'Not a finite tree'
    out.append(root)
    preorder(root.left, out)
    preorder(root.right, out)
`;

export function treeNativeHelpers(id: keyof typeof treeNativeMethods, language: CodeLanguage): string {
  const flatten = id === 'flatten-binary-tree-to-linked-list', invert = id === 'invert-binary-tree';
  if (language === 'java') return javaSerialize + (!(flatten || invert) ? '' : `
  static Object mutatedTree(Integer[] values) {
    TreeNode root = buildTree(values); java.util.List<TreeNode> before = new java.util.ArrayList<>(); preorder(root, before);
    int[] oldValues = new int[before.size()]; TreeNode[] left = new TreeNode[before.size()], right = new TreeNode[before.size()];
    for (int i = 0; i < before.size(); i++) { oldValues[i] = before.get(i).val; left[i] = before.get(i).left; right[i] = before.get(i).right; }
    TreeNode result = new Solution().${flatten ? 'flatten' : 'invertTree'}(root);
    if (result != root) throw new AssertionError("Root identity changed");
    ${flatten ? `TreeNode current = result; java.util.List<Integer> out = new java.util.ArrayList<>();
    for (int i = 0; i < before.size(); i++) {
      if (current != before.get(i) || current.left != null || current.val != oldValues[i]) throw new AssertionError("Not a preserved preorder right chain");
      out.add(current.val); current = current.right;
    }
    if (current != null) throw new AssertionError("Extra nodes or cycle"); return out;` : `for (int i = 0; i < before.size(); i++) {
      TreeNode node = before.get(i);
      if (node.left != right[i] || node.right != left[i] || node.val != oldValues[i]) throw new AssertionError("Not an identity-preserving inversion");
    }
    return collectTree(result);`}
  }
`);
  if (language === 'go') return goSerialize + (!(flatten || invert) ? '' : `
  func mutatedTree(values []any) any {
    root := buildTree(values); before := []*TreeNode{}; preorder(root, &before)
    oldValues, left, right := []int{}, []*TreeNode{}, []*TreeNode{}
    for _, node := range before { oldValues = append(oldValues, node.Val); left = append(left, node.Left); right = append(right, node.Right) }
    result := ${flatten ? 'flatten' : 'invertTree'}(root)
    if result != root { panic("Root identity changed") }
    ${flatten ? `current, out := result, []int{}
    for i, node := range before {
      if current != node || current.Left != nil || current.Val != oldValues[i] { panic("Not a preserved preorder right chain") }
      out = append(out, current.Val); current = current.Right
    }
    if current != nil { panic("Extra nodes or cycle") }; return out` : `for i, node := range before {
      if node.Left != right[i] || node.Right != left[i] || node.Val != oldValues[i] { panic("Not an identity-preserving inversion") }
    }
    return collectTree(result)`}
  }
`);
  return pythonSerialize + (!(flatten || invert) ? '' : `
def mutatedTree(values):
    root = buildTree(values)
    before = []
    preorder(root, before)
    old = [(node.val, node.left, node.right) for node in before]
    result = Solution().${flatten ? 'flatten' : 'invertTree'}(root)
    assert result is root, 'Root identity changed'
${flatten ? `    current, out = result, []
    for node, (value, _, _) in zip(before, old):
        assert current is node and current.left is None and current.val == value, 'Not a preserved preorder right chain'
        out.append(current.val)
        current = current.right
    assert current is None, 'Extra nodes or cycle'
    return out` : `    for node, (value, left, right) in zip(before, old):
        assert node.val == value and node.left is right and node.right is left, 'Not an identity-preserving inversion'
    return collectTree(result)`}
`);
}
