import { existsSync } from 'node:fs';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const excludedDirectories = new Set(['node_modules', 'dist', '.git', '.algomotion', 'artifacts', 'test-results', 'playwright-report', '.idea', '.vscode', '__pycache__', '.ssh', '.aws', '.kube']);
export function excludedFromRelease(path) {
  const parts = path.replaceAll('\\', '/').split('/'), name = parts.at(-1);
  return parts.some((part) => excludedDirectories.has(part)) || ['.DS_Store', '.npmrc', '.netrc', '.pypirc', '.git-credentials', 'id_rsa', 'id_ed25519'].includes(name)
    || name === '.env' || name.startsWith('.env.') && name !== '.env.example'
    || /\.(?:tsbuildinfo|log|png|jpe?g|webm|mp4|zip|tar|gz|tgz|pem|key|p12|pfx|sqlite3?|db|pyc)$/i.test(name);
}

export async function auditRelease(root, { sensitiveTerms = [], home = homedir() } = {}) {
  const findings = [], files = [], secrets = new Set(), skipped = [];
  const add = (file, code, line) => findings.push({ file, code, ...(line ? { line } : {}) });
  async function optionalPrivate(path, parse) {
    try {
      const file = join(root, path);
      if (!existsSync(file)) return;
      const stat = await lstat(file);
      if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error();
      parse(await readFile(file, 'utf8'));
    } catch { add(path, 'PRIVATE_SCAN_SOURCE_UNREADABLE'); }
  }
  await optionalPrivate('.env', (text) => {
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?\w*(?:KEY|TOKEN|SECRET|PASSWORD)\s*=\s*(.*?)\s*$/i);
      if (!match) continue;
      const value = /^["']/.test(match[1]) ? match[1].slice(1).split(match[1][0])[0] : match[1].split('#')[0].trim();
      if (value.length >= 8) secrets.add(value);
    }
  });
  await optionalPrivate('.algomotion/model-settings.json', (text) => {
    const visit = (value, depth = 0) => {
      if (depth > 32) throw new Error();
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (/^(?:apiKey|key|token|password|secret)$/i.test(key) && typeof child === 'string' && child.length >= 8) secrets.add(child);
        else visit(child, depth + 1);
      }
    };
    visit(JSON.parse(text));
  });
  await optionalPrivate('.algomotion/release-audit/terms.json', (text) => {
    const terms = JSON.parse(text);
    if (!Array.isArray(terms) || terms.length > 100 || terms.some((term) => typeof term !== 'string' || term.length < 4 || term.length > 200)) throw new Error();
    sensitiveTerms = [...sensitiveTerms, ...terms];
  });
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name), path = relative(root, file).replaceAll('\\', '/');
      if (excludedFromRelease(path)) { skipped.push(path); continue; }
      if (entry.isSymbolicLink()) { add(path, 'SYMLINK_REQUIRES_REVIEW'); continue; }
      if (entry.isDirectory()) { await walk(file); continue; }
      const stat = await lstat(file);
      if (!stat.isFile() || stat.size > 2_000_000) { add(path, 'FILE_REQUIRES_REVIEW'); continue; }
      files.push(path);
      const bytes = await readFile(file), text = bytes.toString('utf8');
      if (!Buffer.from(text).equals(bytes) || bytes.includes(0)) { add(path, 'BINARY_REQUIRES_REVIEW'); continue; }
      if ([...secrets].some((value) => text.includes(value))) add(path, 'KNOWN_SECRET_COPY');
      if (home && text.includes(home)) add(path, 'ACTUAL_HOME_PATH');
      if (sensitiveTerms.some((term) => text.toLowerCase().includes(term.toLowerCase()))) add(path, 'RESTRICTED_TERM');
      const rules = [
        ['CREDENTIAL_SHAPE', /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{16,})/g],
        ['PRIVATE_KEY', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
        ['PRIVATE_NETWORK', /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/g],
      ];
      for (const [code, pattern] of rules) for (const match of text.matchAll(pattern)) add(path, code, text.slice(0, match.index).split('\n').length);
      if (path === '.env.example' && /^[ \t]*LLM_API_KEY[ \t]*=[ \t]*[^\s#]+/m.test(text)) add(path, 'NONEMPTY_EXAMPLE_KEY');
    }
  }
  await walk(root);
  try {
    const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
    for (const item of Object.values(lock.packages || {})) if (item.resolved) {
      let valid = false;
      try { const url = new URL(item.resolved); valid = url.protocol === 'https:' && url.hostname === 'registry.npmjs.org' && !url.username && !url.password && !url.search && !url.hash; } catch { /* Non-URL dependencies need review. */ }
      if (!valid) { add('package-lock.json', 'NONPUBLIC_DEPENDENCY_LOCATION'); break; }
    }
  } catch { add('package-lock.json', 'LOCKFILE_UNREADABLE'); }
  // Ignored files may already be tracked; .gitignore alone is not a release boundary.
  let trackedFilesChecked = false;
  if (existsSync(join(root, '.git'))) {
    const result = spawnSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 2_000_000, timeout: 10_000, windowsHide: true });
    if (result.status !== 0) add('.git', 'TRACKED_INVENTORY_FAILED');
    else {
      trackedFilesChecked = true;
      for (const path of result.stdout.split('\0').filter(Boolean)) if (excludedFromRelease(path)) add(path, 'FORBIDDEN_TRACKED_FILE');
    }
  }
  return { files: files.sort(), skipped: skipped.sort(), findings, knownSecretSourcesChecked: secrets.size > 0, trackedFilesChecked, historyScanned: false, humanAuthorization: 'REQUIRED' };
}
