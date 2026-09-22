import type { CodeLanguage, ProblemId } from '../src/engine/types';

type Literal = (value: unknown, language: CodeLanguage, nullableArray?: boolean, stringArray?: boolean, matrix?: boolean) => string;
const methods: Partial<Record<ProblemId, string>> = {
  'intersection-of-two-linked-lists': 'getIntersectionNode', 'palindrome-linked-list': 'isPalindrome',
  'linked-list-cycle': 'hasCycle', 'linked-list-cycle-ii': 'detectCycle', 'merge-two-sorted-lists': 'mergeTwoLists',
  'add-two-numbers': 'addTwoNumbers', 'remove-nth-node-from-end-of-list': 'removeNthFromEnd',
  'swap-nodes-in-pairs': 'swapPairs', 'reverse-nodes-in-k-group': 'reverseKGroup', 'copy-list-with-random-pointer': 'copyRandomList',
};
export function linkedListInvocation(id: ProblemId, input: unknown, language: CodeLanguage, literal: Literal): string | undefined {
  if (!(id in methods)) return;
  const data = input as Record<string, unknown>, value = (v: unknown) => literal(v, language);
  const call = (name: string, args: string[]) => `${language === 'java' ? 'new Solution().' : language === 'python' ? 'Solution().' : ''}${name}(${args.join(', ')})`;
  if (id === 'intersection-of-two-linked-lists') return `intersectionResult(${[data.prefixA, data.prefixB, data.shared].map(value).join(', ')})`;
  if (id === 'linked-list-cycle-ii') return `cycleResult(${value(data.values)}, ${value(data.pos)})`;
  if (id === 'linked-list-cycle') return call('hasCycle', [`buildCycle(${value(data.values)}, ${value(data.pos)})`]);
  if (id === 'copy-list-with-random-pointer') {
    const nodes = data.nodes as [number, number | null][];
    return `copyResult(${value(nodes.map(([v]) => v))}, ${value(nodes.map(([, r]) => r ?? -1))})`;
  }
  if (id === 'palindrome-linked-list') return `palindromeResult(${value(data.values)})`;
  const args = id === 'merge-two-sorted-lists' || id === 'add-two-numbers'
    ? [data.a, data.b].map((v) => `buildList(${value(v)})`) : [`buildList(${value(data.values)})`];
  if (id === 'remove-nth-node-from-end-of-list') args.push(value(data.n));
  if (id === 'reverse-nodes-in-k-group') args.push(value(data.k));
  return `collectList(${call(methods[id]!, args)})`;
}

const javaList = `
  static ListNode buildList(int[] values) {
    ListNode dummy = new ListNode(0), tail = dummy;
    for (int value : values) { tail.next = new ListNode(value); tail = tail.next; }
    return dummy.next;
  }
  static java.util.List<ListNode> listNodes(ListNode head) {
    java.util.List<ListNode> nodes = new java.util.ArrayList<>();
    java.util.Set<ListNode> seen = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
    for (ListNode p = head; p != null; p = p.next) {
      if (!seen.add(p) || nodes.size() > 100) throw new AssertionError("Unexpected cycle or excess nodes");
      nodes.add(p);
    }
    return nodes;
  }
  static java.util.List<Integer> collectList(ListNode head) {
    java.util.List<Integer> result = new java.util.ArrayList<>();
    for (ListNode node : listNodes(head)) result.add(node.val);
    return result;
  }
`;
const goList = `
  func buildList(values []int) *ListNode {
    dummy := &ListNode{}; tail := dummy
    for _, value := range values { tail.Next = &ListNode{Val:value}; tail = tail.Next }
    return dummy.Next
  }
  func listNodes(head *ListNode) []*ListNode {
    result, seen := []*ListNode{}, map[*ListNode]bool{}
    for p := head; p != nil; p = p.Next {
      if seen[p] || len(result) > 100 { panic("Unexpected cycle or excess nodes") }
      seen[p] = true; result = append(result, p)
    }
    return result
  }
  func collectList(head *ListNode) []int {
    result := []int{}
    for _, node := range listNodes(head) { result = append(result, node.Val) }
    return result
  }
`;
const pythonList = `
def buildList(values):
    dummy = ListNode()
    tail = dummy
    for value in values:
        tail.next = ListNode(value)
        tail = tail.next
    return dummy.next

def listNodes(head):
    result, seen = [], set()
    while head is not None:
        if head in seen or len(result) > 100:
            raise AssertionError('Unexpected cycle or excess nodes')
        seen.add(head)
        result.append(head)
        head = head.next
    return result

def collectList(head):
    return [node.val for node in listNodes(head)]
`;
const javaCycle = `
  static ListNode buildCycle(int[] values, int pos) {
    ListNode head = buildList(values);
    java.util.List<ListNode> nodes = listNodes(head);
    if (pos >= 0) nodes.get(nodes.size()-1).next = nodes.get(pos);
    return head;
  }
`;
const goCycle = `
  func buildCycle(values []int, pos int) *ListNode {
    head := buildList(values); nodes := listNodes(head)
    if pos >= 0 { nodes[len(nodes)-1].Next = nodes[pos] }
    return head
  }
`;
const pythonCycle = `
def buildCycle(values, pos):
    head = buildList(values)
    nodes = listNodes(head)
    if pos >= 0:
        nodes[-1].next = nodes[pos]
    return head
`;

const javaExtra: Partial<Record<ProblemId, string>> = {
  'intersection-of-two-linked-lists': `
  static ListNode attach(ListNode head, ListNode shared) {
    if (head == null) return shared;
    ListNode tail = head; while (tail.next != null) tail = tail.next;
    tail.next = shared; return head;
  }
  static Object intersectionResult(int[] a, int[] b, int[] common) {
    ListNode shared = buildList(common), headA = attach(buildList(a), shared), headB = attach(buildList(b), shared);
    java.util.List<ListNode> beforeA = listNodes(headA), beforeB = listNodes(headB);
    ListNode answer = new Solution().getIntersectionNode(headA, headB);
    if (!beforeA.equals(listNodes(headA)) || !beforeB.equals(listNodes(headB))) throw new AssertionError("Inputs changed");
    if (answer == null) return null;
    int ia = beforeA.indexOf(answer), ib = beforeB.indexOf(answer);
    if (ia < 0 || ib < 0) throw new AssertionError("Answer is not shared by identity");
    java.util.Map<String,Integer> result = new java.util.LinkedHashMap<>();
    result.put("indexA", ia); result.put("indexB", ib); result.put("value", answer.val); return result;
  }`,
  'linked-list-cycle-ii': `
  static Integer cycleResult(int[] values, int pos) {
    ListNode head = buildCycle(values, pos), answer = new Solution().detectCycle(head);
    if (answer == null) return null;
    ListNode current = head;
    for (int i = 0; i < values.length; i++, current = current.next) if (current == answer) return i;
    throw new AssertionError("Answer is not an input node");
  }`,
  'palindrome-linked-list': `
  static boolean palindromeResult(int[] values) {
    ListNode head = buildList(values); java.util.List<ListNode> before = listNodes(head);
    boolean result = new Solution().isPalindrome(head);
    if (!before.equals(listNodes(head))) throw new AssertionError("Input links not restored");
    for (int i = 0; i < values.length; i++) if (before.get(i).val != values[i]) throw new AssertionError("Input values changed");
    return result;
  }`,
};
const goExtra: Partial<Record<ProblemId, string>> = {
  'intersection-of-two-linked-lists': `
  func attach(head *ListNode, shared *ListNode) *ListNode {
    if head == nil { return shared }; tail := head
    for tail.Next != nil { tail = tail.Next }; tail.Next = shared; return head
  }
  func intersectionResult(a []int, b []int, common []int) map[string]int {
    shared := buildList(common); headA, headB := attach(buildList(a), shared), attach(buildList(b), shared)
    beforeA, beforeB := listNodes(headA), listNodes(headB)
    answer := getIntersectionNode(headA, headB)
    afterA, afterB := listNodes(headA), listNodes(headB)
    if len(beforeA) != len(afterA) || len(beforeB) != len(afterB) { panic("Inputs changed") }
    for i := range beforeA { if beforeA[i] != afterA[i] { panic("Inputs changed") } }
    for i := range beforeB { if beforeB[i] != afterB[i] { panic("Inputs changed") } }
    if answer == nil { return nil }; ia, ib := -1, -1
    for i, node := range beforeA { if node == answer { ia = i } }
    for i, node := range beforeB { if node == answer { ib = i } }
    if ia < 0 || ib < 0 { panic("Answer is not shared by identity") }
    return map[string]int{"indexA":ia, "indexB":ib, "value":answer.Val}
  }`,
  'linked-list-cycle-ii': `
  func cycleResult(values []int, pos int) *int {
    head := buildCycle(values, pos); answer := detectCycle(head)
    if answer == nil { return nil }; current := head
    for i := 0; i < len(values); i++ { if current == answer { index := i; return &index }; current = current.Next }
    panic("Answer is not an input node")
  }`,
  'palindrome-linked-list': `
  func palindromeResult(values []int) bool {
    head := buildList(values); before := listNodes(head); result := isPalindrome(head); after := listNodes(head)
    if len(before) != len(after) { panic("Input links not restored") }
    for i := range before { if before[i] != after[i] || before[i].Val != values[i] { panic("Input changed") } }
    return result
  }`,
};
const pythonExtra: Partial<Record<ProblemId, string>> = {
  'intersection-of-two-linked-lists': `
def attach(head, shared):
    if head is None:
        return shared
    tail = head
    while tail.next is not None:
        tail = tail.next
    tail.next = shared
    return head

def intersectionResult(a, b, common):
    shared = buildList(common)
    headA, headB = attach(buildList(a), shared), attach(buildList(b), shared)
    beforeA, beforeB = listNodes(headA), listNodes(headB)
    answer = Solution().getIntersectionNode(headA, headB)
    assert beforeA == listNodes(headA) and beforeB == listNodes(headB), 'Inputs changed'
    if answer is None:
        return None
    assert answer in beforeA and answer in beforeB, 'Answer is not shared by identity'
    return {'indexA': beforeA.index(answer), 'indexB': beforeB.index(answer), 'value': answer.val}
`,
  'linked-list-cycle-ii': `
def cycleResult(values, pos):
    head = buildCycle(values, pos)
    answer = Solution().detectCycle(head)
    if answer is None:
        return None
    current = head
    for i in range(len(values)):
        if current is answer:
            return i
        current = current.next
    raise AssertionError('Answer is not an input node')
`,
  'palindrome-linked-list': `
def palindromeResult(values):
    head = buildList(values)
    before = listNodes(head)
    result = Solution().isPalindrome(head)
    assert before == listNodes(head), 'Input links not restored'
    assert [node.val for node in before] == values, 'Input values changed'
    return result
`,
};

const javaCopy = `
  static Object copyResult(int[] values, int[] targets) {
    Node[] originals = new Node[values.length];
    for (int i = 0; i < values.length; i++) originals[i] = new Node(values[i]);
    for (int i = 0; i < values.length; i++) {
      originals[i].next = i+1 < values.length ? originals[i+1] : null;
      originals[i].random = targets[i] < 0 ? null : originals[targets[i]];
    }
    Node head = new Solution().copyRandomList(values.length == 0 ? null : originals[0]);
    java.util.List<Node> copies = new java.util.ArrayList<>();
    for (Node p = head; p != null; p = p.next) {
      if (copies.contains(p) || copies.size() >= values.length || java.util.Arrays.asList(originals).contains(p)) throw new AssertionError("Invalid copy identity");
      copies.add(p);
    }
    if (copies.size() != values.length) throw new AssertionError("Copy length mismatch");
    java.util.List<java.util.List<Integer>> result = new java.util.ArrayList<>();
    for (int i = 0; i < values.length; i++) {
      if (originals[i].val != values[i] || originals[i].next != (i+1 < values.length ? originals[i+1] : null) || originals[i].random != (targets[i] < 0 ? null : originals[targets[i]])) throw new AssertionError("Original mutated");
      Node copy = copies.get(i); Integer target = copy.random == null ? null : copies.indexOf(copy.random);
      if (target != null && target < 0) throw new AssertionError("Random escapes copied list");
      result.add(java.util.Arrays.asList(copy.val, target));
    }
    return result;
  }
`;
const goCopy = `
  func copyResult(values []int, targets []int) [][]any {
    originals := make([]*Node, len(values)); old := map[*Node]bool{}
    for i, value := range values { originals[i] = &Node{Val:value}; old[originals[i]] = true }
    for i := range values {
      if i+1 < len(values) { originals[i].Next = originals[i+1] }
      if targets[i] >= 0 { originals[i].Random = originals[targets[i]] }
    }
    var head *Node; if len(originals) > 0 { head = originals[0] }; copied := copyRandomList(head)
    copies, indices := []*Node{}, map[*Node]int{}
    for p := copied; p != nil; p = p.Next {
      _, repeated := indices[p]
      if repeated || old[p] || len(copies) >= len(values) { panic("Invalid copy identity") }
      indices[p] = len(copies); copies = append(copies, p)
    }
    if len(copies) != len(values) { panic("Copy length mismatch") }; result := [][]any{}
    for i, copy := range copies {
      var next, random *Node; if i+1 < len(values) { next = originals[i+1] }; if targets[i] >= 0 { random = originals[targets[i]] }
      if originals[i].Val != values[i] || originals[i].Next != next || originals[i].Random != random { panic("Original mutated") }
      var target any
      if copy.Random != nil { index, ok := indices[copy.Random]; if !ok { panic("Random escapes copied list") }; target = index }
      result = append(result, []any{copy.Val, target})
    }
    return result
  }
`;
const pythonCopy = `
def copyResult(values, targets):
    originals = [Node(value) for value in values]
    for i, node in enumerate(originals):
        node.next = originals[i+1] if i+1 < len(values) else None
        node.random = originals[targets[i]] if targets[i] >= 0 else None
    head = Solution().copyRandomList(originals[0] if originals else None)
    copies, seen = [], set()
    while head is not None:
        assert head not in seen and head not in originals and len(copies) < len(values), 'Invalid copy identity'
        seen.add(head)
        copies.append(head)
        head = head.next
    assert len(copies) == len(values), 'Copy length mismatch'
    result = []
    for i, copy in enumerate(copies):
        assert originals[i].val == values[i], 'Original value changed'
        assert originals[i].next is (originals[i+1] if i+1 < len(values) else None), 'Original next changed'
        assert originals[i].random is (originals[targets[i]] if targets[i] >= 0 else None), 'Original random changed'
        assert copy.random is None or copy.random in copies, 'Random escapes copied list'
        result.append([copy.val, copies.index(copy.random) if copy.random is not None else None])
    return result
`;

export const linkedJavaHelpers: Partial<Record<ProblemId, string>> = {};
export const linkedGoHelpers: Partial<Record<ProblemId, string>> = {};
export const linkedPythonHelpers: Partial<Record<ProblemId, string>> = {};
for (const id of Object.keys(methods) as ProblemId[]) {
  const cycle = id === 'linked-list-cycle' || id === 'linked-list-cycle-ii';
  linkedJavaHelpers[id] = id === 'copy-list-with-random-pointer' ? javaCopy : javaList + (cycle ? javaCycle : '') + (javaExtra[id] ?? '');
  linkedGoHelpers[id] = id === 'copy-list-with-random-pointer' ? goCopy : goList + (cycle ? goCycle : '') + (goExtra[id] ?? '');
  linkedPythonHelpers[id] = id === 'copy-list-with-random-pointer' ? pythonCopy : pythonList + (cycle ? pythonCycle : '') + (pythonExtra[id] ?? '');
}
