// Hand-authored ACCEPTANCE / MOCK fixtures only. Never imported by production code.
// These Python programs are NOT evidence of a real model generation.
import type { Bundle, Contract, GeneratedTrace, Program, Verification } from '../src/engine/generated';
import type { SceneSpec } from '../src/engine/scene-spec';

export const mockPresentation: SceneSpec = { version: 1, title: 'MOCK 轨迹布局', description: '测试替身，非真实模型设计', theme: 'mint', layout: 'split', panels: [
  { id: 'board', kind: 'grid', title: '运行网格', source: 'grid' },
  { id: 'frontier', kind: 'queue', title: '待处理队列', source: 'queue' },
  { id: 'route', kind: 'path', title: '重建路线', source: 'path' },
  { id: 'answer', kind: 'result', title: '实际返回值', source: 'result' },
] };

export const bfsSource = `在带障碍的矩形网格中求任意 start 到 end 的最短路径。输入 JSON {grid,start,end}，grid 是 1 到 12 行、1 到 12 列的矩形整数数组，0 可走，1 为障碍；start/end 是网格内 [行,列] 坐标。只能上下左右移动，距离按边数计算。返回 {distance,path}，path 是含起终点的坐标数组。不可达或起终点为障碍返回 {distance:-1,path:[]}。起终点重合且可走返回 distance:0 和单点路径。展示实际 BFS 队列、访问、前驱依赖和逐步路径重建。`;
export const dpSource = `给定 JSON {grid}，grid 是非负整数矩形网格，1 到 12 行、1 到 12 列，元素 0 到 1000000。从左上角到右下角，每次仅向右或向下移动。求经过格子权重总和的最小值，包含起点终点的权重。返回 {sum,path}，path 为含起终点的 [行,列] 数组。单格返回该格值与单点路径。请展示实际 DP 状态、每个候选来源、选中依赖和逐步重建的最优路径。`;
export const bfsPython = `from collections import deque

def solve(data, trace):
    grid = data["grid"]
    rows, cols = len(grid), len(grid[0])
    start, end = tuple(data["start"]), tuple(data["end"])
    ident = lambda p: p[0] * cols + p[1]
    blocked = [r * cols + c for r in range(rows) for c in range(cols) if grid[r][c] == 1]
    queue = deque()
    prev = {}
    trace.snapshot("初始化", grid=grid, blocked=blocked, variables={"distance": -1})
    if grid[start[0]][start[1]] or grid[end[0]][end[1]]:
        trace.snapshot("端点为障碍", explanation="没有合法路径")
        return {"distance": -1, "path": []}
    queue.append(start)
    prev[start] = None
    trace.snapshot("起点入队", queue=[ident(start)], visited=[ident(start)], active=[ident(start)])
    while queue:
        cell = queue.popleft()
        trace.snapshot("出队", queue=[ident(p) for p in queue], active=[ident(cell)], dependencies=[])
        if cell == end:
            path = []
            while cell is not None:
                path.insert(0, list(cell))
                trace.snapshot("路径重建", path=[ident(p) for p in path], active=[ident(cell)], explanation="沿真实记录的前驱回溯")
                cell = prev[cell]
            trace.snapshot("完成", active=[], queue=[], variables={"distance": len(path) - 1})
            return {"distance": len(path) - 1, "path": path}
        for dr, dc in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
            nxt = (cell[0] + dr, cell[1] + dc)
            r, c = nxt
            if 0 <= r < rows and 0 <= c < cols and not grid[r][c] and nxt not in prev:
                prev[nxt] = cell
                queue.append(nxt)
                trace.snapshot("访问并入队", visited=[ident(p) for p in prev], queue=[ident(p) for p in queue], active=[ident(nxt)], dependencies=[{"from": ident(cell), "to": ident(nxt), "label": "首次到达，记录前驱", "chosen": True}])
    trace.snapshot("无解", active=[], queue=[], dependencies=[], path=[])
    return {"distance": -1, "path": []}
`;
export const dpPython = `def solve(data, trace):
    grid = data["grid"]
    rows, cols = len(grid), len(grid[0])
    dp = [None] * (rows * cols)
    prev = {}
    visited = []
    trace.snapshot("初始化 DP", grid=grid, dp=dp)
    for r in range(rows):
        for c in range(cols):
            i = r * cols + c
            candidates = []
            if r > 0:
                candidates.append(i - cols)
            if c > 0:
                candidates.append(i - 1)
            source = min(candidates, key=lambda j: dp[j]) if candidates else None
            deps = [{"from": j, "to": i, "label": str(dp[j]) + " + " + str(grid[r][c]), "chosen": j == source} for j in candidates]
            trace.snapshot("比较候选来源", active=[i], dependencies=deps, explanation="上方与左方已知代价，选择更小者")
            dp[i] = grid[r][c] + (dp[source] if source is not None else 0)
            prev[i] = source
            visited.append(i)
            trace.snapshot("写入最优状态", dp=dp, visited=visited, variables={"cost": dp[i]})
    ids, cell = [], rows * cols - 1
    while cell is not None:
        ids.insert(0, cell)
        trace.snapshot("路径重建", path=ids, active=[cell], dependencies=[], explanation="沿选中的状态依赖回溯")
        cell = prev[cell]
    result = {"sum": dp[-1], "path": [[i // cols, i % cols] for i in ids]}
    trace.snapshot("完成", active=[], variables={"sum": dp[-1]})
    return result
`;

// Test-only reference used to simulate a sandbox in unit/UI tests. Not Python execution.
export function fixtureResult(kind: Verification, input: unknown): { distance: number; path: number[][] } | { sum: number; path: number[][] } {
  const data = input as { grid: number[][]; start: number[]; end: number[] };
  const g = data.grid, rows = g.length, cols = g[0].length;
  if (kind === 'grid-shortest-4') {
    const s = data.start[0] * cols + data.start[1], end = data.end[0] * cols + data.end[1];
    if (g[data.start[0]][data.start[1]] || g[data.end[0]][data.end[1]]) return { distance: -1, path: [] };
    const prev = new Map<number, number | null>([[s, null]]), queue = [s];
    while (queue.length) {
      const id = queue.shift()!;
      if (id === end) { const path: number[][] = []; let at: number | null = id; while (at !== null) { path.unshift([Math.floor(at / cols), at % cols]); at = prev.get(at)!; } return { distance: path.length - 1, path }; }
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const r = Math.floor(id / cols) + dr, c = id % cols + dc, n = r * cols + c;
        if (r >= 0 && r < rows && c >= 0 && c < cols && !g[r][c] && !prev.has(n)) { prev.set(n, id); queue.push(n); }
      }
    }
    return { distance: -1, path: [] };
  }
  const costs = Array<number>(rows * cols).fill(0), paths: number[][][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const id = r * cols + c;
    const sources = [r > 0 ? id - cols : -1, c > 0 ? id - 1 : -1].filter((n) => n >= 0).sort((a, b) => costs[a] - costs[b]);
    const prev = sources[0]; costs[id] = (prev === undefined ? 0 : costs[prev]) + g[r][c]; paths[id] = [...(paths[prev] ?? []), [r, c]];
  }
  return { sum: costs.at(-1)!, path: paths.at(-1)! };
}
export function fixtureProgram(kind: Exclude<Verification, 'none'>): Program {
  const shortest = kind === 'grid-shortest-4';
  const input = shortest ? { grid: [[0, 0, 0], [1, 1, 0], [0, 0, 0]], start: [0, 0], end: [2, 2] } : { grid: [[1, 3, 1], [1, 5, 1], [4, 2, 1]] };
  const properties: Record<string, unknown> = { grid: { type: 'array', minItems: 1, maxItems: 12, items: { type: 'array', minItems: 1, maxItems: 12, items: { type: 'integer', minimum: 0, maximum: shortest ? 1 : 1_000_000 } } } };
  if (shortest) for (const key of ['start', 'end']) properties[key] = { type: 'array', minItems: 2, maxItems: 2, items: { type: 'integer', minimum: 0, maximum: 11 } };
  const contract: Contract = { title: shortest ? '障碍网格中的最短路线' : '网格的最小通行代价', summary: shortest ? bfsSource : dpSource, inputSchema: JSON.stringify({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false }), outputDescription: shortest ? '{distance,path}，边数与最短坐标路径，无解 -1 / []' : '{sum,path}，包含端点的最小和与坐标路径', assumptions: [shortest ? '四邻接、0 可走、距离为边数' : '只向右或下，包含起终点权重'], constraints: ['1..12 行和列，矩形网格'], questions: [], supported: true, limitation: '', examples: [{ input, expected: fixtureResult(kind, input), explanation: '验收样例' }] };
  return { source: shortest ? bfsSource : dpSource, contract, verification: kind, python: shortest ? bfsPython : dpPython };
}
export function wireContract(contract: Contract) { return { ...contract, examples: contract.examples.map((e) => ({ inputJson: JSON.stringify(e.input), expectedJson: JSON.stringify(e.expected), explanation: e.explanation })) }; }
export function mockTrace(program: Program, input: unknown): GeneratedTrace {
  const g = (input as { grid: number[][] }).grid, result = fixtureResult(program.verification, input);
  const base = { line: 1, action: 'MOCK 初始快照（非 Python 执行）', explanation: '测试替身', grid: g, active: [], visited: [], blocked: g.flatMap((row, r) => row.flatMap((v, c) => program.verification === 'grid-shortest-4' && v === 1 ? [r * row.length + c] : [])), queue: [], path: [], dp: program.verification === 'grid-min-right-down' ? g.flat() : [], dependencies: [], variables: {} };
  const path = result.path.map(([r, c]) => r * g[0].length + c);
  const next = Math.min(1, g.flat().length - 1);
  return { version: 3, origin: 'python-runtime', input, result, frames: [
    { ...base, step: 0 },
    { ...base, step: 1, action: 'MOCK 访问', active: [0], visited: [0], queue: [0] },
    { ...base, step: 2, action: 'MOCK 候选', active: [next], visited: [...new Set([0, next])], queue: [next], dependencies: [{ from: 0, to: next, label: 'MOCK: 1 + 3', chosen: true }, ...(g.length > 1 && g[0].length > 1 ? [{ from: g[0].length, to: next, label: 'MOCK 未选择', chosen: false }] : [])] },
    ...path.map((_, i) => ({ ...base, step: i + 3, action: 'MOCK 路径重建', visited: path, path: path.slice(0, i + 1) })),
    { ...base, step: path.length + 3, action: 'MOCK 完成', visited: path, path },
  ] };
}
export function mockBundle(kind: Exclude<Verification, 'none'>): Bundle {
  const program = fixtureProgram(kind);
  return { format: 'algomotion-generated', version: 1, program, trace: mockTrace(program, program.contract.examples[0].input), evidence: { structure: 'passed', runtime: 'passed', examples: 'passed', independent: 'passed', details: ['MOCK UI fixture. No real model or Docker execution.'] } };
}
