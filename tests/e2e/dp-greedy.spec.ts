import { expect, test, type Page } from '@playwright/test';
import { runProblem } from '../../src/engine/run';
import { describeFrame } from '../../src/engine/presentation';
import { dpGreedyProblems } from '../../src/engine/presets/dp-greedy-catalog';
import { dpGreedyView } from '../../src/engine/presets/dp-greedy';
import { dpGreedyMaximums } from '../dp-greedy-cases';

// Authored for consolidated desktop acceptance; not run during this batch.
async function attributes(page: Page, testId: string, name: string) {
  return page.getByTestId(testId).evaluateAll((nodes, attr) => nodes.map((n) => n.getAttribute(attr)), name);
}
async function seek(page: Page, step: number) {
  const timeline = page.getByLabel('执行时间轴', { exact: true }); await timeline.press('Home');
  for (let i = 0; i < step; i++) await timeline.press('ArrowRight');
}
test('desktop overshooting the final jump clears the candidate band and rewinding restores it', async ({ page }) => {
  await page.goto('/?problem=jump-game-ii');
  await page.getByLabel('自定义 JSON 输入').fill('{"nums":[24,0,0]}');
  await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByTestId('preset-output')).toHaveText('1');
  const timeline = page.getByLabel('执行时间轴', { exact: true });
  await timeline.press('End');
  await expect(page.getByTestId('dp-band')).toHaveCount(1);
  await expect(page.getByTestId('dp-band')).toContainText('[0, 2]');
  await timeline.press('Home'); await timeline.press('ArrowRight');
  await expect(page.getByTestId('dp-band')).toHaveCount(2);
  await expect(page.getByTestId('dp-band').nth(1)).toContainText('[1, 2]');
  await timeline.press('ArrowRight');
  await expect(page.getByTestId('dp-band')).toHaveCount(1);
});
for (const problem of dpGreedyProblems) test(`desktop ${problem.id}: rewinding restores registers, dependencies, segments and witnesses`, async ({ page }) => {
  test.setTimeout(120_000); await page.setViewportSize({ width: 1440, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/?problem=${problem.id}`); await page.getByLabel('参考代码语言').selectOption('java');
  const trace = runProblem(problem.id, problem.sample);
  expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  for (let step = trace.frames.length - 1; step >= 0; step--) {
    const frame = trace.frames[step], view = dpGreedyView(frame);
    await expect(page.getByTestId('teaching-equation')).toHaveText(describeFrame(problem.id, frame).equation);
    await expect(page.locator('.current-line code')).toHaveText(problem.code.java.lines[problem.code.java.locations[frame.location] - 1]);
    expect(await attributes(page, 'dp-register', 'data-id')).toEqual(view.cells.map((c) => c.id));
    expect(await attributes(page, 'dp-register', 'data-value')).toEqual(view.cells.map((c) => String(c.value ?? '')));
    expect(await attributes(page, 'dp-register', 'data-epoch')).toEqual(view.cells.map((c) => String(c.epoch ?? '')));
    expect(await attributes(page, 'dp-input', 'data-value')).toEqual(frame.values.map(String));
    expect(await attributes(page, 'dp-input', 'data-selected')).toEqual(frame.values.map((_, i) => String(view.witness.includes(i))));
    expect(await attributes(page, 'dp-input', 'data-segment')).toEqual(frame.values.map((_, i) => String(view.segments.findIndex((s) => s.start <= i && i <= s.end))));
    expect(await attributes(page, 'dp-transfer', 'data-chosen')).toEqual(view.deps.map((d) => String(d.chosen)));
    expect(await attributes(page, 'dp-transfer', 'data-eligible')).toEqual(view.deps.map((d) => String(d.eligible)));
    await expect(page.getByTestId('dp-choice')).toHaveCount(view.choices.length);
    await expect(page.getByTestId('dp-segment')).toHaveCount(view.segments.length);
    await expect(page.getByTestId('dp-witness')).toHaveCount(view.witness.length || view.otherWitness.length ? 1 : 0);
    await expect(page.getByTestId('dp-path')).toHaveCount(view.sourceCols && view.witness.length > 1 ? 1 : 0);
    expect(await page.getByTestId('dp-output').allTextContents()).toEqual(view.output.map(String));
    expect(await page.getByTestId('dp-last').allTextContents()).toEqual(view.table.map(([char, i]) => `${char} → ${i}`));
    if (step) await page.getByRole('button', { name: '上一步', exact: true }).click();
  }
  for (const language of ['go', 'python'] as const) {
    await page.getByLabel('参考代码语言').selectOption(language);
    await expect(page.locator('.current-line code')).toHaveText(problem.code[language].lines[problem.code[language].locations[trace.frames[0].location] - 1]);
  }
  expect(errors).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('desktop DP focus moves forwards, rewind cancels motion and seeking clears dependency particles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.goto('/?problem=house-robber');
  const focus = page.locator('[data-element-id="dp-focus"]'), before = await focus.evaluate((el) => (el as SVGElement).style.transform);
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  expect(await focus.evaluate((el) => (el as SVGElement).style.transform)).not.toBe(before);
  expect(await focus.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  await expect(page.locator('.state-dp-board .flow-particle')).toHaveCount(1);
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  expect(await focus.evaluate((el) => (el as SVGElement).style.transform)).toBe(before);
  expect(await focus.evaluate((el) => el.getAnimations().length)).toBe(0);
  await expect(page.locator('.state-dp-board .flow-particle')).toHaveCount(0);
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  await expect(page.getByTestId('dp-witness')).toHaveCount(0);
  expect(await attributes(page, 'dp-register', 'data-value')).toEqual(['0','','','','','']);
});

test('desktop changed input discards previous paths and an invalid grid preserves the last valid result', async ({ page }) => {
  await page.goto('/?problem=minimum-path-sum'); await page.getByLabel('执行时间轴', { exact: true }).press('End');
  await expect(page.getByTestId('dp-path')).toHaveCount(1);
  await page.getByLabel('自定义 JSON 输入').fill('{"grid":[[8]]}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByTestId('preset-output')).toHaveText('8'); await expect(page.getByTestId('dp-path')).toHaveCount(0);
  expect(await attributes(page, 'dp-register', 'data-value')).toEqual(['']);
  await page.getByLabel('执行时间轴', { exact: true }).press('End'); expect(await attributes(page, 'dp-register', 'data-value')).toEqual(['8']);
  await page.getByLabel('自定义 JSON 输入').fill('{"grid":[[1,2],[3]]}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('输入不符合要求'); await expect(page.getByTestId('preset-output')).toHaveText('8');
  await page.goto('/?problem=word-break');
  await page.getByLabel('自定义 JSON 输入').fill('{"s":"ab","wordDict":["b"]}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  await expect(page.getByTestId('preset-output')).toHaveText('false'); await expect(page.getByTestId('dp-segment')).toHaveCount(0);
});

test('desktop upper bounds contain state labels, large products and finite dependency paths', async ({ page }) => {
  test.setTimeout(120_000); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [id, input] of dpGreedyMaximums) {
      await page.goto(`/?problem=${id}`); await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input)); await page.getByRole('button', { name: '运行输入', exact: true }).click();
      const trace = runProblem(id, input); expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
      await seek(page, Math.min(20, trace.frames.length - 1));
      for (const key of ['End', 'Home']) {
        expect(await page.locator('.dp-register rect, .dp-input rect, .dp-register text, .dp-input text').evaluateAll((nodes) => nodes.every((n) => {
          const bounds = n.getBoundingClientRect(), svg = n.closest('svg')!.getBoundingClientRect();
          return bounds.left >= svg.left && bounds.right <= svg.right && bounds.top >= svg.top && bounds.bottom <= svg.bottom;
        }))).toBe(true);
        expect(await page.locator('.state-dp-board path').evaluateAll((nodes) => nodes.every((n) => !/NaN|undefined/.test(n.getAttribute('d') ?? '')))).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByLabel('执行时间轴', { exact: true }).press(key);
      }
      expect(await attributes(page, 'dp-register', 'data-value')).toEqual(dpGreedyView(trace.frames[0]).cells.map((c) => String(c.value ?? '')));
    }
  }
});
