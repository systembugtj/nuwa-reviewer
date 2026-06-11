# nuwa-reviewer

**Nuwa** (`nuwa` CLI, [`@nuwajs/*`](https://www.npmjs.com/org/nuwajs)) is a **role-play review** tool—not limited to code. Historical and expert **personas** (Linus Torvalds, Kent Beck, Martin Fowler, …) review **whatever you put in front of them** (today: git diff as the default input; docs, specs, and other artifacts are fair game) in character, each with their own philosophy, then aggregate findings into actionable feedback.

Monorepo: pnpm + Turborepo + Vite. Spec: [.spec/rfc/001](./.spec/rfc/001-nuwa-reviewer-cli.md).

## What `nuwa` does

| Step | Command | Outcome |
| --- | --- | --- |
| 1 | `nuwa init` | Detect stack → deploy matching personas to `.nuwa/persona/` |
| 2 | `nuwa review --staged` | Each persona role-plays a reviewer on your changes (Claude Agent SDK) |
| 3 | (optional) `nuwa-feedback` skill | Address findings in `FEEDBACK.md` inside Cursor |

## Global storage (`~/.nuwa`)

| Path | Purpose |
| --- | --- |
| `~/.nuwa/models/` | Embedding model cache (`Xenova/all-MiniLM-L6-v2`, ~23 MB) |
| `~/.nuwa/persona-index.json` | Precomputed persona index (embeddings + metadata) |

Project-local (per repo):

| Path | Purpose |
| --- | --- |
| `.nuwa/config.json` | Detected stacks + selected personas |
| `.nuwa/persona/` | Deployed persona markdown + `index.json` subset |

## Packages

| Package | Description |
| --- | --- |
| `@nuwajs/persona` | Persona definitions + precompute script |
| `@nuwajs/core` | Stack detection, deploy, role-play review engine (any subject) |
| `@nuwajs/cli` | `nuwa` CLI (`npx @nuwajs/cli` or `npm i -g @nuwajs/cli`) |

## Scripts

```bash
pnpm install
pnpm build                         # auto-computes index if missing, then vite build
pnpm precompute-index              # force refresh with embedding model
pnpm precompute-index -- --offline # heuristic only, no model (~0 MB)
pnpm test                          # turbo run test (per-package vitest)
pnpm nuwa init                     # in-repo: runs node_modules/.bin/nuwa
pnpm nuwa review --staged
```

## Local system (`nuwa` on your PATH)

After `pnpm build`, install the **`nuwa`** command globally (pnpm global bin must be on your `PATH` — usually `~/Library/pnpm` on macOS):

```bash
pnpm link:global    # build + pnpm link --global from packages/cli
nuwa --version
nuwa personas
```

Re-run `pnpm link:global` after CLI changes. To remove: `pnpm unlink --global @nuwajs/cli`.

Inside this monorepo you can also use `pnpm exec nuwa` or `pnpm nuwa` without linking.

## npm install

```bash
npx @nuwajs/cli init
npx @nuwajs/cli review --staged

# or global
npm install -g @nuwajs/cli
nuwa init
```

Publish from monorepo root (requires npm login for `@nuwajs` scope):

```bash
pnpm publish:packages
```

### Environment

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude Agent SDK for `nuwa review` |
