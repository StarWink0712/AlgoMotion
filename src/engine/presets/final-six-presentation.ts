import type { Frame, ProblemId } from '../types';
import type { TeachingCue } from '../presentation';
import { finalSixSchemas, essentialView } from './final-six';
import { dpGreedyView } from './dp-greedy';

export function describeFinalSix(id: ProblemId, frame: Frame): TeachingCue | undefined {
  if (!(id in finalSixSchemas)) return;
  const done = frame.result !== undefined, dp = id === 'longest-common-subsequence' || id === 'edit-distance', functional = id === 'find-the-duplicate-number';
  const view = !dp && !functional ? essentialView(frame) : null;
  const cue: TeachingCue = { label: frame.action, detail: frame.explanation, equation: done ? `返回 ${JSON.stringify(frame.result)}` : dp ? dpGreedyView(frame).equation : functional ? String(frame.variables.equation) : view!.equation, tone: done ? 'success' : frame.location === 'mismatch' ? 'blocked' : 'consider' };
  if (view) {
    cue.sceneLabel = view.kind === 'palindrome' ? '中心向两端扩展，保留最长连续区间' : view.kind === 'xor' ? '逐位异或，成对数字抵消' : '异值票数抵消，严格多数保留';
    cue.rangeLabel = done ? '最终最长回文' : '当前中心检查区间'; cue.animateElements = true;
    if (view.pair.length === 2 && view.pair[0] !== view.pair[1]) cue.relation = { from: [view.pair[0]], to: view.pair[1], allowed: frame.location !== 'mismatch', labels: [view.kind === 'palindrome' ? frame.location === 'mismatch' ? '不同' : '相同' : '抵消'] };
  }
  return cue;
}
