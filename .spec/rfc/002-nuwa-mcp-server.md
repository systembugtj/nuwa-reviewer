# RFC 002 — Nuwa MCP Server（Claude 集成）

| 字段 | 值 |
| --- | --- |
| 状态 | Approved |
| 创建日期 | 2026-06-11 |
| 作者 | Maintainers |
| Supersedes | — |
| Superseded-By | — |
| 依赖 | [RFC 001](./001-nuwa-reviewer-cli.md) |

## Summary

将 Nuwa 暴露为 **Model Context Protocol (MCP) stdio 服务**，使 **Claude Code / Claude Desktop** 可通过 MCP 工具调用 `nuwa init`、`nuwa review` 等能力，无需用户手动在终端切换上下文。`nuwa init` 自动写入项目级 **`.mcp.json`**，团队可随仓库共享 Nuwa MCP 配置。

## Context / Problem

- RFC 001 的审查闭环以 **CLI + skill** 为主；Claude 作为主编排器时，需要**原生工具调用**而非仅依赖用户粘贴命令。
- Cursor 有 `nuwa-feedback` skill；Claude Code 使用 **`.mcp.json`** 注册 MCP 服务器，二者配置路径不同。
- 审查仍由 Nuwa 内部 Claude Agent SDK 执行；MCP 层是**薄编排**，复用 `@nuwajs/core`，不重复实现 review 逻辑。

## Goals

1. **`@nuwajs/mcp`**：stdio MCP 服务，注册工具供 Claude 调用。
2. **`nuwa mcp`**：CLI 子命令，启动 stdio 传输（供 `.mcp.json` 引用）。
3. **`nuwa init` 写入 `.mcp.json`**：合并 `mcpServers.nuwa` 条目，保留项目中已有其他 MCP 服务器。
4. **工具面**：init、review、detect、list personas、read feedback。
5. **路径解析**：工具 `path` 参数 → `CLAUDE_PROJECT_DIR` → `cwd`。
6. **测试**：mcp-config 合并与路径解析单元测试。

## Non-goals

- HTTP/SSE MCP 传输（仅 stdio；足够覆盖 Claude Code Desktop 本地场景）。
- 在 MCP 内嵌 Claude sampling 二次调用（review 已由 core 的 Agent SDK 完成）。
- Cursor MCP 配置自动生成（Cursor 使用不同 MCP 配置机制；本 RFC 聚焦 Claude Code `.mcp.json`）。
- Ink TUI 或 MCP 进度流式推送（review 工具同步返回 JSON 摘要）。

## Proposal

### 仓库布局

| 路径 | 包名 | 职责 |
| --- | --- | --- |
| `packages/mcp` | `@nuwajs/mcp` | MCP server、`writeNuwaMcpConfig`、工具 handler |
| `packages/cli` | `@nuwajs/cli` | `nuwa mcp` 子命令；`init` 调用 `writeNuwaMcpConfig` |

依赖：`@modelcontextprotocol/sdk`、`zod`、`@nuwajs/core`、`@nuwajs/persona`。

### MCP 工具

| 工具名 | 说明 |
| --- | --- |
| `nuwa_init` | `initProject`；可选 `offline` |
| `nuwa_review` | `collectDiff` + `runReview`；可选 `scope` / `target` / `personas` / `model` / `maxTurns` / `write` |
| `nuwa_detect` | `detectProjectStacks` |
| `nuwa_list_personas` | 内置 persona ids + 项目已部署列表 |
| `nuwa_read_feedback` | 读取 `FEEDBACK.md` |

### `.mcp.json`（Claude Code 项目 scope）

`nuwa init` 合并写入：

```json
{
  "mcpServers": {
    "nuwa": {
      "type": "stdio",
      "command": "nuwa",
      "args": ["mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

未全局安装 CLI 时，可改为 `npx -y @nuwajs/cli mcp`（文档说明，非 init 默认）。

### 数据流

```
Claude Code
    │  MCP stdio
    ▼
nuwa mcp  →  @nuwajs/mcp
    │
    ├── nuwa_init     → initProject (core)
    ├── nuwa_review   → runReview + writeFeedbackFile + writeNuwaFeedbackSkills (core)
    ├── nuwa_detect   → detectProjectStacks (core)
    ├── nuwa_list_personas → listPersonaIds + readNuwaConfig
    └── nuwa_read_feedback → FEEDBACK.md
```

### 环境变量

| 变量 | 用途 |
| --- | --- |
| `ANTHROPIC_API_KEY` | `nuwa_review` 工具（经 core Agent SDK） |
| `CLAUDE_PROJECT_DIR` | Claude Code 注入；工具默认项目根 |

## Alternatives considered

1. **仅文档说明手动 `claude mcp add`**：可行但易遗漏；`init` 自动写入降低摩擦。
2. **MCP 放在 `@nuwajs/core`**：core 会引入 MCP SDK 依赖；独立 `@nuwajs/mcp` 保持 core 轻量。
3. **子进程 `nuwa review` 而非库调用**：stderr/stdout 与 MCP 协议冲突；直接调用 core 函数更可靠。

## Risks

| 风险 | 缓解 |
| --- | --- |
| `nuwa` 不在 PATH 导致 MCP 启动失败 | 文档提供 `npx @nuwajs/cli` 备选；init 默认假设全局/link |
| review 工具耗时长阻塞 MCP | 工具描述注明；同步返回完整 JSON 摘要 |
| `.mcp.json` 合并覆盖用户自定义 nuwa 条目 | 仅更新 `mcpServers.nuwa` 键 |
| MCP SDK / zod 版本漂移 | 锁定 `@modelcontextprotocol/sdk@^1.29`、`zod@^4.4` |

## Testing strategy

- **单元测试**（`packages/mcp`）：`buildNuwaMcpServerEntry`、`mergeNuwaMcpConfig`、`writeNuwaMcpConfig`、`resolveProjectPath`。
- **集成**（手动）：`nuwa init` → 验证 `.mcp.json`；Claude Code `/mcp` 列出 `nuwa_*` 工具。
- **E2E review**：需 `ANTHROPIC_API_KEY`；放 manual / nightly（与 RFC 001 一致）。

## Work breakdown

| ID | 任务 | 状态 |
| --- | --- | --- |
| T-015 | `@nuwajs/mcp` 包 + stdio server + 五工具 | Done |
| T-016 | `nuwa mcp` CLI 子命令 | Done |
| T-017 | `nuwa init` 写入/合并 `.mcp.json` | Done |
| T-018 | mcp-config / resolve-path 单元测试 | Done |

## Decision log

- **2026-06-11**：初稿并 **Approved**（实现与 RFC 同步补档）。
- **2026-06-11**：stdio + Claude Code `.mcp.json` 为 v1 范围；Cursor MCP 配置不在本 RFC。
