import { useState } from 'react';
import { explorationView } from '../engine/presets/exploration';
import type { SceneProps } from './ArrayScene';
import { FlowArrow, MovingGroup, useStageWidth } from './motion';

export default function ExplorationScene({ frame, problem, duration, reduced }: SceneProps) {
  const view = explorationView(frame), { ref, width: viewport } = useStageWidth();
  const [navigation, setNavigation] = useState({ step: frame.step, forward: false });
  if (navigation.step !== frame.step) setNavigation({ step: frame.step, forward: frame.step === navigation.step + 1 });
  const forward = navigation.forward && !reduced, grid = view.mode === 'grid', graph = view.mode === 'graph';
  const width = Math.max(viewport, grid ? view.cols * 82 + 56 : graph ? 530 : 0);
  const columns = Math.max(2, Math.floor((width - 40) / 94));
  const sourceRows = Math.max(1, Math.ceil(frame.values.length / columns)), tokenTop = sourceRows * 92 + 114;
  const height = grid ? Math.max(150, view.rows * 82 + 66) : graph ? 470 : tokenTop + Math.ceil(9 / columns) * 70 + 60;
  const point = (id: number) => grid ? { x: 66 + id % view.cols * 82, y: 55 + Math.floor(id / view.cols) * 82 } : graph ? { x: width / 2 + Math.cos(2 * Math.PI * id / Math.max(1, frame.values.length) - Math.PI / 2) * (width / 2 - 68), y: 222 + Math.sin(2 * Math.PI * id / Math.max(1, frame.values.length) - Math.PI / 2) * 162 } : { x: 64 + id % columns * 94, y: 54 + Math.floor(id / columns) * 92 };
  const tokenPoint = (index: number) => ({ x: 64 + index % columns * 94, y: tokenTop + Math.floor(index / columns) * 70 });
  const route = (from: number, to: number) => {
    const a = point(from), b = point(to);
    if (from === to) return `M ${a.x - 18} ${a.y - 17} C ${a.x - 65} ${a.y - 65} ${a.x + 65} ${a.y - 65} ${a.x + 18} ${a.y - 17}`;
    const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
    return `M ${a.x + dx / distance * 28} ${a.y + dy / distance * 28} L ${b.x - dx / distance * 32} ${b.y - dy / distance * 32}`;
  };
  const trail = view.path.length ? view.path : view.witness;
  const token = frame.location === 'choose' ? view.tokens.at(-1) : view.removed;
  const from = !grid && !graph && token?.source.length ? point(token.source[0]) : null;
  const to = token ? tokenPoint(frame.location === 'choose' ? view.tokens.length - 1 : view.tokens.length) : null;
  const oranges = problem.id === 'rotting-oranges', queens = problem.id === 'n-queens', islands = problem.id === 'number-of-islands';
  const queueCols = Math.max(2, Math.floor((viewport - 24) / 104));
  const queueHeight = Math.max(1, Math.ceil(view.queue.length / queueCols)) * 53 + 12;
  return <div className={`motion-scene exploration-scene mode-${view.mode}`}>
    <div className="scene-topline"><span>{view.target !== undefined ? `查找单词：${view.target || '空串'}` : graph ? '前置课程 → 后续课程' : grid ? '行列从 0 编号' : '输入 → 当前选择 → 收集结果'}</span><span>{view.status}</span></div>
    <div ref={ref} className="scene-scroll" role="region" tabIndex={0} aria-label="可滚动的搜索与网格画布">
      <svg className="algorithm-scene exploration-board" role="img" aria-label={`${problem.title}执行状态`} viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
        {!frame.values.length && <text x="25" y="40" className="tree-empty">{graph ? '没有课程' : grid ? '空网格' : '空输入'}</text>}
        {view.edges.map(([a, b]) => <g key={`${a}-${b}`} className={`exploration-edge ${view.processedEdges.some(([x, y]) => x === a && y === b) ? 'released' : ''}`} data-testid="exploration-edge" data-from={a} data-to={b} data-released={view.processedEdges.some(([x, y]) => x === a && y === b)}><FlowArrow path={route(a, b)} animated={false} motionKey={`edge-${a}-${b}`} /></g>)}
        {frame.values.map((value, id) => {
          const p = point(id), active = frame.active.includes(id), visited = stateVisited(id), removed = view.removed?.source.includes(id);
          return <g key={id} transform={`translate(${p.x},${p.y})`} className={`exploration-cell ${active ? 'active' : ''} ${visited ? 'visited' : ''} ${removed ? 'just-removed' : ''} ${islands && value === 0 ? 'water' : ''} ${queens && (Math.floor(id / view.cols) + id % view.cols) % 2 ? 'dark-square' : ''}`} data-testid="exploration-cell" data-id={id} data-value={value} data-label={view.labels[id] ?? ''} data-visited={visited}>
            {graph ? <circle r="26" className="exploration-tile" /> : <rect x="-32" y="-28" width="64" height="56" rx={queens ? 3 : 10} className="exploration-tile" />}
            {oranges && value !== 0 ? <g className={`orange ${value === 2 ? 'rotten' : ''}`}><circle r="19" /><path d="M 0 -18 Q 4 -30 14 -23" fill="none" /><text y="5" textAnchor="middle">{value}</text></g> : queens && value === 'Q' ? <g className="queen-piece"><path d="M -19 -12 L -10 -4 L 0 -20 L 10 -4 L 19 -12 L 13 14 L -13 14 Z" /><text y="8" textAnchor="middle">Q</text></g> : <text textAnchor="middle" dy="5" className="exploration-value">{value}</text>}
            {islands && value === 0 && <path d="M -22 14 q 6 -6 12 0 t 12 0 t 12 0" className="water-line" fill="none" />}
            <text textAnchor="middle" y="44" className="scene-index">{grid ? `${Math.floor(id / view.cols)},${id % view.cols}` : graph ? view.labels[id] : view.labels[id] || `位置 ${id}`}</text>
            {grid && view.labels[id] && <text textAnchor="middle" y="-34" className="exploration-badge">{view.labels[id]}</text>}
            {view.groups && <text textAnchor="middle" y="65" className="exploration-group">{view.groups[id]}</text>}
          </g>;
        })}
        {grid && !queens && trail.slice(1).map((node, i) => <path key={`${trail[i]}-${node}`} d={route(trail[i], node)} className={`exploration-trail ${view.path.length ? '' : 'witness'}`} data-testid="exploration-path-edge" data-from={trail[i]} data-to={node} fill="none" />)}
        {view.bounds && view.bounds.top <= view.bounds.bottom && view.bounds.left <= view.bounds.right && <rect className="spiral-boundary" data-testid="spiral-boundary" x={point(view.bounds.top * view.cols + view.bounds.left).x - 38} y={point(view.bounds.top * view.cols + view.bounds.left).y - 34} width={(view.bounds.right - view.bounds.left) * 82 + 76} height={(view.bounds.bottom - view.bounds.top) * 82 + 68} rx="8" />}
        {view.arrows.map((arrow, i) => <g key={`${frame.step}-${i}`} data-testid="exploration-transfer" data-from={arrow.from} data-to={arrow.to} data-blocked={!!arrow.blocked}><FlowArrow path={route(arrow.from, arrow.to)} blocked={arrow.blocked} animated={forward} duration={duration} motionKey={`${frame.step}-${i}`} /></g>)}
        {!grid && !graph && <>
          <text x="24" y={tokenTop - 45} className="tree-section-label">当前选择 · 每次撤销末项</text>
          {view.tokens.map((token, i) => <MovingGroup key={token.key} identity={`explore-choice-${token.key}`} {...tokenPoint(i)} step={frame.step} duration={duration} reduced={!forward} className="exploration-token"><g data-testid="exploration-token" data-key={token.key}><rect x="-40" y="-22" width="80" height="44" rx="10" /><text textAnchor="middle" dy="5">{token.text}</text></g></MovingGroup>)}
          {view.removed && to && <g transform={`translate(${to.x},${to.y})`} className="exploration-token removed" data-testid="exploration-removed"><rect x="-40" y="-22" width="80" height="44" rx="10" /><text textAnchor="middle" dy="5">{view.removed.text}</text><text textAnchor="middle" y="40">已撤销</text></g>}
          {from && to && <FlowArrow path={frame.location === 'choose' ? `M ${from.x} ${from.y + 28} Q ${width - 20} ${(from.y + to.y) / 2} ${to.x} ${to.y - 23}` : `M ${to.x} ${to.y - 23} Q ${width - 20} ${(from.y + to.y) / 2} ${from.x} ${from.y + 28}`} animated={forward} duration={duration} motionKey={`choice-${frame.step}`} />}
        </>}
      </svg>
    </div>
    {view.removed && grid && <div className="exploration-undo" data-testid="exploration-removed">撤销 {view.removed.text} @ {view.removed.source.map((id) => `(${Math.floor(id / view.cols)},${id % view.cols})`).join(', ')}，当前工作状态已恢复</div>}
    {(graph || islands || oranges) && <div className="exploration-queue"><div className="scene-topline"><span>{graph ? '零入度队列' : 'BFS 等待队列'} · 从左到右出队</span><span>{view.queue.length} 项</span></div>
      <svg className="algorithm-scene" aria-label="当前等待队列" viewBox={`0 0 ${viewport} ${queueHeight}`} style={{ width: viewport, height: queueHeight }}>
        {!view.queue.length && <text x="16" y="32" className="tree-empty">队列为空</text>}
        {view.queue.map((node, i) => <MovingGroup key={node} identity={`explore-queue-${node}`} x={60 + i % queueCols * 104} y={27 + Math.floor(i / queueCols) * 53} step={frame.step} duration={duration} reduced={!forward} className="exploration-token"><g data-testid="exploration-queue-item" data-id={node}><rect x="-43" y="-18" width="86" height="36" rx="9" /><text textAnchor="middle" dy="4">{graph ? `课程 ${node}` : `(${Math.floor(node / view.cols)},${node % view.cols})`}</text></g></MovingGroup>)}
      </svg>
    </div>}
    {view.output.length > 0 && <div className="tree-prefixes"><span>{graph ? '已完成的课程顺序' : '已读取的输出序列'}</span><div>{view.output.map((value, i) => <code key={i} data-testid="exploration-output">{value}</code>)}</div></div>}
    {(view.mode === 'sequence' || queens) && <div className="choice-results"><div className="scene-topline"><span>已收集答案</span><span>{view.answers.length} 组</span></div><div className="choice-result-list" role="region" tabIndex={0} aria-label="搜索已收集答案">{view.answers.map((answer, i) => queens ? <pre key={i} data-testid="exploration-answer">{(answer as string[]).join('\n')}</pre> : <code key={i} data-testid="exploration-answer">{JSON.stringify(answer)}</code>)}</div></div>}
  </div>;
  function stateVisited(id: number) { return frame.settled.includes(id) || view.path.includes(id) || view.witness.includes(id); }
}
