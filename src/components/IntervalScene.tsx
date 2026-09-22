import { useLayoutEffect, useRef } from 'react';
import { arrayTransformView } from '../engine/presets/array-transform';
import type { SceneProps } from './ArrayScene';
import { MovingGroup, FlowArrow, useStageWidth } from './motion';

function IntervalBar({ x, y, length, start, end, id, active, output, props }: {
  x: number; y: number; length: number; start: number; end: number; id: number; active: boolean; output: boolean; props: SceneProps;
}) {
  const rect = useRef<SVGRectElement>(null), previous = useRef({ length, step: props.frame.step });
  useLayoutEffect(() => {
    const before = previous.current; previous.current = { length, step: props.frame.step };
    if (props.reduced || props.frame.step !== before.step + 1 || before.length === length) return;
    const animation = rect.current?.animate([{ width: `${before.length}px` }, { width: `${length}px` }], { duration: props.duration, easing: 'cubic-bezier(.22,.7,.22,1)' });
    return () => animation?.cancel();
  }, [length, props.frame.step, props.duration, props.reduced]);
  return <MovingGroup identity={`${output ? 'merged' : 'interval'}-${id}`} x={x} y={y} step={props.frame.step} duration={props.duration} reduced={props.reduced} className={`interval-bar ${output ? 'is-output' : ''} ${active ? 'is-active' : ''}`}>
    <rect ref={rect} x={start === end ? -3 : 0} y="-9" width={length} height="18" rx="6" />
    {length < 70 ? <text x={length / 2} y="-16" textAnchor="middle">[{start}, {end}]</text> : <><text y="-16">{start}</text><text x={length} y="-16" textAnchor="end">{end}</text></>}
  </MovingGroup>;
}

export default function IntervalScene(props: SceneProps) {
  const { frame, duration, reduced } = props, view = arrayTransformView(frame);
  const items = view.items ?? [], merged = view.merged ?? [];
  const { ref, width: viewport } = useStageWidth(), width = Math.max(viewport, 420);
  const lo = Math.min(0, ...items.map((item) => item.start)), hi = Math.max(1, ...items.map((item) => item.end));
  const x = (value: number) => 80 + (value - lo) / (hi - lo) * (width - 140);
  const outputY = 150 + items.length * 46, height = outputY + Math.max(1, merged.length) * 50 + 25;
  const current = Number(frame.variables.i), target = Number(frame.variables.group);
  return <div className="motion-scene"><div className="scene-scroll" ref={ref} aria-label="可横向滚动的区间画布">
    {!items.length ? <div className="empty-data">∅<span>没有区间</span></div> : <svg className="algorithm-scene interval-scene" role="img" aria-label="合并区间的动态执行状态" viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
      <text x="14" y="22" className="interval-section-label">输入区间</text>
      <line className="interval-axis" x1="80" x2={width - 60} y1="45" y2="45" />
      {[...new Set([lo, Math.round((lo + hi) / 2), hi])].map((tick) => <text key={tick} x={x(tick)} y="38" textAnchor="middle" className="scene-index">{tick}</text>)}
      {items.map((item, i) => <g key={item.id} data-testid="input-interval" data-id={item.id} data-start={item.start} data-end={item.end}>
        <text x="14" y={94 + i * 46} className="scene-index">#{item.id}</text>
        <IntervalBar {...item} x={x(item.start)} y={90 + i * 46} length={item.start === item.end ? 6 : x(item.end) - x(item.start)} active={frame.active.includes(i)} output={false} props={props} />
      </g>)}
      <text x="14" y={outputY - 30} className="interval-section-label">{frame.result !== undefined ? '合并结果' : '正在合并'}</text>
      {merged.map((item, i) => <g key={item.id} data-testid="merged-interval" data-id={item.id} data-start={item.start} data-end={item.end} data-members={item.members.join(',')}>
        <IntervalBar {...item} x={x(item.start)} y={outputY + i * 50} length={item.start === item.end ? 6 : x(item.end) - x(item.start)} active={i === target} output props={props} />
      </g>)}
      {['append', 'merge'].includes(frame.location) && items[current] && merged[target] && <FlowArrow path={`M ${x(items[current].start) - 8} ${90 + current * 46} H 42 V ${outputY + target * 50} H ${x(merged[target].start) - 8}`} animated={!reduced} duration={duration} motionKey={`${frame.step}`} />}
    </svg>}
  </div></div>;
}
