import { z } from 'zod';
import { recorder } from '../recorder';
import type { Frame, Trace } from '../types';
import type { DPGreedyView, DPCell } from './dp-greedy';
import type { LinkedListView } from './linked-lists';

const text = z.string().regex(/^[a-z]{0,8}$/);
const frequencies = (a: number[]) => { const counts = new Map<number, number>(); for (const x of a) counts.set(x, (counts.get(x) ?? 0) + 1); return [...counts.values()]; };
export const finalSixSchemas = {
  'longest-palindromic-substring': z.object({ s: z.string().regex(/^[a-z]{0,16}$/) }).strict(),
  'longest-common-subsequence': z.object({ text1: text, text2: text }).strict(),
  'edit-distance': z.object({ word1: text, word2: text }).strict(),
  'single-number': z.object({ nums: z.array(z.number().int().min(-128).max(127)).min(1).max(23).refine((a) => { const f = frequencies(a); return f.filter((n) => n === 1).length === 1 && f.every((n) => n === 1 || n === 2); }) }).strict(),
  'majority-element': z.object({ nums: z.array(z.number().int().min(-10000).max(10000)).min(1).max(24).refine((a) => frequencies(a).some((n) => n > a.length / 2)) }).strict(),
  'find-the-duplicate-number': z.object({ nums: z.array(z.number().int().min(1).max(12)).min(2).max(13).refine((a) => a.every((x) => x < a.length) && frequencies(a).filter((n) => n > 1).length === 1) }).strict(),
};
export type FinalSixId = keyof typeof finalSixSchemas;
export interface EssentialView {
  version: 1;
  kind: 'palindrome' | 'xor' | 'vote';
  equation: string;
  pair: number[];
  pending: number[];
  candidate: number | null;
  count: number;
  before: number;
  operand: number;
  after: number;
  best: number[];
  bestText: string;
}
export const essentialView = (frame: Frame) => frame.variables.view as EssentialView;

export function runFinalSix(id: FinalSixId, input: unknown): Trace {
  const { state, emit, finish } = recorder(id, input);
  if (id === 'longest-common-subsequence' || id === 'edit-distance') {
    const edit = id === 'edit-distance';
    const data = edit ? finalSixSchemas['edit-distance'].parse(input) : finalSixSchemas['longest-common-subsequence'].parse(input);
    const a = 'word1' in data ? data.word1 : data.text1, b = 'word2' in data ? data.word2 : data.text2;
    const m = a.length, n = b.length, dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);
    const cells: DPCell[] = [];
    for (let i = 0; i <= m; i++) for (let j = 0; j <= n; j++) cells.push({ id: `g${i}-${j}`, row: i, col: j, label: `${i},${j}`, value: null });
    const view: DPGreedyView = { version: 1, layout: 'grid', columns: n + 1, sourceCols: 0, sourceLabel: '', cells, active: null, deps: [], choices: [], witness: [], otherWitness: [], witnessLabel: '', witnessMode: 'sum', segments: [], ranges: [], dictionary: [], table: [], output: [], equation: '', round: 0,
      axes: { rows: ['0:∅', ...[...a].map((c, i) => `${i + 1}:${c}`)], columns: ['0:∅', ...[...b].map((c, i) => `${i + 1}:${c}`)], rowLabel: edit ? `word1 = "${a}"` : `text1 = "${a}"`, columnLabel: edit ? `word2 = "${b}"` : `text2 = "${b}"` }, registerPath: [], alignment: [] };
    const record = (location: string, action: string, detail: string, equation: string, vars: Record<string, unknown> = {}) => { view.equation = equation; state.variables = { view, ...vars }; emit(location, action, detail); view.deps = []; view.choices = []; };
    const put = (i: number, j: number, value: number) => { dp[i][j] = value; const c = cells[i * (n + 1) + j]; c.value = value; view.active = c.id; };
    const source = (r: number, c: number, i: number, j: number, label: string, chosen: boolean) => ({ from: `g${r}-${c}`, to: `g${i}-${j}`, value: dp[r][c], label, chosen, eligible: true });
    record('init', '用两个字符串的前缀定义状态', edit ? 'dp[i,j] 是 word1 前 i 个字符变为 word2 前 j 个字符的最少编辑次数。' : 'dp[i,j] 是两个前缀的最长公共子序列长度；子序列不要求连续。', `${m + 1} × ${n + 1} 个前缀状态`);
    for (let i = 0; i <= m; i++) { put(i,0,edit ? i : 0); record('base-row', '与空目标前缀比较', edit ? '只能删除源前缀的全部字符。' : '任意字符串与空字符串的公共子序列长度为 0。', `dp[${i},0] = ${dp[i][0]}`); }
    for (let j = 1; j <= n; j++) { put(0,j,edit ? j : 0); record('base-column', '与空源前缀比较', edit ? '只能插入目标前缀的全部字符。' : '空字符串与任意字符串的公共子序列长度为 0。', `dp[0,${j}] = ${dp[0][j]}`); }
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      const same = a[i - 1] === b[j - 1];
      if (same) {
        put(i,j,dp[i - 1][j - 1] + (edit ? 0 : 1));
        view.deps = [source(i - 1,j - 1,i,j,edit ? '保留 +0' : '匹配 +1',true)];
        record('match', '末尾字符相同，接到对角来源', edit ? '保留相同字符不增加操作。' : '相同字符可以接在两个较短前缀的公共子序列之后。', `"${a[i - 1]}" = "${b[j - 1]}" · ${dp[i - 1][j - 1]} + ${edit ? 0 : 1} = ${dp[i][j]}`, { i, j });
      } else if (edit) {
        const candidates = [dp[i - 1][j - 1] + 1, dp[i - 1][j] + 1, dp[i][j - 1] + 1], selected = candidates.indexOf(Math.min(...candidates));
        put(i,j,candidates[selected]); view.deps = [source(i - 1,j - 1,i,j,'替换 +1',selected === 0), source(i - 1,j,i,j,'删除 +1',selected === 1), source(i,j - 1,i,j,'插入 +1',selected === 2)];
        view.choices = candidates.map((value, k) => ({ label: ['替换','删除','插入'][k], value, chosen: k === selected }));
        record('different', '比较替换、删除和插入', '操作都相对于源字符串；等值时按替换、删除、插入选一个代表，不要求编辑方案唯一。', `min(${candidates.join(', ')}) = ${dp[i][j]}`, { i, j });
      } else {
        const up = dp[i - 1][j], left = dp[i][j - 1]; put(i,j,Math.max(up,left));
        view.deps = [source(i - 1,j,i,j,'跳过源字符',up >= left), source(i,j - 1,i,j,'跳过目标字符',left > up)];
        view.choices = [{ label: '上方', value: up, chosen: up >= left }, { label: '左方', value: left, chosen: left > up }];
        record('different', '末尾不同，只能跳过一侧字符', '取较长的公共子序列；等长时选上方，只决定展示哪一种最优方案。', `max(${up}, ${left}) = ${dp[i][j]}`, { i, j });
      }
    }
    let i = m, j = n; view.registerPath = [`g${i}-${j}`]; view.active = `g${i}-${j}`;
    record('reconstruct', '沿最优来源回溯', edit ? '从右下角向起点回溯，将已恢复的对齐列前插；当前是后缀，不是完整编辑脚本。' : '从右下角回溯，只在相同字符的对角步保存字符；当前是已恢复的子序列后缀。', `从 (${i},${j}) 开始`);
    while (edit ? i > 0 || j > 0 : i > 0 && j > 0) {
      const beforeI = i, beforeJ = j;
      if (i && j && a[i - 1] === b[j - 1]) { view.alignment!.unshift({ left: a[--i], right: b[--j], kind: edit ? 'keep' : 'match' }); }
      else if (!edit) { if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--; }
      else if (i && j && dp[i][j] === dp[i - 1][j - 1] + 1) view.alignment!.unshift({ left: a[--i], right: b[--j], kind: 'replace' });
      else if (i && dp[i][j] === dp[i - 1][j] + 1) view.alignment!.unshift({ left: a[--i], right: '', kind: 'delete' });
      else view.alignment!.unshift({ left: '', right: b[--j], kind: 'insert' });
      view.active = `g${i}-${j}`; view.registerPath.push(view.active); view.deps = [source(i,j,beforeI,beforeJ,'最优来源',true)];
      record('backtrack', '恢复一个最优来源', '路径与对齐列来自已计算的状态，不提前把最终结果填到旧快照。', `(${beforeI},${beforeJ}) ← (${i},${j})`, { i, j });
    }
    state.variables = { view }; return finish(dp[m][n], 'return');
  }

  if (id === 'find-the-duplicate-number') {
    const { nums } = finalSixSchemas[id].parse(input); state.values = nums; state.links = nums.map((v, i) => [i,v]);
    const view: LinkedListView = { version: 1, lanes: [{ label: '数组函数图：节点是下标，节点内的值指向下一下标', ids: nums.map((_, i) => i) }], heads: { start: 0 }, dummy: [], detached: [], output: [], outputLabel: '', randomLinks: [], copies: [], changed: [], retired: [], group: [], edgeMode: 'array-index', traversed: [] };
    let slow = 0, fast = 0, finder: number | null = null, phase = '相遇';
    const record = (location: string, action: string, detail: string, equation: string) => {
      state.pointers = finder === null ? { slow, fast } : { slow, finder }; state.active = [...new Set(Object.values(state.pointers) as number[])];
      state.variables = { view, phase, equation }; emit(location, action, detail); view.traversed = [];
    };
    record('init', '把数组值当作下一下标', '所有值在 1..n，0 没有入边。从 0 出发一定进入环；重复值对应环入口下标。', 'slow = fast = 0');
    do {
      const oldSlow = slow, oldFast = fast, middle = nums[fast]; slow = nums[slow]; fast = nums[middle]; view.traversed = [[oldSlow,slow],[oldFast,middle],[middle,fast]];
      record('advance', '慢指针一步，快指针两步', '只读取数组，不交换或修改元素；快指针经过的中间下标也会显示读取边。', `slow: ${oldSlow} → ${slow} · fast: ${oldFast} → ${middle} → ${fast}`);
    } while (slow !== fast);
    record('meet', '在环内相遇', '相遇点未必是入口，不能直接返回这个下标。', `相遇于下标 ${slow}`);
    finder = 0; phase = '找入口'; record('reset', '一个指针回到 0', '保留相遇点处的慢指针，另一个从 0 出发；两者都改为每轮一步。', `finder = 0，slow = ${slow}`);
    while (finder !== slow) {
      const oldFinder = finder, oldSlow = slow; finder = nums[finder]; slow = nums[slow]; view.traversed = [[oldFinder,finder],[oldSlow,slow]];
      record('entrance', '同速前进寻找入口', '两指针再次相遇的位置就是从 0 可达环的入口。', `finder: ${oldFinder} → ${finder} · slow: ${oldSlow} → ${slow}`);
    }
    view.group = [slow]; state.settled = [slow]; phase = '已确定'; record('found', '返回入口下标，亦即重复数值', '返回的是入口下标 d，不是读取入口节点里存放的 nums[d]。两者数值有时相同，含义仍不同。', `重复数 = ${slow}（入口下标；该格值为 ${nums[slow]}）`);
    state.active = []; return finish(slow, 'return');
  }

  const view: EssentialView = { version: 1, kind: id === 'single-number' ? 'xor' : id === 'majority-element' ? 'vote' : 'palindrome', equation: '', pair: [], pending: [], candidate: null, count: 0, before: 0, operand: 0, after: 0, best: [], bestText: '' };
  const record = (location: string, action: string, detail: string, equation: string) => { view.equation = equation; state.variables = { view }; emit(location, action, detail); view.pair = []; };
  const done = (result: unknown) => { state.active = []; state.pointers = {}; view.pair = []; if (view.kind !== 'palindrome') state.bestPath = [...view.pending]; state.variables = { view }; return finish(result,'return'); };
  if (id === 'longest-palindromic-substring') {
    const { s } = finalSixSchemas[id].parse(input); state.values = [...s]; let bestStart = 0, bestLength = 0;
    record('init', '枚举字符中心和字符间隙中心', '奇数长度以字符为中心，偶数长度以间隙为中心；结果要求连续子串。', `${s.length} 个字符`);
    for (let center = 0; center < 2 * s.length - 1; center++) {
      let left = Math.floor(center / 2), right = left + center % 2; state.window = [left,right]; state.pointers = { L: left, R: right }; state.active = [left,right];
      record('center', center % 2 ? '选择偶数长度中心' : '选择奇数长度中心', '从当前中心向两边同步检查，保留之前已经找到的最好结果。', `中心 ${center % 2 ? `${left}|${right}` : left}`);
      while (left >= 0 && right < s.length) {
        state.pointers = { L: left, R: right }; state.active = [...new Set([left,right])]; view.pair = [left,right]; state.window = [left,right];
        if (s[left] !== s[right]) { record('mismatch', '两端不同，停止这个中心', '中心固定时，外层若失败就不能越过这对字符继续扩展。', `"${s[left]}" ≠ "${s[right]}"`); break; }
        record('expand', '两端相同，当前区间为回文', '内层已验证或为空，因此相同两端可以构成更长回文。', `"${s[left]}" = "${s[right]}" · 长度 ${right - left + 1}`);
        const length = right - left + 1;
        if (length > bestLength || (length === bestLength && left < bestStart)) {
          bestStart = left; bestLength = length; view.best = Array.from({ length }, (_, i) => left + i); view.bestText = s.slice(left,right + 1); state.bestPath = [...view.best];
          record('best', '更新目前最长的连续回文', '长度相同时保留起点最靠左的结果。', `当前最好 "${view.bestText}" · ${bestLength} 个字符`);
        }
        left--; right++;
      }
    }
    state.window = bestLength ? [bestStart,bestStart + bestLength - 1] : undefined;
    if (!bestLength) delete state.window;
    return done(s.slice(bestStart,bestStart + bestLength));
  }
  if (id === 'single-number') {
    const { nums } = finalSixSchemas[id].parse(input); state.values = nums; let acc = 0; const unmatched = new Map<number,number>();
    record('init', '从 0 开始异或每个数', '相同的两个数异或为 0，0 与任意数异或不改变它。输入约定保证只有一项出现一次。', 'acc = 0');
    for (let i = 0; i < nums.length; i++) {
      view.before = acc; view.operand = nums[i]; acc ^= nums[i]; view.after = acc; state.active = [i]; state.pointers = { i };
      const paired = unmatched.get(nums[i]); if (paired === undefined) unmatched.set(nums[i],i); else { view.pair = [paired,i]; unmatched.delete(nums[i]); }
      view.pending = [...unmatched.values()]; state.settled = nums.slice(0,i + 1).flatMap((_, k) => view.pending.includes(k) ? [] : [k]);
      record('xor', '逐位异或，成对元素抵消', '按 8 位补码展示 -128..127 的输入；累加器是已读前缀的异或，并非随时都是最终答案。', `${view.before} XOR ${nums[i]} = ${acc}`);
    }
    return done(acc);
  }
  const { nums } = finalSixSchemas['majority-element'].parse(input); state.values = nums;
  let candidate = 0, count = 0;
  record('init', '异值配对抵消，留下多数候选', '输入保证某个值出现次数严格大于一半；票数表示未被抵消的数量，不是候选的总出现次数。', '候选未定，票数 0');
  for (let i = 0; i < nums.length; i++) {
    state.pointers = { i }; state.active = [i];
    if (count === 0) { candidate = nums[i]; view.candidate = candidate; record('candidate','票数为 0，选择新的候选','旧候选已完全抵消，当前元素成为新的候选。', `候选 = ${candidate}`); }
    if (nums[i] === candidate) { count++; view.pending.push(i); view.count = count; record('vote','同值增加一票','未抵消的票全部属于当前候选。', `${candidate} 获得一票 → ${count}`); }
    else { const paired = view.pending.pop()!; count--; view.count = count; view.pair = [paired,i]; state.settled.push(paired,i); record('cancel','不同值抵消一票','删除一对不同值，不会改变严格多数元素必能存活的结论。', `${candidate} 与 ${nums[i]} 抵消 → ${count}`); }
  }
  record('guarantee', '在严格多数约定下确定结果', '剩余票数不是频次统计；正确性依赖输入具有严格多数的约定，非法输入在运行前拒绝。', `多数元素 = ${candidate}，剩余票数 ${count}`);
  return done(candidate);
}
