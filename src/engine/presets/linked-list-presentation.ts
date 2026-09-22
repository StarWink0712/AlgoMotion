import type { Frame, ProblemId } from '../types';
import type { TeachingCue } from '../presentation';
import { linkedListSchemas, linkedListView } from './linked-lists';

const at = (id: number | null | undefined) => id === null || id === undefined ? 'null' : `#${id}`;
export function describeLinkedListFrame(id: ProblemId, frame: Frame): TeachingCue | undefined {
  if (!(id in linkedListSchemas)) return;
  const view = linkedListView(frame), v = frame.variables;
  const base: TeachingCue = { label: frame.action, detail: frame.explanation, equation: '', tone: 'consider' };
  if (frame.result !== undefined) return { ...base, equation: `返回 ${JSON.stringify(frame.result)}`, tone: frame.result === false || frame.result === null ? 'neutral' : 'success' };
  if (id === 'add-two-numbers' && frame.location === 'sum') return { ...base, equation: `${v.x} + ${v.y} + ${v.before} = ${v.sum} → 本位 ${v.digit} · 进位 ${v.carry}` };
  if (id === 'merge-two-sorted-lists' && frame.location === 'compare') return { ...base, equation: `${v.a} ${Number(v.a) <= Number(v.b) ? '≤' : '>'} ${v.b}` };
  if (id === 'palindrome-linked-list' && frame.location === 'compare') return { ...base, equation: `${frame.values[frame.pointers.p!]} ${v.equal ? '=' : '≠'} ${frame.values[frame.pointers.q!]}`, tone: v.equal ? 'success' : 'blocked' };
  if (id === 'copy-list-with-random-pointer') return { ...base, equation: frame.location === 'init' ? '先复制身份，再连接 next / random' : `${at(frame.pointers.original)} → ${at(frame.pointers.copy)} · 已分配 ${view.copies.length} 个新节点` };
  if (frame.location === 'probe' || frame.location === 'group') return { ...base, equation: `k = ${v.k}${v.checked === undefined ? '' : ` · 已探测 ${v.checked}`}` };
  if (view.changed.length || view.retired.length) return { ...base, equation: view.changed.length ? view.changed.map(([a, b]) => `${at(a)}.next → ${at(b)}`).join(' · ') : `${at(view.retired[0][0])}.next → null`, tone: 'success' };
  return { ...base, equation: Object.entries(frame.pointers).map(([name, node]) => `${name} ${at(node)}`).join(' · ') || `已确定 ${view.output.length} 个节点` };
}
