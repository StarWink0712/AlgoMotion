import type { CodeLanguage, ProblemId } from '../src/engine/types';
export const orderingStructuresMethods = {
  'first-missing-positive': 'firstMissingPositive', 'rotate-image': 'rotate', 'search-a-2d-matrix': 'searchMatrix', 'search-a-2d-matrix-ii': 'searchMatrix',
  'find-minimum-in-rotated-sorted-array': 'findMin', 'median-of-two-sorted-arrays': 'findMedianSortedArrays',
  'implement-trie-prefix-tree': 'runOperations', 'kth-largest-element-in-an-array': 'findKthLargest', 'top-k-frequent-elements': 'topKFrequent', 'find-median-from-data-stream': 'runOperations',
} as const;
type Literal = (value: unknown, language: CodeLanguage, nullable?: boolean, strings?: boolean, matrix?: boolean) => string;
export function orderingStructuresInvocation(id: ProblemId, input: unknown, language: CodeLanguage, literal: Literal): string | undefined {
  if (!(id in orderingStructuresMethods)) return;
  const data = input as Record<string, unknown>, val = (value: unknown) => literal(value, language), mat = (value: unknown) => literal(value, language, false, false, true);
  if (id === 'rotate-image') return `checkedRotation(${mat(data.matrix)})`;
  if (id === 'first-missing-positive') return `checkedMissing(${val(data.nums)})`;
  const prefix = language === 'java' ? 'new Solution().' : language === 'python' ? 'Solution().' : '';
  let args: string[];
  if (id === 'implement-trie-prefix-tree') {
    const ops = data.operations as { op: string; word: string }[];
    args = [literal(ops.map((o) => o.op), language, false, true), literal(ops.map((o) => o.word), language, false, true)];
  } else if (id === 'find-median-from-data-stream') {
    const ops = data.operations as { op: string; value?: number }[];
    args = [val(ops.map((o) => o.op === 'addNum' ? 0 : 1)), val(ops.map((o) => o.value ?? 0))];
  } else if (id === 'search-a-2d-matrix' || id === 'search-a-2d-matrix-ii') args = [mat(data.matrix), val(data.target)];
  else if (id === 'median-of-two-sorted-arrays') args = [val(data.a), val(data.b)];
  else args = [val(data.nums), ...(id === 'find-minimum-in-rotated-sorted-array' ? [] : [val(data.k)])];
  return `${prefix}${orderingStructuresMethods[id as keyof typeof orderingStructuresMethods]}(${args.join(', ')})`;
}
export function orderingStructuresHelpers(id: keyof typeof orderingStructuresMethods, language: CodeLanguage): string {
  if (id === 'rotate-image') {
    if (language === 'java') return `static Object checkedRotation(int[][] matrix) {
      int[][] rows=matrix.clone(); int[][] result=new Solution().rotate(matrix);
      if (result!=matrix) throw new AssertionError("Replaced matrix");
      for (int i=0;i<rows.length;i++) if (rows[i]!=result[i]) throw new AssertionError("Replaced row");
      return result;
    }`;
    if (language === 'go') return `func checkedRotation(matrix [][]int) [][]int {
      rows:=[]*int{}; for _,row:=range matrix { if len(row)>0 { rows=append(rows,&row[0]) } }
      result:=rotate(matrix)
      if len(result)!=len(matrix) { panic("Changed matrix shape") }
      for i,p:=range rows { if &result[i][0]!=p { panic("Replaced row") } }
      return result
    }`;
    return `def checkedRotation(matrix):
    rows=matrix.copy()
    result=Solution().rotate(matrix)
    assert result is matrix and len(result)==len(rows) and all(a is b for a,b in zip(rows,result))
    return result`;
  }
  if (id === 'first-missing-positive') {
    if (language === 'java') return `static int checkedMissing(int[] nums) {
      int[] before=nums.clone(); int result=new Solution().firstMissingPositive(nums); int[] after=nums.clone();
      java.util.Arrays.sort(before); java.util.Arrays.sort(after);
      if (!java.util.Arrays.equals(before,after)) throw new AssertionError("Values lost or invented");
      return result;
    }`;
    if (language === 'go') return `func checkedMissing(nums []int) int {
      counts:=map[int]int{}; for _,v:=range nums { counts[v]++ }
      result:=firstMissingPositive(nums)
      for _,v:=range nums { counts[v]-- }; for _,n:=range counts { if n!=0 { panic("Values lost or invented") } }
      return result
    }`;
    return `def checkedMissing(nums):
    before=sorted(nums)
    result=Solution().firstMissingPositive(nums)
    assert sorted(nums)==before, 'Values lost or invented'
    return result`;
  }
  return '';
}
