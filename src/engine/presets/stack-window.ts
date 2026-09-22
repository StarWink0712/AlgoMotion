import { z } from 'zod';
import { recorder } from '../recorder';
import type { Frame, Scalar, Trace } from '../types';

const integer = z.number().int().min(-10_000).max(10_000);
const heights = z.array(z.number().int().min(0).max(100)).max(24);
const letters = z.string().max(32).regex(/^[a-zA-Z]*$/);
const operation = z.discriminatedUnion('op', [
  z.object({ op: z.literal('push'), value: integer }).strict(),
  z.object({ op: z.literal('pop') }).strict(),
  z.object({ op: z.literal('top') }).strict(),
  z.object({ op: z.literal('getMin') }).strict(),
]);

// Check grammar and expanded size without allocating the expanded string.
export function validEncoding(s: string): boolean {
  const stack: { size: number; count: number }[] = [];
  let size = 0, count = 0, digits = false;
  for (const char of s) {
    if (/^[0-9]$/.test(char)) { count = count * 10 + Number(char); digits = true; if (count > 20) return false; }
    else if (char === '[') {
      if (!digits || count < 1 || stack.length >= 6) return false;
      stack.push({ size, count }); size = 0; count = 0; digits = false;
    } else if (char === ']') {
      if (digits || !stack.length || size === 0) return false;
      const parent = stack.pop()!; size = parent.size + parent.count * size;
    } else {
      if (digits || !/^[a-zA-Z]$/.test(char)) return false;
      size++;
    }
    if (size > 120) return false;
  }
  return !digits && stack.length === 0;
}

export const stackWindowSchemas = {
  'valid-parentheses': z.object({ s: z.string().max(32).regex(/^[()[\]{}]*$/) }).strict(),
  'min-stack': z.object({ operations: z.array(operation).max(24).refine((ops) => {
    let size = 0;
    for (const op of ops) { if (op.op === 'push') size++; else { if (!size) return false; if (op.op === 'pop') size--; } }
    return true;
  }) }).strict(),
  'daily-temperatures': z.object({ temperatures: z.array(z.number().int().min(-100).max(100)).max(24) }).strict(),
  'largest-rectangle-in-histogram': z.object({ heights }).strict(),
  'trapping-rain-water': z.object({ heights }).strict(),
  'sliding-window-maximum': z.object({ nums: z.array(integer).min(1).max(24), k: z.number().int().min(1).max(24) }).strict().refine(({ nums, k }) => k <= nums.length),
  'find-all-anagrams-in-a-string': z.object({ s: letters, p: letters.min(1).max(12) }).strict(),
  'minimum-window-substring': z.object({ s: letters, t: letters.max(12) }).strict(),
  'longest-valid-parentheses': z.object({ s: z.string().max(32).regex(/^[()]*$/) }).strict(),
  'decode-string': z.object({ s: z.string().max(32).refine(validEncoding) }).strict(),
};
export type StackWindowId = keyof typeof stackWindowSchemas;
export interface StackEntry { id: number; value: Scalar; detail?: string }
export interface StackWindowView {
  version: 1;
  structure: 'stack' | 'deque' | 'frequency';
  entries: StackEntry[];
  output: Scalar[];
  outputLabel: string;
  transfer?: { entry: StackEntry; slot: number; direction: 'push' | 'pop' | 'read' };
  relation?: { from: number; to: number; label: string };
  frequencies?: { char: string; need: number; have: number }[];
  water?: number[];
  rectangle?: { left: number; right: number; height: number; area: number };
  bestRectangle?: { left: number; right: number; height: number; area: number };
  bestRange?: [number, number];
  text?: string;
}
export const stackWindowView = (frame: Frame) => frame.variables.view as StackWindowView;

export function runStackWindow(id: StackWindowId, input: unknown): Trace {
  const { state, emit, finish } = recorder(id, input);
  const view: StackWindowView = { version: 1, structure: 'stack', entries: [], output: [], outputLabel: '已得到的结果' };
  state.variables = { view };
  const record = (location: string, action: string, explanation: string, variables: Record<string, unknown> = {}) => {
    state.variables = { view, ...variables }; emit(location, action, explanation);
  };
  const focus = (i: number) => {
    state.pointers = { i }; state.active = i < state.values.length ? [i] : [];
    delete view.transfer; delete view.relation;
  };
  const push = (entry: StackEntry) => {
    delete view.relation;
    view.transfer = { entry: { ...entry }, slot: view.entries.length, direction: 'push' };
    view.entries.push(entry);
  };
  const pop = () => {
    delete view.relation;
    const entry = view.entries.pop()!;
    view.transfer = { entry: { ...entry }, slot: view.entries.length, direction: 'pop' };
    return entry;
  };
  const done = (result: unknown) => {
    state.active = []; state.pointers = {}; delete view.transfer; delete view.relation;
    return finish(result, 'return');
  };

  if (id === 'min-stack') {
    const { operations } = stackWindowSchemas[id].parse(input);
    state.values = operations.map((op) => op.op === 'push' ? op.value < 0 ? String(op.value) : `+${op.value}` : op.op === 'getMin' ? 'min' : op.op);
    view.outputLabel = '各次操作的返回值';
    const minima: number[] = [];
    record('init', '准备最小栈', '每层保存当前值，以及截至这一层的最小值。');
    operations.forEach((op, i) => {
      focus(i);
      if (op.op === 'push') {
        const minimum = Math.min(op.value, minima.at(-1) ?? Infinity); minima.push(minimum);
        push({ id: i, value: op.value, detail: `min ${minimum}` }); view.output.push(null);
        record('push', '压入并记录最小值', `这一层的最小值是 ${minimum}。`, { value: op.value, minimum });
      } else if (op.op === 'pop') {
        const entry = pop(); minima.pop(); view.output.push(null);
        record('pop', '弹出一层', `移除 ${entry.value}，最小值恢复为下一层记录。`, { minimum: minima.at(-1) ?? null });
      } else {
        const entry = view.entries.at(-1)!;
        const result = op.op === 'top' ? entry.value : minima.at(-1)!;
        view.transfer = { entry: { ...entry }, slot: view.entries.length - 1, direction: 'read' }; view.output.push(result);
        record(op.op === 'top' ? 'top' : 'minimum', op.op === 'top' ? '读取栈顶' : '读取最小值', `直接读取栈顶记录，返回 ${result}，不弹出。`, { value: result });
      }
      state.settled.push(i);
    });
    return done(view.output);
  }

  if (id === 'valid-parentheses') {
    const { s } = stackWindowSchemas[id].parse(input); state.values = [...s];
    const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    record('init', '从空栈开始', '遇到左括号入栈，右括号只能匹配最近的左括号。');
    for (let i = 0; i < s.length; i++) {
      focus(i);
      if ('([{'.includes(s[i])) {
        push({ id: i, value: s[i] }); record('push', '左括号入栈', `记住位置 ${i} 的 ${s[i]}。`);
      } else {
        const top = view.entries.at(-1);
        record('check', '检查最近的左括号', top ? `${top.value} 与 ${s[i]} ${top.value === pairs[s[i]] ? '匹配' : '不匹配'}。` : '栈为空，没有左括号可以配对。', { expected: pairs[s[i]], top: top?.value ?? null });
        if (!top || top.value !== pairs[s[i]]) return done(false);
        pop(); view.relation = { from: top.id, to: i, label: '配对' }; state.settled.push(top.id, i);
        record('pop', '配对并出栈', `下标 ${top.id} 和 ${i} 配成一对。`);
      }
    }
    return done(view.entries.length === 0);
  }

  if (id === 'decode-string') {
    const { s } = stackWindowSchemas[id].parse(input); state.values = [...s]; view.text = '';
    const stack: { prefix: string; count: number }[] = [];
    let text = '', count = 0;
    record('init', '准备解码', '遇到左方括号保存外层，遇到右方括号把当前片段重复后接回外层。');
    for (let i = 0; i < s.length; i++) {
      focus(i); const char = s[i];
      if (/^[0-9]$/.test(char)) {
        count = count * 10 + Number(char); record('digit', '累积重复次数', `当前次数为 ${count}。`, { count });
      } else if (char === '[') {
        stack.push({ prefix: text, count }); push({ id: i, value: `×${count}`, detail: text || '空前缀' });
        text = ''; count = 0; view.text = text;
        record('push', '保存外层', '进入新的括号层，重新构造内层片段。');
      } else if (char === ']') {
        const parent = stack.pop()!, segment = text;
        pop(); text = parent.prefix + text.repeat(parent.count); view.text = text;
        record('expand', '展开并接回外层', `「${segment}」重复 ${parent.count} 次，再接到外层前缀之后。`, { repeat: parent.count, length: text.length });
      } else {
        text += char; view.text = text; record('append', '追加字符', `把 ${char} 接到当前片段末尾。`, { length: text.length });
      }
    }
    return done(text);
  }

  if (id === 'longest-valid-parentheses') {
    const { s } = stackWindowSchemas[id].parse(input); state.values = [...s];
    view.entries.push({ id: -1, value: -1, detail: '边界' }); let best = 0;
    record('init', '放入左侧边界', '−1 是字符串开始之前的位置，不是实际字符。');
    for (let i = 0; i < s.length; i++) {
      focus(i); delete state.window;
      if (s[i] === '(') { push({ id: i, value: i, detail: '(' }); record('push', '记录左括号位置', `位置 ${i} 等待右括号。`, { best }); }
      else {
        pop(); record('pop', '处理右括号', '先弹出最近位置，再判断是否还有有效的左边界。', { best });
        if (!view.entries.length) {
          push({ id: i, value: i, detail: '边界' }); delete state.window;
          record('reset', '重设断点', `位置 ${i} 的右括号无法匹配，下一段必须从它后面开始。`, { best });
        } else {
          const boundary = view.entries.at(-1)!.id, length = i - boundary;
          state.window = [boundary + 1, i];
          if (length > best) { best = length; view.bestRange = [boundary + 1, i]; }
          delete view.transfer;
          record('measure', '计算有效段长度', `${i} − (${boundary}) = ${length}，历史最长为 ${best}。`, { length, best });
        }
      }
    }
    delete state.window; return done(best);
  }

  if (id === 'daily-temperatures') {
    const { temperatures } = stackWindowSchemas[id].parse(input); state.values = temperatures;
    view.output = Array(temperatures.length).fill(null); view.outputLabel = '等待天数（空格表示尚未确定）';
    record('init', '等待更暖的一天', '栈保存还没找到更暖日期的下标，温度从底到顶非递增。');
    for (let i = 0; i < temperatures.length; i++) {
      focus(i); record('scan', '读取今天温度', `今天是 ${temperatures[i]} 度。`, { i });
      while (view.entries.length && Number(view.entries.at(-1)!.value) < temperatures[i]) {
        const entry = pop(); view.output[entry.id] = i - entry.id; state.settled.push(entry.id);
        view.relation = { from: entry.id, to: i, label: `+${i - entry.id} 天` };
        record('resolve', '等到了更暖的一天', `${temperatures[i]} > ${entry.value}，位置 ${entry.id} 等待 ${i - entry.id} 天。`, { i, waiting: entry.id, days: i - entry.id });
      }
      delete view.relation; push({ id: i, value: temperatures[i], detail: `下标 ${i}` });
      record('push', '今天也进入等待栈', '相同温度不算更暖，不会弹出。', { i });
    }
    focus(temperatures.length);
    for (const entry of view.entries) { view.output[entry.id] = 0; state.settled.push(entry.id); }
    record('unresolved', '剩余日期没有更暖日', '扫描结束，仍在等待的日期返回 0。');
    return done(view.output);
  }

  if (id === 'largest-rectangle-in-histogram' || id === 'trapping-rain-water') {
    const { heights } = stackWindowSchemas[id].parse(input); state.values = heights;
    const rectangle = id === 'largest-rectangle-in-histogram';
    let best = 0, total = 0; if (!rectangle) view.water = Array(heights.length).fill(0);
    record('init', rectangle ? '准备递增栈' : '准备递减栈', rectangle ? '更矮的柱子到来时，结算栈顶高度能延伸的矩形。' : '更高的右墙到来时，逐层填平栈顶凹槽。');
    for (let i = 0; i < heights.length + (rectangle ? 1 : 0); i++) {
      focus(i); delete state.window; delete view.rectangle;
      const current = i === heights.length ? -1 : heights[i];
      record('scan', i === heights.length ? '到达末尾，清空待结算柱子' : '读取当前柱高', i === heights.length ? '使用虚拟高度 −1，只用于结算，不作为真实柱子。' : `下标 ${i}，高度 ${current}。`, { i, best, total });
      while (view.entries.length && (rectangle ? Number(view.entries.at(-1)!.value) > current : Number(view.entries.at(-1)!.value) < current)) {
        const bottom = pop(), left = view.entries.at(-1)?.id ?? -1;
        if (rectangle) {
          const width = i - left - 1, area = Number(bottom.value) * width;
          view.rectangle = { left: left + 1, right: i - 1, height: Number(bottom.value), area };
          if (area > best) view.bestRectangle = { ...view.rectangle };
          best = Math.max(best, area); state.window = [left + 1, i - 1];
          record('measure', '结算一个矩形', `高度 ${bottom.value} × 宽度 ${width} = ${area}，历史最大 ${best}。`, { height: bottom.value, width, area, best });
        } else if (left >= 0) {
          const depth = Math.min(heights[left], current) - Number(bottom.value), width = i - left - 1;
          for (let j = left + 1; j < i; j++) view.water![j] += depth;
          total += depth * width; state.window = [left, i]; view.relation = { from: left, to: i, label: `+${depth * width}` };
          record('fill', '填入一层雨水', `两墙较低高度 ${Math.min(heights[left], current)} − 槽底 ${bottom.value} = ${depth}；宽 ${width}，新增 ${depth * width}。`, { depth, width, added: depth * width, total });
        } else {
          delete state.window;
          record('unbounded', '左侧没有墙', '只有右墙无法蓄水，弹出后继续寻找。', { total });
        }
      }
      if (i < heights.length) {
        delete view.relation; push({ id: i, value: current, detail: `下标 ${i}` });
        record('push', '当前柱子入栈', rectangle ? '等待更低的右边界再结算。' : '保留它作为后续凹槽或左墙。', { i, best, total });
      }
    }
    delete state.window;
    if (view.bestRectangle) view.rectangle = { ...view.bestRectangle }; else delete view.rectangle;
    return done(rectangle ? best : total);
  }

  if (id === 'sliding-window-maximum') {
    const { nums, k } = stackWindowSchemas[id].parse(input); state.values = nums; view.structure = 'deque';
    view.outputLabel = '各完整窗口的最大值'; record('init', '准备单调队列', '队首最大；只保留仍在窗口内、且不会被较新大值淘汰的位置。', { k });
    for (let i = 0; i < nums.length; i++) {
      focus(i); state.window = [Math.max(0, i - k + 1), i];
      record('scan', '窗口向右扩展', `加入下标 ${i}，完整窗口宽度为 ${k}。`, { i, k });
      if (view.entries.length && view.entries[0].id <= i - k) {
        const entry = view.entries.shift()!; view.transfer = { entry, slot: 0, direction: 'pop' };
        record('expire', '队首离开窗口', `下标 ${entry.id} 已过期。`, { i, k });
      }
      while (view.entries.length && Number(view.entries.at(-1)!.value) <= nums[i]) {
        const entry = pop(); view.relation = { from: entry.id, to: i, label: '淘汰' };
        record('discard', '淘汰队尾候选', `${nums[i]} ≥ ${entry.value}，新值更晚过期，旧值不再可能获胜。`, { i, k });
      }
      delete view.relation; push({ id: i, value: nums[i], detail: `下标 ${i}` }); record('push', '加入队尾', '队列从左到右严格递减。', { i, k });
      if (i >= k - 1) {
        delete view.transfer; view.output.push(view.entries[0].value);
        record('collect', '读取窗口最大值', `窗口 [${i - k + 1}, ${i}] 的最大值为 ${view.entries[0].value}。`, { i, k, maximum: view.entries[0].value });
      }
    }
    return done(view.output);
  }

  const anagrams = id === 'find-all-anagrams-in-a-string';
  const parsed = anagrams ? stackWindowSchemas['find-all-anagrams-in-a-string'].parse(input) : stackWindowSchemas['minimum-window-substring'].parse(input);
  const s = parsed.s, target = 'p' in parsed ? parsed.p : parsed.t;
  state.values = [...s]; view.structure = 'frequency'; view.outputLabel = '已找到的起始下标';
  const need = new Map<string, number>(), have = new Map<string, number>();
  for (const char of target) need.set(char, (need.get(char) ?? 0) + 1);
  let left = 0, missing = target.length, bestStart = 0, bestLength = Infinity;
  const sync = (right: number) => {
    state.window = [left, right]; state.pointers = { left, right };
    view.frequencies = [...need].map(([char, count]) => ({ char, need: count, have: have.get(char) ?? 0 }));
  };
  sync(-1); record('init', '记录目标频次', '重复字符按出现次数计数，大小写不同。', { target, missing });
  if (!target.length) { view.text = ''; return done(''); }
  for (let right = 0; right < s.length; right++) {
    focus(right); const char = s[right];
    if ((have.get(char) ?? 0) < (need.get(char) ?? 0)) missing--;
    have.set(char, (have.get(char) ?? 0) + 1); sync(right);
    record('expand', '右端字符进入窗口', `加入 ${char}，还缺 ${missing} 个目标字符。`, { left, right, missing });
    const shrink = () => {
      const removed = s[left]; have.set(removed, have.get(removed)! - 1);
      if (have.get(removed)! < (need.get(removed) ?? 0)) missing++;
      left++; sync(right);
      record('shrink', '左端字符离开窗口', `移除 ${removed}，还缺 ${missing} 个目标字符。`, { left, right, missing });
    };
    if (anagrams) {
      if (right - left + 1 > target.length) shrink();
      if (right - left + 1 === target.length && missing === 0) {
        view.output.push(left); record('collect', '频次完全相同', `窗口 [${left}, ${right}] 是目标的一个异位词。`, { left, right, missing });
      }
    } else {
      while (missing === 0) {
        if (right - left + 1 < bestLength) {
          bestStart = left; bestLength = right - left + 1; view.bestRange = [left, right]; view.text = s.slice(left, right + 1);
          record('best', '找到更短的覆盖', `当前最短为「${view.text}」，长度 ${bestLength}。`, { left, right, missing, bestLength });
        }
        shrink();
      }
    }
  }
  return done(anagrams ? view.output : Number.isFinite(bestLength) ? s.slice(bestStart, bestStart + bestLength) : '');
}
