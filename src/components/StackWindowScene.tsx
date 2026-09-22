import { useLayoutEffect, useRef, useState } from 'react';
import { stackWindowView, type StackEntry } from '../engine/presets/stack-window';
import type { SceneProps } from './ArrayScene';
import { FlowArrow, useStageWidth } from './motion';

function StackToken({ entry, x, y, origin, forward, props, leaving = false }: {
  entry: StackEntry; x: number; y: number; origin?: [number, number]; forward: boolean; props: SceneProps; leaving?: boolean;
}) {
  const ref = useRef<SVGGElement>(null), previous = useRef({ x, y });
  useLayoutEffect(() => {
    const from = origin ?? [previous.current.x, previous.current.y]; previous.current = { x, y };
    if (!forward || props.reduced || (from[0] === x && from[1] === y)) return;
    const animation = ref.current?.animate([
      { transform: `translate(${from[0]}px, ${from[1]}px)` },
      { transform: `translate(${x}px, ${y}px)` },
    ], { duration: props.duration, easing: 'cubic-bezier(.22,.7,.22,1)' });
    return () => animation?.cancel();
  }, [x, y, origin?.[0], origin?.[1], forward, props.reduced, props.duration, props.frame.step]);
  return <g ref={ref} style={{ transform: `translate(${x}px, ${y}px)` }} className={`sw-token ${leaving ? 'is-leaving' : ''}`} data-testid={leaving ? 'structure-transfer' : 'structure-entry'} data-id={entry.id} data-value={entry.value}>
    <title>{String(entry.value)}{entry.detail ? ` · ${entry.detail}` : ''}</title>
    <rect x="-32" y="-20" width="64" height="40" rx="9" />
    <text textAnchor="middle" y={entry.detail ? -2 : 5} className="sw-token-value">{entry.value}</text>
    {entry.detail && <text textAnchor="middle" y="12" className="sw-token-detail">{entry.detail.length > 9 ? `${entry.detail.slice(0, 8)}…` : entry.detail}</text>}
  </g>;
}

function WaterColumn({ x, bottom, height, amount, index, props }: { x: number; bottom: number; height: number; amount: number; index: number; props: SceneProps }) {
  const ref = useRef<SVGRectElement>(null), last = useRef({ height, step: props.frame.step });
  useLayoutEffect(() => {
    const before = last.current; last.current = { height, step: props.frame.step };
    if (props.reduced || props.frame.step !== before.step + 1 || height === before.height) return;
    const animation = ref.current?.animate([
      { y: `${bottom - before.height}px`, height: `${before.height}px` },
      { y: `${bottom - height}px`, height: `${height}px` },
    ], { duration: props.duration, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [height, bottom, props.frame.step, props.reduced, props.duration]);
  return <rect ref={ref} className="sw-water" x={x} y={bottom - height} width="46" height={height} data-testid="water-column" data-index={index} data-amount={amount} />;
}

export default function StackWindowScene(props: SceneProps) {
  const { frame, problem, reduced, duration } = props, view = stackWindowView(frame);
  const { ref, width: viewport } = useStageWidth();
  const sourceScroll = useRef<HTMLDivElement>(null);
  // Track actual navigation, not the algorithmic predecessor passed for narration.
  const [navigation, setNavigation] = useState({ step: frame.step, forward: false });
  if (navigation.step !== frame.step) setNavigation({ step: frame.step, forward: frame.step === navigation.step + 1 });
  const forward = navigation.forward && !reduced;
  const bars = problem.id === 'trapping-rain-water' || problem.id === 'largest-rectangle-in-histogram';
  const pitch = problem.id === 'min-stack' ? 60 : 46, n = frame.values.length;
  const sourceWidth = Math.max(viewport, (n + 1) * pitch + 30), x = (i: number) => 34 + i * pitch;
  const scale = 128 / Math.max(1, ...frame.values.map((value) => typeof value === 'number' ? value : 0));
  const base = bars ? 185 : 101, sourceHeight = base + 72;
  const current = frame.pointers.i ?? frame.pointers.right;
  useLayoutEffect(() => {
    if (typeof current !== 'number' || !sourceScroll.current) return;
    const scroller = sourceScroll.current, target = 34 + current * pitch;
    if (target < scroller.scrollLeft + 30 || target > scroller.scrollLeft + viewport - 30) scroller.scrollLeft = Math.max(0, target - viewport / 2);
  }, [current, frame.step, pitch, viewport]);
  const cols = Math.max(2, Math.floor((viewport - 24) / 80));
  const slot = (i: number): [number, number] => [48 + (i % cols) * 80, 106 + Math.floor(i / cols) * 67];
  const dock: [number, number] = [viewport / 2, 31];
  const transfer = view.transfer, transferSlot = transfer ? slot(transfer.slot) : undefined;
  const rows = Math.max(1, Math.ceil((view.entries.length + (transfer?.direction === 'pop' ? 1 : 0)) / cols));
  const range = frame.window, bestRange = view.bestRange;
  const showOutput = view.output.length > 0 || ['daily-temperatures', 'min-stack', 'sliding-window-maximum', 'find-all-anagrams-in-a-string'].includes(problem.id);
  return <div className="motion-scene sw-scene" ref={ref}>
    <div className="scene-topline"><span>{bars ? '柱宽 = 1' : problem.id === 'min-stack' ? '操作序列' : '输入与当前位置'}</span><span>{n} 项</span></div>
    <div className="scene-scroll" ref={sourceScroll} role="region" tabIndex={0} aria-label="可横向滚动的输入画布">
      <svg className="algorithm-scene sw-source" role="img" aria-label={`${problem.title}输入状态`} viewBox={`0 0 ${sourceWidth} ${sourceHeight}`} style={{ width: sourceWidth, height: sourceHeight }}>
        {!n && <text x="28" y="75" className="sw-empty">空输入</text>}
        {range && range[0] <= range[1] && <g data-testid="sw-window" data-start={range[0]} data-end={range[1]} className="sw-window">
          <rect x={x(range[0]) - 23} y={bars ? 39 : 67} width={(range[1] - range[0] + 1) * pitch} height={bars ? 151 : 39} rx="7" />
          <text x={x(range[0]) - 18} y={bars ? 29 : 57}>[{range[0]}, {range[1]}]</text>
        </g>}
        {frame.values.map((value, i) => <g key={i} data-testid="sw-source-item" data-index={i} data-value={value} className={`sw-source-item ${frame.active.includes(i) ? 'is-active' : ''} ${frame.settled.includes(i) ? 'is-settled' : ''}`}>
          {bars ? <>
            <rect x={x(i) - 22} y={base - Number(value) * scale} width="44" height={Number(value) * scale} rx="2" />
            {view.water && <WaterColumn x={x(i) - 23} bottom={base - Number(value) * scale} height={view.water[i] * scale} amount={view.water[i]} index={i} props={props} />}
            <text x={x(i)} y={base + 15} textAnchor="middle" className="sw-value">{value}</text>
          </> : <>
            <rect x={x(i) - (pitch - 6) / 2} y="70" width={pitch - 6} height="32" rx="7" />
            <text x={x(i)} y="91" textAnchor="middle" className="sw-value">{value}</text>
          </>}
          <text x={x(i)} y={base + 33} textAnchor="middle" className="scene-index">{i}</text>
        </g>)}
        {view.rectangle && <g className="sw-area" data-testid="histogram-rectangle" data-left={view.rectangle.left} data-right={view.rectangle.right} data-height={view.rectangle.height} data-area={view.rectangle.area}>
          <rect x={x(view.rectangle.left) - 23} y={base - view.rectangle.height * scale} width={(view.rectangle.right - view.rectangle.left + 1) * pitch} height={view.rectangle.height * scale} />
          <text x={x(view.rectangle.left)} y="19">{frame.result !== undefined ? '最佳矩形' : frame.location === 'measure' ? '本次结算' : '上次结算'} · 面积 {view.rectangle.area}</text>
        </g>}
        {view.relation && <FlowArrow path={`M ${x(view.relation.from)} 54 Q ${(x(view.relation.from) + x(view.relation.to)) / 2} -10 ${x(view.relation.to)} 54`} label={view.relation.label} x={(x(view.relation.from) + x(view.relation.to)) / 2} y={18} animated={forward} duration={duration} motionKey={String(frame.step)} />}
        {bestRange && <g className="sw-best" data-testid="sw-best-range" data-start={bestRange[0]} data-end={bestRange[1]}>
          <line x1={x(bestRange[0]) - 20} x2={x(bestRange[1]) + 20} y1={base + 46} y2={base + 46} />
          <text x={x(bestRange[0]) - 20} y={base + 62}>当前最好</text>
        </g>}
        {typeof current === 'number' && <g className="sw-cursor" transform={`translate(${x(current)}, ${base + 38})`}><path d="M -4 5 L 0 0 L 4 5" />{current === n && <text y="18" textAnchor="middle">末尾</text>}</g>}
      </svg>
    </div>
    {view.structure === 'frequency' ? <div className="sw-frequency" aria-label="目标字符频次">
      {view.frequencies?.length ? view.frequencies.map(({ char, have, need }) => <div key={char} data-testid="frequency-entry" data-char={char} data-have={have} data-need={need} className={have >= need ? 'is-covered' : ''}>
        <code>{char}</code><span>{have} / {need}</span><div className="sw-frequency-track"><i style={{ width: `${Math.min(1, have / need) * 100}%`, transitionDuration: forward ? `${duration}ms` : '0ms' }} /></div>
      </div>) : <span className="sw-empty">目标为空</span>}
      <p>窗口内次数 / 目标次数</p>
    </div> : <div className="sw-structure">
      <div className="scene-topline"><span>{view.structure === 'deque' ? '候选队列 · 左为队首，右为队尾' : '栈 · 从左到右、从上到下，末项为栈顶'}</span><span>{view.entries.length} 项</span></div>
      <svg className="algorithm-scene sw-rack" role="img" aria-label={view.structure === 'deque' ? '单调队列状态' : '栈状态'} viewBox={`0 0 ${viewport} ${100 + rows * 67}`} style={{ width: viewport, height: 100 + rows * 67 }}>
        {transferSlot && <FlowArrow path={transfer?.direction === 'push' ? `M ${dock[0]} ${dock[1] + 22} C ${dock[0]} 73 ${transferSlot[0]} 70 ${transferSlot[0]} ${transferSlot[1] - 24}` : `M ${transferSlot[0]} ${transferSlot[1] - 24} C ${transferSlot[0]} 70 ${dock[0]} 73 ${dock[0]} ${dock[1] + 22}`} animated={forward} duration={duration} motionKey={`structure-${frame.step}`} />}
        {transfer && <text x="10" y="35" className="sw-transfer-label">{transfer.direction === 'push' ? '入栈 / 入队' : transfer.direction === 'pop' ? '已移出' : '读取，不移出'}</text>}
        {transfer?.direction === 'pop' ? <StackToken key={`out-${transfer.entry.id}-${frame.step}`} entry={transfer.entry} x={dock[0]} y={dock[1]} origin={transferSlot} forward={forward} props={props} leaving /> : transfer && <text x={dock[0]} y={dock[1] + 4} textAnchor="middle" className="sw-dock-value">{transfer.entry.value}</text>}
        {!view.entries.length && <text x="28" y="110" className="sw-empty">{view.structure === 'deque' ? '空队列' : '空栈'}</text>}
        {view.entries.map((entry, i) => {
          const [sx, sy] = slot(i), entering = transfer?.direction === 'push' && transfer.entry.id === entry.id;
          return <g key={entry.id}>
            <StackToken entry={entry} x={sx} y={sy} origin={entering ? dock : undefined} forward={forward} props={props} />
            <text x={sx} y={sy + 33} textAnchor="middle" className="scene-index">{view.structure === 'deque' && i === 0 ? '队首' : i === view.entries.length - 1 ? view.structure === 'deque' ? '队尾' : '栈顶' : i}</text>
          </g>;
        })}
      </svg>
    </div>}
    {showOutput && <div className="sw-output"><span>{view.outputLabel}</span><div>{view.output.map((value, i) => <code key={i} data-testid="partial-output" data-index={i} data-value={JSON.stringify(value)}>{value === null ? problem.id === 'daily-temperatures' ? '·' : 'null' : value}</code>)}{!view.output.length && <span className="sw-empty">尚无结果</span>}</div></div>}
    {(problem.id === 'decode-string' || problem.id === 'minimum-window-substring') && <div className="sw-text"><span>{problem.id === 'decode-string' ? '当前层的片段' : '目前找到的最短覆盖'}</span><code data-testid="decoded-text">{view.text ?? ''}</code></div>}
  </div>;
}
