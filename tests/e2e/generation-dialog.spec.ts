import { expect, test, type Page } from '@playwright/test';
import { fixtureProgram, mockBundle } from '../generated-fixtures';

// MOCK model/runner transport only. Task ownership and dialog interaction are real UI behavior.
async function service(page: Page) {
  const p = fixtureProgram('grid-shortest-4');
  let stage = 'generating', rejectSubmit = false, parses = 0, jobs = 0, deletes = 0;
  await page.route('**/api/generate/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/status')) return route.fulfill({ json: { model: true, sandbox: { available: true, message: 'MOCK sandbox, no execution' } } });
    if (path.endsWith('/parse')) { parses++; return route.fulfill({ json: { contract: p.contract } }); }
    if (path.endsWith('/jobs')) {
      jobs++;
      return rejectSubmit
        ? route.fulfill({ status: 503, json: { code: 'MOCK_UNAVAILABLE', error: 'MOCK 提交失败，请重试。' } })
        : route.fulfill({ status: 202, json: { id: 'dialog-job' } });
    }
    if (route.request().method() === 'DELETE') { deletes++; return route.fulfill({ json: { cancelled: true } }); }
    return route.fulfill({ json: { id: 'dialog-job', stage, ...(stage === 'complete' ? { program: p, bundle: mockBundle('grid-shortest-4') } : {}), ...(stage === 'failed' ? { error: { code: 'MOCK_EXECUTION', message: 'MOCK 执行失败，未产生轨迹。' } } : {}) } });
  });
  return { p, counts: () => ({ parses, jobs, deletes }), stage: (next: string) => { stage = next; }, reject: (value: boolean) => { rejectSubmit = value; } };
}
async function open(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '生成新题演示', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}
async function review(page: Page, source: string) {
  await page.getByLabel('完整题目描述').fill(source);
  await page.getByRole('button', { name: '解析题意与约定' }).click();
  await page.getByRole('checkbox', { name: /我已核对/ }).check();
}

test('desktop dialog retains draft/review on close, traps focus and fits its scrollable window', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const mock = await service(page), dialog = await open(page);
  await expect(page.getByLabel('完整题目描述')).toBeFocused();
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.getByLabel('完整题目描述').fill(mock.p.source);
  await dialog.screenshot({ path: 'test-results/generation-dialog-entry-1280.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('完整题目描述')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '等待新题演示' })).toBeFocused();
  await page.getByRole('button', { name: '编辑题目与约定', exact: true }).click();
  await expect(page.getByLabel('完整题目描述')).toHaveValue(mock.p.source);
  await review(page, mock.p.source);
  await dialog.screenshot({ path: 'test-results/generation-dialog-1280.png', animations: 'disabled' });
  const bounds = await dialog.boundingBox();
  expect(bounds!.height).toBeLessThanOrEqual(752);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.getByRole('button', { name: '关闭新题窗口' })).toBeInViewport();
  await expect(page.getByRole('button', { name: '返回主界面', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: '关闭新题窗口' }).click();
  await page.getByRole('button', { name: '编辑题目与约定', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /我已核对/ })).toBeChecked();
  await expect(page.getByRole('button', { name: '确认并生成 Python 演示' })).toBeEnabled();
  expect(mock.counts()).toEqual({ parses: 1, jobs: 0, deletes: 0 });
});

test('accepted job closes the window, continues on main page and never cancels when reopened/closed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  const mock = await service(page), dialog = await open(page);
  await review(page, mock.p.source);
  await page.getByRole('button', { name: '确认并生成 Python 演示' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('真实生成阶段').locator('.current')).toHaveText('生成');
  await expect(page.getByRole('heading', { name: '正在生成演示' })).toBeFocused();
  await page.getByRole('button', { name: '查看题目与约定' }).click();
  await expect(page.getByLabel('完整题目描述')).toBeDisabled();
  await page.getByRole('button', { name: '关闭新题窗口' }).click();
  mock.stage('executing');
  await expect(page.getByLabel('真实生成阶段').locator('.current')).toHaveText('执行');
  await page.screenshot({ path: 'test-results/generation-main-progress-1440.png', animations: 'disabled' });
  mock.stage('checking');
  await expect(page.getByLabel('真实生成阶段').locator('.current')).toHaveText('检查');
  mock.stage('complete');
  await expect(page.getByLabel('生成执行时间轴')).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('完整题目描述')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '生成演示工作台' })).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/generation-main-result-1440.png', animations: 'disabled' });
  expect(mock.counts()).toEqual({ parses: 1, jobs: 1, deletes: 0 });
});

test('submission rejection stays in the window; later failure is diagnosable and retry reuses review', async ({ page }) => {
  const mock = await service(page), dialog = await open(page);
  mock.reject(true);
  await review(page, mock.p.source);
  await page.getByRole('button', { name: '确认并生成 Python 演示' }).click();
  await expect(dialog.getByRole('alert')).toContainText('MOCK_UNAVAILABLE');
  await expect(page.getByLabel('完整题目描述')).toHaveValue(mock.p.source);
  mock.reject(false); mock.stage('failed');
  await page.getByRole('button', { name: '确认并生成 Python 演示' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('MOCK_EXECUTION');
  await page.getByRole('button', { name: '编辑题目与约定', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('MOCK_EXECUTION');
  await expect(page.getByRole('checkbox', { name: /我已核对/ })).toBeChecked();
  mock.stage('complete');
  await page.getByRole('button', { name: '确认并生成 Python 演示' }).click();
  await expect(page.getByLabel('生成执行时间轴')).toBeVisible();
  expect(mock.counts()).toEqual({ parses: 1, jobs: 3, deletes: 0 });
});

test('closing during parsing retains the pending request; settings temporarily replaces the form', async ({ page }) => {
  const mock = await service(page), dialog = await open(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/generate/parse', async (route) => { await pending; await route.fulfill({ json: { contract: mock.p.contract } }); });
  await page.getByLabel('完整题目描述').fill(mock.p.source);
  await page.getByRole('button', { name: '解析题意与约定' }).click();
  await expect(page.getByLabel('真实生成阶段').locator('.current')).toHaveText('解析');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  release();
  await expect(page.getByLabel('真实生成阶段').locator('.current')).toHaveText('确认约定');
  await page.getByRole('button', { name: '编辑题目与约定', exact: true }).click();
  await expect(page.getByRole('heading', { name: '默认约定与关键假设' })).toBeVisible();
  await page.getByRole('button', { name: '配置模型 API' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('完整题目描述')).toHaveValue(mock.p.source);
  await expect(page.getByRole('heading', { name: '默认约定与关键假设' })).toBeVisible();
  expect(mock.counts().deletes).toBe(0);
});

test('explicit main-page cancellation deletes only the accepted job and preserves review', async ({ page }) => {
  const mock = await service(page), dialog = await open(page);
  await review(page, mock.p.source);
  await page.getByRole('button', { name: '确认并生成 Python 演示' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: '取消任务', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('任务已取消');
  await expect.poll(() => mock.counts().deletes).toBe(1);
  await page.getByRole('button', { name: '编辑题目与约定', exact: true }).click();
  await expect(page.getByLabel('完整题目描述')).toHaveValue(mock.p.source);
});

test('new accepted task removes old output; preset navigation does not unmount or cancel generation', async ({ page }) => {
  const mock = await service(page), dialog = await open(page);
  const previous = mockBundle('grid-shortest-4'); previous.program.contract.title = 'MOCK 上一次演示';
  await page.getByLabel('导入生成结果').setInputFiles({ name: 'previous.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(previous)) });
  await expect(page.getByRole('heading', { name: 'MOCK 上一次演示', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await review(page, mock.p.source);
  await page.getByRole('button', { name: '确认并生成 Python 演示' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('生成执行时间轴')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'MOCK 上一次演示', exact: true })).toHaveCount(0);
  await page.locator('.problem-item').filter({ hasText: '两数之和' }).click();
  await expect(page.getByRole('heading', { name: '两数之和', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('真实生成阶段').locator('.current')).toHaveText('生成');
  mock.stage('complete');
  await expect(page.getByLabel('生成执行时间轴')).toBeVisible();
  expect(mock.counts()).toEqual({ parses: 1, jobs: 1, deletes: 0 });
});
