import type { Problem } from '../types';
import { finalSixReferences as code } from './final-six-references';
export const finalSixProblems: Problem[] = [
  {
    id: 'longest-palindromic-substring', number: 5, title: '最长回文子串', english: 'Longest Palindromic Substring', category: '双指针', difficulty: '中等', renderer: 'essentials',
    summary: '返回字符串中最长的连续回文子串；长度相同返回起点最靠左的一个。',
    idea: '枚举字符中心和字符间隙中心，向两侧同步扩展；两端不同即停止，保留最长区间。',
    invariant: '每次扩展前内部已经是回文；子串必须连续，不能跳过不匹配字符。',
    time: 'O(n²)', space: 'O(1)，不含返回字符串', sample: { s: 'babad' }, inputHint: 's 最多 16 个小写 ASCII 字母；空串返回 ""。奇数和偶数长度都支持，多解固定选择最左起点。', code: code['longest-palindromic-substring'],
  },
  {
    id: 'longest-common-subsequence', number: 1143, title: '最长公共子序列', english: 'Longest Common Subsequence', category: '动态规划', difficulty: '中等', renderer: 'state-dp',
    summary: '返回两个字符串的最长公共子序列长度，并演示一条可行的最优子序列。',
    idea: '末尾相同取对角状态加一，否则取上方和左方的较大值；再回溯恢复一条最优子序列。',
    invariant: '子序列保持相对顺序，但不要求连续；dp[i,j] 只使用两个前缀，回溯后缀不冒充完整结果。',
    time: 'O(mn + m + n)', space: 'O((m+1)(n+1))', sample: { text1: 'abcde', text2: 'ace' }, inputHint: 'text1、text2 各最多 8 个小写 ASCII 字母，允许空串；返回长度。等长候选优先取上方，只影响展示哪一种最优子序列。', code: code['longest-common-subsequence'],
  },
  {
    id: 'edit-distance', number: 72, title: '编辑距离', english: 'Edit Distance', category: '动态规划', difficulty: '中等', renderer: 'state-dp',
    summary: '将 word1 变为 word2，求插入、删除、替换字符的最少次数，每次操作代价为 1。',
    idea: '相同字符沿对角线保留，不同时比较替换、删除和插入；回溯展示一组最优编辑对齐。',
    invariant: '操作相对于源字符串定义；空源需插入、空目标需删除，保留相同字符不计操作次数。',
    time: 'O(mn + (m+n)²)，含对齐前插', space: 'O((m+1)(n+1) + m+n)', sample: { word1: 'horse', word2: 'ros' }, inputHint: 'word1、word2 各最多 8 个小写 ASCII 字母，允许空串。只允许插入、删除、替换，不允许把交换相邻字符算一次操作；同价按替换/删除/插入选代表。', code: code['edit-distance'],
  },
  {
    id: 'single-number', number: 136, title: '只出现一次的数字', english: 'Single Number', category: '数组', difficulty: '简单', renderer: 'essentials',
    summary: '非空数组中只有一个数出现一次，其余数都恰好出现两次，返回这个单独的数。',
    idea: '依次异或所有数，利用 x XOR x = 0 和 x XOR 0 = x，让成对元素抵消。',
    invariant: '累加器始终是已读前缀的异或；尚未成对的元素可能不止一个，直到读取完才得到答案。',
    time: 'O(n)', space: 'O(1)', sample: { nums: [4,1,2,1,2] }, inputHint: 'nums 为 1–23 个 -128 到 127 的整数，恰好一个值出现一次，其余各出现两次；负数按 8 位补码展示。输入验证与配对动画的辅助存储不计入核心算法复杂度。', code: code['single-number'],
  },
  {
    id: 'majority-element', number: 169, title: '多数元素', english: 'Majority Element', category: '数组', difficulty: '简单', renderer: 'essentials',
    summary: '返回出现次数严格大于数组长度一半的元素，输入保证存在这样的值。',
    idea: 'Boyer–Moore 投票：同值加票，异值抵消一票，票数为零时重新选择候选。',
    invariant: '当前票数是未抵消的票数，不是总频次；删除一对不同值不会使严格多数失去最终优势。',
    time: 'O(n)', space: 'O(1)', sample: { nums: [2,2,1,1,1,2,2] }, inputHint: 'nums 为 1–24 个 -10000 到 10000 的整数，必须存在严格多数；空数组或仅达到一半会被拒绝。验证和未抵消票的动画存储是额外教学开销。', code: code['majority-element'],
  },
  {
    id: 'find-the-duplicate-number', number: 287, title: '寻找重复数', english: 'Find the Duplicate Number', category: '双指针', difficulty: '中等', renderer: 'essentials',
    summary: '长度 n+1 的数组取值在 1..n，只有一种数值重复，找出它；允许重复出现超过两次。',
    idea: '将 i→nums[i] 看作函数图，快慢指针先找环内相遇点，再将一指针置回 0，同速前进找到入口。',
    invariant: '节点身份是下标，数组值是下一下标；相遇点不一定是入口，返回入口下标而不是 nums[入口]。',
    time: 'O(n)', space: 'O(1)', sample: { nums: [1,3,4,2,2] }, inputHint: 'nums 长度为 2–13，所有值在 1..长度−1，必须恰好一种值重复，其他值可缺失。整个算法不修改数组，图布局和输入验证是额外开销。', code: code['find-the-duplicate-number'],
  },
];
