import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, KeyRound, LoaderCircle } from 'lucide-react';
import { providerDefaults, providers, type ModelSettings as Settings, type PublicModelProfile, type PublicModelSettings, type SettingsUpdate } from '../engine/model-settings';

export type ConfigEditorTarget = { kind: 'new' } | { kind: 'profile'; profile: PublicModelProfile } | { kind: 'current' };
export default function ModelConfigEditor({ target, settings, busy, onSubmit, onBack, onChange }: {
  target: ConfigEditorTarget; settings: PublicModelSettings; busy: string;
  onSubmit: (action: 'save' | 'test', body: SettingsUpdate & { consent?: boolean }) => void; onBack: () => void; onChange: () => void;
}) {
  const original = target.kind === 'profile' ? target.profile : target.kind === 'current' ? settings : null;
  const [draft, setDraft] = useState<Settings>(() => original ? {
    provider: original.provider, baseUrl: original.baseUrl, model: original.model, format: original.format,
    tokenParameter: original.tokenParameter, thinking: original.thinking, maxOutputTokens: original.maxOutputTokens,
  } : providerDefaults('deepseek'));
  const [name, setName] = useState(target.kind === 'profile' ? target.profile.name : '');
  const [apiKey, setApiKey] = useState(''), [consent, setConsent] = useState(false);
  const [persistence, setPersistence] = useState<'disk' | 'session'>(settings.diskAvailable ? 'disk' : 'session');
  const provider = providers.find((p) => p.id === draft.provider)!;
  const reuseKey = Boolean(original?.hasKey && original.provider === draft.provider && original.baseUrl === draft.baseUrl);
  function change(patch: Partial<Settings>) {
    setDraft((current) => ({ ...current, ...patch })); setConsent(false); onChange();
    if (patch.baseUrl !== undefined) setApiKey('');
  }
  function submit(action: 'save' | 'test') {
    onSubmit(action, { ...draft, apiKey, persistence, name: name.trim() || `${provider.name} / ${draft.model}`.slice(0, 80),
      profileId: target.kind === 'new' ? null : target.kind === 'profile' ? target.profile.id : undefined,
      revision: settings.revision, ...(action === 'test' ? { consent } : {}),
    });
  }
  function save(e: FormEvent) { e.preventDefault(); submit('save'); }
  return <section className="settings-editor" aria-label={target.kind === 'profile' ? '修改模型配置' : '新增模型配置'}>
    <div className="settings-editor-heading"><button className="text-link" type="button" disabled={Boolean(busy)} onClick={onBack}><ArrowLeft size={14} />返回配置列表</button><h3>{target.kind === 'profile' ? `修改：${target.profile.name}` : target.kind === 'current' ? '基于当前配置保存' : '新增配置'}</h3><p>只有点击“保存并使用”才提交并切换。返回列表会丢弃未保存内容；测试连接不会保存。</p></div>
    <form onSubmit={save} autoComplete="off">
      <fieldset disabled={Boolean(busy)} className="settings-fields">
        <legend>配置参数</legend>
        <label className="settings-field profile-name-field">配置名称<input autoFocus maxLength={80} value={name} onChange={(e) => { setName(e.target.value); onChange(); }} placeholder="例如 DeepSeek 日常、Kimi 长文本；留空自动命名" /></label>
        <div className="provider-options">{providers.map((p) => <button type="button" key={p.id} aria-pressed={draft.provider === p.id} className={`provider-option ${draft.provider === p.id ? 'selected' : ''}`} onClick={() => { if (p.id === draft.provider) return; setDraft(providerDefaults(p.id)); setApiKey(''); setConsent(false); onChange(); }}><span>{p.name}{draft.provider === p.id && <Check size={14} />}</span><small>{p.caption}</small></button>)}</div>
        <label className="settings-field">Base URL<input type="url" required maxLength={500} value={draft.baseUrl} onChange={(e) => change({ baseUrl: e.target.value })} placeholder="https://your-provider.example/v1" spellCheck={false} /></label>
        <p className="field-help">兼容 Chat Completions 的地址，不是官网首页。代理请选择“自定义”；密钥只发送到此地址，不跟随重定向。</p>
        <div className="settings-field-grid">
          <label className="settings-field">模型 ID<input required maxLength={200} value={draft.model} onChange={(e) => change({ model: e.target.value })} placeholder={provider.modelHint} spellCheck={false} /></label>
          <label className="settings-field">API Key<span className="secret-input"><KeyRound size={15} /><input type="password" autoComplete="new-password" required={!reuseKey} maxLength={4096} value={apiKey} onChange={(e) => { setApiKey(e.target.value); setConsent(false); onChange(); }} placeholder={reuseKey ? '此配置已有密钥，留空保持不变' : '输入这套配置的 API Key'} spellCheck={false} /></span></label>
        </div>
        <p className="field-help">修改时空白密钥仅复用本配置的密钥，不会使用其他配置的密钥。新增配置或修改供应商/地址时需重新填写。</p>
        <details className="settings-advanced"><summary>高级兼容参数 <span>JSON · Token · 思考模式</span></summary><div className="settings-field-grid">
          <label className="settings-field">JSON 输出模式<select value={draft.format} onChange={(e) => change({ format: e.target.value as Settings['format'] })}><option value="json_object">JSON Object</option><option value="json_schema">严格 JSON Schema</option><option value="prompt">仅提示词约束</option></select></label>
          <label className="settings-field">Token 参数<select value={draft.tokenParameter} onChange={(e) => change({ tokenParameter: e.target.value as Settings['tokenParameter'] })}><option value="max_tokens">max_tokens</option><option value="max_completion_tokens">max_completion_tokens</option></select></label>
          <label className="settings-field">思考模式<select value={draft.thinking} onChange={(e) => change({ thinking: e.target.value as Settings['thinking'] })}><option value="default">服务商默认（不传参数）</option><option value="disabled">关闭（thinking.type=disabled）</option></select></label>
          <label className="settings-field">单次输出 Token 上限<input type="number" min={256} max={32768} required value={draft.maxOutputTokens} onChange={(e) => change({ maxOutputTokens: Number(e.target.value) })} /></label>
        </div><p className="field-help">不同型号支持范围不同。拒绝、截断或非 JSON 响应会明确失败，不自动重试。关闭思考参数并非所有型号都支持。</p></details>
        <label className="settings-field">保存位置<select value={persistence} onChange={(e) => { setPersistence(e.target.value as 'session' | 'disk'); onChange(); }}><option value="disk" disabled={!settings.diskAvailable}>保存在本机，重启后自动恢复（默认）</option><option value="session">临时使用，不修改已保存配置</option></select></label>
        <p className="field-help storage-warning">{persistence === 'disk' ? '密钥将明文保存在 .algomotion/model-settings.json，不是系统钥匙串。macOS/Linux 使用 0600 文件权限；Windows 请自行限制目录 ACL。该目录已加入 Git 忽略，请勿分享或提交。' : '临时配置在服务重启后失效，不会删除或修改已有本机配置；重启后恢复上次持久保存的选择。'} 浏览器不持久化密钥。保存不会延长供应商密钥的有效期或额度。</p>
        <label className="settings-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />我同意发送一次简短请求测试连接，可能产生 API 费用。</label>
      </fieldset>
      <div className="settings-footer"><button type="button" className="secondary-button" disabled={Boolean(busy)} onClick={onBack}>取消编辑</button><div><button type="button" className="secondary-button" disabled={Boolean(busy) || !consent || !draft.model || !draft.baseUrl || !apiKey && !reuseKey} onClick={() => submit('test')}>{busy === 'test' && <LoaderCircle size={15} className="spin" />}测试连接</button><button className="primary-button" disabled={Boolean(busy)}>{busy === 'save' && <LoaderCircle size={15} className="spin" />}保存并使用</button></div></div>
      <p className="settings-footnote">保存不请求模型。测试只验证连接与简短 JSON，不代表完整生成成功或算法正确。</p>
    </form>
  </section>;
}
