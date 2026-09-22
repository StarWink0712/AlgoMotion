import { spawn } from 'node:child_process';
import { constants, existsSync } from 'node:fs';
import { copyFile, chmod, readFile } from 'node:fs/promises';
import { join, posix, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colimaConfigPath, colimaProfile, dockerConnection, resolveColimaBinary } from '../../server/generation/docker-binary.mjs';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export function validNode(version) {
  const [major, minor] = version.replace(/^v/, '').split('.').map(Number);
  return major > 22 || major === 22 && minor >= 12;
}
export function parseOptions(args) {
  const allowed = ['--install-docker', '--presets', '--check', '--dry-run', '--build-only', '--runtime-only', '--help'];
  if (args.some((arg) => !allowed.includes(arg))) throw new Error(`未知参数。支持：${allowed.join(', ')}`);
  const options = Object.fromEntries(allowed.map((flag) => [flag.slice(2), args.includes(flag)]));
  if (options['install-docker'] && (options.check || options.presets || options['build-only'] || options['runtime-only'])) throw new Error('--install-docker 仅用于完整 setup，不能与只读检查、预设或仅构建/启动模式组合。');
  if (options['build-only'] && (options.check || options.presets)) throw new Error('--build-only 不能与 --check/--presets 组合。');
  if (options['runtime-only'] && (options.check || options.presets || options['build-only'])) throw new Error('--runtime-only 不能与 --check/--presets/--build-only 组合。');
  return options;
}
export function installPlan(platform, env = process.env, exists = existsSync) {
  if (platform === 'darwin') {
    const command = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew'].find(exists) ?? 'brew';
    return { command, args: ['install', 'colima', 'docker'], prerequisite: 'Homebrew', check: ['--version'] };
  }
  if (platform === 'win32') throw new Error('Windows 无 Desktop 推荐使用 WSL2：首次在管理员终端执行 wsl --install -d Ubuntu，按提示授权/重启；进入 Ubuntu 后按 Docker 官方说明安装 Docker Engine 和 Node.js，再在 WSL 内运行 npm run setup。原生 Windows 可复用已配置的 Linux 引擎。不会自动安装 Docker Desktop、修改 WSL 或系统安全设置。');
  throw new Error('Linux 请先按 https://docs.docker.com/engine/install/ 配置可供当前用户访问的 Docker Engine。脚本不会自动添加软件源、修改 Docker 用户组或 socket 权限；已有 Engine 后直接运行 npm run setup。');
}
export function colimaStartArgs(existing) {
  return ['start', colimaProfile, '--activate=false', '--runtime', 'docker', '--mount', 'none', '--ssh-agent=false',
    ...(existing ? [] : ['--cpus', '2', '--memory', '2', '--disk', '10'])];
}

// Parse only simple scalar settings used by this CLI; never print values or headers.
export function readSettings(text, env = process.env) {
  const settings = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?(LLM_BASE_URL|LLM_API_KEY|LLM_MODEL|ALGOMOTION_SANDBOX_IMAGE|ALGOMOTION_CONTAINER_RUNTIME|DOCKER_BIN|DOCKER_CONTEXT|DOCKER_HOST|DOCKER_TLS_VERIFY|DOCKER_CERT_PATH|COLIMA_HOME)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (/^["']/.test(value)) {
      const end = value.indexOf(value[0], 1); value = end < 0 ? '' : value.slice(1, end);
    } else value = value.split('#')[0].trim();
    settings[match[1]] = value;
  }
  for (const name of ['LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL', 'ALGOMOTION_SANDBOX_IMAGE', 'ALGOMOTION_CONTAINER_RUNTIME', 'DOCKER_BIN', 'DOCKER_CONTEXT', 'DOCKER_HOST', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH', 'COLIMA_HOME']) if (env[name] !== undefined) settings[name] = env[name];
  return settings;
}
export async function ensureEnv(root = projectRoot) {
  try {
    await copyFile(join(root, '.env.example'), join(root, '.env'), constants.COPYFILE_EXCL);
    // Restrict a newly-created project config only; never touch an existing file.
    if (process.platform !== 'win32') await chmod(join(root, '.env'), 0o600);
    return true;
  } catch (error) { if (error.code === 'EEXIST') return false; throw error; }
}
export function runCommand(command, args, { inherit = false, timeout = 15_000, cwd = projectRoot, env = process.env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, shell: false, stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'], windowsHide: !inherit });
    let output = '', bytes = 0, failure = false;
    const timer = setTimeout(() => { failure = true; child.kill(); }, timeout);
    child.stdout?.on('data', (chunk) => { bytes += chunk.length; if (bytes > 65_536) { failure = true; child.kill(); } else output += chunk.toString('utf8'); });
    child.stderr?.on('data', (chunk) => { bytes += chunk.length; if (bytes > 65_536) { failure = true; child.kill(); } });
    child.on('error', () => { clearTimeout(timer); resolve({ code: 127, output: '' }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code: failure ? 124 : code ?? 1, output }); });
  });
}
export function defaultHost() {
  return {
    platform: process.platform, env: process.env, version: process.versions.node, root: projectRoot,
    node: process.execPath, exists: existsSync, run: runCommand,
    readConfig: async () => { try { return await readFile(join(projectRoot, '.env'), 'utf8'); } catch (e) { if (e.code === 'ENOENT') return ''; throw e; } },
    ensureEnv: () => ensureEnv(), log: (message) => console.log(message),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)), now: () => Date.now(),
  };
}
export async function warmRuntime(host = defaultHost()) {
  try { await setup(parseOptions(['--runtime-only']), host); return true; }
  catch (error) { host.log(`生成模式暂不可用：${error.message}\n继续启动应用，预设题不受影响。可用 npm run runtime:start 单独检查/启动。`); return false; }
}
export async function setup(options, host = defaultHost()) {
  if (!validNode(host.version)) throw new Error('需要 Node.js 22.12+（含 npm），请先升级 Node 后重新运行。');
  // Tests can simulate another OS, so derive paths from the injected platform
  // instead of the platform running the current Node process.
  const platformPath = host.platform === 'win32' ? win32 : posix;
  if (options.help) {
    host.log('npm run setup [-- --install-docker | --presets | --dry-run]\nnpm run doctor [-- --presets]\nnpm run runtime:start\nmacOS 默认使用 Colima + Docker CLI，无桌面窗口；Windows 推荐 WSL2 + Docker Engine，Linux 复用 Engine。不会安装/启动 Docker Desktop、接受许可条款、修改 WSL/安全策略或配置个人 API Key。'); return 0;
  }
  if (options['dry-run']) {
    host.log('DRY RUN：不执行命令、不写文件、不启动或安装软件。');
    if (options.check) host.log('将检查 Node、项目依赖、Docker Linux 引擎/镜像和模型配置是否存在（不调用模型）。');
    else {
      if (options['install-docker']) {
        if (host.platform === 'darwin') {
          const plan = installPlan(host.platform, host.env, host.exists);
          host.log(`仅在 CLI/Colima 缺失且未指定外部引擎时：${plan.command} ${plan.args.join(' ')}`);
        } else { try { installPlan(host.platform); } catch (error) { host.log(error.message); } }
      }
      if (!options['build-only'] && !options['runtime-only']) host.log('npm ci；仅当 .env 不存在时从 .env.example 创建（保留已有配置）。');
      if (!options.presets) {
        host.log(`${options['build-only'] ? '只检查已启动的引擎' : '复用可用引擎，或后台启动专用 Colima algomotion 环境（--activate=false，不切换全局 context）'}；不安装/打开 Docker Desktop。`);
        if (!options['runtime-only']) host.log('构建并校验隔离镜像；不会执行模型生成代码。');
      }
    }
    return 0;
  }
  const settings = readSettings(await host.readConfig(), host.env);
  const missing = ['LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL'].filter((key) => !settings[key]?.trim());
  const image = settings.ALGOMOTION_SANDBOX_IMAGE || 'algomotion-python:1';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,200}$/.test(image)) throw new Error('ALGOMOTION_SANDBOX_IMAGE 不是合法的构建标签；不得使用 shell 参数或 digest。');
  const env = { ...host.env, ...settings };
  const runtimeOptions = () => ({ platform: host.platform, env, exists: host.exists });
  let connection = options.presets ? undefined : dockerConnection(runtimeOptions());
  const docker = (args, options = {}) => host.run(connection.binary, [...connection.prefix, ...args], { ...options, env });
  const probe = () => docker(['info', '--format', '{{.OSType}}'], { timeout: 8000 });
  const inspect = async () => {
    const result = await docker(['image', 'inspect', image, '--format', '{{json .Config.Labels}}']);
    try { return result.code === 0 && JSON.parse(result.output)?.['org.algomotion.runner'] === '1'; } catch { return false; }
  };
  if (options.check) {
    const dependencies = host.exists(platformPath.join(host.root, 'node_modules', 'tsx', 'dist', 'cli.mjs'));
    host.log(`Node ${host.version}；项目依赖：${dependencies ? '已找到' : '缺失，请运行 npm run setup'}`);
    if (options.presets) return dependencies ? 0 : 2;
    const engine = await probe(), linux = engine.code === 0 && engine.output.trim() === 'linux';
    const imageReady = linux && await inspect();
    host.log(`容器连接：${connection.runtime === 'colima' ? 'Colima 专用环境' : '已有/外部引擎'}；Docker Linux 引擎：${linux ? '就绪' : '未就绪'}；隔离镜像：${imageReady ? '就绪' : '未就绪'}`);
    host.log(missing.length ? `环境变量模型配置缺少：${missing.join(', ')}` : '环境变量模型配置已填写（未请求 API，未验证密钥有效性）。');
    host.log('doctor 不读取界面配置文件或运行中服务的内存设置；若在网页配置，请以“模型设置”的状态为准。');
    host.log('doctor 只检查环境，不代表真实模型/隔离安全验收通过。');
    return dependencies && linux && imageReady && !missing.length ? 0 : 2;
  }
  if (!options.presets) {
    let client = await host.run(connection.binary, ['--version'], { env });
    if (env.DOCKER_BIN?.trim() && client.code !== 0) throw new Error('配置的 DOCKER_BIN 不可用；不会安装其他软件覆盖此配置。');
    let engine = client.code === 0 ? await probe() : { code: 1, output: '' };
    if (engine.code === 0 && engine.output.trim() !== 'linux') throw new Error('当前为 Windows containers，需要 Linux 容器引擎；推荐在 WSL2 内运行。脚本不会自动更改引擎设置。');
    if (engine.code !== 0) {
      if (options['build-only']) throw new Error('Docker 引擎未运行，请先运行 npm run setup。');
      const external = env.ALGOMOTION_CONTAINER_RUNTIME?.trim() === 'external' || env.DOCKER_HOST?.trim() || env.DOCKER_CONTEXT?.trim() || env.DOCKER_BIN?.trim() && connection.runtime !== 'colima';
      if (external) throw new Error('配置的外部 Docker 引擎不可用，请检查 DOCKER_BIN/DOCKER_HOST/DOCKER_CONTEXT 并启动对应引擎。不会改用其他引擎、安装软件或打开 Desktop。');
      if (host.platform !== 'darwin') installPlan(host.platform);
      const existingProfile = host.exists(colimaConfigPath(env));
      if (options['runtime-only'] && !existingProfile) throw new Error('尚未配置专用 Colima 环境。请先运行 npm run setup -- --install-docker；日常启动不会自动安装软件或新建 profile。');
      env.ALGOMOTION_CONTAINER_RUNTIME = 'colima';
      connection = dockerConnection(runtimeOptions());
      const colima = () => resolveColimaBinary({ env, exists: host.exists });
      const preparePath = () => {
        // Colima invokes Docker/Lima by name internally, including immediately after brew install.
        const directories = [colima(), connection.binary].filter(platformPath.isAbsolute).map(platformPath.dirname);
        env.PATH = [...new Set([...directories, ...(env.PATH || '').split(platformPath.delimiter).filter(Boolean)])].join(platformPath.delimiter);
      };
      preparePath();
      let colimaReady = (await host.run(colima(), ['version'], { env })).code === 0;
      if (client.code !== 0 || !colimaReady) {
        if (!options['install-docker']) throw new Error('缺少 Docker CLI 或 Colima。运行 npm run setup -- --install-docker 允许命令安装，或 npm run setup -- --presets 只准备预设模式。');
        const plan = installPlan(host.platform, env, host.exists);
        if ((await host.run(plan.command, plan.check)).code !== 0) throw new Error(`缺少 ${plan.prerequisite}。请先按 https://brew.sh/ 安装；不会执行远程安装脚本。`);
        host.log(`将运行 ${plan.command} ${plan.args.join(' ')}；不安装 Docker Desktop，请处理包管理器必要的授权提示。`);
        if ((await host.run(plan.command, plan.args, { inherit: true, timeout: 1_200_000 })).code !== 0) throw new Error('Colima/Docker CLI 安装未完成，请检查包管理器提示后重试；不自动重试或回滚系统安装。');
        connection = dockerConnection(runtimeOptions());
        preparePath();
        client = await host.run(connection.binary, ['--version'], { env });
        colimaReady = (await host.run(colima(), ['version'], { env })).code === 0;
        if (client.code !== 0 || !colimaReady) throw new Error('安装后仍未找到 Docker CLI/Colima，请检查安装及 PATH 后重试。');
      }
      host.log('后台启动 Colima 专用环境 algomotion（不切换全局 context、不挂载用户目录、不转发 SSH agent）。首次下载虚拟机镜像可能较慢。');
      if ((await host.run(colima(), colimaStartArgs(existingProfile), { inherit: true, timeout: 600_000, env })).code !== 0) throw new Error('Colima 启动失败或超时，请检查虚拟化、下载网络及 colima status algomotion。后台 VM 状态可能需要检查；不会停止未知任务或降级为宿主机执行。');
      const deadline = host.now() + 180_000;
      while (host.now() < deadline) {
        engine = await probe();
        if (engine.code === 0) break;
        await host.sleep(3000);
      }
    }
    if (engine.code !== 0 || engine.output.trim() !== 'linux') throw new Error('Docker Linux 引擎尚未就绪，请检查 Colima/已有引擎后重试。不会声称配置成功，也不会降级为宿主机 Python。');
    host.log(`容器引擎就绪：${connection.runtime === 'colima' ? 'Colima 专用后台环境' : '复用已有引擎'}。`);
  }
  if (options['runtime-only']) return 0;
  if (!options['build-only']) {
    const npm = host.env.npm_execpath;
    if (!npm || !host.exists(npm)) throw new Error('请通过 npm run setup 调用，以使用随 Node 安装的 npm（不需要先安装项目依赖）。');
    host.log('安装锁文件中的项目依赖：npm ci');
    if ((await host.run(host.node, [npm, 'ci'], { inherit: true, timeout: 600_000 })).code !== 0) throw new Error('npm ci 失败，请按终端提示修复网络/依赖后重试。');
    host.log(await host.ensureEnv() ? '已创建 .env；尚未填写个人模型密钥。' : '保留已有 .env，没有覆盖密钥或其他设置。');
  }
  if (!options.presets) {
    host.log(`构建隔离镜像 ${image}（需要下载基础镜像，不调用模型 API）。`);
    if ((await docker(['build', '-t', image, platformPath.join(host.root, 'sandbox')], { inherit: true, timeout: 600_000 })).code !== 0 || !await inspect()) throw new Error('隔离镜像构建或标签检查失败，生成模式尚未就绪。');
  }
  if (!options['build-only']) {
    if (!options.presets && missing.length) host.log(`环境安装完成；生成前可打开网页“模型设置”，或在 .env 填写：${missing.join(', ')}。密钥不能由开源项目代为提供。`);
    host.log('下一步：npm run dev。环境诊断：npm run doctor；真实隔离验收：npm run test:sandbox（需 Docker）。');
  }
  return 0;
}
