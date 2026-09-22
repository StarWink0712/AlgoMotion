import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { auditRelease, excludedFromRelease } from '../scripts/lib/release-audit.mjs';

const directories: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'algomotion-release-')); directories.push(root);
  await writeFile(join(root, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/public-demo': { resolved: 'https://registry.npmjs.org/public-demo/-/public-demo-1.0.0.tgz' } } }));
  return root;
}
afterEach(async () => { for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });

describe('local release audit (synthetic sensitive fixtures, no upload)', () => {
  it.each(['.env', '.env.local', '.algomotion/model-settings.json', 'node_modules/a.js', 'dist/index.js', 'docs/demo.png', 'docs/demo.webm', 'source.zip', '.npmrc', '.git-credentials', '.ssh/config', 'private.pem', 'data.sqlite', 'test-results/trace.zip'])('excludes %s from source candidates', (path) => {
    expect(excludedFromRelease(path)).toBe(true);
  });
  it('keeps code, scripts, lockfile and blank config template eligible, but never grants authorization', async () => {
    const root = await fixture(); await writeFile(join(root, '.env.example'), 'LLM_API_KEY=\nLLM_MODEL=demo\n');
    for (const path of ['src/App.tsx', 'scripts/lib/setup.mjs', 'package-lock.json', '.env.example']) expect(excludedFromRelease(path)).toBe(false);
    const report = await auditRelease(root);
    expect(report.findings).toEqual([]); expect(report.humanAuthorization).toBe('REQUIRED'); expect(report.historyScanned).toBe(false);
  });
  it('detects copied local keys without returning the keys or file content', async () => {
    const root = await fixture(), secret = 'synthetic-key-for-audit-only';
    await writeFile(join(root, '.env'), `LLM_API_KEY="${secret}"\n`);
    await writeFile(join(root, 'leak.txt'), `value=${secret}`);
    const report = await auditRelease(root);
    expect(report.findings).toContainEqual({ file: 'leak.txt', code: 'KNOWN_SECRET_COPY' });
    expect(report.files).not.toContain('.env'); expect(JSON.stringify(report)).not.toContain(secret);
  });
  it('checks saved profile keys and private restricted terms without publishing those terms', async () => {
    const root = await fixture(), secret = 'synthetic-profile-key-only', term = 'fictional-internal-label';
    await mkdir(join(root, '.algomotion/release-audit'), { recursive: true });
    await writeFile(join(root, '.algomotion/model-settings.json'), JSON.stringify({ profiles: [{ config: { key: secret } }] }));
    await writeFile(join(root, '.algomotion/release-audit/terms.json'), JSON.stringify([term]));
    await writeFile(join(root, 'sample.txt'), `${secret}\n${term.toUpperCase()}`);
    const report = await auditRelease(root);
    expect(report.findings.map((f) => f.code)).toEqual(['KNOWN_SECRET_COPY', 'RESTRICTED_TERM']);
    expect(JSON.stringify(report)).not.toContain(secret); expect(JSON.stringify(report)).not.toContain(term);
  });
  it('rejects nonpublic resolved locations without printing hostnames', async () => {
    const root = await fixture(), host = 'packages.example.invalid';
    await writeFile(join(root, 'package-lock.json'), JSON.stringify({ packages: { test: { resolved: `https://${host}/test.tgz` } } }));
    const report = await auditRelease(root);
    expect(report.findings).toContainEqual({ file: 'package-lock.json', code: 'NONPUBLIC_DEPENDENCY_LOCATION' });
    expect(JSON.stringify(report)).not.toContain(host);
  });
  it('detects credential-shaped text and real user paths, but does not emit matched values', async () => {
    const root = await fixture(), credential = ['sk', 'a'.repeat(32)].join('-'), home = ['/Users', 'synthetic-person'].join('/');
    await writeFile(join(root, 'note.txt'), `${home}/project\n${credential}`);
    const report = await auditRelease(root, { home });
    expect(report.findings).toContainEqual({ file: 'note.txt', code: 'ACTUAL_HOME_PATH' });
    expect(report.findings).toContainEqual({ file: 'note.txt', code: 'CREDENTIAL_SHAPE', line: 2 });
    expect(JSON.stringify(report)).not.toContain(credential); expect(JSON.stringify(report)).not.toContain(home);
  });
  it('fails safely for malformed secret sources and unknown binary files', async () => {
    const root = await fixture(); await mkdir(join(root, '.algomotion'));
    await writeFile(join(root, '.algomotion/model-settings.json'), '{sensitive malformed fixture');
    await writeFile(join(root, 'unknown.bin'), Buffer.from([0, 255]));
    const report = await auditRelease(root);
    expect(report.findings).toContainEqual({ file: '.algomotion/model-settings.json', code: 'PRIVATE_SCAN_SOURCE_UNREADABLE' });
    expect(report.findings).toContainEqual({ file: 'unknown.bin', code: 'BINARY_REQUIRES_REVIEW' });
    expect(JSON.stringify(report)).not.toContain('sensitive malformed');
  });
  it.skipIf(process.platform === 'win32')('refuses to follow a candidate symlink', async () => {
    const root = await fixture(); await writeFile(join(root, '.env'), 'LLM_API_KEY=fixture-private-only');
    await symlink(join(root, '.env'), join(root, 'linked.txt'));
    expect((await auditRelease(root)).findings).toContainEqual({ file: 'linked.txt', code: 'SYMLINK_REQUIRES_REVIEW' });
  });
  it('flags already tracked files even if publishing rules exclude them', async () => {
    const root = await fixture(); await writeFile(join(root, '.env'), 'LLM_API_KEY=fixture-private-only');
    execFileSync('git', ['-c', 'init.templateDir=', 'init', '--quiet', root]);
    execFileSync('git', ['-C', root, 'add', '-f', '.env']);
    const report = await auditRelease(root);
    expect(report.trackedFilesChecked).toBe(true);
    expect(report.findings).toContainEqual({ file: '.env', code: 'FORBIDDEN_TRACKED_FILE' });
  });
  it('rejects populated example keys', async () => {
    const root = await fixture(); await writeFile(join(root, '.env.example'), 'LLM_API_KEY=placeholder-not-blank\n');
    expect((await auditRelease(root)).findings).toContainEqual({ file: '.env.example', code: 'NONEMPTY_EXAMPLE_KEY' });
  });
});
