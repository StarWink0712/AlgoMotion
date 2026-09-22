import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';

const spawn = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', () => ({ spawn }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); spawn.mockReset(); });

function successfulCli() {
  spawn.mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), kill: vi.fn() });
    queueMicrotask(() => child.emit('close', 0));
    return child;
  });
}

describe('Docker CLI connection forwarding (MOCK process, no container execution)', () => {
  it('uses the same scoped context for execution and cleanup even if environment changes mid-job', async () => {
    successfulCli();
    vi.stubEnv('ALGOMOTION_CONTAINER_RUNTIME', process.platform === 'darwin' ? 'colima' : 'external');
    vi.stubEnv('DOCKER_BIN', '/mock/docker'); vi.stubEnv('DOCKER_HOST', '');
    vi.stubEnv('DOCKER_CONTEXT', process.platform === 'darwin' ? '' : 'colima-algomotion');
    const { dockerCommand } = await import('../server/generation/sandbox');
    await dockerCommand(['start', '--attach', 'algomotion-test'], { timeout: 1000, maxBytes: 4096, input: '{}' });
    vi.stubEnv('ALGOMOTION_CONTAINER_RUNTIME', 'external'); vi.stubEnv('DOCKER_CONTEXT', 'different-engine');
    await dockerCommand(['rm', '--force', 'algomotion-test'], { timeout: 1000, maxBytes: 4096 });
    expect(spawn.mock.calls[0][0]).toBe('/mock/docker');
    expect(spawn.mock.calls[0][1]).toEqual(['--context', 'colima-algomotion', 'start', '--attach', 'algomotion-test']);
    expect(spawn.mock.calls[1][1]).toEqual(['--context', 'colima-algomotion', 'rm', '--force', 'algomotion-test']);
    expect(spawn.mock.calls[0][2]).toMatchObject({ shell: false, windowsHide: true });
  });
  it('invalid runtime configuration rejects instead of spawning any executable', async () => {
    vi.stubEnv('ALGOMOTION_CONTAINER_RUNTIME', 'invalid');
    const { dockerCommand } = await import('../server/generation/sandbox');
    await expect(dockerCommand(['info'], { timeout: 1000, maxBytes: 4096 })).rejects.toMatchObject({ code: 'RUNTIME_CONFIG' });
    expect(spawn).not.toHaveBeenCalled();
  });
});
