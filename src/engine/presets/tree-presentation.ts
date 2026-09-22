import type { Frame, ProblemId } from '../types';
import type { TeachingCue } from '../presentation';
import { treeSchemas, treeView } from './trees';

export function describeTreeFrame(id: ProblemId, frame: Frame): TeachingCue | undefined {
  if (!(id in treeSchemas)) return;
  const view = treeView(frame), v = frame.variables;
  const cue: TeachingCue = { label: frame.action, detail: frame.explanation, equation: '', tone: 'consider' };
  if (frame.result !== undefined) return { ...cue, equation: `返回 ${JSON.stringify(frame.result)}`, tone: frame.result === false ? 'blocked' : 'success' };
  if (frame.location === 'checked' || frame.location === 'return-pair') return { ...cue, equation: `子树检查 → ${v.valid}`, tone: v.valid ? 'success' : 'blocked' };
  if (frame.location === 'height') return { ...cue, equation: `max(${v.left}, ${v.right}) + 1 = ${v.height}`, tone: 'success' };
  if (frame.location === 'diameter') return { ...cue, equation: `${v.left} + ${v.right} = ${v.candidate} 条边 · 最大 ${v.best}` };
  if (view.bounds) return { ...cue, equation: `${view.bounds.low ?? '−∞'} < ${frame.values[view.bounds.node]} < ${view.bounds.high ?? '+∞'}`, tone: frame.location === 'reject' ? 'blocked' : 'consider' };
  if (view.pair) return { ...cue, equation: view.pair.map((node) => node === null ? '∅' : `#${node} (${frame.values[node]})`).join(' ↔ '), tone: frame.location === 'mismatch' ? 'blocked' : 'consider' };
  if (frame.location === 'visit') return { ...cue, equation: `第 ${v.rank} 个 → ${v.value}`, tone: 'success' };
  if (frame.location === 'create') return { ...cue, equation: `mid = ${v.mid} · 值 ${view.source![Number(v.mid)]}` };
  if (view.range) return { ...cue, equation: `构造区间 [${view.range[0]}, ${view.range[1]}]` };
  if (frame.location === 'visible') return { ...cue, equation: `第 ${v.level} 层 → ${v.value}`, tone: 'success' };
  if (view.changed.length) return { ...cue, equation: view.changed.map((edge) => `#${edge.from}.${edge.side} → #${edge.to}`).join(' · '), tone: 'success' };
  if (view.returning) return { ...cue, equation: `#${view.returning.from} 返回 ${view.returning.value}` };
  return { ...cue, equation: frame.queue ? `队列 ${frame.queue.length} 个节点` : view.flat ? `已展开 ${view.output.length} 个节点` : `待处理 ${view.stack.length} 层 / 项` };
}
