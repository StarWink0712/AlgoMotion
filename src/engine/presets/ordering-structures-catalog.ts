import type { Problem } from '../types';
import { orderingReferences as order } from './ordering-references';
import { structuresReferences as structure } from './structures-references';

const matrixHint = 'matrix 最多 6×6，非空时每行非空且等长，整数在 -10000 到 10000；空矩阵用 []。';
export const orderingStructuresProblems: Problem[] = [
  {
    id: 'first-missing-positive', number: 41, title: '缺失的第一个正数', english: 'First Missing Positive', category: '数组', difficulty: '困难', renderer: 'ordering',
    summary: '返回数组中没有出现的最小正整数，负数、零及重复值都可以出现。',
    idea: '合法值 x 应放在下标 x−1；不断交换归位，再扫描第一个没有存放 i+1 的位置。',
    invariant: '每次交换至少把一个合法值放到正确位置；目标位置已是同值时不再交换，避免重复值死循环。',
    time: 'O(n)', space: 'O(1)', sample: { nums: [3, 4, -1, 1] }, inputHint: 'nums 最多 24 个整数，范围 -10000 到 10000；空数组返回 1。算法在输入副本上原地归位。', code: order['first-missing-positive'],
  },
  {
    id: 'rotate-image', number: 48, title: '旋转图像', english: 'Rotate Image', category: '矩阵', difficulty: '中等', renderer: 'ordering',
    summary: '将正方形矩阵顺时针旋转 90°，返回旋转后的矩阵。',
    idea: '先交换主对角线两侧完成转置，再反转每一行；两个变换组合成顺时针旋转。',
    invariant: '只交换元素而不分配第二份矩阵；元素身份独立于数值，重复值也能追踪到原位置。',
    time: 'O(n²)', space: 'O(1)', sample: { matrix: [[1,2,3],[4,5,6],[7,8,9]] }, inputHint: `${matrixHint} 必须为正方形；演示不修改调用方输入。`, code: order['rotate-image'],
  },
  {
    id: 'search-a-2d-matrix', number: 74, title: '搜索二维矩阵', english: 'Search a 2D Matrix', category: '二分查找', difficulty: '中等', renderer: 'ordering',
    summary: '在按行展开后严格递增的矩阵中判断目标是否存在。',
    idea: '把矩阵视为虚拟一维有序数组，二分中点用除法和取余映射回行列，不必实际复制排序。',
    invariant: '待查区间按展开下标连续；每轮排除不可能包含目标的一半。',
    time: 'O(log(RC))', space: 'O(1)', sample: { matrix: [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target: 16 }, inputHint: `${matrixHint} 每行严格递增，下一行首项大于上一行末项；target 为范围内整数。`, code: order['search-a-2d-matrix'],
  },
  {
    id: 'search-a-2d-matrix-ii', number: 240, title: '搜索二维矩阵 II', english: 'Search a 2D Matrix II', category: '矩阵', difficulty: '中等', renderer: 'ordering',
    summary: '矩阵每行、每列非递减，判断目标是否存在；允许重复值，不要求相邻两行首尾有序。',
    idea: '从右上角看：当前值太大就排除整列，太小就排除整行，每一步都减少一个候选维度。',
    invariant: '未排除区域是当前行及下方、当前列及左侧的矩形；比较点是该区域的右上角。',
    time: 'O(R+C)', space: 'O(1)', sample: { matrix: [[1,4,7,11],[2,5,8,12],[3,6,9,16]], target: 6 }, inputHint: `${matrixHint} 每行每列非递减；target 为范围内整数。`, code: order['search-a-2d-matrix-ii'],
  },
  {
    id: 'find-minimum-in-rotated-sorted-array', number: 153, title: '寻找旋转排序数组中的最小值', english: 'Find Minimum in Rotated Sorted Array', category: '二分查找', difficulty: '中等', renderer: 'ordering',
    summary: '在互异升序数组旋转后得到的非空数组中找到最小值。',
    idea: '中点大于右端时最小值在中点右边；否则最小值可能就是中点，令 right=mid。',
    invariant: '最小值始终包含在闭区间内，不能在较小分支中错误地跳过中点。',
    time: 'O(log n)', space: 'O(1)', sample: { nums: [4,5,6,7,0,1,2] }, inputHint: 'nums 为 1–24 个互异整数，值在 -10000 到 10000，必须是严格升序数组的旋转；未旋转也合法。', code: order['find-minimum-in-rotated-sorted-array'],
  },
  {
    id: 'median-of-two-sorted-arrays', number: 4, title: '寻找两个正序数组的中位数', english: 'Median of Two Sorted Arrays', category: '二分查找', difficulty: '困难', renderer: 'ordering',
    summary: '求两个非递减数组合并后的中位数，偶数长度取中间两个值的平均值，不实际合并排序。',
    idea: '只在较短数组上二分取左侧元素的数量，用另一数组补足左半边总数，再检查两组交叉边界。',
    invariant: '左侧总数固定；有效切口要求 A 左最大≤B 右最小且 B 左最大≤A 右最小，空边界不是实际元素。',
    time: 'O(log(min(m,n)+1))', space: 'O(1)', sample: { a: [1,3], b: [2,4,5,6] }, inputHint: 'a、b 均为非递减整数数组，合计 1–24 项，值在 -10000 到 10000；允许其中一个为空、允许重复值。', code: order['median-of-two-sorted-arrays'],
  },
  {
    id: 'implement-trie-prefix-tree', number: 208, title: '实现 Trie（前缀树）', english: 'Implement Trie (Prefix Tree)', category: '前缀树', difficulty: '中等', renderer: 'structures',
    summary: '依次插入单词、查询完整单词或查询前缀，返回操作结果；插入用 null 表示无返回值。',
    idea: '每条边是一个字符，共享已有前缀，只在缺边时分配新节点；独立的结束标记区分单词和前缀。',
    invariant: '查询不创建节点；能走完整条路径不一定是完整单词，重复插入不增加结构。',
    time: '每次 O(L)', space: 'O(已插入字符总数)', sample: { operations: [{ op: 'insert', word: 'apple' }, { op: 'search', word: 'app' }, { op: 'startsWith', word: 'app' }, { op: 'insert', word: 'app' }, { op: 'search', word: 'app' }] }, inputHint: 'operations 最多 12 项，op 为 insert/search/startsWith，word 为最多 5 个小写 ASCII 字母；所有 insert 的字符总数≤24。允许空串：空前缀始终存在，空单词需先插入。', code: structure['implement-trie-prefix-tree'],
  },
  {
    id: 'kth-largest-element-in-an-array', number: 215, title: '数组中的第 K 个最大元素', english: 'Kth Largest Element in an Array', category: '堆', difficulty: '中等', renderer: 'structures',
    summary: '返回按非递增顺序排列后的第 k 项，重复元素分别占据排名。',
    idea: '维护最多 k 个元素的小顶堆，读入后若超限就弹出最小值，最终堆顶是第 k 大。',
    invariant: '每次淘汰后保留已读数据中最大的 k 个；堆只保证父子关系，并不是完全有序数组。',
    time: 'O(n log(k+1))', space: 'O(k)', sample: { nums: [3,2,1,5,6,4], k: 2 }, inputHint: 'nums 为 1–24 个整数，值在 -10000 到 10000；k 为 1 到数组长度之间的整数，按重复次数计排名。', code: structure['kth-largest-element-in-an-array'],
  },
  {
    id: 'top-k-frequent-elements', number: 347, title: '前 K 个高频元素', english: 'Top K Frequent Elements', category: '堆', difficulty: '中等', renderer: 'structures',
    summary: '选出出现次数最多的 k 个不同值；返回频次降序、同频按数值升序的结果。',
    idea: '先哈希计数，再用小顶堆保留最强的 k 个候选。低频优先淘汰，同频时优先淘汰较大数值。',
    invariant: '堆中每个节点代表一个去重值，优先级是频次和同频规则，不是原数值大小。',
    time: 'O(n + u log(k+1) + k log(k+1))', space: 'O(u+k)', sample: { nums: [1,1,1,2,2,3], k: 2 }, inputHint: 'nums 为 1–24 个整数，值在 -10000 到 10000；k 为 1 到不同值数量。并列时按数值较小者优先，结果规则明确而非任意集合顺序。', code: structure['top-k-frequent-elements'],
  },
  {
    id: 'find-median-from-data-stream', number: 295, title: '数据流的中位数', english: 'Find Median from Data Stream', category: '堆', difficulty: '困难', renderer: 'structures',
    summary: '执行 addNum 与 findMedian 操作，动态维护中位数；插入返回 null，查询返回当前中位数。',
    idea: '较小半边用大顶堆，较大半边用小顶堆；必要时移动堆顶平衡数量，中位数只需读取一到两个堆顶。',
    invariant: '完成插入后左堆与右堆等长或多一个，且左堆所有值不大于右堆所有值。调整中的暂存节点单独显示。',
    time: '插入 O(log n)，查询 O(1)', space: 'O(n)', sample: { operations: [{ op: 'addNum', value: 1 }, { op: 'addNum', value: 2 }, { op: 'findMedian' }, { op: 'addNum', value: 3 }, { op: 'findMedian' }] }, inputHint: 'operations 最多 24 项，最多 16 次 addNum；格式 {op:"addNum",value} 或 {op:"findMedian"}，value 为 -10000 到 10000 的整数。不能在空数据流查询。', code: structure['find-median-from-data-stream'],
  },
];
