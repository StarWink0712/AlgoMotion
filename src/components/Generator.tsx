import { useEffect, useRef, useState } from 'react';
import { Download, FolderOpen, LoaderCircle, Pause, Play, RotateCcw, Save, SkipBack, SkipForward, Sparkles } from 'lucide-react';
import { contractSchema, inputShape, limits, parseBundle, programSchema, validateInput, type Bundle, type Contract, type Job, type Program, type Verification } from '../engine/generated';
import GeneratedScene from './GeneratedScene';
import DesignedScene from './DesignedScene';
import GenerationDialog from './GenerationDialog';
import { SaveLibraryDialog } from './ProblemLibrary';
import type { LibraryContent, LibraryEntry } from '../engine/library';

const pretty = (v: unknown) => JSON.stringify(v, null, 2);
const labels: Record<string, string> = { idle: '等待题目', parsing: '解析', awaiting: '确认约定', generating: '生成', executing: '执行', checking: '检查', designing: '设计展示', complete: '完成', failed: '失败' };
const verificationChoices: { id: Verification; title: string; detail: string }[] = [
  { id: 'none', title: '不选择独立验证器', detail: '适用于其他开放题。只报告结构、运行和模型样例；不宣称正确性。' },
  { id: 'grid-shortest-4', title: '四邻接障碍网格最短路', detail: 'input={grid,start,end}，0 可走 / 1 障碍，四方向，距离按边数；output={distance,path}，坐标为 [行,列]，无解 {-1,[]}；起终点必须在网格内。' },
  { id: 'grid-min-right-down', title: '右/下非负网格最小路径和', detail: 'input={grid}，非负整数，左上到右下，仅右/下，包含起终点权重；output={sum,path}，path 为 [行,列] 坐标数组。' },
];
async function api(path: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(`/api/generate/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal });
  const data = await response.json();
  if (!response.ok) throw new Error(`${typeof data.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(data.code) ? `${data.code}: ` : ''}${data.error || '生成服务请求失败。'}`);
  return data;
}
function Evidence({ bundle, imported }: { bundle: Bundle; imported: boolean }) {
  const values = [{ name: '结构合法', status: bundle.evidence.structure }, { name: '运行成功', status: bundle.evidence.runtime }, { name: '模型样例', status: bundle.evidence.examples }, { name: '独立验证', status: bundle.evidence.independent }, { name: '教学轨迹', status: bundle.evidence.teaching?.status ?? 'not_run' }, { name: '展示绑定', status: bundle.evidence.presentation ?? 'not_run' }];
  return <section className="evidence-panel"><div className="evidence-badges">{values.map((v) => <span className={imported ? 'untrusted' : v.status} key={v.name}>{v.name} · {imported ? '文件声明，未重验' : v.status === 'passed' ? '通过' : v.status === 'failed' ? '失败' : '未进行'}</span>)}</div><p>{imported ? '导入/重开的源码和轨迹均是不可信数据，只回放不执行。点击“复用程序重新执行”后才产生新的执行证据。' : '动画与程序一致不等于符合题意。独立检查仅覆盖已确认规则、当前输入和有限边界用例，不是普遍正确性证明。'}</p><details open={bundle.evidence.teaching?.status === 'failed'}><summary>检查范围与诊断</summary>{bundle.evidence.details.map((line, i) => <p key={i}>{line}</p>)}<div className="quality-details">{bundle.evidence.teaching?.details.map((line, i) => <p key={i}>{line}</p>)}</div></details></section>;
}
function PresentationNotes({ spec }: { spec: NonNullable<Program['presentation']> }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={(e) => setOpen(e.currentTarget.open)}><summary>查看 AI 设计原文与 JSON（静态，可能剧透）</summary>{open && <><p className="form-note">以下标题和说明是生成时的 AI 原文，不随输入更新，可能包含旧答案、剧透或错误方向描述，不代表当前执行。主画布不使用这些文字。</p><pre>{pretty(spec)}</pre></>}</details>;
}
export default function Generator({ active, setupOpen, onSetupOpenChange, settingsRevision, onSettings, initialEntry, onBusyChange, onOpenLibrary }: { active: boolean; setupOpen: boolean; onSetupOpenChange: (open: boolean) => void; settingsRevision: number; onSettings: () => void; initialEntry?: LibraryEntry; onBusyChange: (busy: boolean) => void; onOpenLibrary: () => void }) {
  const initialBundle = initialEntry?.content.kind === 'demo' ? initialEntry.content.bundle : null;
  const [source, setSource] = useState(initialBundle?.program.source ?? (initialEntry?.content.kind === 'draft' ? initialEntry.content.source : ''));
  const [contract, setContract] = useState<Contract | null>(null);
  const [contractText, setContractText] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [verification, setVerification] = useState<Verification>('none');
  const [design, setDesign] = useState(true), [rawView, setRawView] = useState(false);
  const [stage, setStage] = useState('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState<{ model: boolean; sandbox: { available: boolean; message: string } } | null>(null);
  const [bundle, setBundle] = useState<Bundle | null>(initialBundle);
  const [program, setProgram] = useState<Program | null>(initialBundle?.program ?? null);
  const [imported, setImported] = useState(Boolean(initialBundle));
  const [input, setInput] = useState(initialBundle ? pretty(initialBundle.trace.input) : '');
  const [draftEntry, setDraftEntry] = useState(initialEntry?.content.kind === 'draft' ? initialEntry : undefined);
  const [demoEntry, setDemoEntry] = useState(initialEntry?.content.kind === 'demo' ? initialEntry : undefined);
  const [saving, setSaving] = useState<{ content: LibraryContent; previous?: LibraryEntry } | null>(null);
  const [step, setStep] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const request = useRef<AbortController | null>(null), jobId = useRef<string | null>(null), codeArea = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLHeadingElement>(null);
  const dialogOpen = active && setupOpen && !saving;
  const frame = bundle?.trace.frames[step], last = (bundle?.trace.frames.length ?? 1) - 1;
  async function refreshStatus() { try { setStatus(await api('status', undefined, AbortSignal.timeout(10_000))); } catch { setStatus(null); setError('无法连接生成服务，请检查 API 是否启动。'); } }
  useEffect(() => { if (active) void refreshStatus(); else setPlaying(false); }, [active, settingsRevision]);
  useEffect(() => { onBusyChange(busy || Boolean(saving)); }, [busy, saving, onBusyChange]);
  useEffect(() => { if (active && !setupOpen && !saving) progress.current?.focus(); }, [active, setupOpen, saving]);
  useEffect(() => { if (setupOpen) setPlaying(false); }, [setupOpen]);
  useEffect(() => () => { request.current?.abort(); if (jobId.current) void fetch(`/api/generate/jobs/${jobId.current}`, { method: 'DELETE', keepalive: true }); }, []);
  useEffect(() => {
    if (!playing || !active || setupOpen) return;
    if (step >= last) { setPlaying(false); return; }
    const timer = setTimeout(() => setStep((s) => Math.min(last, s + 1)), 1450 / speed);
    return () => clearTimeout(timer);
  }, [playing, active, setupOpen, step, last, speed]);
  useEffect(() => {
    const area = codeArea.current, row = area?.querySelector<HTMLElement>('.current-line');
    if (area && row) area.scrollTop = Math.max(0, row.offsetTop - area.offsetTop - area.clientHeight / 2);
  }, [frame?.line]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!active || setupOpen || busy || saving || !bundle || e.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(e.target.tagName) || e.target.isContentEditable)) return;
      if (e.code === 'Space') { e.preventDefault(); if (step === last) setStep(0); setPlaying((p) => !p); }
      if (['ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); setPlaying(false); setStep((s) => Math.max(0, Math.min(last, s + (e.code === 'ArrowRight' ? 1 : -1)))); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [active, setupOpen, busy, saving, bundle, step, last]);

  function startRequest() {
    request.current?.abort(); request.current = new AbortController();
    setBusy(true); setError(''); setNotice(''); setPlaying(false); return request.current.signal;
  }
  function fail(e: unknown) { setStage('failed'); setError(request.current?.signal.aborted ? '任务已取消，服务端会清理该任务容器。' : e instanceof Error ? e.message : '处理失败，请重试。'); }
  async function parse() {
    const signal = startRequest(); setStage('parsing'); setContract(null); setConfirmed(false);
    try {
      const data = await api('parse', { source }, signal), next = contractSchema.parse(data.contract);
      inputShape(next); setContract(next); setContractText(pretty(next)); setAnswers(next.questions.map(() => '')); setStage('awaiting');
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  function acceptBundle(next: Bundle, fromFile: boolean) {
    setBundle(next); setProgram(next.program); setInput(pretty(next.trace.input)); setStep(0); setPlaying(false); setImported(fromFile);
  }
  async function run(body: unknown, newGeneration = false) {
    const signal = startRequest(); setStage(body && typeof body === 'object' && 'program' in body ? 'executing' : 'generating');
    try {
      const created = await api('jobs', body, signal); jobId.current = created.id;
      if (newGeneration) {
        setProgram(null); setBundle(null); setStep(0); setImported(false); setDemoEntry(undefined);
        onSetupOpenChange(false);
      }
      while (true) {
        const job: Job = await api(`jobs/${created.id}`, undefined, signal);
        setStage(job.stage);
        if (job.program) {
          const next = programSchema.parse(job.program); setProgram(next);
          if (bundle && JSON.stringify(next) !== JSON.stringify(bundle.program)) { setBundle(null); setStep(0); }
        }
        if (job.stage === 'complete' || job.stage === 'failed') {
          if (job.bundle) acceptBundle(parseBundle(JSON.stringify(job.bundle)), false);
          if (job.error) setError(`${job.error.code}: ${job.error.message}`);
          break;
        }
        await new Promise<void>((resolve, reject) => {
          const abort = () => { clearTimeout(timer); reject(new Error('cancelled')); };
          const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 500);
          signal.addEventListener('abort', abort, { once: true });
          if (signal.aborted) abort();
        });
      }
    } catch (e) { fail(e); }
    finally {
      if (signal.aborted && jobId.current) void fetch(`/api/generate/jobs/${jobId.current}`, { method: 'DELETE' });
      jobId.current = null; setBusy(false);
    }
  }
  function generate() {
    try {
      const next = contractSchema.parse(JSON.parse(contractText));
      if (JSON.stringify(next) !== JSON.stringify(contract)) throw new Error('请先点击“应用约定修改”，核对更新后的展示再确认。');
      if (!confirmed || next.questions.some((_, i) => !answers[i]?.trim())) throw new Error('请补充仍待明确的关键信息，并确认约定。');
      next.assumptions.push(...next.questions.map((q, i) => `${q} 用户确认：${answers[i].trim()}`));
      next.questions = []; contractSchema.parse(next);
      validateInput(next, next.examples[0].input);
      setInput(pretty(next.examples[0].input));
      void run({ source, contract: next, verification, confirmed: true, design }, true);
    } catch (e) { setError(e instanceof Error ? e.message : '约定 JSON 无效。'); }
  }
  function rerun(mode: 'run' | 'repair' | 'design' = 'run') {
    try {
      if (!program) return;
      const data: unknown = JSON.parse(input); validateInput(program.contract, data);
      setRawView(false);
      void run({ program, input: data, confirmed: true, ...(mode === 'run' ? {} : { design: true }), ...(mode === 'repair' ? { repair: true, feedback: [error, ...(bundle?.evidence.teaching?.details ?? [])].join('\n').slice(0, 4000) } : {}) });
    } catch { setError('输入不是合法 JSON 或不符合已确认约定；保留上一次轨迹。'); }
  }
  function reopen(raw: string) {
    try { const next = parseBundle(raw); acceptBundle(next, true); onSetupOpenChange(false); setDemoEntry(undefined); setStage('idle'); setError(''); setNotice('已打开保存结果。未执行文件中的代码。'); }
    catch { setError('文件未通过版本、结构、引用、输入或大小检查，拒绝打开。'); }
  }
  function save() {
    if (!bundle) return;
    try { localStorage.setItem('algomotion:generated:last', JSON.stringify(bundle)); setNotice('已保存到本浏览器，可重新打开。建议导出文件备份。'); }
    catch { setError('浏览器存储空间不足，请使用“导出结果”。'); }
  }
  function exportBundle() {
    if (!bundle) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `algomotion-generated.v${bundle.version}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const phases = <div className="generation-phases" role="status" aria-label="真实生成阶段">{['parsing', 'awaiting', 'generating', 'executing', 'checking', 'designing', 'complete'].map((p) => <span key={p} className={stage === p ? 'current' : ''}>{stage === p && busy && <LoaderCircle size={13} className="spin" />}{labels[p]}</span>)}{stage === 'failed' && <span className="failed">失败</span>}{busy && <button onClick={() => request.current?.abort()}>取消任务</button>}</div>;
  const feedback = <>{error && <div className="error-box" role="alert">{error}{bundle && ' 主界面保留最近一次可诊断轨迹，请核对其输入。'}</div>}{notice && <p className="generation-notice" role="status">{notice}</p>}</>;
  const storageActions = <div className="generation-actions storage-actions"><button className="secondary-button" disabled={busy} onClick={onOpenLibrary}><FolderOpen size={15} />我的题库</button><button className="secondary-button" disabled={busy} onClick={() => { try { const raw = localStorage.getItem('algomotion:generated:last'); if (!raw) throw new Error(); reopen(raw); } catch { setError('本浏览器没有可打开的已保存结果。'); } }}><FolderOpen size={15} />重新打开已保存结果</button><label className="secondary-button file-import"><FolderOpen size={15} />导入结果文件<input aria-label="导入生成结果" type="file" accept="application/json,.json" disabled={busy} onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; if (file.size > limits.bundleBytes) { setError('导入文件超过 2.3 MB 上限。'); return; } reopen(await file.text()); }} /></label></div>;
  return <div className="generator">
    <div className="page-intro"><div><p className="eyebrow">BEYOND THE CATALOG</p><h1>从新问题，<span>看见新思路。</span></h1><p className="intro-subtitle">在窗口中确认题目，在这里看见真实执行。</p></div><button className="secondary-button" onClick={() => onSetupOpenChange(true)}><Sparkles size={15} />{busy ? '查看题目与约定' : source ? '编辑题目与约定' : '填写新题目'}</button></div>
    <section className="generation-progress input-panel" aria-label="生成任务进度"><div className="section-heading"><h2 ref={progress} tabIndex={-1}>{busy ? '正在生成演示' : stage === 'failed' ? '任务未完成' : bundle ? '演示已就绪' : '等待新题演示'}</h2><span className="form-note">{busy ? '关闭填写窗口不影响任务；请保持本页面打开。' : '题目确认与演示播放分开进行。'}</span></div>{!dialogOpen && phases}{!dialogOpen && feedback}</section>
    {!program && <section className="generation-empty" aria-label="演示等待区"><Sparkles size={28} /><h2>{busy ? '正在把题目变成可播放的演示' : '为下一个问题，留一块画布'}</h2><p>{busy ? '阶段会随真实任务更新，完成后自动显示源码、执行轨迹和检查结果。' : '通过上方按钮填写或继续修改题目，也可以打开已保存的演示。'}</p></section>}
    {!dialogOpen && !program && storageActions}
    {dialogOpen && <GenerationDialog onClose={() => onSetupOpenChange(false)}><section className="generation-setup input-panel">
      <div className="section-heading"><h3>{contract ? '核对约定，准备生成' : '描述你想演示的问题'}</h3><button className="text-button" disabled={busy} onClick={refreshStatus}>检查依赖</button></div>
      <div className="connection-banner generation-connection"><span className="live-dot" /><span>{status ? `模型：${status.model ? '已配置' : '未配置'}。${status.sandbox.message}` : '生成模式需要模型配置和 Docker。预设模式不需要。'}</span><button className="text-button" onClick={onSettings}>配置模型 API</button></div>
      <label htmlFor="new-problem">完整题目描述</label><textarea id="new-problem" rows={5} maxLength={6000} value={source} disabled={busy} onChange={(e) => { setSource(e.target.value); setContract(null); setConfirmed(false); }} placeholder="描述你想演示的问题，例如：用快速排序对整数数组排序。若有特殊规则，请一起说明。" />
      <p className="form-note">模型会自行选择常规默认值和实现方式，列出约定供你确认；只有无法合理推断的关键信息才会追问。</p>
      <div className="generation-actions"><button className="primary-button" disabled={busy || !source.trim()} onClick={parse}><Sparkles size={15} />{contract ? '重新解析题意' : '解析题意与约定'}</button><button className="secondary-button" disabled={busy || !source.trim()} onClick={() => { setPlaying(false); setSaving({ content: { kind: 'draft', source }, previous: draftEntry }); }}><Save size={15} />保存题目草稿</button><span className="form-note">保存草稿不调用模型。解析会发送题目到模型供应商，可能计费；失败不会自动重试。</span></div>
      <label className="design-choice"><input type="checkbox" checked={design} disabled={busy} onChange={(e) => setDesign(e.target.checked)} />AI 定制展示：执行通过后额外调用模型设计布局与数据绑定；不执行生成的 HTML/JS，改输入复用设计。</label>
      {phases}{feedback}
      {contract && <div className="contract-review"><h3>{contract.title}</h3><p>{contract.summary}</p><h4>输入约定</h4><pre>{pretty(JSON.parse(contract.inputSchema))}</pre><h4>输出约定</h4><p>{contract.outputDescription}</p><h4>约束与演示范围</h4><ul>{contract.constraints.map((a, i) => <li key={i}>{a}</li>)}</ul><h4>默认约定与关键假设</h4><p className="form-note">“默认”项由模型补齐，不是额外的必答题。接受即可继续；有不同要求时，可修改题目后重新解析，或在下方编辑约定 JSON。</p><ul>{contract.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul><h4>模型样例（非独立证据）</h4><pre>{pretty(contract.examples)}</pre>
        {contract.limitation && <p className="error-box">表达能力说明：{contract.limitation}</p>}
        {contract.questions.length > 0 ? <><h4>还需补充的关键信息</h4><p className="form-note">以下信息尚未确定，请补充后再生成。若问题其实已有常规答案，可在题目中注明“其余采用常规默认值”后重新解析。</p></> : contract.supported && <p className="generation-notice">无需逐项回答问题，核对约定后即可生成。</p>}
        {contract.questions.map((q, i) => <label className="clarification" key={i}>{q}<input aria-label={`澄清问题 ${i + 1}`} maxLength={300} disabled={busy} value={answers[i] ?? ''} onChange={(e) => { setAnswers((a) => a.map((v, n) => n === i ? e.target.value : v)); setConfirmed(false); }} placeholder="补充目标或缺失规则" /></label>)}
        <details><summary>编辑完整约定 JSON</summary><textarea aria-label="编辑约定 JSON" rows={10} value={contractText} disabled={busy} onChange={(e) => { setContractText(e.target.value); setConfirmed(false); }} /><button className="secondary-button" disabled={busy} onClick={() => { try { const c = contractSchema.parse(JSON.parse(contractText)); inputShape(c); c.examples.forEach((e) => validateInput(c, e.input)); setContract(c); setAnswers(c.questions.map(() => '')); setConfirmed(false); setError(''); } catch { setError('约定 JSON 或示例输入无效。'); } }}>应用约定修改</button></details>
        <label className="verifier-label">独立检查（仅当约定完全一致时选择）<select aria-label="独立验证器" value={verification} disabled={busy} onChange={(e) => { setVerification(e.target.value as Verification); setConfirmed(false); }}>{verificationChoices.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}</select></label><p className="verifier-description">{verificationChoices.find((v) => v.id === verification)!.detail}</p>
        <label className="confirm-contract"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(e) => setConfirmed(e.target.checked)} />我已核对输入输出、默认约定和样例；如选择独立验证器，其规则也与约定一致。</label>
        <button className="primary-button" onClick={generate} disabled={busy || !confirmed || !contract.supported || contract.questions.some((_, i) => !answers[i]?.trim())}>确认并生成 Python 演示</button>
      </div>}
    </section>{storageActions}</GenerationDialog>}
    {program && <section className={`workspace generated-workspace ${program.presentation && !rawView ? 'designed-workspace' : ''}`} aria-label="生成演示工作台"><div className="workspace-header"><div><h2>{program.contract.title}</h2><p className="form-note">生成程序 · 仅 Python · {labels[stage]}{demoEntry && ` · 题库：${demoEntry.title}`}</p></div>{bundle && <div className="generation-actions"><button className="secondary-button" disabled={busy} onClick={() => { setPlaying(false); setSaving({ content: { kind: 'demo', bundle }, previous: demoEntry }); }}><Save size={15} />保存到我的题库</button><button className="icon-button" aria-label="保存生成结果" title="旧版单槽位快速保存" onClick={save} disabled={busy}><Save size={17} /></button><button className="icon-button" aria-label="导出生成结果" onClick={exportBundle} disabled={busy}><Download size={17} /></button></div>}</div>
      {bundle && <Evidence bundle={bundle} imported={imported} />}
      <div className="presentation-toolbar">{program.presentation && <><button className="secondary-button" aria-pressed={!rawView} onClick={() => setRawView(false)}>AI 定制展示</button><button className="secondary-button" aria-pressed={rawView} onClick={() => setRawView(true)}>原始轨迹</button></>}<button className="secondary-button" disabled={busy} onClick={() => rerun('design')}>重新设计展示（调用模型）</button><button className="secondary-button" disabled={busy} onClick={() => rerun('repair')}>修复程序并重试（调用模型）</button>{program.presentation && <PresentationNotes key={JSON.stringify(bundle?.trace.input) + program.python} spec={program.presentation} />}</div>
      <div className="playground-grid"><div className="visual-pane">{frame && bundle ? <>{program.presentation && !rawView ? <DesignedScene key={JSON.stringify(bundle.trace.input) + bundle.program.python + JSON.stringify(program.presentation)} spec={program.presentation} context={{ frame, input: bundle.trace.input, result: bundle.trace.result, final: step === last }} speed={speed} /> : <GeneratedScene key={JSON.stringify(bundle.trace.input) + bundle.program.python} frame={frame} speed={speed} />}<div className="step-explanation"><span className="step-icon">{step + 1}</span><div><span className="step-label">{frame.action}</span><p>{frame.explanation}</p>{step === last && <pre data-testid="generated-result">{pretty(bundle.trace.result)}</pre>}</div></div></> : <div className="empty-data">等待实际执行轨迹；不展示模型虚构的动画。</div>}</div>
        <aside className="code-pane"><div className="code-heading"><span>实际执行的 Python 源码</span></div><div className="code-filename">solution.py <span className="read-only">生成 / 不可信</span></div><div className="code-scroll" ref={codeArea}><pre>{program.python.split('\n').map((line, i) => <div className={`code-line ${frame?.line === i + 1 ? 'current-line' : ''}`} key={i}><span className="line-number">{i + 1}</span><code>{line}</code></div>)}</pre></div><p className="reference-note">高亮来自 trace.snapshot 的真实 Python 调用行。未生成或验证 Java / Go 版本。</p></aside></div>
      {bundle && <div className="playback"><div className="playback-main"><button className="icon-button" aria-label="重置生成回放" onClick={() => { setStep(0); setPlaying(false); }}><RotateCcw size={17} /></button><button className="icon-button" aria-label="生成上一步" disabled={step === 0} onClick={() => { setPlaying(false); setStep((s) => s - 1); }}><SkipBack size={17} /></button><button className="play-button" aria-label={playing ? '暂停生成回放' : '播放生成回放'} onClick={() => { if (step === last) setStep(0); setPlaying((p) => !p); }}>{playing ? <Pause size={17} /> : <Play size={17} />}</button><button className="icon-button" aria-label="生成下一步" disabled={step === last} onClick={() => { setPlaying(false); setStep((s) => s + 1); }}><SkipForward size={17} /></button></div><div className="timeline"><input aria-label="生成执行时间轴" type="range" min={0} max={last} value={step} onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }} /><span className="step-counter">{step + 1} / {last + 1}</span></div><select className="speed-select" aria-label="生成播放速度" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{[0.5, 1, 1.5, 2, 3].map((v) => <option key={v}>{v}</option>)}</select></div>}
    </section>}
    {program && <section className="input-panel generated-input"><div className="section-heading"><h3>修改输入，复用程序</h3></div><textarea aria-label="生成题 JSON 输入" value={input} onChange={(e) => setInput(e.target.value)} rows={5} maxLength={32768} disabled={busy} /><div className="input-bottom"><p>不请求模型；复用 Python 与展示描述，通过 Docker 重新执行和检查。当前轨迹输入：{bundle ? JSON.stringify(bundle.trace.input) : '尚未执行'}</p><button className="secondary-button" onClick={() => rerun()} disabled={busy}>复用程序重新执行</button></div></section>}
    {!dialogOpen && program && storageActions}
    {saving && <SaveLibraryDialog content={saving.content} previous={saving.previous} onClose={() => setSaving(null)} onSaved={(entry) => { if (entry.content.kind === 'demo') setDemoEntry(entry); else setDraftEntry(entry); setSaving(null); onSetupOpenChange(false); setNotice('已保存到我的题库，可按分类查找和重新打开。建议导出条目备份。'); }} />}
  </div>;
}
