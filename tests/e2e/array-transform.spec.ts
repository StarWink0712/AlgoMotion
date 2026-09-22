import { expect, test, type Page } from '@playwright/test';
import { problems, getProblem } from '../../src/engine/catalog';
import { runProblem } from '../../src/engine/run';
import { describeFrame } from '../../src/engine/presentation';
import { arrayTransformSchemas, arrayTransformView } from '../../src/engine/presets/array-transform';
import type { ProblemId } from '../../src/engine/types';

// Batch 3: authored now, to be run in the consolidated desktop acceptance pass.
async function seek(page: Page, step: number) {
  await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  for (let i = 0; i < step; i++) await page.getByLabel('执行时间轴', { exact: true }).press('ArrowRight');
}

for (const problem of problems.filter((p) => p.id in arrayTransformSchemas)) {
  test(`desktop ${problem.id}: every backward frame retains identities and actual partial results`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/?problem=${problem.id}`);
    const trace = runProblem(problem.id, problem.sample);
    expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
    await page.getByLabel('执行时间轴', { exact: true }).press('End');
    for (let step = trace.frames.length - 1; step >= 0; step--) {
      const frame = trace.frames[step], cue = describeFrame(problem.id, frame, trace.frames[step - 1]);
      await expect(page.getByTestId('teaching-equation')).toHaveText(cue.equation);
      await expect(page.locator('.current-line code')).toHaveText(problem.code.java.lines[problem.code.java.locations[frame.location] - 1]);
      if (problem.id === 'merge-intervals') {
        const { items, merged } = arrayTransformView(frame);
        await expect(page.getByTestId('input-interval')).toHaveCount(items!.length);
        await expect(page.getByTestId('merged-interval')).toHaveCount(merged!.length);
        for (let i = 0; i < merged!.length; i++) {
          await expect(page.getByTestId('merged-interval').nth(i)).toHaveAttribute('data-start', String(merged![i].start));
          await expect(page.getByTestId('merged-interval').nth(i)).toHaveAttribute('data-end', String(merged![i].end));
          await expect(page.getByTestId('merged-interval').nth(i)).toHaveAttribute('data-members', merged![i].members.join(','));
        }
      } else {
        for (let i = 0; i < frame.values.length; i++) await expect(page.locator(`[data-element-id="${frame.elementIds![i]}"] .scene-value`)).toHaveText(String(frame.values[i]));
        if (problem.id === '3sum') await expect(page.getByTestId('triplet-result')).toHaveText(arrayTransformView(frame).triplets!.map((triple) => `[${triple.join(', ')}]`));
        if (problem.id === 'sort-colors') {
          await expect(page.getByTestId('color-band')).toHaveCount(cue.bands!.length);
          for (let i = 0; i < cue.bands!.length; i++) {
            await expect(page.getByTestId('color-band').nth(i)).toHaveAttribute('data-start', String(cue.bands![i].start));
            await expect(page.getByTestId('color-band').nth(i)).toHaveAttribute('data-end', String(cue.bands![i].end));
          }
        }
      }
      if (step) await page.getByRole('button', { name: '上一步', exact: true }).click();
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('desktop swaps move actual identities and a reset cancels their motion', async ({ page }) => {
  await page.goto('/?problem=sort-colors');
  const element = page.locator('[data-element-id="0"]');
  const before = await element.evaluate((el) => (el as SVGElement).style.transform);
  await seek(page, 2);
  const motion = await element.evaluate((el) => ({ position: (el as SVGElement).style.transform, frames: (el.getAnimations()[0]?.effect as KeyframeEffect)?.getKeyframes() }));
  expect(motion.position).not.toBe(before);
  expect(motion.frames).toHaveLength(3);
  await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  expect(await element.evaluate((el) => (el as SVGElement).style.transform)).toBe(before);
  expect(await element.evaluate((el) => el.getAnimations().length)).toBe(0);
});

test('desktop interval sorting and output expansion animate without persisting on rewind', async ({ page }) => {
  await page.goto('/?problem=merge-intervals');
  const source = page.locator('[data-element-id="interval-0"]');
  const before = await source.evaluate((el) => (el as SVGElement).style.transform);
  await seek(page, 1);
  expect(await source.evaluate((el) => (el as SVGElement).style.transform)).not.toBe(before);
  const trace = runProblem('merge-intervals', getProblem('merge-intervals').sample);
  await seek(page, trace.frames.findIndex((frame) => frame.location === 'merge'));
  const widths = await page.getByTestId('merged-interval').first().locator('rect').evaluate((el) => (el.getAnimations()[0]?.effect as KeyframeEffect)?.getKeyframes().map((frame) => frame.width));
  expect(widths).toHaveLength(2); expect(widths![0]).not.toBe(widths![1]);
  await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  await expect(page.getByTestId('merged-interval')).toHaveCount(0);
  await expect(page.getByTestId('dependency-arrow')).toHaveCount(0);
});

test('desktop custom input handles duplicate triples, no-op rotations, wrapping permutations and point intervals', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const examples: [ProblemId, unknown, unknown][] = [
    ['3sum', { nums: [0, 0, 0, 0] }, [[0, 0, 0]]],
    ['3sum', { nums: [] }, []],
    ['sort-colors', { nums: [1, 2, 0] }, [0, 1, 2]],
    ['rotate-array', { nums: [], k: 1000000000 }, []],
    ['rotate-array', { nums: [1, 2, 3], k: 4 }, [3, 1, 2]],
    ['next-permutation', { nums: [3, 2, 1] }, [1, 2, 3]],
    ['next-permutation', { nums: [2, 2] }, [2, 2]],
    ['merge-intervals', { intervals: [[0, 0], [1, 1]] }, [[0, 0], [1, 1]]],
    ['merge-intervals', { intervals: Array(12).fill([-100, 100]) }, [[-100, 100]]],
    ['merge-intervals', { intervals: [] }, []],
  ];
  for (const [id, input, expected] of examples) {
    await page.goto(`/?problem=${id}`);
    await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input));
    await page.getByRole('button', { name: '运行输入', exact: true }).click();
    expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(expected);
    await page.getByLabel('执行时间轴', { exact: true }).press('End');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByLabel('自定义 JSON 输入').fill('{"intervals":[[3,1]]}');
  await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('输入不符合要求');
  await expect(page.getByTestId('preset-output')).toHaveText('[]');
});
