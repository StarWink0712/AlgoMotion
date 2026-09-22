import { reference } from '../reference';
import type { CodeLanguage, ReferenceCode } from '../types';
import type { TreeId } from './trees';

export function treeReference(java: string, go: string, python: string, note = ''): Record<CodeLanguage, ReferenceCode> {
  const detail = `节点定义附在代码中，平台已提供时省略。${note}`;
  return {
    java: reference(`import java.util.*;

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
${java}
}`, detail),
    go: reference(`package main

type TreeNode struct {
    Val int
    Left, Right *TreeNode
}

${go}`, detail),
    python: reference(`class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right


class Solution:
${python}`, detail),
  };
}

function inorderReference(kth: boolean) {
  return treeReference(
`    public ${kth ? 'int kthSmallest(TreeNode root, int k)' : 'List<Integer> inorderTraversal(TreeNode root)'} {
        Deque<TreeNode> stack = new ArrayDeque<>(); TreeNode current = root; // @trace init
        ${kth ? 'int rank = 0;' : 'List<Integer> result = new ArrayList<>();'}
        while (current != null || !stack.isEmpty()) {
            while (current != null) {
                stack.push(current); // @trace push
                current = current.left; // @trace left
            }
            current = stack.pop(); // @trace pop
            ${kth ? 'rank++;' : 'result.add(current.val);'} // @trace visit
            ${kth ? 'if (rank == k) return current.val; // @trace return' : ''}
            current = current.right; // @trace right
        }
        ${kth ? 'throw new IllegalArgumentException("k out of range");' : 'return result; // @trace return'}
    }`,
`func ${kth ? 'kthSmallest(root *TreeNode, k int) int' : 'inorderTraversal(root *TreeNode) []int'} {
    stack, current := []*TreeNode{}, root // @trace init
    ${kth ? 'rank := 0' : 'result := []int{}'}
    for current != nil || len(stack) > 0 {
        for current != nil {
            stack = append(stack, current) // @trace push
            current = current.Left // @trace left
        }
        current = stack[len(stack)-1]; stack = stack[:len(stack)-1] // @trace pop
        ${kth ? 'rank++' : 'result = append(result, current.Val)'} // @trace visit
        ${kth ? 'if rank == k { return current.Val } // @trace return' : ''}
        current = current.Right // @trace right
    }
    ${kth ? 'panic("k out of range")' : 'return result // @trace return'}
}`,
`    def ${kth ? 'kthSmallest(self, root, k: int) -> int' : 'inorderTraversal(self, root) -> list[int]'}:
        stack, current = [], root # @trace init
        ${kth ? 'rank = 0' : 'result = []'}
        while current is not None or stack:
            while current is not None:
                stack.append(current) # @trace push
                current = current.left # @trace left
            current = stack.pop() # @trace pop
            ${kth ? 'rank += 1' : 'result.append(current.val)'} # @trace visit
            ${kth ? 'if rank == k:\n                return current.val # @trace return' : ''}
            current = current.right # @trace right
        ${kth ? "raise ValueError('k out of range')" : 'return result # @trace return'}`,
    kth ? '输入校验保证严格搜索树且 1 ≤ k ≤ 节点数；找到第 k 个后立即返回。' : '返回中序值序列；非搜索树的输出不一定有序。');
}

export const treeReferences: Record<TreeId, Record<CodeLanguage, ReferenceCode>> = {
  'binary-tree-inorder-traversal': inorderReference(false),
  'kth-smallest-element-in-a-bst': inorderReference(true),
  'maximum-depth-of-binary-tree': treeReference(
`    public int maxDepth(TreeNode root) {
        int result = height(root); // @trace init
        return result; // @trace return
    }
    private int height(TreeNode node) { // @trace enter
        if (node == null) return 0; // @trace base
        int left = height(node.left), right = height(node.right);
        return Math.max(left, right) + 1; // @trace height
    }`,
`func maxDepth(root *TreeNode) int {
    result := treeHeight(root) // @trace init
    return result // @trace return
}
func treeHeight(node *TreeNode) int { // @trace enter
    if node == nil { return 0 } // @trace base
    left, right := treeHeight(node.Left), treeHeight(node.Right)
    if left > right { return left + 1 }; return right + 1 // @trace height
}`,
`    def maxDepth(self, root) -> int:
        result = self.height(root) # @trace init
        return result # @trace return

    def height(self, node): # @trace enter
        if node is None:
            return 0 # @trace base
        left, right = self.height(node.left), self.height(node.right)
        return max(left, right) + 1 # @trace height`, '深度按节点数计：空树为 0，叶子为 1。'),

  'diameter-of-binary-tree': treeReference(
`    public int diameterOfBinaryTree(TreeNode root) {
        int[] best = {0}; // @trace init
        height(root, best);
        return best[0]; // @trace return
    }
    private int height(TreeNode node, int[] best) { // @trace enter
        if (node == null) return 0; // @trace base
        int left = height(node.left, best), right = height(node.right, best);
        best[0] = Math.max(best[0], left + right); // @trace diameter
        return Math.max(left, right) + 1; // @trace height
    }`,
`func diameterOfBinaryTree(root *TreeNode) int {
    best := 0 // @trace init
    var height func(*TreeNode) int
    height = func(node *TreeNode) int { // @trace enter
        if node == nil { return 0 } // @trace base
        left, right := height(node.Left), height(node.Right)
        if left + right > best { best = left + right } // @trace diameter
        if left > right { return left + 1 }; return right + 1 // @trace height
    }
    height(root)
    return best // @trace return
}`,
`    def diameterOfBinaryTree(self, root) -> int:
        best = 0 # @trace init
        def height(node): # @trace enter
            nonlocal best
            if node is None:
                return 0 # @trace base
            left, right = height(node.left), height(node.right)
            best = max(best, left + right) # @trace diameter
            return max(left, right) + 1 # @trace height
        height(root)
        return best # @trace return`, '直径按边数计，可以不经过根；高度仍按节点数计。'),

  'invert-binary-tree': treeReference(
`    public TreeNode invertTree(TreeNode root) {
        TreeNode result = invert(root); // @trace init
        return result; // @trace return
    }
    private TreeNode invert(TreeNode node) { // @trace enter
        if (node == null) return null; // @trace empty
        TreeNode temp = node.left; node.left = node.right; node.right = temp; // @trace swap
        invert(node.left); invert(node.right);
        return node; // @trace complete
    }`,
`func invertTree(root *TreeNode) *TreeNode {
    result := invert(root) // @trace init
    return result // @trace return
}
func invert(node *TreeNode) *TreeNode { // @trace enter
    if node == nil { return nil } // @trace empty
    node.Left, node.Right = node.Right, node.Left // @trace swap
    invert(node.Left); invert(node.Right)
    return node // @trace complete
}`,
`    def invertTree(self, root):
        result = self.invert(root) # @trace init
        return result # @trace return

    def invert(self, node): # @trace enter
        if node is None:
            return None # @trace empty
        node.left, node.right = node.right, node.left # @trace swap
        self.invert(node.left)
        self.invert(node.right)
        return node # @trace complete`, '复用原节点交换左右孩子；演示将结果序列化为紧凑层序数组。'),

  'symmetric-tree': treeReference(
`    public boolean isSymmetric(TreeNode root) {
        boolean result = root == null || mirror(root.left, root.right); // @trace init
        return result; // @trace return
    }
    private boolean mirror(TreeNode a, TreeNode b) { // @trace compare
        if (a == null && b == null) return true; // @trace empty
        if (a == null || b == null || a.val != b.val) return false; // @trace mismatch
        boolean result = mirror(a.left, b.right) && mirror(a.right, b.left);
        return result; // @trace return-pair
    }`,
`func isSymmetric(root *TreeNode) bool {
    result := root == nil || mirror(root.Left, root.Right) // @trace init
    return result // @trace return
}
func mirror(a *TreeNode, b *TreeNode) bool { // @trace compare
    if a == nil && b == nil { return true } // @trace empty
    if a == nil || b == nil || a.Val != b.Val { return false } // @trace mismatch
    result := mirror(a.Left, b.Right) && mirror(a.Right, b.Left)
    return result // @trace return-pair
}`,
`    def isSymmetric(self, root) -> bool:
        result = root is None or self.mirror(root.left, root.right) # @trace init
        return result # @trace return

    def mirror(self, a, b): # @trace compare
        if a is None and b is None:
            return True # @trace empty
        if a is None or b is None or a.val != b.val:
            return False # @trace mismatch
        result = self.mirror(a.left, b.right) and self.mirror(a.right, b.left)
        return result # @trace return-pair`, '比较结构和数值；不能只比较每层的值是否回文。'),

  'convert-sorted-array-to-binary-search-tree': treeReference(
`    public TreeNode sortedArrayToBST(int[] nums) {
        TreeNode root = build(nums, 0, nums.length - 1); // @trace init
        return root; // @trace return
    }
    private TreeNode build(int[] nums, int left, int right) { // @trace range
        if (left > right) return null; // @trace empty
        int mid = left + (right - left) / 2;
        TreeNode node = new TreeNode(nums[mid]); // @trace create
        node.left = build(nums, left, mid - 1); // @trace attach-left
        node.right = build(nums, mid + 1, right); // @trace attach-right
        return node; // @trace built
    }`,
`func sortedArrayToBST(nums []int) *TreeNode {
    root := buildBST(nums, 0, len(nums)-1) // @trace init
    return root // @trace return
}
func buildBST(nums []int, left int, right int) *TreeNode { // @trace range
    if left > right { return nil } // @trace empty
    mid := left + (right-left)/2
    node := &TreeNode{Val:nums[mid]} // @trace create
    node.Left = buildBST(nums, left, mid-1) // @trace attach-left
    node.Right = buildBST(nums, mid+1, right) // @trace attach-right
    return node // @trace built
}`,
`    def sortedArrayToBST(self, nums: list[int]):
        root = self.build(nums, 0, len(nums) - 1) # @trace init
        return root # @trace return

    def build(self, nums, left, right): # @trace range
        if left > right:
            return None # @trace empty
        mid = (left + right) // 2
        node = TreeNode(nums[mid]) # @trace create
        node.left = self.build(nums, left, mid - 1) # @trace attach-left
        node.right = self.build(nums, mid + 1, right) # @trace attach-right
        return node # @trace built`, '严格递增输入；偶数长度选靠左中点，固定输出形状便于复现，其他平衡形状也可能正确。'),

  'validate-binary-search-tree': treeReference(
`    public boolean isValidBST(TreeNode root) {
        boolean result = check(root, Long.MIN_VALUE, Long.MAX_VALUE); // @trace init
        return result; // @trace return
    }
    private boolean check(TreeNode node, long low, long high) {
        if (node == null) return true; // @trace empty
        int value = node.val; // @trace check
        if (value <= low || value >= high) return false; // @trace reject
        boolean valid = check(node.left, low, value) && check(node.right, value, high);
        return valid; // @trace checked
    }`,
`func isValidBST(root *TreeNode) bool {
    result := checkBST(root, -1<<63, 1<<63-1) // @trace init
    return result // @trace return
}
func checkBST(node *TreeNode, low int64, high int64) bool {
    if node == nil { return true } // @trace empty
    value := int64(node.Val) // @trace check
    if value <= low || value >= high { return false } // @trace reject
    valid := checkBST(node.Left, low, value) && checkBST(node.Right, value, high)
    return valid // @trace checked
}`,
`    def isValidBST(self, root) -> bool:
        result = self.check(root, float('-inf'), float('inf')) # @trace init
        return result # @trace return

    def check(self, node, low, high):
        if node is None:
            return True # @trace empty
        value = node.val # @trace check
        if value <= low or value >= high:
            return False # @trace reject
        valid = self.check(node.left, low, value) and self.check(node.right, value, high)
        return valid # @trace checked`, '严格开区间，不允许重复值。参考代码用宽范围/无穷边界，轨迹中无界记为 null，不保存 Infinity。'),

  'binary-tree-right-side-view': treeReference(
`    public List<Integer> rightSideView(TreeNode root) {
        Deque<TreeNode> queue = new ArrayDeque<>(); List<Integer> result = new ArrayList<>(); // @trace init
        if (root != null) queue.addLast(root);
        while (!queue.isEmpty()) {
            int size = queue.size(); // @trace level
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.removeFirst(); // @trace dequeue
                if (node.left != null) queue.addLast(node.left);
                if (node.right != null) queue.addLast(node.right); // @trace enqueue
                if (i == size - 1) result.add(node.val); // @trace visible
            }
        }
        return result; // @trace return
    }`,
`func rightSideView(root *TreeNode) []int {
    queue, result := []*TreeNode{}, []int{} // @trace init
    if root != nil { queue = append(queue, root) }
    for len(queue) > 0 {
        size := len(queue) // @trace level
        for i := 0; i < size; i++ {
            node := queue[0]; queue = queue[1:] // @trace dequeue
            if node.Left != nil { queue = append(queue, node.Left) }
            if node.Right != nil { queue = append(queue, node.Right) } // @trace enqueue
            if i == size-1 { result = append(result, node.Val) } // @trace visible
        }
    }
    return result // @trace return
}`,
`    def rightSideView(self, root) -> list[int]:
        from collections import deque
        queue, result = deque([root] if root is not None else []), [] # @trace init
        while queue:
            size = len(queue) # @trace level
            for i in range(size):
                node = queue.popleft() # @trace dequeue
                if node.left is not None:
                    queue.append(node.left)
                if node.right is not None:
                    queue.append(node.right) # @trace enqueue
                if i == size - 1:
                    result.append(node.val) # @trace visible
        return result # @trace return`, '取每层最右节点，不是只沿根节点的右指针行走。'),

  'flatten-binary-tree-to-linked-list': treeReference(
`    public TreeNode flatten(TreeNode root) {
        TreeNode current = root; // @trace init
        while (current != null) {
            if (current.left != null) { // @trace inspect
                TreeNode predecessor = current.left; // @trace predecessor
                while (predecessor.right != null) predecessor = predecessor.right; // @trace walk-right
                predecessor.right = current.right; // @trace bridge
                current.right = current.left; current.left = null; // @trace lift
            }
            current = current.right; // @trace advance
        }
        return root; // @trace return
    }`,
`func flatten(root *TreeNode) *TreeNode {
    current := root // @trace init
    for current != nil {
        if current.Left != nil { // @trace inspect
            predecessor := current.Left // @trace predecessor
            for predecessor.Right != nil { predecessor = predecessor.Right } // @trace walk-right
            predecessor.Right = current.Right // @trace bridge
            current.Right, current.Left = current.Left, nil // @trace lift
        }
        current = current.Right // @trace advance
    }
    return root // @trace return
}`,
`    def flatten(self, root):
        current = root # @trace init
        while current is not None:
            if current.left is not None: # @trace inspect
                predecessor = current.left # @trace predecessor
                while predecessor.right is not None:
                    predecessor = predecessor.right # @trace walk-right
                predecessor.right = current.right # @trace bridge
                current.right, current.left = current.left, None # @trace lift
            current = current.right # @trace advance
        return root # @trace return`, '原地修改并额外返回根供演示适配器使用；平台的 void 签名可省略 return。结果显示右链值序列，所有 left 必须为 null。'),
};
