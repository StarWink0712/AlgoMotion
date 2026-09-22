import { z } from 'zod';
import { recorder } from '../recorder';
import type { Frame, Scalar, Trace } from '../types';

const nonnegative = z.number().int().min(0).max(100);
export const dpGreedySchemas = {
  'jump-game-ii': z.object({ nums: z.array(z.number().int().min(0).max(24)).min(1).max(24) }).strict(),
  'partition-labels': z.object({ s: z.string().regex(/^[a-z]{0,24}$/) }).strict(),
  'pascals-triangle': z.object({ numRows: z.number().int().min(0).max(10) }).strict(),
  'house-robber': z.object({ nums: z.array(nonnegative).max(16) }).strict(),
  'perfect-squares': z.object({ n: z.number().int().min(0).max(40) }).strict(),
  'word-break': z.object({ s: z.string().regex(/^[a-z]{0,14}$/), wordDict: z.array(z.string().regex(/^[a-z]{1,14}$/)).max(8).refine((a) => new Set(a).size === a.length) }).strict(),
  'maximum-product-subarray': z.object({ nums: z.array(z.number().int().min(-5).max(5)).min(1).max(12) }).strict(),
  'partition-equal-subset-sum': z.object({ nums: z.array(z.number().int().min(1).max(30)).min(1).max(12).refine((a) => a.reduce((s, v) => s + v, 0) <= 60) }).strict(),
  'unique-paths': z.object({ m: z.number().int().min(1).max(6), n: z.number().int().min(1).max(6) }).strict(),
  'minimum-path-sum': z.object({ grid: z.array(z.array(nonnegative).min(1).max(6)).min(1).max(6).refine((a) => a.every((row) => row.length === a[0].length)) }).strict(),
};
export type DPGreedyId = keyof typeof dpGreedySchemas;
export interface DPCell { id: string; row: number; col: number; label: string; value: Scalar; epoch?: number }
export interface DPDependency { from: string; to: string; value: Scalar; label: string; eligible: boolean; chosen: boolean; epoch?: number }
export interface DPGreedyView {
  version: 1;
  layout: 'line' | 'grid' | 'triangle' | 'rows';
  columns: number;
  sourceCols: number;
  sourceLabel: string;
  cells: DPCell[];
  active: string | null;
  deps: DPDependency[];
  choices: { label: string; value: Scalar; chosen: boolean }[];
  witness: number[];
  otherWitness: number[];
  witnessLabel: string;
  witnessMode: 'sum' | 'product' | 'path';
  segments: { start: number; end: number }[];
  ranges: { start: number; end: number; label: string }[];
  dictionary: string[];
  table: [string, number][];
  output: number[];
  equation: string;
  round: number;
  axes?: { rows: string[]; columns: string[]; rowLabel: string; columnLabel: string };
  registerPath?: string[];
  alignment?: { left: string; right: string; kind: 'match' | 'keep' | 'insert' | 'delete' | 'replace' }[];
}
export const dpGreedyView = (frame: Frame) => frame.variables.view as DPGreedyView;

export function runDPGreedy(id: DPGreedyId, input: unknown): Trace {
  const { state, emit, finish } = recorder(id, input);
  const view: DPGreedyView = { version: 1, layout: 'line', columns: 0, sourceCols: 0, sourceLabel: '当前输入', cells: [], active: null, deps: [], choices: [], witness: [], otherWitness: [], witnessLabel: '', witnessMode: 'sum', segments: [], ranges: [], dictionary: [], table: [], output: [], equation: '', round: 0 };
  const registry = new Map<string, DPCell>();
  const cell = (key: string) => registry.get(key)!;
  const add = (id: string, row: number, col: number, label: string, value: Scalar = null) => { const c = { id, row, col, label, value }; registry.set(id, c); view.cells.push(c); return c; };
  const line = (n: number, label = 'dp') => { view.columns = n; for (let i = 0; i < n; i++) add(`d${i}`, 0, i, `${label}[${i}]`); };
  const record = (location: string, action: string, explanation: string, equation: string, vars: Record<string, unknown> = {}) => {
    view.equation = equation; state.variables = { view, ...vars }; emit(location, action, explanation); view.deps = []; view.choices = [];
  };
  const dep = (from: string, to: string, label: string, chosen = true, eligible = true): DPDependency => ({ from, to, label, chosen, eligible, value: from.startsWith('s') ? state.values[Number(from.slice(1))] : cell(from).value, ...(registry.get(from)?.epoch === undefined ? {} : { epoch: cell(from).epoch }) });
  const done = (result: unknown) => { state.active = []; state.pointers = {}; view.deps = []; view.choices = []; return finish(result, 'return'); };

  if (id === 'jump-game-ii') {
    const { nums } = dpGreedySchemas[id].parse(input); state.values = nums; let end = 0, farthest = 0, jumps = 0;
    const bands = () => {
      const nextEnd = Math.min(farthest, nums.length - 1);
      view.ranges = [{ start: 0, end, label: `${jumps} 跳内可达` }, ...(nextEnd > end ? [{ start: end + 1, end: nextEnd, label: '下一跳候选' }] : [])];
    };
    bands(); record('init', '按可达层推进跳跃次数', '扫描当前跳数能覆盖的位置，收集下一跳的最远范围；范围不是一条已选择的路径。', `终点 ${nums.length - 1}`, { jumps, end, farthest });
    for (let i = 0; i < nums.length - 1; i++) {
      state.active = [i]; const before = farthest, candidate = i + nums[i]; farthest = Math.max(farthest, candidate); bands();
      const to = Math.min(candidate, nums.length - 1); if (to > i) view.deps = [dep(`s${i}`, `s${to}`, `最多 ${nums[i]} 格`)];
      record('extend', '收集下一层的最远边界', '把当前层内所有位置的跳跃能力综合起来，而不是看见能跳就立即计次。', `max(${before}, ${i}+${nums[i]}) = ${farthest}`, { i, jumps, end, farthest });
      if (i === end) {
        if (farthest === end) { record('blocked', '当前层不能再前进', '仍未到终点且下一层没有新位置，返回 -1。', `边界停在 ${end}`); return done(-1); }
        jumps++; end = Math.min(farthest, nums.length - 1); bands();
        record('jump', '当前层扫描完，增加一跳', '完成一层才增加跳数，这与最短路的分层思想一致。', `${jumps} 跳可达 [0,${end}]`, { jumps, end, farthest });
        if (end === nums.length - 1) break;
      }
    }
    return done(jumps);
  }
  if (id === 'partition-labels') {
    const { s } = dpGreedySchemas[id].parse(input); state.values = [...s]; const last = new Map<string, number>();
    record('init', '先确定每个字母的最后位置', '每段要包含其中所有字母的全部出现位置，段数尽可能多。', `字符串长度 ${s.length}`);
    for (let i = 0; i < s.length; i++) { last.set(s[i], i); view.table = [...last]; state.active = [i]; record('last', '更新最后出现位置', '第一遍完整读取字符串，得到后续切分所需的边界。', `${s[i]} 最后出现在 ${i}`); }
    let start = 0, end = 0;
    for (let i = 0; i < s.length; i++) {
      end = Math.max(end, last.get(s[i])!); state.active = [i]; view.ranges = [{ start, end, label: '当前段必须覆盖' }];
      if (last.get(s[i])! > i) view.deps = [dep(`s${i}`, `s${last.get(s[i])!}`, `${s[i]} 的最后位置`)];
      record('extend', '当前字母约束段的右边界', '在到达段内所有字母的最后位置之前，不能提前切断。', `当前段 [${start},${end}]`, { start, end, i });
      if (i === end) {
        view.segments.push({ start, end }); view.output.push(end - start + 1); start = i + 1; view.ranges = [];
        record('cut', '最早合法位置切分', '这一段里的字母不再出现在后面，尽早切分可以得到最多段。', `保存长度 ${view.output.at(-1)}`);
      }
    }
    return done(view.output);
  }
  if (id === 'pascals-triangle') {
    const { numRows } = dpGreedySchemas[id].parse(input); view.layout = 'triangle'; view.columns = numRows;
    for (let r = 0; r < numRows; r++) for (let c = 0; c <= r; c++) add(`p${r}-${c}`, r, c, `${r},${c}`);
    const rows: number[][] = []; record('init', '由上一行生成下一行', '两端是 1，内部每个数等于左上和右上两个数之和；空白位置尚未计算。', `${numRows} 行`);
    for (let r = 0; r < numRows; r++) {
      const row: number[] = [];
      for (let c = 0; c <= r; c++) {
        const key = `p${r}-${c}`; view.active = key;
        const value = c === 0 || c === r ? 1 : rows[r - 1][c - 1] + rows[r - 1][c]; row.push(value); cell(key).value = value;
        if (c === 0 || c === r) record('edge', '三角形两端置为 1', '边界只有一种组合方式。', `第 ${r + 1} 行边界 = 1`, { r, c });
        else { view.deps = [dep(`p${r - 1}-${c - 1}`, key, '左上'), dep(`p${r - 1}-${c}`, key, '右上')]; record('sum', '两个父状态相加', '来源是上一行已经计算的两个位置。', `${rows[r - 1][c - 1]} + ${rows[r - 1][c]} = ${value}`, { r, c }); }
      }
      rows.push(row);
    }
    return done(rows);
  }
  if (id === 'house-robber') {
    const { nums } = dpGreedySchemas[id].parse(input); state.values = nums; view.sourceLabel = '房屋金额'; line(nums.length + 1, '前缀');
    const dp = Array(nums.length + 1).fill(0) as number[], plans: number[][] = Array.from({ length: nums.length + 1 }, () => []); cell('d0').value = 0; view.active = 'd0';
    record('init', '前 0 间房屋的最大金额为 0', 'dp[i] 表示前 i 间的最大金额；取当前房屋就必须跳过上一间。', 'dp[0] = 0');
    for (let i = 1; i <= nums.length; i++) {
      const skip = dp[i - 1], from = Math.max(0, i - 2), take = dp[from] + nums[i - 1], choose = take > skip;
      dp[i] = Math.max(skip, take); plans[i] = choose ? [...plans[from], i - 1] : [...plans[i - 1]];
      cell(`d${i}`).value = dp[i]; view.active = `d${i}`; state.active = [i - 1];
      view.deps = [dep(`d${i - 1}`, `d${i}`, '不取当前', !choose), dep(`d${from}`, `d${i}`, `+${nums[i - 1]}`, choose)];
      view.choices = [{ label: '不取', value: skip, chosen: !choose }, { label: '取当前', value: take, chosen: choose }]; view.witness = plans[i]; view.witnessLabel = `前 ${i} 间的一种最优选择`;
      record('choose', '比较取与不取', '等值时保留不取的方案；选中房屋不相邻，但不保证唯一最优方案。', `max(${skip}, ${dp[from]}+${nums[i - 1]}) = ${dp[i]}`, { i, skip, take });
    }
    return done(dp[nums.length]);
  }
  if (id === 'perfect-squares') {
    const { n } = dpGreedySchemas[id].parse(input), squares = Array.from({ length: Math.floor(Math.sqrt(n)) }, (_, i) => (i + 1) ** 2);
    state.values = squares; view.sourceLabel = '可重复使用的平方数'; line(n + 1); const dp = Array(n + 1).fill(Infinity) as number[], chosen = Array(n + 1).fill(0) as number[]; dp[0] = 0; cell('d0').value = 0;
    record('init', '0 需要 0 个平方数', '正数状态逐个计算，每次从更小的和借用最优解，再增加一个平方数。', 'dp[0] = 0');
    for (let amount = 1; amount <= n; amount++) {
      cell(`d${amount}`).value = '∞'; view.active = `d${amount}`; state.active = []; record('amount', '开始求当前数字', '先设为不可达，再尝试不超过当前数字的完全平方数。', `当前求 ${amount}`);
      for (let i = 0; i < squares.length && squares[i] <= amount; i++) {
        const square = squares[i], source = amount - square, candidate = dp[source] + 1, better = candidate < dp[amount];
        if (better) { dp[amount] = candidate; chosen[amount] = i; }
        cell(`d${amount}`).value = dp[amount]; state.active = [i]; view.deps = [dep(`d${source}`, `d${amount}`, `+1 个 ${square}`, better)];
        view.choices = [{ label: `使用 ${square}`, value: candidate, chosen: better }];
        record('try', '尝试一个平方数作为最后一项', '未选中的合法候选并非不可达，只是没有减少数量。', `dp[${source}] + 1 = ${candidate} · 当前最少 ${dp[amount]}`, { amount, square, candidate });
      }
    }
    let rest = n; while (rest > 0) { const index = chosen[rest]; view.witness.push(index); rest -= squares[index]; }
    state.active = []; view.witnessLabel = '一种最少项数的平方数分解'; record('reconstruct', '沿已记录选择还原分解', '重复使用同一个平方数是允许的；零的分解为空。', `共 ${view.witness.length} 项`); return done(dp[n]);
  }
  if (id === 'word-break') {
    const { s, wordDict } = dpGreedySchemas[id].parse(input); state.values = [...s]; view.dictionary = wordDict; view.sourceLabel = '待拆分字符串'; line(s.length + 1, '前缀');
    const dict = new Set(wordDict), dp = Array(s.length + 1).fill(false) as boolean[], plans: { start: number; end: number }[][] = Array.from({ length: s.length + 1 }, () => []);
    dp[0] = true; cell('d0').value = 1; record('init', '空前缀可以拆分', 'dp[i] 表示前 i 个字符能否由字典单词组成；同一单词可以使用多次。', 'dp[0] = 可达');
    for (let end = 1; end <= s.length; end++) {
      cell(`d${end}`).value = 0; view.active = `d${end}`; state.active = []; view.segments = []; record('prefix', '检查一个新的前缀', '枚举最后一个单词的起点，同时要求前面的前缀可达。', `前 ${end} 个字符`);
      for (let start = 0; start < end; start++) {
        const word = s.slice(start, end), inDict = dict.has(word), valid = dp[start] && inDict;
        if (valid) { dp[end] = true; plans[end] = [...plans[start], { start, end: end - 1 }]; cell(`d${end}`).value = 1; }
        state.active = Array.from({ length: end - start }, (_, i) => start + i); view.deps = [dep(`d${start}`, `d${end}`, word, valid, dp[start] && inDict)];
        view.choices = [{ label: '前缀可达', value: dp[start] ? 1 : 0, chosen: valid }, { label: `字典含 ${word}`, value: inDict ? 1 : 0, chosen: valid }]; view.segments = plans[end];
        record('check', '前缀可达且后缀在字典才成立', '只匹配字典后缀而不检查前面的可达性，会错误接受字符串。', `${dp[start] ? '可达' : '不可达'} + "${word}"${inDict ? ' 在字典' : ' 不在字典'} → ${valid}`, { start, end, valid }); if (valid) break;
      }
    }
    state.active = []; view.segments = dp[s.length] ? plans[s.length] : []; view.witnessLabel = '已证明的前缀拆分'; return done(dp[s.length]);
  }
  if (id === 'maximum-product-subarray') {
    const { nums } = dpGreedySchemas[id].parse(input); state.values = nums; view.layout = 'rows'; view.columns = nums.length; view.witnessMode = 'product';
    for (let i = 0; i < nums.length; i++) { add(`hi${i}`, 0, i, `最大[${i}]`); add(`lo${i}`, 1, i, `最小[${i}]`); }
    let high = nums[0], low = nums[0], highStart = 0, lowStart = 0, best = nums[0]; cell('hi0').value = high; cell('lo0').value = low; view.active = 'hi0'; view.witness = [0]; view.witnessLabel = '目前已找到的最大乘积区间';
    record('init', '同时保存以当前位置结尾的最大与最小乘积', '负数可能把最小值变成最大值，不能只记录最大乘积；答案要求非空子数组。', `最大 = 最小 = ${nums[0]}`);
    for (let i = 1; i < nums.length; i++) {
      const x = nums[i], beforeHigh = high, beforeLow = low, starts = [i, highStart, lowStart], values = [x, beforeHigh * x, beforeLow * x].map((v) => v === 0 ? 0 : v), maxIndex = values.indexOf(Math.max(...values)), minIndex = values.indexOf(Math.min(...values));
      high = values[maxIndex]; low = values[minIndex]; highStart = starts[maxIndex]; lowStart = starts[minIndex]; cell(`hi${i}`).value = high; cell(`lo${i}`).value = low; view.active = `hi${i}`; state.active = [i];
      const sources = [`s${i}`, `hi${i - 1}`, `lo${i - 1}`]; view.deps = sources.flatMap((source, j) => [dep(source, `hi${i}`, j ? `×${x}` : '重新开始', j === maxIndex), dep(source, `lo${i}`, j ? `×${x}` : '重新开始', j === minIndex)]);
      view.choices = values.map((value, j) => ({ label: `最大值候选：${['当前数', '旧最大 × 当前', '旧最小 × 当前'][j]}`, value, chosen: j === maxIndex }));
      if (high > best) { best = high; view.witness = Array.from({ length: i - highStart + 1 }, (_, j) => highStart + j); }
      record('transition', '用旧的两个状态同时计算新状态', '两边都计算完成后再更新，不能把刚算出的新最大值拿来计算最小值。', `max(${values.join(', ')})=${high} · min=${low} · 历史最好 ${best}`, { i, beforeHigh, beforeLow, high, low, best });
    }
    return done(best);
  }
  if (id === 'partition-equal-subset-sum') {
    const { nums } = dpGreedySchemas[id].parse(input); state.values = nums; const sum = nums.reduce((a, b) => a + b, 0);
    record('init', '把等分问题转成目标和可达性', '每个输入位置最多取一次，两个子集相加必须覆盖所有元素。', `总和 ${sum}`);
    if (sum % 2) { record('odd', '奇数总和无法等分', '两个相等整数和相加一定是偶数。', `${sum} 不是偶数`); return done(false); }
    const target = sum / 2; line(target + 1, '和'); const dp = Array(target + 1).fill(false) as boolean[], plans: number[][] = Array.from({ length: target + 1 }, () => []); dp[0] = true;
    view.cells.forEach((c, i) => { c.value = i === 0 ? 1 : 0; c.epoch = 0; }); view.active = 'd0'; record('base', '不选任何数可以组成 0', '0/1 表示不可达/可达，未处理元素不会贡献可达性。', `目标和 ${target}`);
    for (let i = 0; i < nums.length; i++) {
      view.round = i + 1; state.active = [i]; view.active = null; record('item', '开始处理一个新位置', '从目标和向下更新，使来源仍来自之前的轮次，防止同一个元素被使用多次。', `第 ${i + 1} 轮，值 ${nums[i]}`, { i, target });
      for (let sum = target; sum >= nums[i]; sum--) {
        const from = sum - nums[i], prior = dp[sum], canTake = dp[from], edge = dep(`d${from}`, `d${sum}`, `+${nums[i]}，旧轮次`, !prior && canTake, canTake);
        if (!prior && canTake) plans[sum] = [...plans[from], i]; dp[sum] = prior || canTake;
        cell(`d${sum}`).value = dp[sum] ? 1 : 0; cell(`d${sum}`).epoch = i + 1; view.active = `d${sum}`; view.deps = [edge];
        view.choices = [{ label: '此前已可达', value: prior ? 1 : 0, chosen: prior }, { label: '取当前元素', value: canTake ? 1 : 0, chosen: !prior && canTake }];
        record('update', '倒序合并两种可达来源', '来源的轮次小于当前轮次；已可达时保留之前的见证集合。', `dp[${sum}] = ${Number(prior)} OR dp[${from}](${Number(canTake)})`, { i, sum, target, sourceEpoch: edge.epoch });
      }
    }
    if (dp[target]) { view.witness = plans[target]; view.otherWitness = nums.flatMap((_, i) => view.witness.includes(i) ? [] : [i]); view.witnessLabel = '两个等和子集（按输入位置区分）'; }
    record('check', '检查目标和并展示划分', '被选位置与其补集共同覆盖输入，同值数字依然是独立位置。', `目标 ${target} ${dp[target] ? '可达' : '不可达'}`); return done(dp[target]);
  }

  const cost = id === 'minimum-path-sum';
  const grid = cost ? dpGreedySchemas['minimum-path-sum'].parse(input).grid : null;
  const dims = cost ? { m: grid!.length, n: grid![0].length } : dpGreedySchemas['unique-paths'].parse(input);
  const rows = dims.m, cols = dims.n, dp: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0)), paths: number[][][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => []));
  view.layout = 'grid'; view.columns = cols;
  if (grid) { state.values = grid.flat(); view.sourceCols = cols; view.sourceLabel = '输入格子的代价'; view.witnessMode = 'path'; view.witnessLabel = '到 (0,0) 的最优路径'; }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) add(`g${r}-${c}`, r, c, `${r},${c}`);
  record('init', cost ? '只能向右或向下累加代价' : '只能向右或向下统计走法', cost ? '最优前驱只能是上方或左方，格子代价包含起点和终点。' : '每条到达当前格子的路径最后一步来自上方或左方，这两类不会重复。', `${rows} × ${cols}`);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const key = `g${r}-${c}`, node = r * cols + c; view.active = key; state.active = cost ? [node] : [];
    if (!r && !c) { dp[r][c] = cost ? grid![r][c] : 1; paths[r][c] = [0]; cell(key).value = dp[r][c]; if (cost) view.witness = [0]; record('base', '起点状态', cost ? '起点代价也计入路径和。' : '停在起点是一种空走法。', `dp[0,0] = ${dp[r][c]}`); continue; }
    const up = r ? dp[r - 1][c] : null, left = c ? dp[r][c - 1] : null;
    if (cost) {
      const takeUp = up !== null && (left === null || up <= left); dp[r][c] = (takeUp ? up! : left!) + grid![r][c];
      paths[r][c] = [...(takeUp ? paths[r - 1][c] : paths[r][c - 1]), node]; view.witness = paths[r][c]; view.witnessLabel = `到 (${r},${c}) 的一条最优路径`;
      if (up !== null) view.deps.push(dep(`g${r - 1}-${c}`, key, `+${grid![r][c]}`, takeUp));
      if (left !== null) view.deps.push(dep(`g${r}-${c - 1}`, key, `+${grid![r][c]}`, !takeUp));
      view.choices = [...(up === null ? [] : [{ label: '从上方', value: up + grid![r][c], chosen: takeUp }]), ...(left === null ? [] : [{ label: '从左方', value: left + grid![r][c], chosen: !takeUp }])];
      cell(key).value = dp[r][c]; record('transition', '选择较小的已知前驱代价', '同样最优时选择上方，仅为演示确定性，不表示其他最优路径错误。', `${Math.min(up ?? Infinity, left ?? Infinity)} + ${grid![r][c]} = ${dp[r][c]}`, { r, c, up, left });
    } else {
      dp[r][c] = (up ?? 0) + (left ?? 0); cell(key).value = dp[r][c];
      if (up !== null) view.deps.push(dep(`g${r - 1}-${c}`, key, '上方走法'));
      if (left !== null) view.deps.push(dep(`g${r}-${c - 1}`, key, '左方走法'));
      record('transition', '将两类互不重复的走法相加', '边界缺少的一侧贡献 0；这里展示的是路径数量，不是一条选定路径。', `${up ?? 0} + ${left ?? 0} = ${dp[r][c]}`, { r, c, up, left });
    }
  }
  return done(dp[rows - 1][cols - 1]);
}
