import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import type { GeneratedFrame } from '../engine/generated';
import { FlowArrow, MovingGroup, useReducedMotion, useStageWidth } from './motion';

const show = (v: unknown) => v === null ? '·' : typeof v === 'string' ? v : JSON.stringify(v);
export default function GeneratedScene({ frame, speed, embedded = false }: { frame: GeneratedFrame; speed: number; embedded?: boolean }) {
  const { ref, width: viewport } = useStageWidth();
  const reduced = useReducedMotion(), lastRendered = useRef(frame.step);
  const forward = frame.step === lastRendered.current + 1;
  useLayoutEffect(() => { lastRendered.current = frame.step; }, [frame.step]);
  const cols = frame.grid[0].length, rows = frame.grid.length, pitch = 78;
  const width = Math.max(viewport, cols * pitch + 48), height = rows * 90 + 75;
  const x = (id: number) => (width - (cols - 1) * pitch) / 2 + id % cols * pitch;
  const y = (id: number) => Math.floor(id / cols) * 90 + 45;
  const duration = 700 / speed;
  return <div className={`visual-canvas vivid-canvas generated-scene ${reduced ? 'reduced-motion' : ''}`} data-testid="generated-scene" data-step={frame.step} style={{ '--motion-duration': `${duration}ms` } as CSSProperties}>
    {!embedded && <><div className="canvas-heading"><span><span className="live-dot" /> RUNTIME THEATER</span><span>Python 实际记录 · Trace v3</span></div>
    <div className="teaching-cue tone-neutral"><div className="cue-phase">{frame.action}</div><p>{frame.explanation || '此帧是运行时记录的完整状态快照。'}</p></div></>}
    <div className="scene-scroll" ref={ref} aria-label="可滚动的网格与状态依赖画布">
      <svg role="img" aria-label="生成程序的实际网格状态" className="generated-grid" viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
        {frame.grid.flat().map((value, id) => {
          const active = frame.active.includes(id), visited = frame.visited.includes(id), blocked = frame.blocked.includes(id), path = frame.path.includes(id);
          return <g key={id} transform={`translate(${x(id)}, ${y(id)})`} className={`grid-tile ${active ? 'is-active' : ''} ${visited ? 'is-visited' : ''} ${blocked ? 'is-obstacle' : ''} ${path ? 'is-path' : ''}`} data-cell={id} data-visited={visited} data-path={path}>
            <path className="tile-depth" d="M -29 12 L -29 22 L 29 22 L 29 12 Z" />
            <rect className="tile-face" x="-29" y="-23" width="58" height="42" rx="9" />
            <title>{show(value)}</title><text className="tile-value" textAnchor="middle" y="3">{blocked ? '×' : show(value).length > 6 ? `${show(value).slice(0, 5)}…` : show(value)}</text>
            <text className="tile-coordinate" textAnchor="middle" y="39">{Math.floor(id / cols)},{id % cols}</text>
            {visited && <circle className="visit-mark" cx="21" cy="-16" r="3" />}
            {frame.dp.length > 0 && <g className="dp-token" data-testid="grid-dp" data-cell={id} key={show(frame.dp[id])} transform="translate(0,-28)"><rect x="-25" y="-20" width="50" height="23" rx="7" /><text textAnchor="middle" y="-4">{show(frame.dp[id])}</text></g>}
          </g>;
        })}
        {frame.path.slice(1).map((to, i) => <path key={i} data-testid="grid-path-edge" className="grid-path-line" d={`M ${x(frame.path[i])} ${y(frame.path[i]) + 12} L ${x(to)} ${y(to) + 12}`} />)}
        {frame.dependencies.map((d, i) => <FlowArrow key={`${frame.step}:${i}`} path={`M ${x(d.from)} ${y(d.from) - 15} Q ${(x(d.from) + x(d.to)) / 2 - 20} ${(y(d.from) + y(d.to)) / 2 - 40} ${x(d.to)} ${y(d.to) - 15}`} blocked={!d.chosen} animated={!reduced && forward} motionKey={`${frame.step}:${i}`} duration={duration} />)}
        {frame.active.length > 0 && <MovingGroup x={x(frame.active[0])} y={y(frame.active[0])} step={frame.step} duration={duration} reduced={reduced} className="grid-focus"><rect x="-33" y="-27" width="66" height="51" rx="12" /><path d="M -5 -36 L 0 -30 L 5 -36" /></MovingGroup>}
      </svg>
    </div>
    {frame.dependencies.length > 0 && <div className="dependency-cards" data-testid="candidate-sources">{frame.dependencies.map((d, i) => <div key={i} className={d.chosen ? 'chosen' : ''}><span>{d.from} → {d.to}</span><code>{d.label}</code><b>{d.chosen ? '采用此来源' : '候选 / 未采用'}</b></div>)}</div>}
    {!embedded && <><div className="runtime-queue"><div><span>FIFO 队列</span><small>队首 → 队尾 · {frame.queue.length} 项</small></div><div className="scene-scroll"><svg aria-label="运行时队列" width={Math.max(220, frame.queue.length * 58 + 24)} height="58">
      {frame.queue.length === 0 && <text x="12" y="32" className="queue-empty">空队列</text>}
      {frame.queue.map((id, i) => <MovingGroup key={`${id}:${frame.queue.slice(0, i).filter((v) => v === id).length}`} identity={`queue-${id}`} x={i * 58 + 35} y={28} step={frame.step} duration={duration} reduced={reduced} className="runtime-queue-item"><rect x="-24" y="-18" width="48" height="36" rx="9" /><text textAnchor="middle" dy="4">{Math.floor(id / cols)},{id % cols}</text></MovingGroup>)}
    </svg></div></div>
    <div className="legend"><span><i className="legend-active" /> 当前处理</span><span><i className="legend-source" /> 已访问</span><span>粗线：记录的路径</span></div>
    {frame.path.length > 0 && <div className="runtime-path" data-testid="runtime-path">路径 {frame.path.map((id) => `(${Math.floor(id / cols)},${id % cols})`).join(' → ')}</div>}
    <div className="variables">{Object.entries(frame.variables).map(([name, value]) => <span className="variable" key={name}><code>{name}</code><b>{show(value)}</b></span>)}</div></>}
  </div>;
}
