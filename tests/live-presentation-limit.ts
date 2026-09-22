// Reproduces the real DP plan's 48-node graph limit with a valid 144-cell input.
// Expected failure is checked explicitly; this is not a successful presentation run.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { parseBundle, type Job } from '../src/engine/generated';
import { verifyResult } from '../server/generation/verify';
const file = resolve(process.argv[2]), original = parseBundle(await readFile(file, 'utf8'));
assert.equal(original.program.verification, 'grid-min-right-down');
const input = { grid: Array.from({ length: 12 }, () => Array(12).fill(1_000_000)) };
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors: string[] = [], modelRequests: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/generate/jobs')) { const b = r.postDataJSON(); if (!b.program || b.design || b.repair) modelRequests.push(r.url()); } });
try {
  await page.goto('http://127.0.0.1:5173/'); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await page.getByLabel('导入生成结果').setInputFiles(file);
  await page.getByLabel('生成题 JSON 输入').fill(JSON.stringify(input));
  const done = page.waitForResponse(async (r) => r.request().method() === 'GET' && /\/api\/generate\/jobs\//.test(r.url()) && ['complete', 'failed'].includes((await r.json()).stage), { timeout: 180_000 });
  await page.getByRole('button', { name: '复用程序重新执行' }).click();
  const job = await (await done).json() as Job;
  await writeFile(resolve(dirname(file), 'dp-presentation-limit-job.json'), JSON.stringify(job, null, 2), { flag: 'wx', mode: 0o600 });
  assert.equal(job.stage, 'failed'); assert.equal(job.error?.code, 'PRESENTATION_BINDING');
  const bundle = parseBundle(JSON.stringify(job.bundle));
  assert.equal(bundle.program.python, original.program.python); assert.equal(bundle.version, 1);
  assert.equal(bundle.evidence.presentation, 'failed'); assert.equal(bundle.evidence.independent, 'passed');
  assert(verifyResult('grid-min-right-down', input, bundle.trace.result));
  await expect(page.getByRole('alert')).toContainText('PRESENTATION_BINDING');
  await expect(page.getByTestId('designed-scene')).toHaveCount(0);
  await expect(page.getByTestId('generated-scene').locator('.grid-tile')).toHaveCount(144);
  await page.getByLabel('生成执行时间轴').press('End');
  await expect(page.getByTestId('generated-result')).toContainText('23000000');
  await page.getByLabel('生成执行时间轴').press('Home');
  await expect(page.getByTestId('grid-path-edge')).toHaveCount(0);
  assert.deepEqual(errors, []); assert.deepEqual(modelRequests, []);
  const report = { actualPresentation: 'failed', failureCode: job.error?.code, algorithmResult: 'passed', rawDiagnosticFallback: 'passed', modelCalls: 0, frames: bundle.trace.frames.length, errors };
  await writeFile(resolve(dirname(file), 'dp-presentation-limit-report.json'), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify(report));
} finally { await browser.close(); }
