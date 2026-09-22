import { useId, useLayoutEffect, useState } from 'react';
import { linkedListView } from '../engine/presets/linked-lists';
import type { SceneProps } from './ArrayScene';
import { FlowArrow, MovingGroup, useStageWidth } from './motion';

export default function LinkedListScene({ frame, previous, problem, duration, reduced }: SceneProps) {
  const view = linkedListView(frame), { ref, width: viewport } = useStageWidth();
  const functional = view.edgeMode === 'array-index';
  const [navigation, setNavigation] = useState({ step: frame.step, forward: false });
  if (navigation.step !== frame.step) setNavigation({ step: frame.step, forward: frame.step === navigation.step + 1 });
  const forward = navigation.forward && !reduced;
  const pointers = Object.entries(frame.pointers);
  // Fixed space for all possible pointer names keeps node lanes stable across phases.
  const laneHeight = 270, top = 108, pitch = 100;
  const width = Math.max(viewport, Math.max(1, ...view.lanes.map((lane) => lane.ids.length)) * pitch + 155);
  const height = Math.max(200, view.lanes.length * laneHeight + 20);
  const positions = new Map<number, { x: number; y: number }>();
  view.lanes.forEach((lane, row) => lane.ids.forEach((id, col) => positions.set(id, { x: 78 + col * pitch, y: top + row * laneHeight })));
  const focus = frame.active.at(-1);
  useLayoutEffect(() => {
    const scroller = ref.current, point = focus === undefined ? undefined : positions.get(focus);
    if (scroller && point && (point.x < scroller.scrollLeft + 40 || point.x > scroller.scrollLeft + viewport - 40)) scroller.scrollLeft = Math.max(0, point.x - viewport / 2);
  }, [focus, frame.step, width, viewport]);
  const nextMarker = useId(), randomMarker = useId();
  const route = (from: number, to: number, random = false) => {
    const a = positions.get(from)!, b = positions.get(to)!;
    if (from === to) return `M ${a.x - 18} ${a.y - 22} C ${a.x - 77} ${a.y - 91} ${a.x + 77} ${a.y - 91} ${a.x + 18} ${a.y - 24}`;
    if (random) return `M ${a.x} ${a.y - 29} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 102} ${b.x} ${b.y - 31}`;
    if (a.y === b.y) {
      const direction = a.x < b.x ? 1 : -1;
      return `M ${a.x + direction * 29} ${a.y} Q ${(a.x + b.x) / 2} ${a.y - direction * Math.min(64, Math.abs(a.x - b.x) * .2)} ${b.x - direction * 32} ${b.y}`;
    }
    const direction = a.y < b.y ? 1 : -1;
    return `M ${a.x} ${a.y + direction * 29} C ${a.x + 45} ${(a.y + b.y) / 2} ${b.x - 45} ${(a.y + b.y) / 2} ${b.x} ${b.y - direction * 32}`;
  };
  const clones = new Set(view.copies.map(([, clone]) => clone));
  return <div className="motion-scene ll-scene">
    <div className="scene-topline"><span>{functional ? '下标 i → nums[i]，值作为下一下标' : '节点身份固定，沿箭头读取连接'}</span><span>{frame.values.length - view.dummy.length} 个{functional ? '下标' : '节点'}</span></div>
    <div className="ll-heads">{Object.entries(view.heads).map(([name, id]) => <span key={name}><code>{name}</code> → {id === null ? 'null' : `#${id}`}</span>)}</div>
    <div ref={ref} className="scene-scroll" role="region" tabIndex={0} aria-label="可横向滚动的链表画布">
      <svg className="algorithm-scene graph-motion ll-graph" role="img" aria-label={`${problem.title}节点与指针状态`} viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
        <defs>
          <marker id={nextMarker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1 L 9 5 L 0 9 z" fill="#6b91b1" /></marker>
          <marker id={randomMarker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1 L 9 5 L 0 9 z" fill="#bb945f" /></marker>
        </defs>
        {view.lanes.map((lane, i) => <g key={i} className="ll-lane">
          <text x="16" y={i * laneHeight + 22}>{lane.label}</text>
          <line x1="16" x2={width - 18} y1={(i + 1) * laneHeight} y2={(i + 1) * laneHeight} />
          {!lane.ids.length && <text x="24" y={top + i * laneHeight} className="ll-empty">空</text>}
        </g>)}
        {(frame.links ?? []).map(([from, to]) => <g key={`${from}-${to}`} className="ll-next" data-testid="live-edge" data-from={from} data-to={to}>
          <title>{functional ? `nums[${from}] = ${to}` : `#${from}.next → #${to}`}</title>
          {view.changed.some(([a, b]) => a === from && b === to) || view.traversed?.some(([a, b]) => a === from && b === to) ? <FlowArrow path={route(from, to)} animated={forward} duration={duration} motionKey={`${frame.step}-${from}-${to}`} /> : <path d={route(from, to)} className="ll-next-path" fill="none" markerEnd={`url(#${nextMarker})`} />}
        </g>)}
        {view.randomLinks.map(([from, to]) => <g key={`random-${from}-${to}`} className="ll-random" data-testid="random-edge" data-from={from} data-to={to}>
          <title>#{from}.random → #{to}</title>
          {frame.location === 'connect' && from === frame.pointers.copy ? <FlowArrow path={route(from, to, true)} animated={forward} duration={duration} motionKey={`random-${frame.step}-${from}`} /> : <path d={route(from, to, true)} fill="none" markerEnd={`url(#${randomMarker})`} />}
        </g>)}
        {view.retired.map(([from, to]) => <g key={`retired-${from}-${to}`} className="ll-retired" data-testid="retiring-edge" data-from={from} data-to={to}>
          <path d={route(from, to)} fill="none" /><title>本步已断开 #{from} → #{to}</title>
        </g>)}
        {view.copies.filter(([original]) => original === frame.pointers.original).map(([original, copy]) => <g key={`copy-${original}`} className="ll-copy" data-testid="copy-mapping" data-from={original} data-to={copy}>
          <FlowArrow path={route(original, copy)} label="映射" x={(positions.get(original)!.x + positions.get(copy)!.x) / 2} y={(positions.get(original)!.y + positions.get(copy)!.y) / 2} animated={forward} duration={duration} motionKey={`copy-${frame.step}`} />
        </g>)}
        {frame.values.map((value, id) => {
          const point = positions.get(id)!, active = frame.active.includes(id), isDummy = view.dummy.includes(id);
          const born = forward && id >= (previous?.values.length ?? frame.values.length);
          return <g key={id} transform={`translate(${point.x}, ${point.y})`} className={`scene-node ll-node ${active ? 'is-target' : ''} ${clones.has(id) ? 'is-copy' : ''} ${isDummy ? 'is-dummy' : ''} ${view.detached.includes(id) ? 'is-detached' : ''} ${born ? 'll-born' : ''}`} data-testid="list-node" data-id={id} data-value={value} data-dummy={isDummy} data-copy={clones.has(id)}>
            {view.group.includes(id) && <circle r="36" className="ll-group-ring" />}
            <circle r="28" className="node-disc" />
            <text textAnchor="middle" dy="5" className="ll-value">{isDummy ? '哨兵' : value}</text>
            <text textAnchor="middle" y="44" className="scene-index">#{id}{view.detached.includes(id) ? ' · 已绕过' : ''}</text>
            {!frame.links?.some(([from]) => from === id) && <text x="34" y="20" className="ll-null">next: null</text>}
          </g>;
        })}
        {pointers.map(([name, id], order) => {
          const point = id === null ? { x: width - 65, y: top } : positions.get(id)!;
          return <MovingGroup key={name} identity={`list-pointer-${name}`} x={point.x} y={point.y + 69 + order * 25} step={frame.step} duration={duration} reduced={!forward} className="ll-pointer">
            <rect x="-43" y="-12" width="86" height="22" rx="7" /><text textAnchor="middle" dy="3">{name}{id === null ? ': null' : ''}</text>
          </MovingGroup>;
        })}
      </svg>
    </div>
    <div className="ll-legend"><span><i className="ll-next-key" /> {functional ? 'nums[i] 指向下一下标，数组不修改' : 'next'}</span>{view.randomLinks.length > 0 && <span><i className="ll-random-key" /> random</span>}{!functional && <span><i className="ll-retired-key" /> 本步断开</span>}{view.copies.length > 0 && <span>浅绿：新节点 · 映射线不是指针</span>}</div>
    <div className="ll-pointer-summary">{pointers.map(([name, id]) => <code key={name}>{name} → {id === null ? 'null' : `#${id}`}</code>)}</div>
    {view.work && <div className="tree-prefixes"><span>分治调用栈 · 末项在顶部</span><div>{view.work.map((call, i) => <code key={i} data-testid="merge-call">{call}</code>)}</div></div>}
    {view.output.length > 0 && <div className="ll-output"><span>{view.outputLabel}</span><div>{view.output.map((id) => <code key={id} data-testid="list-output-node" data-id={id}><small>#{id}</small>{frame.values[id]}</code>)}</div></div>}
    {view.copies.length > 0 && <div className="ll-copy-map"><span>原节点 → 新节点</span><div>{view.copies.map(([from, to]) => <code key={from} data-testid="copy-pair" data-from={from} data-to={to}>#{from} → #{to}</code>)}</div></div>}
  </div>;
}
