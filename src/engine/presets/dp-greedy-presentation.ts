import type { Frame, ProblemId } from '../types';
import type { TeachingCue } from '../presentation';
import { dpGreedySchemas, dpGreedyView } from './dp-greedy';

export function describeDPGreedy(id: ProblemId, frame: Frame): TeachingCue | undefined {
  if (!(id in dpGreedySchemas)) return;
  return {
    label: frame.action, detail: frame.explanation,
    equation: frame.result !== undefined ? `返回 ${JSON.stringify(frame.result)}` : dpGreedyView(frame).equation,
    tone: frame.result === false || (id === 'jump-game-ii' && frame.result === -1) || frame.location === 'blocked' || frame.location === 'odd' ? 'blocked' : frame.result !== undefined ? 'success' : 'consider',
  };
}
