# Task tracking — nuwa-reviewer

操作任务列表；权威 work breakdown 见 [RFC 001](./rfc/001-nuwa-reviewer-cli.md#work-breakdown)。路线图见 [ROADMAP.md](./ROADMAP.md)。

## In progress

| ID | 任务 | 备注 |
| --- | --- | --- |
| T-011 | npm 发布 / `npx @nuwajs/cli` | `@nuwajs/*` 包名与 `publishConfig` 已就绪；待 npm org 与首次 publish |

## Todo

| ID | 任务 |
| --- | --- |
| T-012 | CI workflow（`NUWA_INDEX_OFFLINE=1` build + `turbo test`） |
| T-013 | Review `--json` 输出 |
| T-014 | init 时按 embedding 动态增删 persona |

## Done

| ID | 任务 |
| --- | --- |
| T-001 | pnpm + Turbo monorepo，`@nuwajs/*` 命名空间 |
| T-002 | Vite 构建 persona / core / cli |
| T-003 | Persona 源文件 `@nuwajs/persona/persona` |
| T-004 | 项目 stack 检测 + persona 映射 |
| T-005 | `~/.nuwa` 全局索引 + MiniLM 预计算 |
| T-006 | build 时 `--if-missing` 自动索引 |
| T-007 | `nuwa init` → `<project>/.nuwa/persona` |
| T-008 | `nuwa review` + Claude Agent SDK |
| T-009 | `FEEDBACK.md` + `nuwa-feedback` skill |
| T-010 | 单元测试（19 cases，按包 `vitest` + 根 `turbo test`） |
| T-015 | `@nuwajs/mcp` stdio server + 五工具 handler |
| T-016 | `nuwa mcp` CLI 子命令 |
| T-017 | `nuwa init` 写入/合并 `.mcp.json` |
| T-018 | MCP config / resolve-path 单元测试 |
