import { useState } from 'react';
import { dpGreedyView } from '../engine/presets/dp-greedy';
import type { SceneProps } from './ArrayScene';
import { FlowArrow, MovingGroup, useStageWidth } from './motion';
import './state-dp.css';

export default function StateDPScene({ frame, problem, reduced, duration }: SceneProps) {
  const view = dpGreedyView(frame), { ref, width: viewport } = useStageWidth();
  const [navigation, setNavigation] = useState({ frame, id: problem.id, forward: false });
  if (navigation.frame !== frame) setNavigation({ frame, id: problem.id, forward: navigation.id === problem.id && frame.step === navigation.frame.step + 1 });
  const forward = navigation.forward && !reduced;
  const sourceCols = view.sourceCols || Math.min(8, frame.values.length || 1);
  const columns = view.layout === 'line' ? Math.min(6, view.columns) : view.columns;
  const sourceRows = Math.ceil(frame.values.length / sourceCols);
  const boardTop = sourceRows ? 94 + sourceRows * 90 : 54;
  const boardLeft = view.axes ? 132 : 76;
  const width = Math.max(viewport, sourceCols * 94 + 32, columns * 112 + 40 + (view.axes ? 56 : 0));
  const rows = view.layout === 'line' ? Math.ceil(view.cells.length / Math.max(1, columns)) : Math.max(-1, ...view.cells.map((c) => c.row)) + 1;
  const height = Math.max(155, boardTop + rows * 110 + 25);
  const points = new Map<string, { x: number; y: number }>();
  frame.values.forEach((_, i) => points.set(`s${i}`, { x: 64 + i % sourceCols * 94, y: 65 + Math.floor(i / sourceCols) * 90 }));
  view.cells.forEach((cell, i) => {
    const row = view.layout === 'line' ? Math.floor(i / columns) : cell.row;
    const col = view.layout === 'line' ? i % columns : cell.col;
    points.set(cell.id, { x: view.layout === 'triangle' ? width / 2 + (col - row / 2) * 112 : boardLeft + col * 112, y: boardTop + 44 + row * 110 });
  });
  const active = view.active && points.get(view.active);
  const witnessJoin = view.witnessMode === 'product' ? ' × ' : view.witnessMode === 'path' ? ' → ' : ' + ';
  return <div className="motion-scene state-dp-scene">
    {view.axes && <div className="dp-segments"><code>行：{view.axes.rowLabel}</code><code>列：{view.axes.columnLabel}</code></div>}
    <div className="scene-topline"><span>{view.layout === 'triangle' ? '上一行的两个状态汇入当前状态' : view.cells.length ? '来源状态 → 候选转移 → 当前状态' : '扫描输入，确定可达边界或切分位置'}</span><span>{view.round ? `第 ${view.round} 轮 · 倒序更新` : `${view.cells.length} 个状态`}</span></div>
    <div ref={ref} className="scene-scroll" role="region" tabIndex={0} aria-label="可滚动的贪心与动态规划画布">
      <svg className="algorithm-scene state-dp-board" role="img" aria-label={`${problem.title}执行状态`} viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
        {view.axes && <g className="dp-axis">{view.axes.columns.map((label, i) => <text key={`col-${i}`} x={boardLeft + i * 112} y={boardTop - 16} textAnchor="middle" data-testid="dp-column-label">{label}</text>)}{view.axes.rows.map((label, i) => <text key={`row-${i}`} x={boardLeft - 80} y={boardTop + 49 + i * 110} textAnchor="middle" data-testid="dp-row-label">{label}</text>)}</g>}
        {view.registerPath && view.registerPath.length > 1 && <path className="dp-witness-path" data-testid="dp-register-path" d={view.registerPath.map((id, i) => { const p = points.get(id)!; return `${i ? 'L' : 'M'} ${p.x} ${p.y}`; }).join(' ')} />}
        {frame.values.length > 0 && <text x="25" y="20" className="tree-section-label">{view.sourceLabel}</text>}
        {view.sourceCols > 0 && view.witness.length > 1 && <path className="dp-witness-path" data-testid="dp-path" d={view.witness.map((id, i) => { const p = points.get(`s${id}`)!; return `${i ? 'L' : 'M'} ${p.x} ${p.y}`; }).join(' ')} />}
        {frame.values.map((value, i) => {
          const p = points.get(`s${i}`)!, segment = view.segments.findIndex((s) => s.start <= i && i <= s.end);
          return <g key={i} transform={`translate(${p.x},${p.y})`} className={`dp-input ${frame.active.includes(i) ? 'active' : ''} ${view.witness.includes(i) ? 'selected' : ''} ${view.otherWitness.includes(i) ? 'alternate' : ''} ${segment >= 0 ? `segment-${segment % 2}` : ''}`} data-testid="dp-input" data-index={i} data-value={value} data-selected={view.witness.includes(i)} data-segment={segment}>
            <rect x="-36" y="-24" width="72" height="48" rx="12" /><text textAnchor="middle" dy="5">{value}</text><text textAnchor="middle" y="40" className="scene-index">{view.sourceCols ? `${Math.floor(i / sourceCols)},${i % sourceCols}` : i}</text>
          </g>;
        })}
        {!!view.cells.length && !view.axes && <text x="25" y={boardTop} className="tree-section-label">{view.layout === 'rows' ? '以当前位置结尾的最大 / 最小乘积' : '状态表 · 空白表示尚未计算'}</text>}
        {!view.cells.length && !frame.values.length && <text x="25" y="65" className="tree-empty">空输入，无需转移</text>}
        {view.cells.map((cell) => {
          const p = points.get(cell.id)!, source = view.deps.some((d) => d.from === cell.id && d.chosen);
          return <g key={cell.id} transform={`translate(${p.x},${p.y})`} className={`dp-register ${cell.id === view.active ? 'active' : ''} ${source ? 'source' : ''} ${cell.value === null ? 'unknown' : ''}`} data-testid="dp-register" data-id={cell.id} data-value={cell.value ?? ''} data-epoch={cell.epoch ?? ''}>
            <rect x="-48" y="-26" width="96" height="52" rx="12" /><text textAnchor="middle" dy="5">{cell.value ?? '·'}</text><text textAnchor="middle" y="43" className="scene-index">{cell.label}{cell.epoch === undefined ? '' : ` / 轮${cell.epoch}`}</text>
          </g>;
        })}
        {view.deps.map((d, i) => {
          const a = points.get(d.from)!, b = points.get(d.to)!;
          const sameRow = a.y === b.y;
          const path = sameRow ? `M ${a.x} ${a.y - 27} Q ${(a.x + b.x) / 2} ${a.y - 70 - i * 3} ${b.x} ${b.y - 29}` : `M ${a.x + 38} ${a.y} C ${a.x + 65} ${a.y}, ${b.x - 65} ${b.y}, ${b.x - 49} ${b.y}`;
          return <g key={`${d.from}-${d.to}-${i}`} className={`dp-transfer ${d.chosen ? 'chosen' : 'candidate'}`} data-testid="dp-transfer" data-from={d.from} data-to={d.to} data-chosen={d.chosen} data-eligible={d.eligible}>
            <FlowArrow path={path} animated={forward && d.chosen} blocked={!d.eligible} duration={duration} motionKey={`${frame.step}-${i}`} />
          </g>;
        })}
        {active && <MovingGroup identity="dp-focus" {...active} step={frame.step} duration={duration} reduced={!forward} className="dp-focus"><rect x="-51" y="-29" width="102" height="58" rx="14" /></MovingGroup>}
      </svg>
    </div>
    {!!view.ranges.length && <div className="dp-bands">{view.ranges.map((range, i) => <div key={i} className="dp-band" data-testid="dp-band"><span>{range.label}</span><div className="dp-band-track"><i style={{ left: `${100 * range.start / frame.values.length}%`, width: `${100 * (range.end - range.start + 1) / frame.values.length}%` }} /></div><code>[{range.start}, {range.end}]</code></div>)}</div>}
    {!!view.deps.length && <div className="dp-dependencies" aria-label="本次转移来源">{view.deps.map((d, i) => <div key={i} className={`dp-dependency ${d.chosen ? 'chosen' : ''} ${d.eligible ? '' : 'blocked'}`} data-testid="dp-dependency"><span>{d.from} = <b>{d.value}</b>{d.epoch === undefined ? '' : `（轮 ${d.epoch}）`}</span><code>{d.label} → {d.to}</code><small>{!d.eligible ? '条件不满足' : d.chosen ? '采用来源' : '合法候选，未采用'}</small></div>)}</div>}
    {!!view.choices.length && <div className="dp-choices">{view.choices.map((c, i) => <span key={i} className={c.chosen ? 'chosen' : ''} data-testid="dp-choice">{c.label}<b>{c.value}</b>{c.chosen ? '采用' : '候选'}</span>)}</div>}
    {view.alignment && !!view.registerPath?.length && <div className="dp-alignment"><span>{frame.result === undefined ? '回溯已恢复的后缀' : '一组最优对齐'}{!view.alignment.length ? '：空' : ''}</span><div>{view.alignment.map((item, i) => <div className={`dp-alignment-column ${item.kind}`} key={i} data-testid="dp-alignment" data-left={item.left} data-right={item.right} data-kind={item.kind}><b>{item.left || '∅'}</b><b>{item.right || '∅'}</b><small>{{ match: '匹配', keep: '保留', replace: '替换', delete: '删除', insert: '插入' }[item.kind]}</small></div>)}</div></div>}
    {(view.witness.length > 0 || view.otherWitness.length > 0) && <div className="dp-witness" data-testid="dp-witness"><span>{view.witnessLabel}</span><code>{view.witness.map((i) => view.sourceCols ? `(${Math.floor(i / sourceCols)},${i % sourceCols})` : `${frame.values[i]}[${i}]`).join(witnessJoin)}</code>{view.otherWitness.length > 0 && <code>另一组：{view.otherWitness.map((i) => `${frame.values[i]}[${i}]`).join(' + ')}</code>}</div>}
    {!!view.segments.length && <div className="dp-segments" aria-label="已确定的分段">{view.segments.map((s) => <code key={s.start} data-testid="dp-segment">{frame.values.slice(s.start, s.end + 1).join('')} <small>[{s.start},{s.end}]</small></code>)}</div>}
    {!!view.output.length && <div className="dp-segments">{view.output.map((value, i) => <code key={i} data-testid="dp-output">{value}</code>)}</div>}
    {!!view.dictionary.length && <div className="dp-segments"><span>字典</span>{view.dictionary.map((word) => <code key={word}>{word}</code>)}</div>}
    {!!view.table.length && <div className="dp-segments"><span>最后出现位置</span>{view.table.map(([char, index]) => <code key={char} data-testid="dp-last">{char} → {index}</code>)}</div>}
  </div>;
}
