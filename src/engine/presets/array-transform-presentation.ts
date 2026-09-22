import type { Frame, ProblemId } from '../types';
import type { TeachingCue } from '../presentation';

export function describeArrayTransformFrame(id: ProblemId, frame: Frame): TeachingCue | undefined {
  const v = frame.variables, done = frame.result !== undefined;
  const base: TeachingCue = { label: frame.action, equation: '', detail: frame.explanation, tone: 'consider', animateElements: true };
  if (id === '3sum') {
    const cue = { ...base, rangeLabel: '双指针搜索范围', sceneLabel: '固定一个数，让两端靠拢' };
    if (done) return { ...cue, equation: `共 ${v.count} 组不重复答案`, tone: 'success' };
    if (frame.location === 'sum' || frame.location === 'collect') return { ...cue, equation: `${v.a} + (${v.b}) + (${v.c}) = ${v.sum}`, tone: v.sum === 0 ? 'success' : 'consider' };
    if (frame.location === 'anchor' || frame.location === 'skip-anchor') return { ...cue, equation: `固定 nums[${v.i}] = ${v.anchor}` };
    return { ...cue, equation: v.left === undefined ? `${frame.values.length} 个元素` : `left = ${v.left} · right = ${v.right}` };
  }
  if (id === 'sort-colors') {
    const low = Number(v.low), mid = Number(v.mid), high = Number(v.high);
    return { ...base, rangeLabel: '待处理', sceneLabel: '0 向左，2 向右，1 留在中间',
      equation: done ? '0、1、2 分区完成' : `low ${low} · mid ${mid} · high ${high}`,
      tone: done ? 'success' : 'consider',
      bands: [
        { start: 0, end: low - 1, label: '0 区', tone: 'zero' },
        { start: low, end: mid - 1, label: '1 区', tone: 'one' },
        { start: high + 1, end: frame.values.length - 1, label: '2 区', tone: 'two' },
      ].filter((band) => band.start <= band.end) as NonNullable<TeachingCue['bands']>,
    };
  }
  if (id === 'rotate-array') {
    const cue = { ...base, sceneLabel: '三次反转，把末尾移到开头', rangeLabel: typeof v.phase === 'string' ? v.phase : '反转范围' };
    if (done) return { ...cue, equation: frame.values.length ? `向右轮转 ${v.shift} 位` : '空数组保持不变', tone: 'success' };
    if (frame.location === 'normalize') return { ...cue, equation: `${v.k} mod ${frame.values.length} = ${v.shift}` };
    return { ...cue, equation: frame.location === 'swap' ? `[${v.from}] ↔ [${v.to}]` : String(v.phase) };
  }
  if (id === 'next-permutation') {
    const cue = { ...base, sceneLabel: '最小幅度增大，再整理后缀', rangeLabel: '后缀' };
    if (done) return { ...cue, equation: v.wrapped ? '回到最小排列' : frame.values.length < 2 ? '排列保持不变' : '得到下一个排列', tone: 'success' };
    if (frame.location === 'compare-pivot' || frame.location === 'compare-next') {
      const to = frame.pointers.next!, from = frame.pointers.pivot!, allowed = Number(v.a) < Number(v.b);
      return { ...cue, equation: `${v.a} ${allowed ? '<' : '≥'} ${v.b}`, relation: { from: [from], to, allowed, labels: [allowed ? '可增大' : '继续找'] }, tone: allowed ? 'consider' : 'blocked' };
    }
    if (frame.location === 'swap-pivot') return { ...cue, equation: `${v.a} ↔ ${v.b}`, tone: 'success' };
    return { ...cue, equation: frame.location === 'swap' ? `[${v.from}] ↔ [${v.to}]` : typeof v.phase === 'string' ? v.phase : `pivot = ${v.pivot}` };
  }
  if (id === 'merge-intervals') {
    if (done) return { ...base, equation: `合并为 ${v.count} 段`, tone: 'success' };
    if (frame.location === 'merge') return { ...base, equation: `右端 = max(${v.before}, ${v.end}) = ${v.mergedEnd}`, tone: 'success' };
    if (frame.location === 'inspect' || frame.location === 'append') return { ...base, equation: v.previousEnd === null ? `[${v.start}, ${v.end}]` : `${v.start} ${Number(v.start) <= Number(v.previousEnd) ? '≤' : '>'} ${v.previousEnd}` };
    return { ...base, equation: `${frame.values.length} 个闭区间` };
  }
}
