import { expect, test, type Page } from '@playwright/test';
import { getProblem } from '../../src/engine/catalog';
import { runProblem } from '../../src/engine/run';
import type { ProblemId } from '../../src/engine/types';

async function seek(page: Page, step: number) {
  const timeline = page.getByLabel('执行时间轴');
  await timeline.press('Home');
  for (let i = 0; i < step; i++) await timeline.press('ArrowRight');
}

test('LIS visualizes valid and invalid dependencies, then a real optimal chain', async ({ page }) => {
  const trace = runProblem('longest-increasing-subsequence', getProblem('longest-increasing-subsequence').sample);
  await page.goto('/?problem=longest-increasing-subsequence');
  const compare = trace.frames.findIndex((f) => f.location === 'compare');
  await seek(page, compare);
  await expect(page.getByTestId('dependency-arrow')).toHaveAttribute('data-allowed', 'false');
  await expect(page.getByTestId('teaching-equation')).toContainText('10 ≥ 9');
  const update = trace.frames.findIndex((f) => f.location === 'transition');
  await seek(page, update);
  await expect(page.getByTestId('dependency-arrow')).toHaveAttribute('data-allowed', 'true');
  await expect(page.getByTestId('teaching-equation')).toContainText('max(1, 1 + 1) = 2');
  await expect(page.getByTestId('dp-tower').nth(3)).toHaveAttribute('data-length', '2');
  await page.getByLabel('执行时间轴').press('End');
  await expect(page.getByTestId('result')).toHaveText('4');
  await expect(page.locator('.sequence-chip > b')).toHaveText(['2', '5', '7', '101']);
  await page.getByLabel('执行时间轴').press('Home');
  await expect(page.locator('.sequence-chip')).toHaveCount(0);
});

test('swaps have actual animated positions and reset cancels in-flight motion', async ({ page }) => {
  await page.goto('/?problem=move-zeroes');
  const token = page.locator('[data-element-id="0"]');
  const start = await token.evaluate((el) => (el as SVGElement).style.transform);
  await page.getByLabel('执行时间轴').press('ArrowRight');
  await page.getByLabel('执行时间轴').press('ArrowRight');
  await page.getByLabel('执行时间轴').press('ArrowRight');
  const animation = await token.evaluate((el) => {
    const effect = el.getAnimations()[0]?.effect as KeyframeEffect | undefined;
    return { frames: effect?.getKeyframes().map((k) => k.transform), target: (el as SVGElement).style.transform };
  });
  expect(animation.target).not.toBe(start);
  expect(animation.frames).toHaveLength(3);
  expect(animation.frames![0]).not.toBe(animation.frames![2]);
  await page.getByLabel('执行时间轴').press('Home');
  expect(await token.evaluate((el) => (el as SVGElement).style.transform)).toBe(start);
  expect(await token.evaluate((el) => el.getAnimations().length)).toBe(0);
});

test('water geometry shows the best pair at completion', async ({ page }) => {
  await page.goto('/?problem=container-with-most-water');
  await page.getByLabel('执行时间轴').press('End');
  await expect(page.getByTestId('water-container')).toHaveAttribute('data-area', '49');
  await expect(page.getByTestId('teaching-cue')).toContainText('回看面积最大的容器');
});

test('reversal shows retiring edges separately from real live edges', async ({ page }) => {
  await page.goto('/?problem=reverse-linked-list');
  await seek(page, 2);
  await expect(page.getByTestId('retiring-edge')).toHaveCount(1);
  await expect(page.getByTestId('live-edge')).toHaveCount(3);
  await page.getByLabel('执行时间轴').press('End');
  await expect(page.getByTestId('retiring-edge')).toHaveCount(0);
  const edges = await page.getByTestId('live-edge').evaluateAll((items) => items.map((el) => [el.getAttribute('data-from'), el.getAttribute('data-to')]));
  expect(edges).toEqual([['1', '0'], ['2', '1'], ['3', '2'], ['4', '3']]);
});

test('reduced motion retains complete state without animated trajectories', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?problem=longest-increasing-subsequence');
  const trace = runProblem('longest-increasing-subsequence', getProblem('longest-increasing-subsequence').sample);
  await seek(page, trace.frames.findIndex((f) => f.location === 'transition'));
  await expect(page.getByTestId('dependency-arrow')).toHaveCount(1);
  await expect(page.locator('animateMotion')).toHaveCount(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test('vivid scenes fit mobile, large inputs and empty inputs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const inputs: [ProblemId, unknown][] = [
    ['longest-increasing-subsequence', { nums: Array.from({ length: 20 }, (_, i) => i) }],
    ['coin-change', { coins: [1, 2], amount: 24 }],
    ['binary-tree-level-order-traversal', { tree: [1, 2, 3, 4, 5, 6, 7] }],
    ['longest-increasing-subsequence', { nums: [] }],
    ['reverse-linked-list', { values: [] }],
    ['climbing-stairs', { n: 0 }],
  ];
  for (const [id, input] of inputs) {
    await page.goto(`/?problem=${id}`);
    await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input));
    await page.getByRole('button', { name: '运行输入' }).click();
    await page.getByLabel('执行时间轴').press('End');
    await expect(page.getByTestId('result')).toHaveText(JSON.stringify(runProblem(id, input).result));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
