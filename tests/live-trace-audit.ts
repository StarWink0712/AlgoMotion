// Acceptance semantics specific to the two test tasks, not generic correctness claims.
// No Python execution, provider call or modification to the source or runtime trace.
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { parseBundle } from '../src/engine/generated';

for (const arg of process.argv.slice(2)) {
  const file = resolve(arg), bundle = parseBundle(await readFile(file, 'utf8'));
  const frames = bundle.trace.frames, last = frames.at(-1)!;
  const findings: string[] = [];
  const lengths = new Set(frames.map((f) => f.path.length));
  if (last.path.length > 1 && !Array.from({ length: last.path.length }, (_, i) => i + 1).every((n) => lengths.has(n))) findings.push('路径重建未记录每一个中间长度，只展示完整路径不满足逐步重建要求。');
  if (last.active.length || last.dependencies.length || last.queue.length) findings.push('最终帧保留瞬时高亮、候选依赖或队列，未明确清空。');
  if (bundle.program.verification === 'grid-shortest-4') {
    const grid = (bundle.trace.input as { grid: number[][] }).grid;
    const expected = grid.flatMap((row, r) => row.flatMap((v, c) => v === 1 ? [r * row.length + c] : []));
    const mismatches = frames.filter((f) => JSON.stringify([...new Set(f.blocked)].sort((a, b) => a - b)) !== JSON.stringify(expected));
    if (mismatches.length) findings.push(`${mismatches.length}/${frames.length} 帧的障碍标记与题目输入不符；算法可能避开障碍，但演示没有准确标记。`);
  }
  const report = { scope: 'teaching trace requirements, separate from numeric/path optimality and renderer fidelity', source: basename(file), findings, passed: findings.length === 0 };
  await writeFile(resolve(dirname(file), `${basename(file, '.json')}-semantic-audit.json`), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(report));
}
