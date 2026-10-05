# Zenith

**All-in-one command center for software teams** — projects, tasks, issues and people
behind a single bird's-eye dashboard.

![CI](https://github.com/pallab-js/zenith/actions/workflows/ci.yml/badge.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-teal)
![License](https://img.shields.io/badge/license-MIT-green)

## Quick start

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

No environment variables. The SQLite file (`./zenith.db`) is created and seeded on
first run. Optional: `ZENITH_DB_PATH` (another file or `:memory:`) and
`ZENITH_REPO=sqlite|memory`.

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm test` | Smoke suite — 100 checks against **both** repo adapters |
| `pnpm verify` | lint + typecheck + test + build — the phase gate |
| `pnpm build` / `pnpm start` | Production build / serve |

## Features

- **Dashboard** — stat cards, task-mix donut, 30-day activity, severity and workload
  charts, project health, live activity feed.
- **Projects** — portfolio cards with progress rings; detail view with
  Overview · Board · Issues · Activity tabs.
- **Tasks** — kanban with drag-and-drop plus a sortable list view; filters
  (project, assignee, priority, status, label, search) live in the URL and are shareable.
- **Issues** — severity-ordered triage, critical counter, task linking, resolve/reopen.
- **Team** — members, roles, workload bars with a WIP limit, and a capability matrix.
- **Roles** — `owner › admin › member › viewer`, enforced inside every server action,
  not just the UI. Switch seats in the sidebar (or `/sign-in`) to watch it apply.

## Architecture

```
UI (RSC + client islands, Tailwind 4 tokens)
  └─ Zod validation
      └─ Server actions — auth → parse → mutate → ActivityEvent → revalidatePath
          └─ Repository seam (src/lib/repo/types.ts)   ← the only write path
               ├─ SQLiteRepo   → ./zenith.db (better-sqlite3, WAL)
               └─ InMemoryRepo → tests (ZENITH_REPO=memory)
```

Nothing outside `src/lib/repo` imports an adapter — pages read through the seam and
never touch `db`. Both adapters satisfy one contract, so a Postgres port is a single new
file. Metrics are derived per render, never stored.

## Specification

Planning artifacts are written before code in [`docs/spec-kit/`](docs/spec-kit/) —
`constitution.md` (prime directives), `spec.md` (requirements), `plan.md` (TRD),
`tasks.md` (phased plan with gates).

## License

MIT — see [LICENSE](LICENSE).
