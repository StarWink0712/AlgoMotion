import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { dockerConnection } from './docker-binary.mjs';
import { generatedTraceSchema, limits, validateInput, type Program, type GeneratedTrace } from '../../src/engine/generated';
import { validationHint } from './diagnostics';

export class SandboxError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
export interface CommandOptions { input?: string; timeout: number; maxBytes: number; signal?: AbortSignal }
export type DockerCommand = (args: string[], options: CommandOptions) => Promise<{ code: number; stdout: string }>;

// Only the Docker CLI runs on the host. Never run Python, even when Docker is missing.
// Freeze our selected connection so setup cannot redirect an in-flight job's cleanup.
let connection: ReturnType<typeof dockerConnection> | undefined;
export const dockerCommand: DockerCommand = (args, options) => new Promise((resolve, reject) => {
  if (options.signal?.aborted) { reject(new SandboxError('CANCELLED', '任务已取消。')); return; }
  try { connection ??= dockerConnection(); }
  catch { reject(new SandboxError('RUNTIME_CONFIG', '容器连接配置无效，请检查 ALGOMOTION_CONTAINER_RUNTIME 与 Docker 连接设置。')); return; }
  const child = spawn(connection.binary, [...connection.prefix, ...args], { shell: false, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let size = 0, stdout = '', failure: SandboxError | undefined;
  const stop = (code: string, message: string) => { failure ??= new SandboxError(code, message); child.kill('SIGKILL'); };
  const cancel = () => stop('CANCELLED', '任务已取消。');
  const timer = setTimeout(() => stop('TIMEOUT', '隔离任务超时，已请求强制删除该任务容器。'), options.timeout);
  options.signal?.addEventListener('abort', cancel, { once: true });
  const cleanup = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', cancel); };
  child.on('error', () => { cleanup(); reject(new SandboxError('DOCKER_UNAVAILABLE', 'Docker 不可用。可运行 npm run setup -- --install-docker 准备环境；绝不降级为宿主机执行。')); });
  child.stdout.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (size > options.maxBytes) stop('OUTPUT_LIMIT', '容器输出超过限制，已请求强制删除。');
    else stdout += chunk.toString('utf8');
  });
  child.stderr.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (size > options.maxBytes) stop('OUTPUT_LIMIT', '容器 stdout/stderr 总量超过限制。');
  });
  child.stdin.on('error', () => {});
  child.on('close', (code) => { cleanup(); if (failure) reject(failure); else resolve({ code: code ?? -1, stdout }); });
  child.stdin.end(options.input ?? '');
});

export function isolationArgs(name: string, imageId: string) {
  return ['create', '--name', name, '--interactive', '--network=none', '--read-only', '--user=65532:65532',
    '--cap-drop=ALL', '--security-opt=no-new-privileges:true', '--memory=128m', '--memory-swap=128m', '--cpus=0.5',
    '--pids-limit=32', '--ulimit=nofile=64:64', '--ulimit=core=0:0', '--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=16m',
    '--restart=no', '--log-driver=none', '--entrypoint=python', imageId, '-I', '-B', '/runner/main.py'];
}
export interface Sandbox { probe(): Promise<{ available: boolean; message: string }>; run(program: Program, input: unknown, signal?: AbortSignal): Promise<GeneratedTrace> }
export class DockerSandbox implements Sandbox {
  private imageId?: string;
  private cleanupFailed = false;
  private probing?: Promise<{ available: boolean; message: string }>;
  private checked?: { at: number; result: { available: boolean; message: string } };
  constructor(private command: DockerCommand = dockerCommand, private image = process.env.ALGOMOTION_SANDBOX_IMAGE || 'algomotion-python:1') {}
  async probe() {
    if (this.cleanupFailed) return { available: false, message: '上次容器清理未获确认。请检查 Docker 中 algomotion-* 容器后重启 API。' };
    if (this.checked && Date.now() - this.checked.at < 5000) return this.checked.result;
    if (!this.probing) this.probing = this.inspectImage().then((result) => { this.checked = { at: Date.now(), result }; return result; }).finally(() => { this.probing = undefined; });
    return this.probing;
  }
  private async inspectImage() {
    try {
      const response = await this.command(['image', 'inspect', this.image, '--format', '{{json .}}'], { timeout: 5000, maxBytes: 64_000 });
      if (response.code !== 0) throw new Error();
      const image = JSON.parse(response.stdout);
      if (!/^sha256:[a-f0-9]{64}$/.test(image.Id) || image.Config?.Labels?.['org.algomotion.runner'] !== '1') throw new Error();
      this.imageId = image.Id;
      return { available: true, message: 'Docker 隔离镜像就绪（本地 MVP，不是公网多租户沙箱）。' };
    } catch {
      this.imageId = undefined;
      return { available: false, message: 'Docker 或隔离镜像不可用。运行 npm run setup -- --install-docker 准备环境，或用 npm run doctor 检查；不会在宿主机执行 Python。' };
    }
  }
  async run(program: Program, input: unknown, signal?: AbortSignal): Promise<GeneratedTrace> {
    validateInput(program.contract, input);
    if (Buffer.byteLength(program.python) > limits.sourceBytes) throw new SandboxError('SOURCE_LIMIT', 'Python 源码超过字节上限。');
    if (this.cleanupFailed || !this.imageId && !(await this.probe()).available) throw new SandboxError('DOCKER_UNAVAILABLE', 'Docker 隔离环境未就绪；没有宿主机执行回退。');
    const payload = JSON.stringify({ python: program.python, input });
    if (Buffer.byteLength(payload) > 100_000) throw new SandboxError('INPUT_LIMIT', '执行输入包过大。');
    const name = `algomotion-${randomUUID()}`;
    let created = false;
    try {
      const create = await this.command(isolationArgs(name, this.imageId!), { timeout: 10_000, maxBytes: 4096, signal });
      if (create.code !== 0) throw new SandboxError('CREATE_FAILED', '无法创建受限容器。请检查 Docker 配额与镜像。');
      created = true;
      const execution = await this.command(['start', '--attach', '--interactive', name], { input: payload, timeout: 12_000, maxBytes: limits.traceBytes + 4096, signal });
      if (execution.code !== 0) throw new SandboxError('RUNTIME_EXIT', 'Python 被终止或退出异常（可能超过 CPU/内存限制）。');
      let raw: unknown;
      try { raw = JSON.parse(execution.stdout); } catch { throw new SandboxError('INVALID_OUTPUT', '容器未返回合法 SDK 输出；拒绝非协议 stdout。'); }
      const failed = z.object({ ok: z.literal(false), error: z.object({ type: z.string().regex(/^[A-Za-z]{1,30}$/), line: z.number().int().min(1).max(3000).nullable() }).strict() }).strict().safeParse(raw);
      if (failed.success) throw new SandboxError(failed.data.error.type, `Python 执行失败：${failed.data.error.type}${failed.data.error.line ? `，solution.py:${failed.data.error.line}` : ''}。日志内容不回传。`);
      const success = z.object({ ok: z.literal(true), frames: z.unknown(), result: z.unknown() }).strict().safeParse(raw);
      if (!success.success) throw new SandboxError('INVALID_OUTPUT', '容器输出结构无效。');
      const trace = generatedTraceSchema.safeParse({ version: 3, origin: 'python-runtime', input, frames: success.data.frames, result: success.data.result });
      if (!trace.success) throw new SandboxError('INVALID_TRACE', `运行轨迹未通过 v3 结构检查：${validationHint(trace.error)}。禁止整体 dp=null、坐标数组 path 或累计超过 48 条依赖；未更改生成代码。`);
      if (trace.data.frames.some((f) => f.line > program.python.split('\n').length)) throw new SandboxError('INVALID_TRACE', '运行轨迹的 line 超出实际 Python 源码行数。');
      return trace.data;
    } finally {
      // Delete only our unpredictable task name, never other containers/processes.
      // Also attempt cleanup when create times out: daemon creation may outlive CLI.
      let removed = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await this.command(['rm', '--force', name], { timeout: 5000, maxBytes: 4096 });
          if (result.code === 0) { removed = true; break; }
          if (!created) {
            const check = await this.command(['container', 'ls', '--all', '--filter', `name=^/${name}$`, '--format', '{{.Names}}'], { timeout: 5000, maxBytes: 4096 });
            if (check.code === 0 && check.stdout.trim() === '') { removed = true; break; }
          }
        } catch { /* Retry cleanup once; fail closed if the daemon cannot confirm. */ }
      }
      if (!removed) { this.cleanupFailed = true; throw new SandboxError('CLEANUP_FAILED', `无法确认任务容器 ${name} 已删除。已禁用后续执行，请检查 Docker 后重启服务。`); }
    }
  }
}
