import type { CodeLanguage, ProblemId } from '../src/engine/types';

export const explorationNativeMethods = {
  'letter-combinations-of-a-phone-number': 'letterCombinations', 'generate-parentheses': 'generateParenthesis',
  'palindrome-partitioning': 'partition', 'word-search': 'exist', 'n-queens': 'solveNQueens',
  'number-of-islands': 'numIslands', 'rotting-oranges': 'orangesRotting', 'course-schedule': 'canFinish',
  'spiral-matrix': 'spiralOrder', 'set-matrix-zeroes': 'setZeroes',
} as const;
type Literal = (value: unknown, language: CodeLanguage, nullable?: boolean, strings?: boolean, matrix?: boolean) => string;
export function explorationInvocation(id: ProblemId, input: unknown, language: CodeLanguage, literal: Literal): string | undefined {
  if (!(id in explorationNativeMethods)) return;
  const data = input as Record<string, unknown>, scalar = (value: unknown) => literal(value, language), matrix = (value: unknown) => literal(value, language, false, false, true);
  if (id === 'word-search') return `checkedWord(${literal((data.board as string[][]).map((r) => r.join('')), language, false, true)}, ${scalar(data.word)})`;
  if (id === 'set-matrix-zeroes') return `checkedZeroes(${matrix(data.matrix)})`;
  const prefix = language === 'java' ? 'new Solution().' : language === 'python' ? 'Solution().' : '';
  const args = id === 'number-of-islands' || id === 'rotting-oranges' ? [matrix(data.grid)] : id === 'spiral-matrix' ? [matrix(data.matrix)] : id === 'course-schedule' ? [scalar(data.numCourses), matrix(data.prerequisites)] : Object.values(data).map(scalar);
  return `${prefix}${explorationNativeMethods[id as keyof typeof explorationNativeMethods]}(${args.join(', ')})`;
}
export function explorationNativeHelpers(id: keyof typeof explorationNativeMethods, language: CodeLanguage): string {
  if (id === 'word-search') {
    if (language === 'java') return `
  static boolean checkedWord(String[] rows, String word) {
    char[][] board = new char[rows.length][];
    for (int i = 0; i < rows.length; i++) board[i] = rows[i].toCharArray();
    boolean result = new Solution().exist(board, word);
    for (int i = 0; i < rows.length; i++) if (!rows[i].equals(new String(board[i]))) throw new AssertionError("Word search mutated board");
    return result;
  }
`;
    if (language === 'go') return `
func checkedWord(rows []string, word string) bool {
    board := make([][]byte,len(rows)); for i,row := range rows { board[i] = []byte(row) }
    result := exist(board,word)
    for i,row := range rows { if string(board[i]) != row { panic("Word search mutated board") } }
    return result
}
`;
    return `
def checkedWord(rows, word):
    board = [list(row) for row in rows]
    result = Solution().exist(board, word)
    assert [''.join(row) for row in board] == rows, 'Word search mutated board'
    return result
`;
  }
  if (id === 'set-matrix-zeroes') {
    if (language === 'java') return `
  static Object checkedZeroes(int[][] matrix) {
    int[][] rows = matrix.clone(); int[][] result = new Solution().setZeroes(matrix);
    if (result != matrix) throw new AssertionError("Not an in-place matrix result");
    for (int i = 0; i < rows.length; i++) if (result[i] != rows[i]) throw new AssertionError("Replaced row identity");
    return result;
  }
`;
    if (language === 'go') return `
func checkedZeroes(matrix [][]int) [][]int {
    first := []*int{}; for _,row := range matrix { if len(row) > 0 { first = append(first,&row[0]) } }
    result := setZeroes(matrix)
    if len(result) != len(matrix) { panic("Changed matrix shape") }
    for i,p := range first { if &result[i][0] != p { panic("Replaced row identity") } }
    return result
}
`;
    return `
def checkedZeroes(matrix):
    rows = matrix.copy()
    result = Solution().setZeroes(matrix)
    assert result is matrix and all(a is b for a,b in zip(rows,result)), 'Not in-place'
    return result
`;
  }
  return '';
}
