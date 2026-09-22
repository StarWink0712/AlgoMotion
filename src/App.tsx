import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronRight, CircleCheck, Code2, ExternalLink, FileJson, FlaskConical, GitBranch, Keyboard, Layers, ListFilter, Menu, Pause, Play, RotateCcw, Search, ShieldCheck, SkipBack, SkipForward, Sparkles, Terminal, X } from 'lucide-react';
import { problems, getProblem } from './engine/catalog';
import { runProblem } from './engine/run';
import { codeLanguages, type CodeLanguage, type Category, type Problem, type ProblemId, type Trace } from './engine/types';
import { languageDetails } from './engine/references';
import Visualizer from './components/Visualizer';
import Generator from './components/Generator';
import ModelSettings from './components/ModelSettings';
import { Settings2 } from 'lucide-react';
import ProblemLibrary from './components/ProblemLibrary';
import type { LibraryEntry } from './engine/library';
import RunResult from './components/RunResult';

const categories: (Category | '全部')[] = ['全部', ...new Set(problems.map((problem) => problem.category))];
const pretty = (value: unknown) => JSON.stringify(value, null, 2);
const difficultyClass = (difficulty: Problem['difficulty']) => difficulty === '困难' ? 'hard' : difficulty === '中等' ? 'medium' : '';

function initialId(): ProblemId {
  const id = new URL(window.location.href).searchParams.get('problem');
  return problems.find((p) => p.id === id)?.id ?? 'two-sum';
}

function readVisited(): string[] {
  try { const value = JSON.parse(localStorage.getItem('algomotion:visited') ?? '[]'); return Array.isArray(value) ? value.filter((id) => problems.some((p) => p.id === id)) : []; }
  catch { return []; }
}

function readCodeLanguage(): CodeLanguage {
  try {
    const stored = localStorage.getItem('algomotion:code-language');
    return codeLanguages.find((language) => language === stored) ?? 'java';
  } catch { return 'java'; }
}

const codeTokens = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|#.*$|\b(?:import|from|class|public|private|static|int|void|boolean|return|new|for|if|else|while|package|func|var|type|struct|range|make|map|def|self|in|is|not|None|null|nil|true|false|True|False)\b|\b\d+\b)/g;
function tokenClass(token: string): string {
  if (/^(\/\/|#)/.test(token)) return 'token-comment';
  if (/^["']/.test(token)) return 'token-string';
  if (/^(\d+|None|null|nil|true|false|True|False)$/.test(token)) return 'token-value';
  return /^\w+$/.test(token) ? 'token-keyword' : '';
}

function Modal({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className="modal" onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="modal-title">
    <div className="modal-inner"><div className="modal-heading"><div><p className="eyebrow">ALGORITHM WORKSPACE</p><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button" aria-label="关闭弹窗" onClick={onClose}><X size={20} /></button></div>{children}</div>
  </dialog>;
}

function Docs() {
  return <div className="docs-content"><div className="architecture"><span><FileJson size={21} /> 输入与校验</span><ChevronRight size={17} /><span><GitBranch size={21} /> 算法执行器</span><ChevronRight size={17} /><span><Layers size={21} /> 快照播放器</span></div>
    <h3>轨迹来自执行，而不是猜测</h3><p>每一道预设题都有本地确定性执行器。改变输入后重新计算真实状态，播放器只负责展示快照。返回值、指针、哈希表和代码行都来自同一次执行。</p>
    <h3>AI 的边界</h3><p>预设题直接从左侧题库选择，支持按题名、题号搜索。“生成新题演示”在确认输入约定后生成 Python，通过受限 Docker 容器执行，轨迹来自实际记录调用。模型、程序和导入文件都不可信；运行成功和样例通过不等于题意正确。生成模式需要模型 API 与 Docker，普通预设模式不需要。</p>
    <h3>快捷操作</h3><div className="shortcut-grid"><span>播放 / 暂停 <kbd>Space</kbd></span><span>上一步 <kbd>←</kbd></span><span>下一步 <kbd>→</kbd></span></div>
    <h3>本地运行与 AI 配置</h3><p>macOS / Windows 安装 Node.js 22.12+，在项目目录执行：</p><pre><code>npm ci{'\n'}npm run dev</code></pre>
    <p>模型是可选功能。打开右上角“模型设置”先选择已有配置，或点击“新增配置”/“修改”再编辑参数。“使用此配置”只切换；“保存并使用”才提交编辑并切换，取消编辑不会写入。支持 DeepSeek、Kimi、OpenAI 或自定义兼容接口；测试连接需单独确认可能的费用。不同型号的 JSON 和 Token 参数可在编辑页高级设置中调整。</p>
    <p>默认保存到本机配置文件，重启后自动恢复上次选中的配置。可命名保存多套配置并直接切换，不必重填密钥；临时使用不会删除已保存配置。文件是明文（已 Git 忽略，不是系统钥匙串），请保护目录权限，勿分享或提交。浏览器不会持久化密钥；同一本地服务共享设置，不是多用户系统。</p>
    <p>也可参考 <code>.env.example</code> 在应用目录的 <code>.env</code> 填写 <code>LLM_BASE_URL</code>、<code>LLM_API_KEY</code> 和 <code>LLM_MODEL</code> 后重启。界面配置优先于环境变量；不要提交密钥到 GitHub。</p><p>本机构建版：<code>npm run build</code> 后执行 <code>npm start</code>，访问 <code>http://127.0.0.1:3001</code>。不要公开暴露当前本地 API；公网多租户需要独立设计强隔离、身份验证和费用配额。</p>
    <a className="text-link" href="https://developers.openai.com/api/docs/guides/structured-outputs" target="_blank" rel="noreferrer">结构化输出官方文档 <ExternalLink size={13} /></a>
  </div>;
}

function CodePane({ problem, location, language, onLanguageChange, onShowIdea }: { problem: Problem; location: string; language: CodeLanguage; onLanguageChange: (value: CodeLanguage) => void; onShowIdea: () => void }) {
  const snippet = problem.code[language];
  const line = snippet.locations[location];
  const filename = language === 'java' ? 'Solution.java' : `${problem.id.replaceAll('-', '_')}.${languageDetails[language].extension}`;
  const scrollArea = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const area = scrollArea.current;
    const current = area?.querySelector<HTMLElement>('.current-line');
    if (!area || !current) return;
    const bounds = area.getBoundingClientRect(), row = current.getBoundingClientRect();
    if (row.top < bounds.top || row.bottom > bounds.bottom) area.scrollTop += row.top - bounds.top - area.clientHeight / 2;
  }, [line, problem.id, language]);
  return <aside className="code-pane preset-code-pane" data-location={location}><div className="code-heading"><span><Code2 size={16} /> 参考代码</span><select className="code-language-select" aria-label="参考代码语言" value={language} onChange={(e) => onLanguageChange(e.target.value as CodeLanguage)}>{codeLanguages.map((value) => <option key={value} value={value}>{languageDetails[value].label}</option>)}</select></div><div className="code-filename"><span /> {filename} <span className="read-only">只读</span></div>
    <div className="code-scroll" ref={scrollArea}><pre>{snippet.lines.map((source, i) => <div className={`code-line ${line === i + 1 ? 'current-line' : ''}`} key={i} data-current={line === i + 1}><span className="line-number">{i + 1}</span><code>{source.split(codeTokens).map((part, j) => <span className={j % 2 === 1 ? tokenClass(part) : ''} key={j}>{part}</span>)}</code></div>)}</pre></div>
    <section className="code-insight" aria-label="算法关键"><h3><Sparkles size={15} />这个算法的关键是什么？</h3><p>{problem.idea}</p><button className="text-link" onClick={onShowIdea}>理解背后的不变量 <ArrowRight size={13} /></button></section>
    {snippet.note && <details key={`${problem.id}:${language}`} className="reference-note reference-details"><summary>语言兼容说明</summary><p>{snippet.note}</p></details>}
    <div className="code-footnote"><span className="code-sync-dot" /> 代码行与执行轨迹同步</div>
  </aside>;
}

export default function App() {
  const [selected, setSelected] = useState<ProblemId>(initialId);
  const [generationMode, setGenerationMode] = useState(false);
  const problem = getProblem(selected);
  const [trace, setTrace] = useState<Trace>(() => runProblem(selected, problem.sample));
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | '全部'>('全部');
  const [input, setInput] = useState(() => pretty(problem.sample));
  const [inputError, setInputError] = useState('');
  const [tab, setTab] = useState<'animation' | 'idea'>('animation');
  const [modal, setModal] = useState<'docs' | 'settings' | 'library' | null>(null);
  const [generatorBusy, setGeneratorBusy] = useState(false);
  const [generationSetupOpen, setGenerationSetupOpen] = useState(false);
  const [librarySelection, setLibrarySelection] = useState<{ entry?: LibraryEntry; revision: number }>({ revision: 0 });
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [visited, setVisited] = useState<string[]>(readVisited);
  const [notice, setNotice] = useState('');
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>(readCodeLanguage);
  const searchRef = useRef<HTMLInputElement>(null);
  const frame = trace.frames[step];
  const last = trace.frames.length - 1;
  const filtered = problems.filter((p) => (category === '全部' || p.category === category) && `${p.title} ${p.english} ${p.number} ${p.category}`.toLowerCase().includes(search.toLowerCase()));

  function selectProblem(id: ProblemId) {
    setGenerationMode(false); setGenerationSetupOpen(false);
    const next = getProblem(id);
    setPlaying(false); setSelected(id); setTrace(runProblem(id, next.sample)); setStep(0);
    setInput(pretty(next.sample)); setInputError(''); setTab('animation'); setModal(null); setMobileMenu(false);
    const url = new URL(window.location.href); url.searchParams.set('problem', id); window.history.replaceState({}, '', url);
    window.scrollTo({ top: 0 });
  }

  function togglePlay() {
    if (step === last) setStep(0);
    setPlaying((current) => !current);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal }).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => setAiConfigured(Boolean(data.aiConfigured))).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (step >= last) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setStep((value) => Math.min(value + 1, last)), 1450 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, step, last, speed]);

  useEffect(() => {
    if (step !== last) return;
    setVisited((current) => current.includes(selected) ? current : [...current, selected]);
  }, [step, last, selected]);
  useEffect(() => { try { localStorage.setItem('algomotion:visited', JSON.stringify(visited)); } catch { /* Private browsing may disable storage. */ } }, [visited]);
  useEffect(() => { try { localStorage.setItem('algomotion:code-language', codeLanguage); } catch { /* Preferences are optional. */ } }, [codeLanguage]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3000); return () => clearTimeout(timer); }, [notice]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (generationMode || modal || mobileMenu || (e.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(e.target.tagName) || e.target.isContentEditable))) return;
      if (e.key === '/') { e.preventDefault(); if (window.innerWidth <= 720) setMobileMenu(true); requestAnimationFrame(() => searchRef.current?.focus()); }
      if (e.code === 'Space') { e.preventDefault(); if (step === last) setStep(0); setPlaying((value) => !value); }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { e.preventDefault(); setPlaying(false); setStep((value) => Math.max(0, Math.min(last, value + (e.code === 'ArrowRight' ? 1 : -1)))); }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [step, last, modal, mobileMenu, generationMode]);

  function runInput(e: React.FormEvent) {
    e.preventDefault(); setPlaying(false);
    try {
      let parsed: unknown;
      try { parsed = JSON.parse(input); } catch { throw new Error('请输入合法 JSON：属性名使用双引号，数组元素用逗号分隔。'); }
      const next = runProblem(selected, parsed); setTrace(next); setStep(0); setInputError(''); setNotice('已根据新输入生成执行轨迹');
    } catch (error) { setInputError(error instanceof Error ? error.message : '输入无效。'); }
  }

  function exportTrace() {
    const blob = new Blob([pretty(trace)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `algomotion-${selected}.trace.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('执行轨迹已导出为 JSON');
  }

  function openModal(value: 'docs' | 'settings' | 'library') { setPlaying(false); setModal(value); setMobileMenu(false); }
  function openLibraryEntry(entry?: LibraryEntry) {
    setLibrarySelection((current) => ({ entry, revision: current.revision + 1 }));
    setGenerationSetupOpen(!entry || entry.content.kind === 'draft');
    setGenerationMode(true); setPlaying(false); setModal(null); setMobileMenu(false);
    window.scrollTo({ top: 0 });
  }

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><GitBranch size={21} strokeWidth={2.5} /></div><span>algo<span className="brand-light">motion</span><span className="brand-dot">.</span></span><span className="version-badge">BETA 0.1</span></div>
      <nav className="top-nav" aria-label="主导航"><span className="nav-active">算法实验室</span><button onClick={() => openModal('docs')}>项目说明 <ExternalLink size={12} /></button></nav>
      <div className="top-actions"><button className="settings-trigger" aria-label="模型设置" onClick={() => openModal('settings')}><Settings2 size={17} /><span>模型设置</span><i className={aiConfigured ? 'ready' : ''} /></button><button className="primary-button small" title={generatorBusy ? '查看当前生成进度' : '打开新题窗口'} onClick={() => { setGenerationMode(true); setGenerationSetupOpen(!generatorBusy); setPlaying(false); setMobileMenu(false); }}><Sparkles size={15} /> 生成新题演示</button><button className="icon-button mobile-menu-toggle" aria-label="打开题库" onClick={() => setMobileMenu((value) => !value)}><Menu size={20} /></button></div>
    </header>
    {mobileMenu && <button className="sidebar-overlay" aria-label="关闭题库" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? 'is-open' : ''}`}><div className="sidebar-top"><div className="sidebar-title"><BookOpen size={17} /><span>探索题库</span><span className="count-pill">{problems.length}</span></div><p>从一行代码，到一个清晰的思路。</p></div>
      <button className="library-launch" disabled={generatorBusy} onClick={() => openModal('library')} title={generatorBusy ? '请先完成或取消当前生成任务' : '管理本浏览器保存的题目与演示'}><BookOpen size={16} />我的题库</button>
      <label className="search-box"><Search size={16} /><input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="搜索题目" placeholder="搜索题目、编号…" /><kbd>/</kbd></label>
      <div className="filter-label"><ListFilter size={13} /> 算法分类</div><div className="category-filters">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}{item === '全部' && <span>{problems.length}</span>}</button>)}</div>
      <div className="list-heading"><span>精选 HOT 100</span><span>{filtered.length} 道</span></div>
      <div className="problem-list">{filtered.map((item) => <button key={item.id} onClick={() => selectProblem(item.id)} className={`problem-item ${selected === item.id ? 'selected' : ''}`} aria-current={selected === item.id ? 'true' : undefined}><span className="problem-number">{String(item.number).padStart(2, '0')}</span><span className="problem-info"><span>{item.title}</span><span className="problem-meta">{item.category}<i />{item.difficulty}</span></span>{visited.includes(item.id) ? <CircleCheck size={14} className="visited-check" /> : selected === item.id ? <ChevronRight size={15} /> : <span className={`difficulty-dot ${difficultyClass(item.difficulty)}`} />}</button>)}{!filtered.length && <div className="no-results">没有找到匹配题目<button onClick={() => { setSearch(''); setCategory('全部'); }}>清除筛选</button></div>}</div>
      <div className="sidebar-bottom"><div className="progress-copy"><span>探索进度</span><span>{visited.length}<span className="muted"> / {problems.length}</span></span></div><progress value={visited.length} max={problems.length} aria-label="已回放题目数" /><p>把一个想法，看到最后一步。</p><button className="sidebar-help" onClick={() => openModal('docs')}><Keyboard size={15} /> 使用指南与快捷键 <ArrowRight size={14} /></button></div>
    </aside>

    <main className="main-content" hidden={generationMode}><div className="page-intro"><div><p className="eyebrow"><span /> THINK. TRACE. UNDERSTAND.</p><h1>让思路，<span>动起来。</span></h1><p className="intro-subtitle">不止看到答案，更看懂每一步为什么。</p></div><div className="intro-art" aria-hidden="true"><div className="art-track" /><span className="art-node n1">01</span><span className="art-node n2"><GitBranch size={21} /></span><span className="art-node n3">n</span><span className="art-caption">a little motion.<br />a lot more clarity.</span></div></div>
      <section className="workspace" aria-label="算法演示工作台"><div className="workspace-header"><div className="problem-title-row"><span className="title-number">{String(problem.number).padStart(2, '0')}</span><div><h2>{problem.title}</h2><p>{problem.english}</p></div><span className={`difficulty-badge ${difficultyClass(problem.difficulty)}`}>{problem.difficulty}</span></div><div className="workspace-actions"><span className="verified-label"><ShieldCheck size={14} /> 预设执行器</span><button className="icon-button" onClick={exportTrace} aria-label="导出执行轨迹" title="导出执行轨迹"><ArrowDownToLine size={17} /></button><a className="icon-button" href={`https://leetcode.cn/problems/${problem.id}/`} target="_blank" rel="noreferrer" aria-label="打开力扣原题" title="打开力扣原题"><ExternalLink size={16} /></a></div></div>
        <div className="problem-summary">{problem.summary}</div>
        <div className="workspace-tabs"><div className="tab-buttons"><button className={tab === 'animation' ? 'active' : ''} aria-pressed={tab === 'animation'} onClick={() => setTab('animation')}><FlaskConical size={15} /> 动态演示</button><button className={tab === 'idea' ? 'active' : ''} aria-pressed={tab === 'idea'} onClick={() => { setPlaying(false); setTab('idea'); }}><BookOpen size={15} /> 解题思路</button></div><span className="template-tag">{problem.category}<span> / </span>{problem.renderer}</span></div>
        {tab === 'animation' ? <><div className="playground-grid"><div className="visual-pane"><Visualizer key={`${selected}:${JSON.stringify(trace.input)}`} frame={frame} previous={trace.frames[step - 1]} problem={problem} speed={speed} /><div className={`step-explanation ${step === last ? 'complete' : ''}`} aria-live="polite"><span className="step-icon">{step === last ? <Check size={18} /> : String(step + 1).padStart(2, '0')}</span><div><span className="step-label">{frame.action}</span><p>{frame.explanation}</p></div></div></div><CodePane problem={problem} location={frame.location} language={codeLanguage} onLanguageChange={setCodeLanguage} onShowIdea={() => { setPlaying(false); setTab('idea'); }} /></div>
          <div className="playback"><div className="playback-main"><button className="icon-button" aria-label="重置回放" onClick={() => { setPlaying(false); setStep(0); }}><RotateCcw size={17} /></button><button className="icon-button" aria-label="上一步" disabled={step === 0} onClick={() => { setPlaying(false); setStep((value) => value - 1); }}><SkipBack size={17} /></button><button className="play-button" aria-label={playing ? '暂停' : step === last ? '重新播放' : '播放'} onClick={togglePlay}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button className="icon-button" aria-label="下一步" disabled={step === last} onClick={() => { setPlaying(false); setStep((value) => value + 1); }}><SkipForward size={17} /></button></div>
            <div className="timeline"><input aria-label="执行时间轴" type="range" min={0} max={last} value={step} onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }} style={{ '--progress': `${last ? step / last * 100 : 0}%` } as React.CSSProperties} /><span className="step-counter"><b>{String(step + 1).padStart(2, '0')}</b> / {String(trace.frames.length).padStart(2, '0')} 步</span></div><select className="speed-select" aria-label="播放速度" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{[0.5, 1, 1.5, 2, 3].map((v) => <option value={v} key={v}>{v}×</option>)}</select><div className="keyboard-hint"><kbd>space</kbd> 播放 / 暂停</div></div>
        </> : <div className="idea-panel"><div><p className="eyebrow">THE INTUITION</p><h3>换一个角度，问题就简单了。</h3><p>{problem.idea}</p><div className="invariant-box"><ShieldCheck size={21} /><div><h4>每一步都保持什么不变？</h4><p>{problem.invariant}</p></div></div></div><div className="complexity-card"><span>算法复杂度</span><div><span>时间</span><strong>{problem.time}</strong></div><div><span>额外空间</span><strong>{problem.space}</strong></div><p>不含为可视化保存快照的额外开销。</p></div></div>}
        <div className="workspace-footer"><span><span className="live-dot" /> 轨迹由本地执行器生成</span><span>时间 <code>{problem.time}</code><i /> 空间 <code>{problem.space}</code></span><span>可修改输入，探索边界情况 <ArrowDownToLine size={12} /></span></div>
      </section>
      <div className="below-workspace"><section className="input-panel"><div className="section-heading"><h3><Terminal size={16} /> 自定义输入</h3><button className="text-button" onClick={() => { setInput(pretty(problem.sample)); setInputError(''); }}>恢复样例</button></div><form onSubmit={runInput}><textarea value={input} onChange={(e) => setInput(e.target.value)} aria-label="自定义 JSON 输入" spellCheck={false} rows={4} /><div className="input-bottom"><p>{problem.inputHint}</p><button className="secondary-button" type="submit"><Play size={13} /> 运行输入</button></div>{inputError && <p role="alert" className="input-error">{inputError} 当前保留上次成功的演示。</p>}</form></section>
        <RunResult trace={trace} draft={input} failed={Boolean(inputError)} /></div>
      <footer className="page-footer"><span>AlgoMotion <span className="muted">/</span> 为理解而构建</span><span>{problems.length} 个预设 <span className="footer-dot" /></span></footer>
    </main>
    <main className="main-content" hidden={!generationMode}><Generator key={librarySelection.revision} initialEntry={librarySelection.entry} active={generationMode && !modal} setupOpen={generationSetupOpen} onSetupOpenChange={setGenerationSetupOpen} settingsRevision={settingsRevision} onSettings={() => openModal('settings')} onBusyChange={setGeneratorBusy} onOpenLibrary={() => openModal('library')} /></main>
    {modal === 'library' && <ProblemLibrary onOpen={openLibraryEntry} onClose={() => setModal(null)} />}
    {modal === 'settings' && <ModelSettings onClose={() => setModal(null)} onSaved={(configured) => { setAiConfigured(configured); setSettingsRevision((v) => v + 1); }} />}
    {modal === 'docs' && <Modal title="看得见，也说得清。" subtitle="AlgoMotion 的工作方式、运行说明与边界。" onClose={() => setModal(null)}><Docs /></Modal>}
    {notice && <div className="toast" role="status"><CircleCheck size={16} />{notice}</div>}
  </div>;
}
