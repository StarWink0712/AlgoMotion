// Diagnostic replay only in the production DockerSandbox with identical restrictions.
// Reports schema paths/codes, never raw stdout, arbitrary exception text or credentials.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { DockerSandbox, dockerCommand } from '../server/generation/sandbox';
import { generatedTraceSchema, programSchema } from '../src/engine/generated';

const path = resolve(process.argv[2]);
const job = JSON.parse(await readFile(path, 'utf8'));
const program = programSchema.parse(job.program);
const caseNumber = process.argv[4];
const boundary = process.argv[3] ? JSON.parse(await readFile(resolve(process.argv[3]), 'utf8')).results.find((r: { case: number }) => r.case === Number(caseNumber)) : undefined;
const input = boundary ? boundary.input : program.contract.examples[0].input;
let diagnostic: unknown;
const sandbox = new DockerSandbox(async (args, options) => {
  const result = await dockerCommand(args, options);
  if (args[0] === 'start' && result.code === 0) {
    try {
      const raw = JSON.parse(result.stdout);
      if (raw.ok === true) {
        const trace = generatedTraceSchema.safeParse({ version: 3, origin: 'python-runtime', input, frames: raw.frames, result: raw.result });
        if (!trace.success) diagnostic = {
          totalIssues: trace.error.issues.length,
          issues: trace.error.issues.slice(0, 12).map((i) => ({ path: i.path.join('.'), code: i.code, ...(i.code === 'invalid_type' ? { expected: i.expected, received: i.received } : {}), ...(i.code === 'too_big' ? { maximum: i.maximum, type: i.type } : {}) })),
        };
      }
    } catch { diagnostic = { transport: 'invalid JSON' }; }
  }
  return result;
});
try {
  await sandbox.run(program, input);
  console.log('Diagnostic replay passed; no schema errors.');
} catch (error) {
  const report = { actualDockerReplay: true, error: error instanceof Error ? error.message : 'failed', diagnostic };
  await writeFile(resolve(dirname(path), `${basename(path, '.json')}${caseNumber ? `-case${caseNumber}` : ''}-diagnostic.json`), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
}
