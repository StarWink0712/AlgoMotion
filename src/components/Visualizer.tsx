import { ArrowRight, Braces, Check, Database, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Frame, Problem } from '../engine/types';
import { describeFrame } from '../engine/presentation';
import ArrayScene from './ArrayScene';
import ArrayHashScene from './ArrayHashScene';
import IntervalScene from './IntervalScene';
import StackWindowScene from './StackWindowScene';
import LinkedListScene from './LinkedListScene';
import TreeScene from './TreeScene';
import SearchCacheScene from './SearchCacheScene';
import ExplorationScene from './ExplorationScene';
import OrderingScene from './OrderingScene';
import StructuresScene from './StructuresScene';
import StateDPScene from './StateDPScene';
import EssentialsScene from './EssentialsScene';
import { arrayTransformView } from '../engine/presets/array-transform';
import GraphScene from './GraphScene';
import { useReducedMotion } from './motion';

const display = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value);

export default function Visualizer({ frame, previous, problem, speed }: { frame: Frame; previous?: Frame; problem: Problem; speed: number }) {
  const reduced = useReducedMotion();
  const duration = 700 / speed;
  const cue = describeFrame(problem.id, frame, previous);
  const props = { frame, previous, problem, cue, duration, reduced };
  const oldKeys = new Set(previous?.table?.map(([key]) => key));
  const need = Number(frame.variables.target) - Number(frame.values[frame.pointers.i ?? -1]);
  const lookup = problem.id === 'two-sum' && frame.location === 'lookup';
  const record = frame.location === 'record';
  return <>
    <div className={`visual-canvas vivid-canvas ${reduced ? 'reduced-motion' : ''}`} data-testid="visual-canvas" style={{ '--motion-duration': `${duration}ms` } as CSSProperties}>
      <div className="canvas-heading"><span><span className="live-dot" /> EXECUTION THEATER</span><span>真实状态 · 因果可见</span></div>
      <div className={`teaching-cue tone-${cue.tone}`} data-testid="teaching-cue"><div className="cue-phase"><span className="cue-phase-icon">{cue.tone === 'blocked' ? <X size={15} /> : cue.tone === 'success' ? <Check size={15} /> : <ArrowRight size={15} />}</span><span>{cue.label}</span></div><div className="cue-equation" key={`${frame.step}-${cue.equation}`} data-testid="teaching-equation">{cue.equation}</div><p>{cue.detail}</p></div>
      {problem.renderer === 'essentials' ? <EssentialsScene {...props} /> : problem.renderer === 'state-dp' ? <StateDPScene {...props} /> : problem.renderer === 'ordering' ? <OrderingScene {...props} /> : problem.renderer === 'structures' ? <StructuresScene {...props} /> : problem.renderer === 'exploration' ? <ExplorationScene {...props} /> : ['backtracking', 'cache'].includes(problem.renderer) ? <SearchCacheScene {...props} /> : problem.renderer === 'tree-lab' ? <TreeScene {...props} /> : problem.renderer === 'linked-lab' ? <LinkedListScene {...props} /> : problem.renderer === 'stack-window' ? <StackWindowScene {...props} /> : problem.renderer === 'intervals' ? <IntervalScene {...props} /> : problem.renderer === 'array-hash' ? <ArrayHashScene {...props} /> : ['tree', 'linked-list'].includes(problem.renderer) ? <GraphScene {...props} /> : <ArrayScene {...props} />}
      {problem.id === '3sum' && <div className="triplet-results" aria-label="已找到的三元组"><span>已找到 {arrayTransformView(frame).triplets?.length ?? 0} 组</span><div>{arrayTransformView(frame).triplets?.map((triplet) => <code key={triplet.join(',')} data-testid="triplet-result">[{triplet.join(', ')}]</code>)}</div></div>}
      {frame.table && problem.renderer !== 'array-hash' && <div className={`hash-panel animated-hash ${lookup ? 'is-looking-up' : ''}`}><div className="hash-title"><Database size={15} /><span>seen</span><span className="muted">{problem.renderer === 'window' ? '字符 → 最近下标' : '数值 → 下标'}</span></div>
        {(record || lookup) && <div className={`hash-transfer ${lookup ? 'lookup-transfer' : ''}`}><span>{record ? '当前元素' : '查找搭档'}</span><code>{record ? frame.values[frame.pointers.i ?? frame.pointers.right ?? 0] : need}</code><span className="transfer-track"><i key={frame.step} /></span><Database size={17} /><span>{record ? '存入哈希表' : frame.table.some(([key]) => key === String(need)) ? '命中' : '未找到'}</span></div>}
        <div className="hash-entries">{frame.table.length ? frame.table.map(([key, value]) => <div className={`hash-entry ${record && !oldKeys.has(key) ? 'hash-arrival' : ''} ${lookup && key === String(need) ? 'hash-hit' : ''}`} key={key}><code>{key === ' ' ? '␣' : key}</code><ArrowRight size={13} /><code>{value}</code></div>) : <span className="hash-empty">空哈希表，等待记录第一个元素</span>}</div>
      </div>}
      <div className="legend motion-legend"><span><i className="legend-active" /> 当前处理</span><span><i className="legend-source" /> 来源 / 已确定</span><span><i className="legend-blocked" /> 不能连接</span></div>
    </div>
    <div className="variables"><span className="variables-label"><Braces size={15} /> 变量观察</span>{Object.entries(frame.variables).filter(([key]) => key !== 'view').map(([key, value]) => <span className="variable" key={key}><code>{key}</code><b key={display(value)} className={previous && display(previous.variables[key]) !== display(value) ? 'variable-changed' : ''}>{display(value)}</b></span>)}{frame.result !== undefined && <span className="variable result-variable"><code>return</code><b data-testid="result">{display(frame.result)}</b></span>}</div>
  </>;
}
