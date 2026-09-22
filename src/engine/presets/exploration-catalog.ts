import type { Problem } from '../types';
import { explorationReferences as code } from './exploration-references';

const gridHint = '矩形网格最多 6 行 × 6 列；空网格写 []，非空时每行至少一格且等长。';
export const explorationProblems: Problem[] = [
  {
    id: 'letter-combinations-of-a-phone-number', number: 17, title: '电话号码的字母组合', english: 'Letter Combinations of a Phone Number', category: '回溯', difficulty: '中等', renderer: 'exploration',
    summary: '按电话键盘上 2–9 的字母映射，枚举每个数字选一个字母形成的字符串。',
    idea: '每层对应一个数字，依次尝试它的字母；完整后保存字符串，再撤销本层的选择。',
    invariant: '当前路径长度就是已经处理的数字个数；每个数字恰好贡献一个字母。',
    time: 'O(d × 4^d)', space: 'O(d) 不含结果', sample: { digits: '23' }, inputHint: 'digits 为最多 3 位、只含 2–9 的字符串；空输入返回 []，不接受 0、1 或其他字符。', code: code['letter-combinations-of-a-phone-number'],
  },
  {
    id: 'generate-parentheses', number: 22, title: '括号生成', english: 'Generate Parentheses', category: '回溯', difficulty: '中等', renderer: 'exploration',
    summary: '生成由 n 对括号组成的所有合法括号串；n=0 返回一个空串。',
    idea: '左括号数量未满时可以加入，右括号数量少于左括号时才能加入，从源头避免非法前缀。',
    invariant: '每个前缀都满足 0 ≤ 右括号数 ≤ 左括号数 ≤ n；撤销时恢复两个计数。',
    time: 'O(n × Catalan(n))', space: 'O(n) 不含结果', sample: { n: 3 }, inputHint: 'n 为 0–4 的整数；先尝试左括号，再尝试右括号。', code: code['generate-parentheses'],
  },
  {
    id: 'palindrome-partitioning', number: 131, title: '分割回文串', english: 'Palindrome Partitioning', category: '回溯', difficulty: '中等', renderer: 'exploration',
    summary: '将字符串分成若干非空连续回文段，枚举所有分割方式；空串只有空分割。',
    idea: '从当前起点枚举终点，用双指针检查回文，选中一段后递归处理后缀。',
    invariant: '已选片段恰好覆盖处理过的前缀，没有重叠和遗漏；只有回文片段才能进入路径。',
    time: 'O(n² × 2^n) 上界', space: 'O(n) 不含结果', sample: { s: 'aab' }, inputHint: 's 为最多 7 个 ASCII 字母，区分大小写；空串返回 [[]]。', code: code['palindrome-partitioning'],
  },
  {
    id: 'word-search', number: 79, title: '单词搜索', english: 'Word Search', category: '回溯', difficulty: '中等', renderer: 'exploration',
    summary: '判断单词能否由网格中上下左右相邻格子拼出，同一个格子不能在一条路径中重复使用。',
    idea: '从每个起点尝试匹配，进入时占用格子，退出时恢复；找到的路径另存，不把占用状态留在输入里。',
    invariant: '当前工作路径没有重复格子且逐字匹配；成功路径与回溯工作栈分开保存。',
    time: 'O(RC × 3^L) 上界', space: 'O(RC + L)', sample: { board: [['A', 'B', 'C'], ['S', 'F', 'C'], ['A', 'D', 'E']], word: 'ABCC' }, inputHint: 'board 为最多 4×4 的等长非空行，单格为一个 ASCII 字母；也允许 []。word 最多 4 个 ASCII 字母，区分大小写；空单词返回 true。小规模限制用于完整回放。', code: code['word-search'],
  },
  {
    id: 'n-queens', number: 51, title: 'N 皇后', english: 'N-Queens', category: '回溯', difficulty: '困难', renderer: 'exploration',
    summary: '在 n×n 棋盘中放 n 个皇后，使其不同列、不同对角线，返回全部棋盘。',
    idea: '逐行尝试列位置，用列和两种对角线集合快速检查冲突；撤回时同时释放三个占用标记。',
    invariant: '前面的每行恰好一个皇后，列号、行减列、行加列都不重复；无解返回 []。',
    time: 'O(n × n!) 上界', space: 'O(n) 不含结果', sample: { n: 4 }, inputHint: 'n 为 1–5 的整数，Q 表示皇后、. 表示空格；按从左到右的列顺序搜索。', code: code['n-queens'],
  },
  {
    id: 'number-of-islands', number: 200, title: '岛屿数量', english: 'Number of Islands', category: '图论', difficulty: '中等', renderer: 'exploration',
    summary: '网格中 1 是陆地、0 是水，统计上下左右连通的陆地块数量；对角接触不算连通。',
    idea: '找到一块未访问陆地就开启一轮 BFS，遍历整座岛后再寻找下一起点。',
    invariant: '陆地在入队时即被标记，不能被多个邻居重复入队；一次 BFS 只对应一座岛。',
    time: 'O(RC)', space: 'O(RC)', sample: { grid: [[1, 1, 0, 0], [1, 0, 0, 1], [0, 0, 1, 1]] }, inputHint: `${gridHint} 单格只能为数字 0 或 1，空网格返回 0。`, code: code['number-of-islands'],
  },
  {
    id: 'rotting-oranges', number: 994, title: '腐烂的橘子', english: 'Rotting Oranges', category: '图论', difficulty: '中等', renderer: 'exploration',
    summary: '每分钟腐烂橘子感染四邻接的新鲜橘子，求全部腐烂所需最少分钟；有不可达新鲜橘子则返回 -1。',
    idea: '所有初始腐烂橘子同时入队，每轮只处理开始时的队列长度，新增节点留给下一分钟。',
    invariant: '感染时立即变色并减少 fresh，防止重复；新腐烂节点不能在同一轮连续传播。',
    time: 'O(RC)', space: 'O(RC)', sample: { grid: [[2, 1, 1], [1, 1, 0], [0, 1, 1]] }, inputHint: `${gridHint} 0 为空、1 为新鲜、2 为腐烂；没有新鲜橘子时返回 0。`, code: code['rotting-oranges'],
  },
  {
    id: 'course-schedule', number: 207, title: '课程表', english: 'Course Schedule', category: '图论', difficulty: '中等', renderer: 'exploration',
    summary: '给定课程和前置要求，判断能否完成所有课程；画布同时展示已完成的拓扑顺序。',
    idea: '把入度为零的课程入队，完成课程后逐条解除后继依赖；所有课程都处理完才成功。',
    invariant: '队列只包含尚未完成且入度为零的课程；队列为空后的剩余节点可能在环中，也可能只是依赖环。',
    time: 'O(V+E)', space: 'O(V+E)', sample: { numCourses: 4, prerequisites: [[1, 0], [2, 0], [3, 1], [3, 2]] }, inputHint: 'numCourses 为 0–10；prerequisites 最多 24 个不重复的 [课程,前置]，编号须在范围内。允许自环用于展示失败；零课程返回 true。', code: code['course-schedule'],
  },
  {
    id: 'spiral-matrix', number: 54, title: '螺旋矩阵', english: 'Spiral Matrix', category: '矩阵', difficulty: '中等', renderer: 'exploration',
    summary: '从左上角开始顺时针螺旋读取矩阵，返回读取顺序，不修改输入矩阵。',
    idea: '用四条边界描述未读区域，依次读完上、右、下、左边后收缩，单行单列时跳过重复边。',
    invariant: '结果中的格子各出现一次；边界只包含未读区域，即使数值重复也按格子身份区分。',
    time: 'O(RC)', space: 'O(1) 不含结果', sample: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }, inputHint: `${gridHint} 值为 -10000 到 10000 的整数，空矩阵返回 []。`, code: code['spiral-matrix'],
  },
  {
    id: 'set-matrix-zeroes', number: 73, title: '矩阵置零', english: 'Set Matrix Zeroes', category: '矩阵', difficulty: '中等', renderer: 'exploration',
    summary: '原矩阵的某格为零时，将其整行和整列置零，返回处理后的矩阵。',
    idea: '先保存首行首列是否本来有零，用它们的内部位置存行列标记，处理内部后再处理首行首列。',
    invariant: '标记只由原始零产生；新写入的零不能继续扩散。两个布尔量分别保护首行和首列语义。',
    time: 'O(RC)', space: 'O(1)', sample: { matrix: [[1, 1, 1], [1, 0, 1], [1, 1, 1]] }, inputHint: `${gridHint} 值为 -10000 到 10000 的整数；原地算法在演示副本执行，不修改输入 JSON。`, code: code['set-matrix-zeroes'],
  },
];
