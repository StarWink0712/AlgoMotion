import { test, expect, type Page } from '@playwright/test';
import { runProblem } from '../../src/engine/run';
import { describeFrame } from '../../src/engine/presentation';
import { finalSixProblems } from '../../src/engine/presets/final-six-catalog';
import { essentialView } from '../../src/engine/presets/final-six';
import { dpGreedyView } from '../../src/engine/presets/dp-greedy';
import { finalSixMaximums } from '../final-six-cases';

// Deferred desktop acceptance, not executed by the incremental addition task.
async function attrs(page: Page, testId: string, attribute: string) { return page.getByTestId(testId).evaluateAll((nodes,a) => nodes.map((n) => n.getAttribute(a)),attribute); }
async function seek(page: Page, step: number) { const timeline = page.getByLabel('执行时间轴',{ exact: true }); await timeline.press('Home'); for (let i = 0; i < step; i++) await timeline.press('ArrowRight'); }

for (const problem of finalSixProblems) test(`desktop ${problem.id}: rewind restores every computed state without future witnesses`, async ({ page }) => {
  test.setTimeout(120_000); await page.setViewportSize({ width: 1440,height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror',(e) => errors.push(e.message));
  await page.goto(`/?problem=${problem.id}`); await page.getByLabel('参考代码语言').selectOption('java');
  const trace = runProblem(problem.id,problem.sample);
  expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
  await page.getByLabel('执行时间轴',{ exact: true }).press('End');
  for (let step = trace.frames.length - 1; step >= 0; step--) {
    const frame = trace.frames[step];
    await expect(page.getByTestId('teaching-equation')).toHaveText(describeFrame(problem.id,frame).equation);
    await expect(page.locator('.current-line code')).toHaveText(problem.code.java.lines[problem.code.java.locations[frame.location] - 1]);
    if (problem.renderer === 'state-dp') {
      const view = dpGreedyView(frame);
      expect(await attrs(page,'dp-register','data-value')).toEqual(view.cells.map((c) => String(c.value ?? '')));
      expect(await page.getByTestId('dp-column-label').allTextContents()).toEqual(view.axes!.columns);
      expect(await page.getByTestId('dp-row-label').allTextContents()).toEqual(view.axes!.rows);
      expect(await attrs(page,'dp-alignment','data-left')).toEqual(view.alignment!.map((x) => x.left));
      expect(await attrs(page,'dp-alignment','data-right')).toEqual(view.alignment!.map((x) => x.right));
      expect(await attrs(page,'dp-alignment','data-kind')).toEqual(view.alignment!.map((x) => x.kind));
      await expect(page.getByTestId('dp-register-path')).toHaveCount(view.registerPath!.length > 1 ? 1 : 0);
    } else if (problem.id === 'find-the-duplicate-number') {
      expect(await attrs(page,'list-node','data-value')).toEqual(frame.values.map(String));
      expect(await attrs(page,'live-edge','data-to')).toEqual(frame.values.map(String));
      expect(await page.locator('.ll-pointer-summary code').allTextContents()).toEqual(Object.entries(frame.pointers).map(([name,i]) => `${name} → #${i}`));
      await expect(page.getByTestId('duplicate-phase')).toContainText(String(frame.variables.equation));
    } else {
      const view = essentialView(frame);
      if (view.kind === 'palindrome') await expect(page.getByTestId('palindrome-best')).toHaveText(JSON.stringify(view.bestText));
      else {
        expect(await attrs(page,'pending-token','data-index')).toEqual(view.pending.map(String));
        await expect(page.getByTestId('cancellation-pair')).toHaveCount(view.pair.length ? 1 : 0);
        if (view.kind === 'xor') expect(await attrs(page,'xor-row','data-bits')).toEqual(frame.location === 'init' ? [] : [view.before,view.operand,view.after].map((n) => (n & 255).toString(2).padStart(8,'0')));
        else { await expect(page.getByTestId('vote-candidate')).toHaveText(String(view.candidate ?? '未定')); await expect(page.getByTestId('vote-count')).toHaveText(String(view.count)); }
      }
    }
    if (step) await page.getByRole('button',{ name: '上一步',exact: true }).click();
  }
  for (const language of ['go','python'] as const) { await page.getByLabel('参考代码语言').selectOption(language); await expect(page.locator('.current-line code')).toHaveText(problem.code[language].lines[problem.code[language].locations[trace.frames[0].location] - 1]); }
  expect(errors).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('desktop function graph pointer travel and DP focus cancel on backward navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [id,identity,location] of [['find-the-duplicate-number','list-pointer-slow','advance'],['edit-distance','dp-focus','match']] as const) {
    await page.goto(`/?problem=${id}`); const problem = finalSixProblems.find((p) => p.id === id)!, trace = runProblem(id,problem.sample), step = trace.frames.findIndex((f) => f.location === location);
    await seek(page,step - 1); const node = page.locator(`[data-element-id="${identity}"]`), before = await node.evaluate((e) => (e as SVGElement).style.transform);
    await page.getByRole('button',{ name: '下一步',exact: true }).click(); expect(await node.evaluate((e) => (e as SVGElement).style.transform)).not.toBe(before);
    expect(await node.evaluate((e) => e.getAnimations().length)).toBeGreaterThan(0);
    await page.getByRole('button',{ name: '上一步',exact: true }).click(); expect(await node.evaluate((e) => (e as SVGElement).style.transform)).toBe(before);
    expect(await node.evaluate((e) => e.getAnimations().length)).toBe(0);
  }
});

test('desktop rerun clears old alignments and rejects malformed majority assumptions', async ({ page }) => {
  await page.goto('/?problem=edit-distance'); await page.getByLabel('执行时间轴',{ exact: true }).press('End'); expect(await page.getByTestId('dp-alignment').count()).toBeGreaterThan(0);
  await page.getByLabel('自定义 JSON 输入').fill('{"word1":"","word2":"ab"}'); await page.getByRole('button',{ name: '运行输入',exact: true }).click();
  await expect(page.getByTestId('preset-output')).toHaveText('2'); await expect(page.getByTestId('dp-alignment')).toHaveCount(0);
  await page.getByLabel('执行时间轴',{ exact: true }).press('End'); expect(await attrs(page,'dp-alignment','data-kind')).toEqual(['insert','insert']);
  await page.getByLabel('执行时间轴',{ exact: true }).press('Home'); expect(await attrs(page,'dp-register','data-value')).toEqual(['','','']);
  await page.goto('/?problem=majority-element'); await page.getByLabel('自定义 JSON 输入').fill('{"nums":[1,2]}'); await page.getByRole('button',{ name: '运行输入',exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('输入不符合要求'); await expect(page.getByTestId('preset-output')).toHaveText('2');
  await page.goto('/?problem=longest-palindromic-substring'); await page.getByLabel('自定义 JSON 输入').fill('{"s":""}'); await page.getByRole('button',{ name: '运行输入',exact: true }).click();
  await expect(page.getByTestId('palindrome-best')).toHaveText('""'); await expect(page.getByTestId('array-range')).toHaveCount(0);
});

test('desktop final presets upper bounds keep all cells, bit rows and pointer geometry inside their boards', async ({ page }) => {
  test.setTimeout(120_000); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1280,1440]) {
    await page.setViewportSize({ width,height: 1000 });
    for (const [id,input] of finalSixMaximums) {
      await page.goto(`/?problem=${id}`); await page.getByLabel('自定义 JSON 输入').fill(JSON.stringify(input)); await page.getByRole('button',{ name: '运行输入',exact: true }).click();
      const trace = runProblem(id,input); expect(JSON.parse(await page.getByTestId('preset-output').innerText())).toEqual(trace.result);
      await seek(page,Math.min(20,trace.frames.length - 1));
      for (const key of ['End','Home']) {
        expect(await page.locator('.dp-register rect, .dp-axis text, .xor-bit rect, .pending-token rect, .ll-node .node-disc, .ll-pointer rect').evaluateAll((nodes) => nodes.every((n) => { const b = n.getBoundingClientRect(), svg = n.closest('svg')!.getBoundingClientRect(); return b.left >= svg.left && b.right <= svg.right && b.top >= svg.top && b.bottom <= svg.bottom; }))).toBe(true);
        expect(await page.locator('.algorithm-scene path').evaluateAll((nodes) => nodes.every((n) => !/NaN|undefined/.test(n.getAttribute('d') ?? '')))).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByLabel('执行时间轴',{ exact: true }).press(key);
      }
    }
  }
});
