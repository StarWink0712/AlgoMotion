import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { profileLimit, providers, type PublicModelProfile, type PublicModelSettings, type SettingsUpdate } from '../engine/model-settings';
import ModelConfigEditor, { type ConfigEditorTarget } from './ModelConfigEditor';

export default function ModelSettings({ onClose, onSaved }: { onClose: () => void; onSaved: (configured: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), request = useRef<AbortController | null>(null);
  const [saved, setSaved] = useState<PublicModelSettings | null>(null);
  const [editor, setEditor] = useState<ConfigEditorTarget | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PublicModelProfile | 'all' | null>(null);
  const [token, setToken] = useState(''), [busy, setBusy] = useState('loading');
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const activeProfile = saved?.profiles.find((p) => p.id === saved.activeProfileId);
  const unavailable = Boolean(busy) || !token;

  function accept(settings: PublicModelSettings) {
    if (!settings || !Array.isArray(settings.profiles)) throw new Error('设置接口版本不匹配，请重启本地服务并刷新页面。');
    setSaved(settings); setEditor(null); setConfirmDelete(null);
  }
  useEffect(() => {
    const element = dialog.current!; element.showModal();
    const controller = new AbortController();
    fetch('/api/model-settings', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]), cache: 'no-store' }).then(async (r) => {
      if (!r.ok) throw new Error();
      const data = await r.json(); accept(data.settings); setToken(data.token);
    }).catch(() => { if (!controller.signal.aborted) setError('无法读取设置。请确认本地 API 已启动，必要时重启 npm run dev。'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(''); });
    return () => { controller.abort(); request.current?.abort(); element.close(); };
  }, []);
  async function reload() {
    setBusy('loading'); setError(''); setMessage('');
    const controller = new AbortController(); request.current = controller;
    try {
      const response = await fetch('/api/model-settings', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
      if (!response.ok) throw new Error();
      const data = await response.json(); accept(data.settings); setToken(data.token); onSaved(data.settings.configured);
    } catch { if (!controller.signal.aborted) setError('无法刷新设置，请检查本地 API 服务。'); }
    finally { setBusy(''); }
  }
  function edit(target: ConfigEditorTarget) { setEditor(target); setError(''); setMessage(''); setConfirmDelete(null); dialog.current?.scrollTo({ top: 0 }); }
  function back() { setEditor(null); setError(''); setMessage(''); dialog.current?.scrollTo({ top: 0 }); }
  async function submit(action: 'save' | 'test' | 'reset' | 'activate' | 'delete', payload: unknown, id?: string) {
    setError(''); setMessage(''); setBusy(action);
    const controller = new AbortController(); request.current = controller;
    const path = action === 'test' ? '/test' : action === 'activate' ? '/activate' : action === 'delete' ? `/profiles/${id}` : '';
    try {
      const response = await fetch(`/api/model-settings${path}`, {
        method: action === 'reset' || action === 'delete' ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-AlgoMotion-Settings-Token': token },
        body: JSON.stringify(payload), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(35_000)]),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '操作失败，请刷新配置后重试。');
      if (action === 'test') setMessage(data.message);
      else {
        accept(data.settings); onSaved(data.settings.configured); dialog.current?.scrollTo({ top: 0 });
        const persistence = (payload as SettingsUpdate).persistence;
        setMessage(action === 'reset' ? '全部界面配置已清除，恢复使用环境变量。未修改 .env 文件。'
          : action === 'delete' ? '所选配置已删除，其他已保存配置仍保留。'
          : action === 'activate' ? '配置已切换，无需重填密钥。未修改配置参数；正在进行的任务不变。'
          : `配置已生效。${persistence === 'disk' ? '已保存在本机，应用重启后自动恢复。' : '仅本次服务使用，已保存配置未修改。'}`);
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error && !['TypeError', 'TimeoutError'].includes(e.name) ? e.message : '本地服务不可达或超时，请检查服务状态。');
    } finally { setBusy(''); }
  }
  return <dialog className="modal settings-modal" ref={dialog} aria-labelledby="settings-title" onCancel={(e) => { e.preventDefault(); if (!busy) { if (editor) back(); else onClose(); } }} onClick={(e) => { if (e.target === e.currentTarget && !busy && !editor) onClose(); }}>
    <div className="modal-inner">
      <div className="modal-heading"><div><p className="eyebrow">YOUR MODEL, YOUR CHOICE</p><h2 id="settings-title">模型设置</h2><p>{editor ? '明确编辑，确认后保存。已有配置不会自动改变。' : '选择一套配置开始使用，也可以新增或修改。'}</p></div><button className="icon-button" aria-label="关闭模型设置" disabled={Boolean(busy)} onClick={onClose}><X size={20} /></button></div>
      <div className="settings-state"><span className={`live-dot ${saved?.configured ? 'ready' : ''}`} /><span>{saved ? `当前使用：${activeProfile?.name ?? (saved.source === 'session' ? '临时配置' : saved.configured ? '环境变量' : '尚未配置')}` : '正在读取配置'}<span className="settings-source">{saved?.source === 'disk' ? ' · 重启后保留' : ''}</span></span><ShieldCheck size={15} /></div>
      {saved?.loadError && <p className="error-box">本机配置文件无效，未加载。原文件没有被覆盖；请检查文件，或明确清除全部配置后重建。</p>}
      {error && <p role="alert" className="error-box">{error}{editor && <button type="button" className="text-button settings-error-refresh" disabled={unavailable} onClick={reload}>放弃编辑并刷新配置</button>}</p>}
      {message && <p role="status" className="settings-feedback"><Check size={16} />{message}</p>}
      {editor && saved ? <ModelConfigEditor target={editor} settings={saved} busy={busy} onBack={back} onChange={() => { setMessage(''); setError(''); }} onSubmit={(action, body) => void submit(action, body)} /> : <>
        <section className="settings-profiles" aria-label="已保存模型配置">
          <div className="settings-profile-heading"><span>我的配置 <small>{saved?.profiles.length ?? 0} / {profileLimit}</small></span><div><button type="button" className="text-button" disabled={Boolean(busy)} onClick={reload}>刷新配置</button><button className="primary-button small" type="button" disabled={unavailable || (saved?.profiles.length ?? 0) >= profileLimit} onClick={() => edit({ kind: 'new' })}><Plus size={14} />新增配置</button></div></div>
          <p className="field-help">“使用此配置”只切换，不会修改参数或调用模型。已保存不代表连接验证通过。</p>
          <div className="settings-profile-list">{saved?.profiles.map((profile) => {
            const active = saved.activeProfileId === profile.id;
            return <article key={profile.id} className={`settings-profile-card ${active ? 'active' : ''}`} aria-label={profile.name} data-profile-id={profile.id} data-active={active}>
              <div className="profile-card-heading"><h3>{profile.name}</h3>{active && <span className="profile-active-badge"><Check size={12} />当前使用</span>}</div>
              <p className="profile-card-model"><span>{providers.find((p) => p.id === profile.provider)?.name}</span><code>{profile.model}</code></p>
              <p className="profile-card-url">{profile.baseUrl}</p>
              <div className="profile-card-actions"><span>{profile.hasKey ? '密钥已保存' : '未设置密钥'}</span><button className="secondary-button" type="button" disabled={unavailable || active} onClick={() => void submit('activate', { profileId: profile.id, revision: saved.revision })}>{active ? '正在使用' : '使用此配置'}</button><button className="secondary-button" type="button" disabled={unavailable} onClick={() => edit({ kind: 'profile', profile })}><Pencil size={13} />修改</button><button className="icon-button" type="button" aria-label={`删除 ${profile.name}`} disabled={unavailable} onClick={() => { setConfirmDelete(profile); setError(''); setMessage(''); }}><Trash2 size={15} /></button></div>
            </article>;
          })}</div>
          {saved && saved.profiles.length === 0 && !saved.loadError && <div className="settings-empty"><h3>还没有保存的配置</h3><p>点击“新增配置”填写供应商、模型和密钥；保存后可从这里直接选择。</p></div>}
        </section>
        <div className="settings-list-footer"><button type="button" className="text-button" disabled={unavailable || saved?.source === 'environment'} onClick={() => void submit('activate', { profileId: null, revision: saved?.revision })}>使用环境变量</button>{saved && saved.source !== 'disk' && saved.hasKey && <button type="button" className="text-button" disabled={unavailable} onClick={() => edit({ kind: 'current' })}>基于当前配置保存</button>}<button type="button" className="text-button settings-clear-all" disabled={unavailable || !saved?.profiles.length && saved?.source !== 'session' && !saved?.loadError} onClick={() => setConfirmDelete('all')}>清除全部界面配置</button></div>
        {confirmDelete && <div className="settings-delete-confirm" role="group" aria-label="删除配置确认"><p>{confirmDelete === 'all' ? '删除所有已保存的配置和密钥，并清除临时配置？' : `删除“${confirmDelete.name}”及其保存的密钥？其他配置不受影响。删除当前使用的配置会恢复环境变量。`} 此操作不可撤销，不修改 .env。</p><button type="button" className="secondary-button" disabled={unavailable} onClick={() => setConfirmDelete(null)}>取消删除</button><button type="button" className="secondary-button" disabled={unavailable} onClick={() => void submit(confirmDelete === 'all' ? 'reset' : 'delete', { revision: saved?.revision }, confirmDelete === 'all' ? undefined : confirmDelete.id)}>确认删除配置</button></div>}
        <p className="settings-list-note">配置与密钥保存在本机文件，不写入浏览器存储。修改表单只在你主动打开时加载，返回列表会清空密钥输入。保存文件为明文，请勿分享或提交。</p>
      </>}
    </div>
  </dialog>;
}
