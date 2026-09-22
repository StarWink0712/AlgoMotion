import { useLayoutEffect, useRef } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import type { Frame, Problem } from '../engine/types';
import type { TeachingCue } from '../engine/presentation';
import { FlowArrow, MovingGroup, useStageWidth } from './motion';

export interface SceneProps {
  frame: Frame;
  previous?: Frame;
  problem: Problem;
  cue: TeachingCue;
  duration: number;
  reduced: boolean;
}

function Pointer({ name, x, y, frame, duration, reduced, source = false }: {
  name: string; x: number; y: number; frame: Frame; duration: number; reduced: boolean; source?: boolean;
}) {
  return <MovingGroup x={x} y={y} step={frame.step} duration={duration} reduced={reduced} className={`scene-pointer ${source ? 'source-pointer' : ''}`}>
    <path d="M -4 -12 L 0 -17 L 4 -12" /><rect x="-24" y="-10" width="48" height="21" rx="7" /><text textAnchor="middle" dy="4">{name}</text>
  </MovingGroup>;
}

function RangeBand({ x, width, start, end, step, label, blocked, duration, reduced }: {
  x: number; width: number; start: number; end: number; step: number; label: string; blocked: boolean; duration: number; reduced: boolean;
}) {
  const group = useRef<SVGGElement>(null), rect = useRef<SVGRectElement>(null);
  const last = useRef({ x, width, step });
  useLayoutEffect(() => {
    const before = last.current; last.current = { x, width, step };
    if (reduced || step !== before.step + 1 || (x === before.x && width === before.width)) return;
    const options = { duration, easing: 'cubic-bezier(.22,.7,.22,1)' };
    const move = group.current?.animate([{ transform: `translate(${before.x}px, 76px)` }, { transform: `translate(${x}px, 76px)` }], options);
    const resize = rect.current?.animate([{ width: `${before.width}px` }, { width: `${width}px` }], options);
    return () => { move?.cancel(); resize?.cancel(); };
  }, [x, width, step, duration, reduced]);
  return <g ref={group} className={`window-bracket snapshot-range ${blocked ? 'is-blocked' : ''}`} style={{ transform: `translate(${x}px, 76px)` }} data-testid="array-range" data-start={start} data-end={end}>
    <rect ref={rect} width={width} height="64" rx="13" /><text x="7" y="-9">{label}</text>
  </g>;
}

export default function ArrayScene({ frame, previous, problem, cue, duration, reduced }: SceneProps) {
  const { ref, width: viewport } = useStageWidth();
  const n = frame.values.length;
  const lis = problem.id === 'longest-increasing-subsequence';
  const consecutive = problem.id === 'longest-consecutive-sequence';
  const chain = lis || consecutive;
  const stairs = problem.id === 'climbing-stairs';
  const bars = problem.renderer === 'bars';
  const dp = problem.renderer === 'dp';
  const search = problem.category === '二分查找';
  const greedy = problem.category === '贪心';
  const endSlot = search && !['search-in-rotated-sorted-array', 'find-minimum-in-rotated-sorted-array'].includes(problem.id) ? 1 : 0;
  const pitch = bars ? 48 : stairs ? 62 : 66;
  const width = Math.max(viewport, (n + endSlot) * pitch + 40);
  const first = (width - (n - 1 + endSlot) * pitch) / 2;
  const x = (i: number) => first + i * pitch;
  const unit = Math.min(16, 144 / Math.max(n, 1));
  const base = lis ? 220 + Math.max(4, n) * unit : 286;
  const height = lis ? base + 44 : dp ? 325 : bars ? 345 : search || cue.animateElements ? 275 : greedy || consecutive ? 250 : 223;
  const done = frame.result !== undefined;
  const focus = cue.relation?.to ?? frame.pointers.mid ?? frame.pointers.pos ?? frame.pointers.i ?? frame.pointers.a ?? frame.pointers.read ?? frame.pointers.right;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof focus !== 'number') return;
    const target = x(focus);
    if (target < element.scrollLeft + 40 || target > element.scrollLeft + viewport - 40) element.scrollLeft = Math.max(0, target - viewport / 2);
  }, [focus, frame.step, viewport, width]);
  const barMax = Math.max(1, ...frame.values.map(Number));
  const waterPair = done && bars ? frame.bestPath : [frame.pointers.left, frame.pointers.right];
  const left = waterPair?.[0] ?? 0, right = waterPair?.[1] ?? Math.max(0, n - 1);
  const waterHeight = bars ? Math.min(Number(frame.values[left]), Number(frame.values[right])) / barMax * 185 : 0;
  const stairTop = (i: number) => 282 - (i + 1) / Math.max(n, 1) * 155;
  const pointerNames = Object.entries(frame.pointers).filter(([, i]) => i !== null && i >= 0 && i < n + endSlot);
  const resultPath = done ? frame.bestPath ?? frame.settled : frame.path ?? [];
  const window = !bars ? frame.window : undefined;

  return <div className="motion-scene">
    <div className="scene-topline"><span>{cue.sceneLabel ?? (search ? '比较中点，逐步缩小区间' : problem.id === 'jump-game' ? '从可达位置，向右扩展边界' : problem.id === 'best-time-to-buy-and-sell-stock' ? '记住低点，寻找更好的卖出日' : lis ? '把较短的链，接长一格' : stairs ? '走法沿台阶汇合' : bars ? '短边定水位，两端定宽度' : dp ? '从已知状态走向未知状态' : '跟着指针，看数据流动')}</span><span>{n} {stairs ? '个状态' : '个元素'}</span></div>
    {!n ? <div className="empty-data">∅<span>没有元素，直接返回边界结果</span></div> : <div className="scene-scroll" ref={ref} aria-label="可横向滚动的算法画布">
      <svg className="algorithm-scene" role="img" aria-label={`${problem.title}的动态执行状态`} viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
        {window && window[1] >= window[0] && (search || greedy || cue.animateElements ? <RangeBand x={x(window[0]) - 31} width={(window[1] - window[0]) * pitch + 62} start={window[0]} end={window[1]} step={frame.step} label={cue.rangeLabel ?? '当前窗口'} blocked={cue.tone === 'blocked'} duration={duration} reduced={reduced} /> : <g data-testid="array-range" data-start={window[0]} data-end={window[1]} className={`window-bracket ${cue.tone === 'blocked' ? 'is-blocked' : ''}`} style={{ transform: `translate(${x(window[0]) - 31}px, 76px)` }}>
          <rect width={(window[1] - window[0]) * pitch + 62} height="64" rx="13" /><text x="7" y="-9">{cue.rangeLabel ?? '当前窗口'}</text>
        </g>)}

        {endSlot > 0 && <g className="array-end-slot" data-testid="array-end-slot" transform={`translate(${x(n)}, 110)`}><path d="M 0 -24 V 24" /><text textAnchor="middle" y="47">{n}</text><text textAnchor="middle" y="-36">末尾边界</text></g>}
        {cue.bands?.map((band) => <g key={band.tone} className={`color-band band-${band.tone}`} data-testid="color-band" data-start={band.start} data-end={band.end}>
          <rect x={x(band.start) - 27} y="34" width={(band.end - band.start) * pitch + 54} height="5" rx="2" />
          <text x={(x(band.start) + x(band.end)) / 2} y="27" textAnchor="middle">{band.label}</text>
        </g>)}

        {bars && <g className="water-container" data-testid="water-container" data-area={Math.min(Number(frame.values[left]), Number(frame.values[right])) * (right - left)}>
          <rect className="water-fill" x={x(left)} y={base - waterHeight} width={Math.max(0, x(right) - x(left))} height={waterHeight} />
          <line className="water-surface" x1={x(left)} x2={x(right)} y1={base - waterHeight} y2={base - waterHeight} />
          <line className="width-guide" x1={x(left)} x2={x(right)} y1={base + 43} y2={base + 43} /><text x={(x(left) + x(right)) / 2} y={base + 57} className="measure-label" textAnchor="middle">宽度 {right - left}</text>
        </g>}

        {frame.values.map((value, i) => {
          const target = cue.relation?.to === i || (!cue.relation && frame.active.includes(i));
          const source = cue.relation?.from.includes(i);
          const chosen = done && resultPath.includes(i);
          const classes = `scene-tile ${target ? 'is-target' : ''} ${source ? 'is-source' : ''} ${chosen ? 'is-chosen' : ''} ${frame.settled.includes(i) ? 'is-processed' : ''} ${cue.relation && !target && !source ? 'is-background' : ''} ${cue.outside?.includes(i) ? 'is-outside' : ''}`;
          const changed = previous?.dp && frame.dp && previous.dp[i] !== frame.dp[i];
          if (bars) return <g key={i} className={`bar-node ${i === left || i === right ? 'is-boundary' : ''}`}>
            <rect x={x(i) - 9} y={base - Number(value) / barMax * 185} width="18" height={Math.max(2, Number(value) / barMax * 185)} rx="4" />
            <text x={x(i)} y={base - Number(value) / barMax * 185 - 10} textAnchor="middle" className="bar-value">{value}</text><text x={x(i)} y={base + 19} textAnchor="middle" className="scene-index">{i}</text>
          </g>;
          if (stairs) return <g key={i} className={`stair ${target ? 'is-target' : ''} ${source ? 'is-source' : ''} ${frame.settled.includes(i) ? 'is-processed' : ''}`}>
            <rect x={x(i) - 29} y={stairTop(i)} width="58" height={282 - stairTop(i)} rx="5" />
            <text x={x(i)} y={282 - stairTop(i) < 26 ? stairTop(i) - 8 : stairTop(i) + 24} textAnchor="middle" className={`stair-ways ${changed ? 'state-pop' : ''}`} key={`${i}-${frame.dp?.[i]}`}>{frame.dp?.[i]}</text>
            <text x={x(i)} y="304" textAnchor="middle" className="scene-index">第 {i} 阶</text>
          </g>;
          return <g key={frame.elementIds?.[i] ?? i}>
            <MovingGroup identity={String(frame.elementIds?.[i] ?? i)} x={x(i)} y={110} step={frame.step} duration={duration} reduced={reduced} arc={problem.id === 'move-zeroes' || cue.animateElements} className={`${classes} ${problem.id === 'sort-colors' ? `color-value-${value}` : ''}`}>
              <rect x="-26" y="-26" width="52" height="52" rx="12" /><text className="scene-value" style={String(value).length > 4 ? { fontSize: 13 } : undefined} textAnchor="middle" dy="7">{value === ' ' ? '␣' : value}</text>
            </MovingGroup>
            <text x={x(i)} y="157" textAnchor="middle" className="scene-index">{i}</text>
            {lis && <g className={`dp-tower ${source ? 'is-source' : ''} ${target ? 'is-target' : ''} ${chosen ? 'is-chosen' : ''}`} data-testid="dp-tower" data-length={frame.dp?.[i]}>
              {Array.from({ length: Number(frame.dp?.[i] ?? 1) }, (_, level) => <rect key={level} x={x(i) - 20} y={base - (level + 1) * unit} width="40" height={unit - 3} rx="3" className={changed && level === Number(frame.dp?.[i]) - 1 ? 'brick-arrival' : ''} />)}
              <text key={`${i}-${frame.dp?.[i]}`} className={changed ? 'state-pop' : ''} x={x(i)} y={base + 22} textAnchor="middle">dp = {frame.dp?.[i]}</text>
            </g>}
            {dp && !lis && <g transform={`translate(${x(i)}, 266)`} className={`dp-register ${target ? 'is-target' : ''} ${source ? 'is-source' : ''}`}>
              <path d="M 0 -65 L 0 -32" /><rect x="-25" y="-25" width="50" height="50" rx="11" /><text key={`${i}-${frame.dp?.[i]}`} className={changed ? 'state-pop' : ''} textAnchor="middle" dy="6">{frame.dp?.[i]}</text>
            </g>}
          </g>;
        })}

        {bars && right > left && <g transform={`translate(${(x(left) + x(right)) / 2}, ${Math.max(104, base - waterHeight / 2)})`}><rect x="-34" y="-20" width="68" height="40" rx="12" className="water-area-label" /><text textAnchor="middle" dy="6" className="water-area-value">{Math.min(Number(frame.values[left]), Number(frame.values[right])) * (right - left)}</text></g>}

        {chain && done && frame.bestPath?.slice(1).map((to, i) => {
          const from = frame.bestPath![i];
          return <FlowArrow key={`${from}-${to}`} path={`M ${x(from)} 82 Q ${(x(from) + x(to)) / 2} 34 ${x(to)} 82`} animated={!reduced} duration={duration} motionKey={`result-${frame.step}-${i}`} />;
        })}

        {cue.relation?.from.map((from, index) => {
          const to = cue.relation!.to;
          const transfer = dp && !stairs && frame.location === 'transition';
          const sy = stairs ? stairTop(from) - 6 : transfer ? lis ? base - Number(frame.dp![from]) * unit - 5 : 238 : 80;
          const ty = stairs ? stairTop(to) - 6 : transfer ? lis ? base - Number(frame.dp![to]) * unit - 5 : 238 : 80;
          const cy = stairs ? Math.min(sy, ty) - 65 - index * 12 : transfer ? 199 : 18;
          return <FlowArrow key={`${from}-${to}`} path={`M ${x(from)} ${sy} Q ${(x(from) + x(to)) / 2} ${cy} ${x(to)} ${ty}`} x={(x(from) + x(to)) / 2 + (stairs ? index === 0 ? -12 : 12 : 0)} y={(sy + 2 * cy + ty) / 4 - 8 + (stairs ? index === 0 ? -28 : 14 : 0)} label={cue.relation!.labels[index]} blocked={!cue.relation!.allowed} animated={!reduced && (!greedy || previous?.step === frame.step - 1)} duration={duration} motionKey={`${frame.step}-${from}-${to}`} />;
        })}

        {stairs && typeof frame.pointers.i === 'number' && <MovingGroup x={x(frame.pointers.i)} y={stairTop(frame.pointers.i) - 26} step={frame.step} duration={duration} reduced={reduced} arc className="stair-traveler"><circle r="9" cy="-8" /><path d="M 0 1 V 12 M -9 5 L 0 1 L 9 5 M 0 12 L -7 20 M 0 12 L 7 20" /></MovingGroup>}

        {!stairs && (bars ? [['L', left], ['R', right]] as [string, number][] : pointerNames as [string, number][]).map(([name, i], p) => {
          const same = pointerNames.filter(([, index]) => index === i).length > 1;
          return <Pointer key={name} name={bars && done ? `最佳 ${name}` : name} x={x(i)} y={bars ? 48 + p * 25 : 181 + (same ? p * 24 : 0)} frame={frame} duration={duration} reduced={reduced} source={['j', 'from', 'write', 'L'].includes(name)} />;
        })}
      </svg>
    </div>}
    {width > viewport + 1 && n > 0 && <div className="scene-scroll-hint">左右滑动画布查看完整数据 <ChevronRight size={12} /></div>}
    {chain && <div className="sequence-panel" data-testid="sequence-panel"><div><span>{consecutive ? done ? '一条最长连续链' : '当前连续链' : done ? '一条最优递增链' : '以当前元素结尾的链'}</span><b>{done ? shownResult(frame.result) : frame.path?.length ?? 0} <small>个元素</small></b></div><div className="sequence-chain">
      {frame.path?.length ? frame.path.map((index, i) => <span className="sequence-piece" key={index}>{i > 0 && <ArrowRight size={13} />}<span className="sequence-chip"><b>{frame.values[index]}</b><small>{consecutive ? '集合 ' : ''}#{index}</small></span></span>) : <span className="sequence-empty">{consecutive ? '从没有前驱的数字开始。' : '先选择一个数，再试着接上更大的数。'}</span>}
    </div><p>{consecutive ? '相邻数值差 1，不要求在原数组中相邻。' : done ? '下标递增，数值严格递增；这只是可能的最优链之一。' : '积木高度表示 dp 长度；比较时，下方保留已经找到的当前链。'}</p></div>}
    {dp && !lis && !stairs && <div className="scene-caption">上排：金额；下排：最少硬币数。<span>∞ = 不可达</span></div>}
  </div>;
}

const shownResult = (value: unknown) => typeof value === 'number' ? value : 0;
