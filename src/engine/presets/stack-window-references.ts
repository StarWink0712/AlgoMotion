import { reference } from '../reference';
import type { CodeLanguage, ReferenceCode } from '../types';
import type { StackWindowId } from './stack-window';

const ascii = '本演示的字符串输入限定为 ASCII 英文字母，大小写敏感。';
const goVersion = 'min / max 使用 Go 1.21+ 内置函数。';
const stackProtocol = 'runOperations 是演示适配器：初始栈为空；push/pop 返回 null；top/getMin 返回整数。输入校验拒绝空栈读取或弹出。';
export const stackWindowReferences: Record<StackWindowId, Record<CodeLanguage, ReferenceCode>> = {
  'valid-parentheses': {
    java: reference(`import java.util.*;

class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>(); // @trace init
        boolean valid = true;
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') {
                stack.push(c); // @trace push
            } else {
                char expected = c == ')' ? '(' : c == ']' ? '[' : '{';
                if (stack.isEmpty() || stack.peek() != expected) { valid = false; break; } // @trace check
                stack.pop(); // @trace pop
            }
        }
        return valid && stack.isEmpty(); // @trace return
    }
}`),
    go: reference(`package main

func isValid(s string) bool {
    stack := []byte{} // @trace init
    valid := true
    for i := 0; i < len(s); i++ {
        c := s[i]
        if c == '(' || c == '[' || c == '{' {
            stack = append(stack, c) // @trace push
        } else {
            expected := byte('{')
            if c == ')' { expected = '(' } else if c == ']' { expected = '[' }
            if len(stack) == 0 || stack[len(stack)-1] != expected { valid = false; break } // @trace check
            stack = stack[:len(stack)-1] // @trace pop
        }
    }
    return valid && len(stack) == 0 // @trace return
}`),
    python: reference(`class Solution:
    def isValid(self, s: str) -> bool:
        stack = [] # @trace init
        valid = True
        pairs = {')': '(', ']': '[', '}': '{'}
        for c in s:
            if c in '([{':
                stack.append(c) # @trace push
            else:
                if not stack or stack[-1] != pairs[c]: # @trace check
                    valid = False
                    break
                stack.pop() # @trace pop
        return valid and not stack # @trace return`),
  },
  'min-stack': {
    java: reference(`import java.util.*;

class MinStack {
    private final Deque<int[]> stack = new ArrayDeque<>(); // @trace init
    public void push(int value) {
        int minimum = stack.isEmpty() ? value : Math.min(value, stack.peek()[1]);
        stack.push(new int[]{value, minimum}); // @trace push
    }
    public void pop() { stack.pop(); } // @trace pop
    public int top() { return stack.peek()[0]; } // @trace top
    public int getMin() { return stack.peek()[1]; } // @trace minimum
}

class Solution {
    public List<Integer> runOperations(String[] operations, int[] values) {
        MinStack stack = new MinStack();
        List<Integer> result = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push": stack.push(values[i]); result.add(null); break;
                case "pop": stack.pop(); result.add(null); break;
                case "top": result.add(stack.top()); break;
                case "getMin": result.add(stack.getMin()); break;
                default: throw new IllegalArgumentException("Unknown operation");
            }
        }
        return result; // @trace return
    }
}`, stackProtocol),
    go: reference(`package main

type MinStack struct { entries [][2]int }
func NewMinStack() *MinStack { return &MinStack{} } // @trace init
func (s *MinStack) Push(value int) {
    minimum := value
    if len(s.entries) > 0 { minimum = min(value, s.GetMin()) }
    s.entries = append(s.entries, [2]int{value, minimum}) // @trace push
}
func (s *MinStack) Pop() { s.entries = s.entries[:len(s.entries)-1] } // @trace pop
func (s *MinStack) Top() int { return s.entries[len(s.entries)-1][0] } // @trace top
func (s *MinStack) GetMin() int { return s.entries[len(s.entries)-1][1] } // @trace minimum

func runOperations(operations []string, values []int) []*int {
    stack := NewMinStack()
    result := make([]*int, 0, len(operations))
    for i, op := range operations {
        switch op {
        case "push": stack.Push(values[i]); result = append(result, nil)
        case "pop": stack.Pop(); result = append(result, nil)
        case "top": value := stack.Top(); result = append(result, &value)
        case "getMin": value := stack.GetMin(); result = append(result, &value)
        default: panic("Unknown operation")
        }
    }
    return result // @trace return
}`, `${stackProtocol} ${goVersion}`),
    python: reference(`class MinStack:
    def __init__(self):
        self.stack = [] # @trace init

    def push(self, value: int) -> None:
        minimum = min(value, self.getMin()) if self.stack else value
        self.stack.append((value, minimum)) # @trace push

    def pop(self) -> None:
        self.stack.pop() # @trace pop

    def top(self) -> int:
        return self.stack[-1][0] # @trace top

    def getMin(self) -> int:
        return self.stack[-1][1] # @trace minimum


class Solution:
    def runOperations(self, operations: list[str], values: list[int]):
        stack, result = MinStack(), []
        for op, value in zip(operations, values):
            if op == 'push':
                stack.push(value)
                result.append(None)
            elif op == 'pop':
                stack.pop()
                result.append(None)
            elif op == 'top':
                result.append(stack.top())
            elif op == 'getMin':
                result.append(stack.getMin())
            else:
                raise ValueError('Unknown operation')
        return result # @trace return`, stackProtocol),
  },
  'daily-temperatures': {
    java: reference(`import java.util.*;

class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        int[] answer = new int[temperatures.length];
        Deque<Integer> stack = new ArrayDeque<>(); // @trace init
        for (int i = 0; i < temperatures.length; i++) { // @trace scan
            while (!stack.isEmpty() && temperatures[stack.peek()] < temperatures[i]) {
                int previous = stack.pop();
                answer[previous] = i - previous; // @trace resolve
            }
            stack.push(i); // @trace push
        }
        // Unresolved entries retain zero; the animation reveals them only now.
        for (int previous : stack) answer[previous] = 0; // @trace unresolved
        return answer; // @trace return
    }
}`),
    go: reference(`package main

func dailyTemperatures(temperatures []int) []int {
    answer := make([]int, len(temperatures))
    stack := []int{} // @trace init
    for i, temperature := range temperatures { // @trace scan
        for len(stack) > 0 && temperatures[stack[len(stack)-1]] < temperature {
            previous := stack[len(stack)-1]; stack = stack[:len(stack)-1]
            answer[previous] = i - previous // @trace resolve
        }
        stack = append(stack, i) // @trace push
    }
    for _, previous := range stack { answer[previous] = 0 } // @trace unresolved
    return answer // @trace return
}`),
    python: reference(`class Solution:
    def dailyTemperatures(self, temperatures: list[int]) -> list[int]:
        answer = [0] * len(temperatures)
        stack = [] # @trace init
        for i, temperature in enumerate(temperatures): # @trace scan
            while stack and temperatures[stack[-1]] < temperature:
                previous = stack.pop()
                answer[previous] = i - previous # @trace resolve
            stack.append(i) # @trace push
        for previous in stack:
            answer[previous] = 0 # @trace unresolved
        return answer # @trace return`),
  },
  'largest-rectangle-in-histogram': {
    java: reference(`import java.util.*;

class Solution {
    public int largestRectangleArea(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>(); int best = 0; // @trace init
        for (int i = 0; i <= heights.length; i++) {
            int current = i == heights.length ? -1 : heights[i]; // @trace scan
            while (!stack.isEmpty() && heights[stack.peek()] > current) {
                int height = heights[stack.pop()];
                int left = stack.isEmpty() ? -1 : stack.peek();
                best = Math.max(best, height * (i - left - 1)); // @trace measure
            }
            if (i < heights.length) stack.push(i); // @trace push
        }
        return best; // @trace return
    }
}`),
    go: reference(`package main

func largestRectangleArea(heights []int) int {
    stack, best := []int{}, 0 // @trace init
    for i := 0; i <= len(heights); i++ {
        current := -1; if i < len(heights) { current = heights[i] } // @trace scan
        for len(stack) > 0 && heights[stack[len(stack)-1]] > current {
            height := heights[stack[len(stack)-1]]; stack = stack[:len(stack)-1]
            left := -1; if len(stack) > 0 { left = stack[len(stack)-1] }
            best = max(best, height * (i - left - 1)) // @trace measure
        }
        if i < len(heights) { stack = append(stack, i) } // @trace push
    }
    return best // @trace return
}`, goVersion),
    python: reference(`class Solution:
    def largestRectangleArea(self, heights: list[int]) -> int:
        stack, best = [], 0 # @trace init
        for i in range(len(heights) + 1):
            current = heights[i] if i < len(heights) else -1 # @trace scan
            while stack and heights[stack[-1]] > current:
                height = heights[stack.pop()]
                left = stack[-1] if stack else -1
                best = max(best, height * (i - left - 1)) # @trace measure
            if i < len(heights):
                stack.append(i) # @trace push
        return best # @trace return`),
  },
  'trapping-rain-water': {
    java: reference(`import java.util.*;

class Solution {
    public int trap(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>(); int total = 0; // @trace init
        for (int i = 0; i < heights.length; i++) { // @trace scan
            while (!stack.isEmpty() && heights[stack.peek()] < heights[i]) {
                int bottom = stack.pop();
                if (stack.isEmpty()) break; // @trace unbounded
                int left = stack.peek();
                int depth = Math.min(heights[left], heights[i]) - heights[bottom];
                total += depth * (i - left - 1); // @trace fill
            }
            stack.push(i); // @trace push
        }
        return total; // @trace return
    }
}`),
    go: reference(`package main

func trap(heights []int) int {
    stack, total := []int{}, 0 // @trace init
    for i, height := range heights { // @trace scan
        for len(stack) > 0 && heights[stack[len(stack)-1]] < height {
            bottom := stack[len(stack)-1]; stack = stack[:len(stack)-1]
            if len(stack) == 0 { break } // @trace unbounded
            left := stack[len(stack)-1]
            depth := min(heights[left], height) - heights[bottom]
            total += depth * (i - left - 1) // @trace fill
        }
        stack = append(stack, i) // @trace push
    }
    return total // @trace return
}`, goVersion),
    python: reference(`class Solution:
    def trap(self, heights: list[int]) -> int:
        stack, total = [], 0 # @trace init
        for i, height in enumerate(heights): # @trace scan
            while stack and heights[stack[-1]] < height:
                bottom = stack.pop()
                if not stack: # @trace unbounded
                    break
                left = stack[-1]
                depth = min(heights[left], height) - heights[bottom]
                total += depth * (i - left - 1) # @trace fill
            stack.append(i) # @trace push
        return total # @trace return`),
  },
  'sliding-window-maximum': {
    java: reference(`import java.util.*;

class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        Deque<Integer> queue = new ArrayDeque<>(); int[] answer = new int[nums.length - k + 1]; // @trace init
        for (int i = 0; i < nums.length; i++) { // @trace scan
            if (!queue.isEmpty() && queue.peekFirst() <= i - k) queue.removeFirst(); // @trace expire
            while (!queue.isEmpty() && nums[queue.peekLast()] <= nums[i]) queue.removeLast(); // @trace discard
            queue.addLast(i); // @trace push
            if (i >= k - 1) answer[i - k + 1] = nums[queue.peekFirst()]; // @trace collect
        }
        return answer; // @trace return
    }
}`),
    go: reference(`package main

func maxSlidingWindow(nums []int, k int) []int {
    queue, answer := []int{}, make([]int, 0, len(nums)-k+1) // @trace init
    for i, value := range nums { // @trace scan
        if len(queue) > 0 && queue[0] <= i-k { queue = queue[1:] } // @trace expire
        for len(queue) > 0 && nums[queue[len(queue)-1]] <= value { queue = queue[:len(queue)-1] } // @trace discard
        queue = append(queue, i) // @trace push
        if i >= k-1 { answer = append(answer, nums[queue[0]]) } // @trace collect
    }
    return answer // @trace return
}`),
    python: reference(`from collections import deque

class Solution:
    def maxSlidingWindow(self, nums: list[int], k: int) -> list[int]:
        queue, answer = deque(), [] # @trace init
        for i, value in enumerate(nums): # @trace scan
            if queue and queue[0] <= i - k:
                queue.popleft() # @trace expire
            while queue and nums[queue[-1]] <= value:
                queue.pop() # @trace discard
            queue.append(i) # @trace push
            if i >= k - 1:
                answer.append(nums[queue[0]]) # @trace collect
        return answer # @trace return`),
  },
  'find-all-anagrams-in-a-string': {
    java: reference(`import java.util.*;

class Solution {
    public List<Integer> findAnagrams(String s, String p) {
        int[] need = new int[128], have = new int[128];
        for (char c : p.toCharArray()) need[c]++;
        int left = 0, missing = p.length(); List<Integer> answer = new ArrayList<>(); // @trace init
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (have[c] < need[c]) missing--;
            have[c]++; // @trace expand
            if (right - left + 1 > p.length()) {
                char removed = s.charAt(left++);
                if (--have[removed] < need[removed]) missing++; // @trace shrink
            }
            if (right - left + 1 == p.length() && missing == 0) answer.add(left); // @trace collect
        }
        return answer; // @trace return
    }
}`, ascii),
    go: reference(`package main

func findAnagrams(s string, p string) []int {
    need, have := [128]int{}, [128]int{}
    for i := 0; i < len(p); i++ { need[p[i]]++ }
    left, missing, answer := 0, len(p), []int{} // @trace init
    for right := 0; right < len(s); right++ {
        c := s[right]
        if have[c] < need[c] { missing-- }
        have[c]++ // @trace expand
        if right-left+1 > len(p) {
            removed := s[left]; left++; have[removed]--
            if have[removed] < need[removed] { missing++ } // @trace shrink
        }
        if right-left+1 == len(p) && missing == 0 { answer = append(answer, left) } // @trace collect
    }
    return answer // @trace return
}`, ascii),
    python: reference(`class Solution:
    def findAnagrams(self, s: str, p: str) -> list[int]:
        need, have = [0] * 128, [0] * 128
        for c in p:
            need[ord(c)] += 1
        left, missing, answer = 0, len(p), [] # @trace init
        for right, char in enumerate(s):
            c = ord(char)
            if have[c] < need[c]:
                missing -= 1
            have[c] += 1 # @trace expand
            if right - left + 1 > len(p):
                removed = ord(s[left])
                left += 1
                have[removed] -= 1
                if have[removed] < need[removed]:
                    missing += 1 # @trace shrink
            if right - left + 1 == len(p) and missing == 0:
                answer.append(left) # @trace collect
        return answer # @trace return`, ascii),
  },
  'minimum-window-substring': {
    java: reference(`class Solution {
    public String minWindow(String s, String t) {
        int[] need = new int[128], have = new int[128];
        for (char c : t.toCharArray()) need[c]++;
        int left = 0, missing = t.length(), bestStart = 0, bestLength = Integer.MAX_VALUE; // @trace init
        if (t.isEmpty()) return "";
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (have[c] < need[c]) missing--;
            have[c]++; // @trace expand
            while (missing == 0) {
                if (right - left + 1 < bestLength) {
                    bestStart = left; bestLength = right - left + 1; // @trace best
                }
                char removed = s.charAt(left++);
                if (--have[removed] < need[removed]) missing++; // @trace shrink
            }
        }
        return bestLength == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLength); // @trace return
    }
}`, ascii),
    go: reference(`package main

func minWindow(s string, t string) string {
    need, have := [128]int{}, [128]int{}
    for i := 0; i < len(t); i++ { need[t[i]]++ }
    left, missing, bestStart, bestLength := 0, len(t), 0, len(s)+1 // @trace init
    if len(t) == 0 { return "" }
    for right := 0; right < len(s); right++ {
        c := s[right]
        if have[c] < need[c] { missing-- }
        have[c]++ // @trace expand
        for missing == 0 {
            if right-left+1 < bestLength {
                bestStart, bestLength = left, right-left+1 // @trace best
            }
            removed := s[left]; left++; have[removed]--
            if have[removed] < need[removed] { missing++ } // @trace shrink
        }
    }
    if bestLength > len(s) { return "" }
    return s[bestStart:bestStart+bestLength] // @trace return
}`, ascii),
    python: reference(`class Solution:
    def minWindow(self, s: str, t: str) -> str:
        need, have = [0] * 128, [0] * 128
        for c in t:
            need[ord(c)] += 1
        left, missing, bestStart, bestLength = 0, len(t), 0, len(s) + 1 # @trace init
        if not t:
            return ''
        for right, char in enumerate(s):
            c = ord(char)
            if have[c] < need[c]:
                missing -= 1
            have[c] += 1 # @trace expand
            while missing == 0:
                if right - left + 1 < bestLength:
                    bestStart, bestLength = left, right - left + 1 # @trace best
                removed = ord(s[left])
                left += 1
                have[removed] -= 1
                if have[removed] < need[removed]:
                    missing += 1 # @trace shrink
        return '' if bestLength > len(s) else s[bestStart:bestStart + bestLength] # @trace return`, ascii),
  },
  'longest-valid-parentheses': {
    java: reference(`import java.util.*;

class Solution {
    public int longestValidParentheses(String s) {
        Deque<Integer> stack = new ArrayDeque<>(); stack.push(-1); int best = 0; // @trace init
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == '(') {
                stack.push(i); // @trace push
            } else {
                stack.pop(); // @trace pop
                if (stack.isEmpty()) {
                    stack.push(i); // @trace reset
                } else {
                    best = Math.max(best, i - stack.peek()); // @trace measure
                }
            }
        }
        return best; // @trace return
    }
}`),
    go: reference(`package main

func longestValidParentheses(s string) int {
    stack, best := []int{-1}, 0 // @trace init
    for i := 0; i < len(s); i++ {
        if s[i] == '(' {
            stack = append(stack, i) // @trace push
        } else {
            stack = stack[:len(stack)-1] // @trace pop
            if len(stack) == 0 {
                stack = append(stack, i) // @trace reset
            } else {
                best = max(best, i-stack[len(stack)-1]) // @trace measure
            }
        }
    }
    return best // @trace return
}`, goVersion),
    python: reference(`class Solution:
    def longestValidParentheses(self, s: str) -> int:
        stack, best = [-1], 0 # @trace init
        for i, c in enumerate(s):
            if c == '(':
                stack.append(i) # @trace push
            else:
                stack.pop() # @trace pop
                if not stack:
                    stack.append(i) # @trace reset
                else:
                    best = max(best, i - stack[-1]) # @trace measure
        return best # @trace return`),
  },
  'decode-string': {
    java: reference(`import java.util.*;

class Solution {
    public String decodeString(String s) {
        Deque<String> prefixes = new ArrayDeque<>(); Deque<Integer> counts = new ArrayDeque<>();
        StringBuilder text = new StringBuilder(); int count = 0; // @trace init
        for (char c : s.toCharArray()) {
            if (c >= '0' && c <= '9') {
                count = count * 10 + c - '0'; // @trace digit
            } else if (c == '[') {
                prefixes.push(text.toString()); counts.push(count);
                text = new StringBuilder(); count = 0; // @trace push
            } else if (c == ']') {
                String segment = text.toString(); int repeat = counts.pop();
                text = new StringBuilder(prefixes.pop());
                for (int i = 0; i < repeat; i++) text.append(segment); // @trace expand
            } else {
                text.append(c); // @trace append
            }
        }
        return text.toString(); // @trace return
    }
}`, '输入先经过语法、嵌套深度、次数和展开长度校验；逐次追加片段，兼容 JDK 8+。'),
    go: reference(`package main

import "strings"

func decodeString(s string) string {
    prefixes, counts := []string{}, []int{}
    text, count := "", 0 // @trace init
    for i := 0; i < len(s); i++ {
        c := s[i]
        if c >= '0' && c <= '9' {
            count = count*10 + int(c-'0') // @trace digit
        } else if c == '[' {
            prefixes = append(prefixes, text); counts = append(counts, count)
            text, count = "", 0 // @trace push
        } else if c == ']' {
            last := len(counts)-1
            text = prefixes[last] + strings.Repeat(text, counts[last]) // @trace expand
            prefixes, counts = prefixes[:last], counts[:last]
        } else {
            text += string(c) // @trace append
        }
    }
    return text // @trace return
}`, '输入先经过语法、嵌套深度、次数和展开长度校验。'),
    python: reference(`class Solution:
    def decodeString(self, s: str) -> str:
        stack, text, count = [], '', 0 # @trace init
        for c in s:
            if '0' <= c <= '9':
                count = count * 10 + int(c) # @trace digit
            elif c == '[':
                stack.append((text, count))
                text, count = '', 0 # @trace push
            elif c == ']':
                prefix, repeat = stack.pop()
                text = prefix + text * repeat # @trace expand
            else:
                text += c # @trace append
        return text # @trace return`, '输入先经过语法、嵌套深度、次数和展开长度校验。'),
  },
};
