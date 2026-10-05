# Zenith — TRD / Implementation Plan (plan.md)

Technical reference for implementing `spec.md`. May change freely; `spec.md` may not
without user approval.

---

## 1. SDA — architecture layers

```
┌─────────────────────────────────────────────────────────────┐
│ UI  ·  App Router pages (RSC) + client islands (board,       │
│       charts, drawer, palette)  ·  Tailwind 4 design tokens │
├─────────────────────────────────────────────────────────────┤
│ Validation  ·  Zod schemas (`lib/schemas`)                  │
├─────────────────────────────────────────────────────────────┤
│ Mutations  ·  Server actions (`lib/actions`) — auth check,  │
│               Zod parse, repo call, ActivityEvent, revalidate│
├─────────────────────────────────────────────────────────────┤
│ Repository seam  ·  `lib/repo/types.ts` (interfaces)        │
├──────────────────────────┬──────────────────────────────────┤
│ SQLiteRepo (default)     │  PostgresRepo (future, one file) │
│ ./zenith.db, WAL         │                                  │
│ InMemoryRepo (tests)     │                                  │
├──────────────────────────┴──────────────────────────────────┤
│ Seed data (`lib/seed`) — 6 members, 3 projects, 40 tasks,   │
│ 18 issues, 60 activity events                               │
└─────────────────────────────────────────────────────────────┘
```

Rules: UI never imports the adapter; server actions are the only write path; every write
emits an `ActivityEvent`.

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router, React 19, TS strict | RSC for dashboard, server actions for mutations |
| Styling | Tailwind CSS 4 (`@theme` in globals.css) | DESIGN.md tokens as CSS vars |
| Fonts | Space Grotesk (display) + Inter (body) via `next/font` | DESIGN.md-approved substitutes |
| Charts | Recharts (client components) | donut/bar/area, token-colourable |
| DnD | `@dnd-kit/core` + `sortable` | accessible kanban |
| Validation | Zod | shared client/server schemas |
| Icons | lucide-react | consistent stroke set |
| Utils | `clsx`, `tailwind-merge`, `date-fns` | cn(), relative time |
| State | Server state via RSC + `revalidatePath`; UI state via URL search params | minimal client state |

No ORM, no auth library, no CSS-in-JS in v1.

## 3. Data model (SQLite, same shape in memory)

```ts
ID = string (nanoid-style: `${prefix}_${random}`)
Role = 'owner' | 'admin' | 'member' | 'viewer'
ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed'
TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done'
Priority = 'urgent' | 'high' | 'medium' | 'low'
IssueSeverity = 'critical' | 'high' | 'medium' | 'low'
IssueStatus = 'open' | 'in_progress' | 'resolved'

User      { id, name, email, avatarColor, title }
Membership{ userId, role }                  // v1: single workspace
Project   { id, key, name, description, status, leadId, startDate, targetDate, createdAt }
Task      { id, projectId, title, description, status, priority, assigneeId?, dueDate?,
            labels: string[], order: number, createdAt, updatedAt }
Issue     { id, projectId, title, description, severity, status, reporterId, assigneeId?,
            linkedTaskIds: string[], createdAt, resolvedAt? }
Comment   { id, taskId|issueId, authorId, body, createdAt }        // drawer only
Activity  { id, actorId, verb: 'created'|'updated'|'moved'|'assigned'|'resolved'|...,
            entityType: 'task'|'issue'|'project'|'member', entityId, entityLabel,
            meta?, at }
Session   { userId }                        // mock; switchable from the sidebar
```

**Derived metrics** (computed, never stored): on-track % = projects not overdue with
progress ≥ expected; workload = count of non-done tasks per member (WIP limit 7).

## 4. Routes

| Route | Rendering | Notes |
|---|---|---|
| `/` | RSC + client charts | dashboard (FR-1) |
| `/projects` | RSC | cards (FR-2.1) |
| `/projects/[id]` | RSC shell + client tabs | overview/board/issues/activity |
| `/tasks` | client (board/list) | filters in URL params |
| `/issues` | RSC list + client triage chart | |
| `/team` | RSC | role management |
| `/(auth)/sign-in` | client | mock role switcher |
| `*` | RSC | not-found / error boundaries |

## 5. Design-token mapping (DESIGN.md → Tailwind 4)

```css
@theme {
  --color-canvas: #0a0d3a;      --color-surface: #1e2353;
  --color-onyx: #23272a;        --color-hairline: #23272a;
  --color-primary: #5865f2;     --color-accent-green: #35ed7e;
  --color-magenta: #ec48bd;     --color-link: #00b0f4;
  --color-ink: #fff;            --color-ink-dark: #000;
  --font-display: 'Space Grotesk'; --font-sans: 'Inter';
  --radius-control: 12px; --radius-panel: 40px; ...
}
```
Component chrome: panels = `bg-surface rounded-[40px]`; rows = `bg-surface rounded-xl`;
controls = `rounded-xl`; badges = magenta pill; one green button per view.

## 6. Testing & quality

- `pnpm lint` (eslint + next config), `pnpm typecheck` (tsc --noEmit), `pnpm build`.
- Manual QA script per phase in `tasks.md` (acceptance → click path).
- Lighthouse pass on `/` at 1280px in Phase 9.

## 7. Repo structure

```
zenith/
├── docs/spec-kit/{constitution,spec,plan,tasks}.md
├── DESIGN.md
├── src/
│   ├── app/                     # routes, layouts, error/not-found
│   ├── components/{ui,charts,shell,dashboard,projects,tasks,issues,team}
│   ├── lib/{repo,seed,actions,schemas,utils,metrics}
│   └── styles/globals.css       # Tailwind 4 @theme tokens
├── public/
├── package.json / tsconfig.json / eslint.config.mjs
└── README.md
```

## 8. Risk register

| Risk | Mitigation |
|---|---|
| SQLite write contention (better-sqlite3 is sync) | WAL mode, single-writer server actions; swap `ZENITH_REPO=memory` if a deploy ever needs to shed the file |
| dnd-kit + RSC hydration | board is a client component; mutations via server actions |
| Recharts bundle on dashboard | dynamic import, `ssr:false`, skeleton dims fixed |
| Over-cluttered dashboard | constitution §II/§III reviewed at Phase 4 gate |
| Font licensing | Space Grotesk + Inter (DESIGN.md substitutes) |
