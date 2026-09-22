import { useLayoutEffect } from 'react';
import { arrayHashView } from '../engine/presets/array-hash';
import type { Scalar } from '../engine/types';
import type { SceneProps } from './ArrayScene';
import { FlowArrow, MovingGroup, useStageWidth } from './motion';

function Tile({ value, x, y, index, props, active = false, settled = false, width = 60, identity }: {
  value: Scalar; x: number; y: number; index?: number; props: SceneProps; active?: boolean; settled?: boolean; width?: number; identity: string;
}) {
  const label = value === null ? '·' : value === '' ? '""' : String(value);
  return <g data-focus={active} data-x={x}>
    <MovingGroup x={x} y={y} step={props.frame.step} duration={props.duration} reduced={props.reduced} identity={identity} arc className={`scene-tile ${active ? 'is-target' : ''} ${settled ? 'is-processed' : ''}`}>
      <rect x={-width / 2} y="-22" width={width} height="44" rx="10" />
      <text className="scene-value" style={{ fontSize: label.length > 5 ? 11 : 16 }} textAnchor="middle" dy="6">{label}</text>
    </MovingGroup>
    {index !== undefined && <text className="scene-index" x={x} y={y + 38} textAnchor="middle">{index}</text>}
  </g>;
}

function Buckets({ props, width }: { props: SceneProps; width: number }) {
  const { frame, duration, reduced } = props, groups = arrayHashView(frame).groups ?? [];
  const height = Math.max(220, 202 + groups.length * 72);
  const positions = new Map<number, { x: number; y: number }>();
  groups.forEach((group, row) => group.indices.forEach((index, col) => positions.set(index, { x: 210 + col * 92, y: 190 + row * 72 })));
  const current = frame.active[0], destination = positions.get(current);
  return <svg className="algorithm-scene array-hash-scene" role="img" aria-label="字母异位词分组的动态执行状态" viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
    <text x="14" y="23" className="hash-track-label">待分组单词</text>
    {frame.values.map((_, i) => <rect key={i} className="bucket-slot" x={34 + i * 92} y="46" width="72" height="44" rx="10" />)}
    {groups.map((group, row) => <g key={group.key} data-testid="anagram-bucket" data-key={group.key}>
      <rect className="bucket-lane" x="14" y={160 + row * 72} width={width - 28} height="60" rx="14" />
      <text x="28" y={186 + row * 72} className="bucket-key">{group.key || '空字符串'}</text>
      <text x="28" y={206 + row * 72} className="scene-index">{group.indices.length} 个单词</text>
    </g>)}
    {frame.location === 'assign' && destination && <FlowArrow path={`M ${70 + current * 92} 94 Q ${destination.x} 110 ${destination.x} ${destination.y - 25}`} animated={!reduced} duration={duration} motionKey={`${frame.step}`} />}
    {frame.values.map((word, i) => {
      const position = positions.get(i) ?? { x: 70 + i * 92, y: 68 };
      return <Tile key={i} value={word} {...position} index={i} identity={`word-${i}`} props={props} width={72} active={frame.active.includes(i)} settled={positions.has(i)} />;
    })}
  </svg>;
}

function Products({ props, width }: { props: SceneProps; width: number }) {
  const { frame, duration, reduced } = props, view = arrayHashView(frame), n = frame.values.length;
  const x = (i: number) => (width - (n - 1) * 84) / 2 + i * 84;
  const rows = [
    { id: 'input', title: '输入', y: 65, values: frame.values },
    { id: 'prefix', title: '左侧乘积', y: 163, values: view.prefix ?? [] },
    { id: 'suffix', title: '右侧乘积', y: 261, values: view.suffix ?? [] },
    { id: 'output', title: frame.result !== undefined ? '最终输出' : '工作数组', y: 359, values: frame.dp ?? [] },
  ];
  const i = frame.pointers.i;
  return <svg className="algorithm-scene array-hash-scene" role="img" aria-label="除自身以外数组的乘积的动态执行状态" viewBox={`0 0 ${width} 410`} style={{ width, height: 410 }}>
    {rows.map((row) => <g key={row.id} data-testid={`product-${row.id}`}>
      <text x="14" y={row.y - 31} className="hash-track-label">{row.title}</text>
      {row.values.map((value, index) => <Tile key={index} value={value} x={x(index)} y={row.y} index={row.id === 'input' ? index : undefined} identity={`${row.id}-${index}`} props={props} active={index === i} settled={row.id === 'output' && frame.settled.includes(index)} />)}
    </g>)}
    {frame.location === 'write-left' && typeof i === 'number' && i > 0 && <FlowArrow path={`M ${x(i - 1)} 139 Q ${(x(i - 1) + x(i)) / 2} 96 ${x(i)} 139`} animated={!reduced} motionKey={`${frame.step}-prefix`} duration={duration} />}
    {frame.location === 'combine' && typeof i === 'number' && <g data-testid="product-merge">
      <FlowArrow path={`M ${x(i) - 20} 186 Q ${x(i) - 54} 273 ${x(i) - 14} 334`} animated={!reduced} motionKey={`${frame.step}-left`} duration={duration} />
      <FlowArrow path={`M ${x(i) + 14} 284 Q ${x(i) + 40} 307 ${x(i) + 14} 334`} animated={!reduced} motionKey={`${frame.step}-right`} duration={duration} />
    </g>}
  </svg>;
}

function PrefixSums({ props, width }: { props: SceneProps; width: number }) {
  const { frame, duration, reduced } = props, view = arrayHashView(frame), n = frame.values.length;
  const prefix = view.prefix ?? [], matches = view.matches ?? [], end = Number(frame.variables.i) + 1;
  const x = (i: number) => (width - n * 74) / 2 + i * 74;
  const height = Math.max(250, 246 + matches.length * 32);
  return <>
    <svg className="algorithm-scene array-hash-scene" role="img" aria-label="和为 K 的子数组的动态执行状态" viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
      <text x="14" y="24" className="hash-track-label">输入</text>
      {frame.values.map((value, i) => <Tile key={i} value={value} x={x(i + .5)} y={66} index={i} identity={`value-${i}`} props={props} active={frame.active.includes(i)} />)}
      <text x="14" y="140" className="hash-track-label">前缀和 P</text>
      {Array.from({ length: n + 1 }, (_, i) => <g key={i} data-testid="prefix-node" data-prefix-index={i} data-value={prefix[i] ?? 'unknown'}>
        <Tile value={prefix[i] ?? null} x={x(i)} y={174} identity={`prefix-${i}`} props={props} active={i === end && frame.active.length > 0} settled={matches.includes(i)} />
        <text className="scene-index" x={x(i)} y="211" textAnchor="middle">P[{i}]</text>
      </g>)}
      {matches.map((start, row) => {
        const y = 248 + row * 32;
        return <g key={start} data-testid="prefix-match" data-start={start} data-end={end - 1}>
          <FlowArrow path={`M ${x(start)} ${y} H ${x(end)}`} animated={!reduced} motionKey={`${frame.step}-${start}`} duration={duration} />
          <text x={(x(start) + x(end)) / 2} y={y - 7} textAnchor="middle" className="prefix-match-label">[{start}, {end - 1}] · 和 {frame.variables.k as number}</text>
        </g>;
      })}
    </svg>
  </>;
}

export default function ArrayHashScene(props: SceneProps) {
  const { frame, problem } = props, { ref, width: viewport } = useStageWidth();
  const width = Math.max(viewport, problem.id === 'group-anagrams' ? frame.values.length * 92 + 200 : problem.id === 'subarray-sum-equals-k' ? frame.values.length * 74 + 100 : frame.values.length * 84 + 80);
  useLayoutEffect(() => {
    const element = ref.current;
    const target = element?.querySelector('[data-focus="true"]')?.getAttribute('data-x');
    if (!element || target === null || target === undefined) return;
    const x = Number(target);
    if (x < element.scrollLeft + 45 || x > element.scrollLeft + viewport - 45) element.scrollLeft = Math.max(0, x - viewport / 2);
  }, [frame.step, viewport, width]);
  return <div className="motion-scene">
    <div className="scene-scroll" ref={ref} aria-label="可横向滚动的算法画布">
      {!frame.values.length ? <div className="empty-data">∅<span>空输入</span></div> : problem.id === 'group-anagrams' ? <Buckets props={props} width={width} /> : problem.id === 'product-of-array-except-self' ? <Products props={props} width={width} /> : <PrefixSums props={props} width={width} />}
    </div>
    {problem.id === 'subarray-sum-equals-k' && <div className="hash-panel"><div className="hash-title">前缀和 → 出现次数</div><div className="hash-entries">
      {frame.table?.map(([sum, count]) => <div key={sum} className={`hash-entry ${frame.variables.need !== undefined && sum === String(frame.variables.need) ? 'hash-hit' : ''}`} data-testid="prefix-frequency" data-sum={sum} data-count={count}><code>{sum}</code><span>→</span><code>{count}</code></div>)}
    </div></div>}
  </div>;
}
