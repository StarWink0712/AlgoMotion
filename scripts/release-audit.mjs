import { fileURLToPath } from 'node:url';
import { auditRelease } from './lib/release-audit.mjs';

try {
  const result = await auditRelease(fileURLToPath(new URL('../', import.meta.url)));
  console.log(JSON.stringify({ candidateFiles: result.files.length, excludedItems: result.skipped.length, findings: result.findings, knownSecretSourcesChecked: result.knownSecretSourcesChecked, trackedFilesChecked: result.trackedFilesChecked, historyScanned: false, humanAuthorization: result.humanAuthorization }, null, 2));
  console.log('仅为本机工作区技术扫描，不证明代码归属、公司批准或绝对无秘密；不扫描 Git 历史、图片/录像内容或模型调用历史。未进行上传。');
  process.exitCode = result.findings.length ? 1 : 0;
} catch { console.error('RELEASE_AUDIT_FAILED: 扫描未完成，不应继续发布。未输出文件内容。'); process.exitCode = 1; }
