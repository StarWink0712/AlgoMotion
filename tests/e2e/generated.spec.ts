import { expect, test, type Page } from '@playwright/test';
import { fixtureProgram, mockBundle, mockPresentation, mockTrace } from '../generated-fixtures';
import type { Bundle, Verification } from '../../src/engine/generated';

// UI/API transport fixtures only. These tests do NOT run a model or Python.
async function mockedGeneration(page: Page, kind: Exclude<Verification, 'none'>) {
  const p = fixtureProgram(kind); let current: Bundle = mockBundle(kind), polls = 0, modelCalls = 0, runs = 0, designing = false;
  await page.route('**/api/generate/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/status')) return route.fulfill({ json: { model: true, sandbox: { available: true, message: 'MOCK sandbox for UI tests; no real execution' } } });
    if (path.endsWith('/parse')) { modelCalls++; return route.fulfill({ json: { contract: p.contract } }); }
    if (path.endsWith('/jobs')) {
      const body = route.request().postDataJSON();
      polls = 0; runs++;
      if (!body.program) modelCalls++;
      if (body.design) modelCalls++;
      if (body.repair) modelCalls++;
      designing = Boolean(body.design);
      current = { ...mockBundle(kind), trace: mockTrace(p, body.input ?? p.contract.examples[0].input) };
      if (body.design || body.program?.presentation) { current.version = 2; current.program.presentation = body.program?.presentation ?? mockPresentation; current.evidence.presentation = 'passed'; }
      return route.fulfill({ status: 202, json: { id: 'mock-job' } });
    }
    polls++;
    const stage = polls <= 1 ? 'generating' : polls === 2 ? 'executing' : polls === 3 ? 'checking' : polls === 4 && designing ? 'designing' : 'complete';
    return route.fulfill({ json: { id: 'mock-job', stage, program: current.program, ...(stage === 'complete' ? { bundle: current } : {}) } });
  });
  return { p, counts: () => ({ modelCalls, runs }) };
}
async function create(page: Page, source: string, kind: Verification, design = false) {
  await page.goto('/'); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await page.getByLabel('完整题目描述').fill(source);
  await page.getByRole('button', { name: '解析题意与约定' }).click();
  await page.getByRole('combobox', { name: '独立验证器', exact: true }).selectOption(kind);
  await page.getByRole('checkbox', { name: /AI 定制展示/ }).setChecked(design);
  await page.getByRole('checkbox', { name: /我已核对/ }).check();
  await page.getByRole('button', { name: '确认并生成 Python 演示' }).click();
  await expect(page.getByRole('dialog', { name: '生成新题演示', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('完整题目描述')).toHaveCount(0);
  await expect(page.getByLabel('真实生成阶段').locator('.current')).toHaveText('生成');
  await expect(page.getByLabel('真实生成阶段').locator('.current')).toHaveText('执行');
  await expect(page.getByLabel('真实生成阶段').locator('.current')).toHaveText('检查');
  if (design) await expect(page.getByLabel('真实生成阶段').locator('.current')).toHaveText('设计展示');
  await expect(page.getByLabel('生成执行时间轴')).toBeVisible();
}
test('MOCK model defaults need one review, remain editable and are sent unchanged', async ({ page }) => {
  const { p, counts } = await mockedGeneration(page, 'grid-shortest-4');
  p.contract.assumptions = ['默认：上下左右移动，距离按边数计算。'];
  let submitted: { contract: typeof p.contract } | undefined;
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/jobs')) submitted = r.postDataJSON(); });
  await page.goto('/'); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await page.getByLabel('完整题目描述').fill(p.source);
  await page.getByRole('button', { name: '解析题意与约定' }).click();
  await expect(page.getByRole('heading', { name: '默认约定与关键假设' })).toBeVisible();
  await expect(page.getByText(p.contract.assumptions[0], { exact: true })).toBeVisible();
  await expect(page.getByText('无需逐项回答问题，核对约定后即可生成。')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^澄清问题/ })).toHaveCount(0);
  const generate = page.getByRole('button', { name: '确认并生成 Python 演示' });
  await expect(generate).toBeDisabled();
  await page.getByRole('checkbox', { name: /我已核对/ }).check();
  await expect(generate).toBeEnabled();
  await page.getByText('编辑完整约定 JSON', { exact: true }).click();
  const edited = { ...p.contract, assumptions: [...p.contract.assumptions, '用户补充：多条最短路径任选一条。'] };
  await page.getByLabel('编辑约定 JSON').fill(JSON.stringify(edited));
  await expect(generate).toBeDisabled();
  await page.getByRole('button', { name: '应用约定修改' }).click();
  await expect(page.getByText(edited.assumptions[1], { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: /我已核对/ }).check();
  await generate.click();
  await expect(page.getByLabel('生成执行时间轴')).toBeVisible();
  expect(submitted?.contract).toEqual(edited);
  expect(counts()).toEqual({ modelCalls: 3, runs: 1 });
});
test('MOCK necessary clarification is visible and cannot be skipped by accepting defaults', async ({ page }) => {
  const { p, counts } = await mockedGeneration(page, 'grid-shortest-4');
  p.contract.questions = ['题目提到的特殊移动规则具体是什么？'];
  let submitted: { contract: typeof p.contract } | undefined;
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/jobs')) submitted = r.postDataJSON(); });
  await page.goto('/'); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await page.getByLabel('完整题目描述').fill('按特殊移动规则求网格最短路径');
  await page.getByRole('button', { name: '解析题意与约定' }).click();
  await expect(page.getByRole('heading', { name: '还需补充的关键信息' })).toBeVisible();
  await expect(page.getByText('无需逐项回答问题，核对约定后即可生成。')).toHaveCount(0);
  const generate = page.getByRole('button', { name: '确认并生成 Python 演示' });
  await page.getByRole('checkbox', { name: /我已核对/ }).check();
  await expect(generate).toBeDisabled();
  expect(counts()).toEqual({ modelCalls: 1, runs: 0 });
  await page.getByLabel('澄清问题 1').fill('只允许上下左右移动一格。');
  await expect(page.getByRole('checkbox', { name: /我已核对/ })).not.toBeChecked();
  await page.getByRole('checkbox', { name: /我已核对/ }).check();
  await generate.click();
  await expect(page.getByLabel('生成执行时间轴')).toBeVisible();
  expect(submitted?.contract.questions).toEqual([]);
  expect(submitted?.contract.assumptions).toContain(`${p.contract.questions[0]} 用户确认：只允许上下左右移动一格。`);
});
for (const kind of ['grid-shortest-4', 'grid-min-right-down'] as const) {
  test(`MOCK ${kind}: confirmation, phase transitions, timeline, reuse source and saved reopen`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
    const { p, counts } = await mockedGeneration(page, kind);
    await create(page, p.source, kind);
    const timeline = page.getByLabel('生成执行时间轴');
    await timeline.press('ArrowRight'); await expect(page.locator('.runtime-queue-item')).toHaveCount(1);
    await timeline.press('ArrowRight'); await expect(page.getByTestId('candidate-sources')).toBeVisible();
    if (kind === 'grid-min-right-down') {
      const badge = page.getByTestId('grid-dp').first();
      expect(await badge.evaluate((el) => getComputedStyle(el).transform)).toBe('matrix(1, 0, 0, 1, 0, -28)');
    }
    await page.getByRole('region', { name: '生成演示工作台' }).screenshot({ path: `test-results/${kind}-desktop-mock.png` });
    await timeline.press('End'); await expect(page.getByTestId('generated-result')).toBeVisible();
    await expect(page.getByTestId('grid-path-edge')).not.toHaveCount(0);
    await timeline.press('Home'); await expect(page.getByTestId('grid-path-edge')).toHaveCount(0);
    await expect(page.locator('[data-visited="true"]')).toHaveCount(0);
    await expect(page.getByTestId('generated-result')).toHaveCount(0);
    await expect(page.getByTestId('candidate-sources')).toHaveCount(0);
    await expect(page.locator('.runtime-queue-item')).toHaveCount(0);
    const input = kind === 'grid-shortest-4' ? { grid: [[0, 0], [0, 0]], start: [0, 0], end: [1, 1] } : { grid: [[1, 2], [3, 4]] };
    await page.getByLabel('生成题 JSON 输入').fill(JSON.stringify(input));
    await page.getByRole('button', { name: '复用程序重新执行' }).click();
    await expect(page.getByRole('button', { name: '复用程序重新执行' })).toBeEnabled();
    expect(counts()).toEqual({ modelCalls: 2, runs: 2 });
    await expect(timeline).toHaveValue('0');
    await page.getByRole('button', { name: '保存生成结果' }).click();
    await expect(page.getByText('已保存到本浏览器', { exact: false })).toBeVisible();
    await page.reload(); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
    await page.getByRole('button', { name: '重新打开已保存结果' }).click();
    await expect(page.getByText('结构合法 · 文件声明，未重验')).toBeVisible();
    expect(counts().modelCalls).toBe(2);
    expect(errors).toEqual([]);
  });
}
test('MOCK generated visualization fits mobile, plays, pauses and restores exact state on seek', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { p } = await mockedGeneration(page, 'grid-shortest-4');
  await create(page, p.source, p.verification);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '播放生成回放' }).click();
  await expect(page.getByLabel('生成执行时间轴')).not.toHaveValue('0', { timeout: 4000 });
  await page.getByRole('button', { name: '暂停生成回放' }).click();
  await page.getByLabel('生成执行时间轴').press('End');
  await expect(page.getByTestId('runtime-path')).toBeVisible();
  await page.getByRole('region', { name: '生成演示工作台' }).screenshot({ path: 'test-results/grid-mobile-mock.png' });
  await page.getByLabel('生成执行时间轴').press('Home');
  await expect(page.getByTestId('runtime-path')).toHaveCount(0);
  await expect(page.getByTestId('generated-scene')).toHaveAttribute('data-step', '0');
  await page.getByRole('button', { name: '打开题库' }).click();
  await page.locator('.problem-item').filter({ hasText: '两数之和' }).click();
  await expect(page.getByRole('heading', { name: '两数之和', exact: true })).toBeVisible();
});
for (const width of [1440, 390]) {
  test(`MOCK AI design ${width}px: runtime bindings, exact rewind, source reuse and v2 reopening`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
    const { p, counts } = await mockedGeneration(page, 'grid-shortest-4');
    await create(page, p.source, p.verification, true);
    const scene = page.getByTestId('designed-scene'), timeline = page.getByLabel('生成执行时间轴');
    await expect(scene).toBeVisible();
    const answer = scene.locator('[data-panel-id="answer"]');
    await expect(answer).toContainText('运行结果在最后一帧显示');
    await timeline.press('ArrowRight');
    await expect(scene.locator('[data-panel-id="frontier"] .scene-token')).toHaveCount(1);
    await timeline.press('ArrowRight');
    await expect(page.getByTestId('candidate-sources')).toBeVisible();
    await page.getByRole('region', { name: '生成演示工作台' }).screenshot({ path: `test-results/designed-${width}-mock.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await timeline.press('End'); await expect(answer).toContainText('distance');
    await expect(scene.locator('[data-panel-id="route"] .scene-token')).toHaveCount(5);
    await timeline.press('Home'); await expect(answer).not.toContainText('distance');
    await expect(scene.locator('[data-panel-id="route"] .scene-token')).toHaveCount(0);
    await expect(page.getByTestId('candidate-sources')).toHaveCount(0);
    await page.getByRole('button', { name: '原始轨迹', exact: true }).click();
    await expect(scene).toHaveCount(0); await expect(page.getByTestId('generated-scene')).toBeVisible();
    await page.getByRole('button', { name: 'AI 定制展示', exact: true }).click();
    await page.getByLabel('生成题 JSON 输入').fill(JSON.stringify({ grid: [[0]], start: [0, 0], end: [0, 0] }));
    await page.getByRole('button', { name: '复用程序重新执行' }).click();
    await expect(page.getByRole('button', { name: '复用程序重新执行' })).toBeEnabled();
    expect(counts()).toEqual({ modelCalls: 3, runs: 2 });
    await page.getByRole('button', { name: '保存生成结果' }).click();
    await page.reload(); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
    await page.getByRole('button', { name: '重新打开已保存结果' }).click();
    await expect(scene).toBeVisible(); await expect(page.getByText('展示绑定 · 文件声明，未重验')).toBeVisible();
    await expect(timeline).toHaveValue('0'); expect(counts().modelCalls).toBe(3); expect(errors).toEqual([]);
  });
}
test('MOCK non-grid AI design uses graph, stack and bars and rejects executable specs', async ({ page }) => {
  const b = mockBundle('grid-shortest-4'); b.version = 2;
  b.program.presentation = { ...mockPresentation, theme: 'sand', panels: [
    { id: 'graph', kind: 'graph', title: '图', source: 'variables.nodes', edges: 'variables.edges', layout: 'circle' },
    { id: 'stack', kind: 'stack', title: '栈', source: 'variables.stack' },
    { id: 'bars', kind: 'sequence', title: '数量', source: 'variables.counts', style: 'bars' },
  ] };
  for (const frame of b.trace.frames) frame.variables = { nodes: [{ id: 'a', label: '<script>bad</script>' }, { id: 'b', label: 'B' }], edges: frame.step > 0 ? [{ from: 'a', to: 'b', chosen: true }] : [], stack: frame.step > 0 ? ['a', 'b'] : [], counts: frame.step > 0 ? [3, -2] : [0, 0] };
  await page.goto('/'); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  const upload = async (bundle: unknown) => page.getByLabel('导入生成结果').setInputFiles({ name: 'mock-design.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bundle)) });
  await upload(b);
  const scene = page.getByTestId('designed-scene'), timeline = page.getByLabel('生成执行时间轴');
  await expect(scene.locator('.designed-node')).toHaveCount(2);
  await timeline.press('End'); await expect(scene.locator('.scene-tokens.vertical .scene-token').first()).toHaveText('b');
  await expect(scene.locator('.scene-bar .negative')).toHaveCount(1);
  await timeline.press('Home'); await expect(scene.locator('.scene-tokens.vertical .scene-token')).toHaveCount(0);
  expect(await scene.locator('.scene-bar > span').first().evaluate((el) => getComputedStyle(el).height)).toBe('0px');
  const malicious = { ...b, program: { ...b.program, presentation: { ...b.program.presentation, html: '<script>window.pwned=true</script>' } } };
  await upload(malicious); await expect(page.getByRole('alert')).toContainText('拒绝打开');
  expect(await page.evaluate(() => (window as unknown as { pwned?: boolean }).pwned)).toBeUndefined();
});
test('MOCK design and repair buttons explicitly request a model; reduced motion still shows exact state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { p, counts } = await mockedGeneration(page, 'grid-min-right-down');
  await create(page, p.source, p.verification, true);
  await page.getByLabel('生成执行时间轴').press('ArrowRight');
  await expect(page.getByTestId('designed-scene')).not.toHaveClass(/animate-forward/);
  await page.getByRole('button', { name: '重新设计展示（调用模型）' }).click();
  await expect(page.getByRole('button', { name: '复用程序重新执行' })).toBeEnabled();
  expect(counts()).toEqual({ modelCalls: 4, runs: 2 });
  await page.getByRole('button', { name: '修复程序并重试（调用模型）' }).click();
  await expect(page.getByRole('button', { name: '复用程序重新执行' })).toBeEnabled();
  expect(counts()).toEqual({ modelCalls: 6, runs: 3 });
  await expect(page.getByTestId('designed-scene')).toBeVisible();
});
for (const width of [1440, 390]) {
  test(`archived AI prose is opt-in, never a current-input heading or spoiler (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const b = mockBundle('grid-shortest-4'); b.version = 2;
    b.program.presentation = { ...mockPresentation, title: 'STATIC_MODEL_ANSWER_6', description: 'STATIC_MODEL_ANSWER_6，终点3,3', panels: mockPresentation.panels.map((p) => ({ ...p, title: 'STATIC_MODEL_ANSWER_6' })) };
    await page.goto('/'); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
    const upload = () => page.getByLabel('导入生成结果').setInputFiles({ name: 'old-prose.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(b)) });
    await upload();
    const scene = page.getByTestId('designed-scene'), timeline = page.getByLabel('生成执行时间轴');
    await expect(scene).toBeVisible(); await expect(page.getByText('STATIC_MODEL_ANSWER_6', { exact: false })).toHaveCount(0);
    await expect(page.getByTestId('current-scene-summary')).toContainText('3 行 × 3 列');
    await page.getByText('查看 AI 设计原文与 JSON（静态，可能剧透）', { exact: true }).click();
    await expect(page.getByText('以下标题和说明是生成时的 AI 原文', { exact: false })).toBeVisible();
    await expect(page.getByText('STATIC_MODEL_ANSWER_6', { exact: false })).toBeVisible();
    b.trace = mockTrace(b.program, { grid: [[0]], start: [0, 0], end: [0, 0] });
    await upload();
    await expect(page.getByTestId('current-scene-summary')).toHaveText('第 1 帧 · 当前网格 1 行 × 1 列');
    await expect(page.getByText('STATIC_MODEL_ANSWER_6', { exact: false })).toHaveCount(0);
    await timeline.press('ArrowRight'); await expect(page.getByTestId('current-scene-summary')).toContainText('第 2 帧');
    await timeline.press('End'); await expect(page.getByTestId('generated-result')).toContainText('"distance": 0');
    await timeline.press('Home'); await expect(page.getByTestId('generated-result')).toHaveCount(0);
    await expect(page.getByTestId('current-scene-summary')).toContainText('第 1 帧');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: '保存生成结果' }).click(); await page.reload();
    await page.getByRole('button', { name: '生成新题演示', exact: true }).click(); await page.getByRole('button', { name: '重新打开已保存结果' }).click();
    await expect(page.getByText('STATIC_MODEL_ANSWER_6', { exact: false })).toHaveCount(0);
  });
}
test('parse failure exposes a stable diagnostic code and field path in the UI', async ({ page }) => {
  await page.route('**/api/generate/parse', (r) => r.fulfill({ status: 502, json: { code: 'MODEL_CONTRACT_JSON', error: 'examples[0].inputJson: 不是合法 JSON 编码。' } }));
  await page.goto('/'); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await page.getByLabel('完整题目描述').fill('test'); await page.getByRole('button', { name: '解析题意与约定' }).click();
  await expect(page.getByRole('alert')).toContainText('MODEL_CONTRACT_JSON: examples[0].inputJson');
});
test('untrusted import never executes HTML and rejects invalid trace references', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  const bundle = mockBundle('grid-shortest-4');
  bundle.program.python = '<script>window.pwned = true</script>\n';
  await page.getByLabel('导入生成结果').setInputFiles({ name: 'untrusted.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bundle)) });
  await expect(page.getByText('<script>window.pwned = true</script>', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { pwned?: boolean }).pwned)).toBeUndefined();
  bundle.trace.frames[0].active = [9999];
  await page.getByLabel('导入生成结果').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bundle)) });
  await expect(page.getByRole('alert')).toContainText('拒绝打开');
});
test('missing dependencies are explicit and do not prevent presets', async ({ page }) => {
  await page.route('**/api/generate/status', (r) => r.fulfill({ json: { model: false, sandbox: { available: false, message: 'Docker 不可用，绝不在宿主机执行。' } } }));
  await page.route('**/api/generate/parse', (r) => r.fulfill({ status: 503, json: { error: '模型配置缺失；预设题不受影响。' } }));
  await page.goto('/'); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  await expect(page.getByText('模型：未配置', { exact: false })).toBeVisible();
  await page.getByLabel('完整题目描述').fill('not in catalog');
  await page.getByRole('button', { name: '解析题意与约定' }).click();
  await expect(page.getByRole('alert')).toContainText('模型配置缺失');
  await page.getByRole('button', { name: '关闭新题窗口' }).click();
  await page.locator('.problem-item').filter({ hasText: '两数之和' }).click();
  await page.getByLabel('执行时间轴', { exact: true }).press('End');
  await expect(page.getByTestId('result')).toHaveText('[0,1]');
});
