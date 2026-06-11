# Roadmap — nuwa-reviewer

**Nuwa**（`nuwa` CLI，`@nuwajs/*`）是 **role-play 驱动的审查工具**（**review anything**—代码、文档、设计等）：用历史人物 / 专家 persona 扮演审稿人，对输入内容做多视角审查；v1 默认输入为 git diff，并生成可接续处理的反馈产物。

## Phase 1 — CLI 闭环（RFC 001）✓

| 里程碑 | RFC | 状态 |
| --- | --- | --- |
| Monorepo + persona 部署 + review + feedback | [001](./rfc/001-nuwa-reviewer-cli.md) | **Approved / 已实现** |

交付：`nuwa init` → `nuwa review` → `FEEDBACK.md` + `nuwa-feedback` skill。

## Phase 1.5 — Claude MCP 集成（RFC 002）✓

| 里程碑 | RFC | 状态 |
| --- | --- | --- |
| Nuwa 作为 MCP stdio 服务；`nuwa mcp`；init 写入 `.mcp.json` | [002](./rfc/002-nuwa-mcp-server.md) | **Approved / 已实现** |

交付：Claude Code 可通过 `nuwa_init` / `nuwa_review` 等工具驱动审查闭环。

## Phase 2 — 分发与工程化（进行中）

| 里程碑 | 任务 | 状态 |
| --- | --- | --- |
| `@nuwajs` npm 发布 | T-011 | In Progress |
| CI（offline build + test） | T-012 | Todo |

## Phase 3 — 体验增强（排队）

| 里程碑 | 任务 | 状态 |
| --- | --- | --- |
| `--json` 审查输出 | T-013 | Todo |
| init 时 embedding 动态选型 persona | T-014 | Todo |

## 依赖关系

```
RFC 001 (Approved)
    ├── RFC 002 MCP (Approved)  ← 已实现
    ├── T-011 npm @nuwajs/*     ← 当前焦点（含 @nuwajs/mcp）
    ├── T-012 CI
    └── T-013 / T-014           ← Phase 3
```
