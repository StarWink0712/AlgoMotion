import type { CodeLanguage, ProblemId } from '../src/engine/types';
export const dpGreedyMethods = {
  'jump-game-ii': 'jump', 'partition-labels': 'partitionLabels', 'pascals-triangle': 'generate', 'house-robber': 'rob', 'perfect-squares': 'numSquares',
  'word-break': 'wordBreak', 'maximum-product-subarray': 'maxProduct', 'partition-equal-subset-sum': 'canPartition', 'unique-paths': 'uniquePaths', 'minimum-path-sum': 'minPathSum',
} as const;
type Literal = (value: unknown, language: CodeLanguage, nullable?: boolean, strings?: boolean, matrix?: boolean) => string;
export function dpGreedyInvocation(id: ProblemId, input: unknown, language: CodeLanguage, literal: Literal): string | undefined {
  if (!(id in dpGreedyMethods)) return;
  const data = input as Record<string, unknown>, val = (v: unknown) => literal(v, language);
  const args = id === 'word-break' ? [val(data.s), literal(data.wordDict, language, false, true)]
    : id === 'minimum-path-sum' ? [literal(data.grid, language, false, false, true)]
    : id === 'unique-paths' ? [val(data.m), val(data.n)]
    : id === 'partition-labels' ? [val(data.s)]
    : id === 'pascals-triangle' ? [val(data.numRows)]
    : id === 'perfect-squares' ? [val(data.n)] : [val(data.nums)];
  const prefix = language === 'java' ? 'new Solution().' : language === 'python' ? 'Solution().' : '';
  return `${prefix}${dpGreedyMethods[id as keyof typeof dpGreedyMethods]}(${args.join(', ')})`;
}
