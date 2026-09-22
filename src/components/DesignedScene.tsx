import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { currentSceneSummary, graphValues, panelHeading, resolveBinding, sequenceValues, type SceneContext, type ScenePanel, type SceneSpec } from '../engine/scene-spec';
import GeneratedScene from './GeneratedScene';
import { FlowArrow, MovingGroup, useReducedMotion } from './motion';

const show = (v: unknown) => v === undefined ? '尚未记录' : v === null ? '·' : typeof v === 'string' ? v : JSON.stringify(v);
function Graph({ panel, context, speed }: { panel: Extract<ScenePanel, { kind: 'graph' }>; context: SceneContext; speed: number }) {
  const reduced = useReducedMotion(), previous = useRef(context.frame.step);
  const forward = context.frame.step === previous.current + 1;
  useLayoutEffect(() => { previous.current = context.frame.step; }, [context.frame.step]);
  const data = graphValues(resolveBinding(panel.source, context), resolveBinding(panel.edges, context), panel.source === 'grid');
  const n = data.nodes.length, columns = Math.min(6, Math.max(1, Math.ceil(Math.sqrt(n))));
  const radius = Math.max(130, n * 13), width = panel.layout === 'circle' ? radius * 2 + 100 : Math.max(380, columns * 95 + 40);
  const height = panel.layout === 'circle' ? width : Math.max(220, Math.ceil(n / columns) * 95 + 50);
  const points = new Map(data.nodes.map((node, i) => [node.id, panel.layout === 'circle'
    ? { x: width / 2 + Math.cos(i * Math.PI * 2 / Math.max(n, 1) - Math.PI / 2) * radius, y: height / 2 + Math.sin(i * Math.PI * 2 / Math.max(n, 1) - Math.PI / 2) * radius }
    : { x: 65 + i % columns * 95, y: 65 + Math.floor(i / columns) * 95 }]));
  return <div className="scene-scroll"><svg className="designed-graph" width={width} height={height} role="img" aria-label={panelHeading(panel)}>
    {data.edges.map((edge, i) => { const a = points.get(edge.from)!, b = points.get(edge.to)!; return <g key={`${context.frame.step}:${i}`}><FlowArrow path={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} blocked={edge.chosen === false} animated={forward && !reduced} motionKey={`${context.frame.step}:${i}`} duration={700 / speed} /><title>{edge.label ?? `${edge.from} → ${edge.to}`}</title></g>; })}
    {data.nodes.map((node) => { const p = points.get(node.id)!; const active = panel.source === 'grid' && context.frame.active.includes(Number(node.id)); return <MovingGroup key={node.id} identity={node.id} x={p.x} y={p.y} step={context.frame.step} duration={700 / speed} reduced={reduced} className={`designed-node ${active ? 'focused' : ''}`}><circle r={24} /><title>{node.label}</title><text textAnchor="middle" dy="4">{node.label.length > 7 ? `${node.label.slice(0, 6)}…` : node.label}</text><text className="node-key" textAnchor="middle" y="41">{node.id}</text></MovingGroup>; })}
  </svg>{!n && <p className="scene-empty">当前没有节点</p>}</div>;
}
function Panel({ panel, context, speed }: { panel: ScenePanel; context: SceneContext; speed: number }) {
  const value = resolveBinding(panel.source, context);
  if (value === undefined) return <p className="scene-empty">{panel.kind === 'result' ? '运行结果在最后一帧显示' : '此帧尚未记录该状态'}</p>;
  if (panel.kind === 'grid') return <GeneratedScene frame={context.frame} speed={speed} embedded />;
  if (panel.kind === 'graph') return <Graph panel={panel} context={context} speed={speed} />;
  if (panel.kind === 'values' || panel.kind === 'result') {
    const entries: [string, unknown][] = value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : [[panel.source, value]];
    return <dl className="scene-values">{entries.slice(0, 20).map(([key, v]) => <div key={key}><dt>{key}</dt><dd title={show(v)}>{show(v).slice(0, 500)}{show(v).length > 500 ? '…（显示已折叠）' : ''}</dd></div>)}</dl>;
  }
  const values = sequenceValues(value, panel.kind === 'sequence');
  if (panel.kind === 'sequence' && panel.style === 'bars') {
    const scale = Math.max(1, ...values.map((v) => Math.abs(Number(v))));
    return <div className="scene-scroll"><div className="scene-bars">{values.map((v, i) => { const height = Math.abs(Number(v)) / scale * 75; return <div className="scene-bar" key={i}><span className={Number(v) < 0 ? 'negative' : ''} style={{ height, top: Number(v) >= 0 ? 95 - height : 95 }} /><b>{show(v)}</b><small>{i}</small></div>; })}</div></div>;
  }
  const formatted = values.map((v, i) => ({ value: panel.source === 'queue' || panel.source === 'path' ? `(${Math.floor(Number(v) / context.frame.grid[0].length)},${Number(v) % context.frame.grid[0].length})` : show(v), i }));
  if (panel.kind === 'stack') formatted.reverse();
  return <><p className="scene-direction">{panel.kind === 'queue' ? '队首 → 队尾' : panel.kind === 'stack' ? '栈顶 ↓ 栈底' : panel.kind === 'path' ? '当前记录的路径顺序 →' : '运行时序列'}</p><div className={`scene-tokens ${panel.kind === 'stack' ? 'vertical' : ''}`}>{formatted.map(({ value, i }) => <div className="scene-token" key={`${i}:${value}`}><b>{value}</b>{panel.kind === 'sequence' && <small>{i}</small>}</div>)}{!values.length && <p className="scene-empty">空</p>}</div></>;
}
export default function DesignedScene({ spec, context, speed }: { spec: SceneSpec; context: SceneContext; speed: number }) {
  const previous = useRef(context.frame.step), reduced = useReducedMotion();
  const forward = context.frame.step === previous.current + 1;
  useLayoutEffect(() => { previous.current = context.frame.step; }, [context.frame.step]);
  return <div className={`designed-scene theme-${spec.theme} layout-${spec.layout} ${forward && !reduced ? 'animate-forward' : ''}`} style={{ '--support-rows': Math.max(1, spec.panels.length - 1) } as CSSProperties} data-testid="designed-scene" data-step={context.frame.step}>
    <header className="designed-heading"><span>AI PRESENTATION · 真实轨迹驱动</span><h3>当前执行状态</h3><p data-testid="current-scene-summary">{currentSceneSummary(spec, context)}</p><small>AI 选择布局，标题与状态摘要由播放器生成；下方步骤说明来自本次程序记录，不构成正确性证明。</small></header>
    <div className="designed-cue"><b>{context.frame.action}</b><p>{context.frame.explanation}</p></div>
    <div className="designed-panels">{spec.panels.map((panel, i) => <section className={`designed-panel ${i === 0 ? 'primary-panel' : ''}`} data-panel-id={panel.id} data-binding={panel.source} key={panel.id}><header><h4>{panelHeading(panel)}</h4><code>{panel.source}{panel.kind === 'graph' ? ` + ${panel.edges}` : ''}</code></header><Panel panel={panel} context={context} speed={speed} /></section>)}</div>
  </div>;
}
