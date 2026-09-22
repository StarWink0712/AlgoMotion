import type { GeneratedTrace, Verification } from '../../src/engine/generated';

export function checkTeaching(trace: GeneratedTrace, verification: Verification) {
  const issues: string[] = [], frames = trace.frames, last = frames.at(-1)!;
  if (last.active.length || last.dependencies.length || last.queue.length) issues.push('最终帧需清空 active、dependencies、queue，不应残留处理中状态。');
  if (verification !== 'none') {
    const data = trace.input as { grid: number[][] };
    const grid = data.grid, cols = grid[0].length;
    if (frames.some((f) => JSON.stringify(f.grid) !== JSON.stringify(grid))) issues.push('已选网格验证器要求每帧保留原始输入网格。');
    const outputPath = (trace.result as { path?: number[][] })?.path;
    if (Array.isArray(outputPath) && outputPath.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger))) {
      const ids = outputPath.map(([r, c]) => r * cols + c);
      if (JSON.stringify(last.path) !== JSON.stringify(ids)) issues.push('最终轨迹 path 与实际返回路径不一致。');
      const lengths = new Set(frames.map((f) => f.path.length));
      if (ids.length > 1 && ids.some((_, i) => !lengths.has(i + 1))) issues.push('缺少逐步路径重建：请在真实前驱回溯循环内每加入一个节点时记录部分路径，不要只记录完整路径。');
    }
    if (verification === 'grid-shortest-4') {
      const blocked = grid.flatMap((row, r) => row.flatMap((v, c) => v === 1 ? [r * cols + c] : []));
      if (frames.some((f) => JSON.stringify([...new Set(f.blocked)].sort((a, b) => a - b)) !== JSON.stringify(blocked))) issues.push('blocked 障碍标记必须与输入中值为 1 的格子一致，并在所有帧保持。');
      if (grid.flat().length > 1 && ((trace.result as { distance?: number } | null)?.distance ?? -1) > 0 && !frames.some((f) => f.queue.length)) issues.push('未记录实际 BFS 队列。');
    } else {
      if (frames.some((f) => f.dp.length !== grid.flat().length)) issues.push('DP 需记录与网格等长的扁平状态数组，未知元素用 null。');
      if (grid.length > 1 && cols > 1 && !frames.some((f) => f.dependencies.some((d) => d.chosen) && f.dependencies.some((d) => !d.chosen))) issues.push('未记录上/左候选比较与选中来源。');
    }
  }
  return { status: issues.length ? 'failed' as const : verification === 'none' ? 'not_run' as const : 'passed' as const, details: issues.length ? issues : [verification === 'none' ? '仅检查终态清理；该题未配置独立教学语义检查器。' : '有限检查：网格/障碍、路径重建、终态与状态依赖。不构成算法正确性证明。'] };
}
