import { useState } from 'react';
import { structuresView } from '../engine/presets/structures';
import type { SceneProps } from './ArrayScene';
import { FlowArrow, MovingGroup, useStageWidth } from './motion';

export default function StructuresScene({ frame, problem, duration, reduced }: SceneProps) {
  const view = structuresView(frame), { ref, width: viewport } = useStageWidth(), trie = view.kind === 'trie';
  const [navigation, setNavigation] = useState({ step: frame.step, forward: false });
  if (navigation.step !== frame.step) setNavigation({ step: frame.step, forward: frame.step === navigation.step + 1 });
  const forward = navigation.forward && !reduced, positions = new Map<number, { x: number; y: number }>();
  const tiers = Array.from({ length: 6 }, (_, depth) => view.nodes.filter((n) => n.prefix.length === depth).sort((a, b) => a.prefix.localeCompare(b.prefix)));
  const heapDepth = Math.max(0, ...view.heaps.map((h) => Math.floor(Math.log2(Math.max(1, h.ids.length)))));
  const width = Math.max(viewport, trie ? Math.max(1, ...tiers.map((t) => t.length)) * 88 + 50 : 2 ** heapDepth * 86 + 50);
  let bottom = 0;
  const sections: { name: string; top: number; ids: number[] }[] = [];
  if (trie) {
    tiers.forEach((tier, depth) => tier.forEach((node, i) => positions.set(node.id, { x: (i + .5) / tier.length * (width - 50) + 25, y: 57 + depth * 95 })));
    bottom = 90 + Math.max(0, ...view.nodes.map((n) => n.prefix.length)) * 95;
  } else {
    for (const heap of view.heaps) {
      const top = bottom; sections.push({ name: heap.name, top, ids: heap.ids });
      heap.ids.forEach((id, index) => { const depth = Math.floor(Math.log2(index + 1)), slot = index - (2 ** depth - 1); positions.set(id, { x: (slot + .5) / 2 ** depth * (width - 50) + 25, y: top + 90 + depth * 90 }); });
      bottom += 175 + Math.floor(Math.log2(Math.max(1, heap.ids.length))) * 90;
    }
    if (view.held !== null) positions.set(view.held, { x: 100, y: bottom + 85 });
    bottom += 160;
  }
  const route = (from: number, to: number) => { const a = positions.get(from)!, b = positions.get(to)!, dx = b.x - a.x, dy = b.y - a.y, length = Math.max(1, Math.hypot(dx, dy)); return `M ${a.x + dx / length * 25} ${a.y + dy / length * 25} L ${b.x - dx / length * 29} ${b.y - dy / length * 29}`; };
  const edges = trie ? frame.links ?? [] : view.heaps.flatMap((heap) => heap.ids.slice(1).map((id, i) => [heap.ids[Math.floor(i / 2)], id] as [number, number]));
  return <div className="motion-scene structures-scene">
    <div className="scene-topline"><span>{view.operation || (trie ? '字符边组成共享前缀' : '堆序不等于完整排序')}</span><span>{trie ? `${view.nodes.length} 个节点` : `已读 ${Math.max(0, view.cursor + 1)} 项`}</span></div>
    {!trie && <div className="structure-source" aria-label="原始输入序列">{view.source.map((value, i) => <code key={i} className={i === view.cursor ? 'current' : ''}>{value}<small>{i}</small></code>)}</div>}
    <div ref={ref} className="scene-scroll" role="region" tabIndex={0} aria-label="可滚动的堆与前缀树画布">
      <svg className="algorithm-scene structures-board" role="img" aria-label={`${problem.title}节点状态`} viewBox={`0 0 ${width} ${bottom}`} style={{ width, height: bottom }}>
        {sections.map((s) => <g key={s.name}><text x="20" y={s.top + 25} className="tree-section-label">{s.name} · {s.ids.length} 个</text>{!s.ids.length && <text x="25" y={s.top + 82} className="tree-empty">空堆</text>}</g>)}
        {!trie && <text x="20" y={bottom - 135} className="tree-section-label">暂存 / 本次取出</text>}
        {edges.map(([from, to]) => {
          const a = positions.get(from)!, b = positions.get(to)!, active = trie ? view.connection?.[0] === from && view.connection[1] === to : frame.active.includes(from) && frame.active.includes(to);
          return <g key={`${from}-${to}`} data-testid="structure-edge" data-from={from} data-to={to} className={active ? 'structure-edge active' : 'structure-edge'}>
            <FlowArrow path={route(from, to)} animated={forward && active} duration={duration} motionKey={`${frame.step}-${from}-${to}`} />
            {trie && <text x={(a.x + b.x) / 2 + 10} y={(a.y + b.y) / 2} className="trie-edge-letter">{view.nodes[to].char}</text>}
          </g>;
        })}
        {[...positions].map(([id, p]) => {
          const node = view.nodes[id], terminal = !!node?.terminal;
          return <MovingGroup key={id} identity={`structure-${id}`} {...p} step={frame.step} duration={duration} reduced={!forward} arc={!trie} className={`structure-node ${frame.active.includes(id) ? 'active' : ''} ${view.path.includes(id) || frame.settled.includes(id) || view.median?.ids.includes(id) ? 'selected' : ''}`}>
            <g data-testid="structure-node" data-id={id} data-value={frame.values[id]} data-terminal={terminal}><circle r="25" />{terminal && <circle r="20" className="trie-terminal" />}<text textAnchor="middle" dy="5">{frame.values[id]}</text><text y="-33" textAnchor="middle" className="scene-index">#{id}</text><text y="43" textAnchor="middle" className="scene-index">{trie ? terminal ? '单词结束' : '前缀' : problem.id === 'top-k-frequent-elements' ? `频次 ${view.priorities[id]}` : ''}</text></g>
          </MovingGroup>;
        })}
      </svg>
    </div>
    {!trie && view.heaps.map((heap, h) => <div className="tree-prefixes" key={heap.name}><span>{heap.name} · 堆数组（按层序）</span><div>{heap.ids.map((id, index) => <code key={id} data-testid="heap-slot" data-heap={h} data-index={index} data-id={id}>[{index}] #{id}: {frame.values[id]}</code>)}</div></div>)}
    {!!view.counts.length && <div className="tree-prefixes"><span>已累计频次</span><div>{view.counts.map((c) => <code key={c.id} data-testid="structure-count">{c.value} → {c.count}</code>)}</div></div>}
    {view.median && <div className="partition-comparisons" data-testid="structure-median">堆顶计算中位数：{view.median.ids.map((id) => frame.values[id]).join(' + ')}{view.median.ids.length === 2 ? '，再除以 2' : ''} = {view.median.value}</div>}
    {!!view.outputs.length && <div className="tree-prefixes"><span>{view.outputLabel}</span><div>{view.outputs.map((value, i) => <code key={i} data-testid="structure-output">{String(value)}</code>)}</div></div>}
  </div>;
}
