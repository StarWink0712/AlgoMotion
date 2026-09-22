import type { Frame, ProblemId } from '../types';
import type { TeachingCue } from '../presentation';
import { orderingSchemas, orderingView } from './ordering';
import { structuresSchemas, structuresView } from './structures';

export function describeOrderingStructures(id: ProblemId, frame: Frame): TeachingCue | undefined {
  if (!(id in orderingSchemas || id in structuresSchemas)) return;
  const view = id in orderingSchemas ? orderingView(frame) : structuresView(frame);
  const equation = frame.result !== undefined ? `返回 ${JSON.stringify(frame.result)}` : view.equation;
  return {
    label: frame.action, detail: frame.explanation, equation,
    tone: frame.result === false || frame.location === 'missing' ? 'blocked' : frame.result !== undefined || frame.location === 'median' ? 'success' : 'consider',
    ...(id === 'first-missing-positive' ? { animateElements: true, sceneLabel: '值 x 归位到下标 x−1' } : {}),
    ...(id === 'find-minimum-in-rotated-sorted-array' ? { rangeLabel: '最小值候选区间', sceneLabel: '中点与右端比较，保留最小值' } : {}),
  };
}
