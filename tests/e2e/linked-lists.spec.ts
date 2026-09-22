import { expect, test, type Page } from '@playwright/test';
import { problems, getProblem } from '../../src/engine/catalog';
import { runProblem } from '../../src/engine/run';
import { describeFrame } from '../../src/engine/presentation';
import { linkedListSchemas, linkedListView } from '../../src/engine/presets/linked-lists';
import type { ProblemId } from '../../src/engine/types';

// Authored for final desktop acceptance. No browser execution during batch 5.
async function seek(page: Page, step: number) {
  const timeline = page.getByLabel('执行时间轴', { exact: true });
  await timeline.press('Home');
  for (let i = 0; i < step; i++) await timeline.press('ArrowRight');
}
async function edges(page: Page, testId: string) {
  return page.getByTestId(testId).evaluateAll((items) => items.map((item) => [Number(item.getAttribute('data-from')), Number(item.getAttribute('data-to'))]));
}

for (const problem of problems.filter((p) => p.id in linkedListSchemas)) {
  test(`desktop ${problem.id}: backward snapshots retain actual identities, links and partial results`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/?problem=${problem.id}`);
    await page.getByLabel('参考代码语言').selectOption('java');
    const trace = runProblem(problem.id, problem.sample);
    expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
    await page.getByLabel('执行时间轴', { exact: true }).press('End');
    for (let i = trace.frames.length - 1; i >= 0; i--) {
      const frame = trace.frames[i], view = linkedListView(frame);
      await expect(page.getByTestId('teaching-equation')).toHaveText(describeFrame(problem.id, frame).equation);
      await expect(page.locator('.current-line code')).toHaveText(problem.code.java.lines[problem.code.java.locations[frame.location] - 1]);
      await expect(page.getByTestId('list-node')).toHaveCount(frame.values.length);
      expect(await edges(page, 'live-edge')).toEqual(frame.links);
      expect(await edges(page, 'random-edge')).toEqual(view.randomLinks);
      expect(await edges(page, 'retiring-edge')).toEqual(view.retired);
      expect(await edges(page, 'copy-pair')).toEqual(view.copies);
      expect(await page.getByTestId('list-output-node').evaluateAll((items) => items.map((item) => Number(item.getAttribute('data-id'))))).toEqual(view.output);
      expect(await page.getByTestId('list-node').evaluateAll((items) => items.map((item) => Number(item.getAttribute('data-value'))))).toEqual(frame.values);
      expect(await page.locator('.ll-graph path').evaluateAll((paths) => paths.every((path) => !/NaN|undefined/.test(path.getAttribute('d') ?? '')))).toBe(true);
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

test('desktop pointer motion cancels on rewind and seek restores original edges', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?problem=linked-list-cycle');
  const pointer = page.locator('[data-element-id="list-pointer-fast"]');
  const initial = await pointer.evaluate((el) => (el as SVGElement).style.transform);
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  const motion = await pointer.evaluate((el) => ({ position: (el as SVGElement).style.transform, frames: (el.getAnimations()[0]?.effect as KeyframeEffect)?.getKeyframes() }));
  expect(motion.position).not.toBe(initial); expect(motion.frames).toHaveLength(2);
  await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  expect(await pointer.evaluate((el) => (el as SVGElement).style.transform)).toBe(initial);
  expect(await pointer.evaluate((el) => el.getAnimations().length)).toBe(0);

  await page.goto('/?problem=swap-nodes-in-pairs');
  const trace = runProblem('swap-nodes-in-pairs', getProblem('swap-nodes-in-pairs').sample);
  const step = trace.frames.findIndex((f) => f.location === 'bypass');
  await seek(page, step);
  expect(await edges(page, 'retiring-edge')).toEqual(linkedListView(trace.frames[step]).retired);
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  await expect(page.getByTestId('retiring-edge')).toHaveCount(0);
  await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  expect(await edges(page, 'live-edge')).toEqual(trace.frames[0].links);
  await expect(page.getByTestId('retiring-edge')).toHaveCount(0);
});

test('desktop custom input handles self-loops, duplicate identities and source/copy separation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cases: [ProblemId, unknown, unknown][] = [
    ['intersection-of-two-linked-lists', { prefixA: [7], prefixB: [7], shared: [] }, null],
    ['linked-list-cycle', { values: [9], pos: 0 }, true],
    ['linked-list-cycle-ii', { values: [9], pos: 0 }, 0],
    ['palindrome-linked-list', { values: [1, 2] }, false],
    ['remove-nth-node-from-end-of-list', { values: [9], n: 1 }, []],
    ['swap-nodes-in-pairs', { values: [7, 7] }, [7, 7]],
    ['reverse-nodes-in-k-group', { values: [1, 2], k: 3 }, [1, 2]],
    ['copy-list-with-random-pointer', { nodes: [[1, 1], [1, 0]] }, [[1, 1], [1, 0]]],
  ];
  for (const [id, input, expected] of cases) {
    await page.goto(`/?problem=${id}`);
    await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input));
    await page.getByRole('button', { name: '运行输入', exact: true }).click();
    expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(expected);
    await page.getByLabel('执行时间轴', { exact: true }).press('End');
    const final = runProblem(id, input).frames.at(-1)!;
    expect(await edges(page, 'live-edge')).toEqual(final.links);
    if (id === 'swap-nodes-in-pairs') expect(await page.getByTestId('list-output-node').evaluateAll((items) => items.map((item) => Number(item.getAttribute('data-id'))))).toEqual([1, 0]);
  }
  expect(await edges(page, 'copy-pair')).toEqual([[0, 2], [1, 3]]);
  expect(await edges(page, 'random-edge')).toEqual([[0, 1], [1, 0], [2, 3], [3, 2]]);
  await page.getByLabel('自定义 JSON 输入').fill('{"nodes":[[1,2]]}');
  await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('输入不符合要求');
  expect(await edges(page, 'copy-pair')).toEqual([[0, 2], [1, 3]]);
  await page.getByLabel('自定义 JSON 输入').fill('{"nodes":[]}');
  await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByTestId('copy-pair')).toHaveCount(0);
  await expect(page.getByTestId('list-node')).toHaveCount(0);
});

test('desktop maximum node counts fit internal scroll lanes without page overflow', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cases: [ProblemId, unknown][] = [
    ['intersection-of-two-linked-lists', { prefixA: Array(6).fill(-10000), prefixB: Array(6).fill(10000), shared: Array(6).fill(0) }],
    ['palindrome-linked-list', { values: Array(12).fill(10000) }],
    ['linked-list-cycle', { values: Array(12).fill(1), pos: 0 }],
    ['linked-list-cycle-ii', { values: Array(12).fill(1), pos: 11 }],
    ['merge-two-sorted-lists', { a: Array(9).fill(1), b: Array(9).fill(1) }],
    ['add-two-numbers', { a: Array(8).fill(9), b: Array(8).fill(9) }],
    ['remove-nth-node-from-end-of-list', { values: Array(12).fill(1), n: 12 }],
    ['swap-nodes-in-pairs', { values: Array(12).fill(1) }],
    ['reverse-nodes-in-k-group', { values: Array(12).fill(1), k: 12 }],
    ['copy-list-with-random-pointer', { nodes: Array.from({ length: 10 }, (_, i) => [10000, i]) }],
  ];
  for (const [id, input] of cases) {
    await page.goto(`/?problem=${id}`);
    await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input));
    await page.getByRole('button', { name: '运行输入', exact: true }).click();
    expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(runProblem(id, input).result);
    await page.getByLabel('执行时间轴', { exact: true }).press('End');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.ll-node .node-disc, .ll-pointer rect').evaluateAll((items) => items.every((item) => {
      const box = item.getBoundingClientRect(), bounds = item.closest('svg')!.getBoundingClientRect();
      return box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom;
    }))).toBe(true);
  }
});
