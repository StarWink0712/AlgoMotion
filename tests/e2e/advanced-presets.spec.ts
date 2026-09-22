import { test, expect, type Page } from '@playwright/test';
import { advancedProblems } from '../../src/engine/presets/advanced-catalog';
import { runProblem } from '../../src/engine/run';
import { describeFrame } from '../../src/engine/presentation';
import { treeView } from '../../src/engine/presets/trees';
import { linkedListView } from '../../src/engine/presets/linked-lists';
import { searchView, cacheView } from '../../src/engine/presets/search-cache';
import type { ProblemId } from '../../src/engine/types';

// Desktop-only scenarios, authored now and deferred with the rest of batch 7 acceptance.
async function seek(page: Page, step: number) {
  const slider = page.getByLabel('执行时间轴', { exact: true }); await slider.press('Home');
  for (let i = 0; i < step; i++) await slider.press('ArrowRight');
}
async function ids(page: Page, testId: string, attribute = 'data-id') {
  return page.getByTestId(testId).evaluateAll((items, attr) => items.map((el) => Number(el.getAttribute(attr))), attribute);
}
async function edges(page: Page, testId: string) {
  return page.getByTestId(testId).evaluateAll((items) => items.map((el) => [Number(el.getAttribute('data-from')), Number(el.getAttribute('data-to'))]));
}

for (const problem of advancedProblems) test(`desktop ${problem.id}: every reversed snapshot matches current state, not future output`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/?problem=${problem.id}`); await page.getByLabel('参考代码语言').selectOption('java');
  const trace = runProblem(problem.id, problem.sample);
  expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  for (let step = trace.frames.length - 1; step >= 0; step--) {
    const frame = trace.frames[step];
    await expect(page.getByTestId('teaching-equation')).toHaveText(describeFrame(problem.id, frame).equation);
    await expect(page.locator('.current-line code')).toHaveText(problem.code.java.lines[problem.code.java.locations[frame.location] - 1]);
    if (problem.renderer === 'tree-lab') {
      const view = treeView(frame);
      expect(await ids(page, 'tree-node', 'data-value')).toEqual(frame.values);
      expect(await edges(page, 'tree-edge')).toEqual(frame.links);
      expect(await ids(page, 'tree-work-item', 'data-key')).toEqual(view.stack.map((s) => s.key));
      await expect(page.getByTestId('tree-match')).toHaveCount(view.matches?.length ?? 0);
      expect(await page.getByTestId('tree-prefix').allTextContents()).toEqual(view.frequencies?.map((f) => `${f.label} → ${f.value}`) ?? []);
    } else if (problem.renderer === 'linked-lab') {
      const view = linkedListView(frame);
      expect(await ids(page, 'list-node', 'data-value')).toEqual(frame.values);
      expect(await edges(page, 'live-edge')).toEqual(frame.links);
      expect(await ids(page, 'list-output-node')).toEqual(view.output);
      expect(await page.getByTestId('merge-call').allTextContents()).toEqual(view.work);
    } else if (problem.renderer === 'backtracking') {
      const view = searchView(frame);
      expect(await ids(page, 'choice-path-item', 'data-source')).toEqual(view.path.map((c) => c.source));
      expect(await page.getByTestId('choice-answer').allTextContents()).toEqual(view.answers.map((a) => `[${a.join(', ')}]`));
      await expect(page.getByTestId('choice-removed')).toHaveCount(view.removed ? 1 : 0);
      expect(await page.getByTestId('choice-source').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-available')))).toEqual(frame.values.map((_, i) => String(view.available.includes(i))));
    } else {
      const view = cacheView(frame);
      expect(await ids(page, 'cache-node')).toEqual(view.order);
      expect(await ids(page, 'cache-node', 'data-value')).toEqual(view.entries.map((e) => e.value));
      expect(await edges(page, 'cache-next')).toEqual(view.entries.flatMap((e) => e.next === null ? [] : [[e.id, e.next]]));
      expect(await edges(page, 'cache-prev')).toEqual(view.entries.flatMap((e) => e.prev === null ? [] : [[e.id, e.prev]]));
      expect(await page.getByTestId('cache-output').allTextContents()).toEqual(view.outputs.map(String));
      await expect(page.getByTestId('cache-evicted')).toHaveCount(view.removed ? 1 : 0);
    }
    if (step) await page.getByRole('button', { name: '上一步', exact: true }).click();
  }
  for (const language of ['go', 'python'] as const) {
    await page.getByLabel('参考代码语言').selectOption(language);
    await expect(page.locator('.current-line code')).toHaveText(problem.code[language].lines[problem.code[language].locations[trace.frames[0].location] - 1]);
  }
  expect(errors).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('desktop LRU access moves the same node; rewind cancels movement and restores links', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.goto('/?problem=lru-cache');
  const problem = advancedProblems.find((p) => p.id === 'lru-cache')!, trace = runProblem(problem.id, problem.sample);
  const step = trace.frames.findIndex((f) => f.location === 'touch'); await seek(page, step - 1);
  const node = page.locator('[data-element-id="cache-0"]'), old = await node.evaluate((el) => (el as SVGElement).style.transform);
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  expect(await node.evaluate((el) => (el as SVGElement).style.transform)).not.toBe(old);
  expect(await node.evaluate((el) => (el.getAnimations()[0]?.effect as KeyframeEffect)?.getKeyframes().length)).toBe(3);
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  expect(await node.evaluate((el) => (el as SVGElement).style.transform)).toBe(old);
  expect(await node.evaluate((el) => el.getAnimations().length)).toBe(0);
  await page.getByLabel('执行时间轴', { exact: true }).press('Home'); await expect(page.getByTestId('cache-node')).toHaveCount(0);
});

test('desktop rerun resets search state; invalid inputs preserve previous output', async ({ page }) => {
  await page.goto('/?problem=combination-sum'); await page.getByLabel('执行时间轴', { exact: true }).press('End');
  await page.getByLabel('自定义 JSON 输入').fill('{"candidates":[2],"target":3}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByTestId('preset-output')).toHaveText('[]'); await expect(page.getByTestId('choice-answer')).toHaveCount(0);
  await expect(page.getByTestId('choice-path-item')).toHaveCount(0);
  await page.getByLabel('自定义 JSON 输入').fill('{"candidates":[0],"target":3}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('输入不符合要求'); await expect(page.getByTestId('preset-output')).toHaveText('[]');
  await page.getByLabel('自定义 JSON 输入').fill('{"candidates":[],"target":0}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect.poll(async () => JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual([[]]);
  await page.getByLabel('执行时间轴', { exact: true }).press('End'); await expect(page.getByTestId('choice-answer')).toHaveText('[]');
  await page.getByLabel('执行时间轴', { exact: true }).press('Home'); await expect(page.getByTestId('choice-answer')).toHaveCount(0);
});

test('desktop bounded inputs use internal scrolling and finite layout at both 1280 and 1440 widths', async ({ page }) => {
  test.setTimeout(120_000); await page.emulateMedia({ reducedMotion: 'reduce' });
  const cases: [ProblemId, unknown][] = [
    ['construct-binary-tree-from-preorder-and-inorder-traversal', { preorder: [1, 2, 3, 4, 5], inorder: [1, 2, 3, 4, 5] }],
    ['path-sum-iii', { tree: Array(15).fill(0), targetSum: 0 }],
    ['sort-list', { values: Array.from({ length: 12 }, (_, i) => i % 3 - 1) }],
    ['merge-k-sorted-lists', { lists: Array.from({ length: 4 }, () => [-10000, 0, 0, 10000]) }],
    ['permutations', { nums: [1, 2, 3, 4, 5] }], ['subsets', { nums: [1, 2, 3, 4, 5, 6, 7] }],
    ['combination-sum', { candidates: [1, 2, 3, 4, 5], target: 10 }],
    ['lru-cache', { capacity: 6, operations: Array.from({ length: 24 }, (_, i) => ({ op: 'put', key: i - 12, value: -10000 })) }],
  ];
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [id, input] of cases) {
      await page.goto(`/?problem=${id}`); await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input)); await page.getByRole('button', { name: '运行输入', exact: true }).click();
      const trace = runProblem(id, input); expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
      await seek(page, Math.min(20, trace.frames.length - 1));
      for (const key of ['End', 'Home']) {
        expect(await page.locator('.algorithm-scene path').evaluateAll((items) => items.every((el) => !/NaN|undefined/.test(el.getAttribute('d') ?? '')))).toBe(true);
        expect(await page.locator('.choice-token rect, .cache-token rect, .tree-lab-node .node-disc, .ll-node .node-disc').evaluateAll((items) => items.every((el) => {
          const box = el.getBoundingClientRect(), svg = el.closest('svg')!.getBoundingClientRect(); return box.left >= svg.left && box.right <= svg.right && box.top >= svg.top && box.bottom <= svg.bottom;
        }))).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByLabel('执行时间轴', { exact: true }).press(key);
      }
    }
  }
});
