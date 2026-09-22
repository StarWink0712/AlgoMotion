import { expect, test, type Page } from '@playwright/test';
import { problems, getProblem } from '../../src/engine/catalog';
import { runProblem } from '../../src/engine/run';
import { describeFrame } from '../../src/engine/presentation';
import { treeSchemas, treeView } from '../../src/engine/presets/trees';
import type { ProblemId } from '../../src/engine/types';

// Batch 6 desktop checks are authored for the deferred consolidated acceptance run.
async function seek(page: Page, step: number) {
  const timeline = page.getByLabel('执行时间轴', { exact: true }); await timeline.press('Home');
  for (let i = 0; i < step; i++) await timeline.press('ArrowRight');
}
async function edges(page: Page, testId: string) {
  return page.getByTestId(testId).evaluateAll((items) => items.map((el) => ({ from: Number(el.getAttribute('data-from')), to: Number(el.getAttribute('data-to')), side: el.getAttribute('data-side') })));
}

for (const problem of problems.filter((p) => p.id in treeSchemas)) {
  test(`desktop ${problem.id}: rewind restores node identities, child sides, calls and partial outputs`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/?problem=${problem.id}`); await page.getByLabel('参考代码语言').selectOption('java');
    const trace = runProblem(problem.id, problem.sample);
    expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
    await page.getByLabel('执行时间轴', { exact: true }).press('End');
    for (let step = trace.frames.length - 1; step >= 0; step--) {
      const frame = trace.frames[step], view = treeView(frame);
      await expect(page.getByTestId('teaching-equation')).toHaveText(describeFrame(problem.id, frame).equation);
      await expect(page.locator('.current-line code')).toHaveText(problem.code.java.lines[problem.code.java.locations[frame.location] - 1]);
      expect(await page.getByTestId('tree-node').evaluateAll((items) => items.map((el) => Number(el.getAttribute('data-value'))))).toEqual(frame.values);
      expect(await edges(page, 'tree-edge')).toEqual(frame.links!.map(([from, to]) => ({ from, to, side: frame.edgeLabels![`${from}-${to}`] })));
      expect(await edges(page, 'tree-retired-edge')).toEqual(view.retired);
      expect(await page.getByTestId('tree-output-node').evaluateAll((items) => items.map((el) => Number(el.getAttribute('data-id'))))).toEqual(view.output);
      const expectedWork = frame.queue ?? view.stack.map((call) => call.node);
      expect(await page.getByTestId('tree-work-item').evaluateAll((items) => items.map((el) => el.getAttribute('data-node') === 'null' ? null : Number(el.getAttribute('data-node'))))).toEqual(expectedWork);
      if (view.returning?.to !== null && view.returning?.to !== undefined) {
        await expect(page.getByTestId('tree-return')).toHaveAttribute('data-value', String(view.returning.value));
        await expect(page.getByTestId('tree-return')).toHaveAttribute('data-to', String(view.returning.to));
      } else await expect(page.getByTestId('tree-return')).toHaveCount(0);
      expect(await page.locator('.tree-lab-scene path').evaluateAll((paths) => paths.every((path) => !/NaN|undefined/.test(path.getAttribute('d') ?? '')))).toBe(true);
      if (step) await page.getByRole('button', { name: '上一步', exact: true }).click();
    }
    for (const language of ['go', 'python'] as const) {
      await page.getByLabel('参考代码语言').selectOption(language);
      const code = problem.code[language]; await expect(page.locator('.current-line code')).toHaveText(code.lines[code.locations[trace.frames[0].location] - 1]);
    }
    expect(errors).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('desktop subtree swaps and flattening move the same nodes and cancel on rewind', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [id, location, node] of [['invert-binary-tree', 'swap', 1], ['flatten-binary-tree-to-linked-list', 'advance', 0]] as const) {
    await page.goto(`/?problem=${id}`);
    const token = page.locator(`[data-element-id="tree-${node}"]`), initial = await token.evaluate((el) => (el as SVGElement).style.transform);
    const trace = runProblem(id, getProblem(id).sample); await seek(page, trace.frames.findIndex((f) => f.location === location));
    const moved = await token.evaluate((el) => ({ position: (el as SVGElement).style.transform, frames: (el.getAnimations()[0]?.effect as KeyframeEffect)?.getKeyframes() }));
    expect(moved.position).not.toBe(initial); expect(moved.frames).toHaveLength(id === 'invert-binary-tree' ? 3 : 2);
    await page.getByLabel('执行时间轴', { exact: true }).press('Home');
    expect(await token.evaluate((el) => (el as SVGElement).style.transform)).toBe(initial);
    expect(await token.evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect(page.getByTestId('tree-retired-edge')).toHaveCount(0);
  }
});

test('desktop construction does not reveal future nodes and invalid BST rank retains the last result', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?problem=convert-sorted-array-to-binary-search-tree');
  await expect(page.getByTestId('tree-node')).toHaveCount(0);
  await expect(page.getByTestId('tree-source-item')).toHaveCount(5);
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  await expect(page.getByTestId('tree-node')).toHaveCount(5);
  await page.getByLabel('执行时间轴', { exact: true }).press('Home');
  await expect(page.getByTestId('tree-node')).toHaveCount(0);
  await page.goto('/?problem=kth-smallest-element-in-a-bst');
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  await expect(page.getByTestId('tree-output-node')).toHaveCount(1);
  await page.getByLabel('自定义 JSON 输入').fill('{"tree":[2,1,2],"k":1}');
  await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('输入不符合要求');
  await expect(page.getByTestId('preset-output')).toHaveText('1');
  await expect(page.getByTestId('tree-output-node')).toHaveCount(1);
});

test('desktop full and sparse tree bounds keep nodes, work tokens and flattened chains inside their SVGs', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const cases: [ProblemId, unknown][] = [
    ['binary-tree-inorder-traversal', { tree: Array(15).fill(-10000) }],
    ['maximum-depth-of-binary-tree', { tree: [1, null, 2, null, 3, null, 4, null, 5] }],
    ['invert-binary-tree', { tree: Array(15).fill(10000) }],
    ['symmetric-tree', { tree: [1, 2, 2, null, 3, null, 3] }],
    ['diameter-of-binary-tree', { tree: [0, 1, null, 2, 3, 4, null, null, 5, 6, null, null, 7] }],
    ['convert-sorted-array-to-binary-search-tree', { nums: Array.from({ length: 15 }, (_, i) => i) }],
    ['validate-binary-search-tree', { tree: [5, 1, 7, null, null, 4, 8] }],
    ['kth-smallest-element-in-a-bst', { tree: [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15], k: 15 }],
    ['binary-tree-right-side-view', { tree: Array(15).fill(0) }],
    ['flatten-binary-tree-to-linked-list', { tree: Array(15).fill(0) }],
  ];
  for (const [id, input] of cases) {
    await page.goto(`/?problem=${id}`); await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input));
    await page.getByRole('button', { name: '运行输入', exact: true }).click();
    const trace = runProblem(id, input); expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
    await seek(page, Math.floor(trace.frames.length / 2));
    for (const key of ['End', 'Home']) {
      expect(await page.locator('.tree-lab-node .node-disc, .tree-work-token rect').evaluateAll((items) => items.every((item) => {
        const box = item.getBoundingClientRect(), bounds = item.closest('svg')!.getBoundingClientRect();
        return box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom;
      }))).toBe(true);
      await page.getByLabel('执行时间轴', { exact: true }).press(key);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
