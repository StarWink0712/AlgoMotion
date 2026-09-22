// Opt-in real paid model + real sandbox acceptance. Never substitutes mock programs.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from '../server/app';
import { DockerSandbox } from '../server/generation/sandbox';
import { parseBundle, type Job } from '../src/engine/generated';
import { bfsSource, dpSource } from './generated-fixtures';
import { ModelSettingsStore, settingsFilePath } from '../server/model-settings';

const settings = new ModelSettingsStore({ baseUrl: process.env.LLM_BASE_URL, key: process.env.LLM_API_KEY, model: process.env.LLM_MODEL, format: process.env.LLM_RESPONSE_FORMAT }, process.env.ALGOMOTION_SETTINGS_MODE === 'memory' ? undefined : settingsFilePath);
const config = settings.current();
const sandbox = new DockerSandbox(), ready = await sandbox.probe();
if (!config.baseUrl || !config.key || !config.model || !ready.available) {
  console.error(`NOT RUN: model=${Boolean(config.baseUrl && config.key && config.model)}, sandbox=${ready.available}. Configure .env or persist UI settings locally, and build/start Docker. In-memory settings in another server are not available to this CLI. No mock fallback.`);
  process.exitCode = 2;
} else if (process.env.ALGOMOTION_LIVE_ACCEPT !== '1') {
  console.error('NOT RUN: this test sends two problem descriptions and makes paid model calls. Set ALGOMOTION_LIVE_ACCEPT=1 to explicitly opt in.'); process.exitCode = 2;
} else {
  const server = createApp(config, fetch, sandbox).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('missing port');
  const base = `http://127.0.0.1:${address.port}/api/generate`;
  const post = async (path: string, body: unknown) => {
    const response = await fetch(`${base}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json(); assert.equal(response.ok, true, data.error); return data;
  };
  const wait = async (id: string) => {
    const deadline = Date.now() + 240_000;
    while (Date.now() < deadline) {
      const job: Job = await (await fetch(`${base}/jobs/${id}`)).json();
      if (['complete', 'failed'].includes(job.stage)) return job;
      await new Promise((r) => setTimeout(r, 500));
    }
    await fetch(`${base}/jobs/${id}`, { method: 'DELETE' }); throw new Error('Live job deadline exceeded; cancellation requested');
  };
  try {
    for (const [kind, source] of [['grid-shortest-4', bfsSource], ['grid-min-right-down', dpSource]] as const) {
      const { contract } = await post('parse', { source });
      assert.equal(contract.supported, true, 'Model says unsupported');
      assert.equal(contract.questions.length, 0, 'Unresolved questions require a human; live test will not silently resolve them');
      const { id } = await post('jobs', { source, contract, verification: kind, confirmed: true, design: true });
      const job = await wait(id);
      const directory = resolve('artifacts', `live-presentation-${new Date().toISOString().replace(/[:.]/g, '-')}`); await mkdir(directory, { recursive: true });
      // Sanitized app data, never config, headers, raw provider errors or credentials.
      await writeFile(resolve(directory, `${kind}.json`), JSON.stringify(job.bundle ?? job, null, 2));
      assert.equal(job.stage, 'complete', job.error?.message);
      const bundle = parseBundle(JSON.stringify(job.bundle));
      assert.equal(bundle.evidence.independent, 'passed'); assert.equal(bundle.evidence.examples, 'passed');
      assert.equal(bundle.evidence.teaching?.status, 'passed'); assert.equal(bundle.evidence.presentation, 'passed'); assert.equal(bundle.version, 2);
      const changed = kind === 'grid-shortest-4' ? { grid: [[0, 0], [0, 0]], start: [0, 0], end: [1, 1] } : { grid: [[2, 9], [1, 1]] };
      const rerun = await post('jobs', { program: bundle.program, input: changed, confirmed: true });
      const next = await wait(rerun.id); assert.equal(next.stage, 'complete', next.error?.message);
      assert.equal(next.program?.python, bundle.program.python);
      assert.deepEqual(next.program?.presentation, bundle.program.presentation);
      console.log(`PASS LIVE ${kind}: real model, real Python/Docker, independent references, teaching checks, AI SceneSpec and input rerun with identical source/layout.`);
    }
  } finally { await new Promise<void>((r) => server.close(() => r())); }
}
