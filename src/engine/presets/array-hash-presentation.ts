import type { Frame, ProblemId } from '../types';
import type { TeachingCue } from '../presentation';
import { arrayHashView } from './array-hash';

export function describeArrayHashFrame(id: ProblemId, frame: Frame): TeachingCue | undefined {
  const v = frame.variables, done = frame.result !== undefined;
  const base: TeachingCue = { label: frame.action, equation: '', detail: frame.explanation, tone: 'consider' };
  if (id === 'group-anagrams') {
    const groups = arrayHashView(frame).groups ?? [];
    return { ...base, label: done ? '分组完成' : frame.action, equation: done || frame.location === 'init' ? `${groups.length} 个分组` : `「${v.word}」 → 「${v.signature}」`, tone: done || frame.location === 'assign' ? 'success' : 'consider' };
  }
  if (id === 'longest-consecutive-sequence') {
    const common = { ...base, sceneLabel: '去重集合：只从没有前驱的数字开始' };
    if (done) return { ...common, label: '找到最长连续链', equation: `最长长度 = ${frame.result}`, tone: 'success' };
    if (frame.location === 'check-start' || frame.location === 'skip') return { ...common, equation: `${v.predecessor} ${v.hasPredecessor ? '∈' : '∉'} 集合`, tone: v.hasPredecessor ? 'blocked' : 'consider' };
    if (frame.location === 'extend') return { ...common, equation: `${Number(v.current) - 1} + 1 = ${v.current} · 长度 ${v.length}`, relation: { from: [frame.pointers.from!], to: frame.pointers.i!, allowed: true, labels: ['+1'] }, tone: 'success' };
    return { ...common, equation: frame.location === 'init' ? `${frame.values.length} 个不同的数字` : `当前长度 ${v.length} · 最长 ${v.best}` };
  }
  if (id === 'product-of-array-except-self') {
    if (done) return { ...base, equation: `${frame.values.length} 个位置计算完成`, tone: 'success' };
    if (frame.location === 'combine') return { ...base, equation: `${v.left} × ${v.right} = ${v.product}`, tone: 'success' };
    if (frame.location === 'extend-left' || frame.location === 'extend-right') return { ...base, equation: `${v.before} × ${v.value} = ${frame.location === 'extend-left' ? v.left : v.right}` };
    return { ...base, equation: frame.location === 'write-left' ? `左侧乘积[${v.i}] = ${v.left}` : frame.location === 'right-init' ? '右侧空乘积 = 1' : '左侧空乘积 = 1' };
  }
  if (id === 'subarray-sum-equals-k') {
    if (done) return { ...base, equation: `共 ${frame.result} 个非空子数组`, tone: 'success' };
    if (frame.location === 'init') return { ...base, equation: '空前缀和 0 → 1 次' };
    if (frame.location === 'prefix') return { ...base, equation: `P[${Number(v.i) + 1}] = ${v.prefix}` };
    return { ...base, equation: `${v.prefix} − (${v.need}) = ${v.k} · 匹配 ${v.hits} 次`, tone: Number(v.hits) > 0 ? 'success' : 'consider' };
  }
}
