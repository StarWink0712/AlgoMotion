// Compile and run only the repository's trusted reference snippets, never user/model code.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { deepStrictEqual } from 'node:assert';
import { references } from '../src/engine/references';
import { codeLanguages, type CodeLanguage, type ProblemId } from '../src/engine/types';
import { cases } from './reference-cases';
import { linkedListInvocation, linkedJavaHelpers, linkedGoHelpers, linkedPythonHelpers } from './linked-list-native';
import { treeInvocation, treeNativeMethods, treeNativeHelpers } from './tree-native';
import { advancedInvocation, advancedNativeMethods, advancedNativeHelpers } from './advanced-native';
import { explorationInvocation, explorationNativeMethods, explorationNativeHelpers } from './exploration-native';
import { orderingStructuresInvocation, orderingStructuresMethods, orderingStructuresHelpers } from './ordering-structures-native';
import { dpGreedyInvocation, dpGreedyMethods } from './dp-greedy-native';
import { finalSixInvocation, finalSixMethods, duplicateHelpers } from './final-six-native';

const methods: Record<ProblemId, string> = {
  ...finalSixMethods,
  ...dpGreedyMethods,
  ...orderingStructuresMethods,
  ...explorationNativeMethods,
  ...advancedNativeMethods,
  ...treeNativeMethods,
  'intersection-of-two-linked-lists': 'getIntersectionNode', 'palindrome-linked-list': 'isPalindrome',
  'linked-list-cycle': 'hasCycle', 'linked-list-cycle-ii': 'detectCycle', 'merge-two-sorted-lists': 'mergeTwoLists',
  'add-two-numbers': 'addTwoNumbers', 'remove-nth-node-from-end-of-list': 'removeNthFromEnd',
  'swap-nodes-in-pairs': 'swapPairs', 'reverse-nodes-in-k-group': 'reverseKGroup', 'copy-list-with-random-pointer': 'copyRandomList',
  'valid-parentheses': 'isValid', 'min-stack': 'runOperations', 'daily-temperatures': 'dailyTemperatures',
  'largest-rectangle-in-histogram': 'largestRectangleArea', 'trapping-rain-water': 'trap',
  'sliding-window-maximum': 'maxSlidingWindow', 'find-all-anagrams-in-a-string': 'findAnagrams',
  'minimum-window-substring': 'minWindow', 'longest-valid-parentheses': 'longestValidParentheses', 'decode-string': 'decodeString',
  '3sum': 'threeSum', 'sort-colors': 'sortColors', 'rotate-array': 'rotate',
  'next-permutation': 'nextPermutation', 'merge-intervals': 'merge',
  'group-anagrams': 'groupAnagrams', 'longest-consecutive-sequence': 'longestConsecutive',
  'product-of-array-except-self': 'productExceptSelf', 'subarray-sum-equals-k': 'subarraySum',
  'search-insert-position': 'searchInsert',
  'find-first-and-last-position-of-element-in-sorted-array': 'searchRange',
  'search-in-rotated-sorted-array': 'search',
  'best-time-to-buy-and-sell-stock': 'maxProfit', 'jump-game': 'canJump',
  'two-sum': 'twoSum', 'move-zeroes': 'moveZeroes', 'container-with-most-water': 'maxArea',
  'longest-substring-without-repeating-characters': 'lengthOfLongestSubstring',
  'maximum-subarray': 'maxSubArray', 'reverse-linked-list': 'reverseList',
  'binary-tree-level-order-traversal': 'levelOrder', 'climbing-stairs': 'climbStairs',
  'coin-change': 'coinChange', 'longest-increasing-subsequence': 'lengthOfLIS',
};
const selection = process.argv[2] ?? 'all';
if (selection !== 'all' && !codeLanguages.includes(selection as CodeLanguage)) throw new Error('Use java, go, python, or all.');
const languages = selection === 'all' ? codeLanguages : [selection as CodeLanguage];
const scratch = mkdtempSync(join(tmpdir(), 'algomotion-references-'));
let checked = 0;

function command(bin: string, args: string[], cwd: string) {
  const result = spawnSync(bin, args, {
    cwd, encoding: 'utf8', timeout: 60_000, maxBuffer: 4_000_000,
    env: { ...process.env, GOTOOLCHAIN: 'local', GOCACHE: join(scratch, 'go-cache'), PYTHONIOENCODING: 'utf-8' },
  });
  if (result.error || result.status !== 0) throw new Error(`${bin} ${args.join(' ')} failed:\n${result.error?.message ?? ''}\n${result.stderr}`);
  return result.stdout.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

function literal(value: unknown, language: CodeLanguage, nullableArray = false, stringArray = false, matrix = false): string {
  if (Array.isArray(value)) {
    const items = value.map((item) => literal(item, language)).join(',');
    if (language === 'java') return `new ${stringArray ? 'String' : nullableArray ? 'Integer' : 'int'}${matrix ? '[][]' : '[]'}{${items}}`;
    if (language === 'go') return `${matrix ? '[][]' : '[]'}${stringArray ? 'string' : nullableArray ? 'any' : 'int'}{${items}}`;
    return `[${items}]`;
  }
  if (value === null) return language === 'python' ? 'None' : language === 'go' ? 'nil' : 'null';
  return JSON.stringify(value);
}

function invocation(id: ProblemId, input: unknown, language: CodeLanguage): string {
  const finalSix = finalSixInvocation(id, input, language, literal);
  if (finalSix !== undefined) return finalSix;
  const dpGreedy = dpGreedyInvocation(id, input, language, literal);
  if (dpGreedy !== undefined) return dpGreedy;
  const ordering = orderingStructuresInvocation(id, input, language, literal);
  if (ordering !== undefined) return ordering;
  const exploration = explorationInvocation(id, input, language, literal);
  if (exploration !== undefined) return exploration;
  const advanced = advancedInvocation(id, input, language, literal);
  if (advanced !== undefined) return advanced;
  const tree = treeInvocation(id, input, language, literal);
  if (tree !== undefined) return tree;
  const linked = linkedListInvocation(id, input, language, literal);
  if (linked !== undefined) return linked;
  const data = input as Record<string, unknown>;
  let args: string[];
  if (id === 'reverse-linked-list') args = [`buildList(${literal(data.values, language)})`];
  else if (id === 'min-stack') {
    const ops = data.operations as { op: string; value?: number }[];
    args = [literal(ops.map((op) => op.op), language, false, true), literal(ops.map((op) => op.value ?? 0), language)];
  }
  else if (id === 'group-anagrams') args = [literal(data.strs, language, false, true)];
  else if (id === 'merge-intervals') args = [literal(data.intervals, language, false, false, true)];
  else if (id === 'binary-tree-level-order-traversal') args = [`buildTree(${literal(data.tree, language, true)})`];
  else args = Object.values(data).map((value) => literal(value, language));
  const prefix = language === 'java' ? 'new Solution().' : language === 'python' ? 'Solution().' : '';
  const call = `${prefix}${methods[id]}(${args.join(', ')})`;
  return id === 'reverse-linked-list' ? `collectList(${call})` : call;
}

const javaOutput = String.raw`
  static String json(Object value) {
    if (value == null) return "null";
    if (value instanceof String) return "\"" + ((String) value)
        .replace("\\", "\\\\").replace("\"", "\\\"")
        .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
    if (value.getClass().isArray()) {
      java.util.StringJoiner out = new java.util.StringJoiner(",", "[", "]");
      for (int i = 0; i < java.lang.reflect.Array.getLength(value); i++)
        out.add(json(java.lang.reflect.Array.get(value, i)));
      return out.toString();
    }
    if (value instanceof Iterable<?>) {
      java.util.StringJoiner out = new java.util.StringJoiner(",", "[", "]");
      for (Object item : (Iterable<?>) value) out.add(json(item));
      return out.toString();
    }
    if (value instanceof java.util.Map<?, ?>) {
      java.util.StringJoiner out = new java.util.StringJoiner(",", "{", "}");
      for (java.util.Map.Entry<?, ?> entry : ((java.util.Map<?, ?>) value).entrySet()) out.add(json(entry.getKey()) + ":" + json(entry.getValue()));
      return out.toString();
    }
    return value.toString();
  }
  static void output(Object value) { System.out.println(json(value)); }
`;

const javaHelpers: Partial<Record<ProblemId, string>> = {
  'find-the-duplicate-number': duplicateHelpers.java,
  ...linkedJavaHelpers,
  'reverse-linked-list': `static ListNode buildList(int[] values) {
    ListNode dummy = new ListNode(0), tail = dummy;
    for (int value : values) { tail.next = new ListNode(value); tail = tail.next; }
    return dummy.next;
  }
  static java.util.List<Integer> collectList(ListNode head) {
    java.util.List<Integer> result = new java.util.ArrayList<>();
    for (; head != null; head = head.next) result.add(head.val);
    return result;
  }`,
  'binary-tree-level-order-traversal': `static TreeNode buildTree(Integer[] values) {
    if (values.length == 0 || values[0] == null) return null;
    TreeNode root = new TreeNode(values[0]);
    java.util.List<TreeNode> queue = new java.util.ArrayList<>(); queue.add(root);
    int pos = 1;
    for (int head = 0; head < queue.size() && pos < values.length; head++) {
      TreeNode node = queue.get(head);
      Integer left = values[pos++];
      if (left != null) { node.left = new TreeNode(left); queue.add(node.left); }
      if (pos < values.length) {
        Integer right = values[pos++];
        if (right != null) { node.right = new TreeNode(right); queue.add(node.right); }
      }
    }
    return root;
  }`,
};

const pythonHelpers: Partial<Record<ProblemId, string>> = {
  'find-the-duplicate-number': duplicateHelpers.python,
  ...linkedPythonHelpers,
  'reverse-linked-list': `def buildList(values):
    head = None
    for value in reversed(values):
        head = ListNode(value, head)
    return head
def collectList(head):
    result = []
    while head is not None:
        result.append(head.val)
        head = head.next
    return result`,
  'binary-tree-level-order-traversal': `def buildTree(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue, pos = [root], 1
    for node in queue:
        for side in ("left", "right"):
            if pos >= len(values):
                return root
            value = values[pos]
            pos += 1
            if value is not None:
                child = TreeNode(value)
                setattr(node, side, child)
                queue.append(child)
    return root`,
};

const goHelpers: Partial<Record<ProblemId, string>> = {
  'find-the-duplicate-number': duplicateHelpers.go,
  ...linkedGoHelpers,
  'reverse-linked-list': `func buildList(values []int) *ListNode {
    dummy := &ListNode{}; tail := dummy
    for _, value := range values { tail.Next = &ListNode{Val: value}; tail = tail.Next }
    return dummy.Next
  }
  func collectList(head *ListNode) []int {
    result := []int{}
    for ; head != nil; head = head.Next { result = append(result, head.Val) }
    return result
  }`,
  'binary-tree-level-order-traversal': `func buildTree(values []any) *TreeNode {
    if len(values) == 0 || values[0] == nil { return nil }
    root := &TreeNode{Val: values[0].(int)}
    queue := []*TreeNode{root}; pos := 1
    for head := 0; head < len(queue) && pos < len(values); head++ {
      node := queue[head]
      left := values[pos]; pos++
      if left != nil { node.Left = &TreeNode{Val: left.(int)}; queue = append(queue, node.Left) }
      if pos < len(values) {
        right := values[pos]; pos++
        if right != nil { node.Right = &TreeNode{Val: right.(int)}; queue = append(queue, node.Right) }
      }
    }
    return root
  }`,
};

for (const id of Object.keys(treeNativeMethods) as (keyof typeof treeNativeMethods)[]) {
  javaHelpers[id] = javaHelpers['binary-tree-level-order-traversal']! + treeNativeHelpers(id, 'java');
  goHelpers[id] = goHelpers['binary-tree-level-order-traversal']! + treeNativeHelpers(id, 'go');
  pythonHelpers[id] = pythonHelpers['binary-tree-level-order-traversal']! + treeNativeHelpers(id, 'python');
}

for (const id of Object.keys(advancedNativeMethods) as (keyof typeof advancedNativeMethods)[]) {
  const tree = ['construct-binary-tree-from-preorder-and-inorder-traversal', 'path-sum-iii', 'lowest-common-ancestor-of-a-binary-tree', 'binary-tree-maximum-path-sum'].includes(id);
  for (const [language, helpers] of [['java', javaHelpers], ['go', goHelpers], ['python', pythonHelpers]] as const) {
    helpers[id] = (tree ? helpers['binary-tree-level-order-traversal']! + treeNativeHelpers('binary-tree-inorder-traversal', language) : '') + advancedNativeHelpers(id, language);
  }
}

for (const id of Object.keys(explorationNativeMethods) as (keyof typeof explorationNativeMethods)[]) {
  javaHelpers[id] = explorationNativeHelpers(id, 'java');
  goHelpers[id] = explorationNativeHelpers(id, 'go');
  pythonHelpers[id] = explorationNativeHelpers(id, 'python');
}

for (const id of Object.keys(orderingStructuresMethods) as (keyof typeof orderingStructuresMethods)[]) {
  javaHelpers[id] = orderingStructuresHelpers(id, 'java');
  goHelpers[id] = orderingStructuresHelpers(id, 'go');
  pythonHelpers[id] = orderingStructuresHelpers(id, 'python');
}

try {
  for (const language of languages) {
    for (const id of Object.keys(references) as ProblemId[]) {
      const source = references[id][language].lines.join('\n');
      const dir = join(scratch, `${language}-${id}`); mkdirSync(dir);
      const fixtures = cases.filter(([key]) => key === id);
      let actual: unknown[];
      if (language === 'java') {
        writeFileSync(join(dir, 'Solution.java'), source);
        writeFileSync(join(dir, 'Runner.java'), `class Runner {
          ${javaHelpers[id] ?? ''}
          ${javaOutput}
          public static void main(String[] args) {
            ${fixtures.map(([, input]) => `output(${invocation(id, input, language)});`).join('\n')}
          }
        }`);
        command(process.env.JAVAC_BIN ?? 'javac', ['-encoding', 'UTF-8', 'Solution.java', 'Runner.java'], dir);
        actual = command(process.env.JAVA_BIN ?? 'java', ['-cp', '.', 'Runner'], dir);
      } else if (language === 'go') {
        writeFileSync(join(dir, 'solution.go'), source);
        writeFileSync(join(dir, 'runner.go'), `package main
          import ("encoding/json"; "fmt")
          ${goHelpers[id] ?? ''}
          func output(value any) { bytes, err := json.Marshal(value); if err != nil { panic(err) }; fmt.Println(string(bytes)) }
          func main() { ${fixtures.map(([, input]) => `output(${invocation(id, input, language)})`).join('\n')} }
        `);
        actual = command(process.env.GO_BIN ?? 'go', ['run', 'solution.go', 'runner.go'], dir);
      } else {
        writeFileSync(join(dir, 'solution.py'), `${source}\nimport json\n${pythonHelpers[id] ?? ''}\n${fixtures.map(([, input]) => `print(json.dumps(${invocation(id, input, language)}))`).join('\n')}\n`);
        actual = command(process.env.PYTHON_BIN ?? (process.platform === 'win32' ? 'python' : 'python3'), ['solution.py'], dir);
      }
      deepStrictEqual(actual, fixtures.map(([, , expected]) => expected), `${language}/${id}`);
      checked += fixtures.length;
      console.log(`PASS ${language}/${id}: ${fixtures.length} cases`);
    }
  }
  console.log(`Verified ${checked} cases across ${languages.length * Object.keys(references).length} compiled/interpreted reference implementations.`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
