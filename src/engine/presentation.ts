import type { Frame, ProblemId, Scalar } from './types';
import { describeArrayHashFrame } from './presets/array-hash-presentation';
import { describeArrayTransformFrame } from './presets/array-transform-presentation';
import { describeStackWindowFrame } from './presets/stack-window-presentation';
import { describeLinkedListFrame } from './presets/linked-list-presentation';
import { describeTreeFrame } from './presets/tree-presentation';
import { describeAdvancedFrame } from './presets/advanced-presentation';
import { describeExplorationFrame } from './presets/exploration-presentation';
import { describeOrderingStructures } from './presets/ordering-structures-presentation';
import { describeDPGreedy } from './presets/dp-greedy-presentation';
import { describeFinalSix } from './presets/final-six-presentation';

export interface TeachingCue {
  label: string;
  equation: string;
  detail: string;
  tone: 'neutral' | 'consider' | 'success' | 'blocked';
  rangeLabel?: string;
  outside?: number[];
  sceneLabel?: string;
  animateElements?: boolean;
  bands?: { start: number; end: number; label: string; tone: 'zero' | 'one' | 'two' }[];
  relation?: { from: number[]; to: number; allowed: boolean; labels: string[] };
}

export const shown = (value: unknown): string => value === undefined ? '—' : value === null ? 'null' : Array.isArray(value) ? `[${value.join(', ')}]` : String(value);
const at = (values: Scalar[] | undefined, i: number) => values?.[i] ?? '∞';

// Teaching annotations are derived from snapshots, never from model-generated narration.
export function describeFrame(id: ProblemId, frame: Frame, previous?: Frame): TeachingCue {
  const finalCue = describeFinalSix(id, frame);
  if (finalCue) return finalCue;
  const orderingCue = describeOrderingStructures(id, frame);
  const dpGreedyCue = describeDPGreedy(id, frame);
  if (dpGreedyCue) return dpGreedyCue;
  if (orderingCue) return orderingCue;
  const explorationCue = describeExplorationFrame(id, frame);
  if (explorationCue) return explorationCue;
  const advancedCue = describeAdvancedFrame(id, frame);
  if (advancedCue) return advancedCue;
  const treeCue = describeTreeFrame(id, frame);
  if (treeCue) return treeCue;
  const linkedListCue = describeLinkedListFrame(id, frame);
  if (linkedListCue) return linkedListCue;
  const stackWindowCue = describeStackWindowFrame(id, frame);
  if (stackWindowCue) return stackWindowCue;
  const arrayTransformCue = describeArrayTransformFrame(id, frame);
  if (arrayTransformCue) return arrayTransformCue;
  const arrayHashCue = describeArrayHashFrame(id, frame);
  if (arrayHashCue) return arrayHashCue;
  const v = frame.variables;
  const done = frame.result !== undefined;
  const base: TeachingCue = { label: frame.action, equation: '', detail: '', tone: 'neutral' };
  if (['search-insert-position', 'find-first-and-last-position-of-element-in-sorted-array', 'search-in-rotated-sorted-array'].includes(id)) {
    const rotated = id === 'search-in-rotated-sorted-array';
    const [left, end] = frame.window ?? [0, -1];
    const outside = frame.values.flatMap((_, i) => i < left || i > end ? [i] : []);
    if (done) return { label: id === 'search-insert-position' ? '插入位置确定' : frame.settled.length ? '找到目标' : '目标不存在', equation: `返回 ${shown(frame.result)}`, detail: id === 'search-insert-position' ? `下标 ${frame.result} 是首个不小于 ${v.target} 的位置；等于数组长度时表示插到末尾。` : frame.explanation, tone: 'success', rangeLabel: '目标区间' };
    const cue: TeachingCue = { ...base, rangeLabel: '待查元素', outside, equation: `${rotated ? '闭区间' : v.phase ?? '边界'} [${v.left ?? left}, ${v.right ?? end}${rotated ? ']' : ')'}`, detail: frame.explanation, tone: 'consider' };
    if (frame.location === 'compare') cue.equation = `${v.value} ${rotated ? '=' : v.discardLeft ? v.phase === '首个 > target' ? '≤' : '<' : v.phase === '首个 > target' ? '>' : '≥'} ${rotated ? '? ' : ''}${v.target}`;
    if (frame.location === 'choose-half') cue.equation = `${v.sortedHalf}有序 [${v.low}, ${v.high}] → 保留${v.keepLeft ? '左' : '右'}侧`;
    if (frame.location === 'boundary' || frame.location === 'check-first') cue.equation = `边界位置 = ${v.position}`;
    return cue;
  }
  if (id === 'best-time-to-buy-and-sell-stock') {
    const pair = frame.bestPath ?? [];
    if (done) return { label: pair.length ? '最佳买卖配对' : '不交易也可以', equation: `最大利润 = ${frame.result}`, detail: pair.length ? `第 ${pair[0]} 天买入，第 ${pair[1]} 天卖出。` : '没有先买后卖的正收益机会。', tone: 'success', rangeLabel: '最佳持有区间', ...(pair.length ? { relation: { from: [pair[0]], to: pair[1], allowed: true, labels: [`+${frame.result}`] } } : {}) };
    if (frame.location === 'profit' || frame.location === 'best') return { label: frame.action, equation: `${v.price} − ${v.minimum} = ${v.profit}`, detail: `当前买入日 ${v.buy}，卖出日 ${v.day}；已找到的最佳利润为 ${v.best}。`, tone: Number(v.profit) > 0 ? 'consider' : 'blocked', rangeLabel: '这次持有区间', relation: { from: [Number(v.buy)], to: Number(v.day), allowed: Number(v.profit) > 0, labels: [String(v.profit)] } };
    return { ...base, equation: `最低买入价 = ${v.minimum}`, detail: frame.explanation, rangeLabel: '新的买入起点' };
  }
  if (id === 'jump-game') {
    const cue: TeachingCue = { ...base, rangeLabel: '已知可达范围', detail: frame.explanation, equation: `最远可达 ${v.farthest} · 终点 ${v.goal}`, tone: 'consider' };
    if (done) return { ...cue, label: frame.result ? '终点已在可达范围内' : '遇到无法跨越的断点', equation: frame.result ? '可以到达终点' : `位置 ${v.i} > 可达边界 ${v.farthest}`, tone: frame.result ? 'success' : 'blocked' };
    if (frame.location === 'check' && Number(v.i) > Number(v.farthest)) return { ...cue, tone: 'blocked' };
    if (frame.location === 'extend') {
      const from = Number(v.i), to = Math.min(Number(v.candidate), frame.values.length - 1);
      return { ...cue, equation: `max(${v.before}, ${v.i} + ${v.jump}) = ${v.farthest}`, ...(to > from ? { relation: { from: [from], to, allowed: true, labels: [`最多 ${v.jump}`] } } : {}) };
    }
    return cue;
  }
  if (id === 'longest-increasing-subsequence') {
    if (done) return { label: '找到一条最长递增链', equation: `最长长度 = ${shown(frame.result)}`, detail: '沿着选中的节点读一遍：值严格变大，下标也始终向右。', tone: 'success' };
    const i = Number(v.i), j = Number(v.j);
    if (frame.location === 'compare' || frame.location === 'transition') {
      const allowed = Number(frame.values[j]) < Number(frame.values[i]);
      const candidate = Number(frame.dp![j]) + 1;
      const before = previous?.dp?.[i] ?? frame.dp![i];
      return {
        label: frame.location === 'transition' ? (Number(frame.dp![i]) > Number(before) ? '接上它，长度增加' : '能接上，但没有更长') : allowed ? '这个前驱可以接' : '这个前驱不能接',
        equation: frame.location === 'transition' ? `dp[${i}] = max(${before}, ${frame.dp![j]} + 1) = ${frame.dp![i]}` : `${frame.values[j]} ${allowed ? '<' : '≥'} ${frame.values[i]}`,
        detail: allowed ? `从下标 ${j} 的长度 ${frame.dp![j]} 出发，再接上当前数，候选长度为 ${candidate}。` : '递增要求严格变大；这个连接不合法，不更新 dp。',
        tone: allowed ? frame.location === 'transition' ? 'success' : 'consider' : 'blocked',
        relation: { from: [j], to: i, allowed, labels: [allowed ? '+1' : '不递增'] },
      };
    }
    return { ...base, label: frame.location === 'init' ? '每个数，都能自己成一条链' : '这一站的最长链已确定', equation: frame.location === 'init' ? '一个数 = 长度 1' : `dp[${i}] = ${frame.dp![i]}`, detail: '每个积木代表长度 1；尝试把左边较小的数接到当前数之前。' };
  }
  if (done && id !== 'container-with-most-water') return { label: '执行完成', equation: `返回 ${shown(frame.result)}`, detail: id === 'reverse-linked-list' ? '节点的值没有变，改变的是 next 指向。沿绿色箭头从新头节点开始读。' : '可以回退一步，检查答案是怎样得到的。', tone: 'success' };
  if (id === 'climbing-stairs') {
    const i = Number(v.i);
    if (frame.location === 'transition') return { label: '两条来路，汇到这一阶', equation: `${frame.dp![i - 2]} + ${frame.dp![i - 1]} = ${frame.dp![i]} 种`, detail: `从第 ${i - 2} 阶跨两步，或从第 ${i - 1} 阶跨一步。`, tone: 'success', relation: { from: [i - 2, i - 1], to: i, allowed: true, labels: ['跨 2 阶', '跨 1 阶'] } };
    return { ...base, equation: '第 0 阶 → 1 种空走法', detail: '台阶上方的数字，是到达这里的走法数，不是台阶高度。' };
  }
  if (id === 'coin-change') {
    const a = Number(v.a), coin = Number(v.coin);
    if (frame.location === 'try-coin' || frame.location === 'transition') {
      if (coin > a) return { label: '这枚硬币太大', equation: `${coin} > ${a}`, detail: '硬币面额超过当前金额，直接跳过。', tone: 'blocked' };
      const from = a - coin, reachable = typeof at(frame.dp, from) === 'number';
      const before = previous?.dp?.[a] ?? at(frame.dp, a);
      return { label: reachable ? '再放进一枚硬币' : '前面的金额还凑不出', equation: frame.location === 'transition' ? `dp[${a}] = min(${before}, ${at(frame.dp, from)} + 1) = ${at(frame.dp, a)}` : `${from} 元 + ${coin} 元 = ${a} 元`, detail: reachable ? `借用金额 ${from} 的最优解，再增加一枚面额 ${coin} 的硬币。` : '∞ 表示不可达；从不可达状态出发，仍然无法组成当前金额。', tone: reachable ? 'success' : 'blocked', relation: { from: [from], to: a, allowed: reachable, labels: [`+ ${coin} 元`] } };
    }
    return { ...base, equation: frame.location === 'amount' ? `现在凑 ${a} 元` : '0 元 → 0 枚', detail: '上排是金额，下排是最少硬币数；箭头表示借用了哪个较小金额的解。' };
  }
  if (id === 'container-with-most-water') {
    const [left, right] = done ? frame.bestPath! : [frame.pointers.left!, frame.pointers.right!];
    const height = Math.min(Number(frame.values[left]), Number(frame.values[right]));
    return { label: done ? '回看面积最大的容器' : '水位由短边决定', equation: `${height} × ${right - left} = ${height * (right - left)}`, detail: done ? `最佳边界为下标 ${left} 与 ${right}，图中重现这一对边界。` : '蓝色是能装下的水；移动较短的一边，寻找更高的水位。', tone: done ? 'success' : 'consider' };
  }
  if (id === 'two-sum') {
    const i = frame.pointers.i;
    if (i === undefined || i === null) return { ...base, equation: `? + ? = ${v.target}`, detail: '先看当前数字，再去 seen 中找它缺少的另一半。' };
    const need = Number(v.target) - Number(frame.values[i]);
    const hit = frame.table?.find(([key]) => key === String(need));
    return { label: frame.location === 'record' ? '把见过的数存起来' : frame.location === 'lookup' ? hit ? '找到另一半了' : '还没见过另一半' : '当前数，需要谁来配对？', equation: `${frame.values[i]} + ${need} = ${v.target}`, detail: frame.location === 'record' ? `seen 记录 ${frame.values[i]} → 下标 ${i}，后面遇到它的搭档就能直接找到。` : hit ? `seen 中存在 ${need}，它在下标 ${hit[1]}。` : `去 seen 中查找 ${need}；查找发生在记录当前数字之前。`, tone: hit && frame.location === 'lookup' ? 'success' : 'consider' };
  }
  if (id === 'move-zeroes') return { label: frame.location === 'swap' ? '非零元素，换到前面' : '读指针找数，写指针留位', equation: frame.location === 'swap' ? `交换 [${v.read}] ↔ [${v.write}]` : `read = ${shown(frame.pointers.read)} · write = ${shown(frame.pointers.write)}`, detail: '相同的数也有独立身份。移动的是元素本身，不是把两个格子的文字直接替换掉。', tone: frame.location === 'swap' ? 'success' : 'neutral' };
  if (id === 'longest-substring-without-repeating-characters') {
    const [left, right] = frame.window ?? [0, -1];
    const chars = frame.values.slice(left, right + 1);
    const valid = new Set(chars).size === chars.length;
    return { label: !valid ? '窗口里出现重复字符' : frame.location === 'shrink' ? '左边界前移，排除重复' : '让无重复窗口尽量变长', equation: right < left ? '从空窗口出发' : `窗口 [${left}, ${right}] · 长度 ${right - left + 1}`, detail: !valid ? '红色边界提醒：这是刚扩张后的临时状态，接下来收缩窗口。' : `当前窗口「${chars.join('')}」；历史最长为 ${shown(v.best)}。`, tone: valid ? 'consider' : 'blocked' };
  }
  if (id === 'maximum-subarray') {
    const i = frame.pointers.i ?? 0;
    const before = previous?.variables.ending;
    return { label: frame.location === 'extend' ? '继续这一段，还是重新开始？' : '绿色框是当前连续子数组', equation: frame.location === 'extend' ? `max(${frame.values[i]}, ${before} + ${frame.values[i]}) = ${v.ending}` : `当前和 ${v.ending} · 最好 ${v.best}`, detail: '连续区间不能跳过元素。当前候选与历史最好是两个不同的状态。', tone: 'consider' };
  }
  if (id === 'reverse-linked-list') return { ...base, label: frame.location === 'rewire' ? '断开旧箭头，接向前一个节点' : frame.action, equation: frame.location === 'rewire' ? `curr.next → ${frame.pointers.prev === null ? 'null' : `#${frame.pointers.prev}`}` : `prev ${shown(frame.pointers.prev)} · curr ${shown(frame.pointers.curr)}`, detail: '虚线是刚断开的连接，绿色箭头是新连接；next 提前保存尚未处理的后半段。', tone: frame.location === 'rewire' ? 'success' : 'neutral' };
  return { ...base, equation: frame.location === 'dequeue' ? `节点 ${shown(frame.values[frame.active[0]])} 出队` : `队列中还有 ${frame.queue?.length ?? 0} 个节点`, detail: '下方队列从左侧取出、右侧加入。节点按进入队列的顺序依次访问。', tone: frame.location.startsWith('enqueue') ? 'success' : 'neutral' };
}
