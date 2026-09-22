# 贡献指南

[返回 README](README.md) · [安装指南](docs/INSTALL.md) · [发布前检查](docs/RELEASE_CHECKLIST.md)

使用 Node.js 22.12+ 与 npm，在包含 `package.json` 的应用目录运行 `npm ci`、`npm run dev`。预设开发不需要模型或 Docker；生成执行涉及容器和真实 API 时，请分别配置，不要降级为宿主机执行。

## 工程结构

| 路径 | 职责 |
| --- | --- |
| `src/engine/` | 预设目录、确定性执行器、参考代码、Trace/SceneSpec/题库边界校验 |
| `src/components/` | 播放、场景、生成窗口、模型设置和个人题库 UI |
| `src/App.tsx` | 主工作区与预设交互 |
| `server/generation/` | 模型生成、任务、Docker 执行、独立检查 |
| `server/model-settings.ts` | 具名配置与本地持久化 |
| `server/app.ts` | Express API、安全头、限流和静态服务 |
| `server/match.ts` | 旧预设匹配 API，非开放生成路径，当前 UI 不调用 |
| `sandbox/` | 受信任 Python 入口与 trace SDK 镜像 |
| `scripts/` | 环境初始化、运行时准备和发布扫描 |
| `tests/` | 算法/API、浏览器、真实沙箱及显式真实模型测试 |
| `docs/` | 安装使用、协议、安全与历史验证记录 |

预设：`输入 → Zod → TypeScript 执行器 → Trace v2 → 渲染器`。

生成：`题意 → 模型约定 → 人工确认 → 模型 Python → Docker/SDK → Trace v3 → 检查 → 可选模型 SceneSpec → 受控渲染器`。改输入从容器执行开始，复用 Python 和设计。

小规模教学输入保存完整快照，S 步、每帧大小 M 时约占 O(S×M) 内存。不要把教学引擎的开销等同于参考算法复杂度，也不要绕过输入/轨迹上限。

## 开发约定

1. 新预设在 `src/engine/types.ts` 注册 ID，在 `catalog.ts` 添加原创简述、输入提示和样例，在 `references.ts` 提供三语言参考实现。不复制平台完整题面。
2. 在 `run.ts` 加严格输入 schema 与插桩执行器，复用 recorder，不修改调用者输入、不执行外部代码。
3. 使用语义 `location` 与三语言 `@trace` 标记同步高亮，不跨语言复用数字行号；重复值也必须有稳定元素/节点 ID。
4. 为样例、空/单元素、重复、负数、无解等适用边界添加测试，并用独立参考对拍，不只验证实现自己构造的例子。
5. 优先复用现有渲染器，保留因果动画、回退/跳转正确性、键盘操作和减少动态效果。当前验收目标是桌面，已有响应式样式保留，不把手机验收作为新增功能前提。
6. 生成协议扩展必须版本化并保留旧结果兼容。模型只能提供 Python 和数据描述，不提供可直接执行的 HTML/JS，不把模型帧数组冒充运行时轨迹。
7. 更新受影响的 UI 文案、文档和协议测试。功能未实现、未验证或不适用时明确标记，不靠放宽校验掩盖失败。

## 测试命令

以下是运行方式，不是本次测试报告。历史执行证据见 [VALIDATION.md](docs/VALIDATION.md)；请报告自己实际运行的日期、环境和结果。

### 无付费模型的常规检查

```sh
npm run check
npm run build
npx playwright install chromium
npm run test:e2e -- --grep-invert 'mobile|390px'
npm run release:check
```

`check` 执行 TypeScript 和 Vitest 单元/API 测试；模型/沙箱相关单元及浏览器场景使用明确的 mock，不证明真实供应商或容器行为。Playwright 下载浏览器需要网络；Linux 缺系统库时按 Playwright 官方说明由有权限的人员安装，不自动放宽系统策略。PowerShell 支持上述单引号；CMD 中请将筛选表达式改用双引号。

`test:e2e` 不加筛选会包含已有窄屏用例；当前桌面验收使用上方命令。`release:check` 是本地有界扫描，不扫描 Git 历史或证明授权，详见[发布前检查](docs/RELEASE_CHECKLIST.md)。

### 真实容器检查，不调用模型

引擎已运行时：

```sh
npm run sandbox:build
npm run test:sandbox
```

测试使用仓库内固定程序和独立参考实现，在真实容器中检查结果、路径、边界、禁网、权限、资源/输出/轨迹上限、超时与清理。它不是模型生成成功的证据；缺环境的 `NOT RUN` 必须如实记录。

### 真实模型与容器联调，可能收费

先完成沙箱配置，使用持久化 UI 配置或 `.env` 设置模型。命令读取不到另一个 API 进程的临时密钥。请先阅读 `tests/generation-live.ts`，确认请求内容与费用，再显式启用。

macOS / Linux / WSL2：

```sh
ALGOMOTION_LIVE_ACCEPT=1 npm run test:live
```

Windows PowerShell，可在单独终端使用，结束后移除当前终端的授权变量：

```powershell
$env:ALGOMOTION_LIVE_ACCEPT = '1'
npm.cmd run test:live
Remove-Item Env:ALGOMOTION_LIVE_ACCEPT
```

该测试使用两道非预设网格题走真实模型/容器路径，检查独立结果，不以 mock 回退。任何请求可能失败或收费，没有“配了 Key 就一定通过”的保证。`test:live:ui` 是分阶段人工联调工具，不是无需参数的一键浏览器验收；使用前阅读 `tests/live-ui.ts` 的动作与确认要求。

### 可选三语言参考验证

```sh
npm run test:references
```

需要 JDK 8+（建议使用仍受支持的 JDK 17+ 发行版）、Go 1.21+、Python 3.10+；Java 参考代码保持 JDK 8 兼容，字符串解码使用追加循环，不依赖 Java 11 的 `String.repeat`。也可用 `npm run test:references -- java`、`-- go` 或 `-- python` 单独检查。可通过 `JAVA_BIN`、`JAVAC_BIN`、`GO_BIN`、`PYTHON_BIN` 指定运行时。只编译/执行仓库中受信任参考代码，临时目录不是不可信代码安全沙箱。普通应用无需这些宿主运行时。

### CI 与报告

已有 GitHub Actions 配置覆盖 macOS/Windows/Ubuntu 的常规检查、Ubuntu 浏览器与参考代码/沙箱任务，不注入付费模型密钥。工作流按应用作为仓库根目录编写；若保留外层 `outputs/algomotion/` 结构，需要对应调整工作目录和锁文件路径。配置存在不代表远端任务已执行，发布后以实际 Actions 结果为准。

报告须区分 mock、真实容器、真实模型和未运行；样例/独立验证/教学轨迹/展示绑定不能合并成一个“正确”。新模型、运行时或操作系统需要重新实测，不能沿用旧记录作证。

## 提交前与问题反馈

发送源码或资料到任何外部仓库（包括私有仓库）之前，完成来源、许可和适用组织授权核对。扫描通过与 MIT 文件都不代表有权发布。

提交说明包括行为变化、实际测试和剩余限制，不含 API Key、`.env`、`.algomotion/`、构建产物或 `node_modules`。请检查 Git 暂存区及历史，不能依赖 `.gitignore` 清除已跟踪秘密。

反馈问题请附题目 ID 或经审查的最小题意、JSON 输入、预期与实际输出、错误码、OS/浏览器/Node 版本及复现步骤。可提供已脱敏的模型供应商与模型名，不提供密钥、原始供应商响应、内部地址或未审查的轨迹/截图。常见问题先看[故障排查](docs/TROUBLESHOOTING.md)。
