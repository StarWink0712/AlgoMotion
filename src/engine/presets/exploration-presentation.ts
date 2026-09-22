import type { Frame, ProblemId } from '../types';
import type { TeachingCue } from '../presentation';
import { explorationSchemas, explorationView } from './exploration';

export function describeExplorationFrame(id: ProblemId, frame: Frame): TeachingCue | undefined {
  if (!(id in explorationSchemas)) return;
  const view = explorationView(frame);
  return {
    label: frame.action, detail: frame.explanation,
    equation: frame.result !== undefined ? Array.isArray(frame.result) ? `返回 ${frame.result.length} ${id === 'spiral-matrix' ? '个元素' : id === 'set-matrix-zeroes' ? '行矩阵' : '组结果'}` : `返回 ${JSON.stringify(frame.result)}` : view.equation,
    tone: frame.result === false || frame.result === -1 || frame.location === 'blocked' || frame.location === 'impossible' || frame.variables.valid === false ? 'blocked' : frame.result !== undefined || frame.location === 'save' || frame.location === 'found' ? 'success' : 'consider',
  };
}
