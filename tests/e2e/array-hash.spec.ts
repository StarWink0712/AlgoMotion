import { expect, test, type Page } from '@playwright/test';
import { problems } from '../../src/engine/catalog';
import { runProblem } from '../../src/engine/run';
import { describeFrame } from '../../src/engine/presentation';
import { arrayHashSchemas, arrayHashView } from '../../src/engine/presets/array-hash';

// Batch 2 scenarios are authored now and intentionally deferred to final acceptance.
async function runInput(page: Page, input: unknown) {
  await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input));
  await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
}

for (const problem of problems.filter((p) => p.id in arrayHashSchemas)) {
  test(`desktop ${problem.id}: snapshots and specialized scenes rewind without future state`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/?problem=${problem.id}`);
    const trace = runProblem(problem.id, problem.sample);
    await page.getByLabel('执行时间轴', { exact: true }).press('End');
    for (let step = trace.frames.length - 1; step >= 0; step--) {
      const frame = trace.frames[step], view = arrayHashView(frame), cue = describeFrame(problem.id, frame, trace.frames[step - 1]);
      await expect(page.getByTestId('teaching-equation')).toHaveText(cue.equation);
      await expect(page.locator('.current-line code')).toHaveText(problem.code.java.lines[problem.code.java.locations[frame.location] - 1]);
      if (problem.id === 'group-anagrams') {
        await expect(page.getByTestId('anagram-bucket')).toHaveCount(view.groups!.length);
        await expect(page.locator('[data-element-id^="word-"]')).toHaveCount(frame.values.length);
        for (let i = 0; i < view.groups!.length; i++) await expect(page.getByTestId('anagram-bucket').nth(i)).toContainText(`${view.groups![i].indices.length} 个单词`);
      } else if (problem.id === 'product-of-array-except-self') {
        await expect(page.getByTestId('product-prefix').locator('.scene-value')).toHaveText(view.prefix!.map((v) => v === null ? '·' : String(v)));
        await expect(page.getByTestId('product-suffix').locator('.scene-value')).toHaveText(view.suffix!.map((v) => v === null ? '·' : String(v)));
        await expect(page.getByTestId('product-output').locator('.scene-value')).toHaveText(frame.dp!.map(String));
        await expect(page.getByTestId('product-merge')).toHaveCount(frame.location === 'combine' ? 1 : 0);
      } else if (problem.id === 'subarray-sum-equals-k') {
        await expect(page.getByTestId('prefix-match')).toHaveCount(view.matches!.length);
        for (let i = 0; i < view.matches!.length; i++) await expect(page.getByTestId('prefix-match').nth(i)).toHaveAttribute('data-start', String(view.matches![i]));
        for (let i = 0; i <= frame.values.length; i++) await expect(page.getByTestId('prefix-node').nth(i)).toHaveAttribute('data-value', String(view.prefix![i] ?? 'unknown'));
      } else await expect(page.locator('.sequence-chip > b')).toHaveText(frame.path!.map((i) => String(frame.values[i])));
      if (step) await page.getByRole('button', { name: '上一步', exact: true }).click();
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('desktop anagram identities move from the input row into their bucket and reset on seek', async ({ page }) => {
  await page.goto('/?problem=group-anagrams');
  const token = page.locator('[data-element-id="word-0"]');
  const start = await token.evaluate((el) => (el as SVGElement).style.transform);
  for (let i = 0; i < 3; i++) await page.getByLabel('执行时间轴', { exact: true }).press('ArrowRight');
  const state = await token.evaluate((el) => ({ transform: (el as SVGElement).style.transform, count: el.getAnimations().length }));
  expect(state.transform).not.toBe(start); expect(state.count).toBeGreaterThan(0);
  await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  expect(await token.evaluate((el) => (el as SVGElement).style.transform)).toBe(start);
  expect(await token.evaluate((el) => el.getAnimations().length)).toBe(0);
});

test('desktop empty and duplicate strings, zero products, repeated prefixes and maximum teaching inputs', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/?problem=group-anagrams');
  await runInput(page, { strs: ['', 'a', '', 'a'] });
  expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual([['', ''], ['a', 'a']]);
  await runInput(page, { strs: [] }); await expect(page.getByTestId('preset-output')).toHaveText('[]');
  await runInput(page, { strs: 'abcdefghijkl'.split('') });
  await expect(page.getByTestId('anagram-bucket')).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/?problem=product-of-array-except-self');
  await runInput(page, { nums: [-1, 1, 0, -3, 3] });
  expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual([0, 0, 9, 0, 0]);
  await runInput(page, { nums: Array(12).fill(5) });
  await expect(page.getByTestId('product-output').locator('.scene-value')).toHaveText(Array(12).fill('48828125'));
  await page.goto('/?problem=subarray-sum-equals-k');
  await runInput(page, { nums: Array(24).fill(0), k: 0 });
  await expect(page.getByTestId('preset-output')).toHaveText('300');
  await expect(page.getByTestId('prefix-frequency')).toHaveAttribute('data-count', '25');
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  await expect(page.getByTestId('prefix-match')).toHaveCount(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
