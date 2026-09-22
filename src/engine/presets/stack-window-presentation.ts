import type { Frame, ProblemId } from '../types';
import type { TeachingCue } from '../presentation';
import { stackWindowSchemas, stackWindowView } from './stack-window';

export function describeStackWindowFrame(id: ProblemId, frame: Frame): TeachingCue | undefined {
  if (!(id in stackWindowSchemas)) return;
  const view = stackWindowView(frame), v = frame.variables;
  const base: TeachingCue = { label: frame.action, equation: '', detail: frame.explanation, tone: 'consider' };
  if (frame.result !== undefined) return { ...base, equation: `返回 ${JSON.stringify(frame.result)}`, tone: frame.result === false ? 'blocked' : 'success' };
  if (id === 'valid-parentheses') return { ...base, equation: frame.location === 'check' ? `栈顶 ${v.top ?? '空'} · 需要 ${v.expected}` : `待匹配 ${view.entries.length} 个左括号`, tone: frame.location === 'check' && v.top !== v.expected ? 'blocked' : frame.location === 'pop' ? 'success' : 'consider' };
  if (id === 'min-stack') return { ...base, equation: frame.location === 'top' || frame.location === 'minimum' ? `读取 ${v.value}` : `栈内 ${view.entries.length} 层 · 最小值 ${view.entries.at(-1)?.detail?.replace('min ', '') ?? '空'}` };
  if (id === 'daily-temperatures') return { ...base, equation: frame.location === 'resolve' ? `等待 ${v.i} − ${v.waiting} = ${v.days} 天` : `还有 ${view.entries.length} 天${frame.location === 'unresolved' ? '没有更暖日' : '等待更暖日'}`, tone: frame.location === 'resolve' ? 'success' : 'consider' };
  if (id === 'largest-rectangle-in-histogram') return { ...base, equation: frame.location === 'measure' ? `${v.height} × ${v.width} = ${v.area} · 最好 ${v.best}` : `非递减栈 · ${view.entries.length} 根待结算` };
  if (id === 'trapping-rain-water') return { ...base, equation: frame.location === 'fill' ? `新增 ${v.depth} × ${v.width} = ${v.added} · 总量 ${v.total}` : `已结算水量 ${v.total ?? 0}`, tone: frame.location === 'unbounded' ? 'blocked' : frame.location === 'fill' ? 'success' : 'consider' };
  if (id === 'sliding-window-maximum') return { ...base, equation: frame.location === 'collect' ? `窗口最大值 = ${v.maximum}` : `k = ${v.k} · 队首 ${view.entries[0]?.value ?? '空'}`, tone: frame.location === 'collect' ? 'success' : 'consider' };
  if (id === 'find-all-anagrams-in-a-string' || id === 'minimum-window-substring') return { ...base, equation: `还缺 ${v.missing} 个字符${view.bestRange ? ` · 最短 ${view.bestRange[1] - view.bestRange[0] + 1}` : ''}`, tone: frame.location === 'collect' || frame.location === 'best' ? 'success' : 'consider' };
  if (id === 'longest-valid-parentheses') return { ...base, equation: frame.location === 'measure' ? `当前长度 ${v.length} · 最长 ${v.best}` : `栈顶位置 ${view.entries.at(-1)?.id ?? '空'} · 最长 ${v.best ?? 0}`, tone: frame.location === 'reset' ? 'blocked' : 'consider' };
  return { ...base, equation: frame.location === 'digit' ? `重复次数 ${v.count}` : `当前片段长度 ${view.text?.length ?? 0} · 外层 ${view.entries.length} 层`, tone: frame.location === 'expand' ? 'success' : 'consider' };
}
