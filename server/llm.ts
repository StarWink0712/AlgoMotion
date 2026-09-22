import { providerForUrl, providers, type ProviderId } from '../src/engine/model-settings';

export interface LlmConfig {
  baseUrl?: string; key?: string; model?: string; format?: string;
  provider?: ProviderId; tokenParameter?: 'max_tokens' | 'max_completion_tokens';
  thinking?: 'default' | 'disabled'; maxOutputTokens?: number;
}
export class LlmError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}
export const isConfigured = (config: LlmConfig) => Boolean(config.baseUrl && config.key && config.model);
export function normalizeBaseUrl(baseUrl: string, provider?: ProviderId) {
  let url: URL;
  try { url = new URL(baseUrl.trim()); } catch { throw new LlmError(400, 'Base URL 无效，请填写服务商的 API 地址。'); }
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new LlmError(400, 'API 地址必须使用 HTTPS，且不能包含凭据或查询参数；本机服务可使用 HTTP。');
  if (provider && provider !== 'custom' && (!providers.find((p) => p.id === provider)!.hosts.includes(url.hostname) || url.port)) throw new LlmError(400, '该地址不是所选供应商的官方地址。代理或其他服务请明确选择“自定义”。');
  url.pathname = url.pathname.replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, '') || '/';
  return url.toString().replace(/\/+$/, '');
}
export function completionBody(config: LlmConfig, system: string, user: string, schema: unknown, name: string, tokens: number) {
  const preset = providers.find((p) => p.id === (config.provider ?? providerForUrl(config.baseUrl)))!;
  const parameter = config.tokenParameter ?? (preset.id === 'custom' ? 'max_completion_tokens' : preset.tokenParameter);
  const format = config.format ?? (config.provider ? preset.format : 'json_schema');
  const responseFormat = format === 'prompt' ? {} : {
    response_format: format === 'json_object' ? { type: 'json_object' } : { type: 'json_schema', json_schema: { name, strict: true, schema } },
  };
  return {
    model: config.model,
    messages: [
      { role: 'system', content: `${system}\nReturn ONLY JSON conforming to this output schema (no Markdown): ${JSON.stringify(schema)}` },
      { role: 'user', content: user },
    ],
    ...responseFormat,
    [parameter]: Math.min(tokens, config.maxOutputTokens ?? tokens),
    ...(config.thinking === 'disabled' ? { thinking: { type: 'disabled' } } : {}),
  };
}
export async function requestJson(config: LlmConfig, fetcher: typeof fetch, options: {
  system: string; user: string; schema: unknown; name: string; tokens: number;
  timeout?: number; maxBytes?: number; signal?: AbortSignal;
}): Promise<unknown> {
  if (!isConfigured(config)) throw new LlmError(503, '尚未配置模型 API。请打开右上角“模型设置”，选择供应商并填写密钥与模型名；也可继续使用 .env。', 'MODEL_NOT_CONFIGURED');
  const base = normalizeBaseUrl(config.baseUrl!, config.provider);
  const timeout = AbortSignal.timeout(options.timeout ?? 90_000);
  const signal = AbortSignal.any([timeout, ...(options.signal ? [options.signal] : [])]);
  try {
    signal.throwIfAborted();
    const response = await fetcher(`${base}/chat/completions`, {
      method: 'POST', redirect: 'error', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` },
      body: JSON.stringify(completionBody(config, options.system, options.user, options.schema, options.name, options.tokens)),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new LlmError(502, `模型服务返回 HTTP ${response.status}。请核对密钥、模型、余额及兼容参数；未自动重试。`, 'MODEL_HTTP_ERROR');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new LlmError(502, '模型服务返回空响应。未执行生成程序。', 'MODEL_EMPTY_RESPONSE');
    const chunks: Uint8Array[] = []; let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > (options.maxBytes ?? 180_000)) { await reader.cancel(); throw new LlmError(502, '模型响应超过字节上限，已停止读取。', 'MODEL_RESPONSE_LIMIT'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    let envelope: unknown;
    try { envelope = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new LlmError(502, '供应商响应外层不是合法 JSON；请检查接口兼容性。', 'MODEL_ENVELOPE_JSON'); }
    const choice = (envelope as { choices?: { finish_reason?: string; message?: { refusal?: unknown; content?: unknown } }[] } | null)?.choices?.[0];
    if (choice?.message?.refusal || choice?.finish_reason === 'content_filter') throw new LlmError(502, '模型拒绝了本次请求；未公开拒绝原文。', 'MODEL_REFUSAL');
    if (choice?.finish_reason === 'length') throw new LlmError(502, '模型输出因 token 上限被截断；可调整输出额度或缩小请求。', 'MODEL_TRUNCATED');
    if (choice?.finish_reason !== 'stop' || typeof choice?.message?.content !== 'string') throw new LlmError(502, '供应商响应缺少完整的文本 completion，请检查兼容协议。', 'MODEL_ENVELOPE_SCHEMA');
    try { return JSON.parse(choice.message.content); }
    catch { throw new LlmError(502, 'completion 内容不是合法 JSON；不接受 Markdown 代码围栏或未转义字符串。', 'MODEL_CONTENT_JSON'); }
  } catch (e) {
    if (e instanceof LlmError) throw e;
    if (options.signal?.aborted) throw new LlmError(502, '模型请求已取消。', 'MODEL_CANCELLED');
    if (timeout.aborted) throw new LlmError(502, '模型请求超时。未自动重试。', 'MODEL_TIMEOUT');
    throw new LlmError(502, '模型连接或响应读取失败。请检查网络与接口地址；未公开传输异常。', 'MODEL_TRANSPORT');
  }
}
