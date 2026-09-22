import { z } from 'zod';
import { recorder } from '../recorder';
import type { Frame, Scalar, Trace } from '../types';

const integer = z.number().int().min(-10000).max(10000);
const matrix = <T extends z.ZodTypeAny>(cell: T, limit = 6) => z.array(z.array(cell).min(1).max(limit)).max(limit).refine((a) => a.every((row) => row.length === a[0].length));
export const explorationSchemas = {
  'letter-combinations-of-a-phone-number': z.object({ digits: z.string().regex(/^[2-9]{0,3}$/) }).strict(),
  'generate-parentheses': z.object({ n: z.number().int().min(0).max(4) }).strict(),
  'palindrome-partitioning': z.object({ s: z.string().regex(/^[a-zA-Z]{0,7}$/) }).strict(),
  'word-search': z.object({ board: matrix(z.string().regex(/^[a-zA-Z]$/), 4), word: z.string().regex(/^[a-zA-Z]{0,4}$/) }).strict(),
  'n-queens': z.object({ n: z.number().int().min(1).max(5) }).strict(),
  'number-of-islands': z.object({ grid: matrix(z.number().int().min(0).max(1)) }).strict(),
  'rotting-oranges': z.object({ grid: matrix(z.number().int().min(0).max(2)) }).strict(),
  'course-schedule': z.object({ numCourses: z.number().int().min(0).max(10), prerequisites: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])).max(24) }).strict().refine(({ numCourses, prerequisites }) => prerequisites.every(([a, b]) => a < numCourses && b < numCourses) && new Set(prerequisites.map((p) => p.join(','))).size === prerequisites.length),
  'spiral-matrix': z.object({ matrix: matrix(integer) }).strict(),
  'set-matrix-zeroes': z.object({ matrix: matrix(integer) }).strict(),
};
export type ExplorationId = keyof typeof explorationSchemas;
export interface ExplorationToken { key: number; text: string; source: number[] }
export interface ExplorationView {
  version: 1;
  mode: 'sequence' | 'grid' | 'graph';
  rows: number;
  cols: number;
  path: number[];
  witness: number[];
  tokens: ExplorationToken[];
  removed?: ExplorationToken;
  answers: (string | string[])[];
  output: Scalar[];
  labels: string[];
  queue: number[];
  edges: [number, number][];
  processedEdges: [number, number][];
  arrows: { from: number; to: number; blocked?: boolean }[];
  bounds?: { top: number; bottom: number; left: number; right: number };
  groups?: string[];
  target?: string;
  equation: string;
  status: string;
}
export const explorationView = (frame: Frame) => frame.variables.view as ExplorationView;
export const phoneLetters = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];

export function runExploration(id: ExplorationId, input: unknown): Trace {
  const data = explorationSchemas[id].parse(input);
  const { state, emit, finish } = recorder(id, input);
  const view: ExplorationView = { version: 1, mode: 'sequence', rows: 0, cols: 0, path: [], witness: [], tokens: [], answers: [], output: [], labels: [], queue: [], edges: [], processedEdges: [], arrows: [], equation: '', status: '' };
  let key = 0;
  const record = (location: string, action: string, explanation: string, equation: string, vars: Record<string, unknown> = {}) => {
    view.equation = equation; state.variables = { view, ...vars }; emit(location, action, explanation); view.arrows = []; delete view.removed;
  };
  const done = (result: unknown) => { state.active = []; state.pointers = {}; view.arrows = []; view.equation = `返回 ${typeof result === 'object' ? '结果见输出区' : JSON.stringify(result)}`; return finish(result, 'return'); };
  const choose = (text: string, source: number[]) => { view.tokens.push({ key: key++, text, source }); state.active = source; };
  const undo = () => { view.removed = view.tokens.pop()!; state.active = view.removed.source; };

  if (id === 'letter-combinations-of-a-phone-number') {
    const { digits } = explorationSchemas[id].parse(input); state.values = [...digits]; view.groups = [...digits].map((d) => phoneLetters[Number(d)]);
    record('init', '一个数字选一个字母', '按数字位置逐层选择；空号码不产生任何组合。', `数字 ${digits || '空'}`);
    const dfs = (pos: number): void => {
      if (pos === digits.length) { const answer = view.tokens.map((t) => t.text).join(''); view.answers.push(answer); record('save', '保存组合', '每个数字恰好贡献一个字母，保存独立字符串。', `收集 ${answer}`); return; }
      for (const char of phoneLetters[Number(digits[pos])]) {
        choose(char, [pos]); record('choose', '选择当前数字的一个字母', `${digits[pos]} 对应 ${phoneLetters[Number(digits[pos])]}，这次选择 ${char}。`, `位置 ${pos} → ${char}`, { pos });
        dfs(pos + 1); undo(); record('undo', '撤销末位字母', '返回这一层，尝试同一个数字的下一个字母。', `恢复到 ${pos} 个字母`, { pos });
      }
    };
    if (digits.length) dfs(0); return done(view.answers);
  }
  if (id === 'generate-parentheses') {
    const { n } = explorationSchemas[id].parse(input); state.values = ['(', ')'];
    record('init', '只扩展合法前缀', '左括号未用完时可以加入；右括号数量必须少于左括号才能加入。', `总共 ${n} 对`, { n });
    const dfs = (open: number, close: number): void => {
      view.labels = [`已用 ${open}/${n}`, `已用 ${close}/${n}`];
      if (open === n && close === n) { const answer = view.tokens.map((t) => t.text).join(''); view.answers.push(answer); record('save', '保存合法括号串', '每个前缀都没有多余右括号，最终左右数量相等。', `收集 ${answer || '空串'}`, { open, close }); return; }
      for (const source of [0, 1]) {
        const allowed = source === 0 ? open < n : close < open; state.active = [source];
        if (!allowed) { record('blocked', '当前括号不能加入', source === 0 ? '左括号已全部用完。' : '没有尚未配对的左括号。', source === 0 ? `${open} = ${n}` : `${close} = ${open}`, { open, close }); continue; }
        choose(source === 0 ? '(' : ')', [source]); const a = open + (source === 0 ? 1 : 0), b = close + (source === 1 ? 1 : 0); view.labels = [`已用 ${a}/${n}`, `已用 ${b}/${n}`];
        record('choose', '加入一个合法括号', '保持所有前缀的左括号数不少于右括号数。', `${a} 左 / ${b} 右`, { open: a, close: b });
        dfs(a, b); undo(); view.labels = [`已用 ${open}/${n}`, `已用 ${close}/${n}`]; record('undo', '撤销括号并恢复计数', '继续尝试当前前缀的另一种扩展。', `${open} 左 / ${close} 右`, { open, close });
      }
    };
    dfs(0, 0); return done(view.answers);
  }
  if (id === 'palindrome-partitioning') {
    const { s } = explorationSchemas[id].parse(input); state.values = [...s];
    record('init', '每次截取一段回文前缀', '从当前起点枚举终点，只选择正反相同的连续片段。', `字符串长度 ${s.length}`);
    const dfs = (start: number): void => {
      if (start === s.length) { view.answers.push(view.tokens.map((t) => t.text)); record('save', '保存完整分割', '所选片段按顺序拼回原字符串。', `收集 ${view.tokens.map((t) => t.text).join(' | ') || '空分割'}`); return; }
      for (let end = start; end < s.length; end++) {
        let a = start, b = end; while (a < b && s[a] === s[b]) { a++; b--; }
        const valid = a >= b; state.active = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        record('check', '双端检查候选片段', valid ? '候选片段是回文，可以作为下一段。' : `两端字符 ${s[a]} 与 ${s[b]} 不同，跳过。`, `${s.slice(start, end + 1)} ${valid ? '是' : '不是'}回文`, { start, end, valid });
        if (!valid) continue;
        choose(s.slice(start, end + 1), [...state.active]); record('choose', '接入回文片段', '下一层从这段之后继续，不重叠、不漏字符。', `下一起点 ${end + 1}`);
        dfs(end + 1); undo(); record('undo', '撤销最后一段', '回到原起点，尝试更长的回文片段。', `恢复起点 ${start}`);
      }
    };
    dfs(0); return done(view.answers);
  }
  if (id === 'course-schedule') {
    const { numCourses, prerequisites } = explorationSchemas[id].parse(input); view.mode = 'graph'; state.values = Array.from({ length: numCourses }, (_, i) => i);
    const neighbors: number[][] = Array.from({ length: numCourses }, () => []), degree = Array(numCourses).fill(0) as number[];
    for (const [course, pre] of prerequisites) { neighbors[pre].push(course); degree[course]++; view.edges.push([pre, course]); }
    state.links = view.edges; view.queue = degree.flatMap((d, i) => d === 0 ? [i] : []); view.labels = degree.map((d) => `入度 ${d}`);
    record('init', '先学习没有前置要求的课程', '[课程, 前置] 表示有向边 前置 → 课程；初始所有入度 0 的课程入队。', `可学 ${view.queue.length} / ${numCourses}`, { completed: 0 });
    while (view.queue.length) {
      const node = view.queue.shift()!; state.active = [node]; view.output.push(node); state.settled.push(node);
      record('dequeue', '学习队首课程', `完成课程 ${node}，随后解除它对后续课程的要求。`, `完成 ${view.output.length} / ${numCourses}`, { completed: view.output.length });
      for (const child of neighbors[node]) {
        degree[child]--; view.processedEdges.push([node, child]); view.arrows = [{ from: node, to: child }]; view.labels = degree.map((d) => `入度 ${d}`); state.active = [node, child];
        record('release', '解除一个前置依赖', `课程 ${child} 尚需 ${degree[child]} 个前置课程。`, `入度[${child}] → ${degree[child]}`, { child, degree: degree[child] });
        if (degree[child] === 0) { view.queue.push(child); record('enqueue', '所有前置已满足，加入可学队列', '每个课程只在入度降到 0 时加入。', `课程 ${child} 可以学习`); }
      }
    }
    const valid = view.output.length === numCourses; view.status = valid ? '全部课程可完成' : '剩余课程被环或环的后续依赖阻塞';
    record('check', '检查是否完成全部课程', valid ? '已产生完整拓扑学习顺序。' : '队列已空但仍有未完成课程；未完成节点不一定都在环上。', `${view.output.length} ${valid ? '=' : '<'} ${numCourses}`, { valid }); return done(valid);
  }

  const grid: Scalar[][] = 'board' in data ? data.board : 'grid' in data ? data.grid : 'matrix' in data ? data.matrix : Array.from({ length: (data as { n: number }).n }, () => Array((data as { n: number }).n).fill('.'));
  view.mode = 'grid'; view.rows = grid.length; view.cols = grid[0]?.length ?? 0; state.values = grid.flat(); view.labels = state.values.map(() => '');
  const cols = view.cols, rows = view.rows, neighbors = (node: number) => {
    const row = Math.floor(node / cols), col = node % cols;
    return [[row - 1, col], [row, col + 1], [row + 1, col], [row, col - 1]].flatMap(([r, c]) => r >= 0 && r < rows && c >= 0 && c < cols ? [r * cols + c] : []);
  };
  const pos = (node: number) => `(${Math.floor(node / cols)},${node % cols})`;
  if (id === 'word-search') {
    const { word } = explorationSchemas[id].parse(input); view.target = word; const used = new Set<number>();
    record('init', '沿上下左右匹配单词', '每个格子在同一路径中最多用一次，失败后恢复占用；空单词定义为存在。', `查找 ${word || '空串'}`);
    const dfs = (node: number, index: number): boolean => {
      if (used.has(node) || state.values[node] !== word[index]) return false;
      used.add(node); view.path.push(node); state.active = [node]; state.settled = [...used]; view.labels[node] = `第 ${index + 1} 字`;
      if (view.path.length > 1) view.arrows = [{ from: view.path.at(-2)!, to: node }];
      record('choose', '匹配并占用格子', `${pos(node)} 匹配 ${word[index]}，暂时不能重复使用。`, `已匹配 ${index + 1} / ${word.length}`, { index });
      let found = index + 1 === word.length;
      if (found) { view.witness = [...view.path]; record('found', '找到完整单词路径', '保存这条真实搜索到的路径，随后恢复工作占用。', `找到 ${word}`); }
      else for (const next of neighbors(node)) if (dfs(next, index + 1)) { found = true; break; }
      used.delete(node); view.path.pop(); view.labels[node] = ''; state.settled = [...used]; state.active = [node];
      view.removed = { key: key++, text: String(state.values[node]), source: [node] };
      record('undo', '退出格子，恢复占用', found ? '答案路径单独保留；当前搜索栈逐层恢复。' : '本分支未找到完整单词，回退尝试其他方向。', `工作路径剩余 ${view.path.length} 格`); return found;
    };
    if (!word.length) return done(true);
    if (word.length > state.values.length) { record('impossible', '格子数不足', '单条路径不能重复使用格子。', `${word.length} > ${state.values.length}`); return done(false); }
    for (let node = 0; node < state.values.length; node++) if (dfs(node, 0)) return done(true);
    return done(false);
  }
  if (id === 'n-queens') {
    const { n } = explorationSchemas[id].parse(input); const queens: number[] = [], occupied = new Set<number>(), down = new Set<number>(), up = new Set<number>();
    record('init', '每行放一个皇后', '列与两组对角线不能冲突。Q 表示已放置皇后，冲突连线标出阻挡来源。', `${n} × ${n} 棋盘`);
    const dfs = (row: number): void => {
      if (row === n) { view.answers.push(Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => queens[r] === c ? 'Q' : '.').join(''))); record('save', '保存完整棋盘', '复制当前合法摆放，继续回溯寻找其他解。', `已找到 ${view.answers.length} 解`); return; }
      for (let col = 0; col < n; col++) {
        const node = row * n + col; state.active = [node];
        if (occupied.has(col) || down.has(row - col) || up.has(row + col)) {
          view.arrows = queens.flatMap((c, r) => c === col || Math.abs(r - row) === Math.abs(c - col) ? [{ from: r * n + c, to: node, blocked: true }] : []);
          record('blocked', '同列或对角线冲突', `${pos(node)} 受到已有皇后攻击，跳过。`, `第 ${row + 1} 行 / 第 ${col + 1} 列不可放`); continue;
        }
        occupied.add(col); down.add(row - col); up.add(row + col); queens.push(col); state.values[node] = 'Q'; view.path.push(node);
        record('choose', '放置皇后并进入下一行', '标记列、主对角线和副对角线。', `已放 ${queens.length} / ${n}`);
        dfs(row + 1); queens.pop(); occupied.delete(col); down.delete(row - col); up.delete(row + col); state.values[node] = '.'; view.path.pop(); state.active = [node];
        view.removed = { key: key++, text: 'Q', source: [node] }; record('undo', '撤回皇后与三个占用标记', '回到本行尝试后面的列；已保存棋盘保持不变。', `恢复 ${queens.length} 个皇后`);
      }
    };
    dfs(0); return done(view.answers);
  }
  if (id === 'number-of-islands' || id === 'rotting-oranges') {
    const island = id === 'number-of-islands', seen = new Set<number>(); let count = 0, minute = 0, fresh = state.values.filter((v) => v === 1).length;
    if (!island) state.values.forEach((value, node) => { if (value === 2) { view.queue.push(node); view.labels[node] = '0 分钟'; seen.add(node); } });
    state.settled = [...seen];
    record('init', island ? '按四邻接寻找连通陆地' : '所有腐烂橘子同时作为起点', island ? '1 是陆地，0 是水；对角接触不连接，入队时就标记。' : '0 是空地，1 是新鲜，2 是腐烂；同一轮只传播一格。', island ? '已发现 0 座岛' : `新鲜 ${fresh} 个 / 第 0 分钟`, { count, minute, fresh });
    const mark = (node: number, label: string) => { seen.add(node); view.labels[node] = label; state.settled = [...seen]; view.queue.push(node); };
    if (island) {
      for (let start = 0; start < state.values.length; start++) {
        if (state.values[start] !== 1 || seen.has(start)) continue;
        count++; mark(start, `岛 ${count}`); state.active = [start]; record('start', '发现新岛屿', '从未访问的陆地开始一次 BFS，本轮覆盖整座岛。', `岛屿数 → ${count}`, { count });
        while (view.queue.length) {
          const node = view.queue.shift()!; state.active = [node]; record('dequeue', '扩展队首陆地', `查看 ${pos(node)} 的四邻居。`, `岛 ${count} · 待处理 ${view.queue.length}`, { count });
          for (const next of neighbors(node)) if (state.values[next] === 1 && !seen.has(next)) {
            mark(next, `岛 ${count}`); state.active = [node, next]; view.arrows = [{ from: node, to: next }];
            record('discover', '相邻陆地属于同一座岛', '先标记再入队，避免被多个邻居重复加入。', `${pos(node)} → ${pos(next)}`, { count });
          }
        }
      }
      return done(count);
    }
    state.settled = [...seen];
    while (view.queue.length && fresh > 0) {
      const size = view.queue.length; minute++;
      record('layer', '固定本轮传播起点', '这一轮新腐烂的橘子只能在下一轮继续传播。', `第 ${minute} 分钟 · 本轮 ${size} 个起点`, { minute, fresh, size });
      for (let i = 0; i < size; i++) {
        const node = view.queue.shift()!; state.active = [node]; record('dequeue', '处理本轮一个起点', '只感染上下左右相邻的新鲜橘子。', `本轮 ${i + 1} / ${size}`, { minute, fresh });
        for (const next of neighbors(node)) if (state.values[next] === 1) {
          state.values[next] = 2; fresh--; mark(next, `${minute} 分钟`); state.active = [node, next]; view.arrows = [{ from: node, to: next }];
          record('infect', '感染并登记下一轮起点', '立即变为腐烂避免重复入队，但不会在本轮立刻再次传播。', `${pos(next)} 在第 ${minute} 分钟腐烂`, { minute, fresh });
        }
      }
    }
    view.status = fresh ? `仍有 ${fresh} 个新鲜橘子无法到达` : '没有剩余新鲜橘子';
    return done(fresh ? -1 : minute);
  }
  if (id === 'spiral-matrix') {
    let top = 0, bottom = rows - 1, left = 0, right = cols - 1;
    const bounds = () => { view.bounds = { top, bottom, left, right }; };
    bounds(); record('init', '沿外圈顺时针读取', '依次读取上、右、下、左边界；读取后收缩，退化为单行或单列时避免重复。', `${rows} 行 × ${cols} 列`);
    const read = (r: number, c: number) => {
      const node = r * cols + c, before = view.path.at(-1); view.path.push(node); view.output.push(state.values[node]); state.active = [node]; state.settled.push(node);
      if (before !== undefined) view.arrows = [{ from: before, to: node }];
      record('read', '读取一个尚未访问的格子', `${pos(node)} 的值 ${state.values[node]} 追加到结果。`, `已读取 ${view.output.length} / ${state.values.length}`);
    };
    while (top <= bottom && left <= right) {
      for (let c = left; c <= right; c++) read(top, c); top++; bounds(); record('top', '上边界向下收缩', '上边已全部读取。', `top → ${top}`);
      for (let r = top; r <= bottom; r++) read(r, right); right--; bounds(); record('right', '右边界向左收缩', '右边已全部读取。', `right → ${right}`);
      if (top <= bottom) { for (let c = right; c >= left; c--) read(bottom, c); bottom--; bounds(); record('bottom', '下边界向上收缩', '仍有未读行才读取下边。', `bottom → ${bottom}`); }
      if (left <= right) { for (let r = bottom; r >= top; r--) read(r, left); left++; bounds(); record('left', '左边界向右收缩', '仍有未读列才读取左边。', `left → ${left}`); }
    }
    return done(view.output);
  }
  const at = (r: number, c: number) => r * cols + c;
  record('init', '借第一行第一列记录置零标记', '不能遇零就扩散，否则新写的零会错误影响原本无零的行列。', `${rows} 行 × ${cols} 列`);
  if (!rows || !cols) return done([]);
  const firstRow = state.values.slice(0, cols).includes(0), firstCol = Array.from({ length: rows }, (_, r) => state.values[at(r, 0)]).includes(0);
  record('flags', '先保存首行与首列原始状态', '两个独立布尔量保存首行首列是否本来就有零。', `首行 ${firstRow ? '需' : '不需'}清零 / 首列 ${firstCol ? '需' : '不需'}清零`, { firstRow, firstCol });
  for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) {
    const node = at(r, c); state.active = [node];
    if (state.values[node] === 0) {
      state.values[at(r, 0)] = 0; state.values[at(0, c)] = 0; view.labels[at(r, 0)] = '行标记'; view.labels[at(0, c)] = '列标记';
      view.arrows = [{ from: node, to: at(r, 0) }, { from: node, to: at(0, c) }];
      record('mark', '原始内部零写入行列标记', '只记录首行首列，不提前修改其他内部格子。', `${pos(node)} → 行 ${r} / 列 ${c}`, { firstRow, firstCol });
    }
  }
  for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) if (state.values[at(r, 0)] === 0 || state.values[at(0, c)] === 0) {
    const node = at(r, c); state.values[node] = 0; state.active = [node];
    view.arrows = [at(r, 0), at(0, c)].filter((marker) => state.values[marker] === 0).map((from) => ({ from, to: node }));
    record('zero', '依据标记清零内部格子', '读取的标记来自原始零，不把新置零的内部格子当作标记。', `${pos(node)} → 0`, { firstRow, firstCol });
  }
  if (firstRow) { for (let c = 0; c < cols; c++) state.values[c] = 0; state.active = Array.from({ length: cols }, (_, c) => c); record('first-row', '最后清零首行', '使用开始时保存的布尔量，不读取已经改动的首行。', '首行 → 0'); }
  if (firstCol) { for (let r = 0; r < rows; r++) state.values[at(r, 0)] = 0; state.active = Array.from({ length: rows }, (_, r) => at(r, 0)); record('first-col', '最后清零首列', '首列与首行原始状态互不替代。', '首列 → 0'); }
  view.labels.fill(''); return done(Array.from({ length: rows }, (_, r) => state.values.slice(r * cols, (r + 1) * cols)));
}
