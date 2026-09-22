import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { colimaStartArgs, ensureEnv, installPlan, parseOptions, readSettings, setup, validNode, warmRuntime, type Host } from '../scripts/lib/setup.mjs';
import { colimaConfigPath, containerRuntime, dockerConnection, resolveColimaBinary, resolveDockerBinary } from '../server/generation/docker-binary.mjs';

function fixture(platform: NodeJS.Platform = 'darwin', installed = false, ready = false, profile = false) {
  const state = { installed, colima: installed, profile, externalReady: ready && !profile, colimaReady: ready && profile, failInstall: false, failStart: false, failBuild: false, failCi: false, neverReady: false, started: false, time: 0, envCreated: false, config: '', os: 'linux', manager: true, image: true };
  const log = vi.fn();
  const host: Host = {
    platform, version: '24.19.0', root: '/project', node: '/node', env: { PATH: '', HOME: '/home/dev', npm_execpath: '/npm-cli.js' },
    exists: (path) => path === '/npm-cli.js' || path.includes('node_modules') || path === '/opt/homebrew/bin/docker' && state.installed || path === '/opt/homebrew/bin/colima' && state.colima || path === '/home/dev/.colima/algomotion/colima.yaml' && state.profile,
    run: vi.fn(async (command, original) => {
      if (command === 'brew' || command.endsWith('/brew')) {
        if (original[0] === '--version') return { code: state.manager ? 0 : 127, output: '' };
        if (state.failInstall) return { code: 1, output: '' };
        state.installed = true; state.colima = true; return { code: 0, output: '' };
      }
      if (command.endsWith('colima')) {
        if (!state.colima) return { code: 127, output: '' };
        if (original[0] === 'version') return { code: 0, output: 'MOCK colima' };
        if (original[0] !== 'start') throw new Error('Unexpected Colima command');
        state.started = true; state.profile = true;
        state.colimaReady = !state.failStart && !state.neverReady;
        return { code: state.failStart ? 124 : 0, output: '' };
      }
      if (command === '/node') return { code: state.failCi ? 1 : 0, output: '' };
      if (!command.endsWith('docker') && !command.endsWith('docker.exe')) throw new Error('Unexpected executable');
      if (!state.installed) return { code: 127, output: '' };
      const args = original[0] === '--context' || original[0] === '--host' ? original.slice(2) : original;
      if (args[0] === '--version') return { code: 0, output: 'MOCK Docker CLI' };
      const ready = original[0] === '--context' && original[1] === 'colima-algomotion' ? state.colimaReady : state.externalReady;
      if (!ready) return { code: 1, output: '' };
      if (args[0] === 'info') return { code: 0, output: state.os };
      if (args[0] === 'build') return { code: state.failBuild ? 1 : 0, output: '' };
      return { code: 0, output: state.image ? '{"org.algomotion.runner":"1"}' : '{}' };
    }),
    readConfig: async () => state.config,
    ensureEnv: vi.fn(async () => { state.envCreated = true; return true; }), log,
    now: () => state.time, sleep: async (ms) => { state.time += ms; },
  };
  return { host, state, log, commands: () => vi.mocked(host.run).mock.calls.map(([command, args]) => [command, ...args].join(' ')) };
}

describe('CLI-only setup (MOCK installers/VM/engines; no actual installation)', () => {
  it.each(['22.12.0', '22.20.0', '24.0.0', 'v24.19.0'])('accepts Node %s', (v) => expect(validNode(v)).toBe(true));
  it.each(['20.19.0', '22.11.0', 'invalid'])('rejects Node %s', (v) => expect(validNode(v)).toBe(false));
  it.each([['--install-docker', '--check'], ['--presets', '--install-docker'], ['--install-docker', '--runtime-only'], ['--runtime-only', '--build-only'], ['--runtime-only', '--presets'], ['--silent']])('rejects incompatible flags %j', (...flags) => expect(() => parseOptions(flags)).toThrow());
  it.each(['darwin', 'win32', 'linux'] as const)('%s dry run never runs commands or writes config', async (platform) => {
    const { host, log } = fixture(platform);
    expect(await setup(parseOptions(['--install-docker', '--dry-run']), host)).toBe(0);
    expect(host.run).not.toHaveBeenCalled(); expect(host.ensureEnv).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join(' ')).toContain(platform === 'darwin' ? 'install colima docker' : platform === 'win32' ? 'WSL2' : 'Docker Engine');
  });
  it('requires opt-in before installing a missing CLI/runtime', async () => {
    const { host, commands } = fixture();
    await expect(setup(parseOptions([]), host)).rejects.toThrow('--install-docker');
    expect(commands().join(' ')).not.toMatch(/\bbrew\b|winget/); expect(host.ensureEnv).not.toHaveBeenCalled();
  });
  it('installs Colima/CLI, starts a dedicated no-mount VM, builds via scoped context and preserves global context', async () => {
    const { host, state, commands } = fixture();
    expect(await setup(parseOptions(['--install-docker']), host)).toBe(0);
    expect(state.installed && state.started && state.colimaReady && state.envCreated).toBe(true);
    expect(commands()).toContain('brew install colima docker');
    expect(commands()).toContain(`/opt/homebrew/bin/colima ${colimaStartArgs(false).join(' ')}`);
    expect(commands()).toContain('/opt/homebrew/bin/docker --context colima-algomotion build -t algomotion-python:1 /project/sandbox');
    expect(commands()).toContain('/node /npm-cli.js ci');
    expect(commands().join(' ')).not.toMatch(/context use|Docker.app|DockerDesktop|--cask|winget|--accept|ExecutionPolicy|wsl.exe|chmod|usermod|sudo|\bopen\b/);
    expect(host.env.ALGOMOTION_CONTAINER_RUNTIME).toBeUndefined();
    expect(host.env.PATH).toBe('');
    const start = vi.mocked(host.run).mock.calls.find(([command, args]) => command.endsWith('colima') && args[0] === 'start');
    expect(start?.[2]?.env?.PATH).toContain('/opt/homebrew/bin');
  });
  it.each(['darwin', 'win32', 'linux'] as const)('%s reuses a running engine without installation or GUI startup', async (platform) => {
    const { host, state, commands } = fixture(platform, true, true);
    expect(await setup(parseOptions(['--install-docker']), host)).toBe(0);
    expect(state.started).toBe(false); expect(commands().join(' ')).not.toMatch(/\bbrew\b|winget|colima.*start|context use/);
  });
  it('starts an existing managed profile without installing, resetting VM size or selecting a global context', async () => {
    const { host, state, commands } = fixture('darwin', true, false, true);
    expect(await setup(parseOptions([]), host)).toBe(0); expect(state.started).toBe(true);
    expect(commands()).toContain(`/opt/homebrew/bin/colima ${colimaStartArgs(true).join(' ')}`);
    expect(commands().join(' ')).not.toMatch(/\bbrew\b|--cpus|--memory|--disk|context use/);
  });
  it('explicit colima mode provisions its own profile even when another engine is running', async () => {
    const { host, state, commands } = fixture('darwin', true, true);
    state.config = 'ALGOMOTION_CONTAINER_RUNTIME=colima';
    expect(await setup(parseOptions([]), host)).toBe(0);
    expect(state.started).toBe(true); expect(state.externalReady).toBe(true);
    expect(commands()).toContain('/opt/homebrew/bin/docker --context colima-algomotion build -t algomotion-python:1 /project/sandbox');
  });
  it.each(['DOCKER_HOST=unix:///private/docker.sock', 'DOCKER_CONTEXT=other', 'ALGOMOTION_CONTAINER_RUNTIME=external', 'DOCKER_BIN=/custom/docker'])('unavailable explicit connection never switches or installs: %s', async (config) => {
    const { host, state, commands } = fixture('darwin', true); state.config = config;
    await expect(setup(parseOptions(['--install-docker']), host)).rejects.toThrow('外部 Docker');
    expect(state.started).toBe(false); expect(commands().join(' ')).not.toMatch(/\bbrew\b|colima.*start/);
  });
  it('a broken explicit CLI never triggers package installation', async () => {
    const { host, state, commands } = fixture(); state.config = 'DOCKER_BIN=/custom/docker';
    await expect(setup(parseOptions(['--install-docker']), host)).rejects.toThrow('DOCKER_BIN');
    expect(commands().join(' ')).not.toMatch(/\bbrew\b|colima/);
  });
  it.each(['win32', 'linux'] as const)('%s missing engine gives manual prerequisites, no Desktop installation', async (platform) => {
    const { host, commands } = fixture(platform);
    await expect(setup(parseOptions(['--install-docker']), host)).rejects.toThrow(platform === 'win32' ? 'WSL2' : 'Docker Engine');
    expect(commands().join(' ')).not.toMatch(/apt|sudo|winget|systemctl|wsl.exe/); expect(host.ensureEnv).not.toHaveBeenCalled();
  });
  it('missing Homebrew and failed installs stop without env writes or automatic retry', async () => {
    const { host, state, commands } = fixture(); state.manager = false;
    await expect(setup(parseOptions(['--install-docker']), host)).rejects.toThrow('Homebrew');
    state.manager = true; state.failInstall = true;
    await expect(setup(parseOptions(['--install-docker']), host)).rejects.toThrow('安装未完成');
    expect(commands().filter((line) => line === 'brew install colima docker')).toHaveLength(1);
    expect(host.ensureEnv).not.toHaveBeenCalled();
  });
  it('Colima startup failure is explicit; readiness timeout never builds', async () => {
    const { host, state, commands } = fixture('darwin', true, false, true); state.failStart = true;
    await expect(setup(parseOptions([]), host)).rejects.toThrow('启动失败或超时');
    state.failStart = false; state.neverReady = true;
    await expect(setup(parseOptions([]), host)).rejects.toThrow('尚未就绪');
    expect(state.time).toBe(180_000); expect(commands().some((line) => line.includes(' build '))).toBe(false);
  });
  it('rejects Windows containers without switching engine settings', async () => {
    const { host, state } = fixture('win32', true, true); state.os = 'windows';
    await expect(setup(parseOptions([]), host)).rejects.toThrow('Windows containers');
    expect(state.started).toBe(false);
  });
  it('presets never need a valid container configuration or probe Docker', async () => {
    const { host, state, commands } = fixture(); state.config = 'ALGOMOTION_CONTAINER_RUNTIME=invalid';
    expect(await setup(parseOptions(['--presets']), host)).toBe(0);
    expect(commands()).toEqual(['/node /npm-cli.js ci']);
  });
  it('doctor is read-only, scoped to the managed profile and hides configuration values', async () => {
    const { host, state, commands, log } = fixture('darwin', true, true, true);
    state.config = 'LLM_BASE_URL=https://private.example\nLLM_API_KEY=SECRET-DO-NOT-LOG\nLLM_MODEL=private-model';
    expect(await setup(parseOptions(['--check']), host)).toBe(0);
    expect(host.ensureEnv).not.toHaveBeenCalled(); expect(state.started).toBe(false);
    expect(commands().join(' ')).not.toMatch(/build|ci|install/);
    expect(commands()).toContain('/opt/homebrew/bin/docker --context colima-algomotion info --format {{.OSType}}');
    expect(log.mock.calls.flat().join(' ')).not.toMatch(/SECRET|private\.example|private-model/);
  });
  it('doctor reports incomplete instead of starting a stopped profile', async () => {
    const { host, state } = fixture('darwin', true, false, true);
    expect(await setup(parseOptions(['--check']), host)).toBe(2);
    expect(state.started).toBe(false); expect(host.ensureEnv).not.toHaveBeenCalled();
  });
  it('only-build honors explicit binary, connection and image with no package/config changes', async () => {
    const { host, state, commands } = fixture('darwin', true, true);
    state.config = 'ALGOMOTION_SANDBOX_IMAGE=local/algomotion:custom\nDOCKER_BIN=/custom/docker\nDOCKER_CONTEXT=existing';
    expect(await setup(parseOptions(['--build-only']), host)).toBe(0);
    expect(commands()).toContain('/custom/docker --context existing build -t local/algomotion:custom /project/sandbox');
    expect(host.ensureEnv).not.toHaveBeenCalled(); expect(commands().join(' ')).not.toContain(' ci');
  });
  it('failed build, incorrect label and failed npm ci cannot claim success', async () => {
    const { host, state } = fixture('darwin', true, true); state.failBuild = true;
    await expect(setup(parseOptions(['--build-only']), host)).rejects.toThrow('镜像');
    state.failBuild = false; state.image = false;
    await expect(setup(parseOptions(['--build-only']), host)).rejects.toThrow('镜像');
    state.failCi = true;
    await expect(setup(parseOptions(['--presets']), host)).rejects.toThrow('npm ci');
    expect(host.ensureEnv).not.toHaveBeenCalled();
  });
  it('daily startup warms an existing profile without creating config, installing packages or rebuilding', async () => {
    const { host, state, commands } = fixture('darwin', true, false, true);
    expect(await warmRuntime(host)).toBe(true); expect(state.started).toBe(true);
    expect(host.ensureEnv).not.toHaveBeenCalled(); expect(commands().join(' ')).not.toMatch(/\bbrew\b| build | ci/);
  });
  it('daily startup never provisions a new VM and allows presets when generation dependencies fail', async () => {
    const { host, state, commands, log } = fixture('darwin', true, false, false);
    expect(await warmRuntime(host)).toBe(false);
    expect(state.started).toBe(false); expect(commands().join(' ')).not.toMatch(/\bbrew\b|colima.*start| build | ci/);
    expect(log.mock.calls.flat().join(' ')).toContain('预设题不受影响');
    await expect(setup(parseOptions(['--runtime-only']), host)).rejects.toThrow('尚未配置');
  });
  it('only-build never starts a stopped runtime', async () => {
    const { host, state } = fixture('darwin', true, false, true);
    await expect(setup(parseOptions(['--build-only']), host)).rejects.toThrow('未运行'); expect(state.started).toBe(false);
  });
});

describe('configuration preservation and connection discovery', () => {
  const dirs: string[] = [];
  afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
  it('creates config only once and preserves an existing key byte-for-byte', async () => {
    const root = await mkdtemp(join(tmpdir(), 'algomotion-setup-test-')); dirs.push(root);
    await writeFile(join(root, '.env.example'), 'LLM_API_KEY=\n');
    expect(await ensureEnv(root)).toBe(true);
    const existing = 'LLM_API_KEY="secret-existing"\r\nPORT=3017\r\n'; await writeFile(join(root, '.env'), existing);
    expect(await ensureEnv(root)).toBe(false); expect(await readFile(join(root, '.env'), 'utf8')).toBe(existing);
  });
  it('reads scalar runtime settings and lets process environment override them', () => {
    expect(readSettings('LLM_API_KEY="abc#def" # comment\nALGOMOTION_CONTAINER_RUNTIME=colima\nDOCKER_CONTEXT=local', { DOCKER_CONTEXT: 'override' })).toMatchObject({ LLM_API_KEY: 'abc#def', ALGOMOTION_CONTAINER_RUNTIME: 'colima', DOCKER_CONTEXT: 'override' });
  });
  it('discovers Homebrew CLIs without PATH and prefers them over Desktop fallback', () => {
    expect(resolveDockerBinary({ platform: 'darwin', env: { PATH: '' }, exists: () => true })).toBe('/opt/homebrew/bin/docker');
    expect(resolveColimaBinary({ env: { PATH: '' }, exists: (p) => p === '/usr/local/bin/colima' })).toBe('/usr/local/bin/colima');
  });
  it('keeps existing Desktop CLI compatibility without installing or launching its UI', () => {
    expect(resolveDockerBinary({ platform: 'darwin', env: { PATH: '' }, exists: (p) => p === '/Applications/Docker.app/Contents/Resources/bin/docker' })).toBe('/Applications/Docker.app/Contents/Resources/bin/docker');
    const path = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
    expect(resolveDockerBinary({ platform: 'win32', env: { PATH: '' }, exists: (p) => p === path })).toBe(path);
    expect(resolveDockerBinary({ env: { DOCKER_BIN: '/custom/docker' }, exists: () => false })).toBe('/custom/docker');
  });
  it('scopes auto mode to the managed profile only when it exists, including stopped profiles', () => {
    const env = { HOME: '/home/dev', PATH: '' };
    expect(dockerConnection({ platform: 'darwin', env, exists: (p) => p === colimaConfigPath(env) }).prefix).toEqual(['--context', 'colima-algomotion']);
    expect(dockerConnection({ platform: 'darwin', env, exists: () => false }).prefix).toEqual([]);
    expect(colimaConfigPath({ COLIMA_HOME: '/custom/colima' })).toBe('/custom/colima/algomotion/colima.yaml');
  });
  it.each([{ DOCKER_CONTEXT: 'user' }, { DOCKER_HOST: 'unix:///custom.sock' }, { DOCKER_BIN: '/custom/docker' }, { ALGOMOTION_CONTAINER_RUNTIME: 'external' }])('explicit configuration wins over auto profile discovery: %j', (env) => {
    expect(containerRuntime({ platform: 'darwin', env, exists: () => true })).toBe('external');
  });
  it('rejects unknown runtime, conflicting endpoints and non-macOS Colima without command execution', () => {
    expect(() => containerRuntime({ env: { ALGOMOTION_CONTAINER_RUNTIME: 'unknown' } })).toThrow();
    expect(() => containerRuntime({ platform: 'darwin', env: { ALGOMOTION_CONTAINER_RUNTIME: 'colima', DOCKER_HOST: 'unix:///x' } })).toThrow('不能同时');
    expect(() => containerRuntime({ platform: 'win32', env: { ALGOMOTION_CONTAINER_RUNTIME: 'colima' } })).toThrow('macOS');
    expect(() => installPlan('win32')).toThrow('WSL2');
  });
  it('passes explicit context/host as separate CLI arguments and respects Docker context precedence', () => {
    expect(dockerConnection({ env: { DOCKER_CONTEXT: 'some context', DOCKER_HOST: 'unix:///ignored' }, exists: () => false }).prefix).toEqual(['--context', 'some context']);
    expect(dockerConnection({ env: { DOCKER_HOST: 'unix:///my engine.sock' }, exists: () => false }).prefix).toEqual(['--host', 'unix:///my engine.sock']);
  });
});
