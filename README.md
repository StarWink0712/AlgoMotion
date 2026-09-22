# AlgoMotion

> 让思路，动起来。

做这个项目的想法很简单：很多算法只看代码不容易建立直觉，如果把每一步状态变化摊开来看，就会清楚很多。

AlgoMotion 是一个运行在浏览器里的算法可视化工具。选一道题，换一组输入，就能沿着时间轴观察指针移动、元素交换、节点重连、队列变化和 DP 状态转移。

项目内置了 LeetCode Hot 100 的 100 道演示，也支持接入大模型，把题库之外的算法题生成成可执行动画。

## 它能做什么

- 播放、暂停、单步前进或后退，并自由调整动画速度。
- 动画、代码高亮和当前状态保持同步。
- 支持数组、链表、树、网格、栈、队列、堆、回溯和动态规划等常见场景。
- 可修改 JSON 输入并立即重新运行。
- 可查看 Java、Go、Python 参考实现。
- 可导出运行轨迹，或把生成的演示保存到“我的题库”。

如果只想学习内置题目，不需要配置模型，也不需要安装 Docker。

## 快速开始

需要 [Node.js](https://nodejs.org/en/download) 22.12 或更高版本。

```sh
git clone https://github.com/StarWink0712/AlgoMotion.git
cd AlgoMotion
npm ci
npm run dev
```

浏览器打开 [http://127.0.0.1:5173](http://127.0.0.1:5173)，从左侧题库选择一道题即可开始。

## 生成新题演示

除了内置题目，AlgoMotion 还可以根据你输入的题目生成新的 Python 解法和可视化演示。目前支持 DeepSeek、Kimi / Moonshot、OpenAI，以及兼容 Chat Completions 的自定义接口。

macOS 用户可以运行：

```sh
npm run setup -- --install-docker
npm run dev
```

启动后，在右上角打开“模型设置”，填写供应商、模型和 API Key，然后点击“生成新题演示”。生成完成后可以继续修改输入、重放动画，或保存到个人题库。

Windows 推荐使用 WSL2 + Docker Engine，Linux 使用 Docker Engine。安装和配置细节见[安装指南](docs/INSTALL.md)。

## 内置题目

目前已经收录 100 道常见算法题，覆盖：

- 数组、哈希表、双指针与滑动窗口
- 链表、栈、队列与堆
- 二叉树、图与矩阵
- 二分查找、贪心与回溯
- 动态规划与常见数据结构设计

每道题都带有可修改的输入、逐步动画、过程说明和多语言参考代码。完整列表见 [Hot 100 题目清单](docs/HOT100.md)。

## 文档

- [安装指南](docs/INSTALL.md)：环境准备、Docker 和模型配置
- [使用手册](docs/USAGE.md)：预设题、生成新题和个人题库
- [故障排查](docs/TROUBLESHOOTING.md)：启动、端口、Docker 和接口问题
- [贡献指南](CONTRIBUTING.md)：项目结构、开发约定和测试方式

## 开发

技术栈：React、TypeScript、Vite、Express、Zod、Python 和 Docker。

```sh
npm run check
npm run build
npm start
```

`npm run check` 会执行类型检查和测试；`npm run build` 生成生产版本；`npm start` 启动本地服务，默认地址为 [http://127.0.0.1:3001](http://127.0.0.1:3001)。

## 使用前说明

- 模型配置保存在本机 `.algomotion/model-settings.json`，请不要把这个目录提交或分享出去。
- 使用 AI 生成功能时，题目和生成所需的数据会发送给你选择的模型服务。
- “我的题库”保存在浏览器本地，清理浏览器数据前记得先导出备份。
- 生成的 Python 代码在本地受限容器中运行，服务默认只监听 `127.0.0.1`。

## 参与贡献

如果你在使用过程中发现问题，或者对动画效果、交互体验、性能和题目实现有优化建议，欢迎提交 [Issue](https://github.com/StarWink0712/AlgoMotion/issues)。

也欢迎直接提交 Pull Request，例如：

- 修复 Bug 或改进现有算法演示
- 优化动画、界面和操作体验
- 补充新的题目、测试或参考实现
- 改进文档、安装流程和跨平台支持

准备提交代码前，请先阅读[贡献指南](CONTRIBUTING.md)，并运行 `npm run check` 确认类型检查和测试通过。

## 许可证

项目使用 [MIT License](LICENSE)。字体等第三方资源的许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

项目提供题目简述、实现思路和原题链接，与 LeetCode / 力扣没有官方关联。
