import { treeReference } from './tree-references';
import type { AdvancedTreeId } from './advanced-trees';
import type { CodeLanguage, ReferenceCode } from '../types';

export const advancedTreeReferences: Record<AdvancedTreeId, Record<CodeLanguage, ReferenceCode>> = {
  'construct-binary-tree-from-preorder-and-inorder-traversal': treeReference(
`    public TreeNode buildTree(int[] preorder, int[] inorder) {
        Map<Integer, Integer> positions = new HashMap<>(); // @trace init
        for (int i = 0; i < inorder.length; i++) positions.put(inorder[i], i);
        return build(preorder, positions, new int[]{0}, 0, inorder.length - 1); // @trace return
    }
    private TreeNode build(int[] pre, Map<Integer, Integer> positions, int[] cursor, int lo, int hi) {
        if (lo > hi) return null; // @trace empty
        TreeNode root = new TreeNode(pre[cursor[0]++]); // @trace create
        int mid = positions.get(root.val);
        root.left = build(pre, positions, cursor, lo, mid - 1); // @trace attach-left
        root.right = build(pre, positions, cursor, mid + 1, hi); // @trace attach-right
        return root; // @trace built
    }`,
`func buildTreeFromOrders(preorder, inorder []int) *TreeNode {
    positions, cursor := map[int]int{}, 0 // @trace init
    for i, value := range inorder { positions[value] = i }
    var build func(int, int) *TreeNode
    build = func(lo, hi int) *TreeNode {
        if lo > hi { return nil } // @trace empty
        root := &TreeNode{Val: preorder[cursor]}; cursor++ // @trace create
        mid := positions[root.Val]
        root.Left = build(lo, mid-1) // @trace attach-left
        root.Right = build(mid+1, hi) // @trace attach-right
        return root // @trace built
    }
    return build(0, len(inorder)-1) // @trace return
}`,
`    def buildTree(self, preorder: list[int], inorder: list[int]):
        positions, cursor = {v: i for i, v in enumerate(inorder)}, 0 # @trace init
        def build(lo, hi):
            nonlocal cursor
            if lo > hi:
                return None # @trace empty
            root = TreeNode(preorder[cursor]) # @trace create
            cursor += 1
            mid = positions[root.val]
            root.left = build(lo, mid - 1) # @trace attach-left
            root.right = build(mid + 1, hi) # @trace attach-right
            return root # @trace built
        return build(0, len(inorder) - 1) # @trace return`, '输入序列互异且匹配；Go 函数命名 buildTreeFromOrders，避免与测试层序构造器重名。'),
  'path-sum-iii': treeReference(
`    public int pathSum(TreeNode root, int targetSum) {
        Map<Long, Integer> counts = new HashMap<>(); counts.put(0L, 1); // @trace init
        return visit(root, 0L, targetSum, counts); // @trace return
    }
    private int visit(TreeNode node, long prefix, int target, Map<Long, Integer> counts) {
        if (node == null) return 0;
        long sum = prefix + node.val;
        int total = counts.getOrDefault(sum - target, 0); // @trace lookup
        counts.put(sum, counts.getOrDefault(sum, 0) + 1); // @trace push
        total += visit(node.left, sum, target, counts) + visit(node.right, sum, target, counts);
        counts.put(sum, counts.get(sum) - 1); // @trace pop
        if (counts.get(sum) == 0) counts.remove(sum);
        return total;
    }`,
`func pathSum(root *TreeNode, targetSum int) int {
    counts := map[int64]int{0: 1} // @trace init
    var visit func(*TreeNode, int64) int
    visit = func(node *TreeNode, prefix int64) int {
        if node == nil { return 0 }
        sum := prefix + int64(node.Val)
        total := counts[sum-int64(targetSum)] // @trace lookup
        counts[sum]++ // @trace push
        total += visit(node.Left, sum) + visit(node.Right, sum)
        counts[sum]-- // @trace pop
        if counts[sum] == 0 { delete(counts, sum) }
        return total
    }
    return visit(root, 0) // @trace return
}`,
`    def pathSum(self, root, targetSum: int) -> int:
        counts = {0: 1} # @trace init
        def visit(node, prefix):
            if node is None:
                return 0
            current = prefix + node.val
            total = counts.get(current - targetSum, 0) # @trace lookup
            counts[current] = counts.get(current, 0) + 1 # @trace push
            total += visit(node.left, current) + visit(node.right, current)
            counts[current] -= 1 # @trace pop
            if counts[current] == 0:
                del counts[current]
            return total
        return visit(root, 0) # @trace return`),
  'lowest-common-ancestor-of-a-binary-tree': treeReference(
`    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        TreeNode result = search(root, p, q); // @trace init
        return result; // @trace return
    }
    private TreeNode search(TreeNode node, TreeNode p, TreeNode q) {
        if (node == null || node == p || node == q) { // @trace enter
            return node; // @trace base
        }
        TreeNode left = search(node.left, p, q), right = search(node.right, p, q);
        return left != null && right != null ? node : left != null ? left : right; // @trace combine
    }`,
`func lowestCommonAncestor(root, p, q *TreeNode) *TreeNode {
    var search func(*TreeNode) *TreeNode // @trace init
    search = func(node *TreeNode) *TreeNode {
        if node == nil || node == p || node == q { // @trace enter
            return node // @trace base
        }
        left, right := search(node.Left), search(node.Right)
        if left != nil && right != nil { return node } // @trace combine
        if left != nil { return left }; return right
    }
    return search(root) // @trace return
}`,
`    def lowestCommonAncestor(self, root, p, q):
        def search(node): # @trace init
            if node is None or node is p or node is q: # @trace enter
                return node # @trace base
            left, right = search(node.left), search(node.right)
            return node if left is not None and right is not None else left if left is not None else right # @trace combine
        return search(root) # @trace return`, 'p、q 必须属于树，比较对象身份；界面输入使用非空节点 BFS ID，结果适配为 {id,value}。'),
  'binary-tree-maximum-path-sum': treeReference(
`    public int maxPathSum(TreeNode root) {
        int[] best = {Integer.MIN_VALUE}; // @trace init
        gain(root, best);
        return best[0]; // @trace return
    }
    private int gain(TreeNode node, int[] best) {
        if (node == null) return 0; // @trace base
        int left = Math.max(0, gain(node.left, best)); // @trace enter
        int right = Math.max(0, gain(node.right, best));
        best[0] = Math.max(best[0], left + node.val + right); // @trace candidate
        return node.val + Math.max(left, right); // @trace gain
    }`,
`func maxPathSum(root *TreeNode) int {
    best := root.Val // @trace init
    var gain func(*TreeNode) int
    gain = func(node *TreeNode) int {
        if node == nil { return 0 } // @trace base
        left := max(0, gain(node.Left)) // @trace enter
        right := max(0, gain(node.Right))
        best = max(best, left+node.Val+right) // @trace candidate
        return node.Val + max(left, right) // @trace gain
    }
    gain(root)
    return best // @trace return
}`,
`    def maxPathSum(self, root) -> int:
        best = root.val # @trace init
        def gain(node):
            nonlocal best
            if node is None:
                return 0 # @trace base
            left = max(0, gain(node.left)) # @trace enter
            right = max(0, gain(node.right))
            best = max(best, left + node.val + right) # @trace candidate
            return node.val + max(left, right) # @trace gain
        gain(root)
        return best # @trace return`, '要求非空树；Go 的 max 使用 1.21+ 内置函数。'),
};
