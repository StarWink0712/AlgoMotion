import { z } from 'zod';
import { recorder } from '../recorder';
import type { Frame, Trace } from '../types';

const integer = z.number().int().min(-10_000).max(10_000);
const nums = z.array(integer).max(24);
export const arrayHashSchemas = {
  'group-anagrams': z.object({ strs: z.array(z.string().max(8).regex(/^[a-z]*$/)).max(12) }).strict(),
  'longest-consecutive-sequence': z.object({ nums }).strict(),
  'product-of-array-except-self': z.object({ nums: z.array(z.number().int().min(-5).max(5)).max(12) }).strict(),
  'subarray-sum-equals-k': z.object({ nums, k: integer }).strict(),
};
export type ArrayHashId = keyof typeof arrayHashSchemas;

export interface ArrayHashView {
  version: 1;
  groups?: { key: string; indices: number[] }[];
  prefix?: (number | null)[];
  suffix?: (number | null)[];
  matches?: number[];
}

// Only trusted preset runners produce this namespaced, versioned v2 variable payload.
export function arrayHashView(frame: Frame): ArrayHashView {
  return (frame.variables.view as ArrayHashView | undefined) ?? { version: 1 };
}

const multiply = (a: number, b: number) => a === 0 || b === 0 ? 0 : a * b;

export function runArrayHash(id: ArrayHashId, input: unknown): Trace {
  const { state, emit, finish } = recorder(id, input);
  if (id === 'group-anagrams') {
    const { strs } = arrayHashSchemas[id].parse(input);
    const groups = new Map<string, number[]>();
    const view: ArrayHashView = { version: 1, groups: [] };
    state.values = strs; state.elementIds = strs.map((_, i) => i); state.variables = { view, groups: 0 };
    emit('init', '创建分组', '将排序后字母相同的单词放在同一组。');
    for (let i = 0; i < strs.length; i++) {
      const key = [...strs[i]].sort().join('');
      state.active = [i]; state.pointers = { i }; state.variables = { view, i, word: strs[i], signature: key, groups: groups.size };
      emit('signature', '计算字母特征', `「${strs[i]}」的字母排序后为「${key}」。`);
      if (!groups.has(key)) {
        groups.set(key, []); view.groups = [...groups].map(([key, indices]) => ({ key, indices }));
        state.variables.groups = groups.size;
        emit('new-group', '建立新组', `还没有特征「${key}」，先建立一个空组。`);
      }
      groups.get(key)!.push(i);
      view.groups = [...groups].map(([key, indices]) => ({ key, indices }));
      state.settled.push(i);
      emit('assign', '归入同组', `把下标 ${i} 的单词放入「${key}」组，重复单词也保留。`);
    }
    state.active = []; state.pointers = {};
    return finish([...groups.values()].map((indices) => indices.map((i) => strs[i])), 'return');
  }

  if (id === 'longest-consecutive-sequence') {
    const { nums } = arrayHashSchemas[id].parse(input);
    const unique = [...new Set(nums)], index = new Map(unique.map((value, i) => [value, i]));
    state.values = unique; state.path = []; state.bestPath = [];
    state.variables = { unique: unique.length, best: 0 };
    emit('init', '建立去重集合', '每个数字只保留一次；画布保留首次出现的顺序，不先排序。');
    let best = 0;
    for (const start of unique) {
      const i = index.get(start)!;
      state.active = [i]; state.path = []; state.pointers = { i };
      state.variables = { start, predecessor: start - 1, hasPredecessor: index.has(start - 1), best };
      emit('check-start', '判断是否是起点', index.has(start - 1) ? `${start - 1} 已存在，${start} 不是这一段的起点。` : `${start - 1} 不存在，可以从 ${start} 开始向右延伸。`);
      if (index.has(start - 1)) { emit('skip', '跳过中间节点', '这一段只从最小值开始计数，避免重复扫描。'); continue; }
      let current = start, length = 1;
      state.path = [i]; state.variables = { start, current, length, best };
      emit('start-chain', '开始新链', `从 ${start} 开始，当前长度为 1。`);
      while (index.has(current + 1)) {
        const from = index.get(current)!;
        current++; length++;
        const to = index.get(current)!;
        state.path.push(to); state.active = [to]; state.pointers = { from, i: to };
        state.variables = { start, current, length, best };
        emit('extend', '接上下一个数', `${current - 1} → ${current}，长度增加到 ${length}。`);
      }
      if (length > best) { best = length; state.bestPath = [...state.path]; }
      state.variables.best = best;
      emit('best', '保留最长一段', `从 ${start} 开始的这一段长 ${length}，目前最长为 ${best}。`);
    }
    state.active = []; state.pointers = {}; state.path = [...state.bestPath!]; state.settled = [...state.bestPath!];
    state.variables = { unique: unique.length, best };
    return finish(best, 'return');
  }

  if (id === 'product-of-array-except-self') {
    const { nums } = arrayHashSchemas[id].parse(input);
    const output = nums.map(() => 1);
    const view: ArrayHashView = { version: 1, prefix: nums.map(() => null), suffix: nums.map(() => null) };
    state.values = nums; state.dp = output; state.variables = { view, phase: '左侧乘积', left: 1 };
    let left = 1;
    emit('init', '初始化工作数组', '空乘积为 1；先记录每个位置左侧的乘积，不用除法。');
    for (let i = 0; i < nums.length; i++) {
      output[i] = left; view.prefix![i] = left;
      state.active = [i]; state.pointers = { i }; state.variables = { view, phase: '左侧乘积', i, left };
      emit('write-left', '写入左侧乘积', `位置 ${i} 左侧的乘积为 ${left}，不包含 nums[${i}]。`);
      const before = left; left = multiply(left, nums[i]); state.variables = { ...state.variables, before, value: nums[i], left };
      emit('extend-left', '向右累计', `${before} × ${nums[i]} = ${left}，供下一个位置使用。`);
    }
    let right = 1;
    state.active = []; state.pointers = {}; state.variables = { view, phase: '右侧乘积', right };
    emit('right-init', '从右侧返回', '右侧空乘积也为 1；把已经保存的左侧乘积乘上右侧乘积。');
    for (let i = nums.length - 1; i >= 0; i--) {
      view.suffix![i] = right;
      output[i] = multiply(output[i], right);
      state.active = [i]; state.pointers = { i }; state.settled.push(i);
      state.variables = { view, phase: '合并乘积', i, left: view.prefix![i], right, product: output[i] };
      emit('combine', '左右合并', `${view.prefix![i]} × ${right} = ${output[i]}，恰好排除了当前位置。`);
      const before = right; right = multiply(right, nums[i]); state.variables = { ...state.variables, before, value: nums[i], right };
      emit('extend-right', '向左累计', `${before} × ${nums[i]} = ${right}，供前一个位置使用。`);
    }
    state.active = []; state.pointers = {}; state.variables = { view };
    return finish(output, 'return');
  }

  const { nums: values, k } = arrayHashSchemas['subarray-sum-equals-k'].parse(input);
  const counts = new Map<number, number>([[0, 1]]);
  // Occurrence positions are visualization-only; counting uses the frequency map.
  const positions = new Map<number, number[]>([[0, [0]]]);
  const view: ArrayHashView = { version: 1, prefix: [0], matches: [] };
  let prefix = 0, count = 0;
  state.values = values; state.table = [['0', 1]]; state.variables = { view, k, prefix, count };
  emit('init', '记录空前缀', '空前缀和 0 出现一次，因此从下标 0 开始的区间也能被计入。');
  for (let i = 0; i < values.length; i++) {
    prefix += values[i]; view.prefix!.push(prefix); view.matches = [];
    state.active = [i]; state.pointers = { i }; state.variables = { view, i, k, prefix, count };
    emit('prefix', '累计前缀和', `前 ${i + 1} 个数的和为 ${prefix}。`);
    const need = prefix - k, hits = counts.get(need) ?? 0;
    view.matches = [...positions.get(need) ?? []]; state.variables = { ...state.variables, need, hits };
    emit('lookup', '查找之前的前缀', `${prefix} − ${k} = ${need}，之前出现过 ${hits} 次。`);
    count += hits; state.variables.count = count;
    emit('count', '累加区间数量', `新增 ${hits} 个以 ${i} 结尾的非空区间，累计 ${count} 个。`);
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    positions.set(prefix, [...positions.get(prefix) ?? [], i + 1]);
    state.table = [...counts].map(([sum, frequency]) => [String(sum), frequency]);
    emit('record', '记录当前前缀', '先查找再记录，避免 k = 0 时把空区间计入答案。');
  }
  view.matches = []; state.active = []; state.pointers = {}; state.variables = { view, k, prefix, count };
  return finish(count, 'return');
}
