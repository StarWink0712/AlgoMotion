# 安装指南

[返回 README](../README.md) · [使用手册](USAGE.md) · [故障排查](TROUBLESHOOTING.md)

本文所有 `npm` 命令都在包含 `package.json` 的应用目录执行。完整工作目录中的路径为 `outputs/algomotion/`；应用单独分发后，以解压内容为准，不需要再人为创建一层 `outputs/algomotion/`。

## 1. 选择使用模式

| 依赖 | 只用预设题 | 生成新题 |
| --- | --- | --- |
| Node.js 22.12+ 与 npm | 必需 | 必需 |
| 桌面浏览器 | 必需 | 必需 |
| 模型 API 配置 | 不需要 | 新生成/修复/重新设计时需要 |
| Docker 兼容 Linux 引擎和沙箱镜像 | 不需要 | 执行 Python 时需要 |
| 宿主机 Python、Java、Go | 不需要 | 不需要，生成 Python 在镜像内运行 |

推荐使用受支持的 Node.js LTS 版本。下载依赖、容器虚拟机及基础镜像需要网络；**生成程序的执行容器禁网**，这不妨碍宿主服务调用模型 API。

当前支持目标是本地桌面浏览器。macOS 全新 Colima 安装/冷启动、Windows 原生/WSL2 和 Linux 首次软件安装尚未完成真实平台验收；命令规划的 mock 测试不等于安装成功。已有引擎上的真实沙箱记录见 [VALIDATION.md](VALIDATION.md)。

## 2. 安装 Node.js

通过 [Node.js 官方下载页](https://nodejs.org/en/download)选择对应系统的受支持 LTS 版本。npm 包含在 Node 安装中，无需单独全局安装。

安装完成后重新打开终端，逐条检查：

```sh
node -v
npm -v
```

Node 版本必须至少为 `v22.12.0`。若仍然找不到命令，先修复 PATH，见[故障排查](TROUBLESHOOTING.md)，不要继续运行项目初始化。安装工具询问 `y/n` 时只输入答案，等待安装结束后再执行下一条命令，不要把后续命令粘贴到确认提示中。

Windows 预设模式可以在 PowerShell 或 CMD 运行。若使用 WSL2 生成模式，需要在 Ubuntu 内另外安装 **Linux 版本**的 Node 和 npm，不复用 Windows 的 `node_modules`。

## 3. 先启动预设题

进入应用目录后：

```sh
npm ci
npm run dev
```

打开 [http://127.0.0.1:5173](http://127.0.0.1:5173)。点击侧栏题目，修改 JSON 输入，检查输出和回放。无需 `.env`、API Key 或 Docker。

也可以用以下命令替代首次 `npm ci`，安装依赖并仅在缺失时创建 `.env`；它不检查或安装容器：

```sh
npm run setup -- --presets
```

`npm run dev` 的启动钩子会检查可选容器环境，失败只提示生成模式不可用，仍继续启动网页。不要把这个警告当成预设模式安装失败。

## 4. 准备生成执行环境

Docker 的作用是隔离模型生成的、不可信的 Python，不是运行网页 UI。应用需要可用的 Linux 容器引擎，**不要求 Docker Desktop**。macOS/Windows 的 Linux 引擎通常运行在虚拟机或 WSL2 中。

### macOS：Colima + Docker CLI

先安装 Node.js 和 [Homebrew](https://brew.sh/)。Homebrew 初次安装及系统授权需自行按官方指引完成，项目不会静默执行远程系统安装脚本。

可先预览操作，再实际安装：

```sh
npm run setup -- --install-docker --dry-run
npm run setup -- --install-docker
```

无需预先安装 npm 依赖，setup 本身只使用 Node 内置模块。实际命令按需进行以下操作：

1. 复用可用引擎；缺少必要工具且没有显式指定外部引擎时，运行 `brew install colima docker`。
2. 需要新环境时创建并启动专用 `algomotion` Colima profile，不打开桌面 GUI。
3. 安装锁文件依赖，仅在 `.env` 缺失时从 `.env.example` 创建，不覆盖现有配置。
4. 在所选引擎内构建并检查 `algomotion-python:1` 沙箱镜像。

专用 profile 首次分配 2 CPU、2 GiB 内存、10 GiB 数据磁盘，虚拟机基础镜像另占空间。启动使用 `--activate=false --runtime docker --mount none --ssh-agent=false`，不切换全局 Docker context、不共享用户目录、不转发 SSH agent。首次下载及初始化可能较慢。

已安装 Colima/CLI 或已有可用 Engine 时可以运行 `npm run setup`，不授权安装系统软件。已有 Docker Desktop 也可复用；脚本不会卸载、迁移或自动启动它。

### Windows：推荐 WSL2 + Docker Engine

这是无 Docker Desktop 的推荐路径，但当前**不是原生 Windows 一键安装**。

1. 若尚无 WSL2，在管理员 PowerShell 中按需运行下方命令，按提示授权、重启并完成 Ubuntu 初始化。已配置 WSL2 的用户跳过此步。
2. 打开 **Ubuntu 终端**，安装 Linux 版本 Node.js 22.12+，按 [Docker Engine 的 Ubuntu 官方指南](https://docs.docker.com/engine/install/ubuntu/)配置 Engine。
3. 确认当前 WSL 用户可以访问正在运行的 Linux daemon。引擎启动方式、用户权限和 systemd 配置按官方指引处理，不要通过放宽 socket 权限解决问题。
4. 将经过审查的源码放在 WSL 文件系统中，例如 `~/projects/algomotion`，在包含 `package.json` 的目录运行 setup 和 dev。

管理员 PowerShell，仅首次需要时：

```powershell
wsl --install -d Ubuntu
```

Ubuntu 终端：

```sh
node -v
npm -v
docker info --format '{{.OSType}}'
npm run setup
npm run dev
```

`docker info` 应返回 `linux`。Windows 浏览器通常可通过 WSL 的 localhost 转发访问 `http://127.0.0.1:5173`；若环境策略限制转发，先检查 WSL 网络配置，不要直接把服务改为公网监听。

原生 Windows 也可以复用已配置的 Linux 引擎，但项目不会自动更改 Windows containers 模式、WSL 配置或系统执行策略。PowerShell 的 `npm.ps1` 被阻止时，可改用 CMD 或 `npm.cmd`。

### Linux：已有 Docker Engine

按对应发行版的 [Docker Engine 安装指南](https://docs.docker.com/engine/install/)配置 daemon 和访问权限，确认当前用户可运行：

```sh
docker info --format '{{.OSType}}'
npm run setup
```

项目不会自动添加 Linux 软件源、修改用户组、socket 权限或 systemd 服务。Docker daemon 访问权限本身是高权限能力，应按系统管理员的要求配置。

### 选择或切换引擎

`.env` 中可配置：

| 设置 | 行为 |
| --- | --- |
| `ALGOMOTION_CONTAINER_RUNTIME=auto` | 默认。macOS 优先使用已存在的专用 Colima profile，否则使用当前 Docker 连接。 |
| `ALGOMOTION_CONTAINER_RUNTIME=colima` | 显式选择 macOS 专用 profile；setup 可准备环境，日常启动只使用已配置环境。 |
| `ALGOMOTION_CONTAINER_RUNTIME=external` | 仅用已有引擎，不自动启动 Colima。 |
| `DOCKER_BIN` | 指定 Docker CLI 绝对路径。 |
| `DOCKER_CONTEXT` / `DOCKER_HOST` | 显式指定已有连接，优先于 auto；连接失效时不会静默换引擎。 |
| `ALGOMOTION_SANDBOX_IMAGE` | 沙箱镜像名，默认为 `algomotion-python:1`。 |

不要将 `colima` 模式与 `DOCKER_HOST`/`DOCKER_CONTEXT` 混用。不要在任务执行中切换全局 context。改变连接配置后，重启 API，并在新引擎中重新构建镜像；旧引擎的镜像不会自动迁移。

## 5. 配置自己的模型 API

启动 `npm run dev`，打开网页右上角“模型设置”：

1. 点击“新增配置”，为这套设置命名。
2. 选择供应商，填写 Base URL、账户实际可用的模型 ID 和 API Key。
3. 如需“测试连接”，先明确同意费用；该操作会发送一次小型模型请求。
4. 点击“保存并使用”。之后从配置列表切换，不必重填密钥；保存和切换本身不调用模型。

| 供应商预设 | Base URL | 默认兼容方式 |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com` | JSON Object、`max_tokens`、关闭思考 |
| Kimi / Moonshot | `https://api.moonshot.cn/v1` | JSON Object、`max_tokens` |
| OpenAI | `https://api.openai.com/v1` | JSON Schema、`max_completion_tokens` |
| 自定义 | 自行填写可信地址 | 默认 JSON Object、`max_tokens`，可调整 |

这里只支持 **Chat Completions 兼容协议**，不代表兼容所有厂商原生 API 或所有模型。高级参数可调整 JSON 模式、Token 参数、输出预算和思考选项。Base URL 必须 HTTPS，本机回环服务可 HTTP；代理需选择“自定义”，不会跟随重定向。模型 ID 与参数支持以供应商账户为准，不附赠共享密钥。

界面保存到 `.algomotion/model-settings.json`，包含明文密钥，macOS/Linux 默认文件权限为 0600、目录为 0700，Windows 依赖目录 ACL。不要上传或放进源码压缩包。持久配置重启后恢复；临时使用仅在当前服务有效。详见[使用手册](USAGE.md)。

也可参考 [.env.example](../.env.example) 在应用目录创建 `.env`，设置 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`、`LLM_RESPONSE_FORMAT`。密钥不要写在命令行、截图或公开文档中，也不要使用 `VITE_` 前缀。界面配置优先；要使用 `.env`，在列表选择“使用环境变量”，修改 `.env` 后重启服务。

## 6. 检查环境与首次生成

```sh
npm run doctor
npm run test:sandbox
```

`doctor` 只检查依赖、引擎、镜像和 `.env`/进程环境中的模型字段，**不读取界面保存的配置**，不调用模型。若只配置了 UI，它可能仍报告模型字段缺失并返回非零退出码；请以网页“模型设置”的状态为准。

`test:sandbox` 实际运行测试程序，检查隔离与执行边界，不调用模型。输出 `NOT RUN` 表示前提不满足，**不是通过**。环境已就绪也不代表生成解法正确。

在网页点击“生成新题演示”，输入不含敏感信息的题目，审核模型约定后确认生成。观察解析、生成、执行和检查阶段，再查看 Python、结果及轨迹。真实模型会收费；自动化真实联调的显式启用方式见[贡献指南](../CONTRIBUTING.md)。

## 7. 日常启动、停止与更新

开发运行：

```sh
npm run dev
```

构建后运行：

```sh
npm run build
npm start
```

开发网页端口为 5173，API 为 3001；构建后网页和 API 都在 [http://127.0.0.1:3001](http://127.0.0.1:3001)。`npm start` 不自动构建，需要保留应用源码、运行依赖和沙箱目录。保持默认回环监听，不直接公网部署。

`dev` / `start` 会检查引擎，必要时后台启动已配置的专用 Colima profile；不会安装软件、新建 profile、覆盖配置或重建镜像。未完成过初始化的已有 profile 仍可能需要下载 VM。引擎不可用只警告，不阻止预设模式。

先在界面取消未完成任务，再对自己启动的终端按 `Ctrl+C`。专用 Colima 会继续驻留后台；确认无任务使用它后，可显式停止：

```sh
colima stop algomotion
```

不要停止其他 profile 或未知进程。需要单独启动已配置环境时运行 `npm run runtime:start`，该命令失败会返回非零退出码。

更新源码后运行 `npm ci`；更新沙箱代码后，在引擎已启动时运行 `npm run sandbox:build`。构建模式还需重新 `npm run build`，然后重启服务。执行 API 不会自动拉镜像或回退到宿主机 Python。

## 8. 换电脑与源码分发

先核对[发布前检查](RELEASE_CHECKLIST.md)中的来源和授权。仅转移审查后的源码、锁文件和文档，不带 `.env`、`.algomotion/`、`node_modules/`、`dist/`、运行记录或旧压缩包。

目标电脑重新安装依赖和引擎、构建镜像，并通过界面填写自己的模型配置。题库是浏览器数据，不包含在源码里；需要迁移时，逐条导出经过审查的题库条目，在目标浏览器用“导入题库条目”导入。条目可能包含题面、输入、Python 和轨迹，导出后也要按数据敏感程度保管。

固定使用同一个网页地址：开发的 5173 与构建的 3001、`localhost` 与 `127.0.0.1`、不同浏览器均不共享个人题库。没有自动云同步或跨来源迁移。
