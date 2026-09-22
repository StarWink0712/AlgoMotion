import { useState } from 'react';
import ArrayScene, { type SceneProps } from './ArrayScene';
import LinkedListScene from './LinkedListScene';
import { essentialView } from '../engine/presets/final-six';
import { FlowArrow, MovingGroup } from './motion';
import './essentials.css';

const bits = (value: number) => (value & 255).toString(2).padStart(8,'0');
export default function EssentialsScene(props: SceneProps) {
  const { frame, problem, reduced, duration } = props;
  const [navigation, setNavigation] = useState({ frame, forward: false });
  if (navigation.frame !== frame) setNavigation({ frame, forward: frame.step === navigation.frame.step + 1 });
  const forward = navigation.forward && !reduced;
  if (problem.id === 'find-the-duplicate-number') return <><LinkedListScene {...props} /><div className="essential-summary" data-testid="duplicate-phase"><span>{String(frame.variables.phase)}</span><code>{String(frame.variables.equation)}</code></div></>;
  const view = essentialView(frame);
  return <div className="essentials-scene">
    <ArrayScene {...props} reduced={!forward} />
    {view.kind === 'palindrome' ? <div className="essential-summary"><span>目前最长的连续回文</span><code data-testid="palindrome-best">{JSON.stringify(view.bestText)}</code><small>{view.best.length ? `下标 ${view.best[0]}..${view.best.at(-1)}` : '尚未选定非空区间'}</small></div> : <>
      {view.kind === 'xor' ? <div className="xor-panel">
        <div className="scene-topline"><span>8 位补码 · 同位相同得 0，不同得 1</span><span>累加器 {view.after}</span></div>
        {frame.location === 'init' ? <p>累加器为 0，尚未读取输入元素。</p> : <div className="scene-scroll" tabIndex={0} role="region" aria-label="逐位异或计算">
          <svg viewBox="0 0 610 220" style={{ width: 610, height: 220 }} className="algorithm-scene xor-board" role="img" aria-label="异或的旧值、当前元素和结果">
            {[view.before, view.operand, view.after].map((value, row) => <g key={row} data-testid="xor-row" data-value={value} data-bits={bits(value)}>
              <text x="16" y={38 + row * 75}>{['旧值','当前数','异或后'][row]}</text>
              {[...bits(value)].map((bit, i) => <g key={i} transform={`translate(${125 + i * 58},${33 + row * 75})`} className={`xor-bit bit-${bit}`}><rect x="-20" y="-18" width="40" height="36" rx="8" /><text textAnchor="middle" dy="5">{bit}</text></g>)}
            </g>)}
            {frame.location === 'xor' && [...bits(view.after)].map((_, i) => <FlowArrow key={i} path={`M ${125 + i * 58} 128 L ${125 + i * 58} 161`} animated={forward} motionKey={`${frame.step}-${i}`} duration={duration} />)}
          </svg>
        </div>}
      </div> : <div className="essential-summary"><span>当前候选 <b data-testid="vote-candidate">{view.candidate ?? '未定'}</b></span><span>未抵消票数 <b data-testid="vote-count">{view.count}</b></span><small>票数不是出现总次数，输入保证存在严格多数。</small></div>}
      <div className="essential-pending"><span>{view.kind === 'xor' ? '已读前缀中尚未成对的元素' : '当前候选尚未抵消的票'}</span><div className="scene-scroll" tabIndex={0} role="region" aria-label="剩余元素">
        <svg className="algorithm-scene pending-board" viewBox={`0 0 ${Math.max(250,view.pending.length * 90 + 32)} 82`} style={{ width: Math.max(250,view.pending.length * 90 + 32), height: 82 }}>
          {!view.pending.length && <text x="20" y="39">空</text>}
          {view.pending.map((id, i) => <MovingGroup key={id} identity={`pending-${id}`} x={56 + i * 90} y={32} step={frame.step} duration={duration} reduced={!forward} className="pending-token"><g data-testid="pending-token" data-index={id}><rect x="-35" y="-21" width="70" height="42" rx="10" /><text textAnchor="middle" dy="5">{frame.values[id]}</text><text textAnchor="middle" y="40" className="scene-index">#{id}</text></g></MovingGroup>)}
        </svg></div>
        {!!view.pair.length && <div className="essential-pair" data-testid="cancellation-pair"><code>{frame.values[view.pair[0]]}[{view.pair[0]}]</code><span>与</span><code>{frame.values[view.pair[1]]}[{view.pair[1]}]</code><span>本步抵消</span></div>}
      </div>
    </>}
  </div>;
}
