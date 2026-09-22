// Real running API, real generated Python and real Docker. No page.route or fixtures.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { parseBundle, type Job } from '../src/engine/generated';
import { resolveBinding, sequenceValues } from '../src/engine/scene-spec';

const file = resolve(process.argv[2]), original = parseBundle(await readFile(file, 'utf8'));
assert(original.program.presentation, 'Requires an actual AI-designed bundle');
const input = { temperatures: [73, 74, 75, 71, 69, 72, 76, 73] };
const expected = { waits: input.temperatures.map((v, i) => { for (let j = i + 1; j < input.temperatures.length; j++) if (input.temperatures[j] > v) return j - i; return 0; }) };
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [], requests: { model: boolean }[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => {
  if (r.method() !== 'POST') return;
  const path = new URL(r.url()).pathname;
  if (path.endsWith('/parse') || path.endsWith('/model-settings/test')) requests.push({ model: true });
  if (path.endsWith('/generate/jobs')) { const body = r.postDataJSON(); requests.push({ model: !body.program || Boolean(body.design || body.repair) }); }
});
const run = process.env.ALGOMOTION_BROWSER_RUN ?? '1';
assert(/^[a-zA-Z0-9-]+$/.test(run));
const output = (name: string) => resolve(dirname(file), `stack-browser-${run}-${name}`);
try {
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await page.getByLabel('导入生成结果').setInputFiles(file);
  await expect(page.getByTestId('designed-scene')).toBeVisible();
  await page.getByLabel('生成题 JSON 输入').fill(JSON.stringify(input));
  const completion = page.waitForResponse(async (r) => r.request().method() === 'GET' && /\/api\/generate\/jobs\//.test(r.url()) && ['complete', 'failed'].includes((await r.json()).stage), { timeout: 180_000 });
  await page.getByRole('button', { name: '复用程序重新执行' }).click();
  const job = await (await completion).json() as Job;
  await writeFile(output('job.json'), JSON.stringify(job, null, 2), { flag: 'wx', mode: 0o600 });
  assert.equal(job.stage, 'complete', job.error?.message);
  const bundle = parseBundle(JSON.stringify(job.bundle)), frames = bundle.trace.frames, spec = bundle.program.presentation!;
  assert.deepEqual(bundle.program, original.program); assert.deepEqual(bundle.trace.result, expected);
  assert.equal(bundle.evidence.independent, 'not_run', 'The production UI must not invent a built-in independent checker for this task');
  const timeline = page.getByLabel('生成执行时间轴'), scene = page.getByTestId('designed-scene');
  const show = (v: unknown) => v === null ? '·' : typeof v === 'string' ? v : JSON.stringify(v);
  const check = async (step: number) => {
    const frame = frames[step], context = { frame, input, result: bundle.trace.result, final: step === frames.length - 1 };
    await expect(scene).toHaveAttribute('data-step', String(step));
    for (const panel of spec.panels) {
      const value = resolveBinding(panel.source, context), element = scene.locator(`[data-panel-id="${panel.id}"]`);
      if (value === undefined) { await expect(element).toContainText(/尚未记录|最后一帧/); continue; }
      if (['sequence', 'queue', 'stack', 'path'].includes(panel.kind)) {
        const values = sequenceValues(value, panel.kind === 'sequence');
        const labels = values.map((v) => panel.source === 'queue' || panel.source === 'path' ? `(${Math.floor(Number(v) / frame.grid[0].length)},${Number(v) % frame.grid[0].length})` : show(v));
        if (panel.kind === 'stack') labels.reverse();
        const selector = panel.kind === 'sequence' && panel.style === 'bars' ? '.scene-bar > b' : '.scene-token > b';
        assert.deepEqual(await element.locator(selector).allTextContents(), labels);
      }
    }
    await expect(page.getByRole('region', { name: '生成演示工作台' }).locator('.current-line .line-number')).toHaveText(String(frame.line));
    if (!context.final) await expect(page.getByTestId('generated-result')).toHaveCount(0);
  };
  await expect(page.getByRole('button', { name: '复用程序重新执行' })).toBeEnabled();
  await timeline.press('Home'); await check(0);
  for (let i = 1; i < frames.length; i++) { await timeline.press('ArrowRight'); await check(i); }
  await expect(page.getByTestId('generated-result')).toHaveText(JSON.stringify(expected, null, 2));
  await scene.screenshot({ path: output('desktop.png') });
  await timeline.press('ArrowLeft'); await check(frames.length - 2);
  await timeline.press('Home'); await check(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '播放生成回放' }).click();
  await expect(timeline).not.toHaveValue('0', { timeout: 5000 });
  await page.getByRole('button', { name: '暂停生成回放' }).click();
  await timeline.press('End'); await check(frames.length - 1);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await scene.screenshot({ path: output('mobile.png') });
  await timeline.press('Home'); await check(0);
  await page.getByRole('button', { name: '保存生成结果' }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: '导出生成结果' }).click();
  await (await download).saveAs(output('export.json'));
  assert.deepEqual(parseBundle(await readFile(output('export.json'), 'utf8')), bundle);
  await page.reload(); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await page.getByRole('button', { name: '重新打开已保存结果' }).click();
  await expect(scene).toBeVisible(); await expect(page.getByText('展示绑定 · 文件声明，未重验')).toBeVisible();
  assert.equal(requests.filter((r) => r.model).length, 0); assert.equal(requests.length, 1); assert.deepEqual(errors, []);
  const report = { realDockerRerun: true, modelCalls: 0, identicalPythonAndPresentation: true, externalQuadraticReference: 'passed', productionIndependentEvidence: bundle.evidence.independent,
    frames: frames.length, panels: spec.panels.map((p) => p.kind), frameBindingsAndCodeLines: 'passed', seekMobileSaveReopenExport: 'passed', distinctSourceLines: new Set(frames.map((f) => f.line)).size, errors };
  await writeFile(output('report.json'), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
