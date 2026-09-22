import { useState } from 'react';
import { cacheView, searchView } from '../engine/presets/search-cache';
import type { SceneProps } from './ArrayScene';
import { FlowArrow, MovingGroup, useStageWidth } from './motion';

export default function SearchCacheScene(props: SceneProps) {
  return props.problem.renderer === 'cache' ? <CacheScene {...props} /> : <SearchScene {...props} />;
}
function useForward(step: number, reduced: boolean) {
  const [navigation, setNavigation] = useState({ step, forward: false });
  if (navigation.step !== step) setNavigation({ step, forward: step === navigation.step + 1 });
  return navigation.forward && !reduced;
}
function SearchScene({ frame, duration, reduced }: SceneProps) {
  const view = searchView(frame), { ref, width } = useStageWidth(), forward = useForward(frame.step, reduced);
  const columns = Math.max(2, Math.floor((width - 32) / 80));
  const point = (i: number, top: number) => ({ x: 56 + i % columns * 80, y: top + Math.floor(i / columns) * 70 });
  const sourceHeight = Math.max(1, Math.ceil(frame.values.length / columns)) * 70;
  const pathTop = sourceHeight + 116, height = pathTop + Math.max(1, Math.ceil(10 / columns)) * 70 + 65;
  const transfer = frame.location === 'choose' ? view.path.at(-1) : view.removed;
  const from = transfer ? point(transfer.source, 54) : null;
  const to = transfer ? point(frame.location === 'choose' ? view.path.length - 1 : view.path.length, pathTop) : null;
  return <div className="motion-scene choice-scene" ref={ref}>
    <div className="scene-topline"><span>候选 → 选择路径 → 答案副本</span><span>{view.remaining === null ? `深度 ${view.path.length}` : `剩余 ${view.remaining}`}</span></div>
    <svg className="algorithm-scene choice-board" role="img" aria-label="回溯选择与撤销状态" viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
      <text x="20" y="18" className="tree-section-label">输入候选 · 灰色表示当前层不可选</text>
      {frame.values.map((value, i) => {
        const p = point(i, 54); return <g key={i} transform={`translate(${p.x},${p.y})`} className={`choice-token ${view.available.includes(i) ? '' : 'unavailable'} ${view.candidate === i ? 'selected' : ''}`} data-testid="choice-source" data-id={i} data-available={view.available.includes(i)}>
          <rect x="-32" y="-23" width="64" height="46" rx="12" /><text textAnchor="middle" dy="5">{value}</text><text y="39" textAnchor="middle" className="scene-index">[{i}]</text>
        </g>;
      })}
      <text x="20" y={pathTop - 44} className="tree-section-label">当前递归路径 · 从左到右，末项为本次选择</text>
      {!view.path.length && !view.removed && <text x="30" y={pathTop + 5} className="tree-empty">空路径</text>}
      {view.path.map((choice, i) => {
        const p = point(i, pathTop), q = i ? point(i - 1, pathTop) : null;
        return <g key={choice.key} data-testid="choice-path-item" data-source={choice.source} data-key={choice.key}>
          {q && <path d={`M ${q.x + 33} ${q.y} L ${p.x - 33} ${p.y}`} className="choice-link" />}
          <MovingGroup identity={`choice-${choice.key}`} {...p} step={frame.step} duration={duration} reduced={!forward} className="choice-token chosen"><rect x="-32" y="-23" width="64" height="46" rx="12" /><text textAnchor="middle" dy="5">{frame.values[choice.source]}</text><text y="39" textAnchor="middle" className="scene-index">第 {i + 1} 层</text></MovingGroup>
        </g>;
      })}
      {view.removed && to && <g transform={`translate(${to.x},${to.y})`} className="choice-token removed" data-testid="choice-removed"><rect x="-32" y="-23" width="64" height="46" rx="12" /><text textAnchor="middle" dy="5">{frame.values[view.removed.source]}</text><text textAnchor="middle" y="40">已撤销</text></g>}
      {from && to && <FlowArrow path={frame.location === 'choose' ? `M ${from.x} ${from.y + 24} Q ${width - 20} ${(from.y + to.y) / 2} ${to.x} ${to.y - 25}` : `M ${to.x} ${to.y - 25} Q ${width - 20} ${(from.y + to.y) / 2} ${from.x} ${from.y + 25}`} animated={forward} duration={duration} motionKey={`${frame.step}`} />}
    </svg>
    <div className="choice-results"><div className="scene-topline"><span>已收集答案 · 不包含未来结果</span><span>{view.answers.length} 组</span></div><div className="choice-result-list" tabIndex={0} role="region" aria-label="已收集的回溯答案">{view.answers.map((answer, i) => <code key={i} data-testid="choice-answer">[{answer.join(', ')}]</code>)}{!view.answers.length && <span className="muted">尚未收集答案</span>}</div></div>
  </div>;
}

function CacheScene({ frame, duration, reduced }: SceneProps) {
  const view = cacheView(frame), { ref, width: viewport } = useStageWidth(), forward = useForward(frame.step, reduced);
  const width = Math.max(viewport, (view.capacity + 1) * 120 + 40);
  const point = (id: number) => ({ x: 70 + view.order.indexOf(id) * 120, y: 112 });
  return <div className="motion-scene cache-scene">
    <div className="scene-topline"><span>{view.operation ? `${view.operationIndex + 1}. ${view.operation.op}(${view.operation.key}${view.operation.op === 'put' ? `, ${view.operation.value}` : ''})` : '等待操作'}</span><span>容量 {view.capacity} · 当前 {view.order.length}</span></div>
    <div ref={ref} className="scene-scroll" role="region" tabIndex={0} aria-label="可横向滚动的 LRU 双向链表">
      <svg className="algorithm-scene cache-board" role="img" aria-label="LRU 最近使用顺序与双向连接" viewBox={`0 0 ${width} 278`} style={{ width, height: 278 }}>
        <text x="24" y="28" className="tree-section-label">MRU 最近使用 → LRU 最久未使用</text>
        {!view.order.length && <text x="24" y="116" className="tree-empty">缓存为空</text>}
        {view.entries.map((entry) => {
          const p = point(entry.id); return <g key={entry.id}>
            {entry.next !== null && <g data-testid="cache-next" data-from={entry.id} data-to={entry.next}><FlowArrow path={`M ${p.x + 45} ${p.y - 16} L ${point(entry.next).x - 46} ${p.y - 16}`} animated={forward && ['touch', 'insert', 'evict'].includes(frame.location)} duration={duration} motionKey={`next-${frame.step}-${entry.id}`} /></g>}
            {entry.prev !== null && <g data-testid="cache-prev" data-from={entry.id} data-to={entry.prev}><FlowArrow path={`M ${p.x - 45} ${p.y + 16} L ${point(entry.prev).x + 46} ${p.y + 16}`} animated={false} duration={duration} motionKey={`prev-${frame.step}-${entry.id}`} /></g>}
            <MovingGroup {...p} identity={`cache-${entry.id}`} step={frame.step} duration={duration} reduced={!forward} arc className={`cache-token ${view.touched === entry.id ? 'selected' : ''}`}><g data-testid="cache-node" data-id={entry.id} data-key={entry.key} data-value={entry.value}>
              <rect x="-44" y="-34" width="88" height="68" rx="13" /><text textAnchor="middle" y="-8">key {entry.key}</text><text textAnchor="middle" y="16" className="cache-value">{entry.value}</text><text textAnchor="middle" y="54" className="scene-index">#{entry.id}</text>
            </g></MovingGroup>
          </g>;
        })}
        {view.removed && <g className="cache-evicted" data-testid="cache-evicted" data-key={view.removed.key}><rect x="22" y="196" width="220" height="46" rx="9" /><text x="36" y="225">已淘汰 #{view.removed.id} · key {view.removed.key}</text></g>}
      </svg>
    </div>
    <div className="tree-prefixes"><span>哈希表 · key → 节点 ID</span><div>{view.lookup.map(([key, id]) => <code key={key} data-testid="cache-lookup">{key} → #{id}</code>)}</div></div>
    <div className="tree-prefixes"><span>已执行操作的返回值</span><div>{view.outputs.map((out, i) => <code key={i} data-testid="cache-output">{out === null ? 'null' : out}</code>)}</div></div>
  </div>;
}
