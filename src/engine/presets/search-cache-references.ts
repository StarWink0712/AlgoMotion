import { reference } from '../reference';
import type { CodeLanguage, ReferenceCode } from '../types';
import type { SearchCacheId } from './search-cache';

function refs(java: string, go: string, python: string, sort = false): Record<CodeLanguage, ReferenceCode> {
  return { java: reference(`import java.util.*;\n\n${java}`), go: reference(`package main\n${sort ? '\nimport "sort"\n' : ''}\n${go}`), python: reference(python) };
}
function backtracking(kind: 'permutations' | 'subsets' | 'combination-sum') {
  const combo = kind === 'combination-sum', perm = kind === 'permutations', method = combo ? 'combinationSum' : perm ? 'permute' : 'subsets';
  return refs(
`class Solution {
    public List<List<Integer>> ${method}(int[] ${combo ? 'candidates, int target' : 'nums'}) {
        ${combo ? 'int[] nums = candidates.clone(); Arrays.sort(nums);' : ''}
        List<List<Integer>> out = new ArrayList<>(); // @trace init
        dfs(nums, 0, ${combo ? 'target' : '0'}, new boolean[nums.length], new ArrayList<>(), out);
        return out; // @trace return
    }
    private void dfs(int[] nums, int start, int remaining, boolean[] used, List<Integer> path, List<List<Integer>> out) {
        ${perm ? 'if (path.size() == nums.length) {' : combo ? 'if (remaining == 0) {' : '{'}
            out.add(new ArrayList<>(path)); // @trace save
            ${perm || combo ? 'return;' : ''}
        }
        for (int i = ${perm ? '0' : 'start'}; i < nums.length; i++) {
            ${perm ? 'if (used[i]) continue;' : ''}
            ${combo ? 'if (nums[i] > remaining) break; // @trace prune' : ''}
            path.add(nums[i]); ${perm ? 'used[i] = true;' : ''} // @trace choose
            dfs(nums, ${perm ? '0' : combo ? 'i' : 'i + 1'}, ${combo ? 'remaining - nums[i]' : '0'}, used, path, out);
            path.remove(path.size() - 1); ${perm ? 'used[i] = false;' : ''} // @trace undo
        }
    }
}`,
`func ${method}(${combo ? 'candidates []int, target int' : 'nums []int'}) [][]int {
    ${combo ? 'nums := append([]int{}, candidates...); sort.Ints(nums)' : ''}
    out, path := [][]int{}, []int{} // @trace init
    ${perm ? 'used := make([]bool, len(nums))' : ''}
    var dfs func(int, int)
    dfs = func(start, remaining int) {
        ${perm ? 'if len(path) == len(nums) {' : combo ? 'if remaining == 0 {' : '{'}
            out = append(out, append([]int{}, path...)) // @trace save
            ${perm || combo ? 'return' : ''}
        }
        for i := ${perm ? '0' : 'start'}; i < len(nums); i++ {
            ${perm ? 'if used[i] { continue }' : ''}
            ${combo ? 'if nums[i] > remaining { break } // @trace prune' : ''}
            path = append(path, nums[i]); ${perm ? 'used[i] = true' : ''} // @trace choose
            dfs(${perm ? '0' : combo ? 'i' : 'i+1'}, ${combo ? 'remaining-nums[i]' : '0'})
            path = path[:len(path)-1]; ${perm ? 'used[i] = false' : ''} // @trace undo
        }
    }
    dfs(0, ${combo ? 'target' : '0'})
    return out // @trace return
}`,
`class Solution:
    def ${method}(self, ${combo ? 'candidates: list[int], target: int' : 'nums: list[int]'}) -> list[list[int]]:
        ${combo ? 'nums = sorted(candidates)' : ''}
        out, path = [], [] # @trace init
        ${perm ? 'used = [False] * len(nums)' : ''}
        def dfs(start, remaining):
            ${perm ? 'if len(path) == len(nums):' : combo ? 'if remaining == 0:' : 'if True:'}
                out.append(path.copy()) # @trace save
                ${perm || combo ? 'return' : ''}
            for i in range(${perm ? '0' : 'start'}, len(nums)):
                ${perm ? 'if used[i]:\n                    continue' : ''}
                ${combo ? 'if nums[i] > remaining:\n                    break # @trace prune' : ''}
                path.append(nums[i])${perm ? '; used[i] = True' : ''} # @trace choose
                dfs(${perm ? '0' : combo ? 'i' : 'i + 1'}, ${combo ? 'remaining - nums[i]' : '0'})
                path.pop()${perm ? '; used[i] = False' : ''} # @trace undo
        dfs(0, ${combo ? 'target' : '0'})
        return out # @trace return`, combo);
}

export const searchCacheReferences: Record<SearchCacheId, Record<CodeLanguage, ReferenceCode>> = {
  permutations: backtracking('permutations'), subsets: backtracking('subsets'), 'combination-sum': backtracking('combination-sum'),
  'lru-cache': refs(
`class LRUCache {
    private static class Node {
        int key, value; Node prev, next;
        Node(int k, int v) { key = k; value = v; }
    }
    private final Map<Integer, Node> map = new HashMap<>();
    private final int capacity;
    private Node head, tail;
    public LRUCache(int capacity) { this.capacity = capacity; } // @trace init
    private Node find(int key) { return map.get(key); } // @trace lookup
    private void detach(Node n) {
        if (n.prev == null) head = n.next; else n.prev.next = n.next;
        if (n.next == null) tail = n.prev; else n.next.prev = n.prev;
        n.prev = n.next = null;
    }
    private void front(Node n) {
        n.prev = null; n.next = head;
        if (head == null) tail = n; else head.prev = n;
        head = n;
    }
    private void touch(Node n) { detach(n); front(n); } // @trace touch
    public int get(int key) {
        Node n = find(key);
        if (n == null) return -1; // @trace miss
        touch(n); return n.value;
    }
    public void put(int key, int value) {
        Node n = find(key);
        if (n != null) {
            n.value = value; // @trace update
            touch(n); return;
        }
        n = new Node(key, value); map.put(key, n); front(n); // @trace insert
        if (map.size() > capacity) {
            Node victim = tail; detach(victim); map.remove(victim.key); // @trace evict
        }
    }
}
class Solution {
    // Adapter: 0 = get, 1 = put; construction itself is not an output entry.
    public List<Integer> runOperations(int capacity, int[] kinds, int[] keys, int[] values) {
        LRUCache cache = new LRUCache(capacity); List<Integer> out = new ArrayList<>();
        for (int i = 0; i < kinds.length; i++) {
            Integer value = null;
            if (kinds[i] == 0) value = cache.get(keys[i]); else cache.put(keys[i], values[i]);
            out.add(value); // @trace output
        }
        return out; // @trace return
    }
}`,
`type CacheNode struct { Key, Value int; Prev, Next *CacheNode }
type LRUCache struct { Capacity int; Nodes map[int]*CacheNode; Head, Tail *CacheNode }
func Constructor(capacity int) LRUCache {
    return LRUCache{Capacity: capacity, Nodes: map[int]*CacheNode{}} // @trace init
}
func (c *LRUCache) find(key int) *CacheNode { return c.Nodes[key] } // @trace lookup
func (c *LRUCache) detach(n *CacheNode) {
    if n.Prev == nil { c.Head = n.Next } else { n.Prev.Next = n.Next }
    if n.Next == nil { c.Tail = n.Prev } else { n.Next.Prev = n.Prev }
    n.Prev, n.Next = nil, nil
}
func (c *LRUCache) front(n *CacheNode) {
    n.Prev, n.Next = nil, c.Head
    if c.Head == nil { c.Tail = n } else { c.Head.Prev = n }
    c.Head = n
}
func (c *LRUCache) touch(n *CacheNode) { c.detach(n); c.front(n) } // @trace touch
func (c *LRUCache) Get(key int) int {
    n := c.find(key)
    if n == nil { return -1 } // @trace miss
    c.touch(n); return n.Value
}
func (c *LRUCache) Put(key, value int) {
    n := c.find(key)
    if n != nil {
        n.Value = value // @trace update
        c.touch(n); return
    }
    n = &CacheNode{Key: key, Value: value}; c.Nodes[key] = n; c.front(n) // @trace insert
    if len(c.Nodes) > c.Capacity {
        victim := c.Tail; c.detach(victim); delete(c.Nodes, victim.Key) // @trace evict
    }
}
func runOperations(capacity int, kinds, keys, values []int) []any {
    cache, out := Constructor(capacity), []any{}
    for i, kind := range kinds {
        var value any
        if kind == 0 { value = cache.Get(keys[i]) } else { cache.Put(keys[i], values[i]) }
        out = append(out, value) // @trace output
    }
    return out // @trace return
}`,
`class CacheNode:
    def __init__(self, key, value):
        self.key, self.value = key, value
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity, self.nodes = capacity, {} # @trace init
        self.head = self.tail = None
    def find(self, key):
        return self.nodes.get(key) # @trace lookup
    def detach(self, node):
        if node.prev is None:
            self.head = node.next
        else:
            node.prev.next = node.next
        if node.next is None:
            self.tail = node.prev
        else:
            node.next.prev = node.prev
        node.prev = node.next = None
    def front(self, node):
        node.prev, node.next = None, self.head
        if self.head is None:
            self.tail = node
        else:
            self.head.prev = node
        self.head = node
    def touch(self, node):
        self.detach(node); self.front(node) # @trace touch
    def get(self, key: int) -> int:
        node = self.find(key)
        if node is None:
            return -1 # @trace miss
        self.touch(node)
        return node.value
    def put(self, key: int, value: int) -> None:
        node = self.find(key)
        if node is not None:
            node.value = value # @trace update
            self.touch(node)
            return
        node = CacheNode(key, value)
        self.nodes[key] = node; self.front(node) # @trace insert
        if len(self.nodes) > self.capacity:
            victim = self.tail
            self.detach(victim); del self.nodes[victim.key] # @trace evict

class Solution:
    def runOperations(self, capacity, kinds, keys, values):
        cache, out = LRUCache(capacity), []
        for kind, key, value in zip(kinds, keys, values):
            result = cache.get(key) if kind == 0 else cache.put(key, value)
            out.append(result) # @trace output
        return out # @trace return`),
};
