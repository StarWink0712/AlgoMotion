import { expect, test } from '@playwright/test';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { createApp } from '../../server/app';
import { ModelSettingsStore } from '../../server/model-settings';

// Real settings API and temporary files; keys are synthetic and providers/Python never run.
for (const width of [1440, 390]) test(`persistent model profiles ${width}px: list first, explicit editing, keyless switching and restart`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  const dir = mkdtempSync(join(tmpdir(), 'algomotion-profiles-browser-')), file = join(dir, 'model-settings.json');
  let server: Server | undefined, base = '', providerCalls = 0;
  const errors: string[] = [], writes: { path: string; body: Record<string, unknown> }[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const start = async () => {
    const fetcher: typeof fetch = async () => { providerCalls++; throw new Error('Provider must not run in profile management'); };
    server = createApp({}, fetcher, { probe: async () => ({ available: false, message: 'No Python in this test' }), run: async () => { throw new Error('No Python'); } }, new ModelSettingsStore({}, file)).listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const address = server.address(); if (!address || typeof address === 'string') throw new Error(); base = `http://127.0.0.1:${address.port}`;
  };
  const close = async () => { if (server) await new Promise<void>((resolve) => server!.close(() => resolve())); server = undefined; };
  const card = (name: string) => page.getByRole('article', { name, exact: true });
  const noEditor = async () => {
    await expect(page.getByRole('dialog').locator('form')).toHaveCount(0);
    await expect(page.getByLabel('API Key', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Base URL', { exact: true })).toHaveCount(0);
  };
  try {
    await start();
    await page.route('**/api/model-settings**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() !== 'GET') writes.push({ path, body: route.request().postDataJSON() });
      const response = await route.fetch({ url: `${base}${path}` });
      expect(await response.text()).not.toContain('MOCK-profile');
      await route.fulfill({ response });
    });
    await page.goto('/'); await page.getByRole('button', { name: '模型设置', exact: true }).click();
    await expect(page.getByText('还没有保存的配置', { exact: true })).toBeVisible();
    await noEditor(); expect(writes).toHaveLength(0);
    await page.getByRole('button', { name: '新增配置', exact: true }).click();
    await expect(page.getByRole('combobox', { name: '保存位置', exact: true })).toHaveValue('disk');
    await page.getByLabel('API Key', { exact: true }).fill('MOCK-profile-discard');
    await page.getByRole('button', { name: '取消编辑', exact: true }).click();
    await noEditor(); expect(writes).toHaveLength(0);
    await page.getByRole('button', { name: '新增配置', exact: true }).click();
    await expect(page.getByLabel('API Key', { exact: true })).toHaveValue('');
    await page.getByLabel('配置名称', { exact: true }).fill('DeepSeek 日常');
    await page.getByLabel('模型 ID', { exact: true }).fill('mock-deepseek');
    await page.getByLabel('API Key', { exact: true }).fill('MOCK-profile-deepseek');
    await page.getByRole('button', { name: '保存并使用', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('重启后自动恢复');
    await noEditor(); await expect(card('DeepSeek 日常')).toHaveAttribute('data-active', 'true');
    const a = await card('DeepSeek 日常').getAttribute('data-profile-id');
    await page.getByRole('button', { name: '新增配置', exact: true }).click();
    await page.getByRole('button', { name: /Kimi Moonshot/ }).click();
    await page.getByLabel('配置名称', { exact: true }).fill('Kimi 长文本');
    await page.getByLabel('模型 ID', { exact: true }).fill('mock-kimi');
    await expect(page.getByLabel('API Key', { exact: true })).toHaveAttribute('required', '');
    await page.getByLabel('API Key', { exact: true }).fill('MOCK-profile-kimi');
    await page.getByRole('button', { name: '保存并使用', exact: true }).click();
    await expect(card('Kimi 长文本')).toHaveAttribute('data-active', 'true'); await noEditor();
    const b = await card('Kimi 长文本').getAttribute('data-profile-id');
    expect(a).not.toBe(b);
    expect(JSON.parse(readFileSync(file, 'utf8')).profiles).toHaveLength(2);
    if (process.platform !== 'win32') expect(statSync(file).mode & 0o777).toBe(0o600);
    await card('DeepSeek 日常').getByRole('button', { name: '使用此配置', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('无需重填密钥'); await noEditor();
    expect(writes.at(-1)!.path).toBe('/api/model-settings/activate');
    expect(Object.keys(writes.at(-1)!.body).sort()).toEqual(['profileId', 'revision']);
    expect(writes.at(-1)!.body.profileId).toBe(a);
    await expect(card('DeepSeek 日常')).toHaveAttribute('data-active', 'true');
    const beforeCancel = readFileSync(file, 'utf8'), beforeCount = writes.length;
    await card('Kimi 长文本').getByRole('button', { name: '修改', exact: true }).click();
    await expect(page.getByLabel('模型 ID', { exact: true })).toHaveValue('mock-kimi');
    await expect(page.getByLabel('API Key', { exact: true })).toHaveValue('');
    expect(await page.getByLabel('API Key', { exact: true }).getAttribute('required')).toBeNull();
    await page.getByLabel('配置名称', { exact: true }).fill('未保存的名字');
    await page.getByLabel('API Key', { exact: true }).fill('MOCK-profile-unsaved-edit');
    await page.getByRole('button', { name: '返回配置列表', exact: true }).click();
    await noEditor(); expect(writes).toHaveLength(beforeCount); expect(readFileSync(file, 'utf8')).toBe(beforeCancel);
    await expect(card('Kimi 长文本')).toBeVisible(); await expect(card('DeepSeek 日常')).toHaveAttribute('data-active', 'true');
    await page.getByRole('dialog').screenshot({ path: `test-results/profiles-list-${width}.png`, animations: 'disabled' });
    expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

    // A fresh API/store instance receives only the file path, never old in-memory credentials.
    await page.getByRole('button', { name: '关闭模型设置' }).click();
    await close(); await start(); await page.reload();
    await page.getByRole('button', { name: '模型设置', exact: true }).click();
    await noEditor(); await expect(card('DeepSeek 日常')).toHaveAttribute('data-active', 'true');
    await card('Kimi 长文本').getByRole('button', { name: '修改', exact: true }).click();
    await page.getByLabel('模型 ID', { exact: true }).fill('mock-kimi-v2');
    const beforeSaveFailure = readFileSync(file, 'utf8');
    await page.route('**/api/model-settings', (route) => route.fulfill({ status: 500, json: { error: 'MOCK save failed' } }), { times: 1 });
    await page.getByRole('button', { name: '保存并使用', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('MOCK save failed');
    await expect(page.getByLabel('模型 ID', { exact: true })).toHaveValue('mock-kimi-v2');
    expect(readFileSync(file, 'utf8')).toBe(beforeSaveFailure);
    await page.getByRole('button', { name: '保存并使用', exact: true }).click();
    await expect(card('Kimi 长文本')).toHaveAttribute('data-active', 'true'); await noEditor();
    const persisted = JSON.parse(readFileSync(file, 'utf8'));
    expect(persisted.profiles.find((p: { id: string }) => p.id === b).config.key).toBe('MOCK-profile-kimi');
    expect(persisted.profiles.find((p: { id: string }) => p.id === a).config.key).toBe('MOCK-profile-deepseek');
    await card('DeepSeek 日常').getByRole('button', { name: '使用此配置', exact: true }).click();
    await expect(card('DeepSeek 日常')).toHaveAttribute('data-active', 'true');

    // Failed selection stays in the list, with the previously active profile and file intact.
    const beforeFailure = readFileSync(file, 'utf8');
    await page.route('**/api/model-settings/activate', (route) => route.fulfill({ status: 503, json: { error: 'MOCK switch failed' } }), { times: 1 });
    await card('Kimi 长文本').getByRole('button', { name: '使用此配置', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('MOCK switch failed'); await noEditor();
    await expect(card('DeepSeek 日常')).toHaveAttribute('data-active', 'true'); expect(readFileSync(file, 'utf8')).toBe(beforeFailure);
    await card('Kimi 长文本').getByRole('button', { name: '修改', exact: true }).click();
    await page.getByLabel('Base URL', { exact: true }).fill('https://api.moonshot.ai/v1');
    await expect(page.getByLabel('API Key', { exact: true })).toHaveAttribute('required', '');
    await page.keyboard.press('Escape'); await noEditor();
    await card('Kimi 长文本').getByRole('button', { name: '删除 Kimi 长文本', exact: true }).click();
    await page.getByRole('button', { name: '取消删除', exact: true }).click();
    expect(JSON.parse(readFileSync(file, 'utf8')).profiles).toHaveLength(2);
    await card('Kimi 长文本').getByRole('button', { name: '删除 Kimi 长文本', exact: true }).click();
    await page.getByRole('button', { name: '确认删除配置', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('其他已保存配置仍保留');
    expect(readFileSync(file, 'utf8')).not.toContain('MOCK-profile-kimi');
    await expect(card('DeepSeek 日常')).toHaveAttribute('data-active', 'true');
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('MOCK-profile');
    expect(providerCalls).toBe(0); expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await close(); rmSync(dir, { recursive: true, force: true }); }
});
