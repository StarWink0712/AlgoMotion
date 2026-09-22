import { z } from 'zod';
import { recorder } from '../recorder';
import type { Frame, Trace } from '../types';

const integer = z.number().int().min(-10000).max(10000);
const nums = z.array(integer).max(24);
const sorted = nums.refine((a) => a.every((v, i) => !i || a[i - 1] <= v));
const matrix = z.array(z.array(integer).min(1).max(6)).max(6).refine((a) => a.every((r) => r.length === a[0].length));
export const orderingSchemas = {
  'first-missing-positive': z.object({ nums }).strict(),
  'rotate-image': z.object({ matrix: matrix.refine((a) => a.every((r) => r.length === a.length)) }).strict(),
  'search-a-2d-matrix': z.object({ matrix: matrix.refine((a) => a.flat().every((v, i, all) => !i || all[i - 1] < v)), target: integer }).strict(),
  'search-a-2d-matrix-ii': z.object({ matrix: matrix.refine((a) => a.every((row, r) => row.every((v, c) => (!c || row[c - 1] <= v) && (!r || a[r - 1][c] <= v)))), target: integer }).strict(),
  'find-minimum-in-rotated-sorted-array': z.object({ nums: nums.min(1).refine((a) => new Set(a).size === a.length && a.filter((v, i) => v > a[(i + 1) % a.length]).length <= 1) }).strict(),
  'median-of-two-sorted-arrays': z.object({ a: sorted, b: sorted }).strict().refine(({ a, b }) => a.length + b.length > 0 && a.length + b.length <= 24),
};
export type OrderingId = keyof typeof orderingSchemas;
export interface OrderingView {
  version: 1;
  kind: 'array' | 'matrix' | 'partition';
  rows: number;
  cols: number;
  allowed: number[];
  swaps: [number, number][];
  equation: string;
  phase: string;
  lanes?: { label: string; values: number[] }[];
  cuts?: [number, number];
  boundaries?: { aLeft: number | null; aRight: number | null; bLeft: number | null; bRight: number | null };
  cutRange?: [number, number];
  medianIds?: number[];
}
export const orderingView = (frame: Frame) => frame.variables.view as OrderingView;
export function runOrdering(id: OrderingId, input: unknown): Trace {
  const data = orderingSchemas[id].parse(input), { state, emit, finish } = recorder(id, input);
  const view: OrderingView = { version: 1, kind: 'array', rows: 0, cols: 0, allowed: [], swaps: [], equation: '', phase: '' };
  const record = (location: string, action: string, explanation: string, equation: string, vars: Record<string, unknown> = {}) => {
    view.equation = equation; state.variables = { view, ...vars }; emit(location, action, explanation); view.swaps = [];
  };
  const done = (result: unknown) => { state.active = []; state.pointers = {}; return finish(result, 'return'); };
  const swap = (a: number, b: number) => { [state.values[a], state.values[b]] = [state.values[b], state.values[a]]; [state.elementIds![a], state.elementIds![b]] = [state.elementIds![b], state.elementIds![a]]; view.swaps = [[a, b]]; state.active = [a, b]; };
  if (id === 'median-of-two-sorted-arrays') {
    let { a, b } = orderingSchemas[id].parse(input); let aName = '输入 A', bName = '输入 B';
    if (a.length > b.length) { [a, b] = [b, a]; [aName, bName] = [bName, aName]; }
    view.kind = 'partition'; view.lanes = [{ label: `${aName} · 较短侧`, values: a }, { label: bName, values: b }]; state.values = [...a, ...b];
    let lo = 0, hi = a.length; const half = Math.floor((a.length + b.length + 1) / 2);
    view.cutRange = [lo, hi]; record('init', '在较短数组上二分切口', '切口代表左半边取多少个元素，范围包含 0 和数组长度；奇数时左半边多一个。', `左半边共 ${half} 个元素`, { half });
    while (lo <= hi) {
      const i = Math.floor((lo + hi) / 2), j = half - i;
      const al = i ? a[i - 1] : -Infinity, ar = i < a.length ? a[i] : Infinity, bl = j ? b[j - 1] : -Infinity, br = j < b.length ? b[j] : Infinity;
      view.cuts = [i, j]; view.boundaries = { aLeft: i ? al : null, aRight: i < a.length ? ar : null, bLeft: j ? bl : null, bRight: j < b.length ? br : null };
      state.active = [i ? i - 1 : -1, i < a.length ? i : -1, j ? a.length + j - 1 : -1, j < b.length ? a.length + j : -1].filter((n) => n >= 0);
      record('cut', '比较切口两侧的交叉边界', '要求 A 左最大 ≤ B 右最小，且 B 左最大 ≤ A 右最小；缺失左边按 −∞，缺失右边按 +∞。', `i=${i}, j=${j} · 左侧 ${i + j} 项`, { i, j, half });
      if (al > br) { hi = i - 1; view.cutRange = [lo, hi]; record('left', 'A 左半边取多了', 'A 左最大越过 B 右最小，减少 A 的左侧元素数。', `切口向左：[${lo},${hi}]`); }
      else if (bl > ar) { lo = i + 1; view.cutRange = [lo, hi]; record('right', 'A 左半边取少了', 'B 左最大越过 A 右最小，增加 A 的左侧元素数。', `切口向右：[${lo},${hi}]`); }
      else {
        const leftId = al >= bl ? i - 1 : a.length + j - 1, rightId = ar <= br ? i : a.length + j;
        const odd = (a.length + b.length) % 2 === 1, result = odd ? Math.max(al, bl) : (Math.max(al, bl) + Math.min(ar, br)) / 2;
        view.medianIds = odd ? [leftId] : [leftId, rightId]; state.settled = view.medianIds;
        record('median', '正确划分后读取中间元素', '不用合并两个数组，只使用左右边界计算中位数。', odd ? `左侧最大 = ${result}` : `(${Math.max(al, bl)} + ${Math.min(ar, br)}) / 2 = ${result}`); return done(result);
      }
    }
    throw new Error('内部错误：没有找到有效中位数切口。');
  }
  if ('nums' in data) {
    const arr = [...data.nums]; state.values = arr; state.elementIds = arr.map((_, i) => i);
    if (id === 'first-missing-positive') {
      record('init', '把值 x 放到下标 x−1', '答案只可能在 1 到 n+1；超范围数字忽略，目标位置已有同值时必须停下，避免重复数死循环。', `候选答案 1…${arr.length + 1}`);
      for (let i = 0; i < arr.length; i++) {
        state.pointers = { i }; state.active = [i]; record('inspect', '检查当前数字能否归位', '当前位置可能被换入新数字，要持续检查，而不是交换一次就跳过。', `nums[${i}] = ${arr[i]}`, { i });
        while (arr[i] >= 1 && arr[i] <= arr.length && arr[arr[i] - 1] !== arr[i]) {
          const target = arr[i] - 1; state.pointers = { i, target }; swap(i, target); state.settled = arr.flatMap((v, index) => v === index + 1 ? [index] : []);
          record('swap', '将合法正数放进对应位置', `交换后下标 ${target} 已经存放 ${target + 1}，继续检查换入的数。`, `值 ${target + 1} → 下标 ${target}`, { i, target });
        }
      }
      for (let i = 0; i < arr.length; i++) {
        state.pointers = { i }; state.active = [i]; record('scan', '寻找第一个不匹配的位置', `位置 ${i} 应为 ${i + 1}，现在是 ${arr[i]}。`, `${arr[i]} ${arr[i] === i + 1 ? '=' : '≠'} ${i + 1}`, { i });
        if (arr[i] !== i + 1) return done(i + 1);
      }
      return done(arr.length + 1);
    }
    let left = 0, right = arr.length - 1; state.window = [left, right]; state.pointers = { left, right };
    record('init', '用右端值判断最小值在哪半边', '输入必须是互异升序数组的一次旋转；最小值始终留在闭区间内。', `[${left},${right}]`);
    while (left < right) {
      const mid = Math.floor((left + right) / 2); state.active = [mid, right]; state.pointers = { left, mid, right };
      record('compare', '比较中点与右端', arr[mid] > arr[right] ? '中点属于较大段，最小值严格在右侧。' : '中点到右端递增，最小值在中点或左侧。', `${arr[mid]} ${arr[mid] > arr[right] ? '>' : '<'} ${arr[right]}`, { left, mid, right });
      const goRight = arr[mid] > arr[right]; if (goRight) left = mid + 1; else right = mid;
      state.window = [left, right]; state.active = []; state.pointers = { left, right };
      record(goRight ? 'right' : 'left', '缩小最小值所在区间', '保留可能成为最小值的中点，不把它错误排除。', `[${left},${right}]`);
    }
    state.settled = [left]; return done(arr[left]);
  }
  const source = (data as { matrix: number[][] }).matrix; view.kind = 'matrix'; view.rows = source.length; view.cols = source[0]?.length ?? 0;
  state.values = source.flat(); state.elementIds = state.values.map((_, i) => i); view.allowed = state.values.map((_, i) => i);
  const cols = view.cols;
  if (id === 'rotate-image') {
    const n = view.rows; view.phase = '转置'; record('init', '先转置，再逐行反转', '顺时针旋转 90°；格子中的元素身份保持，重复值也分别移动。', `${n} × ${n}`);
    for (let r = 0; r < n; r++) for (let c = r + 1; c < n; c++) {
      swap(r * n + c, c * n + r); record('transpose', '交换主对角线两侧', `(${r},${c}) ↔ (${c},${r})。`, '行列坐标互换');
    }
    view.phase = '逐行反转'; record('phase', '转置完成，开始逐行反转', '把转置后的每一行左右翻转，组合成顺时针旋转。', '转置 + 行反转 = 顺时针 90°');
    for (let r = 0; r < n; r++) for (let c = 0; c < Math.floor(n / 2); c++) {
      swap(r * n + c, r * n + n - 1 - c); record('reverse', '交换一行两端的元素', `第 ${r} 行的列 ${c} 与列 ${n - 1 - c} 交换。`, '逐行左右翻转');
    }
    state.settled = [...view.allowed]; return done(Array.from({ length: n }, (_, r) => state.values.slice(r * n, (r + 1) * n)));
  }
  const { target } = orderingSchemas[id === 'search-a-2d-matrix' ? 'search-a-2d-matrix' : 'search-a-2d-matrix-ii'].parse(input);
  record('init', '利用矩阵有序性排除候选', id === 'search-a-2d-matrix' ? '整张矩阵按行展开严格递增，用一维二分定位格子。' : '每行每列非递减，从右上角开始；大则排除当前列，小则排除当前行。', `target = ${target}`, { target });
  if (id === 'search-a-2d-matrix') {
    let left = 0, right = state.values.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2), value = Number(state.values[mid]); state.active = [mid]; state.pointers = { mid };
      record('compare', '把中点映射回行列', `mid=${mid} 对应 (${Math.floor(mid / cols)},${mid % cols})。`, `${value} 与 ${target}`, { left, right, mid, target });
      if (value === target) { state.settled = [mid]; record('found', '找到目标', '命中的格子属于当前候选区间。', `找到 ${target}`); return done(true); }
      if (value < target) left = mid + 1; else right = mid - 1;
      view.allowed = state.values.flatMap((_, i) => i >= left && i <= right ? [i] : []); state.active = [];
      record(value < target ? 'right' : 'left', '排除一半格子', '候选条保持按行展开的连续下标区间。', `[${left},${right}]`, { left, right, target });
    }
  } else {
    let row = 0, col = cols - 1;
    while (row < view.rows && col >= 0) {
      const node = row * cols + col, value = Number(state.values[node]); state.active = [node]; state.pointers = { current: node };
      record('compare', '比较右上候选格子', '该格子是本候选行的最大值、候选列的最小值。', `${value} 与 ${target}`, { row, col, target });
      if (value === target) { state.settled = [node]; record('found', '找到目标', '不要求不同格子的数值互异。', `找到 ${target}`); return done(true); }
      if (value > target) col--; else row++;
      view.allowed = state.values.flatMap((_, i) => Math.floor(i / cols) >= row && i % cols <= col ? [i] : []); state.active = [];
      record(value > target ? 'left' : 'down', '排除一列或一行', value > target ? '这一列下面的值也太大。' : '这一行左边的值也太小。', `下一候选 (${row},${col})`, { row, col, target });
    }
  }
  return done(false);
}
