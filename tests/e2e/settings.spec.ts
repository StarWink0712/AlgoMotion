import { expect, test, type Page } from '@playwright/test';
import { providerDefaults, type PublicModelSettings } from '../../src/engine/model-settings';

// Only UI transport is mocked. No real credentials, provider calls or disk writes.
async function settingsMock(page: Page) {
  const initial: PublicModelSettings = { ...providerDefaults('deepseek'), model: '', configured: false, hasKey: false, source: 'environment', diskAvailable: true, loadError: false, profiles: [], activeProfileId: null, revision: 'bf72dcca-2a84-486a-8a7b-554ad8cd332f' };
  let settings = { ...initial }, calls = 0;
  await page.route('**/api/health', (r) => r.fulfill({ json: { ok: true, aiConfigured: settings.configured } }));
  await page.route('**/api/generate/status', (r) => r.fulfill({ json: { model: settings.configured, sandbox: { available: true, message: 'MOCK Docker status, no execution' } } }));
  await page.route('**/api/model-settings**', async (route) => {
    const req = route.request();
    if (req.method() === 'GET') { await route.fulfill({ json: { settings, token: 'mock-local-token' } }); return; }
    expect(req.headers()['x-algomotion-settings-token']).toBe('mock-local-token');
    if (req.method() === 'DELETE') settings = { ...initial };
    else {
      const body = req.postDataJSON();
      if (req.url().endsWith('/test')) {
        expect(body.consent).toBe(true); calls++;
        await route.fulfill({ json: { ok: true, message: 'MOCK 连接与简短 JSON 响应通过；不是实际供应商联调。' } }); return;
      }
      const { apiKey, persistence, name, profileId, revision: _, ...config } = body;
      expect(Boolean(apiKey) || settings.hasKey).toBe(true);
      const id = profileId ?? 'c0fcdf01-3696-4290-855a-3c40ba833f5b';
      const profiles = persistence === 'disk' ? [{ ...config, id, name, hasKey: true }] : settings.profiles;
      settings = { ...config, source: persistence === 'disk' ? 'disk' : 'session', configured: true, hasKey: true, diskAvailable: true, loadError: false, profiles, activeProfileId: persistence === 'disk' ? id : null, revision: initial.revision };
    }
    await route.fulfill({ json: { settings } });
  });
  return { calls: () => calls };
}

test('MOCK settings: choose provider, save without cost, test with consent, keep secrets out of browser storage', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const mock = await settingsMock(page);
  await page.goto('/');
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  await page.getByRole('button', { name: '模型设置', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: '模型设置' })).toBeVisible();
  await expect(page.getByLabel('API Key', { exact: true })).toHaveCount(0);
  await expect(dialog.locator('form')).toHaveCount(0);
  await page.getByRole('button', { name: '新增配置', exact: true }).click();
  await page.getByRole('button', { name: /Kimi Moonshot/ }).click();
  await expect(page.getByLabel('Base URL', { exact: true })).toHaveValue('https://api.moonshot.cn/v1');
  await page.getByLabel('模型 ID', { exact: true }).fill('mock-kimi');
  await page.getByLabel('API Key', { exact: true }).fill('MOCK-NEVER-PERSIST-ME');
  await expect(page.getByRole('button', { name: '测试连接', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '保存并使用', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('配置已生效');
  expect(mock.calls()).toBe(0);
  await expect(dialog.locator('form')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('MOCK-NEVER-PERSIST-ME');
  await page.getByRole('button', { name: '修改', exact: true }).click();
  await expect(page.getByLabel('API Key', { exact: true })).toHaveValue('');
  await page.getByLabel('我同意发送一次简短请求测试连接，可能产生 API 费用。').check();
  await page.getByRole('button', { name: '测试连接', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('MOCK 连接');
  expect(mock.calls()).toBe(1);
  await page.getByLabel('模型 ID', { exact: true }).fill('unsaved-model');
  await expect(page.getByRole('status')).toHaveCount(0);
  await page.getByRole('dialog').evaluate((d) => { d.scrollTop = 0; });
  await page.screenshot({ path: testInfo.outputPath('settings-desktop.png') });
  await page.getByRole('button', { name: '关闭模型设置' }).click();
  await expect(page.getByLabel('执行时间轴', { exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: '模型设置', exact: true }).click();
  await expect(page.getByRole('dialog').locator('form')).toHaveCount(0);
  await page.getByRole('button', { name: '修改', exact: true }).click();
  await expect(page.getByLabel('模型 ID', { exact: true })).toHaveValue('mock-kimi');
  await expect(page.getByLabel('API Key', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: '取消编辑', exact: true }).click();
  await page.getByRole('button', { name: '清除全部界面配置' }).click();
  await page.getByRole('button', { name: '确认删除配置' }).click();
  await expect(page.getByRole('status')).toContainText('恢复使用环境变量');
  await page.getByRole('button', { name: '关闭模型设置' }).click();
  await page.screenshot({ path: testInfo.outputPath('workspace-desktop.png'), fullPage: true });
});

test('MOCK settings: mobile custom endpoint, advanced compatibility and generator preserve draft', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await settingsMock(page);
  await page.goto('/');
  await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await page.getByLabel('完整题目描述').fill('我的新算法问题，等待配置后继续。');
  await page.getByRole('button', { name: '配置模型 API' }).click();
  await page.getByRole('button', { name: '新增配置', exact: true }).click();
  await page.getByRole('button', { name: /自定义 兼容接口/ }).click();
  await page.getByLabel('Base URL', { exact: true }).fill('https://mock.example/v1');
  await page.getByLabel('模型 ID', { exact: true }).fill('mock-custom');
  await page.getByLabel('API Key', { exact: true }).fill('mock-secret');
  await page.getByText('高级兼容参数', { exact: false }).click();
  await page.getByRole('combobox', { name: 'JSON 输出模式', exact: true }).selectOption('prompt');
  await page.getByRole('combobox', { name: 'Token 参数', exact: true }).selectOption('max_tokens');
  await page.getByRole('combobox', { name: '保存位置', exact: true }).selectOption('disk');
  await expect(page.getByText(/密钥将明文保存在/)).toBeVisible();
  await page.getByRole('button', { name: '保存并使用', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('配置已生效');
  expect(await page.getByRole('dialog').evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(true);
  await page.getByRole('dialog').evaluate((d) => { d.scrollTop = 0; });
  await page.screenshot({ path: testInfo.outputPath('settings-mobile.png') });
  await page.getByRole('button', { name: '关闭模型设置' }).click();
  await expect(page.getByLabel('完整题目描述')).toHaveValue('我的新算法问题，等待配置后继续。');
  await expect(page.locator('.generation-connection')).toContainText('模型：已配置');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('generator-mobile.png'), fullPage: true });
});

test('settings API failure is visible, allows closing, and does not break preset playback', async ({ page }) => {
  await page.route('**/api/model-settings', (r) => r.fulfill({ status: 503, json: { error: 'unavailable' } }));
  await page.goto('/');
  await page.getByRole('button', { name: '模型设置', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('无法读取设置');
  await page.getByRole('button', { name: '关闭模型设置' }).click();
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  await expect(page.getByLabel('执行时间轴', { exact: true })).toHaveValue('1');
});
