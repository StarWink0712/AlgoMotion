import { reference } from '../reference';
import type { CodeLanguage, ReferenceCode } from '../types';
import type { ArrayHashId } from './array-hash';

export const arrayHashReferences: Record<ArrayHashId, Record<CodeLanguage, ReferenceCode>> = {
  'group-anagrams': {
    java: reference(`import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new LinkedHashMap<>(); // @trace init
        for (String word : strs) {
            char[] letters = word.toCharArray();
            Arrays.sort(letters);
            String key = new String(letters); // @trace signature
            if (!groups.containsKey(key)) {
                groups.put(key, new ArrayList<>()); // @trace new-group
            }
            groups.get(key).add(word); // @trace assign
        }
        return new ArrayList<>(groups.values()); // @trace return
    }
}`),
    go: reference(`package main

import "sort"

func groupAnagrams(strs []string) [][]string {
    groups, order := map[string][]string{}, []string{} // @trace init
    for _, word := range strs {
        letters := []byte(word)
        sort.Slice(letters, func(i, j int) bool { return letters[i] < letters[j] })
        key := string(letters) // @trace signature
        if _, ok := groups[key]; !ok {
            groups[key] = []string{}
            order = append(order, key) // @trace new-group
        }
        groups[key] = append(groups[key], word) // @trace assign
    }
    result := make([][]string, 0, len(order))
    for _, key := range order { result = append(result, groups[key]) }
    return result // @trace return
}`),
    python: reference(`class Solution:
    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:
        groups = {} # @trace init
        for word in strs:
            key = "".join(sorted(word)) # @trace signature
            if key not in groups:
                groups[key] = [] # @trace new-group
            groups[key].append(word) # @trace assign
        return list(groups.values()) # @trace return`),
  },
  'longest-consecutive-sequence': {
    java: reference(`import java.util.*;

class Solution {
    public int longestConsecutive(int[] nums) {
        Set<Integer> seen = new LinkedHashSet<>();
        for (int num : nums) seen.add(num);
        int best = 0; // @trace init
        for (int start : seen) {
            if (seen.contains(start - 1)) { // @trace check-start
                continue; // @trace skip
            }
            int current = start, length = 1; // @trace start-chain
            while (seen.contains(current + 1)) {
                current++;
                length++; // @trace extend
            }
            best = Math.max(best, length); // @trace best
        }
        return best; // @trace return
    }
}`),
    go: reference(`package main

func longestConsecutive(nums []int) int {
    seen, order := map[int]bool{}, []int{}
    for _, num := range nums {
        if !seen[num] { seen[num] = true; order = append(order, num) }
    }
    best := 0 // @trace init
    for _, start := range order {
        if seen[start-1] { // @trace check-start
            continue // @trace skip
        }
        current, length := start, 1 // @trace start-chain
        for seen[current+1] {
            current++
            length++ // @trace extend
        }
        best = max(best, length) // @trace best
    }
    return best // @trace return
}`, 'max 使用 Go 1.21+ 内置函数；order 仅用于保持演示访问顺序。'),
    python: reference(`class Solution:
    def longestConsecutive(self, nums: list[int]) -> int:
        order = list(dict.fromkeys(nums))
        seen = set(order)
        best = 0 # @trace init
        for start in order:
            if start - 1 in seen: # @trace check-start
                continue # @trace skip
            current, length = start, 1 # @trace start-chain
            while current + 1 in seen:
                current += 1
                length += 1 # @trace extend
            best = max(best, length) # @trace best
        return best # @trace return`),
  },
  'product-of-array-except-self': {
    java: reference(`import java.util.Arrays;

class Solution {
    public int[] productExceptSelf(int[] nums) {
        int[] output = new int[nums.length];
        Arrays.fill(output, 1);
        int left = 1; // @trace init
        for (int i = 0; i < nums.length; i++) {
            output[i] = left; // @trace write-left
            left *= nums[i]; // @trace extend-left
        }
        int right = 1; // @trace right-init
        for (int i = nums.length - 1; i >= 0; i--) {
            output[i] *= right; // @trace combine
            right *= nums[i]; // @trace extend-right
        }
        return output; // @trace return
    }
}`),
    go: reference(`package main

func productExceptSelf(nums []int) []int {
    output := make([]int, len(nums))
    for i := range output { output[i] = 1 }
    left := 1 // @trace init
    for i, value := range nums {
        output[i] = left // @trace write-left
        left *= value // @trace extend-left
    }
    right := 1 // @trace right-init
    for i := len(nums)-1; i >= 0; i-- {
        output[i] *= right // @trace combine
        right *= nums[i] // @trace extend-right
    }
    return output // @trace return
}`),
    python: reference(`class Solution:
    def productExceptSelf(self, nums: list[int]) -> list[int]:
        output = [1] * len(nums)
        left = 1 # @trace init
        for i, value in enumerate(nums):
            output[i] = left # @trace write-left
            left *= value # @trace extend-left
        right = 1 # @trace right-init
        for i in range(len(nums) - 1, -1, -1):
            output[i] *= right # @trace combine
            right *= nums[i] # @trace extend-right
        return output # @trace return`),
  },
  'subarray-sum-equals-k': {
    java: reference(`import java.util.*;

class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> counts = new LinkedHashMap<>();
        counts.put(0, 1);
        int prefix = 0, count = 0; // @trace init
        for (int value : nums) {
            prefix += value; // @trace prefix
            int hits = counts.getOrDefault(prefix - k, 0); // @trace lookup
            count += hits; // @trace count
            counts.put(prefix, counts.getOrDefault(prefix, 0) + 1); // @trace record
        }
        return count; // @trace return
    }
}`),
    go: reference(`package main

func subarraySum(nums []int, k int) int {
    counts := map[int]int{0: 1}
    prefix, count := 0, 0 // @trace init
    for _, value := range nums {
        prefix += value // @trace prefix
        hits := counts[prefix-k] // @trace lookup
        count += hits // @trace count
        counts[prefix]++ // @trace record
    }
    return count // @trace return
}`),
    python: reference(`class Solution:
    def subarraySum(self, nums: list[int], k: int) -> int:
        counts = {0: 1}
        prefix, count = 0, 0 # @trace init
        for value in nums:
            prefix += value # @trace prefix
            hits = counts.get(prefix - k, 0) # @trace lookup
            count += hits # @trace count
            counts[prefix] = counts.get(prefix, 0) + 1 # @trace record
        return count # @trace return`),
  },
};
