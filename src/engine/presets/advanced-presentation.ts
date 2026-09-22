import type { Frame, ProblemId } from '../types';
import type { TeachingCue } from '../presentation';
import { advancedTreeSchemas } from './advanced-trees';
import { mergeListSchemas } from './merge-lists';
import { searchCacheSchemas, searchView, cacheView } from './search-cache';
import { treeView } from './trees';
import { linkedListView } from './linked-lists';

export function describeAdvancedFrame(id: ProblemId, frame: Frame): TeachingCue | undefined {
  if (!(id in advancedTreeSchemas || id in mergeListSchemas || id in searchCacheSchemas)) return;
  const cue: TeachingCue = { label: frame.action, detail: frame.explanation, equation: '', tone: 'consider' };
  if (frame.result !== undefined) return { ...cue, equation: Array.isArray(frame.result) && id in searchCacheSchemas && id !== 'lru-cache' ? `共 ${frame.result.length} 组答案` : `返回 ${JSON.stringify(frame.result)}`, tone: 'success' };
  const v = frame.variables;
  if (id in advancedTreeSchemas) {
    const view = treeView(frame);
    if (frame.location === 'candidate') return { ...cue, equation: `${v.left} + (${v.value}) + ${v.right} = ${v.candidate} · 最佳 ${v.best}` };
    if (frame.location === 'gain') return { ...cue, equation: `单侧贡献 ↑ ${v.gain}`, tone: 'success' };
    if (frame.location === 'lookup') return { ...cue, equation: `${v.sum} − ${v.targetSum} = ${v.need} · 命中 ${v.found} 条 · 累计 ${v.total}` };
    if (frame.location === 'combine') return { ...cue, equation: `左 ${v.left === null ? '∅' : `#${v.left}`} / 右 ${v.right === null ? '∅' : `#${v.right}`} → ${v.ancestor === null ? '∅' : `#${v.ancestor}`}` };
    if (view.changed.length) return { ...cue, equation: view.changed.map((e) => `#${e.from}.${e.side} → #${e.to}`).join(' · '), tone: 'success' };
    if (view.returning) return { ...cue, equation: `#${view.returning.from} 返回 ${view.returning.value}` };
    return { ...cue, equation: view.range ? `中序区间 [${view.range.join(', ')}]` : `递归栈 ${view.stack.length} 层` };
  }
  if (id in mergeListSchemas) {
    const view = linkedListView(frame);
    return { ...cue, equation: frame.location === 'compare' ? `${frame.values[frame.pointers.a!]} ≤ ${frame.values[frame.pointers.b!]} ?` : view.changed.length ? view.changed.map(([a, b]) => `#${a}.next → #${b}`).join(' · ') : `当前子链已选 ${view.output.length} 个节点`, tone: frame.location === 'split' ? 'neutral' : 'consider' };
  }
  if (id === 'lru-cache') {
    const view = cacheView(frame);
    return { ...cue, equation: view.removed ? `淘汰 key ${view.removed.key} · 保留 ${view.order.length}/${view.capacity}` : `MRU → [${view.entries.map((e) => e.key).join(', ')}] → LRU`, tone: frame.location === 'miss' ? 'blocked' : 'consider' };
  }
  const view = searchView(frame);
  return { ...cue, equation: `路径 [${view.path.map((c) => frame.values[c.source]).join(', ')}]${view.remaining === null ? '' : ` · 剩余 ${view.remaining}`} · 已收集 ${view.answers.length}`, tone: frame.location === 'prune' ? 'blocked' : frame.location === 'save' ? 'success' : 'consider' };
}
