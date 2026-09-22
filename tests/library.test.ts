import { describe, expect, it } from 'vitest';
import { checkLibraryCapacity, filterLibrary, libraryError, libraryLimits, libraryMetadataSchema, parseLibraryEntry, type LibrarySummary } from '../src/engine/library';
import { mockBundle, mockPresentation } from './generated-fixtures';

const entry = () => ({ format: 'algomotion-library-entry', version: 1, id: 'de64fd19-a029-432c-aeb4-93619222454a', title: '我的网格题', categories: ['广度优先搜索', '图论'], createdAt: 10, updatedAt: 20, content: { kind: 'draft', source: '给定网格，寻找最短路径。' } });
const parse = (value: unknown) => parseLibraryEntry(JSON.stringify(value));
describe('versioned local problem library boundaries (mock bundles only)', () => {
  it('round-trips drafts and normalizes title/category whitespace', () => {
    expect(parse({ ...entry(), title: '  草稿  ', categories: [' 图论 '] })).toMatchObject({ title: '草稿', categories: ['图论'], content: entry().content });
  });
  for (const version of [1, 2] as const) it(`revalidates and preserves generated bundle v${version}`, () => {
    const bundle = mockBundle('grid-shortest-4'); bundle.version = version;
    if (version === 2) { bundle.program.presentation = mockPresentation; bundle.evidence.presentation = 'passed'; }
    expect(parse({ ...entry(), content: { kind: 'demo', bundle } }).content).toEqual({ kind: 'demo', bundle });
  });
  for (const patch of [
    { format: 'other' }, { version: 2 }, { id: '../unsafe' }, { title: ' ' }, { title: 'a'.repeat(101) },
    { categories: [] }, { categories: ['全部'] }, { categories: ['图论', ' 图论 '] }, { categories: Array.from({ length: 7 }, (_, i) => String(i)) },
    { categories: ['a'.repeat(25)] }, { createdAt: 30 }, { apiKey: 'not-a-library-field' },
    { content: { kind: 'draft', source: ' ' } }, { content: { kind: 'draft', source: 'a'.repeat(6001) } },
  ]) it(`rejects invalid entry ${JSON.stringify(patch).slice(0, 65)}`, () => expect(() => parse({ ...entry(), ...patch })).toThrow());
  it('rejects corrupt trace references and executable presentation fields', () => {
    const bundle = mockBundle('grid-shortest-4');
    bundle.trace.frames[0].active = [144];
    expect(() => parse({ ...entry(), content: { kind: 'demo', bundle } })).toThrow();
    expect(() => parse({ ...entry(), content: { kind: 'demo', bundle: { ...mockBundle('grid-shortest-4'), version: 2, program: { ...bundle.program, presentation: { ...mockPresentation, html: '<script>bad()</script>' } } } } })).toThrow();
  });
  it('enforces file size in UTF-8 bytes before parsing', () => {
    expect(() => parseLibraryEntry('中'.repeat(Math.ceil(libraryLimits.fileBytes / 3)))).toThrow('大小上限');
  });
  it('allows React-safe text without interpreting markup', () => {
    expect(parse({ ...entry(), title: '<img src=x onerror=alert(1)>' }).title).toContain('<img');
  });
  it('searches title and multiple categories, sorts most recent first without mutation', () => {
    const all: LibrarySummary[] = [
      { id: 'one', title: 'BFS Grid', categories: ['图论', '广度优先搜索'], kind: 'demo', bytes: 10, updatedAt: 1 },
      { id: 'two', title: 'DP Grid', categories: ['动态规划'], kind: 'draft', bytes: 10, updatedAt: 2 },
    ];
    expect(filterLibrary(all, ' grid ', '全部').map((e) => e.id)).toEqual(['two', 'one']);
    expect(filterLibrary(all, '广度', '图论').map((e) => e.id)).toEqual(['one']);
    expect(filterLibrary(all, 'bfs', '动态规划')).toEqual([]);
    expect(all[0].id).toBe('one');
  });
  it('counts replacement as one entry and enforces count/total-byte capacity', () => {
    const all = Array.from({ length: 100 }, (_, i) => ({ id: `${i}`, bytes: 10 } as LibrarySummary));
    expect(() => checkLibraryCapacity(all, 'new', 10)).toThrow('上限');
    expect(() => checkLibraryCapacity(all, '0', 10)).not.toThrow();
    expect(() => checkLibraryCapacity(all, '0', libraryLimits.bytes)).toThrow('上限');
    expect(() => checkLibraryCapacity([], '0', libraryLimits.bytes)).not.toThrow();
  });
  it('returns actionable quota/validation messages without raw parser details', () => {
    expect(libraryError(new DOMException('private detail', 'QuotaExceededError'))).toContain('原条目未被覆盖');
    const result = libraryMetadataSchema.safeParse({ title: '', categories: [] });
    expect(libraryError(result.error)).toContain('标题限');
    expect(libraryError(new SyntaxError('secret'))).not.toContain('secret');
  });
});
