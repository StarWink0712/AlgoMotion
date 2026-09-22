import { reference } from '../reference';
import type { CodeLanguage, ReferenceCode } from '../types';
import type { DPGreedyId } from './dp-greedy';

function refs(java: string, go: string, python: string): Record<CodeLanguage, ReferenceCode> {
  return { java: reference(`class Solution {\n${java}\n}`), go: reference(`package main\n\n${go}`), python: reference(`class Solution:\n${python}`) };
}
export const dpGreedyReferences: Record<DPGreedyId, Record<CodeLanguage, ReferenceCode>> = {
  'jump-game-ii': refs(
`    public int jump(int[] nums) {
        int end = 0, farthest = 0, jumps = 0; // @trace init
        for (int i = 0; i < nums.length - 1; i++) {
            farthest = Math.max(farthest, i + nums[i]); // @trace extend
            if (i == end) {
                if (farthest == end) return -1; // @trace blocked
                jumps++; end = Math.min(farthest, nums.length - 1); // @trace jump
                if (end == nums.length - 1) break;
            }
        }
        return jumps; // @trace return
    }`,
`func jump(nums []int) int {
    end, farthest, jumps := 0, 0, 0 // @trace init
    for i := 0; i < len(nums)-1; i++ {
        if i+nums[i] > farthest { farthest = i+nums[i] } // @trace extend
        if i == end {
            if farthest == end { return -1 } // @trace blocked
            jumps++; end = farthest; if end >= len(nums) { end = len(nums)-1 } // @trace jump
            if end == len(nums)-1 { break }
        }
    }
    return jumps // @trace return
}`,
`    def jump(self, nums: list[int]) -> int:
        end = farthest = jumps = 0 # @trace init
        for i in range(len(nums)-1):
            farthest = max(farthest, i+nums[i]) # @trace extend
            if i == end:
                if farthest == end: return -1 # @trace blocked
                jumps += 1; end = min(farthest, len(nums)-1) # @trace jump
                if end == len(nums)-1: break
        return jumps # @trace return`),
  'partition-labels': refs(
`    public java.util.List<Integer> partitionLabels(String s) {
        int[] last = new int[26]; // @trace init
        for (int i = 0; i < s.length(); i++) last[s.charAt(i)-'a'] = i; // @trace last
        int start = 0, end = 0;
        java.util.List<Integer> result = new java.util.ArrayList<>();
        for (int i = 0; i < s.length(); i++) {
            end = Math.max(end, last[s.charAt(i)-'a']); // @trace extend
            if (i == end) { result.add(end-start+1); start = i+1; } // @trace cut
        }
        return result; // @trace return
    }`,
`func partitionLabels(s string) []int {
    last := [26]int{} // @trace init
    for i := 0; i < len(s); i++ { last[s[i]-'a'] = i } // @trace last
    start, end := 0, 0
    result := []int{}
    for i := 0; i < len(s); i++ {
        if last[s[i]-'a'] > end { end = last[s[i]-'a'] } // @trace extend
        if i == end { result = append(result, end-start+1); start = i+1 } // @trace cut
    }
    return result // @trace return
}`,
`    def partitionLabels(self, s: str) -> list[int]:
        last = {} # @trace init
        for i, ch in enumerate(s): last[ch] = i # @trace last
        start = end = 0
        result = []
        for i, ch in enumerate(s):
            end = max(end, last[ch]) # @trace extend
            if i == end: # @trace cut
                result.append(end-start+1)
                start = i+1
        return result # @trace return`),
  'pascals-triangle': refs(
`    public java.util.List<java.util.List<Integer>> generate(int numRows) {
        java.util.List<java.util.List<Integer>> rows = new java.util.ArrayList<>(); // @trace init
        for (int r = 0; r < numRows; r++) {
            java.util.List<Integer> row = new java.util.ArrayList<>();
            for (int c = 0; c <= r; c++) {
                if (c == 0 || c == r) row.add(1); // @trace edge
                else row.add(rows.get(r-1).get(c-1) + rows.get(r-1).get(c)); // @trace sum
            }
            rows.add(row);
        }
        return rows; // @trace return
    }`,
`func generate(numRows int) [][]int {
    rows := [][]int{} // @trace init
    for r := 0; r < numRows; r++ {
        row := make([]int, r+1)
        for c := 0; c <= r; c++ {
            if c == 0 || c == r { row[c] = 1 // @trace edge
            } else { row[c] = rows[r-1][c-1]+rows[r-1][c] } // @trace sum
        }
        rows = append(rows, row)
    }
    return rows // @trace return
}`,
`    def generate(self, numRows: int) -> list[list[int]]:
        rows = [] # @trace init
        for r in range(numRows):
            row = []
            for c in range(r+1):
                if c == 0 or c == r: row.append(1) # @trace edge
                else: row.append(rows[r-1][c-1]+rows[r-1][c]) # @trace sum
            rows.append(row)
        return rows # @trace return`),
  'house-robber': refs(
`    public int rob(int[] nums) {
        int[] dp = new int[nums.length+1]; // @trace init
        for (int i = 1; i <= nums.length; i++) {
            dp[i] = Math.max(dp[i-1], dp[Math.max(0,i-2)]+nums[i-1]); // @trace choose
        }
        return dp[nums.length]; // @trace return
    }`,
`func rob(nums []int) int {
    dp := make([]int, len(nums)+1) // @trace init
    for i := 1; i <= len(nums); i++ {
        from := i-2; if from < 0 { from = 0 }
        dp[i] = dp[i-1]; if dp[from]+nums[i-1] > dp[i] { dp[i] = dp[from]+nums[i-1] } // @trace choose
    }
    return dp[len(nums)] // @trace return
}`,
`    def rob(self, nums: list[int]) -> int:
        dp = [0]*(len(nums)+1) # @trace init
        for i in range(1,len(nums)+1):
            dp[i] = max(dp[i-1], dp[max(0,i-2)]+nums[i-1]) # @trace choose
        return dp[len(nums)] # @trace return`),
  'perfect-squares': refs(
`    public int numSquares(int n) {
        int[] dp = new int[n+1], chosen = new int[n+1]; // @trace init
        for (int amount = 1; amount <= n; amount++) {
            dp[amount] = n+1; // @trace amount
            for (int root = 1; root*root <= amount; root++) {
                int square = root*root, candidate = dp[amount-square]+1;
                if (candidate < dp[amount]) { dp[amount] = candidate; chosen[amount] = square; } // @trace try
            }
        }
        java.util.List<Integer> decomposition = new java.util.ArrayList<>();
        for (int rest = n; rest > 0; rest -= chosen[rest]) decomposition.add(chosen[rest]); // @trace reconstruct
        return dp[n]; // @trace return
    }`,
`func numSquares(n int) int {
    dp, chosen := make([]int, n+1), make([]int, n+1) // @trace init
    for amount := 1; amount <= n; amount++ {
        dp[amount] = n+1 // @trace amount
        for root := 1; root*root <= amount; root++ {
            square := root*root; candidate := dp[amount-square]+1
            if candidate < dp[amount] { dp[amount] = candidate; chosen[amount] = square } // @trace try
        }
    }
    decomposition := []int{}
    for rest := n; rest > 0; rest -= chosen[rest] { decomposition = append(decomposition, chosen[rest]) } // @trace reconstruct
    return dp[n] // @trace return
}`,
`    def numSquares(self, n: int) -> int:
        dp, chosen = [0]*(n+1), [0]*(n+1) # @trace init
        for amount in range(1,n+1):
            dp[amount] = n+1 # @trace amount
            root = 1
            while root*root <= amount:
                square = root*root
                candidate = dp[amount-square]+1
                if candidate < dp[amount]: # @trace try
                    dp[amount], chosen[amount] = candidate, square
                root += 1
        decomposition, rest = [], n
        while rest > 0: # @trace reconstruct
            decomposition.append(chosen[rest])
            rest -= chosen[rest]
        return dp[n] # @trace return`),
  'word-break': refs(
`    public boolean wordBreak(String s, String[] wordDict) {
        java.util.Set<String> dict = new java.util.HashSet<>(java.util.Arrays.asList(wordDict));
        boolean[] dp = new boolean[s.length()+1]; dp[0] = true; // @trace init
        for (int end = 1; end <= s.length(); end++) { // @trace prefix
            for (int start = 0; start < end; start++) {
                if (dp[start] && dict.contains(s.substring(start,end))) { // @trace check
                    dp[end] = true; break;
                }
            }
        }
        return dp[s.length()]; // @trace return
    }`,
`func wordBreak(s string, wordDict []string) bool {
    dict := map[string]bool{}; for _,word := range wordDict { dict[word] = true }
    dp := make([]bool,len(s)+1); dp[0] = true // @trace init
    for end := 1; end <= len(s); end++ { // @trace prefix
        for start := 0; start < end; start++ {
            if dp[start] && dict[s[start:end]] { dp[end] = true; break } // @trace check
        }
    }
    return dp[len(s)] // @trace return
}`,
`    def wordBreak(self, s: str, wordDict: list[str]) -> bool:
        words = set(wordDict)
        dp = [False]*(len(s)+1); dp[0] = True # @trace init
        for end in range(1,len(s)+1): # @trace prefix
            for start in range(end):
                if dp[start] and s[start:end] in words: # @trace check
                    dp[end] = True
                    break
        return dp[len(s)] # @trace return`),
  'maximum-product-subarray': refs(
`    public int maxProduct(int[] nums) {
        int high = nums[0], low = nums[0], best = nums[0]; // @trace init
        for (int i = 1; i < nums.length; i++) {
            int x = nums[i], oldHigh = high, oldLow = low;
            high = Math.max(x, Math.max(oldHigh*x, oldLow*x)); // @trace transition
            low = Math.min(x, Math.min(oldHigh*x, oldLow*x));
            best = Math.max(best,high);
        }
        return best; // @trace return
    }`,
`func maxProduct(nums []int) int {
    high, low, best := nums[0], nums[0], nums[0] // @trace init
    for i := 1; i < len(nums); i++ {
        x := nums[i]; a, b := high*x, low*x
        high, low = x, x; if a > high { high = a }; if b > high { high = b } // @trace transition
        if a < low { low = a }; if b < low { low = b }
        if high > best { best = high }
    }
    return best // @trace return
}`,
`    def maxProduct(self, nums: list[int]) -> int:
        high = low = best = nums[0] # @trace init
        for x in nums[1:]:
            a, b = high*x, low*x
            high, low = max(x,a,b), min(x,a,b) # @trace transition
            best = max(best,high)
        return best # @trace return`),
  'partition-equal-subset-sum': refs(
`    public boolean canPartition(int[] nums) {
        int total = 0; for (int x : nums) total += x; // @trace init
        if (total % 2 != 0) return false; // @trace odd
        int target = total/2; boolean[] dp = new boolean[target+1]; dp[0] = true; // @trace base
        for (int x : nums) { // @trace item
            for (int sum = target; sum >= x; sum--) dp[sum] = dp[sum] || dp[sum-x]; // @trace update
        }
        boolean answer = dp[target]; // @trace check
        return answer; // @trace return
    }`,
`func canPartition(nums []int) bool {
    total := 0; for _,x := range nums { total += x } // @trace init
    if total%2 != 0 { return false } // @trace odd
    target := total/2; dp := make([]bool,target+1); dp[0] = true // @trace base
    for _,x := range nums { // @trace item
        for sum := target; sum >= x; sum-- { dp[sum] = dp[sum] || dp[sum-x] } // @trace update
    }
    answer := dp[target] // @trace check
    return answer // @trace return
}`,
`    def canPartition(self, nums: list[int]) -> bool:
        total = sum(nums) # @trace init
        if total%2: return False # @trace odd
        target = total//2
        dp = [False]*(target+1); dp[0] = True # @trace base
        for x in nums: # @trace item
            for value in range(target,x-1,-1):
                dp[value] = dp[value] or dp[value-x] # @trace update
        answer = dp[target] # @trace check
        return answer # @trace return`),
  'unique-paths': refs(
`    public int uniquePaths(int m, int n) {
        int[][] dp = new int[m][n]; // @trace init
        for (int r = 0; r < m; r++) for (int c = 0; c < n; c++) {
            if (r == 0 && c == 0) { dp[r][c] = 1; continue; } // @trace base
            dp[r][c] = (r > 0 ? dp[r-1][c] : 0) + (c > 0 ? dp[r][c-1] : 0); // @trace transition
        }
        return dp[m-1][n-1]; // @trace return
    }`,
`func uniquePaths(m int, n int) int {
    dp := make([][]int,m); for r := range dp { dp[r] = make([]int,n) } // @trace init
    for r := 0; r < m; r++ { for c := 0; c < n; c++ {
        if r == 0 && c == 0 { dp[r][c] = 1; continue } // @trace base
        if r > 0 { dp[r][c] += dp[r-1][c] }; if c > 0 { dp[r][c] += dp[r][c-1] } // @trace transition
    } }
    return dp[m-1][n-1] // @trace return
}`,
`    def uniquePaths(self, m: int, n: int) -> int:
        dp = [[0]*n for _ in range(m)] # @trace init
        for r in range(m):
            for c in range(n):
                if r == 0 and c == 0: # @trace base
                    dp[r][c] = 1
                    continue
                dp[r][c] = (dp[r-1][c] if r else 0) + (dp[r][c-1] if c else 0) # @trace transition
        return dp[m-1][n-1] # @trace return`),
  'minimum-path-sum': refs(
`    public int minPathSum(int[][] grid) {
        int m = grid.length, n = grid[0].length; int[][] dp = new int[m][n]; // @trace init
        for (int r = 0; r < m; r++) for (int c = 0; c < n; c++) {
            if (r == 0 && c == 0) { dp[r][c] = grid[r][c]; continue; } // @trace base
            int up = r > 0 ? dp[r-1][c] : Integer.MAX_VALUE;
            int left = c > 0 ? dp[r][c-1] : Integer.MAX_VALUE;
            dp[r][c] = Math.min(up,left) + grid[r][c]; // @trace transition
        }
        return dp[m-1][n-1]; // @trace return
    }`,
`func minPathSum(grid [][]int) int {
    m, n := len(grid), len(grid[0]); dp := make([][]int,m)
    for r := range dp { dp[r] = make([]int,n) } // @trace init
    for r := 0; r < m; r++ { for c := 0; c < n; c++ {
        if r == 0 && c == 0 { dp[r][c] = grid[r][c]; continue } // @trace base
        previous := int(^uint(0)>>1)
        if r > 0 { previous = dp[r-1][c] }
        if c > 0 && dp[r][c-1] < previous { previous = dp[r][c-1] }
        dp[r][c] = previous+grid[r][c] // @trace transition
    } }
    return dp[m-1][n-1] // @trace return
}`,
`    def minPathSum(self, grid: list[list[int]]) -> int:
        m, n = len(grid), len(grid[0])
        dp = [[0]*n for _ in range(m)] # @trace init
        for r in range(m):
            for c in range(n):
                if r == 0 and c == 0: # @trace base
                    dp[r][c] = grid[r][c]
                    continue
                up = dp[r-1][c] if r else float('inf')
                left = dp[r][c-1] if c else float('inf')
                dp[r][c] = min(up,left)+grid[r][c] # @trace transition
        return dp[m-1][n-1] # @trace return`),
};
