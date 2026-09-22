// Opt-in regression using previously recorded real programs and the running API.
// No mock transport, new model request, key retrieval or host Python execution.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { parseBundle, type Job } from '../src/engine/generated';
import { verifyResult } from '../server/generation/verify';

const bfsFile = resolve(process.argv[2]), dpFile = resolve(process.argv[3]);
const bfs = parseBundle(await readFile(bfsFile, 'utf8')), dp = parseBundle(await readFile(dpFile, 'utf8'));
assert.equal(bfs.program.verification, 'grid-shortest-4'); assert.equal(dp.program.verification, 'grid-min-right-down');
assert(bfs.program.presentation); assert(dp.program.presentation?.panels.some((p) => p.kind === 'graph' && p.source === 'grid'));
const directory = resolve('artifacts', `presentation-fixes-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors: string[] = [], requests: { model: boolean }[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => {
  if (r.method() !== 'POST') return;
  if (r.url().endsWith('/generate/jobs')) { const body = r.postDataJSON(); requests.push({ model: !body.program || Boolean(body.design || body.repair) }); }
  if (r.url().endsWith('/generate/parse') || r.url().endsWith('/model-settings/test')) requests.push({ model: true });
});
const save = (name: string, data: unknown) => writeFile(resolve(directory, name), JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 });
try {
  await page.goto('http://127.0.0.1:5173/'); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  const rerun = async (input: unknown, name: string) => {
    await page.getByLabel('生成题 JSON 输入').fill(JSON.stringify(input));
    const completed = page.waitForResponse(async (r) => r.request().method() === 'GET' && /\/api\/generate\/jobs\//.test(r.url()) && ['complete', 'failed'].includes((await r.json()).stage), { timeout: 180_000 });
    await page.getByRole('button', { name: '复用程序重新执行' }).click();
    const job = await (await completed).json() as Job; await save(name, job);
    await expect(page.getByRole('button', { name: '复用程序重新执行' })).toBeEnabled(); return job;
  };
  await page.getByLabel('导入生成结果').setInputFiles(bfsFile);
  const input = { grid: [[0, 1, 0], [0, 1, 0], [0, 0, 0]], start: [0, 2], end: [2, 0] };
  const first = await rerun(input, 'bfs-changed.json');
  assert.equal(first.stage, 'complete', first.error?.message);
  const b = parseBundle(JSON.stringify(first.bundle)); assert.deepEqual(b.program, bfs.program); assert(verifyResult('grid-shortest-4', input, b.trace.result));
  const scene = page.getByTestId('designed-scene'), timeline = page.getByLabel('生成执行时间轴');
  await expect(page.getByTestId('current-scene-summary')).toHaveText('第 1 帧 · 当前网格 3 行 × 3 列');
  assert(!(await scene.innerText()).includes(bfs.program.presentation!.description));
  await expect(page.getByTestId('generated-result')).toHaveCount(0);
  await scene.screenshot({ path: resolve(directory, 'metadata-fixed-desktop.png') });
  await page.getByText('查看 AI 设计原文与 JSON（静态，可能剧透）', { exact: true }).click();
  await expect(page.getByText('以下标题和说明是生成时的 AI 原文', { exact: false })).toBeVisible();
  await expect(page.locator('.presentation-toolbar pre')).toContainText(bfs.program.presentation!.description);
  await page.setViewportSize({ width: 390, height: 844 });
  const second = await rerun({ grid: [[0]], start: [0, 0], end: [0, 0] }, 'bfs-single-cell.json');
  assert.equal(second.stage, 'complete', second.error?.message);
  await expect(page.getByTestId('current-scene-summary')).toHaveText('第 1 帧 · 当前网格 1 行 × 1 列');
  await expect(page.locator('.presentation-toolbar pre')).toHaveCount(0);
  await timeline.press('End'); await expect(page.getByTestId('generated-result')).toContainText('"distance": 0');
  await timeline.press('Home'); await expect(page.getByTestId('generated-result')).toHaveCount(0);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await scene.screenshot({ path: resolve(directory, 'metadata-fixed-mobile.png') });

  await page.setViewportSize({ width: 1440, height: 950 });
  await page.getByLabel('导入生成结果').setInputFiles(dpFile);
  const failed = await rerun(dp.trace.input, 'dp-small-preflight.json');
  assert.equal(failed.stage, 'failed'); assert.equal(failed.error?.code, 'PRESENTATION_BINDING');
  assert.match(failed.error!.message, /独立边界 6.*144.*48/);
  const raw = parseBundle(JSON.stringify(failed.bundle)); assert.equal(raw.version, 1);
  assert.equal(raw.program.python, dp.program.python); assert(verifyResult('grid-min-right-down', raw.trace.input, raw.trace.result));
  assert.equal(raw.evidence.independent, 'passed'); assert.equal(raw.evidence.presentation, 'failed');
  await expect(page.getByRole('alert')).toContainText('独立边界 6'); await expect(scene).toHaveCount(0);
  await expect(page.getByTestId('generated-scene').locator('.grid-tile')).toHaveCount(raw.trace.frames[0].grid.flat().length);
  await timeline.press('End'); await expect(page.getByTestId('generated-result')).toHaveText(JSON.stringify(raw.trace.result, null, 2));
  await timeline.press('Home'); await expect(page.getByTestId('grid-path-edge')).toHaveCount(0);
  await page.getByRole('region', { name: '生成演示工作台' }).screenshot({ path: resolve(directory, 'capacity-blocked-before-completion.png') });
  assert.equal(requests.length, 3); assert.equal(requests.filter((r) => r.model).length, 0); assert.deepEqual(errors, []);
  const report = { sourceProvenance: 'Previously recorded real-model bundles supplied by the caller; no new model generation', actualDockerReruns: 3, modelCalls: 0,
    metadataIsolationAndInputRefresh: 'passed', mobileAndRewind: 'passed', smallInputBoundaryPreflight: 'passed', expectedBadPlan: 'rejected', readableRawFailureBundle: 'passed', errors, directory };
  await save('report.json', report); console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
