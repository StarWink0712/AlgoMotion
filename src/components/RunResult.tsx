import { Terminal } from 'lucide-react';
import { inputMatchesExecution } from '../engine/input-state';
import type { Trace } from '../engine/types';

export default function RunResult({ trace, draft, failed }: { trace: Trace; draft: string; failed: boolean }) {
  const changed = !inputMatchesExecution(draft, trace.input);
  const state = failed ? 'failed' : changed ? 'pending' : 'current';
  return <section className="output-panel" aria-label="运行结果" data-input-state={state}>
    <div className="section-heading"><h3><Terminal size={16} />运行结果</h3><span className={`output-status ${state}`}>{failed ? '保留上次输出' : changed ? '输入待运行' : '已计算'}</span></div>
    <p className="output-label">最终返回值 · 不随回放进度变化</p>
    <pre className={`output-value ${typeof trace.result === 'number' ? 'numeric' : ''}`} data-testid="preset-output" aria-live="polite"><code>{JSON.stringify(trace.result, null, 2)}</code></pre>
    <p className="output-message" data-testid="output-input-status">{failed ? '本次输入未通过检查，仍显示上次执行的输出。' : changed ? '输入已修改但尚未运行，仍显示上次执行的输出。' : '对应当前输入的执行结果，无需等待动画播放完毕。'}</p>
    <details className="output-input"><summary>查看此输出对应的输入</summary><pre data-testid="output-executed-input">{JSON.stringify(trace.input, null, 2)}</pre></details>
    <p className="output-origin">由内置预设执行器计算；Java / Go / Python 为参考代码。</p>
  </section>;
}
