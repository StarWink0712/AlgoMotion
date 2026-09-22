// Opt-in real integration against an ALREADY RUNNING local API. Never reads keys.
// Separate parse/generate commands allow inspection of the actual contract first.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { contractSchema, parseBundle, type Job, type Verification } from '../src/engine/generated';
import { verifyResult } from '../server/generation/verify';
import { bfsSource, dpSource } from './generated-fixtures';

const action = process.argv[2], name = process.argv[3];
const attempt = process.env.ALGOMOTION_LIVE_ATTEMPT === '2' ? '-2' : '';
const cases = {
  bfs: { kind: 'grid-shortest-4', source: `${bfsSource}\n样例输入 {"grid":[[0,0,1,0],[1,0,0,0],[0,0,1,0],[0,0,0,0]],"start":[0,0],"end":[3,3]}，最短距离为 6，可以返回任意一条合法最短路径。`,
    changed: { grid: [[0, 1, 0], [0, 1, 0], [0, 0, 0]], start: [0, 2], end: [2, 0] } },
  dp: { kind: 'grid-min-right-down', source: `${dpSource}\n样例输入 {"grid":[[2,8,1,9],[1,3,1,2],[7,1,4,1]]}，最小和为 10，可以返回任意一条达到最小和的合法路径。`,
    changed: { grid: [[5, 1, 9], [1, 1, 1], [9, 1, 1]] } },
  stack: { kind: 'none', source: '给定 JSON 对象 {temperatures:[整数]}，temperatures 为必填字段，长度 0 到 40，温度范围 -100 到 100。对每一天求下一次严格更高温度需要等待的天数，没有则为 0。返回 JSON 对象 {waits:[整数]}，输出数组与输入等长。相等温度不算更高；空输入返回 {waits:[]}。样例 {temperatures:[30,40,35,50,50]} 返回 {waits:[1,2,1,0,0]}。请用单调栈求解，在实际循环里记录温度数组、待解决的索引栈、弹栈与等待天数写入过程。索引从 0 开始，展示限于受控的序列、栈和状态。规则均已明确，不需要选择默认规则。',
    changed: { temperatures: [73, 74, 75, 71, 69, 72, 76, 73] } },
} satisfies Record<string, { kind: Verification; source: string; changed: unknown }>;

// Independent test-only O(n^2) reference, not a generated solver or production special case.
function checkOutput(kind: Verification, input: unknown, result: unknown) {
  if (kind !== 'none') return verifyResult(kind, input, result);
  const values = (input as { temperatures: number[] }).temperatures;
  const waits = values.map((v, i) => { for (let j = i + 1; j < values.length; j++) if (values[j] > v) return j - i; return 0; });
  try { assert.deepEqual(result, { waits }); return true; } catch { return false; }
}

const base = new URL(process.env.ALGOMOTION_LIVE_URL || 'http://127.0.0.1:5173');
assert(['http:', 'https:'].includes(base.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) && !base.username && !base.password && !base.search && !base.hash && base.pathname === '/', 'Only a loopback API origin is accepted');
const run = process.env.ALGOMOTION_LIVE_RUN || 'manual';
assert(/^[a-zA-Z0-9-]{1,80}$/.test(run), 'Invalid run name');
const directory = resolve('artifacts', `live-ui-${run}`);
const file = (suffix: string) => resolve(directory, suffix);
await mkdir(directory, { recursive: true });
const save = (suffix: string, data: unknown) => writeFile(file(suffix), JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 });
async function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(new URL(`/api/${path}`, base), {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(105_000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${data.error || 'Local API failure'}`);
  return data;
}
async function execute(body: unknown) {
  const { id } = await request('generate/jobs', body);
  assert(typeof id === 'string');
  let stage = '';
  const deadline = Date.now() + 240_000;
  try {
    while (Date.now() < deadline) {
      const job: Job = await request(`generate/jobs/${id}`);
      if (job.stage !== stage) { stage = job.stage; console.log(`LIVE ${name}: ${stage}`); }
      if (['complete', 'failed'].includes(job.stage)) return job;
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error('Job deadline exceeded');
  } catch (e) {
    await fetch(new URL(`/api/generate/jobs/${id}`, base), { method: 'DELETE', signal: AbortSignal.timeout(10_000) });
    throw e;
  }
}

try {
  if (['connect', 'parse', 'generate', 'repair', 'design'].includes(action)) assert.equal(process.env.ALGOMOTION_LIVE_ACCEPT, '1', 'Real paid requests require ALGOMOTION_LIVE_ACCEPT=1');
  const status = await request('generate/status');
  assert.equal(status.sandbox.available, true, 'Docker not ready; no host Python fallback');
  if (action === 'connect') {
    const { settings, token } = await request('model-settings');
    assert.equal(settings.configured, true);
    const { provider, baseUrl, model, format, tokenParameter, thinking, maxOutputTokens } = settings;
    const result = await request('model-settings/test', { provider, baseUrl, model, format, tokenParameter, thinking, maxOutputTokens, apiKey: '', persistence: 'session', consent: true }, { 'X-AlgoMotion-Settings-Token': token });
    await save('connection.json', { provider, model, result });
    console.log(JSON.stringify({ provider, model, result }));
  } else {
    assert(name === 'bfs' || name === 'dp' || name === 'stack', 'Case must be bfs, dp or stack');
    const test = cases[name];
    if (action === 'parse') {
      const source = (process.env.ALGOMOTION_LIVE_SOURCE ?? test.source) + (process.env.ALGOMOTION_LIVE_CLARIFY === '1' ? '\n补充明确约定：所有坐标采用 0 起始索引；输入保证满足上述范围且各行等长。返回值只包含题目指定字段，过程信息通过独立 trace SDK 记录，不放入返回值。多条最优路径时任意一条均可，无字典序要求。只需提供 1 到 2 个简短的说明样例。' : '')
        + (process.env.ALGOMOTION_LIVE_CONTRACT_HINT === '1' ? `\n约定要求：输入字段 ${name === 'bfs' ? 'grid,start,end' : name === 'dp' ? 'grid' : 'temperatures'} 全部必填，请在输入 JSON Schema 的根 object 用 required 数组显式声明。只给一个样例。inputJson/expectedJson 字符串内容必须能直接被 JSON.parse 解析。` : '')
        + (process.env.ALGOMOTION_LIVE_SOURCE_NOTE ?? '');
      const { contract } = await request('generate/parse', { source });
      contractSchema.parse(contract);
      await save(`${name}-contract.json`, { source, contract });
      console.log(JSON.stringify(contract, null, 2));
    } else if (action === 'review') {
      const { source, contract } = JSON.parse(await readFile(file(`${name}-contract.json`), 'utf8'));
      const notes: { answers: string[]; removeAssumptions: number[]; correction: string; limitation: string; required?: string[] } = JSON.parse(await readFile(file(`${name}-review-notes.json`), 'utf8'));
      assert.equal(notes.answers.length, contract.questions.length, 'Every question needs an explicit tester answer');
      assert(notes.answers.every((answer) => answer.trim().length > 0));
      for (const example of contract.examples) assert(checkOutput(test.kind, example.input, example.expected), 'Model example failed independent verification; do not silently accept it');
      const inputSchema = JSON.parse(contract.inputSchema);
      if (notes.required) {
        assert(notes.required.every((key) => Object.hasOwn(inputSchema.properties, key)), 'Reviewed required fields must already exist in the schema');
        inputSchema.required = notes.required;
      }
      const reviewed = contractSchema.parse({ ...contract, inputSchema: JSON.stringify(inputSchema), questions: [], limitation: notes.limitation,
        assumptions: [...contract.assumptions.filter((_s: string, i: number) => !notes.removeAssumptions.includes(i)), ...contract.questions.map((q: string, i: number) => `${q} 测试作者确认：${notes.answers[i]}`), notes.correction],
      });
      await save(`${name}-reviewed-contract.json`, { source, contract: reviewed, review: notes });
      console.log(`REVIEWED ${name}: ${notes.answers.length} questions answered, ${contract.examples.length} examples independently checked. Original model contract retained.`);
    } else if (action === 'refine') {
      const reviewed = JSON.parse(await readFile(file(`${name}-reviewed-contract.json`), 'utf8'));
      const feedback: string[] = JSON.parse(await readFile(file(`${name}-trace-feedback.json`), 'utf8'));
      assert(feedback.length > 0 && feedback.every((s) => typeof s === 'string' && s.length <= 500));
      reviewed.contract.assumptions.push(...feedback);
      contractSchema.parse(reviewed.contract);
      await save(`${name}-reviewed-contract-2.json`, { ...reviewed, traceFeedback: feedback });
      console.log(`REFINED ${name}: explicit trace feedback only; no Python edited or fabricated.`);
    } else if (['generate', 'rerun', 'repair', 'design'].includes(action)) {
      let body: unknown;
      let original: Job | undefined;
      if (action === 'generate') {
        assert.equal(process.env.ALGOMOTION_CONTRACT_REVIEWED, '1', 'Inspect the saved contract before confirming generation');
        const reviewAttempt = process.env.ALGOMOTION_LIVE_REUSE_REVIEW === '1' ? '' : attempt;
        const { source, contract } = JSON.parse(await readFile(file(`${name}-reviewed-contract${reviewAttempt}.json`), 'utf8'));
        assert.equal(contract.supported, true); assert.equal(contract.questions.length, 0, 'Unresolved rules require review, not automatic assumptions');
        body = { source, contract, verification: test.kind, confirmed: true, design: true };
      } else {
        const from = process.env.ALGOMOTION_LIVE_FROM ?? 'generate';
        assert(['generate', 'repair', 'design'].includes(from));
        const programAttempt = process.env.ALGOMOTION_LIVE_REUSE_PROGRAM === '1' ? '' : attempt;
        original = JSON.parse(await readFile(file(`${name}-${from}${programAttempt}.json`), 'utf8'));
        assert(original?.program, 'No generated program available');
        body = { program: original.program, input: action === 'rerun' ? test.changed : original.bundle?.trace.input ?? original.program.contract.examples[0].input, confirmed: true,
          ...(action === 'repair' || action === 'design' ? { design: true } : {}),
          ...(action === 'repair' ? { repair: true, feedback: [original.error?.message, ...(original.bundle?.evidence.teaching?.details ?? []), process.env.ALGOMOTION_LIVE_FEEDBACK].filter(Boolean).join('\n').slice(0, 4000) } : {}) };
      }
      const job = await execute(body);
      await save(`${name}-${action}${attempt}.json`, job);
      if (job.bundle) {
        const bundle = parseBundle(JSON.stringify(job.bundle));
        await save(`${name}-${action}${attempt}.bundle.json`, bundle);
        assert(checkOutput(test.kind, bundle.trace.input, bundle.trace.result), 'Independent current-input verification failed');
        if (original && action !== 'repair') assert.equal(bundle.program.python, original.program?.python, 'Rerun/redesign did not reuse identical Python');
        if (original && action === 'rerun') assert.deepEqual(bundle.program.presentation, original.program?.presentation, 'Rerun did not reuse identical SceneSpec');
        console.log(JSON.stringify({ stage: job.stage, result: bundle.trace.result, frames: bundle.trace.frames.length, evidence: bundle.evidence }, null, 2));
      }
      assert.equal(job.stage, 'complete', job.error?.message);
      assert.equal(job.bundle?.version, 2); assert.equal(job.bundle?.evidence.presentation, 'passed');
    } else throw new Error('Usage: tsx tests/live-ui.ts connect | parse/review/generate/rerun/repair/design bfs|dp|stack');
  }
} catch (e) {
  const message = e instanceof Error ? e.message : 'Live test failed';
  await save(`${name || 'connection'}-${action}${attempt}-failure.json`, { error: message }).catch(() => {});
  console.error(message); process.exitCode = 1;
}
