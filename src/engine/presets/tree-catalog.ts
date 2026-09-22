import type { Problem } from '../types';
import { treeReferences as references } from './tree-references';

const inputHint = 'tree：紧凑层序数组，null 表示空孩子；最多 31 项、15 个真实节点、5 层，整数范围 −10000–10000。不是堆下标格式。';
export const treeProblems: Problem[] = [
  {
    id: 'binary-tree-inorder-traversal', number: 94, title: '二叉树的中序遍历', english: 'Binary Tree Inorder Traversal', category: '二叉树', difficulty: '简单', renderer: 'tree-lab',
    summary: '按左子树、根节点、右子树的顺序返回节点值；适用于普通二叉树，不要求是搜索树。',
    idea: '沿左边入栈，走到空节点后弹出并访问，再转向它的右子树。栈保存尚未访问的祖先。',
    invariant: '节点在左子树全部访问后才输出，输出后不再重复入栈；重复值仍有独立节点身份。',
    time: 'O(n)', space: 'O(h) 不含结果', sample: { tree: [1, null, 2, 3] }, inputHint, code: references['binary-tree-inorder-traversal'],
  },
  {
    id: 'maximum-depth-of-binary-tree', number: 104, title: '二叉树的最大深度', english: 'Maximum Depth of Binary Tree', category: '二叉树', difficulty: '简单', renderer: 'tree-lab',
    summary: '求根到最深叶子的路径上有多少个节点。空树为 0，只有根节点的树为 1。',
    idea: '先求左右子树高度，较大的高度加上当前节点的一层，再把结果返回给父节点。',
    invariant: '高度在左右子树结果已知后才确定；空子树高度固定为 0。',
    time: 'O(n)', space: 'O(h)', sample: { tree: [3, 9, 20, null, null, 15, 7] }, inputHint, code: references['maximum-depth-of-binary-tree'],
  },
  {
    id: 'invert-binary-tree', number: 226, title: '翻转二叉树', english: 'Invert Binary Tree', category: '二叉树', difficulty: '简单', renderer: 'tree-lab',
    summary: '交换每个节点的左右子树，返回翻转后的紧凑层序数组。节点值不变，也不分配替代节点。',
    idea: '当前节点先交换左右孩子，再递归翻转交换后的两棵子树；空孩子保持为空。',
    invariant: '每个节点只交换一次，左右归属改变但节点身份不变；翻转两次恢复原树。',
    time: 'O(n)', space: 'O(h)', sample: { tree: [4, 2, 7, 1, 3, 6, 9] }, inputHint, code: references['invert-binary-tree'],
  },
  {
    id: 'symmetric-tree', number: 101, title: '对称二叉树', english: 'Symmetric Tree', category: '二叉树', difficulty: '简单', renderer: 'tree-lab',
    summary: '判断二叉树是否以根为中心镜像对称，必须同时满足值和结构对称；空树对称。',
    idea: '成对比较左右节点，再交叉比较外侧和内侧孩子。只有一个位置为空时立即失败。',
    invariant: '每一对子问题都对应镜像位置，而不是只比较同层的数值序列。',
    time: 'O(n)', space: 'O(h)', sample: { tree: [1, 2, 2, 3, 4, 4, 3] }, inputHint, code: references['symmetric-tree'],
  },
  {
    id: 'diameter-of-binary-tree', number: 543, title: '二叉树的直径', english: 'Diameter of Binary Tree', category: '二叉树', difficulty: '简单', renderer: 'tree-lab',
    summary: '求任意两个节点之间最长简单路径的边数。该路径不一定经过根；单节点和空树均为 0。',
    idea: '后序求左右高度，leftHeight + rightHeight 是经过当前节点的最长路径边数。所有节点的候选取最大值。',
    invariant: '返回父节点的是单侧高度，全局保存的是双侧路径长度，两者不能混淆。',
    time: 'O(n)', space: 'O(h)', sample: { tree: [1, 2, 3, 4, 5] }, inputHint, code: references['diameter-of-binary-tree'],
  },
  {
    id: 'convert-sorted-array-to-binary-search-tree', number: 108, title: '将有序数组转换为二叉搜索树', english: 'Convert Sorted Array to Binary Search Tree', category: '二叉树', difficulty: '简单', renderer: 'tree-lab',
    summary: '把严格递增数组构造成高度平衡的搜索树，返回紧凑层序数组。为固定演示，偶数区间选择靠左中点。',
    idea: '中点作为根，左半区间和右半区间分别递归生成子树。左右区间大小最多相差 1。',
    invariant: '节点左侧元素都更小，右侧元素都更大；每个输入元素恰好创建一个节点。',
    time: 'O(n)', space: 'O(log n) 不含结果', sample: { nums: [-10, -3, 0, 5, 9] }, inputHint: 'nums：0–15 个严格递增整数，范围 −10000–10000。空输入返回 []；同一数组可能存在其他正确的平衡树形状。', code: references['convert-sorted-array-to-binary-search-tree'],
  },
  {
    id: 'validate-binary-search-tree', number: 98, title: '验证二叉搜索树', english: 'Validate Binary Search Tree', category: '二叉树', difficulty: '中等', renderer: 'tree-lab',
    summary: '验证每个节点的整个左子树都更小、整个右子树都更大。重复值不合法；空树合法。',
    idea: '把所有祖先约束合并成一个开区间，向左缩紧上界，向右缩紧下界。只比较父子节点是不够的。',
    invariant: '当前节点必须严格落在继承的上下界之间，而不只是大于或小于直接父节点。',
    time: 'O(n)', space: 'O(h)', sample: { tree: [5, 1, 7, null, null, 4, 8] }, inputHint, code: references['validate-binary-search-tree'],
  },
  {
    id: 'kth-smallest-element-in-a-bst', number: 230, title: '二叉搜索树中第 K 小的元素', english: 'Kth Smallest Element in a BST', category: '二叉树', difficulty: '中等', renderer: 'tree-lab',
    summary: '在严格搜索树中找到按数值从小到大排列的第 k 个元素，k 从 1 开始。',
    idea: '搜索树的中序遍历严格递增，记录访问计数，到第 k 个节点时立即返回，不必遍历剩余节点。',
    invariant: '访问计数只在出栈访问时增加，入栈不计数；提前返回后不展示未访问的排序结果。',
    time: 'O(h + k)', space: 'O(h)', sample: { tree: [3, 1, 4, null, 2], k: 1 }, inputHint: `${inputHint} 必须是严格搜索树且非空；k 为 1 到真实节点数之间的整数。`, code: references['kth-smallest-element-in-a-bst'],
  },
  {
    id: 'binary-tree-right-side-view', number: 199, title: '二叉树的右视图', english: 'Binary Tree Right Side View', category: '二叉树', difficulty: '中等', renderer: 'tree-lab',
    summary: '返回从右侧观察时每层可见的节点值，从上到下排列；并非只沿右孩子走。',
    idea: '按层从左到右处理节点，固定每层开始时的队列长度，取该层最后一个出队节点。',
    invariant: '本层节点数在处理前固定，新加入的孩子属于下一层；每层只记录最后一个节点。',
    time: 'O(n)', space: 'O(w) 不含结果', sample: { tree: [1, 2, 3, null, 5, null, 4] }, inputHint, code: references['binary-tree-right-side-view'],
  },
  {
    id: 'flatten-binary-tree-to-linked-list', number: 114, title: '二叉树展开为链表', english: 'Flatten Binary Tree to Linked List', category: '二叉树', difficulty: '中等', renderer: 'tree-lab',
    summary: '按前序顺序原地把树展开成右指针链，所有左指针清空，返回这条右链的值序列。',
    idea: '把原右子树接到左子树的最右节点，再把左子树整体放到右侧，清空左指针，继续处理新的右孩子。',
    invariant: '先保存原右子树，再移动左子树；不丢失节点，不新建节点，不仅仅输出一次前序遍历。',
    time: 'O(n)', space: 'O(1)', sample: { tree: [1, 2, 5, 3, 4, null, 6] }, inputHint, code: references['flatten-binary-tree-to-linked-list'],
  },
];
