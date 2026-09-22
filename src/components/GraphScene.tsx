import { useId, useLayoutEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { FlowArrow, MovingGroup, useStageWidth } from './motion';
import type { SceneProps } from './ArrayScene';

export default function GraphScene({ frame, previous, problem, duration, reduced }: SceneProps) {
  const { ref, width: viewport } = useStageWidth();
  const tree = problem.renderer === 'tree';
  const links = frame.links ?? [];
  const count = frame.values.length;
  const positions = new Map<number, { x: number; y: number }>();
  let leaves = 0, depth = 0;
  if (tree && count) {
    const place = (id: number, level: number): number => {
      depth = Math.max(depth, level);
      const children = links.filter(([from]) => from === id).map(([, to]) => place(to, level + 1));
      const x = children.length ? children.reduce((a, b) => a + b, 0) / children.length : leaves++;
      positions.set(id, { x, y: level }); return x;
    };
    place(0, 0);
  }
  const width = Math.max(viewport, tree ? Math.max(360, leaves * 92) : count * 86 + 70);
  const height = tree ? Math.max(215, depth * 85 + 105) : 265;
  if (tree) for (const [id, point] of positions) positions.set(id, { x: leaves <= 1 ? width / 2 : 42 + point.x / (leaves - 1) * (width - 84), y: 48 + point.y * 85 });
  else frame.values.forEach((_, i) => positions.set(i, { x: (width - (count - 1) * 86) / 2 + i * 86, y: 146 }));
  const focus = frame.active.at(-1) ?? frame.pointers.prev;
  useLayoutEffect(() => {
    const element = ref.current, point = typeof focus === 'number' ? positions.get(focus) : undefined;
    if (element && point && (point.x < element.scrollLeft + 35 || point.x > element.scrollLeft + viewport - 35)) element.scrollLeft = Math.max(0, point.x - viewport / 2);
  }, [focus, frame.step, width]);
  const marker = useId();
  const route = (from: number, to: number) => {
    const a = positions.get(from)!, b = positions.get(to)!;
    if (tree) {
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
      return `M ${a.x + dx / length * 26} ${a.y + dy / length * 26} L ${b.x - dx / length * 29} ${b.y - dy / length * 29}`;
    }
    const direction = from < to ? 1 : -1;
    return `M ${a.x + direction * 27} ${a.y} Q ${(a.x + b.x) / 2} ${a.y - direction * 35} ${b.x - direction * 30} ${b.y}`;
  };
  const retired = !tree && frame.location === 'rewire' ? previous?.links?.filter(([a, b]) => !links.some(([u, v]) => u === a && v === b)) ?? [] : [];
  const entered = tree && frame.location.startsWith('enqueue') ? frame.queue?.at(-1) : undefined;
  const departing = tree && frame.location === 'dequeue' ? previous?.queue?.[0] : undefined;

  return <div className="motion-scene">
    <div className="scene-topline"><span>{tree ? '按层点亮 · 先进先出' : '节点不动，next 的方向改变'}</span><span>{count} 个节点</span></div>
    {!count ? <div className="empty-data">∅<span>{tree ? '空树' : '空链表'}</span></div> : <div className="scene-scroll" ref={ref}>
      <svg role="img" aria-label={tree ? '二叉树访问和队列流转' : '链表指针逐步反转'} className="algorithm-scene graph-motion" viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
        <defs><marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1 L 9 5 L 0 9 z" fill="currentColor" /></marker></defs>
        {links.map(([from, to]) => {
          const a = positions.get(from)!, b = positions.get(to)!;
          const active = tree ? to === entered : frame.location === 'rewire' && from === frame.pointers.curr;
          return <g key={`${from}-${to}`} data-testid="live-edge" data-from={from} data-to={to}>
            {active ? <FlowArrow path={route(from, to)} animated={!reduced} duration={duration} motionKey={`${frame.step}-${from}-${to}`} /> : <path d={route(from, to)} className={`graph-track ${frame.settled.includes(from) && frame.settled.includes(to) ? 'is-visited' : ''}`} fill="none" markerEnd={`url(#${marker})`} />}
            {tree && <text x={(a.x + b.x) / 2 + (b.x < a.x ? -9 : 9)} y={(a.y + b.y) / 2} textAnchor="middle" className="branch-label">{frame.edgeLabels?.[`${from}-${to}`] === 'L' ? '左' : '右'}</text>}
          </g>;
        })}
        {retired.map(([from, to]) => <g key={`old-${from}-${to}`} className="retiring-edge" data-testid="retiring-edge"><path d={route(from, to)} fill="none" /><text x={(positions.get(from)!.x + positions.get(to)!.x) / 2} y="106" textAnchor="middle">断开</text></g>)}
        {frame.values.map((value, id) => {
          const point = positions.get(id)!;
          const active = frame.active.includes(id), queued = frame.queue?.includes(id);
          return <g transform={`translate(${point.x}, ${point.y})`} key={id} className={`scene-node ${active ? 'is-target' : ''} ${frame.settled.includes(id) ? 'is-processed' : ''} ${queued ? 'is-queued' : ''}`}>
            {active && <circle key={frame.step} r="33" className="visit-halo" />}
            <circle r="25" className="node-disc" /><text textAnchor="middle" dy="6" className="scene-value">{value}</text>
            {tree ? queued && <text y="42" textAnchor="middle" className="node-state-label">队列中</text> : <text y="43" textAnchor="middle" className="scene-index">#{id}</text>}
            {!tree && !links.some(([from]) => from === id) && <g className="null-cap"><path d="M 0 28 V 64" /><rect x="-23" y="64" width="46" height="20" rx="6" /><text textAnchor="middle" y="78">null</text></g>}
          </g>;
        })}
        {!tree && Object.entries(frame.pointers).map(([name, id], lane) => <MovingGroup key={name} x={id === null ? width - 52 : positions.get(id)!.x} y={25 + lane * 29} step={frame.step} duration={duration} reduced={reduced} className={`list-pointer ${name === 'curr' ? 'is-target' : ''}`}>
          <rect x="-34" y="-11" width="68" height="22" rx="8" /><text textAnchor="middle" dy="4">{name}{id === null ? ': null' : ''}</text>
        </MovingGroup>)}
      </svg>
    </div>}
    {tree && <div className="queue-board"><div className="queue-heading"><span>等待访问的队列</span><span>队首取出 <ArrowRight size={12} /> 队尾加入</span></div><div className="queue-scroll">
      <svg className="queue-scene" role="img" aria-label="BFS 等待队列" viewBox={`0 0 ${Math.max(viewport - 24, (frame.queue?.length ?? 0) * 58 + 40)} 86`} style={{ width: Math.max(viewport - 24, (frame.queue?.length ?? 0) * 58 + 40), height: 86 }}>
        <path className="queue-rail" d={`M 15 68 H ${Math.max(viewport - 39, (frame.queue?.length ?? 0) * 58 + 25)}`} />
        {departing !== undefined && <g key={`depart-${frame.step}`} className="queue-depart" transform="translate(41, 38)"><rect x="-20" y="-20" width="40" height="40" rx="9" /><text textAnchor="middle" dy="5">{frame.values[departing]}</text></g>}
        {frame.queue?.map((id, i) => <MovingGroup key={id} identity={`queue-${id}`} x={41 + i * 58} y={38} step={frame.step} duration={duration} reduced={reduced} className={`queue-token ${id === entered ? 'queue-arrival' : ''}`}><rect x="-20" y="-20" width="40" height="40" rx="9" /><text textAnchor="middle" dy="5">{frame.values[id]}</text><text textAnchor="middle" y="43" className="queue-id">#{id}</text></MovingGroup>)}
        {!frame.queue?.length && <text x="20" y="43" className="queue-empty">队列为空</text>}
      </svg>
    </div></div>}
    {tree && <div className="level-results"><span>已完成的层</span>{frame.levels?.length ? frame.levels.map((level, i) => <code className="saved-level" key={i}>[{level.join(', ')}]</code>) : <span className="muted">等待遍历</span>}</div>}
    {!tree && <div className="list-direction"><span className="direction-original" /> 原始连接<span className="direction-reversed" /> 已反转连接 <span className="direction-removed" /> 本步断开的连接</div>}
  </div>;
}
