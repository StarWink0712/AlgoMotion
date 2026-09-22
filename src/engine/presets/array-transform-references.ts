import { reference } from '../reference';
import type { CodeLanguage, ReferenceCode } from '../types';
import type { ArrayTransformId } from './array-transform';

const returnedArray = '原地修改数组，并额外返回数组用于展示；平台的无返回值签名可省略 return。';
export const arrayTransformReferences: Record<ArrayTransformId, Record<CodeLanguage, ReferenceCode>> = {
  '3sum': {
    java: reference(`import java.util.*;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        int[] a = nums.clone();
        List<List<Integer>> result = new ArrayList<>(); // @trace init
        Arrays.sort(a); // @trace sort
        for (int i = 0; i < a.length - 2; i++) { // @trace anchor
            if (i > 0 && a[i] == a[i - 1]) continue; // @trace skip-anchor
            int left = i + 1, right = a.length - 1;
            while (left < right) {
                int sum = a[i] + a[left] + a[right]; // @trace sum
                if (sum < 0) {
                    left++; // @trace move-left
                } else if (sum > 0) {
                    right--; // @trace move-right
                } else {
                    result.add(Arrays.asList(a[i], a[left], a[right])); // @trace collect
                    left++; right--; // @trace advance
                    while (left < right && a[left] == a[left - 1]) left++; // @trace skip-left
                    while (left < right && a[right] == a[right + 1]) right--; // @trace skip-right
                }
            }
        }
        return result; // @trace return
    }
}`),
    go: reference(`package main

import "sort"

func threeSum(nums []int) [][]int {
    a := append([]int{}, nums...)
    result := make([][]int, 0) // @trace init
    sort.Ints(a) // @trace sort
    for i := 0; i < len(a)-2; i++ { // @trace anchor
        if i > 0 && a[i] == a[i-1] { continue } // @trace skip-anchor
        left, right := i+1, len(a)-1
        for left < right {
            sum := a[i] + a[left] + a[right] // @trace sum
            if sum < 0 {
                left++ // @trace move-left
            } else if sum > 0 {
                right-- // @trace move-right
            } else {
                result = append(result, []int{a[i], a[left], a[right]}) // @trace collect
                left++; right-- // @trace advance
                for left < right && a[left] == a[left-1] { left++ } // @trace skip-left
                for left < right && a[right] == a[right+1] { right-- } // @trace skip-right
            }
        }
    }
    return result // @trace return
}`),
    python: reference(`class Solution:
    def threeSum(self, nums: list[int]) -> list[list[int]]:
        result = [] # @trace init
        a = sorted(nums) # @trace sort
        for i in range(len(a) - 2): # @trace anchor
            if i > 0 and a[i] == a[i - 1]:
                continue # @trace skip-anchor
            left, right = i + 1, len(a) - 1
            while left < right:
                total = a[i] + a[left] + a[right] # @trace sum
                if total < 0:
                    left += 1 # @trace move-left
                elif total > 0:
                    right -= 1 # @trace move-right
                else:
                    result.append([a[i], a[left], a[right]]) # @trace collect
                    left, right = left + 1, right - 1 # @trace advance
                    while left < right and a[left] == a[left - 1]:
                        left += 1 # @trace skip-left
                    while left < right and a[right] == a[right + 1]:
                        right -= 1 # @trace skip-right
        return result # @trace return`),
  },
  'sort-colors': {
    java: reference(`class Solution {
    public int[] sortColors(int[] nums) {
        int low = 0, mid = 0, high = nums.length - 1; // @trace init
        while (mid <= high) {
            if (nums[mid] == 0) { // @trace check
                int temp = nums[mid]; nums[mid] = nums[low]; nums[low] = temp;
                low++; mid++; // @trace place-zero
            } else if (nums[mid] == 2) {
                int temp = nums[mid]; nums[mid] = nums[high]; nums[high] = temp;
                high--; // @trace place-two
            } else {
                mid++; // @trace place-one
            }
        }
        return nums; // @trace return
    }
}`, returnedArray),
    go: reference(`package main

func sortColors(nums []int) []int {
    low, mid, high := 0, 0, len(nums)-1 // @trace init
    for mid <= high {
        if nums[mid] == 0 { // @trace check
            nums[mid], nums[low] = nums[low], nums[mid]
            low++; mid++ // @trace place-zero
        } else if nums[mid] == 2 {
            nums[mid], nums[high] = nums[high], nums[mid]
            high-- // @trace place-two
        } else {
            mid++ // @trace place-one
        }
    }
    return nums // @trace return
}`, returnedArray),
    python: reference(`class Solution:
    def sortColors(self, nums: list[int]) -> list[int]:
        low, mid, high = 0, 0, len(nums) - 1 # @trace init
        while mid <= high:
            if nums[mid] == 0: # @trace check
                nums[mid], nums[low] = nums[low], nums[mid]
                low, mid = low + 1, mid + 1 # @trace place-zero
            elif nums[mid] == 2:
                nums[mid], nums[high] = nums[high], nums[mid]
                high -= 1 # @trace place-two
            else:
                mid += 1 # @trace place-one
        return nums # @trace return`, returnedArray),
  },
  'rotate-array': {
    java: reference(`class Solution {
    public int[] rotate(int[] nums, int k) {
        if (nums.length == 0) return nums; // @trace empty
        k %= nums.length; // @trace normalize
        if (k != 0) {
            reverse(nums, 0, nums.length - 1); // @trace whole
            reverse(nums, 0, k - 1); // @trace front
            reverse(nums, k, nums.length - 1); // @trace back
        }
        return nums; // @trace return
    }
    private void reverse(int[] nums, int left, int right) {
        while (left < right) {
            int temp = nums[left]; nums[left] = nums[right]; nums[right] = temp; // @trace swap
            left++; right--; // @trace advance
        }
    }
}`, returnedArray),
    go: reference(`package main

func rotate(nums []int, k int) []int {
    if len(nums) == 0 { return nums } // @trace empty
    k %= len(nums) // @trace normalize
    if k != 0 {
        reverse(nums, 0, len(nums)-1) // @trace whole
        reverse(nums, 0, k-1) // @trace front
        reverse(nums, k, len(nums)-1) // @trace back
    }
    return nums // @trace return
}
func reverse(nums []int, left int, right int) {
    for left < right {
        nums[left], nums[right] = nums[right], nums[left] // @trace swap
        left++; right-- // @trace advance
    }
}`, returnedArray),
    python: reference(`class Solution:
    def rotate(self, nums: list[int], k: int) -> list[int]:
        if not nums: return nums # @trace empty
        k %= len(nums) # @trace normalize
        if k:
            self.reverse(nums, 0, len(nums) - 1) # @trace whole
            self.reverse(nums, 0, k - 1) # @trace front
            self.reverse(nums, k, len(nums) - 1) # @trace back
        return nums # @trace return

    def reverse(self, nums: list[int], left: int, right: int) -> None:
        while left < right:
            nums[left], nums[right] = nums[right], nums[left] # @trace swap
            left, right = left + 1, right - 1 # @trace advance`, returnedArray),
  },
  'next-permutation': {
    java: reference(`class Solution {
    public int[] nextPermutation(int[] nums) {
        if (nums.length < 2) return nums; // @trace short
        int pivot = nums.length - 2; // @trace init
        while (pivot >= 0) {
            if (nums[pivot] < nums[pivot + 1]) break; // @trace compare-pivot
            pivot--; // @trace move-pivot
        }
        if (pivot >= 0) {
            int next = nums.length - 1;
            while (true) {
                if (nums[next] > nums[pivot]) break; // @trace compare-next
                next--; // @trace move-next
            }
            int temp = nums[pivot]; nums[pivot] = nums[next]; nums[next] = temp; // @trace swap-pivot
        }
        reverse(nums, pivot + 1, nums.length - 1); // @trace suffix
        return nums; // @trace return
    }
    private void reverse(int[] nums, int left, int right) {
        while (left < right) {
            int temp = nums[left]; nums[left] = nums[right]; nums[right] = temp; // @trace swap
            left++; right--; // @trace advance
        }
    }
}`, returnedArray),
    go: reference(`package main

func nextPermutation(nums []int) []int {
    if len(nums) < 2 { return nums } // @trace short
    pivot := len(nums)-2 // @trace init
    for pivot >= 0 {
        if nums[pivot] < nums[pivot+1] { break } // @trace compare-pivot
        pivot-- // @trace move-pivot
    }
    if pivot >= 0 {
        next := len(nums)-1
        for {
            if nums[next] > nums[pivot] { break } // @trace compare-next
            next-- // @trace move-next
        }
        nums[pivot], nums[next] = nums[next], nums[pivot] // @trace swap-pivot
    }
    reverse(nums, pivot+1, len(nums)-1) // @trace suffix
    return nums // @trace return
}
func reverse(nums []int, left int, right int) {
    for left < right {
        nums[left], nums[right] = nums[right], nums[left] // @trace swap
        left++; right-- // @trace advance
    }
}`, returnedArray),
    python: reference(`class Solution:
    def nextPermutation(self, nums: list[int]) -> list[int]:
        if len(nums) < 2: return nums # @trace short
        pivot = len(nums) - 2 # @trace init
        while pivot >= 0:
            if nums[pivot] < nums[pivot + 1]: break # @trace compare-pivot
            pivot -= 1 # @trace move-pivot
        if pivot >= 0:
            next_index = len(nums) - 1
            while True:
                if nums[next_index] > nums[pivot]: break # @trace compare-next
                next_index -= 1 # @trace move-next
            nums[pivot], nums[next_index] = nums[next_index], nums[pivot] # @trace swap-pivot
        self.reverse(nums, pivot + 1, len(nums) - 1) # @trace suffix
        return nums # @trace return

    def reverse(self, nums: list[int], left: int, right: int) -> None:
        while left < right:
            nums[left], nums[right] = nums[right], nums[left] # @trace swap
            left, right = left + 1, right - 1 # @trace advance`, returnedArray),
  },
  'merge-intervals': {
    java: reference(`import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        int[][] items = new int[intervals.length][];
        for (int i = 0; i < items.length; i++) items[i] = intervals[i].clone();
        List<int[]> merged = new ArrayList<>(); // @trace init
        Arrays.sort(items, (a, b) -> a[0] == b[0] ? Integer.compare(a[1], b[1]) : Integer.compare(a[0], b[0])); // @trace sort
        for (int[] item : items) { // @trace inspect
            if (merged.isEmpty() || item[0] > merged.get(merged.size() - 1)[1]) {
                merged.add(item.clone()); // @trace append
            } else {
                int[] last = merged.get(merged.size() - 1);
                last[1] = Math.max(last[1], item[1]); // @trace merge
            }
        }
        return merged.toArray(new int[merged.size()][]); // @trace return
    }
}`),
    go: reference(`package main

import "sort"

func merge(intervals [][]int) [][]int {
    items := make([][]int, len(intervals))
    for i, item := range intervals { items[i] = append([]int{}, item...) }
    merged := make([][]int, 0) // @trace init
    sort.SliceStable(items, func(i, j int) bool {
        if items[i][0] == items[j][0] { return items[i][1] < items[j][1] }
        return items[i][0] < items[j][0]
    }) // @trace sort
    for _, item := range items { // @trace inspect
        if len(merged) == 0 || item[0] > merged[len(merged)-1][1] {
            merged = append(merged, append([]int{}, item...)) // @trace append
        } else {
            last := merged[len(merged)-1]
            last[1] = max(last[1], item[1]) // @trace merge
        }
    }
    return merged // @trace return
}`, 'max 使用 Go 1.21+ 内置函数。'),
    python: reference(`class Solution:
    def merge(self, intervals: list[list[int]]) -> list[list[int]]:
        merged = [] # @trace init
        items = sorted(intervals, key=lambda item: (item[0], item[1])) # @trace sort
        for item in items: # @trace inspect
            if not merged or item[0] > merged[-1][1]:
                merged.append(item[:]) # @trace append
            else:
                merged[-1][1] = max(merged[-1][1], item[1]) # @trace merge
        return merged # @trace return`),
  },
};
