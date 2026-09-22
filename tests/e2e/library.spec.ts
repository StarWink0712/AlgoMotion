import { expect, test, type Page } from '@playwright/test';
import { mockBundle, mockPresentation, mockTrace } from '../generated-fixtures';
import { problems } from '../../src/engine/catalog';

// Real browser IndexedDB and UI. Imported trace fixtures are MOCK, no model/Python execution.
async function openLibrary(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) <= 720 && !await page.locator('.sidebar.is-open').count()) await page.getByRole('button', { name: '打开题库', exact: true }).click();
  await page.locator('.library-launch').click();
  await expect(page.getByRole('dialog', { name: '我的题库', exact: true })).toBeVisible();
}
async function importedDemo(page: Page) {
  const bundle = mockBundle('grid-shortest-4'); bundle.version = 2; bundle.program.presentation = mockPresentation;
  await page.getByLabel('导入生成结果').setInputFiles({ name: 'mock-demo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bundle)) });
  await expect(page.getByLabel('生成执行时间轴')).toBeVisible();
  return bundle;
}
for (const width of [1440, 390]) test(`local library ${width}px: drafts, categories, reload, edits, copies, deletion and preset isolation`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  const errors: string[] = [], calls: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (r.method() === 'POST') calls.push(r.url()); });
  await page.goto('/'); await openLibrary(page);
  await page.getByRole('button', { name: '新增题目', exact: true }).click();
  const text = '求两个字符串的最长公共子序列，返回长度和其中一条序列。';
  await page.getByLabel('完整题目描述').fill(text);
  await page.getByRole('button', { name: '保存题目草稿' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('题库标题', { exact: true }).fill('我的 LCS 笔记');
  await dialog.getByRole('checkbox', { name: '动态规划', exact: true }).check();
  await dialog.getByLabel('自定义算法分类').fill('字符串专题');
  await dialog.getByRole('button', { name: '添加分类' }).click();
  await dialog.screenshot({ path: `test-results/library-save-${width}.png` });
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await dialog.getByRole('button', { name: '确认保存到题库' }).click();
  await expect(page.getByText('已保存到我的题库', { exact: false })).toBeVisible();
  await page.reload(); await openLibrary(page);
  const card = page.getByRole('article', { name: '我的 LCS 笔记' });
  await expect(card).toContainText('尚未生成程序');
  await page.getByLabel('筛选我的算法分类').selectOption('动态规划');
  await expect(card).toBeVisible();
  await page.getByLabel('搜索我的题库').fill('字符串');
  await expect(card).toBeVisible();
  await page.getByLabel('搜索我的题库').fill('不存在');
  await expect(page.getByText('没有符合筛选的题目')).toBeVisible();
  await page.getByRole('button', { name: '清除题库筛选' }).click();
  await page.getByRole('dialog').screenshot({ path: `test-results/library-list-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await card.getByRole('button', { name: '打开', exact: true }).click();
  await expect(page.getByLabel('完整题目描述')).toHaveValue(text);
  await page.getByLabel('完整题目描述').fill(`${text} 输入长度不超过 20。`);
  await page.getByRole('button', { name: '保存题目草稿' }).click();
  await page.getByRole('button', { name: '更新题库条目' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await openLibrary(page); await expect(page.locator('.library-card')).toHaveCount(1);
  await page.getByRole('button', { name: '编辑 我的 LCS 笔记', exact: true }).click();
  await page.getByLabel('题库标题', { exact: true }).fill('LCS 复习');
  await page.getByRole('checkbox', { name: '动态规划', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: '数组', exact: true }).check();
  await page.getByRole('button', { name: '更新题库条目' }).click();
  await expect(page.getByRole('article', { name: 'LCS 复习' })).toContainText('数组');
  await page.getByRole('button', { name: '编辑 LCS 复习', exact: true }).click();
  await page.getByRole('checkbox', { name: /另存为新条目/ }).check();
  await page.getByLabel('题库标题', { exact: true }).fill('LCS 副本');
  await page.getByRole('button', { name: '确认保存到题库' }).click();
  await expect(page.locator('.library-card')).toHaveCount(2);
  await page.getByRole('button', { name: '删除 LCS 副本', exact: true }).click();
  await page.getByRole('button', { name: '保留', exact: true }).click();
  await expect(page.locator('.library-card')).toHaveCount(2);
  await page.getByRole('button', { name: '删除 LCS 副本', exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.locator('.library-card')).toHaveCount(1);
  await page.getByRole('button', { name: '关闭我的题库弹窗' }).click();
  if (width < 720) await page.getByRole('button', { name: '打开题库', exact: true }).click();
  await expect(page.locator('.problem-item')).toHaveCount(problems.length);
  await page.locator('.problem-item').filter({ hasText: '两数之和' }).click();
  await expect(page.getByRole('heading', { name: '两数之和', exact: true })).toBeVisible();
  expect(calls).toEqual([]); expect(errors).toEqual([]);
});
test('MOCK demo: save executed input, v2 playback, export/import metadata and zero execution on reopen', async ({ page }) => {
  const posts: string[] = []; page.on('request', (r) => { if (r.method() === 'POST') posts.push(r.url()); });
  await page.goto('/'); await page.getByRole('button', { name: '生成新题演示', exact: true }).click();
  const bundle = await importedDemo(page);
  await page.getByLabel('生成题 JSON 输入').fill('{"unsaved":true}');
  await page.getByRole('button', { name: '保存到我的题库', exact: true }).click();
  await page.getByLabel('题库标题', { exact: true }).fill('导入的 BFS');
  await page.getByRole('checkbox', { name: '广度优先搜索', exact: true }).check();
  await page.getByRole('button', { name: '确认保存到题库' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload(); await openLibrary(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 导入的 BFS', exact: true }).click();
  const download = await downloadPromise, stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks), entry = JSON.parse(raw.toString());
  expect(entry.categories).toEqual(['广度优先搜索']); expect(entry.content.bundle).toEqual(bundle);
  await page.getByLabel('导入题库条目').setInputFiles({ name: 'library.json', mimeType: 'application/json', buffer: raw });
  await page.getByLabel('题库标题', { exact: true }).fill('BFS 备份导入');
  await page.getByRole('button', { name: '确认保存到题库' }).click();
  await expect(page.locator('.library-card')).toHaveCount(2);
  await page.getByRole('article', { name: 'BFS 备份导入' }).getByRole('button', { name: '打开', exact: true }).click();
  expect(JSON.parse(await page.getByLabel('生成题 JSON 输入').inputValue())).toEqual(bundle.trace.input);
  await expect(page.getByText('结构合法 · 文件声明，未重验')).toBeVisible();
  await expect(page.getByTestId('designed-scene')).toBeVisible();
  await page.getByLabel('生成执行时间轴').press('End'); await expect(page.getByTestId('generated-result')).toBeVisible();
  await page.getByLabel('生成执行时间轴').press('Home'); await expect(page.getByTestId('generated-result')).toHaveCount(0);
  expect(posts).toEqual([]);
  const changed = { grid: [[0]], start: [0, 0], end: [0, 0] };
  await page.route('**/api/generate/jobs', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ program: bundle.program, input: changed, confirmed: true });
    await route.fulfill({ status: 202, json: { id: 'library-mock-rerun' } });
  });
  await page.route('**/api/generate/jobs/library-mock-rerun', (route) => route.fulfill({ json: { stage: 'complete', bundle: { ...bundle, trace: mockTrace(bundle.program, changed) } } }));
  await page.getByLabel('生成题 JSON 输入').fill(JSON.stringify(changed));
  await page.getByRole('button', { name: '复用程序重新执行' }).click();
  await expect(page.getByRole('button', { name: '复用程序重新执行' })).toBeEnabled();
  await expect(page.getByText('结构合法 · 通过', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '保存到我的题库', exact: true }).click();
  await page.getByRole('button', { name: '更新题库条目' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await openLibrary(page);
  await expect(page.locator('.library-card')).toHaveCount(2);
  expect(posts).toHaveLength(1); expect(posts[0]).toMatch(/\/api\/generate\/jobs$/);
});
test('two tabs cannot silently overwrite a newer library entry', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { const path = '/src/engine/library.ts'; const lib = await import(path); await lib.saveLibraryEntry({ title: '共同草稿', categories: ['图论'] }, { kind: 'draft', source: '图的遍历' }); });
  await openLibrary(page); await page.getByRole('button', { name: '编辑 共同草稿', exact: true }).click();
  const other = await context.newPage(); await other.goto('/'); await openLibrary(other);
  await other.getByRole('button', { name: '编辑 共同草稿', exact: true }).click();
  await other.getByLabel('题库标题', { exact: true }).fill('另一页已更新');
  await other.getByRole('button', { name: '更新题库条目' }).click();
  await expect(other.getByRole('article', { name: '另一页已更新' })).toBeVisible();
  await page.getByRole('button', { name: '更新题库条目' }).click();
  await expect(page.getByRole('alert')).toContainText('其他页面修改或删除');
  await page.getByRole('checkbox', { name: /另存为新条目/ }).check();
  await page.getByRole('button', { name: '确认保存到题库' }).click();
  await expect(page.locator('.library-card')).toHaveCount(2);
  await expect(page.getByRole('article', { name: '另一页已更新' })).toBeVisible();
  await other.close();
});
test('real IndexedDB: concurrent saves, stale update/delete conflicts, atomic quota rollback and unavailable storage', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/engine/library.ts'; const lib = await import(path);
    const content = { kind: 'draft', source: 'Test draft' }, metadata = { title: 'One', categories: ['图论'] };
    const [a, b] = await Promise.all([lib.saveLibraryEntry(metadata, content), lib.saveLibraryEntry({ ...metadata, title: 'Two' }, content)]);
    const updated = await lib.saveLibraryEntry({ ...metadata, title: 'Updated' }, content, a);
    const failures: string[] = [];
    try { await lib.saveLibraryEntry(metadata, content, a); } catch (e) { failures.push(lib.libraryError(e)); }
    try { await lib.deleteLibraryEntry(a); } catch (e) { failures.push(lib.libraryError(e)); }
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'entries') throw new DOMException('test quota only', 'QuotaExceededError');
      return original.apply(this, args);
    };
    try { await lib.saveLibraryEntry({ ...metadata, title: 'Must roll back' }, content, updated); } catch (e) { failures.push(lib.libraryError(e)); }
    finally { IDBObjectStore.prototype.put = original; }
    const saved = await lib.getLibraryEntry(a.id), list = await lib.listLibrary();
    await lib.deleteLibraryEntry(b);
    try { await lib.saveLibraryEntry(metadata, content, b); } catch (e) { failures.push(lib.libraryError(e)); }
    return { saved, list, failures };
  });
  expect(result.list).toHaveLength(2); expect(result.saved.title).toBe('Updated');
  expect(result.list.find((e: { id: string }) => e.id === result.saved.id).title).toBe('Updated');
  expect(result.failures).toHaveLength(4); expect(result.failures[2]).toContain('原条目未被覆盖');
  await page.evaluate(() => { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); });
  await openLibrary(page); await expect(page.getByRole('alert')).toContainText('不支持 IndexedDB');
});
test('untrusted library imports: reject broken bundles, no markup execution, preserve legacy save', async ({ page }) => {
  const b = mockBundle('grid-min-right-down');
  await page.goto('/'); await page.evaluate((bundle) => localStorage.setItem('algomotion:generated:last', JSON.stringify(bundle)), b);
  await openLibrary(page);
  const entry = { format: 'algomotion-library-entry', version: 1, id: 'de64fd19-a029-432c-aeb4-93619222454a', title: '<img src=x onerror="window.libraryPwned=1">', categories: ['图论'], createdAt: 10, updatedAt: 20, content: { kind: 'draft', source: 'untrusted plain text' } };
  const upload = (data: unknown) => page.getByLabel('导入题库条目').setInputFiles({ name: 'test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await upload({ ...entry, content: { kind: 'demo', bundle: { ...b, trace: { ...b.trace, frames: [] } } } });
  await expect(page.getByRole('alert')).toContainText('未保存');
  await expect(page.locator('.library-card')).toHaveCount(0);
  await upload(entry); await page.getByRole('button', { name: '确认保存到题库' }).click();
  await expect(page.getByRole('article')).toContainText(entry.title);
  expect(await page.evaluate(() => (window as unknown as { libraryPwned?: number }).libraryPwned)).toBeUndefined();
  await expect(page.locator('.library-card img')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('algomotion:generated:last')!))).toEqual(b);
});
