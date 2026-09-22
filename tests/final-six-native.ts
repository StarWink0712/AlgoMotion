import type { CodeLanguage, ProblemId } from '../src/engine/types';
export const finalSixMethods = {
  'longest-palindromic-substring': 'longestPalindrome', 'longest-common-subsequence': 'longestCommonSubsequence', 'edit-distance': 'minDistance',
  'single-number': 'singleNumber', 'majority-element': 'majorityElement', 'find-the-duplicate-number': 'findDuplicate',
} as const;
type Literal = (value: unknown, language: CodeLanguage) => string;
export function finalSixInvocation(id: ProblemId, input: unknown, language: CodeLanguage, literal: Literal): string | undefined {
  if (!(id in finalSixMethods)) return;
  const data = input as Record<string, unknown>, val = (value: unknown) => literal(value, language);
  if (id === 'find-the-duplicate-number') return `checkedDuplicate(${val(data.nums)})`;
  const args = id === 'longest-common-subsequence' ? [data.text1,data.text2] : id === 'edit-distance' ? [data.word1,data.word2] : id === 'longest-palindromic-substring' ? [data.s] : [data.nums];
  const prefix = language === 'java' ? 'new Solution().' : language === 'python' ? 'Solution().' : '';
  return `${prefix}${finalSixMethods[id as keyof typeof finalSixMethods]}(${args.map(val).join(', ')})`;
}
export const duplicateHelpers = {
  java: `static int checkedDuplicate(int[] nums) { int[] before=nums.clone(); int value=new Solution().findDuplicate(nums); if (!java.util.Arrays.equals(nums,before)) throw new AssertionError("Input changed"); return value; }`,
  go: `func checkedDuplicate(nums []int) int { before:=append([]int{},nums...); value:=findDuplicate(nums); for i,x:=range before { if nums[i]!=x { panic("Input changed") } }; return value }`,
  python: `def checkedDuplicate(nums):
    before=nums.copy()
    value=Solution().findDuplicate(nums)
    assert nums==before, 'Input changed'
    return value`,
};
