import type { CodeLanguage, ProblemId, ReferenceCode } from './types';
import { reference } from './reference';
import { arrayHashReferences } from './presets/array-hash-references';
import { arrayTransformReferences } from './presets/array-transform-references';
import { stackWindowReferences } from './presets/stack-window-references';
import { linkedListReferences } from './presets/linked-list-references';
import { treeReferences } from './presets/tree-references';
import { advancedTreeReferences } from './presets/advanced-tree-references';
import { mergeListReferences } from './presets/merge-list-references';
import { searchCacheReferences } from './presets/search-cache-references';
import { explorationReferences } from './presets/exploration-references';
import { orderingReferences } from './presets/ordering-references';
import { structuresReferences } from './presets/structures-references';
import { dpGreedyReferences } from './presets/dp-greedy-references';
import { finalSixReferences } from './presets/final-six-references';
export { reference } from './reference';

export const languageDetails = {
  java: { label: 'Java', extension: 'java' },
  go: { label: 'Go', extension: 'go' },
  python: { label: 'Python', extension: 'py' },
} satisfies Record<CodeLanguage, { label: string; extension: string }>;

const nodeNote = '节点类型定义附在代码末尾；刷题平台若已提供该类型，请省略重复定义。';
const coinNote = '使用 amount + 1 表示不可达；画布将这个状态统一显示为 ∞。';

export const references: Record<ProblemId, Record<CodeLanguage, ReferenceCode>> = {
  ...treeReferences,
  ...advancedTreeReferences,
  ...mergeListReferences,
  ...searchCacheReferences,
  ...explorationReferences,
  ...orderingReferences,
  ...structuresReferences,
  ...dpGreedyReferences,
  ...finalSixReferences,
  ...linkedListReferences,
  ...stackWindowReferences,
  ...arrayHashReferences,
  ...arrayTransformReferences,
  'search-insert-position': {
    java: reference(`class Solution {
    public int searchInsert(int[] nums, int target) {
        int left = 0, right = nums.length; // @trace bounds
        while (left < right) {
            int mid = left + (right - left) / 2; // @trace compare
            if (nums[mid] < target) {
                left = mid + 1; // @trace discard-left
            } else {
                right = mid; // @trace discard-right
            }
        }
        int position = left; // @trace boundary
        return position; // @trace return
    }
}`),
    go: reference(`package main

func searchInsert(nums []int, target int) int {
    left, right := 0, len(nums) // @trace bounds
    for left < right {
        mid := left + (right-left)/2 // @trace compare
        if nums[mid] < target {
            left = mid + 1 // @trace discard-left
        } else {
            right = mid // @trace discard-right
        }
    }
    position := left // @trace boundary
    return position // @trace return
}`),
    python: reference(`class Solution:
    def searchInsert(self, nums: list[int], target: int) -> int:
        left, right = 0, len(nums) # @trace bounds
        while left < right:
            mid = left + (right - left) // 2 # @trace compare
            if nums[mid] < target:
                left = mid + 1 # @trace discard-left
            else:
                right = mid # @trace discard-right
        position = left # @trace boundary
        return position # @trace return`),
  },
  'find-first-and-last-position-of-element-in-sorted-array': {
    java: reference(`class Solution {
    public int[] searchRange(int[] nums, int target) {
        int first = boundary(nums, target, false);
        if (first == nums.length || nums[first] != target) { // @trace check-first
            return new int[]{-1, -1}; // @trace not-found
        }
        int last = boundary(nums, target, true) - 1;
        return new int[]{first, last}; // @trace return
    }

    private int boundary(int[] nums, int target, boolean upper) {
        int left = 0, right = nums.length; // @trace bounds
        while (left < right) {
            int mid = left + (right - left) / 2; // @trace compare
            if (upper ? nums[mid] <= target : nums[mid] < target) {
                left = mid + 1; // @trace discard-left
            } else {
                right = mid; // @trace discard-right
            }
        }
        return left; // @trace boundary
    }
}`),
    go: reference(`package main

func searchRange(nums []int, target int) []int {
    first := boundary(nums, target, false)
    if first == len(nums) || nums[first] != target { // @trace check-first
        return []int{-1, -1} // @trace not-found
    }
    last := boundary(nums, target, true) - 1
    return []int{first, last} // @trace return
}

func boundary(nums []int, target int, upper bool) int {
    left, right := 0, len(nums) // @trace bounds
    for left < right {
        mid := left + (right-left)/2 // @trace compare
        if nums[mid] < target || (upper && nums[mid] == target) {
            left = mid + 1 // @trace discard-left
        } else {
            right = mid // @trace discard-right
        }
    }
    return left // @trace boundary
}`),
    python: reference(`class Solution:
    def searchRange(self, nums: list[int], target: int) -> list[int]:
        first = self.boundary(nums, target, False)
        if first == len(nums) or nums[first] != target: # @trace check-first
            return [-1, -1] # @trace not-found
        last = self.boundary(nums, target, True) - 1
        return [first, last] # @trace return

    def boundary(self, nums: list[int], target: int, upper: bool) -> int:
        left, right = 0, len(nums) # @trace bounds
        while left < right:
            mid = left + (right - left) // 2 # @trace compare
            if nums[mid] < target or (upper and nums[mid] == target):
                left = mid + 1 # @trace discard-left
            else:
                right = mid # @trace discard-right
        return left # @trace boundary`),
  },
  'search-in-rotated-sorted-array': {
    java: reference(`class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1; // @trace init
        while (left <= right) {
            int mid = left + (right - left) / 2; // @trace compare
            if (nums[mid] == target) {
                return mid; // @trace found
            }
            boolean leftSorted = nums[left] <= nums[mid];
            boolean keepLeft = leftSorted
                ? nums[left] <= target && target < nums[mid]
                : !(nums[mid] < target && target <= nums[right]); // @trace choose-half
            if (keepLeft) {
                right = mid - 1; // @trace discard-right
            } else {
                left = mid + 1; // @trace discard-left
            }
        }
        return -1; // @trace not-found
    }
}`),
    go: reference(`package main

func search(nums []int, target int) int {
    left, right := 0, len(nums)-1 // @trace init
    for left <= right {
        mid := left + (right-left)/2 // @trace compare
        if nums[mid] == target {
            return mid // @trace found
        }
        leftSorted := nums[left] <= nums[mid]
        keepLeft := nums[left] <= target && target < nums[mid]
        if !leftSorted {
            keepLeft = !(nums[mid] < target && target <= nums[right])
        }
        if keepLeft { // @trace choose-half
            right = mid - 1 // @trace discard-right
        } else {
            left = mid + 1 // @trace discard-left
        }
    }
    return -1 // @trace not-found
}`),
    python: reference(`class Solution:
    def search(self, nums: list[int], target: int) -> int:
        left, right = 0, len(nums) - 1 # @trace init
        while left <= right:
            mid = left + (right - left) // 2 # @trace compare
            if nums[mid] == target:
                return mid # @trace found
            left_sorted = nums[left] <= nums[mid]
            keep_left = (nums[left] <= target < nums[mid]) if left_sorted else not (nums[mid] < target <= nums[right]) # @trace choose-half
            if keep_left:
                right = mid - 1 # @trace discard-right
            else:
                left = mid + 1 # @trace discard-left
        return -1 # @trace not-found`),
  },
  'best-time-to-buy-and-sell-stock': {
    java: reference(`class Solution {
    public int maxProfit(int[] prices) {
        if (prices.length == 0) return 0; // @trace empty
        int buy = 0, best = 0; // @trace init
        for (int day = 1; day < prices.length; day++) {
            int profit = prices[day] - prices[buy]; // @trace profit
            if (profit > best) {
                best = profit; // @trace best
            }
            if (prices[day] < prices[buy]) {
                buy = day; // @trace minimum
            }
        }
        return best; // @trace return
    }
}`),
    go: reference(`package main

func maxProfit(prices []int) int {
    if len(prices) == 0 { return 0 } // @trace empty
    buy, best := 0, 0 // @trace init
    for day := 1; day < len(prices); day++ {
        profit := prices[day] - prices[buy] // @trace profit
        if profit > best {
            best = profit // @trace best
        }
        if prices[day] < prices[buy] {
            buy = day // @trace minimum
        }
    }
    return best // @trace return
}`),
    python: reference(`class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        if not prices: return 0 # @trace empty
        buy, best = 0, 0 # @trace init
        for day in range(1, len(prices)):
            profit = prices[day] - prices[buy] # @trace profit
            if profit > best:
                best = profit # @trace best
            if prices[day] < prices[buy]:
                buy = day # @trace minimum
        return best # @trace return`),
  },
  'jump-game': {
    java: reference(`class Solution {
    public boolean canJump(int[] nums) {
        int farthest = 0; // @trace init
        for (int i = 0; i < nums.length; i++) {
            if (i > farthest) { // @trace check
                return false; // @trace blocked
            }
            farthest = Math.max(farthest, i + nums[i]); // @trace extend
            if (farthest >= nums.length - 1) {
                return true; // @trace reached
            }
        }
        return false;
    }
}`),
    go: reference(`package main

func canJump(nums []int) bool {
    farthest := 0 // @trace init
    for i, jump := range nums {
        if i > farthest { // @trace check
            return false // @trace blocked
        }
        farthest = max(farthest, i+jump) // @trace extend
        if farthest >= len(nums)-1 {
            return true // @trace reached
        }
    }
    return false
}`, 'max 使用 Go 1.21+ 内置函数。'),
    python: reference(`class Solution:
    def canJump(self, nums: list[int]) -> bool:
        farthest = 0 # @trace init
        for i, jump in enumerate(nums):
            if i > farthest: # @trace check
                return False # @trace blocked
            farthest = max(farthest, i + jump) # @trace extend
            if farthest >= len(nums) - 1:
                return True # @trace reached
        return False`),
  },
  'two-sum': {
    java: reference(`import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>(); // @trace init
        for (int i = 0; i < nums.length; i++) { // @trace visit
            int need = target - nums[i]; // @trace complement
            if (seen.containsKey(need)) { // @trace lookup
                return new int[]{seen.get(need), i}; // @trace found
            }
            seen.put(nums[i], i); // @trace record
        }
        return new int[0]; // @trace not-found
    }
}`),
    go: reference(`package main

func twoSum(nums []int, target int) []int {
    seen := make(map[int]int) // @trace init
    for i, value := range nums { // @trace visit
        need := target - value // @trace complement
        if index, ok := seen[need]; ok { // @trace lookup
            return []int{index, i} // @trace found
        }
        seen[value] = i // @trace record
    }
    return []int{} // @trace not-found
}`),
    python: reference(`class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {} # @trace init
        for i, value in enumerate(nums): # @trace visit
            need = target - value # @trace complement
            if need in seen: # @trace lookup
                return [seen[need], i] # @trace found
            seen[value] = i # @trace record
        return [] # @trace not-found`),
  },
  'move-zeroes': {
    java: reference(`class Solution {
    public int[] moveZeroes(int[] nums) {
        int write = 0; // @trace init
        for (int read = 0; read < nums.length; read++) {
            if (nums[read] != 0) { // @trace check
                int temp = nums[write];
                nums[write] = nums[read];
                nums[read] = temp; // @trace swap
                write++; // @trace advance
            }
        }
        return nums; // @trace return
    }
}`, '原地修改数组，并额外返回数组用于展示；平台的 void 签名可省略 return。'),
    go: reference(`package main

func moveZeroes(nums []int) []int {
    write := 0 // @trace init
    for read := range nums {
        if nums[read] != 0 { // @trace check
            nums[write], nums[read] = nums[read], nums[write] // @trace swap
            write++ // @trace advance
        }
    }
    return nums // @trace return
}`, '原地修改切片，并额外返回切片用于展示；平台无返回值的签名可省略 return。'),
    python: reference(`class Solution:
    def moveZeroes(self, nums: list[int]) -> list[int]:
        write = 0 # @trace init
        for read in range(len(nums)):
            if nums[read] != 0: # @trace check
                nums[write], nums[read] = nums[read], nums[write] # @trace swap
                write += 1 # @trace advance
        return nums # @trace return`, '原地修改列表，并额外返回列表用于展示；平台无返回值的签名可省略 return。'),
  },
  'container-with-most-water': {
    java: reference(`class Solution {
    public int maxArea(int[] heights) {
        int left = 0, right = heights.length - 1;
        int best = 0; // @trace init
        while (left < right) {
            int area = Math.min(heights[left], heights[right]) * (right - left); // @trace area
            best = Math.max(best, area); // @trace best
            if (heights[left] <= heights[right]) {
                left++; // @trace move-left
            } else {
                right--; // @trace move-right
            }
        }
        return best; // @trace return
    }
}`),
    go: reference(`package main

func maxArea(heights []int) int {
    left, right := 0, len(heights)-1
    best := 0 // @trace init
    for left < right {
        area := min(heights[left], heights[right]) * (right - left) // @trace area
        best = max(best, area) // @trace best
        if heights[left] <= heights[right] {
            left++ // @trace move-left
        } else {
            right-- // @trace move-right
        }
    }
    return best // @trace return
}`, 'min / max 使用 Go 1.21+ 内置函数。'),
    python: reference(`class Solution:
    def maxArea(self, heights: list[int]) -> int:
        left, right = 0, len(heights) - 1
        best = 0 # @trace init
        while left < right:
            area = min(heights[left], heights[right]) * (right - left) # @trace area
            best = max(best, area) # @trace best
            if heights[left] <= heights[right]:
                left += 1 # @trace move-left
            else:
                right -= 1 # @trace move-right
        return best # @trace return`),
  },
  'longest-substring-without-repeating-characters': {
    java: reference(`import java.util.HashMap;
import java.util.Map;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        int[] chars = s.codePoints().toArray();
        Map<Integer, Integer> seen = new HashMap<>();
        int left = 0, best = 0; // @trace init
        for (int right = 0; right < chars.length; right++) { // @trace expand
            if (seen.containsKey(chars[right])) {
                left = Math.max(left, seen.get(chars[right]) + 1); // @trace shrink
            }
            seen.put(chars[right], right); // @trace record
            best = Math.max(best, right - left + 1); // @trace best
        }
        return best; // @trace return
    }
}`, '使用 codePoints() 按 Unicode 码点计数，与画布一致；不是 UTF-16 char 数量。'),
    go: reference(`package main

func lengthOfLongestSubstring(s string) int {
    chars := []rune(s)
    seen := make(map[rune]int)
    left, best := 0, 0 // @trace init
    for right, char := range chars { // @trace expand
        if index, ok := seen[char]; ok {
            left = max(left, index+1) // @trace shrink
        }
        seen[char] = right // @trace record
        best = max(best, right-left+1) // @trace best
    }
    return best // @trace return
}`, '使用 []rune 按 Unicode 码点计数；内置 max 需要 Go 1.21+。'),
    python: reference(`class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        seen = {}
        left = best = 0 # @trace init
        for right, char in enumerate(s): # @trace expand
            if char in seen:
                left = max(left, seen[char] + 1) # @trace shrink
            seen[char] = right # @trace record
            best = max(best, right - left + 1) # @trace best
        return best # @trace return`),
  },
  'maximum-subarray': {
    java: reference(`class Solution {
    public int maxSubArray(int[] nums) {
        int ending = nums[0], best = nums[0]; // @trace init
        for (int i = 1; i < nums.length; i++) {
            ending = Math.max(nums[i], ending + nums[i]); // @trace extend
            best = Math.max(best, ending); // @trace best
        }
        return best; // @trace return
    }
}`),
    go: reference(`package main

func maxSubArray(nums []int) int {
    ending, best := nums[0], nums[0] // @trace init
    for i := 1; i < len(nums); i++ {
        ending = max(nums[i], ending+nums[i]) // @trace extend
        best = max(best, ending) // @trace best
    }
    return best // @trace return
}`, 'max 使用 Go 1.21+ 内置函数。'),
    python: reference(`class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        ending = best = nums[0] # @trace init
        for i in range(1, len(nums)):
            ending = max(nums[i], ending + nums[i]) # @trace extend
            best = max(best, ending) # @trace best
        return best # @trace return`),
  },
  'reverse-linked-list': {
    java: reference(`class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null, curr = head; // @trace init
        while (curr != null) {
            ListNode next = curr.next; // @trace save-next
            curr.next = prev; // @trace rewire
            prev = curr; // @trace advance-prev
            curr = next; // @trace advance-curr
        }
        return prev; // @trace return
    }
}

class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}`, nodeNote),
    go: reference(`package main

func reverseList(head *ListNode) *ListNode {
    var prev *ListNode
    curr := head // @trace init
    for curr != nil {
        next := curr.Next // @trace save-next
        curr.Next = prev // @trace rewire
        prev = curr // @trace advance-prev
        curr = next // @trace advance-curr
    }
    return prev // @trace return
}

type ListNode struct {
    Val int
    Next *ListNode
}`, nodeNote),
    python: reference(`class Solution:
    def reverseList(self, head: "ListNode | None") -> "ListNode | None":
        prev, curr = None, head # @trace init
        while curr is not None:
            next_node = curr.next # @trace save-next
            curr.next = prev # @trace rewire
            prev = curr # @trace advance-prev
            curr = next_node # @trace advance-curr
        return prev # @trace return

class ListNode:
    def __init__(self, val: int, next: "ListNode | None" = None):
        self.val = val
        self.next = next`, nodeNote),
  },
  'binary-tree-level-order-traversal': {
    java: reference(`import java.util.ArrayList;
import java.util.List;

class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        if (root == null) return new ArrayList<>(); // @trace empty
        List<TreeNode> queue = new ArrayList<>();
        List<List<Integer>> result = new ArrayList<>();
        queue.add(root); // @trace init
        int head = 0;
        while (head < queue.size()) {
            int end = queue.size();
            List<Integer> level = new ArrayList<>(); // @trace level
            while (head < end) {
                TreeNode node = queue.get(head++); // @trace dequeue
                level.add(node.val); // @trace visit
                if (node.left != null) queue.add(node.left); // @trace enqueue-left
                if (node.right != null) queue.add(node.right); // @trace enqueue-right
            }
            result.add(level); // @trace save-level
        }
        return result; // @trace return
    }
}

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}`, nodeNote),
    go: reference(`package main

func levelOrder(root *TreeNode) [][]int {
    if root == nil { return [][]int{} } // @trace empty
    result := [][]int{}
    queue := []*TreeNode{root} // @trace init
    head := 0
    for head < len(queue) {
        end := len(queue)
        level := []int{} // @trace level
        for head < end {
            node := queue[head]
            head++ // @trace dequeue
            level = append(level, node.Val) // @trace visit
            if node.Left != nil { queue = append(queue, node.Left) } // @trace enqueue-left
            if node.Right != nil { queue = append(queue, node.Right) } // @trace enqueue-right
        }
        result = append(result, level) // @trace save-level
    }
    return result // @trace return
}

type TreeNode struct {
    Val int
    Left, Right *TreeNode
}`, nodeNote),
    python: reference(`class Solution:
    def levelOrder(self, root: "TreeNode | None") -> list[list[int]]:
        if root is None:
            return [] # @trace empty
        result = []
        queue = [root] # @trace init
        head = 0
        while head < len(queue):
            end = len(queue)
            level = [] # @trace level
            while head < end:
                node = queue[head]
                head += 1 # @trace dequeue
                level.append(node.val) # @trace visit
                if node.left is not None:
                    queue.append(node.left) # @trace enqueue-left
                if node.right is not None:
                    queue.append(node.right) # @trace enqueue-right
            result.append(level) # @trace save-level
        return result # @trace return

class TreeNode:
    def __init__(self, val: int):
        self.val = val
        self.left = self.right = None`, nodeNote),
  },
  'climbing-stairs': {
    java: reference(`class Solution {
    public int climbStairs(int n) {
        int[] dp = new int[n + 1];
        dp[0] = 1; // @trace base-zero
        if (n >= 1) dp[1] = 1; // @trace base-one
        for (int i = 2; i <= n; i++) {
            dp[i] = dp[i - 1] + dp[i - 2]; // @trace transition
        }
        return dp[n]; // @trace return
    }
}`),
    go: reference(`package main

func climbStairs(n int) int {
    dp := make([]int, n+1)
    dp[0] = 1 // @trace base-zero
    if n >= 1 { dp[1] = 1 } // @trace base-one
    for i := 2; i <= n; i++ {
        dp[i] = dp[i-1] + dp[i-2] // @trace transition
    }
    return dp[n] // @trace return
}`),
    python: reference(`class Solution:
    def climbStairs(self, n: int) -> int:
        dp = [0] * (n + 1)
        dp[0] = 1 # @trace base-zero
        if n >= 1:
            dp[1] = 1 # @trace base-one
        for i in range(2, n + 1):
            dp[i] = dp[i - 1] + dp[i - 2] # @trace transition
        return dp[n] # @trace return`),
  },
  'coin-change': {
    java: reference(`import java.util.Arrays;

class Solution {
    public int coinChange(int[] coins, int amount) {
        int unreachable = amount + 1;
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, unreachable);
        dp[0] = 0; // @trace base-zero
        for (int a = 1; a <= amount; a++) { // @trace amount
            for (int coin : coins) {
                if (coin <= a) { // @trace try-coin
                    dp[a] = Math.min(dp[a], dp[a - coin] + 1); // @trace transition
                }
            }
        }
        return dp[amount] == unreachable ? -1 : dp[amount]; // @trace return
    }
}`, coinNote),
    go: reference(`package main

func coinChange(coins []int, amount int) int {
    unreachable := amount + 1
    dp := make([]int, amount+1)
    for i := range dp { dp[i] = unreachable }
    dp[0] = 0 // @trace base-zero
    for a := 1; a <= amount; a++ { // @trace amount
        for _, coin := range coins {
            if coin <= a { // @trace try-coin
                dp[a] = min(dp[a], dp[a-coin]+1) // @trace transition
            }
        }
    }
    if dp[amount] == unreachable { return -1 }; return dp[amount] // @trace return
}`, `${coinNote} min 需要 Go 1.21+。`),
    python: reference(`class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        dp = [float("inf")] * (amount + 1)
        dp[0] = 0 # @trace base-zero
        for a in range(1, amount + 1): # @trace amount
            for coin in coins:
                if coin <= a: # @trace try-coin
                    dp[a] = min(dp[a], dp[a - coin] + 1) # @trace transition
        return -1 if dp[amount] == float("inf") else int(dp[amount]) # @trace return`),
  },
  'longest-increasing-subsequence': {
    java: reference(`import java.util.Arrays;

class Solution {
    public int lengthOfLIS(int[] nums) {
        int[] dp = new int[nums.length];
        Arrays.fill(dp, 1);
        int best = 0; // @trace init
        for (int i = 0; i < nums.length; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[j] < nums[i]) { // @trace compare
                    dp[i] = Math.max(dp[i], dp[j] + 1); // @trace transition
                }
            }
            best = Math.max(best, dp[i]); // @trace best
        }
        return best; // @trace return
    }
}`),
    go: reference(`package main

func lengthOfLIS(nums []int) int {
    dp := make([]int, len(nums))
    for i := range dp { dp[i] = 1 }
    best := 0 // @trace init
    for i := range nums {
        for j := 0; j < i; j++ {
            if nums[j] < nums[i] { // @trace compare
                dp[i] = max(dp[i], dp[j]+1) // @trace transition
            }
        }
        best = max(best, dp[i]) // @trace best
    }
    return best // @trace return
}`, 'max 使用 Go 1.21+ 内置函数。'),
    python: reference(`class Solution:
    def lengthOfLIS(self, nums: list[int]) -> int:
        dp = [1] * len(nums)
        best = 0 # @trace init
        for i in range(len(nums)):
            for j in range(i):
                if nums[j] < nums[i]: # @trace compare
                    dp[i] = max(dp[i], dp[j] + 1) # @trace transition
            best = max(best, dp[i]) # @trace best
        return best # @trace return`),
  },
};
