import { z } from 'zod';
import { recorder } from '../recorder';
import type { Trace } from '../types';

const integer = z.number().int().min(-10_000).max(10_000);
const nums = z.array(integer).max(24);
export const searchGreedySchemas = {
  'search-insert-position': z.object({ nums: nums.refine((a) => a.every((v, i) => !i || v > a[i - 1])), target: integer }).strict(),
  'find-first-and-last-position-of-element-in-sorted-array': z.object({ nums: nums.refine((a) => a.every((v, i) => !i || v >= a[i - 1])), target: integer }).strict(),
  'search-in-rotated-sorted-array': z.object({ nums: nums.refine((a) => new Set(a).size === a.length && a.filter((v, i) => v > a[(i + 1) % a.length]).length <= 1), target: integer }).strict(),
  'best-time-to-buy-and-sell-stock': z.object({ prices: z.array(integer.min(0)).max(24) }).strict(),
  'jump-game': z.object({ nums: z.array(integer.min(0)).min(1).max(24) }).strict(),
};
type SearchGreedyId = keyof typeof searchGreedySchemas;

export function runSearchGreedy(id: SearchGreedyId, input: unknown): Trace {
  const { state, emit, finish } = recorder(id, input);
  if (id === 'search-insert-position' || id === 'find-first-and-last-position-of-element-in-sorted-array') {
    const { nums, target } = searchGreedySchemas[id].parse(input);
    state.values = nums;
    const range = id === 'find-first-and-last-position-of-element-in-sorted-array';
    // Both passes use [left, right); right may be the insertion gap at length.
    const bound = (upper: boolean) => {
      let left = 0, right = nums.length;
      state.pointers = { left, right };
      state.window = [left, right - 1]; state.active = [];
      state.variables = { target, phase: upper ? '首个 > target' : '首个 ≥ target', left, right };
      emit('bounds', upper ? '寻找右边界' : '寻找左边界', '维护左闭右开的待查区间，边界可以落在数组末尾。');
      while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        const discardLeft = upper ? nums[mid] <= target : nums[mid] < target;
        state.pointers = { left, right, mid }; state.active = [mid];
        state.variables = { ...state.variables, left, right, mid, value: nums[mid], discardLeft };
        emit('compare', '比较中点', `${nums[mid]} ${discardLeft ? upper ? '≤' : '<' : upper ? '>' : '≥'} ${target}，${discardLeft ? '排除中点及左侧' : '保留中点作为边界候选，继续向左找'}。`);
        if (discardLeft) left = mid + 1; else right = mid;
        state.pointers = { left, right }; state.active = [];
        state.window = [left, right - 1];
        state.variables = { ...state.variables, left, right };
        emit(discardLeft ? 'discard-left' : 'discard-right', '收缩区间', `待查元素缩小到 [${left}, ${right})，边界仍可能是 ${right}。`);
      }
      state.pointers = { pos: left }; state.variables.position = left;
      emit('boundary', '边界确定', `首个${upper ? '大于' : '不小于'}目标值的位置为 ${left}。`);
      return left;
    };
    const first = bound(false);
    if (!range) {
      state.settled = first < nums.length ? [first] : [];
      return finish(first, 'return');
    }
    state.variables.first = first;
    emit('check-first', '检查是否存在', first < nums.length && nums[first] === target ? '左边界处等于目标值，继续找右边界。' : '左边界越界或不等于目标值，目标不存在。');
    if (first === nums.length || nums[first] !== target) return finish([-1, -1], 'not-found');
    const last = bound(true) - 1;
    state.active = []; state.pointers = { first, last }; state.window = [first, last];
    state.variables = { target, first, last };
    state.settled = Array.from({ length: last - first + 1 }, (_, i) => first + i);
    return finish([first, last], 'return');
  }

  if (id === 'search-in-rotated-sorted-array') {
    const { nums, target } = searchGreedySchemas[id].parse(input);
    state.values = nums;
    let left = 0, right = nums.length - 1;
    state.pointers = { left, right }; state.window = [left, right]; state.variables = { target, left, right };
    emit('init', '初始化', '在闭区间内查找；每次至少有一半保持升序。');
    while (left <= right) {
      const mid = left + Math.floor((right - left) / 2);
      state.active = [mid]; state.pointers = { left, mid, right };
      state.variables = { target, left, right, mid, value: nums[mid] };
      emit('compare', '检查中点', `nums[${mid}] = ${nums[mid]}，目标是 ${target}。`);
      if (nums[mid] === target) {
        state.active = []; state.settled = [mid]; state.pointers = { found: mid }; state.window = [mid, mid];
        return finish(mid, 'found');
      }
      const leftSorted = nums[left] <= nums[mid];
      const keepLeft = leftSorted ? nums[left] <= target && target < nums[mid] : !(nums[mid] < target && target <= nums[right]);
      state.variables = { ...state.variables, sortedHalf: leftSorted ? '左半段' : '右半段', low: leftSorted ? nums[left] : nums[mid], high: leftSorted ? nums[mid] : nums[right], keepLeft };
      emit('choose-half', '判断有序半段', `${leftSorted ? '左' : '右'}半段有序，目标${keepLeft ? '应在左侧' : '应在右侧'}，排除另一半。`);
      if (keepLeft) right = mid - 1; else left = mid + 1;
      state.window = [left, right]; state.active = []; state.pointers = { left, right };
      state.variables = { ...state.variables, left, right };
      emit(keepLeft ? 'discard-right' : 'discard-left', '收缩区间', `剩余闭区间为 [${left}, ${right}]。`);
    }
    state.active = []; state.pointers = {};
    return finish(-1, 'not-found');
  }

  if (id === 'best-time-to-buy-and-sell-stock') {
    const { prices } = searchGreedySchemas[id].parse(input);
    state.values = prices;
    if (!prices.length) return finish(0, 'empty');
    let buy = 0, best = 0;
    state.pointers = { buy }; state.variables = { minimum: prices[buy], best }; state.bestPath = [];
    emit('init', '记录最低价', '只允许先买后卖一次；没有正收益时可以不交易。');
    for (let day = 1; day < prices.length; day++) {
      const profit = prices[day] - prices[buy];
      state.active = [day]; state.pointers = { buy, day }; state.window = [buy, day];
      state.variables = { day, buy, minimum: prices[buy], price: prices[day], profit, best };
      emit('profit', '尝试今日卖出', `在第 ${buy} 天买入、第 ${day} 天卖出，收益为 ${prices[day]} − ${prices[buy]} = ${profit}。`);
      if (profit > best) {
        best = profit; state.bestPath = [buy, day]; state.variables.best = best;
        emit('best', '保存最佳交易', `这次收益提高到 ${best}，记下买卖日期。`);
      }
      if (prices[day] < prices[buy]) {
        buy = day; state.pointers.buy = buy; state.window = [buy, day];
        state.variables = { day, buy, minimum: prices[buy], best };
        emit('minimum', '换一个更低买点', `最低价更新为 ${prices[buy]}，只用于之后的卖出日。`);
      }
    }
    state.active = []; state.settled = [...state.bestPath!];
    const pair = state.bestPath!;
    state.pointers = pair.length ? { buy: pair[0], sell: pair[1] } : {};
    if (pair.length) state.window = [pair[0], pair[1]]; else delete state.window;
    state.variables = { best };
    return finish(best, 'return');
  }

  const { nums: jumps } = searchGreedySchemas['jump-game'].parse(input);
  state.values = jumps;
  let farthest = 0;
  state.window = [0, farthest]; state.pointers = { reach: farthest }; state.variables = { farthest, goal: jumps.length - 1 };
  emit('init', '从起点出发', '绿色范围表示目前可以到达的位置，不是已经选择的一条跳跃路径。');
  for (let i = 0; i < jumps.length; i++) {
    state.active = [i]; state.pointers = { i, reach: Math.min(farthest, jumps.length - 1) };
    state.variables = { i, farthest, goal: jumps.length - 1 };
    emit('check', '检查能否到达', i <= farthest ? `下标 ${i} 可达，可以用它扩展范围。` : `下标 ${i} 已超出最远可达位置 ${farthest}。`);
    if (i > farthest) { state.active = []; return finish(false, 'blocked'); }
    const candidate = i + jumps[i], before = farthest;
    farthest = Math.max(farthest, candidate);
    state.variables = { i, jump: jumps[i], candidate, before, farthest, goal: jumps.length - 1 };
    state.window = [0, Math.min(farthest, jumps.length - 1)];
    state.pointers.reach = Math.min(farthest, jumps.length - 1);
    emit('extend', '扩展可达范围', `max(${before}, ${i} + ${jumps[i]}) = ${farthest}；画布仅显示数组内的位置。`);
    if (farthest >= jumps.length - 1) {
      state.active = []; state.settled = [jumps.length - 1];
      return finish(true, 'reached');
    }
  }
  throw new Error('不可达的跳跃状态。');
}
