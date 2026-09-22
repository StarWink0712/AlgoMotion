// Real Docker tests with hand-authored programs. No model call or host Python execution.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { DockerSandbox, SandboxError, dockerCommand, type DockerCommand } from '../server/generation/sandbox';
import { independentCases, verifyResult } from '../server/generation/verify';
import { fixtureProgram } from './generated-fixtures';
import { checkTeaching } from '../server/generation/quality';

const ownedContainers = new Set<string>();
const inspectExecution: DockerCommand = async (args, options) => {
  const result = await dockerCommand(args, options);
  if (args[0] === 'create' && result.code === 0) {
    const name = args[args.indexOf('--name') + 1];
    ownedContainers.add(name);
    const inspection = await dockerCommand(['container', 'inspect', name], { timeout: 5000, maxBytes: 64000 });
    assert.equal(inspection.code, 0, 'Cannot inspect the actual test container');
    const container = JSON.parse(inspection.stdout)[0], host = container.HostConfig;
    assert.equal(container.Config.User, '65532:65532');
    assert.equal(host.NetworkMode, 'none');
    assert.equal(host.ReadonlyRootfs, true);
    assert.equal(host.Memory, 128 * 1024 * 1024);
    assert.equal(host.MemorySwap, host.Memory);
    assert.equal(host.NanoCpus, 500_000_000);
    assert.equal(host.PidsLimit, 32);
    assert.ok(host.CapDrop.includes('ALL'));
    assert.ok(host.SecurityOpt.some((v: string) => v.startsWith('no-new-privileges')));
    assert.equal(host.LogConfig.Type, 'none');
    assert.equal((host.Binds ?? []).length, 0);
    assert.equal((host.Mounts ?? []).length, 0);
    for (const flag of ['noexec', 'nosuid', 'nodev', 'size=16m']) assert.ok(host.Tmpfs['/tmp'].includes(flag));
    assert.equal(container.Config.Env.some((v: string) => /^LLM_/.test(v)), false, 'Model environment must not enter the container');
  }
  return result;
};
const sandbox = new DockerSandbox(inspectExecution);
const readiness = await sandbox.probe();
if (!readiness.available) {
  console.error(`NOT RUN: ${readiness.message}`); process.exitCode = 2;
} else {
  let executions = 0;
  for (const kind of ['grid-shortest-4', 'grid-min-right-down'] as const) {
    const program = fixtureProgram(kind);
    for (const input of [program.contract.examples[0].input, ...independentCases(kind)]) {
      const trace = await sandbox.run(program, input); executions++;
      assert.equal(verifyResult(kind, input, trace.result), true);
      assert.equal(checkTeaching(trace, kind).status, 'passed', JSON.stringify(checkTeaching(trace, kind).details));
      assert.equal(trace.origin, 'python-runtime');
      assert.ok(trace.frames.length > 0);
      if (trace.frames.length > 1) {
        const first = JSON.stringify(trace.frames[0]);
        trace.frames.at(-1)!.visited.push(999);
        assert.equal(JSON.stringify(trace.frames[0]), first);
      }
    }
    console.log(`PASS real Docker fixture and independent reference: ${kind}`);
  }
  const base = fixtureProgram('grid-shortest-4'), input = base.contract.examples[0].input;
  const run = (python: string, signal?: AbortSignal) => sandbox.run({ ...base, python }, input, signal);
  const environment = await run(`def solve(data, trace):
    import os, socket
    assert os.getuid() == 65532
    assert 'LLM_API_KEY' not in os.environ
    assert not os.path.exists('/var/run/docker.sock')
    assert not os.path.exists('/Users')
    try:
        open('/forbidden', 'w').write('bad')
        raise AssertionError('root is writable')
    except OSError:
        pass
    sock = socket.socket()
    sock.settimeout(1)
    blocked = False
    try:
        sock.connect(('1.1.1.1', 53))
    except OSError:
        blocked = True
    finally:
        sock.close()
    trace.snapshot('isolation', variables={'networkDenied': blocked})
    return blocked
`);
  assert.equal(environment.result, true); executions++;
  console.log('PASS real Docker: non-root, root read-only, no secret/socket/host home, external network denied');
  const failures = [
    { name: 'infinite loop', codes: ['RUNTIME_EXIT', 'TIMEOUT'], python: 'def solve(data, trace):\n    while True: pass\n' },
    { name: 'stdout overload', codes: ['OutputLimit'], python: 'def solve(data, trace):\n    print("x" * 100000)\n' },
    { name: 'stderr overload', codes: ['OutputLimit'], python: 'def solve(data, trace):\n    import sys\n    sys.stderr.write("x" * 100000)\n' },
    { name: 'raw output overload', codes: ['OUTPUT_LIMIT'], python: 'def solve(data, trace):\n    import os\n    while True: os.write(1, b"x" * 65536)\n' },
    { name: 'trace count overload', codes: ['TraceLimit'], python: 'def solve(data, trace):\n    for i in range(601): trace.snapshot("step")\n    return 0\n' },
    { name: 'trace bytes overload', codes: ['TraceLimit'], python: 'def solve(data, trace):\n    for i in range(600): trace.snapshot("step", variables={"big":"x" * 8000})\n    return 0\n' },
    { name: 'syntax error', codes: ['SyntaxError'], python: 'def solve(data, trace) ???\n' },
    { name: 'bad trace references', codes: ['INVALID_TRACE'], python: 'def solve(data, trace):\n    trace.snapshot("bad", active=[9999])\n    return 0\n' },
    { name: 'memory overload', codes: ['MemoryError', 'RUNTIME_EXIT'], python: 'def solve(data, trace):\n    x = bytearray(256 * 1024 * 1024)\n    return len(x)\n' },
  ];
  for (const item of failures) {
    await assert.rejects(run(item.python), (e: unknown) => e instanceof SandboxError && item.codes.includes(e.code));
    executions++; console.log(`PASS rejected and cleaned: ${item.name}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try { await assert.rejects(run('def solve(data, trace):\n    while True: pass\n', controller.signal), (e: unknown) => e instanceof SandboxError && e.code === 'CANCELLED'); }
  finally { clearTimeout(timer); }
  executions++;
  assert.equal((await sandbox.probe()).available, true);
  await assert.rejects(sandbox.run(base, { grid: [], start: [0, 0], end: [0, 0] }));
  const remaining = await dockerCommand(['container', 'ls', '--all', '--filter', 'name=algomotion-', '--format', '{{.Names}}'], { timeout: 5000, maxBytes: 64000 });
  assert.equal(remaining.code, 0, 'Cannot confirm test container cleanup');
  assert.equal(remaining.stdout.split('\n').some((name) => ownedContainers.has(name.trim())), false, 'An owned test container was not removed');
  console.log('PASS actual Docker configuration inspection and no remaining owned test containers');
  console.log(`PASS ${executions} real Docker executions, plus invalid-input rejection. No real model generation tested.`);
}
