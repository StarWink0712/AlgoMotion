import type { Problem } from '../types';
import { dpGreedyReferences as code } from './dp-greedy-references';

export const dpGreedyProblems: Problem[] = [
  {
    id: 'jump-game-ii', number: 45, title: '跳跃游戏 II', english: 'Jump Game II', category: '贪心', difficulty: '中等', renderer: 'state-dp',
    summary: '从下标 0 到最后一个位置，求最少跳数；每次可以向右跳 1 到当前位置数值的距离。',
    idea: '扫描当前跳数能覆盖的整层，收集下一跳最远边界；到达当前层末尾才增加跳数。',
    invariant: '当前层覆盖范围内的所有候选都参与扩展；可达范围不是一条已选路径，不能把每次扩展都算作一次跳跃。',
    time: 'O(n)', space: 'O(1)', sample: { nums: [2,3,1,1,4] }, inputHint: 'nums 为 1–24 个 0–24 的整数；单元素返回 0。演示额外支持不可达输入，返回 -1。', code: code['jump-game-ii'],
  },
  {
    id: 'partition-labels', number: 763, title: '划分字母区间', english: 'Partition Labels', category: '贪心', difficulty: '中等', renderer: 'state-dp',
    summary: '将字符串划为尽可能多的连续片段，同一字母只能出现在一个片段中，返回各段长度。',
    idea: '先记录每个字母最后出现的位置；扫描时扩展当前段必须覆盖的右边界，在最早合法位置切分。',
    invariant: '只有扫描位置到达段内所有字母最后位置的最大值，才能保证这些字母不再跨段。',
    time: 'O(n)', space: 'O(字母表大小)，不含输出', sample: { s: 'ababcbacadefegdehijhklij' }, inputHint: 's 最多 24 个小写 ASCII 字母；空字符串返回 []。', code: code['partition-labels'],
  },
  {
    id: 'pascals-triangle', number: 118, title: '杨辉三角', english: "Pascal's Triangle", category: '动态规划', difficulty: '简单', renderer: 'state-dp',
    summary: '生成杨辉三角的前 numRows 行，每行两端为 1，内部元素为上一行相邻两个元素之和。',
    idea: '从顶部逐行填充，父状态的值沿两条依赖边汇入当前格子。',
    invariant: '第 r 行有 r+1 个元素；未计算位置保持空白，只有上一行已知状态才能作为来源。',
    time: 'O(r²)', space: 'O(r²)，含输出', sample: { numRows: 5 }, inputHint: 'numRows 为 0–10 的整数；0 行返回 []。', code: code['pascals-triangle'],
  },
  {
    id: 'house-robber', number: 198, title: '打家劫舍', english: 'House Robber', category: '动态规划', difficulty: '中等', renderer: 'state-dp',
    summary: '从一排房屋中选择互不相邻的位置，求可以获得的最大金额。',
    idea: '前 i 间的最优值来自不取当前房屋，或取当前房屋并接上前 i−2 间的最优值。',
    invariant: '取当前房屋的来源必须跳过上一间；等值时保留不取方案，选中位置展示一种而非唯一最优选择。',
    time: 'O(n)', space: 'O(n)', sample: { nums: [2,7,9,3,1] }, inputHint: 'nums 最多 16 个 0–100 的整数；空数组返回 0，允许不取任何房屋。', code: code['house-robber'],
  },
  {
    id: 'perfect-squares', number: 279, title: '完全平方数', english: 'Perfect Squares', category: '动态规划', difficulty: '中等', renderer: 'state-dp',
    summary: '将 n 表示为若干正完全平方数之和，求最少项数；平方数可以重复使用。',
    idea: '枚举最后加入的平方数 q，比较 dp[amount−q]+1；记录选择并还原一种最少项数分解。',
    invariant: '来源金额严格小于当前金额；未采用的合法候选只是没有改善最优值，不代表不可达。',
    time: 'O(n√n)', space: 'O(n)', sample: { n: 12 }, inputHint: 'n 为 0–40 的整数；0 返回 0，空分解。状态初始的 ∞ 表示尚无候选，参考代码用 n+1 作为上界哨兵。', code: code['perfect-squares'],
  },
  {
    id: 'word-break', number: 139, title: '单词拆分', english: 'Word Break', category: '动态规划', difficulty: '中等', renderer: 'state-dp',
    summary: '判断字符串是否可以拆分成字典中的若干单词，每个单词可以重复使用。',
    idea: '枚举前缀最后一个单词的起点，要求此前前缀可达且当前后缀确实在字典中。',
    invariant: '匹配后缀本身不够，来源前缀必须已有合法拆分；0/1 表示不可达/可达，空前缀可达。',
    time: 'O(n³ + 字典字符总数)，含子串构造', space: 'O(n + 字典大小)', sample: { s: 'leetcode', wordDict: ['leet','code'] }, inputHint: 's 最多 14 个小写 ASCII 字母；wordDict 最多 8 个互异、非空小写单词，每词最多 14 字符。空字符串返回 true，非空字符串配空字典返回 false。', code: code['word-break'],
  },
  {
    id: 'maximum-product-subarray', number: 152, title: '乘积最大子数组', english: 'Maximum Product Subarray', category: '动态规划', difficulty: '中等', renderer: 'state-dp',
    summary: '求非空连续子数组的最大乘积，元素可以为负数或零。',
    idea: '同时维护以当前位置结尾的最大与最小乘积；负数会反转大小关系，所以两者都必须由旧状态计算。',
    invariant: '新最大和新最小都比较当前数、旧最大×当前数、旧最小×当前数，不能先覆盖一个再计算另一个。',
    time: 'O(n)', space: 'O(1)', sample: { nums: [-2,3,-4] }, inputHint: 'nums 为 1–12 个 -5 到 5 的整数，保证全范围乘积在 32 位有符号整数内；不允许空数组。状态历史和区间见证是演示附加数据。', code: code['maximum-product-subarray'],
  },
  {
    id: 'partition-equal-subset-sum', number: 416, title: '分割等和子集', english: 'Partition Equal Subset Sum', category: '动态规划', difficulty: '中等', renderer: 'state-dp',
    summary: '判断能否将所有元素分成两个和相等的子集，每个输入位置只能使用一次。',
    idea: '奇数总和直接排除，否则求总和一半是否可达；一维背包倒序更新，避免重复使用当前元素。',
    invariant: '转移来源的轮次小于当前轮次；相同数值的不同位置是独立元素，选中集合与补集共同覆盖输入。',
    time: 'O(nS)，S 为总和一半', space: 'O(S)', sample: { nums: [1,5,11,5] }, inputHint: 'nums 为 1–12 个 1–30 的正整数，总和不超过 60；0/1 为可达标记，轮次显示来源是否已使用当前元素。', code: code['partition-equal-subset-sum'],
  },
  {
    id: 'unique-paths', number: 62, title: '不同路径', english: 'Unique Paths', category: '动态规划', difficulty: '中等', renderer: 'state-dp',
    summary: '从 m×n 网格左上角到右下角，每步只能向右或向下，求不同走法数量。',
    idea: '最后一步来自上方或左方，两类路径不重叠，将它们的数量相加。',
    invariant: '起点有一种空走法，越界方向贡献 0；每个格子展示路径数量，不冒充某一条已选路径。',
    time: 'O(mn)', space: 'O(mn)', sample: { m: 3, n: 4 }, inputHint: 'm、n 均为 1–6 的整数；1×1 返回 1。不含障碍物，向左、向上和对角移动不允许。', code: code['unique-paths'],
  },
  {
    id: 'minimum-path-sum', number: 64, title: '最小路径和', english: 'Minimum Path Sum', category: '动态规划', difficulty: '中等', renderer: 'state-dp',
    summary: '在非负代价网格中从左上角走到右下角，只能向右或向下，求最小路径和。',
    idea: '比较上方和左方已知最小代价，加上当前格子代价，并沿所选来源记录一条最优路径。',
    invariant: '起终点的代价均计入；等值时选上方仅为演示确定性，其他同样最优的合法路径也正确。',
    time: 'O(mn)', space: 'O(mn)', sample: { grid: [[1,3,1],[1,5,1],[4,2,1]] }, inputHint: 'grid 为 1–6 行、1–6 列的非空矩形，元素为 0–100 的整数；只允许右/下移动，不修改输入网格。', code: code['minimum-path-sum'],
  },
];
