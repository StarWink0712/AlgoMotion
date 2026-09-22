import { z } from 'zod';
import { limits, parseBundle, type Bundle } from './generated';

export const libraryCategories = ['未分类', '数组', '哈希表', '双指针', '滑动窗口', '链表', '二叉树', '动态规划', '广度优先搜索', '深度优先搜索', '图论', '栈与队列', '二分查找', '贪心', '回溯', '排序', '数学'] as const;
export const libraryLimits = { entries: 100, bytes: 32 * 1024 * 1024, fileBytes: limits.bundleBytes + 32_768 };
export const libraryMetadataSchema = z.object({
  title: z.string().trim().min(1).max(100),
  categories: z.array(z.string().trim().min(1).max(24).refine((value) => value !== '全部')).min(1).max(6).refine((items) => new Set(items).size === items.length),
}).strict();
export type LibraryMetadata = z.infer<typeof libraryMetadataSchema>;
export type LibraryContent = { kind: 'draft'; source: string } | { kind: 'demo'; bundle: Bundle };
export type LibraryEntry = LibraryMetadata & { format: 'algomotion-library-entry'; version: 1; id: string; createdAt: number; updatedAt: number; content: LibraryContent };
const headerSchema = libraryMetadataSchema.extend({
  format: z.literal('algomotion-library-entry'), version: z.literal(1), id: z.string().uuid(),
  createdAt: z.number().int().nonnegative().max(8.64e15), updatedAt: z.number().int().nonnegative().max(8.64e15),
  content: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('draft'), source: z.string().min(1).max(6000).refine((s) => Boolean(s.trim())) }).strict(),
    z.object({ kind: z.literal('demo'), bundle: z.unknown() }).strict(),
  ]),
}).strict();
const summarySchema = libraryMetadataSchema.extend({
  id: z.string().uuid(), updatedAt: z.number().int().nonnegative().max(8.64e15), kind: z.enum(['draft', 'demo']),
  bytes: z.number().int().positive().max(libraryLimits.fileBytes),
}).strict();
export type LibrarySummary = z.infer<typeof summarySchema>;
const byteLength = (raw: string) => new TextEncoder().encode(raw).length;

export function parseLibraryEntry(raw: string): LibraryEntry {
  if (byteLength(raw) > libraryLimits.fileBytes) throw new Error('题库条目超过大小上限。');
  const entry = headerSchema.parse(JSON.parse(raw));
  if (entry.updatedAt < entry.createdAt) throw new Error('题库条目时间无效。');
  return { ...entry, content: entry.content.kind === 'demo' ? { kind: 'demo', bundle: parseBundle(JSON.stringify(entry.content.bundle)) } : entry.content };
}
export function filterLibrary(entries: LibrarySummary[], search: string, category: string) {
  const query = search.trim().toLocaleLowerCase();
  return entries.filter((entry) => (category === '全部' || entry.categories.includes(category)) && `${entry.title} ${entry.categories.join(' ')}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}
export function checkLibraryCapacity(entries: LibrarySummary[], id: string, bytes: number) {
  const others = entries.filter((entry) => entry.id !== id);
  if (others.length >= libraryLimits.entries || others.reduce((sum, entry) => sum + entry.bytes, bytes) > libraryLimits.bytes) throw new Error('我的题库已达到 100 道或 32 MiB 上限，请先导出备份并删除不需要的条目。');
}
export function libraryError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return '浏览器存储空间不足，保存未完成；原条目未被覆盖。请导出备份或释放空间。';
  if (error instanceof z.ZodError) return '题库条目格式无效；标题限 100 字，分类限 1–6 个、每个 24 字，演示必须通过完整校验。';
  return error instanceof Error && error.name === 'Error' ? error.message : '本浏览器无法读写题库。请检查隐私/存储设置；现有结果仍可导出备份。';
}

const databaseName = 'algomotion-library';
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('本浏览器不支持 IndexedDB，请使用导出文件备份。')); return; }
    let blocked = false;
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('entries');
      request.result.createObjectStore('summaries', { keyPath: 'id' });
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('题库升级被其他标签页阻塞，请关闭旧标签页后重试。')); };
    request.onsuccess = () => { if (blocked) { request.result.close(); return; } request.result.onversionchange = () => request.result.close(); resolve(request.result); };
  });
}
// A single transaction commits payload and index together; no read-modify-write localStorage race.
async function transaction<T>(mode: IDBTransactionMode, action: (tx: IDBTransaction, done: (value: T) => void, fail: (error: unknown) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(['entries', 'summaries'], mode);
    let result: T, failure: unknown;
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(failure ?? tx.error); };
    const fail = (error: unknown) => { failure = error; tx.abort(); };
    try { action(tx, (value) => { result = value; }, fail); } catch (error) { fail(error); }
  });
}
export async function listLibrary(): Promise<LibrarySummary[]> {
  return transaction('readonly', (tx, done, fail) => {
    const request = tx.objectStore('summaries').getAll();
    request.onsuccess = () => { try { done(z.array(summarySchema).max(libraryLimits.entries).parse(request.result)); } catch (error) { fail(error); } };
  });
}
export async function getLibraryEntry(id: string): Promise<LibraryEntry> {
  return transaction('readonly', (tx, done, fail) => {
    const request = tx.objectStore('entries').get(id);
    request.onsuccess = () => {
      try {
        if (typeof request.result !== 'string') throw new Error('该条目不存在，可能已在其他标签页删除。');
        const entry = parseLibraryEntry(request.result);
        if (entry.id !== id) throw new Error('题库索引与内容不一致，拒绝打开。');
        done(entry);
      } catch (error) { fail(error); }
    };
  });
}
export async function saveLibraryEntry(metadata: LibraryMetadata, content: LibraryContent, previous?: LibraryEntry): Promise<LibraryEntry> {
  const now = Math.max(Date.now(), (previous?.updatedAt ?? 0) + 1);
  const entry = parseLibraryEntry(JSON.stringify({ ...metadata, format: 'algomotion-library-entry', version: 1, id: previous?.id ?? crypto.randomUUID(), createdAt: previous?.createdAt ?? now, updatedAt: now, content }));
  const raw = JSON.stringify(entry), bytes = byteLength(raw);
  return transaction('readwrite', (tx, done, fail) => {
    const summaries = tx.objectStore('summaries'), request = summaries.getAll();
    request.onsuccess = () => {
      try {
        const all = z.array(summarySchema).max(libraryLimits.entries).parse(request.result), existing = all.find((item) => item.id === entry.id);
        if (previous && existing?.updatedAt !== previous.updatedAt) throw new Error('条目已在其他页面修改或删除。请重新打开后编辑，或另存为新条目。');
        checkLibraryCapacity(all, entry.id, bytes);
        summaries.put({ id: entry.id, title: entry.title, categories: entry.categories, updatedAt: entry.updatedAt, kind: content.kind, bytes });
        tx.objectStore('entries').put(raw, entry.id);
        done(entry);
      } catch (error) { fail(error); }
    };
  });
}
export async function deleteLibraryEntry(entry: LibrarySummary): Promise<void> {
  return transaction('readwrite', (tx, done, fail) => {
    const summaries = tx.objectStore('summaries'), request = summaries.get(entry.id);
    request.onsuccess = () => {
      if (request.result?.updatedAt !== entry.updatedAt) { fail(new Error('条目已修改或删除，请刷新题库后重试。')); return; }
      summaries.delete(entry.id); tx.objectStore('entries').delete(entry.id); done(undefined);
    };
  });
}
export function downloadLibraryEntry(entry: LibraryEntry) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(entry)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `algomotion-library-${entry.id}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
