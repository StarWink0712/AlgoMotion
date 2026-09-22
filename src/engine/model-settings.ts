import { z } from 'zod';

export const providerIds = ['deepseek', 'moonshot', 'openai', 'custom'] as const;
export type ProviderId = typeof providerIds[number];
export const modelSettingsSchema = z.object({
  provider: z.enum(providerIds), baseUrl: z.string().trim().min(1).max(500),
  model: z.string().trim().min(1).max(200).regex(/^[^\s\x00-\x1f]+$/),
  format: z.enum(['json_object', 'json_schema', 'prompt']),
  tokenParameter: z.enum(['max_tokens', 'max_completion_tokens']),
  thinking: z.enum(['default', 'disabled']),
  maxOutputTokens: z.number().int().min(256).max(32768),
}).strict();
export type ModelSettings = z.infer<typeof modelSettingsSchema>;
export const profileLimit = 20;
export const profileNameSchema = z.string().trim().min(1).max(80).regex(/^[^\x00-\x1f\x7f]*$/);
export const settingsUpdateSchema = modelSettingsSchema.extend({
  apiKey: z.string().trim().max(4096).regex(/^[^\x00-\x1f\x7f]*$/).optional(),
  persistence: z.enum(['session', 'disk']),
  profileId: z.string().uuid().nullable().optional(),
  name: profileNameSchema.optional(),
  revision: z.string().uuid().optional(),
}).strict();
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
export interface PublicModelProfile extends ModelSettings { id: string; name: string; hasKey: boolean }
export interface PublicModelSettings extends Omit<ModelSettings, 'model'> {
  model: string; hasKey: boolean; configured: boolean;
  source: 'environment' | 'session' | 'disk'; diskAvailable: boolean; loadError: boolean;
  profiles: PublicModelProfile[]; activeProfileId: string | null; revision: string;
}
export const providers: { id: ProviderId; name: string; caption: string; baseUrl: string; modelHint: string; format: ModelSettings['format']; tokenParameter: ModelSettings['tokenParameter']; thinking: ModelSettings['thinking']; hosts: string[] }[] = [
  { id: 'deepseek', name: 'DeepSeek', caption: 'DeepSeek 官方 API', baseUrl: 'https://api.deepseek.com', modelHint: '例如 deepseek-flash', format: 'json_object', tokenParameter: 'max_tokens', thinking: 'disabled', hosts: ['api.deepseek.com'] },
  { id: 'moonshot', name: 'Kimi', caption: 'Moonshot 开放平台', baseUrl: 'https://api.moonshot.cn/v1', modelHint: '填写平台可用型号，例如 kimi-k2.6', format: 'json_object', tokenParameter: 'max_tokens', thinking: 'default', hosts: ['api.moonshot.cn', 'api.moonshot.ai'] },
  { id: 'openai', name: 'OpenAI', caption: 'OpenAI 官方 API', baseUrl: 'https://api.openai.com/v1', modelHint: '填写账户支持的模型 ID', format: 'json_schema', tokenParameter: 'max_completion_tokens', thinking: 'default', hosts: ['api.openai.com'] },
  { id: 'custom', name: '自定义', caption: '兼容接口 / 本地服务', baseUrl: '', modelHint: '服务商提供的模型 ID', format: 'json_object', tokenParameter: 'max_tokens', thinking: 'default', hosts: [] },
];
export function providerForUrl(baseUrl?: string): ProviderId {
  try { return providers.find((p) => p.hosts.includes(new URL(baseUrl!).hostname))?.id ?? 'custom'; } catch { return 'custom'; }
}
export function providerDefaults(provider: ProviderId): ModelSettings {
  const preset = providers.find((p) => p.id === provider)!;
  return { provider, baseUrl: preset.baseUrl, model: '', format: preset.format, tokenParameter: preset.tokenParameter, thinking: preset.thinking, maxOutputTokens: 8192 };
}
