import type { Problem } from '../types';
import { advancedTreeReferences } from './advanced-tree-references';
import { mergeListReferences } from './merge-list-references';
import { searchCacheReferences } from './search-cache-references';

const treeHint = 'tree 为紧凑层序数组，null 表示空位；最多 31 项、15 个真实节点、5 层，整数值在 -10000 到 10000。';
export const advancedProblems: Problem[] = [
  {
    id: 'construct-binary-tree-from-preorder-and-inorder-traversal', number: 105, title: '从前序与中序遍历序列构造二叉树', english: 'Construct Binary Tree from Preorder and Inorder Traversal', category: '二叉树', difficulty: '中等', renderer: 'tree-lab',
    summary: '由两个值互异且一致的遍历序列恢复二叉树，返回紧凑层序数组。',
    idea: '前序游标给出根，在中序数组找到根的位置，将左右区间交给递归构造。',
    invariant: '每次只消耗一个前序根；左区间构造完才能构造右区间。没有创建的节点不提前显示。',
    time: 'O(n)', space: 'O(n)', sample: { preorder: [3, 9, 20, 15, 7], inorder: [9, 3, 15, 20, 7] }, inputHint: 'preorder / inorder 均为最多 15 个互异整数，值在 -10000 到 10000，必须描述同一棵最多 5 层的树；两个空数组返回空树。', code: advancedTreeReferences['construct-binary-tree-from-preorder-and-inorder-traversal'],
  },
  {
    id: 'path-sum-iii', number: 437, title: '路径总和 III', english: 'Path Sum III', category: '二叉树', difficulty: '中等', renderer: 'tree-lab',
    summary: '统计和等于 targetSum 的非空向下路径，起点可以是任意节点，不允许向上或跨兄弟分支。',
    idea: '当前前缀和减去目标和，就是要查询的祖先前缀；频次代表不同路径起点的数量。',
    invariant: '先查后记，离开节点时撤销当前前缀；兄弟分支不能共用已退出的前缀。',
    time: 'O(n) 期望', space: 'O(h)', sample: { tree: [10, 5, -3, 3, 2, null, 11, 3, -2, null, 1], targetSum: 8 }, inputHint: `${treeHint} targetSum 为 -150000 到 150000 的整数；空树返回 0。`, code: advancedTreeReferences['path-sum-iii'],
  },
  {
    id: 'lowest-common-ancestor-of-a-binary-tree', number: 236, title: '二叉树的最近公共祖先', english: 'Lowest Common Ancestor of a Binary Tree', category: '二叉树', difficulty: '中等', renderer: 'tree-lab',
    summary: '找到两个节点的最近公共祖先，返回 {id,value}；祖先可以是节点自己。',
    idea: '命中目标向上返回，左右各有一个目标时在当前节点汇合，只有一侧命中则继续向上传递。',
    invariant: 'p/q 是非空节点按层序紧凑编号的 ID，不是节点值，也不是含 null 的数组下标。重复值仍有不同身份。',
    time: 'O(n)', space: 'O(h)', sample: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 1, q: 8 }, inputHint: `${treeHint} p、q 必须是存在的节点 ID，允许 p=q。`, code: advancedTreeReferences['lowest-common-ancestor-of-a-binary-tree'],
  },
  {
    id: 'binary-tree-maximum-path-sum', number: 124, title: '二叉树中的最大路径和', english: 'Binary Tree Maximum Path Sum', category: '二叉树', difficulty: '困难', renderer: 'tree-lab',
    summary: '找出非空简单路径的最大节点值总和，可经过某节点连接左右两侧，不要求经过根。',
    idea: '向父节点返回单侧最大贡献，在本节点把左右正贡献相接，用完整路径更新全局最优。',
    invariant: '一条路径不能分叉；双侧候选只能更新全局答案，不能作为向父节点返回的贡献。全负时保留一个节点。',
    time: 'O(n)', space: 'O(h)', sample: { tree: [-10, 9, 20, null, null, 15, 7] }, inputHint: `${treeHint} 必须非空；路径按节点值求和。`, code: advancedTreeReferences['binary-tree-maximum-path-sum'],
  },
  {
    id: 'sort-list', number: 148, title: '排序链表', english: 'Sort List', category: '链表', difficulty: '中等', renderer: 'linked-lab',
    summary: '将链表按非递减顺序排序，返回排序后的值序列，保留原节点身份。',
    idea: '快慢指针找到中间，断开成两半分别排序，再按较小头节点逐条重连。',
    invariant: '不交换节点的值；同值先取左链，稳定地保留相同值的原始顺序。',
    time: 'O(n log n)', space: 'O(log n)', sample: { values: [4, 2, 1, 3] }, inputHint: 'values 最多 12 个整数，范围 -10000 到 10000；空链返回 []。此实现是递归归并，非 O(1) 空间进阶版本。', code: mergeListReferences['sort-list'],
  },
  {
    id: 'merge-k-sorted-lists', number: 23, title: '合并 K 个升序链表', english: 'Merge k Sorted Lists', category: '链表', difficulty: '困难', renderer: 'linked-lab',
    summary: '将多条非递减链表合成一条有序链，返回值序列；每条输入链的节点独立。',
    idea: '按范围将链表分成两组，递归合并后再做一次双链合并，避免逐个节点扫描全部链头。',
    invariant: '每次复用原节点，只修改 next；同值先取左组，每层处理所有节点至多一次。',
    time: 'O(N log(k+1))', space: 'O(log(k+1))', sample: { lists: [[1, 4, 5], [1, 3, 4], [2, 6]] }, inputHint: 'lists 最多 4 条非递减整数链，每条最多 12 个、总共最多 16 个节点，值在 -10000 到 10000；允许空链及空列表。', code: mergeListReferences['merge-k-sorted-lists'],
  },
  {
    id: 'lru-cache', number: 146, title: 'LRU 缓存', english: 'LRU Cache', category: '链表', difficulty: '中等', renderer: 'cache',
    summary: '按顺序执行 get/put，缓存满时淘汰最久未使用的 key；返回每次操作的结果数组。',
    idea: '哈希表定位节点，双向链表维护使用顺序。读命中或写入后移到头部，超限从尾部淘汰。',
    invariant: '每个缓存 key 只有一个节点；更新不增加容量，get 未命中不改变顺序。put 返回 null，未命中 get 返回 -1。',
    time: '每次 O(1) 期望', space: 'O(capacity)', sample: { capacity: 2, operations: [{ op: 'put', key: 1, value: 1 }, { op: 'put', key: 2, value: 2 }, { op: 'get', key: 1 }, { op: 'put', key: 3, value: 3 }, { op: 'get', key: 2 }, { op: 'get', key: 3 }] }, inputHint: 'capacity 为 1–6；operations 最多 24 项，格式为 {op:"get",key} 或 {op:"put",key,value}；key/value 为 -10000 到 10000 的整数。', code: searchCacheReferences['lru-cache'],
  },
  {
    id: 'permutations', number: 46, title: '全排列', english: 'Permutations', category: '回溯', difficulty: '中等', renderer: 'backtracking',
    summary: '返回互不相同整数的全部排列；空输入有一个空排列。',
    idea: '每一层选择一个未使用的输入位置，填满后保存副本，然后撤销末项去尝试下一个候选。',
    invariant: '同一路径内每个位置只能使用一次；撤销同时恢复占用状态，已保存的答案不随路径修改。',
    time: 'O(n × n!)', space: 'O(n) 不含结果', sample: { nums: [1, 2, 3] }, inputHint: 'nums 为最多 5 个互不相同的整数，范围 -10000 到 10000；顺序按输入候选的 DFS 枚举。', code: searchCacheReferences.permutations,
  },
  {
    id: 'subsets', number: 78, title: '子集', english: 'Subsets', category: '回溯', difficulty: '中等', renderer: 'backtracking',
    summary: '枚举互不相同整数的全部子集，包含空集；子集内保留原输入顺序。',
    idea: '每个递归节点都是一个有效答案。只从上次选择位置之后继续，避免同一子集的不同排列。',
    invariant: '路径的输入下标严格递增；每次收集副本，选择后必须撤销再试下一项。',
    time: 'O(n × 2^n)', space: 'O(n) 不含结果', sample: { nums: [1, 2, 3] }, inputHint: 'nums 为最多 7 个互不相同的整数，范围 -10000 到 10000；空输入返回 [[]]。', code: searchCacheReferences.subsets,
  },
  {
    id: 'combination-sum', number: 39, title: '组合总和', english: 'Combination Sum', category: '回溯', difficulty: '中等', renderer: 'backtracking',
    summary: '从互不相同的正整数中可重复选取元素，枚举总和等于 target 的组合，不计排列顺序。',
    idea: '先排序候选，从当前下标继续允许重复；候选超过剩余值就停止这一层，返回时撤销选择。',
    invariant: '路径非递减且元素为正，剩余值每次下降；target=0 只有一个空组合。',
    time: 'O(m^(T/min+1)) 上界', space: 'O(m + T/min) 不含结果', sample: { candidates: [2, 3, 6, 7], target: 7 }, inputHint: 'candidates 最多 5 个互异正整数，范围 1–100；target 为 0–10；允许空候选，无解返回 []。限小规模以完整展示搜索。', code: searchCacheReferences['combination-sum'],
  },
];
