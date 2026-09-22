import { test, expect, type Page } from '@playwright/test';
import { runProblem } from '../../src/engine/run';
import { explorationProblems } from '../../src/engine/presets/exploration-catalog';
import { explorationView, type ExplorationId } from '../../src/engine/presets/exploration';
import { describeFrame } from '../../src/engine/presentation';

// Authored desktop cases for batch 8; execution is deferred until consolidated acceptance.
async function seek(page: Page, step: number) {
  const timeline = page.getByLabel('执行时间轴', { exact: true }); await timeline.press('Home');
  for (let i = 0; i < step; i++) await timeline.press('ArrowRight');
}
async function ids(page: Page, testId: string, attribute = 'data-id') {
  return page.getByTestId(testId).evaluateAll((nodes, attr) => nodes.map((n) => Number(n.getAttribute(attr))), attribute);
}
for (const problem of explorationProblems) test(`desktop ${problem.id}: reverse snapshots, queues, paths, outputs and reference highlights`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/?problem=${problem.id}`); await page.getByLabel('参考代码语言').selectOption('java');
  const trace = runProblem(problem.id, problem.sample);
  expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  for (let step = trace.frames.length - 1; step >= 0; step--) {
    const frame = trace.frames[step], view = explorationView(frame);
    await expect(page.getByTestId('teaching-equation')).toHaveText(describeFrame(problem.id, frame).equation);
    await expect(page.locator('.current-line code')).toHaveText(problem.code.java.lines[problem.code.java.locations[frame.location] - 1]);
    expect(await page.getByTestId('exploration-cell').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-value')))).toEqual(frame.values.map(String));
    expect(await page.getByTestId('exploration-cell').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-label')))).toEqual(frame.values.map((_, i) => view.labels[i] ?? ''));
    expect(await ids(page, 'exploration-queue-item')).toEqual(view.queue);
    expect(await ids(page, 'exploration-token', 'data-key')).toEqual(view.tokens.map((t) => t.key));
    expect(await page.getByTestId('exploration-output').allTextContents()).toEqual(view.output.map(String));
    expect(await page.getByTestId('exploration-answer').allTextContents()).toEqual(view.answers.map((a) => problem.id === 'n-queens' ? (a as string[]).join('\n') : JSON.stringify(a)));
    await expect(page.getByTestId('exploration-removed')).toHaveCount(view.removed ? 1 : 0);
    expect(await page.getByTestId('exploration-transfer').evaluateAll((nodes) => nodes.map((n) => ({ from: Number(n.getAttribute('data-from')), to: Number(n.getAttribute('data-to')), blocked: n.getAttribute('data-blocked') === 'true' })))).toEqual(view.arrows.map((a) => ({ ...a, blocked: !!a.blocked })));
    const trail = view.path.length ? view.path : view.witness;
    await expect(page.getByTestId('exploration-path-edge')).toHaveCount(view.mode === 'grid' && problem.id !== 'n-queens' ? Math.max(0, trail.length - 1) : 0);
    if (step) await page.getByRole('button', { name: '上一步', exact: true }).click();
  }
  for (const language of ['go', 'python'] as const) {
    await page.getByLabel('参考代码语言').selectOption(language);
    await expect(page.locator('.current-line code')).toHaveText(problem.code[language].lines[problem.code[language].locations[trace.frames[0].location] - 1]);
  }
  expect(errors).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('desktop queue positions animate forward and cancel on rewind or timeline seek', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.goto('/?problem=course-schedule');
  const problem = explorationProblems.find((p) => p.id === 'course-schedule')!, trace = runProblem(problem.id, problem.sample);
  const step = trace.frames.findIndex((frame, i) => frame.location === 'dequeue' && i > 0 && explorationView(trace.frames[i - 1]).queue.length > 1);
  await seek(page, step - 1); const node = explorationView(trace.frames[step]).queue[0];
  const token = page.locator(`[data-element-id="explore-queue-${node}"]`), before = await token.evaluate((el) => (el as SVGElement).style.transform);
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  expect(await token.evaluate((el) => (el as SVGElement).style.transform)).not.toBe(before);
  expect(await token.evaluate((el) => (el.getAnimations()[0]?.effect as KeyframeEffect)?.getKeyframes().length)).toBe(2);
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  expect(await token.evaluate((el) => (el as SVGElement).style.transform)).toBe(before);
  expect(await token.evaluate((el) => el.getAnimations().length)).toBe(0);
  await page.getByLabel('执行时间轴', { exact: true }).press('End'); await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  expect(await ids(page, 'exploration-queue-item')).toEqual([0]); await expect(page.getByTestId('exploration-output')).toHaveCount(0);
});

test('desktop word input rerun clears old witness and invalid input retains last successful output', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/?problem=word-search');
  await page.getByLabel('执行时间轴', { exact: true }).press('End'); await expect(page.getByTestId('exploration-path-edge')).toHaveCount(3);
  await page.getByLabel('自定义 JSON 输入').fill('{"board":[["A","B"]],"word":"ABA"}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByTestId('preset-output')).toHaveText('false'); await expect(page.getByTestId('exploration-path-edge')).toHaveCount(0);
  await page.getByLabel('自定义 JSON 输入').fill('{"board":[["AB"]],"word":"AB"}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('输入不符合要求'); await expect(page.getByTestId('preset-output')).toHaveText('false');
  await page.getByLabel('自定义 JSON 输入').fill('{"board":[],"word":""}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByTestId('preset-output')).toHaveText('true'); await expect(page.getByTestId('exploration-cell')).toHaveCount(0);
});

test('desktop maximum grids and search paths stay inside SVGs at 1280 and 1440 widths', async ({ page }) => {
  test.setTimeout(120_000); await page.emulateMedia({ reducedMotion: 'reduce' });
  const inputs: [ExplorationId, unknown][] = [
    ['letter-combinations-of-a-phone-number', { digits: '777' }], ['generate-parentheses', { n: 4 }], ['palindrome-partitioning', { s: 'aaaaaaa' }],
    ['word-search', { board: Array.from({ length: 4 }, () => Array(4).fill('A')), word: 'AAAB' }], ['n-queens', { n: 5 }],
    ['number-of-islands', { grid: Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => (r + c) % 2)) }],
    ['rotting-oranges', { grid: Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => r === 0 && c === 0 ? 2 : 1)) }],
    ['course-schedule', { numCourses: 10, prerequisites: [[0,0],[2,1],[3,2],[4,3],[5,4],[6,5],[7,6],[8,7],[9,8]] }],
    ['spiral-matrix', { matrix: Array.from({ length: 6 }, () => Array(6).fill(-10000)) }], ['set-matrix-zeroes', { matrix: Array.from({ length: 6 }, () => Array(6).fill(0)) }],
  ];
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [id, input] of inputs) {
      await page.goto(`/?problem=${id}`); await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input)); await page.getByRole('button', { name: '运行输入', exact: true }).click();
      const trace = runProblem(id, input); expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
      await seek(page, Math.min(25, trace.frames.length - 1));
      for (const next of ['End', 'Home']) {
        expect(await page.locator('.exploration-tile, .exploration-token rect').evaluateAll((nodes) => nodes.every((n) => {
          const bounds = n.getBoundingClientRect(), svg = n.closest('svg')!.getBoundingClientRect(); return bounds.left >= svg.left && bounds.right <= svg.right && bounds.top >= svg.top && bounds.bottom <= svg.bottom;
        }))).toBe(true);
        expect(await page.locator('.exploration-board path').evaluateAll((nodes) => nodes.every((n) => !/NaN|undefined/.test(n.getAttribute('d') ?? '')))).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByLabel('执行时间轴', { exact: true }).press(next);
      }
    }
  }
});
