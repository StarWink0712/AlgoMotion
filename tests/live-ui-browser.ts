// Real local API + real Docker + real generated source. No page.route/mock responses.
// Imports an actual saved generation, then re-executes unchanged Python through the UI.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { parseBundle, type GeneratedFrame, type Job } from '../src/engine/generated';
import { verifyResult } from '../server/generation/verify';

const sourceFile = resolve(process.argv[2] || 'missing-file');
const original = parseBundle(await readFile(sourceFile, 'utf8'));
const browserRun = process.env.ALGOMOTION_BROWSER_RUN || '1';
assert(/^[a-zA-Z0-9-]+$/.test(browserRun));
const directory = resolve(dirname(sourceFile), `browser-${browserRun}`);
await mkdir(directory, { recursive: true });
const prefix = original.program.verification;
assert(prefix === 'grid-shortest-4' || prefix === 'grid-min-right-down');
const input = prefix === 'grid-shortest-4'
  ? { grid: [[0, 1, 0], [0, 1, 0], [0, 0, 0]], start: [0, 2], end: [2, 0] }
  : { grid: [[5, 1, 9], [1, 1, 1], [9, 1, 1]] };
const base = new URL(process.env.ALGOMOTION_LIVE_URL || 'http://127.0.0.1:5173/');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) && !base.username && !base.password);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [], modelRequests: string[] = [];
let reruns = 0;
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => {
  if (r.method() !== 'POST') return;
  const path = new URL(r.url()).pathname;
  if (path.endsWith('/parse') || path.endsWith('/model-settings/test')) modelRequests.push(path);
  if (path.endsWith('/generate/jobs')) {
    const body = r.postDataJSON();
    if (!body.program || body.design || body.repair) modelRequests.push(path); else reruns++;
  }
});
const save = (name: string, data: unknown) => writeFile(resolve(directory, `${prefix}-${name}.json`), JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 });
try {
  await page.goto(base.href);
  await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await page.getByLabel('导入生成结果').setInputFiles(sourceFile);
  await expect(page.getByText('结构合法 · 文件声明，未重验')).toBeVisible();
  await page.getByLabel('生成题 JSON 输入').fill(JSON.stringify(input));
  const completed = page.waitForResponse(async (r) => r.request().method() === 'GET' && /\/api\/generate\/jobs\//.test(r.url()) && ['complete', 'failed'].includes((await r.json()).stage), { timeout: 180_000 });
  await page.getByRole('button', { name: '复用程序重新执行' }).click();
  const job = await (await completed).json() as Job;
  await save('browser-job', job);
  assert.equal(job.stage, 'complete', job.error?.message);
  const bundle = parseBundle(JSON.stringify(job.bundle));
  assert.equal(bundle.program.python, original.program.python);
  assert.deepEqual(bundle.program.presentation, original.program.presentation);
  assert(verifyResult(prefix, input, bundle.trace.result));
  assert.equal(bundle.evidence.independent, 'passed');
  await expect(page.getByText('独立验证 · 通过', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '复用程序重新执行' })).toBeEnabled();
  const timeline = page.getByLabel('生成执行时间轴');
  const frames = bundle.trace.frames;
  if (bundle.program.presentation) {
    await expect(page.getByTestId('designed-scene')).toBeVisible();
    await timeline.press('End'); await expect(page.getByTestId('designed-scene')).toHaveAttribute('data-step', String(frames.length - 1));
    await page.getByRole('region', { name: '生成演示工作台' }).screenshot({ path: resolve(directory, `${prefix}-designed-desktop.png`) });
    await timeline.press('Home'); await expect(page.getByTestId('generated-result')).toHaveCount(0);
    await page.getByRole('button', { name: '原始轨迹', exact: true }).click();
  }
  const checkFrame = async (frame: GeneratedFrame) => {
    await expect(page.getByTestId('generated-scene')).toHaveAttribute('data-step', String(frame.step));
    assert.deepEqual(await page.locator('.grid-tile[data-visited="true"]').evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-cell')))), [...new Set(frame.visited)].sort((a, b) => a - b));
    assert.deepEqual(await page.locator('.grid-tile[data-path="true"]').evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-cell')))), [...new Set(frame.path)].sort((a, b) => a - b));
    assert.deepEqual(await page.locator('.grid-tile.is-active').evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-cell')))), [...new Set(frame.active)].sort((a, b) => a - b));
    assert.deepEqual(await page.locator('.runtime-queue-item text').allTextContents(), frame.queue.map((id) => `${Math.floor(id / frame.grid[0].length)},${id % frame.grid[0].length}`));
    assert.deepEqual(await page.getByTestId('grid-dp').locator('text').allTextContents(), frame.dp.map((value) => value === null ? '·' : String(value)));
    await expect(page.locator('.dependency-cards > div')).toHaveCount(frame.dependencies.length);
    await expect(page.getByTestId('grid-path-edge')).toHaveCount(Math.max(0, frame.path.length - 1));
    await expect(page.getByRole('region', { name: '生成演示工作台' }).locator('.current-line .line-number')).toHaveText(String(frame.line));
  };
  await timeline.press('Home'); await checkFrame(frames[0]);
  for (const frame of frames.slice(1)) { await timeline.press('ArrowRight'); await checkFrame(frame); }
  await expect(page.getByTestId('generated-result')).toHaveText(JSON.stringify(bundle.trace.result, null, 2));
  await page.getByRole('region', { name: '生成演示工作台' }).screenshot({ path: resolve(directory, `${prefix}-real-desktop.png`) });
  await timeline.press('ArrowLeft'); await checkFrame(frames[frames.length - 2]);
  await timeline.press('Home'); await checkFrame(frames[0]);
  await expect(page.getByTestId('generated-result')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '播放生成回放' }).click();
  await expect(timeline).not.toHaveValue('0', { timeout: 5000 });
  await page.getByRole('button', { name: '暂停生成回放' }).click();
  const paused = await timeline.inputValue();
  await page.waitForTimeout(1600); await expect(timeline).toHaveValue(paused);
  await timeline.press('End'); await checkFrame(frames.at(-1)!);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile page overflow');
  await page.getByRole('region', { name: '生成演示工作台' }).screenshot({ path: resolve(directory, `${prefix}-real-mobile.png`) });
  await timeline.press('Home'); await checkFrame(frames[0]);
  await page.getByRole('button', { name: '保存生成结果' }).click();
  await expect(page.getByText('已保存到本浏览器', { exact: false })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出生成结果' }).click();
  const exported = resolve(directory, `${prefix}-real-export.bundle.json`);
  await (await download).saveAs(exported);
  assert.deepEqual(parseBundle(await readFile(exported, 'utf8')), bundle);
  await page.reload();
  await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await page.getByRole('button', { name: '重新打开已保存结果' }).click();
  await expect(page.getByText('结构合法 · 文件声明，未重验')).toBeVisible();
  assert.equal(reruns, 1); assert.deepEqual(modelRequests, []); assert.deepEqual(errors, []);
  const final = frames.at(-1)!;
  const pathLengths = new Set(frames.map((f) => f.path.length));
  const traceFindings: string[] = [];
  if (final.path.length > 1 && !Array.from({ length: final.path.length }, (_, i) => i + 1).every((n) => pathLengths.has(n))) traceFindings.push('Not every reconstruction prefix/suffix length was recorded');
  if (final.active.length || final.dependencies.length || final.queue.length) traceFindings.push('Final frame retains transient focus/dependencies/queue');
  const report = { sourceProvenance: 'Provided file; real model origin must be established by its documented generation run, not inferred from an import', actualDockerRerun: true, identicalPython: true, identicalPresentation: true, aiPresentation: Boolean(bundle.program.presentation), result: bundle.trace.result, frames: frames.length, frameByFrameDOM: 'passed', backwardAndTimeline: 'passed', mobilePlayback: 'passed', saveReopenExport: 'passed', browserModelRequests: modelRequests.length, browserReruns: reruns, traceFindings, errors };
  await save('browser-report', report); console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
