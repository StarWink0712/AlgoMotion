import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { BookOpen, Download, FolderOpen, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { deleteLibraryEntry, downloadLibraryEntry, filterLibrary, getLibraryEntry, libraryCategories, libraryError, libraryLimits, libraryMetadataSchema, listLibrary, parseLibraryEntry, saveLibraryEntry, type LibraryContent, type LibraryEntry, type LibraryMetadata, type LibrarySummary } from '../engine/library';

function LibraryDialog({ title, onClose, busy = false, children }: { title: string; onClose: () => void; busy?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null), id = useId();
  useEffect(() => { const element = ref.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={ref} className="modal library-modal" aria-labelledby={id} onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }}>
    <div className="modal-inner"><div className="modal-heading"><div><p className="eyebrow">YOUR ALGORITHM NOTEBOOK</p><h2 id={id}>{title}</h2></div><button className="icon-button" aria-label="关闭我的题库弹窗" disabled={busy} onClick={onClose}><X size={20} /></button></div>{children}</div>
  </dialog>;
}
function EntryForm({ content, previous, initial, onSaved, onCancel, onBusyChange }: { content: LibraryContent; previous?: LibraryEntry; initial?: LibraryMetadata; onSaved: (entry: LibraryEntry) => void; onCancel: () => void; onBusyChange: (busy: boolean) => void }) {
  const [title, setTitle] = useState(initial?.title ?? previous?.title ?? (content.kind === 'demo' ? content.bundle.program.contract.title : content.source.trim().split('\n')[0].slice(0, 100)));
  const [categories, setCategories] = useState<string[]>(initial?.categories ?? previous?.categories ?? ['未分类']);
  const [custom, setCustom] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [copy, setCopy] = useState(false);
  const choices = [...new Set<string>([...libraryCategories, ...categories])];
  function toggle(value: string) {
    setError('');
    if (value === '全部') { setError('“全部”用于显示所有条目，请使用其他分类名称。'); return; }
    if (categories.includes(value)) { setCategories(categories.filter((item) => item !== value)); return; }
    if (value === '未分类') { setCategories(['未分类']); return; }
    const next = [...categories.filter((item) => item !== '未分类'), value];
    if (next.length > 6) { setError('最多选择 6 个算法分类。'); return; }
    setCategories(next);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const metadata = libraryMetadataSchema.parse({ title, categories });
      setBusy(true); onBusyChange(true); onSaved(await saveLibraryEntry(metadata, content, copy ? undefined : previous));
    } catch (e) { setError(libraryError(e)); } finally { setBusy(false); onBusyChange(false); }
  }
  return <form className="library-entry-form" onSubmit={submit}>
    <p className="form-note">{content.kind === 'demo' ? '保存当前已执行输入、Python 源码、完整轨迹和展示设计；不会保存尚未执行的输入编辑。' : '仅保存题目文字，稍后可继续解析和生成。不调用模型。'}</p>
    <label className="settings-field">题库标题<input aria-label="题库标题" value={title} maxLength={100} required disabled={busy} onChange={(e) => setTitle(e.target.value)} /></label>
    <fieldset disabled={busy}><legend>算法分类 <span>可多选，最多 6 个</span></legend><div className="library-category-options">{choices.map((category) => <label key={category} className={categories.includes(category) ? 'selected' : ''}><input type="checkbox" checked={categories.includes(category)} onChange={() => toggle(category)} />{category}</label>)}</div></fieldset>
    <div className="library-custom-category"><input aria-label="自定义算法分类" placeholder="也可以自定义分类" maxLength={24} value={custom} disabled={busy} onChange={(e) => setCustom(e.target.value)} /><button type="button" className="secondary-button" disabled={busy || !custom.trim()} onClick={() => { if (!categories.includes(custom.trim())) toggle(custom.trim()); setCustom(''); }}>添加分类</button></div>
    {previous && <label className="library-copy"><input type="checkbox" checked={copy} disabled={busy} onChange={(e) => setCopy(e.target.checked)} />另存为新条目（不覆盖原条目）</label>}
    <p className="library-privacy">仅保存在当前浏览器、当前网站地址下。清除网站数据会丢失题库，不跨浏览器或设备同步；建议导出条目备份。保存不表示算法验证通过。</p>
    {error && <p className="error-box" role="alert">{error}</p>}
    <div className="library-form-actions"><button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>取消</button><button className="primary-button" type="submit" disabled={busy}><Save size={15} />{busy ? '正在保存…' : previous && !copy ? '更新题库条目' : '确认保存到题库'}</button></div>
  </form>;
}
export function SaveLibraryDialog({ content, previous, onSaved, onClose }: { content: LibraryContent; previous?: LibraryEntry; onSaved: (entry: LibraryEntry) => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return <LibraryDialog title={previous ? '更新我的题库' : '保存到我的题库'} onClose={onClose} busy={busy}><EntryForm content={content} previous={previous} onSaved={onSaved} onCancel={onClose} onBusyChange={setBusy} /></LibraryDialog>;
}
export default function ProblemLibrary({ onOpen, onClose }: { onOpen: (entry?: LibraryEntry) => void; onClose: () => void }) {
  const [entries, setEntries] = useState<LibrarySummary[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [search, setSearch] = useState(''), [category, setCategory] = useState('全部');
  const [editing, setEditing] = useState<{ entry: LibraryEntry; imported: boolean } | null>(null), [removing, setRemoving] = useState<LibrarySummary | null>(null);
  async function refresh() {
    setLoading(true); setError('');
    try { setEntries(await listLibrary()); } catch (e) { setError(libraryError(e)); } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function withEntry(id: string, action: (entry: LibraryEntry) => void) {
    setBusy(true); setError(''); setNotice('');
    try { action(await getLibraryEntry(id)); } catch (e) { setError(libraryError(e)); } finally { setBusy(false); }
  }
  const filtered = filterLibrary(entries, search, category), categories = [...new Set(entries.flatMap((entry) => entry.categories))].sort();
  return <LibraryDialog title={editing ? editing.imported ? '导入题库条目' : '编辑题库条目' : '我的题库'} onClose={onClose} busy={busy}>
    {editing ? <EntryForm key={editing.entry.id} content={editing.entry.content} previous={editing.imported ? undefined : editing.entry} initial={editing.entry} onBusyChange={setBusy} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); setNotice('题库条目已保存。'); void refresh(); }} /> : <>
      <p className="library-privacy">你的草稿与演示，按自己的方式整理。仅保存在本浏览器，最多 100 道 / 32 MiB。打开条目会替换当前生成工作台，不调用模型、不执行代码。</p>
      <div className="library-toolbar"><button className="primary-button" onClick={() => onOpen()} disabled={busy}><Plus size={15} />新增题目</button><label className="secondary-button file-import"><FolderOpen size={15} />导入题库条目<input aria-label="导入题库条目" type="file" accept="application/json,.json" disabled={busy} onChange={async (e) => {
        const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
        setError(''); setBusy(true);
        try { if (file.size > libraryLimits.fileBytes) throw new Error('题库文件超过大小上限。'); setEditing({ entry: parseLibraryEntry(await file.text()), imported: true }); }
        catch { setError('题库文件未通过版本、内容或大小检查，未保存。普通演示 JSON 请先在生成工作台导入，再保存到题库。'); }
        finally { setBusy(false); }
      }} /></label><button className="text-button" onClick={refresh} disabled={busy || loading}>刷新题库</button></div>
      <div className="library-filters"><label className="search-box"><Search size={16} /><input aria-label="搜索我的题库" placeholder="搜索标题或分类" value={search} onChange={(e) => setSearch(e.target.value)} /></label><select aria-label="筛选我的算法分类" value={category} onChange={(e) => setCategory(e.target.value)}><option>全部</option>{[...new Set([...(category === '全部' ? [] : [category]), ...categories])].map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className="library-list-heading"><span>{filtered.length} / {entries.length} 道</span><span>最近保存优先 · 预设题库不变</span></div>
      {loading ? <p role="status">正在读取本地题库…</p> : <div className="library-list">{filtered.map((entry) => <article className="library-card" key={entry.id} aria-label={entry.title}>
        <div className="library-card-heading"><span className={`library-kind ${entry.kind}`}>{entry.kind === 'demo' ? '演示' : '草稿'}</span><h3>{entry.title}</h3></div>
        <div className="library-tags">{entry.categories.map((item) => <span key={item}>{item}</span>)}</div><p className="library-date">{new Date(entry.updatedAt).toLocaleString()} · {entry.kind === 'demo' ? '保存证据未重验' : '尚未生成程序'}</p>
        <div className="library-card-actions"><button className="secondary-button" disabled={busy} onClick={() => withEntry(entry.id, onOpen)}><BookOpen size={14} />打开</button><button className="icon-button" aria-label={`编辑 ${entry.title}`} disabled={busy} onClick={() => withEntry(entry.id, (value) => setEditing({ entry: value, imported: false }))}><Pencil size={15} /></button><button className="icon-button" aria-label={`导出 ${entry.title}`} disabled={busy} onClick={() => withEntry(entry.id, downloadLibraryEntry)}><Download size={15} /></button><button className="icon-button" aria-label={`删除 ${entry.title}`} disabled={busy} onClick={() => setRemoving(entry)}><Trash2 size={15} /></button></div>
        {removing?.id === entry.id && <div className="library-delete" role="group" aria-label="确认删除条目"><p>仅删除此浏览器中的“{entry.title}”。未备份的内容将无法恢复。</p><button className="secondary-button" disabled={busy} onClick={() => setRemoving(null)}>保留</button><button className="secondary-button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await deleteLibraryEntry(entry); setRemoving(null); await refresh(); } catch (e) { setError(libraryError(e)); } finally { setBusy(false); } }}>确认删除</button></div>}
      </article>)}{!filtered.length && !error && <div className="library-empty"><BookOpen size={28} /><h3>{entries.length ? '没有符合筛选的题目' : '把值得研究的题目留在这里'}</h3><p>{entries.length ? '试试其他标题或分类。' : '从“新增题目”保存文字草稿，或把生成、导入的演示保存到题库。'}</p>{entries.length > 0 && <button className="text-button" onClick={() => { setSearch(''); setCategory('全部'); }}>清除题库筛选</button>}</div>}</div>}
    </>}
    {error && <p className="error-box" role="alert">{error}</p>}{notice && <p className="generation-notice" role="status">{notice}</p>}
  </LibraryDialog>;
}
