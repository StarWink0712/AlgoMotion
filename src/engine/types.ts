export const problemIds = [
  'two-sum', 'move-zeroes', 'container-with-most-water',
  'longest-substring-without-repeating-characters', 'maximum-subarray',
  'reverse-linked-list', 'binary-tree-level-order-traversal',
  'climbing-stairs', 'coin-change', 'longest-increasing-subsequence',
  'search-insert-position', 'find-first-and-last-position-of-element-in-sorted-array',
  'search-in-rotated-sorted-array', 'best-time-to-buy-and-sell-stock', 'jump-game',
  'group-anagrams', 'longest-consecutive-sequence', 'product-of-array-except-self', 'subarray-sum-equals-k',
  '3sum', 'sort-colors', 'rotate-array', 'next-permutation', 'merge-intervals',
  'valid-parentheses', 'min-stack', 'daily-temperatures', 'largest-rectangle-in-histogram',
  'trapping-rain-water', 'sliding-window-maximum', 'find-all-anagrams-in-a-string',
  'minimum-window-substring', 'longest-valid-parentheses', 'decode-string',
  'intersection-of-two-linked-lists', 'palindrome-linked-list', 'linked-list-cycle', 'linked-list-cycle-ii',
  'merge-two-sorted-lists', 'add-two-numbers', 'remove-nth-node-from-end-of-list',
  'swap-nodes-in-pairs', 'reverse-nodes-in-k-group', 'copy-list-with-random-pointer',
  'binary-tree-inorder-traversal', 'maximum-depth-of-binary-tree', 'invert-binary-tree', 'symmetric-tree',
  'diameter-of-binary-tree', 'convert-sorted-array-to-binary-search-tree', 'validate-binary-search-tree',
  'kth-smallest-element-in-a-bst', 'binary-tree-right-side-view', 'flatten-binary-tree-to-linked-list',
  'construct-binary-tree-from-preorder-and-inorder-traversal', 'path-sum-iii',
  'lowest-common-ancestor-of-a-binary-tree', 'binary-tree-maximum-path-sum',
  'sort-list', 'merge-k-sorted-lists', 'lru-cache', 'permutations', 'subsets', 'combination-sum',
  'letter-combinations-of-a-phone-number', 'generate-parentheses', 'palindrome-partitioning',
  'word-search', 'n-queens', 'number-of-islands', 'rotting-oranges', 'course-schedule',
  'spiral-matrix', 'set-matrix-zeroes',
  'first-missing-positive', 'rotate-image', 'search-a-2d-matrix', 'search-a-2d-matrix-ii',
  'find-minimum-in-rotated-sorted-array', 'median-of-two-sorted-arrays',
  'implement-trie-prefix-tree', 'kth-largest-element-in-an-array', 'top-k-frequent-elements', 'find-median-from-data-stream',
  'jump-game-ii', 'partition-labels', 'pascals-triangle', 'house-robber', 'perfect-squares',
  'word-break', 'maximum-product-subarray', 'partition-equal-subset-sum', 'unique-paths', 'minimum-path-sum',
  'longest-palindromic-substring', 'longest-common-subsequence', 'edit-distance',
  'single-number', 'majority-element', 'find-the-duplicate-number',
] as const;

export type ProblemId = typeof problemIds[number];
export type Scalar = number | string | null;
export type Renderer = 'array' | 'bars' | 'window' | 'linked-list' | 'tree' | 'dp' | 'array-hash' | 'intervals' | 'stack-window' | 'linked-lab' | 'tree-lab' | 'backtracking' | 'cache' | 'exploration' | 'ordering' | 'structures' | 'state-dp' | 'essentials';
export type Category = '哈希表' | '双指针' | '滑动窗口' | '链表' | '二叉树' | '动态规划' | '二分查找' | '贪心' | '数组' | '栈' | '单调栈' | '回溯' | '图论' | '矩阵' | '堆' | '前缀树';
export const codeLanguages = ['java', 'go', 'python'] as const;
export type CodeLanguage = typeof codeLanguages[number];
export interface ReferenceCode {
  lines: string[];
  locations: Record<string, number>;
  note?: string;
}

export interface Frame {
  step: number;
  location: string;
  action: string;
  explanation: string;
  values: Scalar[];
  elementIds?: number[];
  active: number[];
  settled: number[];
  pointers: Record<string, number | null>;
  variables: Record<string, unknown>;
  table?: [string, Scalar][];
  dp?: Scalar[];
  window?: [number, number];
  links?: [number, number][];
  edgeLabels?: Record<string, 'L' | 'R'>;
  levels?: number[][];
  queue?: number[];
  path?: number[];
  bestPath?: number[];
  result?: unknown;
}

export interface Trace {
  version: 2;
  problemId: ProblemId;
  input: unknown;
  frames: Frame[];
  result: unknown;
}

export interface Problem {
  id: ProblemId;
  number: number;
  title: string;
  english: string;
  category: Category;
  difficulty: '简单' | '中等' | '困难';
  renderer: Renderer;
  summary: string;
  idea: string;
  invariant: string;
  time: string;
  space: string;
  sample: Record<string, unknown>;
  inputHint: string;
  code: Record<CodeLanguage, ReferenceCode>;
}
