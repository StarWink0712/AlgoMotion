import { reference } from '../reference';
import type { CodeLanguage, ReferenceCode } from '../types';
import type { StructuresId } from './structures';

const javaHeap = `class Item {
    int value, priority, tie;
    Item(int v, int p, int t) { value=v; priority=p; tie=t; }
}
class Heap {
    List<Item> items = new ArrayList<>(); boolean max;
    Heap(boolean max) { this.max=max; }
    boolean before(Item a, Item b) {
        int cmp = Integer.compare(a.priority,b.priority); if (cmp == 0) cmp = Integer.compare(a.tie,b.tie);
        return max ? cmp > 0 : cmp < 0; // @trace heap-compare
    }
    void swap(int a, int b) {
        Item saved=items.get(a); items.set(a,items.get(b)); items.set(b,saved); // @trace heap-swap
    }
    void repair(int i, boolean upward) {
        if (upward) {
            while (i > 0) { int p=(i-1)/2; if (!before(items.get(i),items.get(p))) break; swap(i,p); i=p; }
        } else {
            while (i*2+1 < items.size()) {
                int c=i*2+1;
                if (c+1 < items.size() && before(items.get(c+1),items.get(c))) c++;
                if (!before(items.get(c),items.get(i))) break;
                swap(i,c); i=c;
            }
        }
        return; // @trace heap-ready
    }
    void push(Item item) { items.add(item); // @trace heap-push
        repair(items.size()-1,true);
    }
    Item pop() {
        Item root=items.get(0), last=items.remove(items.size()-1); // @trace heap-remove
        if (!items.isEmpty()) items.set(0,last);
        repair(0,false); return root;
    }
    int size() { return items.size(); }
    Item peek() { return items.get(0); }
}`;
const goHeap = `type Item struct { Value, Priority, Tie int }
type Heap struct { Items []Item; Max bool }
func newHeap(maximum bool) *Heap { return &Heap{Items: []Item{}, Max: maximum} }
func (h *Heap) before(a,b Item) bool {
    less := a.Priority < b.Priority || (a.Priority == b.Priority && a.Tie < b.Tie)
    greater := a.Priority > b.Priority || (a.Priority == b.Priority && a.Tie > b.Tie)
    return (h.Max && greater) || (!h.Max && less) // @trace heap-compare
}
func (h *Heap) swap(a,b int) { h.Items[a],h.Items[b] = h.Items[b],h.Items[a] } // @trace heap-swap
func (h *Heap) repair(i int, upward bool) {
    if upward {
        for i > 0 { p := (i-1)/2; if !h.before(h.Items[i],h.Items[p]) { break }; h.swap(i,p); i=p }
    } else {
        for i*2+1 < len(h.Items) {
            c := i*2+1
            if c+1 < len(h.Items) && h.before(h.Items[c+1],h.Items[c]) { c++ }
            if !h.before(h.Items[c],h.Items[i]) { break }
            h.swap(i,c); i=c
        }
    }
    return // @trace heap-ready
}
func (h *Heap) push(item Item) {
    h.Items = append(h.Items,item) // @trace heap-push
    h.repair(len(h.Items)-1,true)
}
func (h *Heap) pop() Item {
    root,last := h.Items[0],h.Items[len(h.Items)-1]; h.Items=h.Items[:len(h.Items)-1] // @trace heap-remove
    if len(h.Items) > 0 { h.Items[0]=last }
    h.repair(0,false); return root
}
func (h *Heap) size() int { return len(h.Items) }
func (h *Heap) peek() Item { return h.Items[0] }
`;
const pythonHeap = `class Heap:
    # Each item is (value, priority, tie); only priority/tie determine heap order.
    def __init__(self, maximum=False):
        self.items, self.maximum = [], maximum
    def before(self, a, b):
        return a[1:] > b[1:] if self.maximum else a[1:] < b[1:] # @trace heap-compare
    def swap(self, a, b):
        self.items[a],self.items[b] = self.items[b],self.items[a] # @trace heap-swap
    def repair(self, i, upward):
        if upward:
            while i > 0:
                p=(i-1)//2
                if not self.before(self.items[i],self.items[p]):
                    break
                self.swap(i,p); i=p
        else:
            while i*2+1 < len(self.items):
                c=i*2+1
                if c+1 < len(self.items) and self.before(self.items[c+1],self.items[c]):
                    c+=1
                if not self.before(self.items[c],self.items[i]):
                    break
                self.swap(i,c); i=c
        return # @trace heap-ready
    def push(self, item):
        self.items.append(item) # @trace heap-push
        self.repair(len(self.items)-1,True)
    def pop(self):
        root,last=self.items[0],self.items.pop() # @trace heap-remove
        if self.items:
            self.items[0]=last
        self.repair(0,False)
        return root
    def size(self):
        return len(self.items)
    def peek(self):
        return self.items[0]
`;
function refs(java: string, go: string, python: string, heap = true): Record<CodeLanguage, ReferenceCode> {
  const note = heap ? '附手写二叉堆以对应上浮/下沉语义；堆数组不是完整排序。' : '附 Trie 类及操作序列适配器；空前缀存在，空单词需先插入才算命中。';
  return { java: reference(`import java.util.*;\n\n${heap ? javaHeap + '\n\n' : ''}${java}`, note), go: reference(`package main\n\n${heap ? goHeap + '\n' : ''}${go}`, note), python: reference(`${heap ? pythonHeap + '\n' : ''}${python}`, note) };
}
export const structuresReferences: Record<StructuresId, Record<CodeLanguage, ReferenceCode>> = {
  'kth-largest-element-in-an-array': refs(
`class Solution {
    public int findKthLargest(int[] nums, int k) {
        Heap heap=new Heap(false); // @trace init
        for (int value : nums) {
            Item item=new Item(value,value,0); // @trace candidate
            heap.push(item);
            if (heap.size() > k) heap.pop(); // @trace discard
        }
        return heap.peek().value; // @trace return
    }
}`,
`func findKthLargest(nums []int, k int) int {
    heap:=newHeap(false) // @trace init
    for _,value:=range nums {
        item:=Item{Value:value,Priority:value} // @trace candidate
        heap.push(item)
        if heap.size() > k { heap.pop() } // @trace discard
    }
    return heap.peek().Value // @trace return
}`,
`class Solution:
    def findKthLargest(self, nums: list[int], k: int) -> int:
        heap=Heap() # @trace init
        for value in nums:
            item=(value,value,0) # @trace candidate
            heap.push(item)
            if heap.size() > k:
                heap.pop() # @trace discard
        return heap.peek()[0] # @trace return`),
  'top-k-frequent-elements': refs(
`class Solution {
    public List<Integer> topKFrequent(int[] nums, int k) {
        Map<Integer,Integer> counts=new LinkedHashMap<>(); Heap heap=new Heap(false); // @trace init
        for (int value : nums) counts.put(value,counts.getOrDefault(value,0)+1); // @trace count
        for (Map.Entry<Integer,Integer> entry : counts.entrySet()) {
            Item item=new Item(entry.getKey(),entry.getValue(),-entry.getKey()); // @trace candidate
            heap.push(item);
            if (heap.size() > k) heap.pop(); // @trace discard
        }
        List<Integer> out=new ArrayList<>();
        while (heap.size() > 0) out.add(heap.pop().value); // @trace collect
        Collections.reverse(out);
        return out; // @trace return
    }
}`,
`func topKFrequent(nums []int, k int) []int {
    counts,keys,heap:=map[int]int{},[]int{},newHeap(false) // @trace init
    for _,value:=range nums { if _,ok:=counts[value]; !ok { keys=append(keys,value) }; counts[value]++ } // @trace count
    for _,value:=range keys {
        item:=Item{Value:value,Priority:counts[value],Tie:-value} // @trace candidate
        heap.push(item)
        if heap.size() > k { heap.pop() } // @trace discard
    }
    out:=[]int{}
    for heap.size() > 0 { out=append(out,heap.pop().Value) } // @trace collect
    for a,b:=0,len(out)-1; a<b; a,b=a+1,b-1 { out[a],out[b]=out[b],out[a] }
    return out // @trace return
}`,
`class Solution:
    def topKFrequent(self, nums: list[int], k: int) -> list[int]:
        counts,heap={},Heap() # @trace init
        for value in nums:
            counts[value]=counts.get(value,0)+1 # @trace count
        for value,count in counts.items():
            item=(value,count,-value) # @trace candidate
            heap.push(item)
            if heap.size() > k:
                heap.pop() # @trace discard
        out=[]
        while heap.size():
            out.append(heap.pop()[0]) # @trace collect
        out.reverse()
        return out # @trace return`),
  'find-median-from-data-stream': refs(
`class MedianFinder {
    Heap lower,upper;
    public MedianFinder() { lower=new Heap(true); upper=new Heap(false); } // @trace init
    private void move(Heap from, Heap to) { to.push(from.pop()); } // @trace balance
    public void addNum(int num) {
        Item item=new Item(num,num,0); // @trace add
        if (lower.size()==0 || num <= lower.peek().value) lower.push(item); else upper.push(item);
        if (lower.size() > upper.size()+1) move(lower,upper);
        else if (upper.size() > lower.size()) move(upper,lower);
        return; // @trace added
    }
    public double findMedian() {
        return lower.size() > upper.size() ? lower.peek().value : ((double)lower.peek().value+upper.peek().value)/2; // @trace median
    }
}
class Solution {
    // kinds: 0=addNum, 1=findMedian. Queries require at least one inserted value.
    public List<Double> runOperations(int[] kinds, int[] values) {
        MedianFinder finder=new MedianFinder(); List<Double> out=new ArrayList<>();
        for (int i=0; i<kinds.length; i++) {
            if (kinds[i]==0) { finder.addNum(values[i]); out.add(null); } else out.add(finder.findMedian());
        }
        return out; // @trace return
    }
}`,
`type MedianFinder struct { Lower,Upper *Heap }
func newMedianFinder() *MedianFinder { return &MedianFinder{newHeap(true),newHeap(false)} } // @trace init
func moveHeap(from,to *Heap) { to.push(from.pop()) } // @trace balance
func (f *MedianFinder) AddNum(num int) {
    item:=Item{Value:num,Priority:num} // @trace add
    if f.Lower.size()==0 || num <= f.Lower.peek().Value { f.Lower.push(item) } else { f.Upper.push(item) }
    if f.Lower.size() > f.Upper.size()+1 { moveHeap(f.Lower,f.Upper) } else if f.Upper.size() > f.Lower.size() { moveHeap(f.Upper,f.Lower) }
    return // @trace added
}
func (f *MedianFinder) FindMedian() float64 {
    value:=float64(f.Lower.peek().Value)
    if f.Lower.size()==f.Upper.size() { value=(value+float64(f.Upper.peek().Value))/2 }
    return value // @trace median
}
func runOperations(kinds,values []int) []any {
    finder,out:=newMedianFinder(),[]any{}
    for i,kind:=range kinds { if kind==0 { finder.AddNum(values[i]); out=append(out,nil) } else { out=append(out,finder.FindMedian()) } }
    return out // @trace return
}`,
`class MedianFinder:
    def __init__(self):
        self.lower,self.upper=Heap(True),Heap() # @trace init
    def move(self, source, target):
        target.push(source.pop()) # @trace balance
    def addNum(self, num: int) -> None:
        item=(num,num,0) # @trace add
        if not self.lower.size() or num <= self.lower.peek()[0]:
            self.lower.push(item)
        else:
            self.upper.push(item)
        if self.lower.size() > self.upper.size()+1:
            self.move(self.lower,self.upper)
        elif self.upper.size() > self.lower.size():
            self.move(self.upper,self.lower)
        return # @trace added
    def findMedian(self) -> float:
        return self.lower.peek()[0] if self.lower.size() > self.upper.size() else (self.lower.peek()[0]+self.upper.peek()[0])/2 # @trace median

class Solution:
    def runOperations(self, kinds, values):
        finder,out=MedianFinder(),[]
        for kind,value in zip(kinds,values):
            out.append(finder.addNum(value) if kind==0 else finder.findMedian())
        return out # @trace return`),
  'implement-trie-prefix-tree': refs(
`class TrieNode {
    Map<Character,TrieNode> children=new HashMap<>(); boolean terminal;
}
class Trie {
    private final TrieNode root;
    public Trie() { root=new TrieNode(); } // @trace init
    private TrieNode walk(String word, boolean create) {
        TrieNode node=root; // @trace operation
        for (char c : word.toCharArray()) {
            TrieNode next=node.children.get(c);
            if (next==null) {
                if (!create) return null; // @trace missing
                next=new TrieNode(); node.children.put(c,next); // @trace create
            }
            node=next; // @trace follow
        }
        return node;
    }
    public void insert(String word) { walk(word,true).terminal=true; } // @trace mark
    private boolean query(String word, boolean whole) {
        TrieNode node=walk(word,false);
        return node!=null && (!whole || node.terminal); // @trace answer
    }
    public boolean search(String word) { return query(word,true); }
    public boolean startsWith(String prefix) { return query(prefix,false); }
}
class Solution {
    public List<Boolean> runOperations(String[] operations, String[] words) {
        Trie trie=new Trie(); List<Boolean> out=new ArrayList<>();
        for (int i=0; i<operations.length; i++) {
            if (operations[i].equals("insert")) { trie.insert(words[i]); out.add(null); }
            else if (operations[i].equals("search")) out.add(trie.search(words[i]));
            else out.add(trie.startsWith(words[i]));
        }
        return out; // @trace return
    }
}`,
`type TrieNode struct { Children map[byte]*TrieNode; Terminal bool }
type Trie struct { Root *TrieNode }
func newTrie() *Trie { return &Trie{Root:&TrieNode{Children:map[byte]*TrieNode{}}} } // @trace init
func (t *Trie) walk(word string, create bool) *TrieNode {
    node:=t.Root // @trace operation
    for _,c:=range []byte(word) {
        next:=node.Children[c]
        if next==nil {
            if !create { return nil } // @trace missing
            next=&TrieNode{Children:map[byte]*TrieNode{}}; node.Children[c]=next // @trace create
        }
        node=next // @trace follow
    }
    return node
}
func (t *Trie) Insert(word string) { t.walk(word,true).Terminal=true } // @trace mark
func (t *Trie) query(word string, whole bool) bool {
    node:=t.walk(word,false)
    return node!=nil && (!whole || node.Terminal) // @trace answer
}
func (t *Trie) Search(word string) bool { return t.query(word,true) }
func (t *Trie) StartsWith(word string) bool { return t.query(word,false) }
func runOperations(operations,words []string) []any {
    trie,out:=newTrie(),[]any{}
    for i,op:=range operations {
        if op=="insert" { trie.Insert(words[i]); out=append(out,nil)
        } else if op=="search" { out=append(out,trie.Search(words[i])) } else { out=append(out,trie.StartsWith(words[i])) }
    }
    return out // @trace return
}`,
`class TrieNode:
    def __init__(self):
        self.children,self.terminal={},False
class Trie:
    def __init__(self):
        self.root=TrieNode() # @trace init
    def walk(self, word, create):
        node=self.root # @trace operation
        for char in word:
            next_node=node.children.get(char)
            if next_node is None:
                if not create:
                    return None # @trace missing
                next_node=TrieNode(); node.children[char]=next_node # @trace create
            node=next_node # @trace follow
        return node
    def insert(self, word: str) -> None:
        self.walk(word,True).terminal=True # @trace mark
    def query(self, word, whole):
        node=self.walk(word,False)
        return node is not None and (not whole or node.terminal) # @trace answer
    def search(self, word: str) -> bool:
        return self.query(word,True)
    def startsWith(self, prefix: str) -> bool:
        return self.query(prefix,False)
class Solution:
    def runOperations(self, operations, words):
        trie,out=Trie(),[]
        for op,word in zip(operations,words):
            out.append(trie.insert(word) if op=='insert' else trie.search(word) if op=='search' else trie.startsWith(word))
        return out # @trace return`, false),
};
