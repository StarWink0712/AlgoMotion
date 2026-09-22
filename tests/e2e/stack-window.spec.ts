import { expect, test, type Page } from '@playwright/test';
import { problems, getProblem } from '../../src/engine/catalog';
import { runProblem } from '../../src/engine/run';
import { describeFrame } from '../../src/engine/presentation';
import { stackWindowSchemas, stackWindowView } from '../../src/engine/presets/stack-window';
import type { ProblemId } from '../../src/engine/types';

// Batch 4 desktop scenarios are authored, not executed during incremental additions.
async function seek(page: Page, step: number) {
  const timeline = page.getByLabel('执行时间轴', { exact: true });
  await timeline.press('Home');
  for (let i = 0; i < step; i++) await timeline.press('ArrowRight');
}

for (const problem of problems.filter((p) => p.id in stackWindowSchemas)) {
  test(`desktop ${problem.id}: rewind restores stack, partial output and frequency snapshots`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/?problem=${problem.id}`);
    const trace = runProblem(problem.id, problem.sample);
    expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
    await page.getByLabel('参考代码语言').selectOption('java');
    await page.getByLabel('执行时间轴', { exact: true }).press('End');
    for (let i = trace.frames.length - 1; i >= 0; i--) {
      const frame = trace.frames[i], view = stackWindowView(frame);
      await expect(page.getByTestId('teaching-equation')).toHaveText(describeFrame(problem.id, frame, trace.frames[i - 1]).equation);
      await expect(page.locator('.current-line code')).toHaveText(problem.code.java.lines[problem.code.java.locations[frame.location] - 1]);
      expect(await page.getByTestId('structure-entry').evaluateAll((items) => items.map((item) => Number(item.getAttribute('data-id'))))).toEqual(view.entries.map((entry) => entry.id));
      expect(await page.getByTestId('partial-output').evaluateAll((items) => items.map((item) => JSON.parse(item.getAttribute('data-value')!)))).toEqual(view.output);
      if (view.water) expect(await page.getByTestId('water-column').evaluateAll((items) => items.map((item) => Number(item.getAttribute('data-amount'))))).toEqual(view.water);
      if (view.frequencies) {
        expect(await page.getByTestId('frequency-entry').evaluateAll((items) => items.map((item) => ({ char: item.getAttribute('data-char'), have: Number(item.getAttribute('data-have')), need: Number(item.getAttribute('data-need')) })))).toEqual(view.frequencies);
      }
      if (frame.window && frame.window[0] <= frame.window[1]) {
        await expect(page.getByTestId('sw-window')).toHaveAttribute('data-start', String(frame.window[0]));
        await expect(page.getByTestId('sw-window')).toHaveAttribute('data-end', String(frame.window[1]));
      } else await expect(page.getByTestId('sw-window')).toHaveCount(0);
      if (view.rectangle) await expect(page.getByTestId('histogram-rectangle')).toHaveAttribute('data-area', String(view.rectangle.area));
      else await expect(page.getByTestId('histogram-rectangle')).toHaveCount(0);
      if (view.text !== undefined) await expect(page.getByTestId('decoded-text')).toHaveText(view.text);
      if (i) await page.getByRole('button', { name: '上一步', exact: true }).click();
    }
    for (const language of ['go', 'python'] as const) {
      await page.getByLabel('参考代码语言').selectOption(language);
      const code = problem.code[language];
      await expect(page.locator('.current-line code')).toHaveText(code.lines[code.locations[trace.frames[0].location] - 1]);
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('desktop stack entry moves from the operation dock; seeking cancels movement and transfer ghosts', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?problem=valid-parentheses');
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  const entry = page.getByTestId('structure-entry');
  await expect(entry).toHaveAttribute('data-id', '0');
  const keyframes = await entry.evaluate((element) => (element.getAnimations()[0]?.effect as KeyframeEffect)?.getKeyframes());
  expect(keyframes).toHaveLength(2);
  expect(keyframes![0].transform).not.toBe(keyframes![1].transform);
  const trace = runProblem('valid-parentheses', getProblem('valid-parentheses').sample);
  await seek(page, trace.frames.findIndex((frame) => frame.location === 'pop'));
  await expect(page.getByTestId('structure-transfer')).toHaveCount(1);
  await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  await expect(page.getByTestId('structure-entry')).toHaveCount(0);
  await expect(page.getByTestId('structure-transfer')).toHaveCount(0);
  await expect(page.getByTestId('dependency-arrow')).toHaveCount(0);
});

test('desktop rainwater grows from recorded layers and snaps back to a dry initial frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?problem=trapping-rain-water');
  const trace = runProblem('trapping-rain-water', getProblem('trapping-rain-water').sample);
  const fill = trace.frames.findIndex((frame) => frame.location === 'fill' && Number(frame.variables.added) > 0);
  await seek(page, fill);
  const amounts = stackWindowView(trace.frames[fill]).water!;
  const column = page.getByTestId('water-column').nth(amounts.findIndex((amount) => amount > 0));
  expect(await column.evaluate((element) => element.getAnimations().length)).toBeGreaterThan(0);
  await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  expect(await page.getByTestId('water-column').evaluateAll((items) => items.every((item) => item.getAttribute('data-amount') === '0' && item.getAnimations().length === 0))).toBe(true);
});

test('desktop teaching limits keep readable scrollable inputs, wrapped stacks and bounded text', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const examples: [ProblemId, unknown][] = [
    ['valid-parentheses', { s: '('.repeat(32) }],
    ['min-stack', { operations: Array.from({ length: 24 }, (_, i) => ({ op: 'push', value: -10000 + i })) }],
    ['daily-temperatures', { temperatures: Array(24).fill(100) }],
    ['largest-rectangle-in-histogram', { heights: Array(24).fill(100) }],
    ['trapping-rain-water', { heights: [100, ...Array(22).fill(0), 100] }],
    ['sliding-window-maximum', { nums: Array.from({ length: 24 }, (_, i) => 10000 - i), k: 24 }],
    ['find-all-anagrams-in-a-string', { s: 'a'.repeat(32), p: 'a'.repeat(12) }],
    ['minimum-window-substring', { s: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef', t: 'OPQRSTUVWXYZ' }],
    ['longest-valid-parentheses', { s: '('.repeat(32) }],
    ['decode-string', { s: '20[abcdef]' }],
  ];
  for (const [id, input] of examples) {
    await page.goto(`/?problem=${id}`);
    await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input));
    await page.getByRole('button', { name: '运行输入', exact: true }).click();
    const expected = runProblem(id, input).result;
    expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(expected);
    await page.getByLabel('执行时间轴', { exact: true }).press('End');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.getByTestId('structure-entry').evaluateAll((entries) => entries.every((entry) => {
      const box = entry.getBoundingClientRect(), bounds = entry.closest('svg')!.getBoundingClientRect();
      return box.left >= bounds.left && box.right <= bounds.right && box.bottom <= bounds.bottom;
    }))).toBe(true);
  }
  await expect(page.getByTestId('decoded-text')).toHaveText('abcdef'.repeat(20));
  await page.getByLabel('自定义 JSON 输入').fill('{"s":"20[20[a]]"}');
  await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('输入不符合要求');
  await expect(page.getByTestId('decoded-text')).toHaveText('abcdef'.repeat(20));
});
