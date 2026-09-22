import { useId, useLayoutEffect, useState } from 'react';
import { treeView, type TreeSlot } from '../engine/presets/trees';
import type { SceneProps } from './ArrayScene';
import { FlowArrow, MovingGroup, useStageWidth } from './motion';

export default function TreeScene({ frame, previous, problem, duration, reduced }: SceneProps) {
  const view = treeView(frame), { ref, width: viewport } = useStageWidth();
  const [navigation, setNavigation] = useState({ step: frame.step, forward: false });
  if (navigation.step !== frame.step) setNavigation({ step: frame.step, forward: frame.step === navigation.step + 1 });
  const forward = navigation.forward && !reduced;
  const width = Math.max(viewport, 2 ** view.maxDepth * 76 + 50, view.flat ? frame.values.length * 86 + 60 : 0);
  const flatY = 140 + (view.maxDepth + 1) * 106, height = view.flat ? flatY + 80 : 155 + view.maxDepth * 106;
  const point = (slot: TreeSlot) => ({ x: (slot.slot + .5) / 2 ** slot.depth * (width - 50) + 25, y: 62 + slot.depth * 106 });
  const positions = new Map(view.slots.map((slot) => [slot.id, point(slot)]));
  if (view.flat) view.output.forEach((id, i) => positions.set(id, { x: 55 + i * 86, y: flatY }));
  const oldPositions = view.beforeSlots ? new Map(view.beforeSlots.map((slot) => [slot.id, point(slot)])) : positions;
  const focus = frame.active.at(-1);
  useLayoutEffect(() => {
    const scroller = ref.current, p = focus === undefined ? undefined : positions.get(focus);
    if (scroller && p && (p.x < scroller.scrollLeft + 42 || p.x > scroller.scrollLeft + viewport - 42)) scroller.scrollLeft = Math.max(0, p.x - viewport / 2);
  }, [focus, frame.step, width, viewport]);
  const route = (from: number, to: number, old = false) => {
    const map = old ? oldPositions : positions, a = map.get(from)!, b = map.get(to)!;
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.max(1, Math.hypot(dx, dy));
    return `M ${a.x + dx / length * 27} ${a.y + dy / length * 27} L ${b.x - dx / length * 31} ${b.y - dy / length * 31}`;
  };
  const marker = useId();
  const queue = frame.queue;
  const tokens = queue ? queue.map((node) => ({ key: node, node, label: `#${node}: ${frame.values[node]}` })) : view.stack;
  const columns = Math.max(2, Math.floor((viewport - 20) / 105));
  const boardHeight = Math.max(1, Math.ceil(tokens.length / columns)) * 55 + 18;
  const inPath = (from: number, to: number) => view.path.some((id, i) => i > 0 && ((id === from && view.path[i - 1] === to) || (id === to && view.path[i - 1] === from)));
  return <div className="motion-scene tree-lab">
    {view.sequence && <div className="tree-source"><span>{view.sequence.label} · 已消耗 {view.sequence.cursor} 项</span><div>{view.sequence.values.map((value, i) => <code key={i} className={i === view.sequence!.cursor ? 'in-range' : ''} data-testid="tree-preorder-item">{value}<small>{i}</small></code>)}</div></div>}
    {view.source && <div className="tree-source"><span>{view.sourceLabel ?? '有序输入'}{view.range ? ` · 当前区间 [${view.range.join(', ')}]` : ''}</span><div>{view.source.map((value, i) => <code key={i} className={view.range && i >= view.range[0] && i <= view.range[1] ? 'in-range' : ''} data-testid="tree-source-item">{value}<small>{i}</small></code>)}</div></div>}
    <div className="scene-topline"><span>{view.flat ? '原节点逐步排列成右链' : '左 / 右位置与节点身份分开记录'}</span><span>{frame.values.length} 个节点</span></div>
    <div className="scene-scroll" ref={ref} role="region" tabIndex={0} aria-label="可横向滚动的二叉树画布">
      <svg className="algorithm-scene graph-motion tree-lab-scene" role="img" aria-label={`${problem.title}执行状态`} viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
        <defs><marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1 L 9 5 L 0 9 z" fill="#7899ba" /></marker></defs>
        {!frame.values.length && <text x="28" y="74" className="tree-empty">{view.source?.length ? '等待创建根节点' : '空树'}</text>}
        {view.flat && <text x="25" y={flatY - 49} className="tree-section-label">已展开的右链</text>}
        {(frame.links ?? []).map(([from, to]) => {
          const a = positions.get(from)!, b = positions.get(to)!, side = frame.edgeLabels![`${from}-${to}`];
          return <g key={`${from}-${to}`} className={`tree-live ${inPath(from, to) ? 'on-path' : ''}`} data-testid="tree-edge" data-from={from} data-to={to} data-side={side}>
            {view.changed.some((e) => e.from === from && e.to === to && e.side === side) ? <FlowArrow path={route(from, to)} animated={forward} duration={duration} motionKey={`${frame.step}-${from}-${to}`} /> : <path d={route(from, to)} fill="none" markerEnd={`url(#${marker})`} />}
            <text x={(a.x + b.x) / 2 + (b.x < a.x ? -10 : 10)} y={(a.y + b.y) / 2 - 6} textAnchor="middle">{side === 'L' ? '左' : '右'}</text>
          </g>;
        })}
        {view.retired.map(({ from, to, side }) => <g key={`${from}-${to}-${side}`} className="tree-retired" data-testid="tree-retired-edge" data-from={from} data-to={to} data-side={side}><path d={route(from, to, true)} fill="none" /><title>已断开 #{from}.{side} → #{to}</title></g>)}
        {view.returning?.to !== null && view.returning?.to !== undefined && <g className="tree-return" data-testid="tree-return" data-from={view.returning.from} data-to={view.returning.to} data-value={view.returning.value}>
          <FlowArrow path={route(view.returning.from, view.returning.to)} label={String(view.returning.value)} x={(positions.get(view.returning.from)!.x + positions.get(view.returning.to)!.x) / 2} y={(positions.get(view.returning.from)!.y + positions.get(view.returning.to)!.y) / 2} animated={forward} duration={duration} motionKey={`return-${frame.step}`} />
        </g>}
        {frame.values.map((value, id) => {
          const p = positions.get(id)!, active = frame.active.includes(id), born = forward && id >= (previous?.values.length ?? frame.values.length);
          const children = (frame.links ?? []).filter(([from]) => from === id).map(([from, to]) => frame.edgeLabels![`${from}-${to}`]);
          return <MovingGroup key={id} identity={`tree-${id}`} x={p.x} y={p.y} step={frame.step} duration={duration} reduced={!forward} arc={problem.id === 'invert-binary-tree'} className={`scene-node tree-lab-node ${active ? 'is-target' : ''} ${stateClass(view.path.includes(id))} ${born ? 'tree-born' : ''}`}>
            <g data-testid="tree-node" data-id={id} data-value={value}>
              <circle className="node-disc" r="26" /><text textAnchor="middle" dy="5" className="tree-value">{value}</text>
              {view.targets?.includes(id) && <circle r="31" fill="none" stroke="#cf9354" strokeWidth="2" />}
              <text y="-35" textAnchor="middle" className="scene-index">#{id}</text>
              {view.metrics[id] !== undefined && <text y="43" textAnchor="middle" className="tree-metric" data-testid="tree-metric" data-id={id}>{view.metrics[id]}</text>}
              {!view.flat && !children.includes('L') && <text x="-22" y="61" textAnchor="middle" className="tree-null">L:∅</text>}
              {!view.flat && !children.includes('R') && <text x="22" y="61" textAnchor="middle" className="tree-null">R:∅</text>}
            </g>
          </MovingGroup>;
        })}
      </svg>
    </div>
    <div className="tree-legend"><span>蓝线：孩子指针</span><span>绿箭头：返回值</span><span>虚线：本步断开</span></div>
    {view.targets && <div className="tree-constraint">查找目标：{view.targets.map((id, i) => <code key={i}>{i ? 'q' : 'p'} = #{id} ({frame.values[id]}) </code>)}</div>}
    {view.frequencies && <div className="tree-prefixes"><span>当前分支的前缀和 → 次数</span><div>{view.frequencies.map((entry) => <code key={entry.label} data-testid="tree-prefix">{entry.label} → {entry.value}</code>)}</div></div>}
    {!!view.matches?.length && <div className="tree-prefixes"><span>本步命中的向下路径</span><div>{view.matches.map((path, i) => <code key={i} data-testid="tree-match">{path.map((id) => `#${id}`).join(' → ')}</code>)}</div></div>}
    {(view.pair || view.bounds) && <div className="tree-constraint" data-testid="tree-constraint">{view.pair ? `镜像位置：${view.pair.map((id) => id === null ? '空' : `#${id}`).join(' ↔ ')}` : `#${view.bounds!.node} 的祖先边界：(${view.bounds!.low ?? '−∞'}, ${view.bounds!.high ?? '+∞'})`}</div>}
    {!view.flat && <div className="tree-stack"><div className="scene-topline"><span>{queue ? '队列 · 从左到右出队' : '待处理栈 / 递归调用 · 末项在顶部'}</span><span>{tokens.length} 项</span></div>
      <svg className="algorithm-scene tree-stack-board" viewBox={`0 0 ${viewport} ${boardHeight}`} style={{ width: viewport, height: boardHeight }} role="img" aria-label={queue ? '树的等待队列' : '树的待处理调用栈'}>
        {!tokens.length && <text x="16" y="34" className="tree-empty">{queue ? '队列为空' : '栈为空'}</text>}
        {tokens.map((token, i) => <MovingGroup key={token.key} identity={`tree-work-${token.key}`} x={55 + (i % columns) * 105} y={28 + Math.floor(i / columns) * 55} step={frame.step} duration={duration} reduced={!forward} className="tree-work-token"><g data-testid="tree-work-item" data-node={token.node === null ? 'null' : token.node} data-key={token.key}>
          <rect x="-46" y="-18" width="92" height="36" rx="8" /><text textAnchor="middle" dy="4">{token.label}</text>
        </g></MovingGroup>)}
      </svg>
    </div>}
    {view.output.length > 0 && <div className="tree-output"><span>{view.outputLabel}</span><div>{view.output.map((id) => <code key={id} data-testid="tree-output-node" data-id={id}><small>#{id}</small>{frame.values[id]}</code>)}</div></div>}
  </div>;
}

function stateClass(onPath: boolean) { return onPath ? 'on-path' : ''; }
