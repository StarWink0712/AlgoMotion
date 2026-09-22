import { expect, test, type Page } from '@playwright/test';
import { runProblem } from '../../src/engine/run';
import { describeFrame } from '../../src/engine/presentation';
import { orderingStructuresProblems } from '../../src/engine/presets/ordering-structures-catalog';
import { orderingView } from '../../src/engine/presets/ordering';
import { structuresView } from '../../src/engine/presets/structures';
import type { ProblemId } from '../../src/engine/types';

// Batch 9 desktop tests are authored here, not executed during incremental implementation.
async function seek(page: Page, step: number) {
  const timeline = page.getByLabel('执行时间轴', { exact: true }); await timeline.press('Home');
  for (let i = 0; i < step; i++) await timeline.press('ArrowRight');
}
async function attributes(page: Page, testId: string, name: string) {
  return page.getByTestId(testId).evaluateAll((nodes, attribute) => nodes.map((node) => node.getAttribute(attribute)), name);
}
for (const problem of orderingStructuresProblems) test(`desktop ${problem.id}: reversed snapshots restore identities, cuts, heap slots and terminal flags`, async ({ page }) => {
  test.setTimeout(120_000); await page.setViewportSize({ width: 1440, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/?problem=${problem.id}`); await page.getByLabel('参考代码语言').selectOption('java');
  const trace = runProblem(problem.id, problem.sample);
  expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  for (let step = trace.frames.length - 1; step >= 0; step--) {
    const frame = trace.frames[step];
    await expect(page.getByTestId('teaching-equation')).toHaveText(describeFrame(problem.id, frame).equation);
    await expect(page.locator('.current-line code')).toHaveText(problem.code.java.lines[problem.code.java.locations[frame.location] - 1]);
    if (problem.renderer === 'ordering') {
      const view = orderingView(frame);
      if (view.kind === 'array') {
        expect(await page.locator('.scene-tile .scene-value').allTextContents()).toEqual(frame.values.map(String));
        expect(await page.locator('.scene-tile').evaluateAll((nodes) => nodes.map((n) => Number(n.getAttribute('data-element-id'))))).toEqual(frame.elementIds);
      } else if (view.kind === 'matrix') {
        expect(await attributes(page, 'ordering-cell', 'data-id')).toEqual(frame.elementIds!.map(String));
        expect(await attributes(page, 'ordering-cell', 'data-value')).toEqual(frame.values.map(String));
        expect(await attributes(page, 'ordering-cell', 'data-allowed')).toEqual(frame.values.map((_, i) => String(view.allowed.includes(i))));
      } else {
        expect(await attributes(page, 'partition-cut', 'data-cut')).toEqual(view.cuts?.map(String) ?? []);
        if (view.boundaries) expect(await attributes(page, 'partition-comparison', 'data-valid')).toEqual([String((view.boundaries.aLeft ?? -Infinity) <= (view.boundaries.bRight ?? Infinity)), String((view.boundaries.bLeft ?? -Infinity) <= (view.boundaries.aRight ?? Infinity))]);
      }
    } else {
      const view = structuresView(frame);
      expect(await attributes(page, 'heap-slot', 'data-id')).toEqual(view.heaps.flatMap((h) => h.ids).map(String));
      expect(await page.getByTestId('structure-output').allTextContents()).toEqual(view.outputs.map(String));
      const visible = view.kind === 'trie' ? view.nodes.map((n) => n.id) : [...view.heaps.flatMap((h) => h.ids), ...(view.held === null ? [] : [view.held])];
      expect((await attributes(page, 'structure-node', 'data-id')).map(Number).sort((a, b) => a - b)).toEqual([...visible].sort((a, b) => a - b));
      const expectedValues = Object.fromEntries(visible.map((id) => [id, String(frame.values[id])]));
      expect(await page.getByTestId('structure-node').evaluateAll((nodes) => Object.fromEntries(nodes.map((node) => [node.getAttribute('data-id'), node.getAttribute('data-value')])))).toEqual(expectedValues);
      if (view.kind === 'trie') {
        expect(await page.getByTestId('structure-node').evaluateAll((nodes) => nodes.filter((n) => n.getAttribute('data-terminal') === 'true').map((n) => Number(n.getAttribute('data-id'))).sort((a, b) => a - b))).toEqual(view.nodes.filter((n) => n.terminal).map((n) => n.id).sort((a, b) => a - b));
      }
      await expect(page.getByTestId('structure-median')).toHaveCount(view.median ? 1 : 0);
    }
    if (step) await page.getByRole('button', { name: '上一步', exact: true }).click();
  }
  for (const language of ['go', 'python'] as const) {
    await page.getByLabel('参考代码语言').selectOption(language); const code = problem.code[language];
    await expect(page.locator('.current-line code')).toHaveText(code.lines[code.locations[trace.frames[0].location] - 1]);
  }
  expect(errors).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('desktop matrix swaps and heap swaps move original identities; rewind cancels their animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [id, location, identity] of [['rotate-image', 'transpose', 'ordering-cell-1'], ['kth-largest-element-in-an-array', 'heap-swap', 'structure-0']] as const) {
    await page.goto(`/?problem=${id}`); const problem = orderingStructuresProblems.find((p) => p.id === id)!, trace = runProblem(id, problem.sample);
    const step = trace.frames.findIndex((f) => f.location === location); await seek(page, step - 1);
    const node = page.locator(`[data-element-id="${identity}"]`), before = await node.evaluate((el) => (el as SVGElement).style.transform);
    await page.getByRole('button', { name: '下一步', exact: true }).click();
    expect(await node.evaluate((el) => (el as SVGElement).style.transform)).not.toBe(before);
    expect(await node.evaluate((el) => (el.getAnimations()[0]?.effect as KeyframeEffect)?.getKeyframes().length)).toBe(3);
    await page.getByRole('button', { name: '上一步', exact: true }).click();
    expect(await node.evaluate((el) => (el as SVGElement).style.transform)).toBe(before);
    expect(await node.evaluate((el) => el.getAnimations().length)).toBe(0);
  }
});

test('desktop rerun clears trie terminal history and rejects empty median without losing last result', async ({ page }) => {
  await page.goto('/?problem=implement-trie-prefix-tree'); await page.getByLabel('执行时间轴', { exact: true }).press('End');
  await page.getByLabel('自定义 JSON 输入').fill('{"operations":[{"op":"search","word":"app"}]}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect.poll(async () => JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual([false]); await expect(page.getByTestId('structure-node')).toHaveCount(1);
  await page.goto('/?problem=median-of-two-sorted-arrays');
  await page.getByLabel('自定义 JSON 输入').fill('{"a":[],"b":[2,3]}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByTestId('preset-output')).toHaveText('2.5'); await page.getByLabel('执行时间轴', { exact: true }).press('End');
  expect(await attributes(page, 'partition-cut', 'data-cut')).toEqual(['0', '1']);
  await page.getByLabel('自定义 JSON 输入').fill('{"a":[],"b":[]}'); await page.getByRole('button', { name: '运行输入', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('输入不符合要求'); await expect(page.getByTestId('preset-output')).toHaveText('2.5');
});

test('desktop maximum widths use internal scrolling and finite node, matrix and cut geometry', async ({ page }) => {
  test.setTimeout(120_000); await page.emulateMedia({ reducedMotion: 'reduce' });
  const inputs: [ProblemId, unknown][] = [
    ['first-missing-positive', { nums: Array.from({ length: 24 }, (_, i) => 24 - i) }], ['rotate-image', { matrix: Array.from({ length: 6 }, () => Array(6).fill(-10000)) }],
    ['search-a-2d-matrix', { matrix: Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => r * 6 + c)), target: 30 }],
    ['search-a-2d-matrix-ii', { matrix: Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => r + c)), target: -1 }],
    ['find-minimum-in-rotated-sorted-array', { nums: Array.from({ length: 24 }, (_, i) => (i + 7) % 24) }],
    ['median-of-two-sorted-arrays', { a: [], b: Array.from({ length: 24 }, (_, i) => i) }],
    ['kth-largest-element-in-an-array', { nums: Array.from({ length: 24 }, (_, i) => 24 - i), k: 24 }],
    ['top-k-frequent-elements', { nums: Array.from({ length: 24 }, (_, i) => i), k: 24 }],
    ['find-median-from-data-stream', { operations: [...Array.from({ length: 16 }, (_, i) => ({ op: 'addNum', value: i % 2 ? i : -i })), { op: 'findMedian' }] }],
    ['implement-trie-prefix-tree', { operations: ['abcde','fghij','klmno','pqrst','uvwx'].map((word) => ({ op: 'insert', word })) }],
  ];
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [id, input] of inputs) {
      await page.goto(`/?problem=${id}`); await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input)); await page.getByRole('button', { name: '运行输入', exact: true }).click();
      const trace = runProblem(id, input); expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
      await seek(page, Math.min(24, trace.frames.length - 1));
      for (const next of ['End', 'Home']) {
        expect(await page.locator('.ordering-item rect, .structure-node > g > circle:first-child, .scene-tile > rect').evaluateAll((nodes) => nodes.every((n) => {
          const b = n.getBoundingClientRect(), svg = n.closest('svg')!.getBoundingClientRect(); return b.left >= svg.left && b.right <= svg.right && b.top >= svg.top && b.bottom <= svg.bottom;
        }))).toBe(true);
        expect(await page.locator('.ordering-board path, .structures-board path').evaluateAll((nodes) => nodes.every((n) => !/NaN|undefined/.test(n.getAttribute('d') ?? '')))).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByLabel('执行时间轴', { exact: true }).press(next);
      }
    }
  }
});
