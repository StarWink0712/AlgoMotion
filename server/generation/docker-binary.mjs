import { existsSync } from 'node:fs';
import { posix, win32 } from 'node:path';
import { homedir } from 'node:os';

// Also discover CLI-only Homebrew installs before the terminal PATH is refreshed.
export function resolveDockerBinary({ platform = process.platform, env = process.env, exists = existsSync } = {}) {
  if (env.DOCKER_BIN?.trim()) return env.DOCKER_BIN.trim();
  const windows = platform === 'win32', paths = windows ? win32 : posix;
  const name = windows ? 'docker.exe' : 'docker';
  const candidates = (env.PATH ?? env.Path ?? env.path ?? '').split(windows ? ';' : ':').filter(Boolean).map((p) => paths.join(p.replace(/^"|"$/g, ''), name));
  if (platform === 'darwin') candidates.push('/opt/homebrew/bin/docker', '/usr/local/bin/docker', paths.join(env.HOME ?? '', '.docker/bin/docker'), '/Applications/Docker.app/Contents/Resources/bin/docker');
  if (windows) candidates.push(paths.join(env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin', name));
  return candidates.find((path) => exists(path)) ?? name;
}

export const colimaProfile = 'algomotion';
export const colimaContext = 'colima-algomotion';
export function colimaConfigPath(env = process.env) {
  return posix.join(env.COLIMA_HOME || posix.join(env.HOME || homedir(), '.colima'), colimaProfile, 'colima.yaml');
}
export function resolveColimaBinary({ env = process.env, exists = existsSync } = {}) {
  const paths = (env.PATH || '').split(':').filter(Boolean).map((path) => posix.join(path, 'colima'));
  return [...paths, '/opt/homebrew/bin/colima', '/usr/local/bin/colima'].find(exists) || 'colima';
}
export function containerRuntime({ platform = process.platform, env = process.env, exists = existsSync } = {}) {
  const mode = env.ALGOMOTION_CONTAINER_RUNTIME?.trim() || 'auto';
  if (!['auto', 'colima', 'external'].includes(mode)) throw new Error('ALGOMOTION_CONTAINER_RUNTIME 仅支持 auto、colima 或 external。');
  const explicitEndpoint = env.DOCKER_CONTEXT?.trim() || env.DOCKER_HOST?.trim();
  if (mode === 'colima') {
    if (platform !== 'darwin') throw new Error('本项目的 Colima 启动器仅用于 macOS；Windows 请在 WSL2 内使用 Docker Engine。');
    if (explicitEndpoint) throw new Error('colima 模式不能同时设置 DOCKER_HOST/DOCKER_CONTEXT；请选择一种连接方式。');
    return 'colima';
  }
  if (mode === 'external' || explicitEndpoint || env.DOCKER_BIN?.trim()) return 'external';
  return platform === 'darwin' && exists(colimaConfigPath(env)) ? 'colima' : 'external';
}
export function dockerConnection(options = {}) {
  const env = options.env || process.env;
  const runtime = containerRuntime(options);
  const prefix = runtime === 'colima' ? ['--context', colimaContext]
    : env.DOCKER_CONTEXT?.trim() ? ['--context', env.DOCKER_CONTEXT.trim()]
    : env.DOCKER_HOST?.trim() ? ['--host', env.DOCKER_HOST.trim()] : [];
  return { binary: resolveDockerBinary(options), prefix, runtime };
}
