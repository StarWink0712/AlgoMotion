import { z } from 'zod';
import { recorder } from '../recorder';
import type { Frame, Trace } from '../types';

const integer = z.number().int().min(-10_000).max(10_000);
const nums = z.array(integer).max(24);
const endpoint = z.number().int().min(-100).max(100);
export const arrayTransformSchemas = {
  '3sum': z.object({ nums: nums.max(16) }).strict(),
  'sort-colors': z.object({ nums: z.array(z.number().int().min(0).max(2)).max(24) }).strict(),
  'rotate-array': z.object({ nums, k: z.number().int().min(0).max(1_000_000_000) }).strict(),
  'next-permutation': z.object({ nums }).strict(),
  'merge-intervals': z.object({ intervals: z.array(z.tuple([endpoint, endpoint]).refine(([start, end]) => start <= end)).max(12) }).strict(),
};
export type ArrayTransformId = keyof typeof arrayTransformSchemas;
export interface IntervalItem { id: number; start: number; end: number }
export interface ArrayTransformView {
  version: 1;
  triplets?: number[][];
  items?: IntervalItem[];
  merged?: (IntervalItem & { members: number[] })[];
}
export const arrayTransformView = (frame: Frame): ArrayTransformView => (frame.variables.view as ArrayTransformView | undefined) ?? { version: 1 };

export function runArrayTransform(id: ArrayTransformId, input: unknown): Trace {
  const { state, emit, finish } = recorder(id, input);
  if (id === 'merge-intervals') {
    const { intervals } = arrayTransformSchemas[id].parse(input);
    const items = intervals.map(([start, end], id) => ({ id, start, end }));
    const merged: NonNullable<ArrayTransformView['merged']> = [];
    const view: ArrayTransformView = { version: 1, items, merged };
    const sync = () => { state.values = items.map(({ start, end }) => `[${start}, ${end}]`); state.elementIds = items.map((item) => item.id); };
    sync(); state.variables = { view, count: 0 };
    emit('init', '准备区间', '闭区间包含两端，端点相接也需要合并。');
    items.sort((a, b) => a.start - b.start || a.end - b.end || a.id - b.id); sync();
    emit('sort', '按起点排序', '起点从小到大排列，只需与最后一个已合并区间比较。');
    for (let i = 0; i < items.length; i++) {
      const item = items[i], last = merged.at(-1);
      state.active = [i]; state.pointers = { i };
      state.variables = { view, i, start: item.start, end: item.end, previousEnd: last?.end ?? null, count: merged.length };
      emit('inspect', '检查是否重叠', last ? `当前起点 ${item.start}，上一段终点 ${last.end}。` : '当前还没有合并结果，先放入第一段。');
      if (!last || item.start > last.end) {
        merged.push({ ...item, members: [item.id] });
        state.variables = { ...state.variables, group: merged.length - 1, count: merged.length };
        emit('append', '新开一段', `区间 [${item.start}, ${item.end}] 与前面的区间不重叠。`);
      } else {
        const before = last.end;
        last.end = Math.max(last.end, item.end); last.members.push(item.id);
        state.variables = { ...state.variables, group: merged.length - 1, before, mergedEnd: last.end };
        emit('merge', '合并到上一段', `${item.start} ≤ ${before}，右端更新为 max(${before}, ${item.end}) = ${last.end}。`);
      }
      state.settled.push(i);
    }
    state.active = []; state.pointers = {}; state.variables = { view, count: merged.length };
    return finish(merged.map(({ start, end }) => [start, end]), 'return');
  }

  const parsed = arrayTransformSchemas[id].parse(input);
  const values = parsed.nums;
  state.values = values; state.elementIds = values.map((_, i) => i);
  const swap = (a: number, b: number) => {
    [values[a], values[b]] = [values[b], values[a]];
    [state.elementIds![a], state.elementIds![b]] = [state.elementIds![b], state.elementIds![a]];
  };
  const valid = (...indices: number[]) => [...new Set(indices.filter((i) => i >= 0 && i < values.length))];
  const finishArray = (location = 'return') => {
    state.active = []; state.pointers = {}; state.settled = values.map((_, i) => i); delete state.window;
    return finish(values, location);
  };

  if (id === '3sum') {
    const results: number[][] = [], view: ArrayTransformView = { version: 1, triplets: results };
    state.variables = { view, count: 0 };
    emit('init', '准备数组', '返回数值不同的三元组；每组必须使用三个不同位置。');
    const sorted = values.map((value, i) => ({ value, id: i })).sort((a, b) => a.value - b.value || a.id - b.id);
    sorted.forEach((entry, i) => { values[i] = entry.value; state.elementIds![i] = entry.id; });
    emit('sort', '先排序', '排序后固定一个数，其余两个数用左右指针寻找。');
    for (let i = 0; i < values.length - 2; i++) {
      let left = i + 1, right = values.length - 1;
      const sync = () => { state.pointers = { i, left, right }; state.active = valid(i, left, right); state.window = [left, right]; };
      sync(); state.variables = { view, i, anchor: values[i], left, right, count: results.length };
      emit('anchor', '固定第一个数', `固定下标 ${i} 的 ${values[i]}。`);
      if (i > 0 && values[i] === values[i - 1]) { emit('skip-anchor', '跳过重复起点', '相同的第一个数已经处理，不重复输出三元组。'); continue; }
      while (left < right) {
        const sum = values[i] + values[left] + values[right];
        sync(); state.variables = { view, i, left, right, a: values[i], b: values[left], c: values[right], sum, count: results.length };
        emit('sum', '比较三数之和', `当前和为 ${sum}，目标为 0。`);
        if (sum < 0) {
          left++; sync(); state.variables.left = left;
          emit('move-left', '左指针右移', '和偏小，尝试更大的第二个数。');
        } else if (sum > 0) {
          right--; sync(); state.variables.right = right;
          emit('move-right', '右指针左移', '和偏大，尝试更小的第三个数。');
        } else {
          results.push([values[i], values[left], values[right]]); state.variables.count = results.length;
          emit('collect', '记下一组', '找到和为 0 的三元组，接下来跳过重复值。');
          left++; right--; sync(); state.variables = { ...state.variables, left, right };
          emit('advance', '继续寻找', '两侧指针同时向内移动。');
          while (left < right && values[left] === values[left - 1]) {
            left++; sync(); state.variables.left = left;
            emit('skip-left', '跳过左侧重复', '相同数值组合只记录一次。');
          }
          while (left < right && values[right] === values[right + 1]) {
            right--; sync(); state.variables.right = right;
            emit('skip-right', '跳过右侧重复', '相同数值组合只记录一次。');
          }
        }
      }
    }
    state.active = []; state.pointers = {}; delete state.window; state.variables = { view, count: results.length };
    return finish(results, 'return');
  }

  if (id === 'sort-colors') {
    let low = 0, mid = 0, high = values.length - 1;
    const sync = () => {
      state.pointers = { low, mid, high }; state.window = [mid, high];
      state.variables = { ...state.variables, low, mid, high };
      state.settled = values.flatMap((_, i) => i < mid || i > high ? [i] : []);
    };
    sync(); emit('init', '划分三个区域', '0 放左侧，2 放右侧，mid 检查尚未确定的元素。');
    while (mid <= high) {
      state.active = [mid]; state.variables = { low, mid, high, value: values[mid] };
      emit('check', '检查当前颜色', `检查下标 ${mid} 的 ${values[mid]}。`);
      if (values[mid] === 0) {
        const from = mid, to = low;
        swap(mid, low); low++; mid++; sync(); state.active = valid(from, to); state.variables = { ...state.variables, from, to };
        emit('place-zero', '把 0 放到左侧', '交换后 low、mid 一起推进，0 区增长一格。');
      } else if (values[mid] === 2) {
        const from = mid, to = high;
        swap(mid, high); high--; sync(); state.active = valid(from, to); state.variables = { ...state.variables, from, to };
        emit('place-two', '把 2 放到右侧', 'high 左移；换来的数还没检查，mid 留在原处。');
      } else {
        mid++; sync(); state.active = [mid - 1];
        emit('place-one', '保留中间的 1', '当前已经是 1，只推进 mid。');
      }
    }
    return finishArray();
  }

  const reverse = (left: number, right: number, phase: string, location: string, pivot?: number) => {
    state.window = [left, right]; state.active = [];
    const sync = () => { state.pointers = { ...(pivot === undefined ? {} : { pivot: pivot >= 0 ? pivot : null }), left, right }; };
    state.variables = { ...state.variables, phase }; sync();
    emit(location, phase, `反转下标区间 [${left}, ${right}]。`);
    while (left < right) {
      swap(left, right); state.active = [left, right]; state.variables = { ...state.variables, from: left, to: right };
      emit('swap', '交换两端', `交换下标 ${left} 与 ${right}，元素身份随位置一起移动。`);
      left++; right--; sync(); state.active = valid(left, right);
      emit('advance', '向中间收拢', '继续处理这一段尚未反转的中间部分。');
    }
  };
  if (id === 'rotate-array') {
    const { k } = arrayTransformSchemas[id].parse(input);
    state.variables = { k };
    if (!values.length) return finishArray('empty');
    const shift = k % values.length; state.variables.shift = shift;
    emit('normalize', '折算旋转次数', `${k} mod ${values.length} = ${shift}，向右移动 ${shift} 位。`);
    if (shift === 0) return finishArray();
    reverse(0, values.length - 1, '反转整个数组', 'whole');
    reverse(0, shift - 1, '反转前段', 'front');
    reverse(shift, values.length - 1, '反转后段', 'back');
    return finishArray();
  }

  if (values.length < 2) return finishArray('short');
  let pivot = values.length - 2;
  state.variables = { pivot };
  emit('init', '从右侧寻找转折', '找到第一个能变大的位置，尽量保留更长的前缀。');
  while (pivot >= 0) {
    state.pointers = { pivot, next: pivot + 1 }; state.active = [pivot, pivot + 1]; state.window = [pivot + 1, values.length - 1];
    state.variables = { pivot, a: values[pivot], b: values[pivot + 1] };
    emit('compare-pivot', '检查相邻大小', `${values[pivot]} ${values[pivot] < values[pivot + 1] ? '<' : '≥'} ${values[pivot + 1]}。`);
    if (values[pivot] < values[pivot + 1]) break;
    pivot--; state.pointers = { pivot: pivot >= 0 ? pivot : null }; state.active = valid(pivot); state.variables.pivot = pivot; state.window = [pivot + 1, values.length - 1];
    emit('move-pivot', '继续向左找', '右侧仍是非递增后缀，继续寻找可以增大的位置。');
  }
  if (pivot >= 0) {
    let next = values.length - 1;
    while (true) {
      state.pointers = { pivot, next }; state.active = [pivot, next];
      state.variables = { pivot, next, a: values[pivot], b: values[next] };
      emit('compare-next', '寻找最小增量', `从右向左找第一个大于 ${values[pivot]} 的数。`);
      if (values[next] > values[pivot]) break;
      next--; state.pointers.next = next; state.variables.next = next; state.active = [pivot, next];
      emit('move-next', '跳过不够大的数', '相等的数也不能让排列变大。');
    }
    swap(pivot, next);
    emit('swap-pivot', '增大转折位置', '用后缀中最小的更大数字替换转折位置。');
  }
  state.variables = { pivot, wrapped: pivot < 0 };
  reverse(pivot + 1, values.length - 1, pivot < 0 ? '回到最小排列' : '反转后缀', 'suffix', pivot);
  return finishArray();
}
