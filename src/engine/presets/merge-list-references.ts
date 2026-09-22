import { listReference } from './linked-list-references';
import type { MergeListId } from './merge-lists';
import type { CodeLanguage, ReferenceCode } from '../types';

const javaMerge = `    private ListNode merge(ListNode a, ListNode b) {
        ListNode head = null, tail = null; // @trace merge
        while (a != null && b != null) {
            boolean takeA = a.val <= b.val; // @trace compare
            ListNode chosen = takeA ? a : b;
            if (takeA) a = a.next; else b = b.next;
            if (tail == null) head = chosen; else tail.next = chosen; // @trace append
            tail = chosen;
        }
        ListNode rest = a != null ? a : b;
        if (tail == null) head = rest; else tail.next = rest; // @trace remainder
        return head;
    }`;
const goMerge = `func merge(a, b *ListNode) *ListNode {
    var head, tail *ListNode // @trace merge
    for a != nil && b != nil {
        takeA := a.Val <= b.Val // @trace compare
        var chosen *ListNode
        if takeA { chosen = a; a = a.Next } else { chosen = b; b = b.Next }
        if tail == nil { head = chosen } else { tail.Next = chosen } // @trace append
        tail = chosen
    }
    rest := a; if rest == nil { rest = b }
    if tail == nil { head = rest } else { tail.Next = rest } // @trace remainder
    return head
}`;
const pythonMerge = `    def merge(self, a, b):
        head = tail = None # @trace merge
        while a is not None and b is not None:
            take_a = a.val <= b.val # @trace compare
            if take_a:
                chosen, a = a, a.next
            else:
                chosen, b = b, b.next
            if tail is None:
                head = chosen
            else:
                tail.next = chosen # @trace append
            tail = chosen
        rest = a if a is not None else b
        if tail is None:
            head = rest
        else:
            tail.next = rest # @trace remainder
        return head`;
export const mergeListReferences: Record<MergeListId, Record<CodeLanguage, ReferenceCode>> = {
  'sort-list': listReference(
`    public ListNode sortList(ListNode head) {
        ListNode result = sort(head); // @trace init
        return result; // @trace return
    }
    private ListNode sort(ListNode head) {
        if (head == null || head.next == null) return head; // @trace base
        ListNode slow = head, fast = head.next;
        while (fast != null && fast.next != null) {
            slow = slow.next; fast = fast.next.next; // @trace middle
        }
        ListNode right = slow.next; slow.next = null; // @trace split
        ListNode a = sort(head), b = sort(right);
        return merge(a, b); // @trace sorted
    }
${javaMerge}`,
`func sortList(head *ListNode) *ListNode {
    var sort func(*ListNode) *ListNode // @trace init
    sort = func(head *ListNode) *ListNode {
        if head == nil || head.Next == nil { return head } // @trace base
        slow, fast := head, head.Next
        for fast != nil && fast.Next != nil {
            slow = slow.Next; fast = fast.Next.Next // @trace middle
        }
        right := slow.Next; slow.Next = nil // @trace split
        a, b := sort(head), sort(right)
        return merge(a, b) // @trace sorted
    }
    return sort(head) // @trace return
}
${goMerge}`,
`    def sortList(self, head):
        def sort(node): # @trace init
            if node is None or node.next is None:
                return node # @trace base
            slow, fast = node, node.next
            while fast is not None and fast.next is not None:
                slow, fast = slow.next, fast.next.next # @trace middle
            right, slow.next = slow.next, None # @trace split
            a, b = sort(node), sort(right)
            return self.merge(a, b) # @trace sorted
        return sort(head) # @trace return

${pythonMerge}`, '自顶向下归并，递归辅助空间 O(log n)，不是常数空间版本。'),
  'merge-k-sorted-lists': listReference(
`    public ListNode mergeKLists(ListNode[] lists) {
        ListNode result = range(lists, 0, lists.length); // @trace init
        return result; // @trace return
    }
    private ListNode range(ListNode[] lists, int lo, int hi) {
        if (hi - lo <= 1) return lo < hi ? lists[lo] : null; // @trace base
        int mid = lo + (hi - lo) / 2; // @trace divide
        ListNode a = range(lists, lo, mid), b = range(lists, mid, hi);
        return merge(a, b); // @trace merged
    }
${javaMerge}`,
`func mergeKLists(lists []*ListNode) *ListNode {
    var divide func(int, int) *ListNode // @trace init
    divide = func(lo, hi int) *ListNode {
        if hi-lo <= 1 { if lo < hi { return lists[lo] }; return nil } // @trace base
        mid := lo + (hi-lo)/2 // @trace divide
        a, b := divide(lo, mid), divide(mid, hi)
        return merge(a, b) // @trace merged
    }
    return divide(0, len(lists)) // @trace return
}
${goMerge}`,
`    def mergeKLists(self, lists):
        def divide(lo, hi): # @trace init
            if hi - lo <= 1:
                return lists[lo] if lo < hi else None # @trace base
            mid = (lo + hi) // 2 # @trace divide
            a, b = divide(lo, mid), divide(mid, hi)
            return self.merge(a, b) # @trace merged
        return divide(0, len(lists)) # @trace return

${pythonMerge}`),
};
