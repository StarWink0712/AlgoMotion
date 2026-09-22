import { useState } from 'react';
import { orderingView } from '../engine/presets/ordering';
import ArrayScene, { type SceneProps } from './ArrayScene';
import { MovingGroup, FlowArrow, useStageWidth } from './motion';

export default function OrderingScene(props: SceneProps) {
  const { frame, reduced, duration, problem } = props, view = orderingView(frame), { ref, width: viewport } = useStageWidth();
  const [navigation, setNavigation] = useState({ step: frame.step, forward: false });
  if (navigation.step !== frame.step) setNavigation({ step: frame.step, forward: frame.step === navigation.step + 1 });
  const forward = navigation.forward && !reduced;
  if (view.kind === 'array') return <ArrayScene {...props} reduced={!forward} />;
  const partition = view.kind === 'partition', width = Math.max(viewport, partition ? Math.max(...view.lanes!.map((l) => l.values.length), 1) * 72 + 100 : view.cols * 82 + 65);
  const height = partition ? 375 : Math.max(160, view.rows * 86 + 96);
  const point = (index: number) => ({ x: 70 + index % view.cols * 82, y: 88 + Math.floor(index / view.cols) * 86 });
  const offset = view.lanes?.[0].values.length ?? 0;
  const comparisons = view.boundaries ? [
    { left: 'A 左最大', a: view.boundaries.aLeft, right: 'B 右最小', b: view.boundaries.bRight },
    { left: 'B 左最大', a: view.boundaries.bLeft, right: 'A 右最小', b: view.boundaries.aRight },
  ] : [];
  return <div className="motion-scene ordering-scene">
    <div className="scene-topline"><span>{partition ? '二分切口，保持左半边总数不变' : problem.id === 'rotate-image' ? view.phase : '灰色格子已被排除'}</span><span>{partition && view.cutRange ? `A 的候选切口 [${view.cutRange.join(', ')}]` : `${view.rows} × ${view.cols}`}</span></div>
    <div ref={ref} className="scene-scroll" role="region" tabIndex={0} aria-label="可滚动的排序与划分画布">
      <svg className="algorithm-scene ordering-board" role="img" aria-label={`${problem.title}执行状态`} viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
        {partition ? view.lanes!.map((lane, row) => {
          const cut = view.cuts?.[row], y = 80 + row * 175;
          return <g key={row}>
            <text x="26" y={y - 43} className="tree-section-label">{lane.label}</text>
            {!lane.values.length && <text x="135" y={y + 5} className="tree-empty">空数组</text>}
            {lane.values.map((value, i) => {
              const id = (row ? offset : 0) + i;
              return <g key={i} transform={`translate(${70 + i * 72},${y})`} className={`ordering-item ${cut !== undefined && i < cut ? 'left-half' : ''} ${view.medianIds?.includes(id) ? 'median-item' : ''}`} data-testid="partition-item" data-id={id} data-left={cut !== undefined && i < cut}>
                <rect x="-27" y="-26" width="54" height="52" rx="10" /><text textAnchor="middle" dy="5">{value}</text><text y="45" textAnchor="middle" className="scene-index">{i}</text>
              </g>;
            })}
            {cut !== undefined && <MovingGroup identity={`partition-cut-${row}`} x={34 + cut * 72} y={y} step={frame.step} duration={duration} reduced={!forward} className="partition-cut"><g data-testid="partition-cut" data-row={row} data-cut={cut}><path d="M 0 -31 V 32" /><text textAnchor="middle" y="67">{row ? 'j' : 'i'}={cut}</text></g></MovingGroup>}
          </g>;
        }) : <>
          {!frame.values.length && <text x="24" y="58" className="tree-empty">空矩阵</text>}
          {frame.values.map((value, index) => {
            const p = point(index), identity = frame.elementIds![index];
            return <g key={identity}>
              <MovingGroup identity={`ordering-cell-${identity}`} {...p} step={frame.step} duration={duration} reduced={!forward} arc className={`ordering-item ${frame.active.includes(index) ? 'active' : ''} ${view.allowed.includes(index) ? '' : 'excluded'} ${frame.settled.includes(index) ? 'median-item' : ''}`}>
                <g data-testid="ordering-cell" data-id={identity} data-index={index} data-value={value} data-allowed={view.allowed.includes(index)}><rect x="-32" y="-28" width="64" height="56" rx="11" /><text textAnchor="middle" dy="5">{value}</text><text textAnchor="middle" y="-36" className="scene-index">#{identity}</text></g>
              </MovingGroup>
              <text x={p.x} y={p.y + 46} textAnchor="middle" className="scene-index">{Math.floor(index / view.cols)},{index % view.cols}</text>
            </g>;
          })}
          {view.swaps.map(([a, b]) => { const from = point(a), to = point(b); return <FlowArrow key={`${a}-${b}`} path={`M ${from.x} ${from.y - 29} Q ${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 53} ${to.x} ${to.y - 29}`} animated={forward} duration={duration} motionKey={`${frame.step}-${a}-${b}`} />; })}
        </>}
      </svg>
    </div>
    {partition && view.boundaries && <div className="partition-comparisons" data-testid="partition-comparisons">{comparisons.map((c) => {
      const valid = (c.a ?? -Infinity) <= (c.b ?? Infinity);
      return <span key={c.left} className={valid ? '' : 'invalid'} data-testid="partition-comparison" data-valid={valid}>{c.left} <b>{c.a ?? '−∞'}</b> {valid ? '≤' : '>'} {c.right} <b>{c.b ?? '+∞'}</b>{valid ? ' · 满足' : ' · 需调整'}</span>;
    })}</div>}
  </div>;
}
