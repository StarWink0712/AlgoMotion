import { reference } from '../reference';
import type { CodeLanguage, ReferenceCode } from '../types';
import type { LinkedListId } from './linked-lists';

export function listReference(java: string, go: string, python: string, note = '', random = false): Record<CodeLanguage, ReferenceCode> {
  const type = random ? 'Node' : 'ListNode';
  const detail = `节点类型附在代码中；平台已提供时省略重复定义。${note}`;
  return {
    java: reference(`import java.util.*;

class ${type} {
    int val;
    ${type} next;${random ? '\n    Node random;' : ''}
    ${type}(int val) { this.val = val; }
}

class Solution {
${java}
}`, detail),
    go: reference(`package main

type ${type} struct {
    Val int
    Next *${type}${random ? '\n    Random *Node' : ''}
}

${go}`, detail),
    python: reference(`class ${type}:
    def __init__(self, val=0, next=None${random ? ', random=None' : ''}):
        self.val = val
        self.next = next${random ? '\n        self.random = random' : ''}


class Solution:
${python}`, detail),
  };
}

export const linkedListReferences: Record<LinkedListId, Record<CodeLanguage, ReferenceCode>> = {
  'intersection-of-two-linked-lists': listReference(
`    public ListNode getIntersectionNode(ListNode headA, ListNode headB) {
        ListNode p = headA, q = headB; // @trace init
        while (p != q) {
            p = p == null ? headB : p.next;
            q = q == null ? headA : q.next; // @trace advance
        }
        ListNode answer = p; // @trace meet
        return answer; // @trace return
    }`,
`func getIntersectionNode(headA *ListNode, headB *ListNode) *ListNode {
    p, q := headA, headB // @trace init
    for p != q {
        if p == nil { p = headB } else { p = p.Next }
        if q == nil { q = headA } else { q = q.Next } // @trace advance
    }
    answer := p // @trace meet
    return answer // @trace return
}`,
`    def getIntersectionNode(self, headA, headB):
        p, q = headA, headB # @trace init
        while p is not q:
            p = headB if p is None else p.next
            q = headA if q is None else q.next # @trace advance
        answer = p # @trace meet
        return answer # @trace return`,
    '返回真实节点引用；演示适配器将其序列化为 {indexA,indexB,value}，不存在则为 null。'),

  'linked-list-cycle': listReference(
`    public boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head; boolean found = false; // @trace init
        while (fast != null && fast.next != null) {
            slow = slow.next; fast = fast.next.next; // @trace advance
            if (slow == fast) { found = true; break; } // @trace check
        }
        return found; // @trace return
    }`,
`func hasCycle(head *ListNode) bool {
    slow, fast, found := head, head, false // @trace init
    for fast != nil && fast.Next != nil {
        slow, fast = slow.Next, fast.Next.Next // @trace advance
        if slow == fast { found = true; break } // @trace check
    }
    return found // @trace return
}`,
`    def hasCycle(self, head) -> bool:
        slow, fast, found = head, head, False # @trace init
        while fast is not None and fast.next is not None:
            slow, fast = slow.next, fast.next.next # @trace advance
            if slow is fast: # @trace check
                found = True
                break
        return found # @trace return`,
    'pos 只用于构造测试链表，算法本身不接收或读取 pos。'),

  'linked-list-cycle-ii': listReference(
`    public ListNode detectCycle(ListNode head) {
        ListNode slow = head, fast = head; boolean found = false; // @trace init
        while (fast != null && fast.next != null) {
            slow = slow.next; fast = fast.next.next; // @trace advance
            if (slow == fast) { found = true; break; } // @trace check
        }
        ListNode entry = found ? head : null; // @trace reset
        if (found) {
            while (entry != slow) {
                entry = entry.next; slow = slow.next; // @trace seek-entry
            }
        }
        return entry; // @trace return
    }`,
`func detectCycle(head *ListNode) *ListNode {
    slow, fast, found := head, head, false // @trace init
    for fast != nil && fast.Next != nil {
        slow, fast = slow.Next, fast.Next.Next // @trace advance
        if slow == fast { found = true; break } // @trace check
    }
    var entry *ListNode
    if found {
        entry = head // @trace reset
        for entry != slow {
            entry, slow = entry.Next, slow.Next // @trace seek-entry
        }
    }
    return entry // @trace return
}`,
`    def detectCycle(self, head):
        slow, fast, found = head, head, False # @trace init
        while fast is not None and fast.next is not None:
            slow, fast = slow.next, fast.next.next # @trace advance
            if slow is fast: # @trace check
                found = True
                break
        entry = head if found else None # @trace reset
        if found:
            while entry is not slow:
                entry, slow = entry.next, slow.next # @trace seek-entry
        return entry # @trace return`,
    '返回环入口节点；演示输出它在输入 values 中的下标，无环为 null。pos 仅用于构造输入。'),

  'palindrome-linked-list': listReference(
`    public boolean isPalindrome(ListNode head) {
        ListNode slow = head, fast = head; boolean valid = true; // @trace init
        if (head != null && head.next != null) {
            while (fast.next != null && fast.next.next != null) {
                slow = slow.next; fast = fast.next.next; // @trace middle
            }
            ListNode second = reverse(slow.next);
            slow.next = second; // @trace attach
            ListNode p = head, q = second;
            while (q != null) {
                if (p.val != q.val) { valid = false; break; } // @trace compare
                p = p.next; q = q.next;
            }
            ListNode restored = reverse(second); // @trace restore-start
            slow.next = restored; // @trace restore
        }
        return valid; // @trace return
    }
    private ListNode reverse(ListNode head) {
        ListNode previous = null, current = head;
        while (current != null) {
            ListNode saved = current.next;
            current.next = previous; // @trace reverse-link
            previous = current; current = saved; // @trace reverse-move
        }
        return previous;
    }`,
`func isPalindrome(head *ListNode) bool {
    slow, fast, valid := head, head, true // @trace init
    if head != nil && head.Next != nil {
        for fast.Next != nil && fast.Next.Next != nil {
            slow, fast = slow.Next, fast.Next.Next // @trace middle
        }
        second := reverseHalf(slow.Next)
        slow.Next = second // @trace attach
        p, q := head, second
        for q != nil {
            if p.Val != q.Val { valid = false; break } // @trace compare
            p, q = p.Next, q.Next
        }
        restored := reverseHalf(second) // @trace restore-start
        slow.Next = restored // @trace restore
    }
    return valid // @trace return
}
func reverseHalf(head *ListNode) *ListNode {
    var previous *ListNode; current := head
    for current != nil {
        saved := current.Next
        current.Next = previous // @trace reverse-link
        previous, current = current, saved // @trace reverse-move
    }
    return previous
}`,
`    def isPalindrome(self, head) -> bool:
        slow, fast, valid = head, head, True # @trace init
        if head is not None and head.next is not None:
            while fast.next is not None and fast.next.next is not None:
                slow, fast = slow.next, fast.next.next # @trace middle
            second = self.reverse(slow.next)
            slow.next = second # @trace attach
            p, q = head, second
            while q is not None:
                if p.val != q.val: # @trace compare
                    valid = False
                    break
                p, q = p.next, q.next
            restored = self.reverse(second) # @trace restore-start
            slow.next = restored # @trace restore
        return valid # @trace return

    def reverse(self, head):
        previous, current = None, head
        while current is not None:
            saved = current.next
            current.next = previous # @trace reverse-link
            previous, current = current, saved # @trace reverse-move
        return previous`,
    '使用 O(1) 辅助指针；无论是否回文，返回前都恢复原链表。'),

  'merge-two-sorted-lists': listReference(
`    public ListNode mergeTwoLists(ListNode a, ListNode b) {
        ListNode dummy = new ListNode(0), tail = dummy; // @trace init
        while (a != null && b != null) {
            boolean takeA = a.val <= b.val; // @trace compare
            ListNode chosen = takeA ? a : b;
            tail.next = chosen; tail = chosen;
            if (takeA) a = a.next; else b = b.next; // @trace append
        }
        tail.next = a != null ? a : b; // @trace remainder
        return dummy.next; // @trace return
    }`,
`func mergeTwoLists(a *ListNode, b *ListNode) *ListNode {
    dummy := &ListNode{}; tail := dummy // @trace init
    for a != nil && b != nil {
        takeA := a.Val <= b.Val // @trace compare
        chosen := b; if takeA { chosen = a }
        tail.Next, tail = chosen, chosen
        if takeA { a = a.Next } else { b = b.Next } // @trace append
    }
    if a != nil { tail.Next = a } else { tail.Next = b } // @trace remainder
    return dummy.Next // @trace return
}`,
`    def mergeTwoLists(self, a, b):
        dummy = ListNode()
        tail = dummy # @trace init
        while a is not None and b is not None:
            takeA = a.val <= b.val # @trace compare
            chosen = a if takeA else b
            tail.next = chosen
            tail = chosen
            a, b = (a.next, b) if takeA else (a, b.next) # @trace append
        tail.next = a if a is not None else b # @trace remainder
        return dummy.next # @trace return`,
    '输入是两个独立的非递减链表；结果复用其节点，相等时先选择 A。演示将结果序列化为值数组。'),

  'add-two-numbers': listReference(
`    public ListNode addTwoNumbers(ListNode a, ListNode b) {
        ListNode dummy = new ListNode(0), tail = dummy; int carry = 0; // @trace init
        while (a != null || b != null || carry != 0) {
            int x = a == null ? 0 : a.val, y = b == null ? 0 : b.val;
            int sum = x + y + carry; carry = sum / 10; // @trace sum
            tail.next = new ListNode(sum % 10); tail = tail.next; // @trace append
            a = a == null ? null : a.next; b = b == null ? null : b.next; // @trace advance
        }
        return dummy.next; // @trace return
    }`,
`func addTwoNumbers(a *ListNode, b *ListNode) *ListNode {
    dummy := &ListNode{}; tail, carry := dummy, 0 // @trace init
    for a != nil || b != nil || carry != 0 {
        x, y := 0, 0; if a != nil { x = a.Val }; if b != nil { y = b.Val }
        sum := x + y + carry; carry = sum / 10 // @trace sum
        tail.Next = &ListNode{Val: sum % 10}; tail = tail.Next // @trace append
        if a != nil { a = a.Next }; if b != nil { b = b.Next } // @trace advance
    }
    return dummy.Next // @trace return
}`,
`    def addTwoNumbers(self, a, b):
        dummy = ListNode()
        tail, carry = dummy, 0 # @trace init
        while a is not None or b is not None or carry:
            x = a.val if a is not None else 0
            y = b.val if b is not None else 0
            total = x + y + carry
            carry = total // 10 # @trace sum
            tail.next = ListNode(total % 10)
            tail = tail.next # @trace append
            a, b = a.next if a is not None else None, b.next if b is not None else None # @trace advance
        return dummy.next # @trace return`,
    '低位在链表前端；新建结果节点，不将整个数转换成语言整数，也不修改输入。'),

  'remove-nth-node-from-end-of-list': listReference(
`    public ListNode removeNthFromEnd(ListNode head, int n) {
        ListNode dummy = new ListNode(0); dummy.next = head;
        ListNode fast = dummy, slow = dummy; // @trace init
        for (int i = 0; i < n; i++) fast = fast.next; // @trace gap
        while (fast.next != null) {
            fast = fast.next; slow = slow.next; // @trace advance
        }
        slow.next = slow.next.next; // @trace remove
        return dummy.next; // @trace return
    }`,
`func removeNthFromEnd(head *ListNode, n int) *ListNode {
    dummy := &ListNode{Next: head}; fast, slow := dummy, dummy // @trace init
    for i := 0; i < n; i++ { fast = fast.Next } // @trace gap
    for fast.Next != nil {
        fast, slow = fast.Next, slow.Next // @trace advance
    }
    slow.Next = slow.Next.Next // @trace remove
    return dummy.Next // @trace return
}`,
`    def removeNthFromEnd(self, head, n: int):
        dummy = ListNode(0, head)
        fast, slow = dummy, dummy # @trace init
        for _ in range(n):
            fast = fast.next # @trace gap
        while fast.next is not None:
            fast, slow = fast.next, slow.next # @trace advance
        slow.next = slow.next.next # @trace remove
        return dummy.next # @trace return`,
    '输入校验保证 1 ≤ n ≤ 链表长度；只调整连接，不修改节点值。'),

  'swap-nodes-in-pairs': listReference(
`    public ListNode swapPairs(ListNode head) {
        ListNode dummy = new ListNode(0); dummy.next = head; ListNode before = dummy; // @trace init
        while (before.next != null && before.next.next != null) {
            ListNode first = before.next, second = first.next, rest = second.next; // @trace pair
            first.next = rest; // @trace bypass
            second.next = first; // @trace link-back
            before.next = second; // @trace attach
            before = first; // @trace advance
        }
        return dummy.next; // @trace return
    }`,
`func swapPairs(head *ListNode) *ListNode {
    dummy := &ListNode{Next: head}; before := dummy // @trace init
    for before.Next != nil && before.Next.Next != nil {
        first := before.Next; second := first.Next; rest := second.Next // @trace pair
        first.Next = rest // @trace bypass
        second.Next = first // @trace link-back
        before.Next = second // @trace attach
        before = first // @trace advance
    }
    return dummy.Next // @trace return
}`,
`    def swapPairs(self, head):
        dummy = ListNode(0, head)
        before = dummy # @trace init
        while before.next is not None and before.next.next is not None:
            first = before.next
            second, rest = first.next, first.next.next # @trace pair
            first.next = rest # @trace bypass
            second.next = first # @trace link-back
            before.next = second # @trace attach
            before = first # @trace advance
        return dummy.next # @trace return`,
    '交换节点连接而非交换值，奇数长度的最后一个节点保持不变。'),

  'reverse-nodes-in-k-group': listReference(
`    public ListNode reverseKGroup(ListNode head, int k) {
        ListNode dummy = new ListNode(0); dummy.next = head; ListNode before = dummy; // @trace init
        while (true) {
            ListNode kth = before;
            for (int i = 0; i < k && kth != null; i++) kth = kth.next; // @trace probe
            if (kth == null) break;
            ListNode after = kth.next, first = before.next, previous = after, current = first; // @trace group
            while (current != after) {
                ListNode saved = current.next;
                current.next = previous; // @trace reverse-link
                previous = current; current = saved; // @trace reverse-move
            }
            before.next = kth; // @trace attach
            before = first; // @trace advance
        }
        return dummy.next; // @trace return
    }`,
`func reverseKGroup(head *ListNode, k int) *ListNode {
    dummy := &ListNode{Next: head}; before := dummy // @trace init
    for {
        kth := before
        for i := 0; i < k && kth != nil; i++ { kth = kth.Next } // @trace probe
        if kth == nil { break }
        after, first := kth.Next, before.Next
        previous, current := after, first // @trace group
        for current != after {
            saved := current.Next
            current.Next = previous // @trace reverse-link
            previous, current = current, saved // @trace reverse-move
        }
        before.Next = kth // @trace attach
        before = first // @trace advance
    }
    return dummy.Next // @trace return
}`,
`    def reverseKGroup(self, head, k: int):
        dummy = ListNode(0, head)
        before = dummy # @trace init
        while True:
            kth = before
            for _ in range(k):
                if kth is None:
                    break
                kth = kth.next # @trace probe
            if kth is None:
                break
            after, first = kth.next, before.next
            previous, current = after, first # @trace group
            while current is not after:
                saved = current.next
                current.next = previous # @trace reverse-link
                previous, current = current, saved # @trace reverse-move
            before.next = kth # @trace attach
            before = first # @trace advance
        return dummy.next # @trace return`,
    '仅完整的 k 个节点翻转；k 为 1 或 k 大于长度时，结果顺序不变。'),

  'copy-list-with-random-pointer': listReference(
`    public Node copyRandomList(Node head) {
        Map<Node, Node> copies = new IdentityHashMap<>(); // @trace init
        for (Node current = head; current != null; current = current.next) {
            copies.put(current, new Node(current.val)); // @trace allocate
        }
        for (Node current = head; current != null; current = current.next) {
            Node copy = copies.get(current);
            copy.next = copies.get(current.next);
            copy.random = copies.get(current.random); // @trace connect
        }
        return copies.get(head); // @trace return
    }`,
`func copyRandomList(head *Node) *Node {
    copies := map[*Node]*Node{} // @trace init
    for current := head; current != nil; current = current.Next {
        copies[current] = &Node{Val: current.Val} // @trace allocate
    }
    for current := head; current != nil; current = current.Next {
        copy := copies[current]
        copy.Next = copies[current.Next]
        copy.Random = copies[current.Random] // @trace connect
    }
    return copies[head] // @trace return
}`,
`    def copyRandomList(self, head):
        copies = {None: None} # @trace init
        current = head
        while current is not None:
            copies[current] = Node(current.val) # @trace allocate
            current = current.next
        current = head
        while current is not None:
            copy = copies[current]
            copy.next = copies[current.next]
            copy.random = copies[current.random] # @trace connect
            current = current.next
        return copies[head] # @trace return`,
    '使用两遍映射法，O(n) 辅助空间；演示输出 [value, randomIndex] 序列。新旧节点必须完全分离。', true),
};
