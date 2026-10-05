# Zenith

**All-in-one command center for software teams** — project management, progress
tracking, task assignment, issue tracking and team management behind a single
bird's-eye dashboard. Built for fast-moving, AI-assisted ("vibecoding") development
teams that need the whole picture without switching tabs.

![stack](https://img.shields.io/badge/Next.js%2016-App%20Router-black) ![stack](https://img.shields.io/badge/TypeScript-strict-blue) ![stack](https://img.shields.io/badge/Tailwind%20CSS-4-teal)

---

## Quick start

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Smoke suite (`scripts/smoke.ts`) — 100 checks, run against **both** repo adapters |
| `pnpm verify` | lint + typecheck + test + build — the phase gate |

No environment variables required: the SQLite file (`./zenith.db`) is created and
seeded on first run. Optional knobs: `ZENITH_DB_PATH` (path or `:memory:`) and
`ZENITH_REPO=sqlite|memory`. Clone → run.

---

## What's in the box

- **Dashboard (`/`)** — stat cards (active projects, open tasks, open issues, on-track %),
  task-mix donut, 30-day activity trend, open-issues-by-severity, team workload,
  project health table and a live activity feed. Designed so a lead answers
  "is it healthy?" in under five seconds, without clicking.
- **Projects (`/projects`, `/projects/[id]`)** — portfolio cards with progress rings;
  detail view with Overview · Board · Issues · Activity tabs, crew and lead.
- **Tasks (`/tasks`)** — kanban across Backlog → To do → In progress → In review → Done
  with drag-and-drop, plus a sortable list view (click a column header to sort). Collapsible
  filters (project, assignee, priority, status, label, text search) live in the URL, so
  views are shareable.
- **Issues (`/issues`)** — severity-ordered triage, severity chart, critical counter,
  task linking, resolve/reopen.
- **Team (`/team`)** — members, roles, workload bars with a WIP limit of 7, and an
  explicit capability matrix.
- **Global** — ⌘K command palette, toasts, empty states, skeletons, error and 404 pages,
  mock role switcher, responsive sidebar → drawer below 1024px.

### Roles

`owner` › `admin` › `member` › `viewer`, enforced inside **every** server action
(`src/lib/permissions.ts`), not just the UI. Use the switcher in the sidebar (or
`/sign-in`) to see enforcement live — as a `viewer`, every mutation control is gone.

---

## Architecture

```
UI (RSC + client islands, Tailwind 4 design tokens)
  └─ Zod validation (src/lib/schemas.ts)
      └─ Server actions (src/lib/actions.ts) — auth check → parse → mutate →
         emit ActivityEvent → revalidatePath
          └─ Repository seam (src/lib/repo/types.ts)   ← the only write path
               ├─ SQLiteRepo (src/lib/repo/sqlite.ts)      ← default
               │    └─ ./zenith.db (better-sqlite3, WAL)   ← persisted
               └─ InMemoryRepo (src/lib/repo/in-memory.ts) ← tests (ZENITH_REPO=memory)
                    └─ Seed (src/lib/seed.ts) — 7 people · 3 projects ·
                       40 tasks · 18 issues · 59 activity events
```

**Key rule:** nothing outside `src/lib/repo` imports the adapter — pages call the seam
and never touch `db`. Both adapters implement the same `Repo` contract (see
`src/lib/repo/types.ts`) and the smoke suite runs the *same* checks against each, so a
Postgres/Drizzle port is one new file plus one `ZENITH_REPO` value.

Derived metrics (`src/lib/metrics.ts`) are computed, never stored: on-track %,
per-project health, workload, status/severity counts, the 30-day trend.

### Persistence

State lives in a SQLite database (`./zenith.db`, WAL mode) opened lazily on first
access — **it survives restarts**, and the seed data is written only when the file is
new. `ZENITH_DB_PATH` picks another file (or `:memory:`); `ZENITH_REPO=memory` swaps in
the seeded in-memory adapter for tests. Every mutation still flows through the repo
seam, so the choice above never leaks past `src/lib/repo/index.ts`.

---

## Design system

The whole UI derives from `DESIGN.md` via Tailwind 4 `@theme` tokens in
`src/app/globals.css` — **no hard-coded hex values in components**.

| Token group | Source |
|---|---|
| Colour | canvas `#0a0d3a`, surface `#1e2353`, Blurple `#5865f2`, green `#35ed7e`, magenta `#ec48bd`, link `#00b0f4` |
| Type | **Space Grotesk** (display, 700–800) + **Inter** (body) — the open-source substitutes DESIGN.md prescribes for ABC Ginto Nord/ggsans |
| Radius | 6 · 12 · 14 · 16 on controls, 40 on panels, pill on badges — nothing square |
| Depth | colour + gradient + radius; the one permitted glow is `0 3px 68px rgba(69,42,124,.1)` |

Constitutional UI constraints (see `docs/spec-kit/constitution.md`):

- **one green button per screen** — green is the highest-intent action only
- **max two accent colours per screen**
- **one gradient-mesh wash per view** (dashboard hero / sign-in only)
- **every widget must answer a named question**; no decorative metrics

---

## Specification (spec-kit format)

Planning artifacts live in `docs/spec-kit/`, written before any code:

| File | Contents |
|---|---|
| `constitution.md` | Prime directives: spec-before-code, calm UI, DESIGN.md as law, repo seams, quality gates |
| `spec.md` | SDA + PRD — goals, personas, FR-1…FR-6, NFRs, user stories, out-of-scope backlog |
| `plan.md` | TRD — layer diagram, stack rationale, data model, routes, token mapping, risk register |
| `tasks.md` | The phased implementation plan (Phase 0 → 9) with per-phase gates and a QA script |

Requirements trace: every `FR-*` in `spec.md` has an implementation in `src/`, and
`pnpm test` guards the data layer those requirements rest on.

---

## Verification status

- `pnpm lint` — 0 errors
- `pnpm typecheck` — clean under `strict`
- `pnpm test` — 100/100 checks (seed integrity, metrics, mutations, permissions,
  session), run against both the SQLite and in-memory adapters
- `pnpm build` — all routes compile; app routes are `force-dynamic` (they read live
  server state)
- Routes smoke-tested at 200: `/`, `/projects`, `/projects/[id]`, `/tasks`, `/issues`,
  `/team`, `/sign-in`, and 404 for unknown paths; filter URLs verified server-side
  (`/tasks?label=mobile` → 5 of 40)
- Accessibility: modals and the command palette are native `<dialog>` (focus trap,
  Escape, background inert, focus restore), the palette is a real combobox/listbox,
  sortable headers expose `aria-sort`, and body text uses the AA-safe `ink-50` token

---

## Roadmap (post-v1 backlog)

Sprints · burndown/velocity · real Auth.js + Postgres · GitHub issue/PR sync ·
comments & mentions · notifications · saved views · file attachments.

See `docs/spec-kit/spec.md` §6 for the full list.
