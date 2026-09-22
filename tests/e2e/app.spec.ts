import { expect, test } from '@playwright/test';
import { problems } from '../../src/engine/catalog';
import { runProblem } from '../../src/engine/run';
import { codeLanguages } from '../../src/engine/types';

test('plays, seeks, rewinds and exports a real trace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '两数之和', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  await expect(page.getByLabel('执行时间轴')).toHaveValue('1');
  await page.getByRole('button', { name: '播放', exact: true }).click();
  await expect(page.getByLabel('执行时间轴')).not.toHaveValue('1', { timeout: 4000 });
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.getByLabel('执行时间轴').press('End');
  await expect(page.getByTestId('result')).toHaveText('[0,1]');
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  await expect(page.getByTestId('result')).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出执行轨迹' }).click();
  expect((await download).suggestedFilename()).toBe('algomotion-two-sum.trace.json');
});

test('validates custom inputs and updates results', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: '自定义 JSON 输入' });
  await input.fill('{invalid');
  await page.getByRole('button', { name: '运行输入' }).click();
  await expect(page.getByRole('alert')).toContainText('合法 JSON');
  await input.fill('{"nums":[3,3],"target":6}');
  await page.getByRole('button', { name: '运行输入' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const timeline = page.getByLabel('执行时间轴');
  await timeline.press('End');
  await expect(page.getByTestId('result')).toHaveText('[0,1]');
});

for (const problem of problems) {
  test(`${problem.id} renders every sample frame without page errors`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/?problem=${problem.id}`);
    const trace = runProblem(problem.id, problem.sample);
    expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
    await expect(page.getByLabel('执行时间轴', { exact: true })).toHaveValue('0');
    for (let i = 1; i < trace.frames.length; i++) await page.getByLabel('执行时间轴').press('ArrowRight');
    await expect(page.getByTestId('result')).toHaveText(typeof trace.result === 'string' ? trace.result : JSON.stringify(trace.result));
    for (const language of codeLanguages) {
      await page.getByRole('combobox', { name: '参考代码语言' }).selectOption(language);
      for (const [key, index] of [['Home', 0], ['ArrowRight', 1], ['End', trace.frames.length - 1]] as const) {
        await page.getByLabel('执行时间轴').press(key);
        const line = problem.code[language].locations[trace.frames[index].location];
        await expect(page.locator('.current-line code')).toHaveText(problem.code[language].lines[line - 1]);
      }
    }
    expect(errors).toEqual([]);
    await page.getByRole('button', { name: '解题思路', exact: true }).click();
    await expect(page.getByText(problem.invariant, { exact: true })).toBeVisible();
  });
}

for (const width of [1440, 390]) test(`preset sidebar replaces duplicate import entry at ${width}px without matching requests`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const matchingRequests: string[] = [];
  page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/match') matchingRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '打开预设题', includeHidden: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '模型设置', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '生成新题演示', exact: true })).toBeVisible();
  if (width < 720) await page.getByRole('button', { name: '打开题库', exact: true }).click();
  await expect(page.locator('.library-launch')).toBeVisible();
  await page.getByRole('textbox', { name: '搜索题目' }).fill('206');
  await expect(page.locator('.problem-item')).toHaveCount(1);
  await page.locator('.problem-item').click();
  await expect(page.getByRole('heading', { name: '反转链表', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(matchingRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('sidebar search and category filters work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '搜索题目' }).fill('322');
  await expect(page.locator('.problem-item')).toHaveCount(1);
  await page.locator('.problem-item').click();
  await expect(page.getByRole('heading', { name: '零钱兑换', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: '搜索题目' }).fill('');
  await page.getByRole('button', { name: '动态规划', exact: true }).click();
  const expected = problems.filter((p) => p.category === '动态规划');
  await expect(page.locator('.problem-item')).toHaveCount(expected.length);
  for (const problem of expected) await expect(page.locator('.problem-item').filter({ hasText: problem.title })).toHaveCount(1);
});

test('mobile viewport has no page overflow and can switch problems', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '打开题库' })).toBeVisible();
  await page.getByRole('button', { name: '打开题库' }).click();
  await page.locator('.problem-item').filter({ hasText: '反转链表' }).click();
  await expect(page.getByRole('heading', { name: '反转链表', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: '参考代码语言' }).selectOption('python');
  await expect(page.locator('.code-filename')).toContainText('.py');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('language selection preserves playback state and survives navigation and reload', async ({ page }) => {
  await page.goto('/?problem=binary-tree-level-order-traversal');
  const language = page.getByRole('combobox', { name: '参考代码语言' });
  await expect(language).toHaveValue('java');
  await expect(language.locator('option')).toHaveText(['Java', 'Go', 'Python']);
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  const values = await page.getByTestId('visual-canvas').innerText();
  await language.selectOption('go');
  await expect(page.getByLabel('执行时间轴')).toHaveValue('1');
  await expect(page.getByTestId('visual-canvas')).toHaveText(values, { useInnerText: true });
  await page.getByRole('button', { name: '解题思路', exact: true }).click();
  await page.getByRole('button', { name: '动态演示', exact: true }).click();
  await expect(language).toHaveValue('go');
  await page.reload();
  await expect(language).toHaveValue('go');
  await page.locator('.problem-item').filter({ hasText: '两数之和' }).click();
  await expect(language).toHaveValue('go');
});

test('invalid saved language falls back to Java', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('algomotion:code-language', 'javascript'));
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: '参考代码语言' })).toHaveValue('java');
});
