# RFC 001 — Nuwa — role-play 审查 CLI

| 字段 | 值 |
| --- | --- |
| 状态 | Approved |
| 创建日期 | 2026-06-11 |
| 作者 | Maintainers |
| Supersedes | — |
| Superseded-By | — |

## Product identity

| 名称 | 含义 |
| --- | --- |
| **Nuwa** | 产品名；CLI 命令为 `nuwa` |
| **nuwa-reviewer** | 本 monorepo 仓库名 |
| **`@nuwajs/*`** | npm 发布 scope（`persona` / `core` / `cli`） |

Nuwa 是 **role-play 驱动的审查 CLI**——**审查对象不限于代码**（文档、设计、计划、变更集等均可）。不是单一「通用审稿 prompt」，而是让 **Linus、Kent Beck、Martin Fowler** 等 persona **扮演**审稿人，各自按角色哲学审查同一份输入，汇总为结构化反馈。

**v1 默认输入**：git diff（`nuwa review --staged` 等）。产品是 **review anything**，diff 只是当前最顺手的载体。Persona 定义以 markdown 存放在 `@nuwajs/persona`；审查由 **Claude Agent SDK** 在 CLI 侧按 persona 文档执行。

## Summary

**nuwa-reviewer** 实现上述 Nuwa CLI（`@nuwajs/*`）。仓库采用 **pnpm workspace + Turborepo + Vite** 构建；通过小型 **embedding 模型**（`Xenova/all-MiniLM-L6-v2`，~23 MB）在构建时预计算 persona 索引，缓存于 **`~/.nuwa`**；在目标项目执行 **`nuwa init`** 将选定 persona 部署到 **`<project>/.nuwa/persona/`**；**`nuwa review`** 按 persona role-play 审查变更内容（v1：git diff），并生成 **`FEEDBACK.md`** 与 **`nuwa-feedback`** Cursor skill。

## Context / Problem

- 审稿 / 评审需要多视角，但通用 LLM 审查缺少稳定「角色扮演」与领域上下文。
- Persona markdown 已存在于 `@nuwajs/persona`，需要可复用的**检测 → 选型 → 部署 → 审查 → 反馈闭环**。
- 审查不应依赖云端 HF Inference API；索引应在本地预计算、可版本化、构建时可自动补齐。
- 审查结果需能被 Cursor / Claude Code 等工具**接续修复**（skill + `FEEDBACK.md`）。

## Goals

1. **Role-play 审查 CLI**：`nuwa` 命令，命名空间 `@nuwajs`；审查 anything；每位 persona 独立审查同一输入（v1：git diff）。
2. **项目检测**：根据 `package.json`、`Cargo.toml`、`pyproject.toml` 等识别 stack，自动选择 persona 子集。
3. **全局索引**：`~/.nuwa/persona-index.json` + `~/.nuwa/models/`；build 时若索引缺失则自动计算。
4. **项目部署**：`nuwa init [path]` → `<detected-root>/.nuwa/persona/*.md` + `index.json` + `.nuwa/config.json`（从 `path` 向上检测项目根，如 monorepo 子目录无 manifest 时落到仓库根）。
5. **审查**：`nuwa review` 支持 staged / unstaged / commit / PR；Claude Agent SDK；输出 `FEEDBACK.md` + `.cursor/skills/nuwa-feedback/SKILL.md`。
6. **可测试**：核心逻辑单元测试；persona 索引 hash 校验避免重复计算。

## Non-goals

- 不提供 Web UI 或 IDE 插件（仅 CLI + 生成 skill）。
- 不在本 RFC 中规定 persona 内容的创作流程（由 `@nuwajs/persona` 维护）。
- 不替代 Bugbot / 专用 SAST；persona 审查是**辅助性、可配置**的。
- npm 发布为 Phase 2（T-011）；开发期可用 `pnpm nuwa` / 本地 `bin`。

## Proposal

### 仓库布局

| 路径 | 包名 | 职责 |
| --- | --- | --- |
| `packages/persona` | `@nuwajs/persona` | 27+ persona markdown；embedding 常量；预计算脚本 |
| `packages/core` | `@nuwajs/core` | 项目检测、persona 映射、deploy、git diff、review、feedback |
| `packages/cli` | `@nuwajs/cli` | `nuwa` role-play review CLI（commander + ora） |
| `packages/mcp` | `@nuwajs/mcp` | MCP stdio 服务（见 [RFC 002](./002-nuwa-mcp-server.md)） |
| `packages/config-vite` | `@nuwajs/config-vite` | 共享 Vite lib/cli 构建配置 |

### 存储布局

**全局（用户主目录）**

```
~/.nuwa/
├── models/                 # Transformers.js 模型缓存
└── persona-index.json      # 全量 persona 预计算索引（含 embedding）
```

**项目（每个仓库）**

```
<project>/
├── .nuwa/
│   ├── config.json         # stacks + 已选 persona ids
│   └── persona/
│       ├── linus-torvalds.md
│       ├── kent-beck.md
│       ├── ...
│       └── index.json      # 本项目 persona 子集索引
├── FEEDBACK.md             # review 输出（gitignore 可选）
└── .cursor/skills/nuwa-feedback/SKILL.md
```

加载优先级：`~/.nuwa/persona-index.json` → 包内 `packages/persona/persona/index.precomputed.json`（bundled fallback）。

### Persona 选型

- **Board 常驻**：`martin-fowler`、`linus-torvalds`、`kent-beck`、`margaret-hamilton`、`fred-brooks`
- **Stack 扩展**：如 `node` → `guillermo-rauch`；`react` → `jordan-walke`、`dan-abramov`；`swift` → `paul-hudson` 等（见 `packages/core/src/persona/mapping.ts`）

### 索引预计算

| 项 | 说明 |
| --- | --- |
| 模型 | `Xenova/all-MiniLM-L6-v2`（384 维，~23 MB） |
| 触发 | `@nuwajs/persona` build 前 `--if-missing`；或 `pnpm precompute-index` |
| 离线 | `--offline` / `NUWA_INDEX_OFFLINE=1` → 启发式索引，无模型下载 |
|  expertise | embedding 与领域 probe 余弦相似度排序 |
| 失效 | persona markdown 内容 hash 变化 → 重建 |

### CLI 命令

| 命令 | 说明 |
| --- | --- |
| `nuwa init [path]` | 检测 stack，部署 persona 到 `<root>/.nuwa/persona/`；`--offline` |
| `nuwa index [path]` | 从 `~/.nuwa` 同步项目 `index.json`；`--offline` |
| `nuwa precompute-index` | 重建 `~/.nuwa/persona-index.json`；`--offline` / `--force` |
| `nuwa review [path]` | Role-play 审查；`--staged` / `--unstaged` / `--commit` / `--pr`；`--persona` / `--model` / `--no-write` |
| `nuwa detect [path]` | 仅输出检测到的 stacks |
| `nuwa personas` | 列出内置 persona id |
| `nuwa mcp` | 启动 stdio MCP 服务（Claude Code；见 RFC 002） |

### Review 数据流

```
git diff (staged|unstaged|commit|pr)
        │
        ▼
  读取 <project>/.nuwa/persona/{id}.md
        │
        ▼
  Claude Agent SDK (query, Read/Grep/Glob)
        │
        ▼
  解析 findings → FEEDBACK.md
        │
        ▼
  生成 .cursor/skills/nuwa-feedback/SKILL.md
```

### 环境变量

| 变量 | 用途 |
| --- | --- |
| `ANTHROPIC_API_KEY` | `nuwa review`（Claude Agent SDK） |
| `NUWA_INDEX_OFFLINE` | 强制启发式索引，不下载 embedding 模型 |

### 构建

- **Turbo**：`build` 依赖 `^build`；`@nuwajs/persona` 先 `precompute-index --if-missing`，再 Vite build。
- **Vite**：各包 ESM + `.d.ts`（`vite-plugin-dts`）；CLI 打包为 `dist/cli.js` + shebang。

## Alternatives considered

1. **Hugging Face Inference API（7B instruct）**：质量高但需 token、延迟大；否决，改用本地 MiniLM embedding + 启发式字段。
2. **索引仅放仓库内**：clone 即可用但无法跨项目共享；采用 `~/.nuwa` 全局 + bundled fallback。
3. **Cursor SDK 而非 Claude Agent SDK**：审查已在 CLI 侧运行，Claude Agent SDK 与 persona 文档更贴合；Cursor skill 仅用于**修复阶段**。
4. **Ink TUI**：交互式体验好但 CI 不友好；采用 commander + ora。

## Risks

| 风险 | 缓解 |
| --- | --- |
| 首次 build 下载模型失败 | 自动 fallback 启发式索引；`--offline` 显式跳过 |
| 在 monorepo 深层目录执行 `init` 却落到子包 | `init` 通过 `detectProjectStacks` 向上 walk；子目录无 manifest 时落到 monorepo 根 |
| Claude Agent SDK API 变更 | 锁定依赖版本；审查逻辑集中在 `@nuwajs/core` |
| Persona 索引 JSON 体积（含 embedding） | 仅全局一份；项目内 `index.json` 为子集、可不含 embedding |
| PR review 依赖 `gh` | 文档注明；无 gh 时用 `--commit` / `--staged` |

## Testing strategy

- **单元测试**（按包 `vitest.config.ts`，根目录 `pnpm test` → `turbo run test`）：`detectProjectStacks`、`selectPersonasForStacks`、`initProject`、`parseFindingsFromMarkdown`、`isManifestCurrent`、paths；`@nuwajs/core` 与 `@nuwajs/persona` 各自维护测试。
- **集成**（待 T-012）：`pnpm precompute-index --offline` → `nuwa init` → 验证 `.nuwa/persona` 文件存在。
- **CI 建议**：`NUWA_INDEX_OFFLINE=1 pnpm build && pnpm test`；review 需 `ANTHROPIC_API_KEY`，放 manual / nightly。

## Work breakdown

| ID | 任务 | 状态 |
| --- | --- | --- |
| T-001 | pnpm + Turbo monorepo，`@nuwajs/*` 命名空间 | Done |
| T-002 | Vite 构建 persona / core / cli | Done |
| T-003 | Persona 源文件 `@nuwajs/persona/persona` | Done |
| T-004 | 项目 stack 检测 + persona 映射 | Done |
| T-005 | `~/.nuwa` 全局索引 + MiniLM 预计算 | Done |
| T-006 | build 时 `--if-missing` 自动索引 | Done |
| T-007 | `nuwa init` → `<project>/.nuwa/persona` | Done |
| T-008 | `nuwa review` + Claude Agent SDK | Done |
| T-009 | `FEEDBACK.md` + `nuwa-feedback` skill | Done |
| T-010 | 单元测试（19 cases，按包 vitest + turbo test） | Done |
| T-011 | npm 发布 / `npx @nuwajs/cli` 分发（`@nuwajs/*` scope） | In Progress |
| T-012 | CI workflow（offline build + test） | Todo |
| T-013 | Review 结果 JSON 模式 / `--json` 输出 | Todo |
| T-014 | 按 embedding 相似度动态增删 persona（init 时） | Todo |

## Decision log

- **2026-06-11**：初稿；归档当前已实现架构（retroactive RFC）。
- **2026-06-11**：**Approved**；全局存储定为 `~/.nuwa`；embedding 模型定为 `Xenova/all-MiniLM-L6-v2`；项目部署路径定为 `detectProjectStacks` 解析的 `<root>/.nuwa/persona/`。
- **2026-06-11**：明确产品定位 — **Nuwa = role-play 代码审查 CLI**；npm scope 定为 `@nuwajs`（自 `@luban-ws` 迁移）；测试改为按包 vitest + 根 `turbo test`；补充 ROADMAP / TASK_TRACKING。
- **2026-06-11**：定位收窄修正 — **Nuwa = role-play 审查 CLI，review anything**（不限于 code review）；v1 以 git diff 为默认输入通道。
- **2026-06-11**：`packages/role` → `packages/persona`；npm 包 `@nuwajs/role` → `@nuwajs/persona`。
- **2026-06-11**：MCP 集成拆至 [RFC 002](./002-nuwa-mcp-server.md)；001 仓库表补充 `@nuwajs/mcp` 与 `nuwa mcp` 命令引用。
