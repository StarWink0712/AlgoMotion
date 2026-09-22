import { expect, test, type Page } from '@playwright/test';
import { getProblem, problems } from '../../src/engine/catalog';
import { runProblem } from '../../src/engine/run';
import { describeFrame } from '../../src/engine/presentation';
import { searchGreedySchemas } from '../../src/engine/presets/search-greedy';
import type { Frame, ProblemId } from '../../src/engine/types';

async function seek(page: Page, step: number) {
  const timeline = page.getByLabel('执行时间轴', { exact: true });
  await timeline.press('Home');
  for (let i = 0; i < step; i++) await timeline.press('ArrowRight');
}
async function checkRange(page: Page, frame: Frame) {
  const range = page.getByTestId('array-range');
  if (!frame.window || frame.window[1] < frame.window[0] || !frame.values.length) await expect(range).toHaveCount(0);
  else {
    await expect(range).toHaveAttribute('data-start', String(frame.window[0]));
    await expect(range).toHaveAttribute('data-end', String(frame.window[1]));
  }
}

for (const problem of problems.filter((p) => p.id in searchGreedySchemas)) {
  test(`desktop ${problem.id}: rewind restores every range, comparison and code line`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const requests: string[] = [];
    page.on('request', (r) => { if (r.method() === 'POST') requests.push(r.url()); });
    await page.goto(`/?problem=${problem.id}`);
    const trace = runProblem(problem.id, problem.sample);
    await page.getByLabel('执行时间轴', { exact: true }).press('End');
    for (let i = trace.frames.length - 1; i >= 0; i--) {
      const frame = trace.frames[i], cue = describeFrame(problem.id, frame, trace.frames[i - 1]);
      await checkRange(page, frame);
      await expect(page.getByTestId('teaching-equation')).toHaveText(cue.equation);
      await expect(page.locator('.current-line code')).toHaveText(problem.code.java.lines[problem.code.java.locations[frame.location] - 1]);
      await expect(page.getByTestId('dependency-arrow')).toHaveCount(cue.relation?.from.length ?? 0);
      if (i) await page.getByRole('button', { name: '上一步', exact: true }).click();
    }
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('desktop range contraction animates forward and cancels on a non-adjacent seek', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/?problem=search-insert-position');
  const trace = runProblem('search-insert-position', getProblem('search-insert-position').sample);
  const contraction = trace.frames.findIndex((f) => f.location === 'discard-right');
  await seek(page, contraction);
  const range = page.getByTestId('array-range');
  const frames = await range.locator('rect').evaluate((el) => (el.getAnimations()[0]?.effect as KeyframeEffect)?.getKeyframes().map((f) => f.width));
  expect(frames).toHaveLength(2); expect(frames![0]).not.toBe(frames![1]);
  await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  await checkRange(page, trace.frames[0]);
  expect(await range.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.screenshot({ path: 'test-results/search-greedy-binary-desktop.png', fullPage: true, animations: 'disabled' });
});

test('desktop categories, counts and new preset lookup are derived from the catalog', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: new RegExp(`^全部\\s*${problems.length}$`) })).toBeVisible();
  await expect(page.getByLabel('已回放题目数')).toHaveAttribute('max', String(problems.length));
  await page.getByRole('button', { name: '二分查找', exact: true }).click();
  await expect(page.locator('.problem-item')).toHaveCount(problems.filter((p) => p.category === '二分查找').length);
  await page.getByRole('button', { name: '贪心', exact: true }).click();
  await expect(page.locator('.problem-item')).toHaveCount(problems.filter((p) => p.category === '贪心').length);
  await page.getByLabel('搜索题目').fill('121');
  await page.locator('.problem-item').click();
  await expect(page.getByRole('heading', { name: '买卖股票的最佳时机', exact: true })).toBeVisible();
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  await expect(page.getByTestId('result')).toHaveText('5');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/search-greedy-stock-desktop.png', fullPage: true, animations: 'disabled' });
});

test('desktop boundaries: end insertion, duplicates, invalid input, no trade and blocked reach', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const cases: [ProblemId, unknown, unknown][] = [
    ['search-insert-position', { nums: [1, 3], target: 8 }, 2],
    ['search-insert-position', { nums: [], target: 0 }, 0],
    ['find-first-and-last-position-of-element-in-sorted-array', { nums: [2, 2, 2], target: 2 }, [0, 2]],
    ['search-in-rotated-sorted-array', { nums: [3, 1], target: 0 }, -1],
    ['best-time-to-buy-and-sell-stock', { prices: [9, 1, 2, 0] }, 1],
    ['best-time-to-buy-and-sell-stock', { prices: [3, 2, 1] }, 0],
    ['jump-game', { nums: [0, 10000] }, false],
    ['jump-game', { nums: [0] }, true],
    ['jump-game', { nums: [10000, 0] }, true],
  ];
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  for (const [id, input, result] of cases) {
    await page.goto(`/?problem=${id}`);
    await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input));
    await page.getByRole('button', { name: '运行输入', exact: true }).click();
    expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(result);
    await page.getByLabel('执行时间轴', { exact: true }).press('End');
    const trace = runProblem(id, input);
    await checkRange(page, trace.frames.at(-1)!);
    if (id === 'search-insert-position' && (input as { nums: number[] }).nums.length) {
      await expect(page.locator('.scene-pointer text')).toHaveText(['pos']);
      await expect(page.getByTestId('array-end-slot')).toContainText('2');
    }
    if (id === 'best-time-to-buy-and-sell-stock' && result === 0) await expect(page.getByTestId('dependency-arrow')).toHaveCount(0);
    if (id === 'jump-game' && result === false) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: 'test-results/search-greedy-blocked-desktop.png', fullPage: true, animations: 'disabled' });
    }
  }
  await page.getByLabel('自定义 JSON 输入').fill('{"nums":[]}');
  await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('输入不符合要求');
  await expect(page.getByTestId('preset-output')).toHaveText('true');
  expect(errors).toEqual([]);
});

test('desktop long search inputs scroll within the canvas and show coincident boundary pointers', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.goto('/?problem=search-insert-position');
  await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify({ nums: Array.from({ length: 24 }, (_, i) => i), target: 100 }));
  await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  await expect(page.getByTestId('preset-output')).toHaveText('24');
  expect(await page.locator('.scene-scroll').evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('自定义 JSON 输入').fill('{"nums":[1],"target":1}');
  await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await page.getByLabel('执行时间轴', { exact: true }).press('ArrowRight');
  const svg = page.getByRole('img', { name: '搜索插入位置的动态执行状态' });
  const bottom = (await svg.boundingBox())!;
  for (const p of await page.locator('.scene-pointer').all()) {
    const box = (await p.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(bottom.y + bottom.height);
  }
});
