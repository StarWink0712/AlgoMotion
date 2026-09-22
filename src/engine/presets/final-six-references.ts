import { reference } from '../reference';
import type { CodeLanguage, ReferenceCode } from '../types';
import type { FinalSixId } from './final-six';
function refs(java: string, go: string, python: string): Record<CodeLanguage, ReferenceCode> {
  return { java: reference(`class Solution {\n${java}\n}`), go: reference(`package main\n\n${go}`), python: reference(`class Solution:\n${python}`) };
}
export const finalSixReferences: Record<FinalSixId, Record<CodeLanguage, ReferenceCode>> = {
  'longest-palindromic-substring': refs(
`    public String longestPalindrome(String s) {
        int bestStart = 0, bestLength = 0; // @trace init
        for (int center = 0; center < 2*s.length()-1; center++) {
            int left = center/2, right = left+center%2; // @trace center
            while (left >= 0 && right < s.length()) {
                if (s.charAt(left) != s.charAt(right)) break; // @trace mismatch
                int length = right-left+1; // @trace expand
                if (length > bestLength || (length == bestLength && left < bestStart)) {
                    bestStart = left; bestLength = length; // @trace best
                }
                left--; right++;
            }
        }
        return s.substring(bestStart,bestStart+bestLength); // @trace return
    }`,
`func longestPalindrome(s string) string {
    bestStart, bestLength := 0, 0 // @trace init
    for center := 0; center < 2*len(s)-1; center++ {
        left := center/2; right := left+center%2 // @trace center
        for left >= 0 && right < len(s) {
            if s[left] != s[right] { break } // @trace mismatch
            length := right-left+1 // @trace expand
            if length > bestLength || (length == bestLength && left < bestStart) {
                bestStart, bestLength = left, length // @trace best
            }
            left--; right++
        }
    }
    return s[bestStart:bestStart+bestLength] // @trace return
}`,
`    def longestPalindrome(self, s: str) -> str:
        best_start = best_length = 0 # @trace init
        for center in range(2*len(s)-1):
            left = center//2; right = left+center%2 # @trace center
            while left >= 0 and right < len(s):
                if s[left] != s[right]: break # @trace mismatch
                length = right-left+1 # @trace expand
                if length > best_length or (length == best_length and left < best_start):
                    best_start, best_length = left, length # @trace best
                left -= 1; right += 1
        return s[best_start:best_start+best_length] # @trace return`),
  'longest-common-subsequence': refs(
`    public int longestCommonSubsequence(String text1, String text2) {
        int m = text1.length(), n = text2.length(); int[][] dp = new int[m+1][n+1]; // @trace init
        for (int i = 0; i <= m; i++) dp[i][0] = 0; // @trace base-row
        for (int j = 1; j <= n; j++) dp[0][j] = 0; // @trace base-column
        for (int i = 1; i <= m; i++) for (int j = 1; j <= n; j++) {
            if (text1.charAt(i-1) == text2.charAt(j-1)) dp[i][j] = dp[i-1][j-1]+1; // @trace match
            else dp[i][j] = Math.max(dp[i-1][j],dp[i][j-1]); // @trace different
        }
        int i = m, j = n; String sequence = ""; // @trace reconstruct
        while (i > 0 && j > 0) { // @trace backtrack
            if (text1.charAt(i-1) == text2.charAt(j-1)) { sequence = text1.charAt(--i)+sequence; j--; }
            else if (dp[i-1][j] >= dp[i][j-1]) i--;
            else j--;
        }
        return dp[m][n]; // @trace return
    }`,
`func longestCommonSubsequence(text1 string, text2 string) int {
    m, n := len(text1), len(text2); dp := make([][]int,m+1)
    for i := range dp { dp[i] = make([]int,n+1) } // @trace init
    for i := 0; i <= m; i++ { dp[i][0] = 0 } // @trace base-row
    for j := 1; j <= n; j++ { dp[0][j] = 0 } // @trace base-column
    for i := 1; i <= m; i++ { for j := 1; j <= n; j++ {
        if text1[i-1] == text2[j-1] { dp[i][j] = dp[i-1][j-1]+1 // @trace match
        } else { dp[i][j] = dp[i-1][j]; if dp[i][j-1] > dp[i][j] { dp[i][j] = dp[i][j-1] } } // @trace different
    } }
    i, j, sequence := m, n, "" // @trace reconstruct
    for i > 0 && j > 0 { // @trace backtrack
        if text1[i-1] == text2[j-1] { i--; j--; sequence = text1[i:i+1]+sequence
        } else if dp[i-1][j] >= dp[i][j-1] { i-- } else { j-- }
    }
    return dp[m][n] // @trace return
}`,
`    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        m, n = len(text1), len(text2)
        dp = [[0]*(n+1) for _ in range(m+1)] # @trace init
        for i in range(m+1): dp[i][0] = 0 # @trace base-row
        for j in range(1,n+1): dp[0][j] = 0 # @trace base-column
        for i in range(1,m+1):
            for j in range(1,n+1):
                if text1[i-1] == text2[j-1]: dp[i][j] = dp[i-1][j-1]+1 # @trace match
                else: dp[i][j] = max(dp[i-1][j],dp[i][j-1]) # @trace different
        i, j, sequence = m, n, "" # @trace reconstruct
        while i and j: # @trace backtrack
            if text1[i-1] == text2[j-1]:
                i -= 1; j -= 1; sequence = text1[i]+sequence
            elif dp[i-1][j] >= dp[i][j-1]: i -= 1
            else: j -= 1
        return dp[m][n] # @trace return`),
  'edit-distance': refs(
`    public int minDistance(String word1, String word2) {
        int m = word1.length(), n = word2.length(); int[][] dp = new int[m+1][n+1]; // @trace init
        for (int i = 0; i <= m; i++) dp[i][0] = i; // @trace base-row
        for (int j = 1; j <= n; j++) dp[0][j] = j; // @trace base-column
        for (int i = 1; i <= m; i++) for (int j = 1; j <= n; j++) {
            if (word1.charAt(i-1) == word2.charAt(j-1)) dp[i][j] = dp[i-1][j-1]; // @trace match
            else dp[i][j] = 1+Math.min(dp[i-1][j-1],Math.min(dp[i-1][j],dp[i][j-1])); // @trace different
        }
        int i = m, j = n; java.util.List<String> alignment = new java.util.ArrayList<>(); // @trace reconstruct
        while (i > 0 || j > 0) { // @trace backtrack
            if (i > 0 && j > 0 && word1.charAt(i-1) == word2.charAt(j-1)) { i--; j--; alignment.add(0,"keep"); }
            else if (i > 0 && j > 0 && dp[i][j] == dp[i-1][j-1]+1) { i--; j--; alignment.add(0,"replace"); }
            else if (i > 0 && dp[i][j] == dp[i-1][j]+1) { i--; alignment.add(0,"delete"); }
            else { j--; alignment.add(0,"insert"); }
        }
        return dp[m][n]; // @trace return
    }`,
`func minDistance(word1 string, word2 string) int {
    m, n := len(word1), len(word2); dp := make([][]int,m+1)
    for i := range dp { dp[i] = make([]int,n+1) } // @trace init
    for i := 0; i <= m; i++ { dp[i][0] = i } // @trace base-row
    for j := 1; j <= n; j++ { dp[0][j] = j } // @trace base-column
    for i := 1; i <= m; i++ { for j := 1; j <= n; j++ {
        if word1[i-1] == word2[j-1] { dp[i][j] = dp[i-1][j-1] // @trace match
        } else { best := dp[i-1][j-1]; if dp[i-1][j] < best { best = dp[i-1][j] }; if dp[i][j-1] < best { best = dp[i][j-1] }; dp[i][j] = best+1 } // @trace different
    } }
    i, j := m, n; alignment := []string{} // @trace reconstruct
    for i > 0 || j > 0 { // @trace backtrack
        operation := ""
        if i > 0 && j > 0 && word1[i-1] == word2[j-1] { i--; j--; operation = "keep"
        } else if i > 0 && j > 0 && dp[i][j] == dp[i-1][j-1]+1 { i--; j--; operation = "replace"
        } else if i > 0 && dp[i][j] == dp[i-1][j]+1 { i--; operation = "delete"
        } else { j--; operation = "insert" }
        alignment = append([]string{operation},alignment...)
    }
    return dp[m][n] // @trace return
}`,
`    def minDistance(self, word1: str, word2: str) -> int:
        m, n = len(word1), len(word2)
        dp = [[0]*(n+1) for _ in range(m+1)] # @trace init
        for i in range(m+1): dp[i][0] = i # @trace base-row
        for j in range(1,n+1): dp[0][j] = j # @trace base-column
        for i in range(1,m+1):
            for j in range(1,n+1):
                if word1[i-1] == word2[j-1]: dp[i][j] = dp[i-1][j-1] # @trace match
                else: dp[i][j] = 1+min(dp[i-1][j-1],dp[i-1][j],dp[i][j-1]) # @trace different
        i, j, alignment = m, n, [] # @trace reconstruct
        while i or j: # @trace backtrack
            if i and j and word1[i-1] == word2[j-1]:
                i -= 1; j -= 1; operation = 'keep'
            elif i and j and dp[i][j] == dp[i-1][j-1]+1:
                i -= 1; j -= 1; operation = 'replace'
            elif i and dp[i][j] == dp[i-1][j]+1:
                i -= 1; operation = 'delete'
            else:
                j -= 1; operation = 'insert'
            alignment.insert(0,operation)
        return dp[m][n] # @trace return`),
  'single-number': refs(
`    public int singleNumber(int[] nums) {
        int acc = 0; // @trace init
        for (int x : nums) acc ^= x; // @trace xor
        return acc; // @trace return
    }`,
`func singleNumber(nums []int) int {
    acc := 0 // @trace init
    for _,x := range nums { acc ^= x } // @trace xor
    return acc // @trace return
}`,
`    def singleNumber(self, nums: list[int]) -> int:
        acc = 0 # @trace init
        for x in nums: acc ^= x # @trace xor
        return acc # @trace return`),
  'majority-element': refs(
`    public int majorityElement(int[] nums) {
        int candidate = 0, count = 0; // @trace init
        for (int x : nums) {
            if (count == 0) candidate = x; // @trace candidate
            if (x == candidate) count++; // @trace vote
            else count--; // @trace cancel
        }
        int answer = candidate; // @trace guarantee
        return answer; // @trace return
    }`,
`func majorityElement(nums []int) int {
    candidate, count := 0, 0 // @trace init
    for _,x := range nums {
        if count == 0 { candidate = x } // @trace candidate
        if x == candidate { count++ // @trace vote
        } else { count-- } // @trace cancel
    }
    answer := candidate // @trace guarantee
    return answer // @trace return
}`,
`    def majorityElement(self, nums: list[int]) -> int:
        candidate = count = 0 # @trace init
        for x in nums:
            if count == 0: candidate = x # @trace candidate
            if x == candidate: count += 1 # @trace vote
            else: count -= 1 # @trace cancel
        answer = candidate # @trace guarantee
        return answer # @trace return`),
  'find-the-duplicate-number': refs(
`    public int findDuplicate(int[] nums) {
        int slow = 0, fast = 0; // @trace init
        do {
            slow = nums[slow]; fast = nums[nums[fast]]; // @trace advance
        } while (slow != fast); // @trace meet
        int finder = 0; // @trace reset
        while (finder != slow) {
            finder = nums[finder]; slow = nums[slow]; // @trace entrance
        }
        int duplicate = slow; // @trace found
        return duplicate; // @trace return
    }`,
`func findDuplicate(nums []int) int {
    slow, fast := 0, 0 // @trace init
    for {
        slow = nums[slow]; fast = nums[nums[fast]] // @trace advance
        if slow == fast { break } // @trace meet
    }
    finder := 0 // @trace reset
    for finder != slow {
        finder = nums[finder]; slow = nums[slow] // @trace entrance
    }
    duplicate := slow // @trace found
    return duplicate // @trace return
}`,
`    def findDuplicate(self, nums: list[int]) -> int:
        slow = fast = 0 # @trace init
        while True:
            slow = nums[slow]; fast = nums[nums[fast]] # @trace advance
            if slow == fast: break # @trace meet
        finder = 0 # @trace reset
        while finder != slow:
            finder = nums[finder]; slow = nums[slow] # @trace entrance
        duplicate = slow # @trace found
        return duplicate # @trace return`),
};
