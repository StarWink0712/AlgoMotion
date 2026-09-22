import { z } from 'zod';
import { getProblem } from './catalog';
import type { ProblemId, Trace } from './types';
import { recorder } from './recorder';
import { searchGreedySchemas, runSearchGreedy } from './presets/search-greedy';
import { arrayHashSchemas, runArrayHash } from './presets/array-hash';
import { arrayTransformSchemas, runArrayTransform } from './presets/array-transform';
import { stackWindowSchemas, runStackWindow } from './presets/stack-window';
import { linkedListSchemas, runLinkedList } from './presets/linked-lists';
import { parseTree } from './tree-data';
import { treeSchemas, runTree } from './presets/trees';
import { advancedTreeSchemas, runAdvancedTree } from './presets/advanced-trees';
import { mergeListSchemas, runMergeList } from './presets/merge-lists';
import { searchCacheSchemas, runSearchCache } from './presets/search-cache';
import { explorationSchemas, runExploration } from './presets/exploration';
import { orderingSchemas, runOrdering } from './presets/ordering';
import { structuresSchemas, runStructures } from './presets/structures';
import { dpGreedySchemas, runDPGreedy } from './presets/dp-greedy';
import { finalSixSchemas, runFinalSix } from './presets/final-six';
export { parseTree } from './tree-data';

const integer = z.number().int().min(-10_000).max(10_000);
const nums = z.array(integer).max(24);
const schemas = {
  ...finalSixSchemas,
  ...dpGreedySchemas,
  ...orderingSchemas,
  ...structuresSchemas,
  ...explorationSchemas,
  ...advancedTreeSchemas,
  ...mergeListSchemas,
  ...searchCacheSchemas,
  ...treeSchemas,
  ...linkedListSchemas,
  ...stackWindowSchemas,
  ...searchGreedySchemas,
  ...arrayHashSchemas,
  ...arrayTransformSchemas,
  'two-sum': z.object({ nums, target: integer }).strict(),
  'move-zeroes': z.object({ nums }).strict(),
  'container-with-most-water': z.object({ heights: z.array(integer.min(0)).min(2).max(24) }).strict(),
  'longest-substring-without-repeating-characters': z.object({ s: z.string().refine((s) => Array.from(s).length <= 24) }).strict(),
  'maximum-subarray': z.object({ nums: nums.min(1) }).strict(),
  'reverse-linked-list': z.object({ values: nums.max(12) }).strict(),
  'binary-tree-level-order-traversal': z.object({ tree: z.array(integer.nullable()).max(15) }).strict(),
  'climbing-stairs': z.object({ n: z.number().int().min(0).max(20) }).strict(),
  'coin-change': z.object({
    coins: z.array(z.number().int().min(1).max(10_000)).min(1).max(6).refine((a) => new Set(a).size === a.length),
    amount: z.number().int().min(0).max(24),
  }).strict(),
  'longest-increasing-subsequence': z.object({ nums: nums.max(20) }).strict(),
};

export function runProblem(id: ProblemId, raw: unknown): Trace {
  const problem = getProblem(id);
  const parsed = schemas[id].safeParse(raw);
  if (!parsed.success) throw new Error(`输入不符合要求。${problem.inputHint}`);
  const input = parsed.data;
  const { state, emit, finish } = recorder(id, input);

  switch (id) {
    case 'longest-palindromic-substring':
    case 'longest-common-subsequence':
    case 'edit-distance':
    case 'single-number':
    case 'majority-element':
    case 'find-the-duplicate-number':
      return runFinalSix(id, input);
    case 'jump-game-ii':
    case 'partition-labels':
    case 'pascals-triangle':
    case 'house-robber':
    case 'perfect-squares':
    case 'word-break':
    case 'maximum-product-subarray':
    case 'partition-equal-subset-sum':
    case 'unique-paths':
    case 'minimum-path-sum':
      return runDPGreedy(id, input);
    case 'first-missing-positive':
    case 'rotate-image':
    case 'search-a-2d-matrix':
    case 'search-a-2d-matrix-ii':
    case 'find-minimum-in-rotated-sorted-array':
    case 'median-of-two-sorted-arrays':
      return runOrdering(id, input);
    case 'implement-trie-prefix-tree':
    case 'kth-largest-element-in-an-array':
    case 'top-k-frequent-elements':
    case 'find-median-from-data-stream':
      return runStructures(id, input);
    case 'letter-combinations-of-a-phone-number':
    case 'generate-parentheses':
    case 'palindrome-partitioning':
    case 'word-search':
    case 'n-queens':
    case 'number-of-islands':
    case 'rotting-oranges':
    case 'course-schedule':
    case 'spiral-matrix':
    case 'set-matrix-zeroes':
      return runExploration(id, input);
    case 'construct-binary-tree-from-preorder-and-inorder-traversal':
    case 'path-sum-iii':
    case 'lowest-common-ancestor-of-a-binary-tree':
    case 'binary-tree-maximum-path-sum':
      return runAdvancedTree(id, input);
    case 'sort-list':
    case 'merge-k-sorted-lists':
      return runMergeList(id, input);
    case 'lru-cache':
    case 'permutations':
    case 'subsets':
    case 'combination-sum':
      return runSearchCache(id, input);
    case 'binary-tree-inorder-traversal':
    case 'maximum-depth-of-binary-tree':
    case 'invert-binary-tree':
    case 'symmetric-tree':
    case 'diameter-of-binary-tree':
    case 'convert-sorted-array-to-binary-search-tree':
    case 'validate-binary-search-tree':
    case 'kth-smallest-element-in-a-bst':
    case 'binary-tree-right-side-view':
    case 'flatten-binary-tree-to-linked-list':
      return runTree(id, input);
    case 'intersection-of-two-linked-lists':
    case 'palindrome-linked-list':
    case 'linked-list-cycle':
    case 'linked-list-cycle-ii':
    case 'merge-two-sorted-lists':
    case 'add-two-numbers':
    case 'remove-nth-node-from-end-of-list':
    case 'swap-nodes-in-pairs':
    case 'reverse-nodes-in-k-group':
    case 'copy-list-with-random-pointer':
      return runLinkedList(id, input);
    case 'valid-parentheses':
    case 'min-stack':
    case 'daily-temperatures':
    case 'largest-rectangle-in-histogram':
    case 'trapping-rain-water':
    case 'sliding-window-maximum':
    case 'find-all-anagrams-in-a-string':
    case 'minimum-window-substring':
    case 'longest-valid-parentheses':
    case 'decode-string':
      return runStackWindow(id, input);
    case '3sum':
    case 'sort-colors':
    case 'rotate-array':
    case 'next-permutation':
    case 'merge-intervals':
      return runArrayTransform(id, input);
    case 'group-anagrams':
    case 'longest-consecutive-sequence':
    case 'product-of-array-except-self':
    case 'subarray-sum-equals-k':
      return runArrayHash(id, input);
    case 'search-insert-position':
    case 'find-first-and-last-position-of-element-in-sorted-array':
    case 'search-in-rotated-sorted-array':
    case 'best-time-to-buy-and-sell-stock':
    case 'jump-game':
      return runSearchGreedy(id, input);
    case 'two-sum': {
      const { nums, target } = schemas[id].parse(input);
      state.values = nums;
      state.table = [];
      state.variables = { target };
      const seen = new Map<number, number>();
      emit('init', '初始化', '创建空哈希表，记录已经访问过的数与下标。');
      for (let i = 0; i < nums.length; i++) {
        state.active = [i];
        state.pointers = { i };
        state.variables = { target, i, 'nums[i]': nums[i] };
        emit('visit', '访问', `访问下标 ${i}，当前数字是 ${nums[i]}。`);
        const need = target - nums[i];
        state.variables = { ...state.variables, need };
        emit('complement', '计算', `要凑成 ${target}，还需要 ${target} − (${nums[i]}) = ${need}。`);
        emit('lookup', '查找', seen.has(need) ? `哈希表中找到了 ${need}，对应下标 ${seen.get(need)}。` : `哈希表中还没有 ${need}，继续记录当前数字。`);
        if (seen.has(need)) {
          const result = [seen.get(need)!, i];
          state.settled = result;
          state.active = [];
          return finish(result, 'found');
        }
        seen.set(nums[i], i);
        state.table = [...seen].map(([value, index]) => [String(value), index]);
        emit('record', '记录', `将 ${nums[i]} → ${i} 存入哈希表。`);
      }
      state.active = [];
      return finish([], 'not-found');
    }
    case 'move-zeroes': {
      const { nums } = schemas[id].parse(input);
      state.values = nums;
      state.elementIds = nums.map((_, i) => i);
      let write = 0;
      state.pointers = { write };
      emit('init', '初始化', 'write 指向下一个非零元素应该放入的位置。');
      for (let read = 0; read < nums.length; read++) {
        state.active = [read];
        state.pointers = { read, write };
        state.variables = { read, write, value: nums[read] };
        emit('check', '检查', nums[read] === 0 ? '当前是零，read 继续向右。' : `找到非零数字 ${nums[read]}，放到位置 ${write}。`);
        if (nums[read] !== 0) {
          [nums[write], nums[read]] = [nums[read], nums[write]];
          [state.elementIds[write], state.elementIds[read]] = [state.elementIds[read], state.elementIds[write]];
          state.active = [...new Set([read, write])];
          emit('swap', '交换', `交换下标 ${read} 与 ${write} 的值。`);
          write++;
          state.pointers.write = write;
          state.variables.write = write;
          state.settled = Array.from({ length: write }, (_, i) => i);
          emit('advance', '推进', `前 ${write} 个位置已经有序填入非零元素。`);
        }
      }
      state.active = [];
      return finish(nums, 'return');
    }
    case 'container-with-most-water': {
      const { heights } = schemas[id].parse(input);
      state.values = heights;
      let left = 0, right = heights.length - 1, best = 0;
      state.bestPath = [left, right];
      state.pointers = { left, right };
      state.variables = { best };
      emit('init', '初始化', '两端指针形成最宽的容器，最大面积初始为 0。');
      while (left < right) {
        state.pointers = { left, right };
        state.active = [left, right];
        state.window = [left, right];
        const area = Math.min(heights[left], heights[right]) * (right - left);
        state.variables = { left, right, width: right - left, height: Math.min(heights[left], heights[right]), area, best };
        emit('area', '计算面积', `短边高度 ${Math.min(heights[left], heights[right])} × 宽度 ${right - left} = ${area}。`);
        if (area > best) state.bestPath = [left, right];
        best = Math.max(best, area);
        state.variables.best = best;
        emit('best', '更新最优', `当前最大面积为 ${best}。`);
        const moveLeft = heights[left] <= heights[right];
        if (moveLeft) left++; else right--;
        state.pointers = { left, right };
        state.active = [...new Set([left, right])];
        state.window = [left, right];
        state.variables = { left, right, best };
        emit(moveLeft ? 'move-left' : 'move-right', '移动短边', `向内移动${moveLeft ? '左' : '右'}指针，寻找可能更高的短边。`);
      }
      return finish(best, 'return');
    }
    case 'longest-substring-without-repeating-characters': {
      const { s } = schemas[id].parse(input);
      const chars = Array.from(s);
      state.values = chars;
      state.table = [];
      const seen = new Map<string, number>();
      let left = 0, best = 0;
      state.variables = { left, best };
      emit('init', '初始化', '从空窗口开始，记录每个字符最近一次出现的位置。');
      for (let right = 0; right < chars.length; right++) {
        state.active = [right];
        state.pointers = { left, right };
        state.window = [left, right];
        state.variables = { left, right, best, char: chars[right] };
        emit('expand', '扩张窗口', `把字符「${chars[right]}」纳入窗口。`);
        if (seen.has(chars[right])) {
          left = Math.max(left, seen.get(chars[right])! + 1);
          state.pointers.left = left;
          state.window = [left, right];
          state.variables.left = left;
          emit('shrink', '调整左边界', `上一次出现在下标 ${seen.get(chars[right])}；left 更新为 ${left}，不会向左退。`);
        }
        seen.set(chars[right], right);
        state.table = [...seen].map(([char, index]) => [char, index]);
        emit('record', '记录位置', `更新「${chars[right]}」最近出现的位置为 ${right}。`);
        best = Math.max(best, right - left + 1);
        state.variables = { left, right, length: right - left + 1, best };
        emit('best', '更新最优', `当前无重复窗口长度为 ${right - left + 1}，历史最长为 ${best}。`);
      }
      return finish(best, 'return');
    }
    case 'maximum-subarray': {
      const { nums } = schemas[id].parse(input);
      state.values = nums;
      let ending = nums[0], best = nums[0], start = 0;
      state.active = [0]; state.window = [0, 0]; state.pointers = { i: 0 };
      state.variables = { ending, best };
      emit('init', '初始化', `用第一个数 ${nums[0]} 初始化，不能把负数数组的答案误设为 0。`);
      for (let i = 1; i < nums.length; i++) {
        const restart = nums[i] > ending + nums[i];
        ending = Math.max(nums[i], ending + nums[i]);
        if (restart) start = i;
        state.active = [i]; state.window = [start, i]; state.pointers = { i };
        state.variables = { ending, best };
        emit('extend', restart ? '重新开始' : '延续子数组', `${restart ? '舍弃负贡献的前缀，从当前数字开始' : '延续之前的连续子数组'}，ending = ${ending}。`);
        best = Math.max(best, ending);
        state.variables.best = best;
        emit('best', '更新最优', `全局最大子数组和为 ${best}。绿色区间表示当前候选，不一定是历史最优。`);
      }
      return finish(best, 'return');
    }
    case 'reverse-linked-list': {
      const { values } = schemas[id].parse(input);
      const nodes = values.map((value, id) => ({ id, value, next: id + 1 < values.length ? id + 1 : null }));
      state.values = values;
      let prev: number | null = null, curr: number | null = values.length ? 0 : null;
      const sync = (next?: number | null) => {
        state.links = nodes.flatMap((node) => node.next === null ? [] : [[node.id, node.next] as [number, number]]);
        state.pointers = { prev, curr, ...(next === undefined ? {} : { next }) };
        state.variables = { prev: prev === null ? null : `node ${prev}`, curr: curr === null ? null : `node ${curr}` };
      };
      sync();
      emit('init', '初始化', 'prev = null，curr 指向头节点。节点 ID 独立于节点值。');
      while (curr !== null) {
        const currentId: number = curr;
        const next: number | null = nodes[currentId].next;
        state.active = [currentId]; sync(next);
        emit('save-next', '保存后继', `先记住 node ${currentId} 的原始后继，避免断链后丢失。`);
        nodes[currentId].next = prev; sync(next);
        emit('rewire', '反转连接', `把 node ${currentId}.next 改为 ${prev === null ? 'null' : `node ${prev}`}。`);
        prev = currentId; state.settled.push(currentId); sync(next);
        emit('advance-prev', '推进 prev', `已反转部分的头节点现在是 node ${prev}。`);
        curr = next; sync(); state.active = curr === null ? [] : [curr];
        emit('advance-curr', '推进 curr', curr === null ? 'curr = null，全部节点处理完毕。' : `继续处理 node ${curr}。`);
      }
      const result: number[] = [];
      for (let node = prev; node !== null; node = nodes[node].next) result.push(nodes[node].value);
      return finish(result, 'return');
    }
    case 'binary-tree-level-order-traversal': {
      const { tree } = schemas[id].parse(input);
      const nodes = parseTree(tree);
      state.values = nodes.map((n) => n.value);
      state.links = nodes.flatMap((n) => [n.left, n.right].flatMap((child) => child === null ? [] : [[n.id, child] as [number, number]]));
      state.edgeLabels = Object.fromEntries(nodes.flatMap((n) => [n.left === null ? [] : [[`${n.id}-${n.left}`, 'L']], n.right === null ? [] : [[`${n.id}-${n.right}`, 'R']]].flat()));
      state.levels = [];
      state.queue = [];
      if (!nodes.length) { emit('empty', '空树', '根节点为空，返回空数组。'); return finish([], 'empty'); }
      const queue = [0], result: number[][] = [];
      let head = 0;
      state.variables = { queue: [nodes[0].value] };
      state.queue = [0];
      emit('init', '初始化队列', '把根节点加入队列。');
      while (head < queue.length) {
        const end = queue.length, level: number[] = [];
        state.variables = { queue: queue.slice(head).map((i) => nodes[i].value), remaining: end - head, level: [] };
        emit('level', '开始新层', `这一层有 ${end - head} 个节点。`);
        while (head < end) {
          const node = nodes[queue[head++]];
          state.active = [node.id]; state.pointers = { node: node.id };
          state.variables.queue = queue.slice(head).map((i) => nodes[i].value);
          state.queue = queue.slice(head);
          emit('dequeue', '出队', `从队首取出节点 ${node.value}。`);
          level.push(node.value); state.settled.push(node.id);
          state.variables.level = [...level]; state.variables.remaining = end - head;
          emit('visit', '访问节点', `把 ${node.value} 加入当前层。`);
          for (const [child, location] of [[node.left, 'enqueue-left'], [node.right, 'enqueue-right']] as const) {
            if (child !== null) {
              queue.push(child); state.variables.queue = queue.slice(head).map((i) => nodes[i].value);
              state.queue = queue.slice(head);
              emit(location, '孩子入队', `将${location === 'enqueue-left' ? '左' : '右'}孩子 ${nodes[child].value} 加入队尾。`);
            }
          }
        }
        result.push(level); state.levels = result;
        emit('save-level', '保存这一层', `第 ${result.length} 层为 [${level.join(', ')}]。`);
      }
      state.active = [];
      return finish(result, 'return');
    }
    case 'climbing-stairs': {
      const { n } = schemas[id].parse(input);
      const dp = Array<number>(n + 1).fill(0);
      state.values = Array.from({ length: n + 1 }, (_, i) => i); state.dp = dp;
      dp[0] = 1; state.settled = [0]; state.variables = { n };
      emit('base-zero', '基础状态', 'dp[0] = 1，表示还没爬楼梯的唯一空走法。');
      if (n >= 1) { dp[1] = 1; state.settled.push(1); emit('base-one', '基础状态', 'dp[1] = 1，只能迈一步。'); }
      for (let i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
        state.active = [i]; state.pointers = { i }; state.variables = { n, i, 'dp[i−1]': dp[i - 1], 'dp[i−2]': dp[i - 2] };
        state.settled.push(i);
        emit('transition', '状态转移', `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = ${dp[i]}。`);
      }
      return finish(dp[n], 'return');
    }
    case 'coin-change': {
      const { coins, amount } = schemas[id].parse(input);
      const dp = Array<number>(amount + 1).fill(Infinity); dp[0] = 0;
      state.values = Array.from({ length: amount + 1 }, (_, i) => i);
      const sync = () => { state.dp = dp.map((v) => Number.isFinite(v) ? v : '∞'); };
      sync(); state.settled = [0]; state.variables = { coins, amount };
      emit('base-zero', '基础状态', '凑出金额 0 需要 0 枚硬币；其他金额暂时不可达。');
      for (let a = 1; a <= amount; a++) {
        state.active = [a]; state.pointers = { a }; state.variables = { coins, amount, a };
        emit('amount', '枚举金额', `计算凑出金额 ${a} 所需的最少硬币数。`);
        for (const coin of coins) {
          state.pointers = { a };
          state.variables.coin = coin;
          emit('try-coin', '尝试硬币', coin > a ? `面额 ${coin} 大于金额 ${a}，跳过。` : `尝试最后一枚使用面额 ${coin}，查看 dp[${a - coin}]。`);
          if (coin <= a) {
            dp[a] = Math.min(dp[a], dp[a - coin] + 1); sync();
            state.pointers = { a, from: a - coin };
            emit('transition', '状态转移', Number.isFinite(dp[a]) ? `dp[${a}] 更新为 ${dp[a]}。` : `金额 ${a} 仍不可达，保持 ∞。`);
          }
        }
        state.settled.push(a);
      }
      sync();
      return finish(Number.isFinite(dp[amount]) ? dp[amount] : -1, 'return');
    }
    case 'longest-increasing-subsequence': {
      const { nums } = schemas[id].parse(input);
      const dp = Array<number>(nums.length).fill(1); let best = 0;
      const parents = Array<number>(nums.length).fill(-1);
      const chain = (end: number) => {
        const indices: number[] = [];
        for (let node = end; node !== -1; node = parents[node]) indices.push(node);
        return indices.reverse();
      };
      state.values = nums; state.dp = dp; state.variables = { best };
      state.path = []; state.bestPath = [];
      emit('init', '初始化', '每个数单独构成长度为 1 的递增子序列。');
      for (let i = 0; i < nums.length; i++) {
        state.active = [i]; state.pointers = { i };
        state.path = chain(i);
        for (let j = 0; j < i; j++) {
          state.pointers = { i, j }; state.active = [i, j]; state.variables = { i, j, best };
          emit('compare', '比较', `${nums[j]} ${nums[j] < nums[i] ? '<' : '≥'} ${nums[i]}，${nums[j] < nums[i] ? '可以尝试延长' : '不能接在后面'}。`);
          if (nums[j] < nums[i]) {
            if (dp[j] + 1 > dp[i]) parents[i] = j;
            dp[i] = Math.max(dp[i], dp[j] + 1);
            state.path = chain(i);
            emit('transition', '状态转移', `dp[${i}] = max(dp[${i}], dp[${j}] + 1) = ${dp[i]}。`);
          }
        }
        if (dp[i] > best) state.bestPath = chain(i);
        best = Math.max(best, dp[i]); state.variables = { i, best }; state.settled.push(i);
        state.active = [i];
        emit('best', '更新最优', `以 ${nums[i]} 结尾最长为 ${dp[i]}，全局最长为 ${best}。`);
      }
      state.path = [...state.bestPath];
      return finish(best, 'return');
    }
  }
}
