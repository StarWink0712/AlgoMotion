import { expect, test } from '@playwright/test';

// Desktop-only output/layout acceptance. Presets run the real built-in executor, no provider mocks needed.
for (const width of [1280, 1440]) test(`desktop ${width}: output beside input, insight below code, compatibility note secondary`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/?problem=container-with-most-water');
  await page.getByRole('combobox', { name: '参考代码语言' }).selectOption('go');
  await expect(page.getByTestId('preset-output')).toHaveText('49');
  await expect(page.getByLabel('执行时间轴', { exact: true })).toHaveValue('0');
  const insight = page.getByRole('region', { name: '算法关键', exact: true });
  await expect(insight.getByRole('heading', { name: '这个算法的关键是什么？' })).toBeVisible();
  const codeBox = await page.locator('.preset-code-pane .code-scroll').boundingBox(), insightBox = await insight.boundingBox();
  expect(codeBox!.y + codeBox!.height).toBeLessThanOrEqual(insightBox!.y + 1);
  const inputBox = await page.locator('.below-workspace .input-panel').boundingBox(), outputBox = await page.getByRole('region', { name: '运行结果', exact: true }).boundingBox();
  expect(outputBox!.x).toBeGreaterThan(inputBox!.x + inputBox!.width);
  expect(Math.abs(outputBox!.y - inputBox!.y)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/output-desktop-${width}.png`, fullPage: true, animations: 'disabled' });
  const compatibility = page.getByText('min / max 使用 Go 1.21+ 内置函数。', { exact: true });
  await expect(compatibility).not.toBeVisible();
  await page.getByText('语言兼容说明', { exact: true }).click(); await expect(compatibility).toBeVisible();
  await insight.getByRole('button', { name: '理解背后的不变量' }).click();
  await expect(page.getByRole('heading', { name: '每一步都保持什么不变？' })).toBeVisible();
  await expect(page.getByTestId('preset-output')).toHaveText('49');
});

test('desktop output tracks successful execution, not pending/failed input or the playback cursor', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?problem=container-with-most-water');
  const input = page.getByLabel('自定义 JSON 输入'), output = page.getByTestId('preset-output');
  const panel = page.getByRole('region', { name: '运行结果', exact: true });
  await expect(output).toHaveText('49');
  await input.fill('{"heights":[0,0]}');
  await expect(panel).toHaveAttribute('data-input-state', 'pending');
  await expect(output).toHaveText('49');
  await panel.getByText('查看此输出对应的输入').click();
  expect(JSON.parse(await page.getByTestId('output-executed-input').innerText())).toEqual({ heights: [1, 8, 6, 2, 5, 4, 8, 3, 7] });
  await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(output).toHaveText('0'); await expect(panel).toHaveAttribute('data-input-state', 'current');
  expect(JSON.parse(await page.getByTestId('output-executed-input').innerText())).toEqual({ heights: [0, 0] });
  const timeline = page.getByLabel('执行时间轴', { exact: true });
  await expect(timeline).toHaveValue('0');
  for (const position of ['End', 'Home']) { await timeline.press(position); await expect(output).toHaveText('0'); }
  await input.fill('{broken'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(panel).toHaveAttribute('data-input-state', 'failed'); await expect(output).toHaveText('0');
  await expect(page.getByTestId('output-input-status')).toContainText('上次执行');
  await input.fill('{"heights": [-1, 2]}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(panel).toHaveAttribute('data-input-state', 'failed'); await expect(output).toHaveText('0');
  await page.getByRole('button', { name: '恢复样例', exact: true }).click();
  await expect(panel).toHaveAttribute('data-input-state', 'pending'); await expect(output).toHaveText('0');
  await page.getByRole('button', { name: '运行输入', exact: true }).click(); await expect(output).toHaveText('49');
  await expect(panel).toHaveAttribute('data-input-state', 'current');
});

test('desktop output accepts reordered/whitespace-only JSON and stays unchanged on language switch', async ({ page }) => {
  await page.goto('/?problem=two-sum');
  const input = page.getByLabel('自定义 JSON 输入'), output = page.getByTestId('preset-output');
  await input.fill('{ "target": 6, "nums": [3,3] }'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByRole('region', { name: '运行结果', exact: true })).toHaveAttribute('data-input-state', 'current');
  expect(JSON.parse(await output.innerText())).toEqual([0, 1]);
  await input.fill('{"nums":[3,3],"target":6}');
  await expect(page.getByRole('region', { name: '运行结果', exact: true })).toHaveAttribute('data-input-state', 'current');
  await page.getByRole('combobox', { name: '参考代码语言' }).selectOption('python');
  expect(JSON.parse(await output.innerText())).toEqual([0, 1]);
  await expect(page.getByLabel('执行时间轴', { exact: true })).toHaveValue('0');
});

test('desktop output handles empty arrays, nested arrays and impossible results; problem changes reset it', async ({ page }) => {
  await page.goto('/?problem=two-sum');
  for (const example of [
    { id: 'two-sum', input: { nums: [], target: 1 }, result: [] },
    { id: 'binary-tree-level-order-traversal', input: { tree: [1, 2, 3] }, result: [[1], [2, 3]] },
    { id: 'coin-change', input: { coins: [2], amount: 3 }, result: -1 },
  ]) {
    await page.goto(`/?problem=${example.id}`);
    await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(example.input));
    await page.getByRole('button', { name: '运行输入', exact: true }).click();
    expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(example.result);
    await expect(page.getByLabel('执行时间轴', { exact: true })).toHaveValue('0');
  }
  await page.locator('.problem-item').filter({ hasText: '盛最多水的容器' }).click();
  await expect(page.getByTestId('preset-output')).toHaveText('49');
  await expect(page.getByRole('region', { name: '算法关键', exact: true })).toContainText('较短');
});
