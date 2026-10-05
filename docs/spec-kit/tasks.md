# Zenith — Implementation Plan (tasks.md)

Ordered, phase-tagged task checklist. A phase is done only when its **Gate** passes.
Reference: `spec.md` FR-x / `constitution.md` §x.

---

## Phase 0 — Specification ✅
- [x] 0.1 constitution.md — principles (spec-before-code, calm UI, DESIGN law, seams)
- [x] 0.2 spec.md — SDA + PRD: goals, personas, FR/NFR, user stories, backlog
- [x] 0.3 plan.md — TRD: layers, stack, data model, routes, tokens, risks
- [x] 0.4 tasks.md — this checklist
- **Gate**: user approves scope.

## Phase 1 — Foundation & design system
- [x] 1.1 Scaffold Next.js 15 + TS strict + Tailwind 4 + ESLint + src dir
- [x] 1.2 `globals.css` @theme tokens from DESIGN.md (colour, type, radius, spacing)
- [x] 1.3 Fonts: Space Grotesk + Inter via `next/font`; display type scale
- [x] 1.4 Primitives: Button (primary/green/white/ghost/ghost-sm), Badge, Card/Panel,
      StatCard, Avatar, Input, Select, Tabs, Drawer/Modal, Toast, EmptyState, Table,
      Progress (bar + ring), Skeleton, Disclosure
- [x] 1.5 Base layout: `not-found`, `error`, root layout metadata
- **Gate**: `pnpm lint && pnpm typecheck && pnpm build` green; primitives gallery renders.

## Phase 2 — Data layer (repo seam + seed)
- [x] 2.1 `lib/repo/types.ts` interfaces (all entities + CRUD + activity)
- [x] 2.2 `lib/repo/in-memory.ts` — globalThis store + adapter
- [x] 2.3 Zod schemas for every mutation payload
- [x] 2.4 Seed: 6 users, 3 projects, 40 tasks, 18 issues, 60 activity events, memberships
- [x] 2.5 Server actions: session (mock), project/task/issue/member mutations, all
      emitting ActivityEvent + revalidatePath
- [x] 2.6 Metrics helpers: on-track %, workload, status counts, 30-day series
- **Gate**: actions mutate store in a smoke test; seed is deterministic.

## Phase 3 — App shell & navigation
- [x] 3.1 Sidebar (canvas bg, active row = primary indicator per `ex-app-shell-row`)
- [x] 3.2 Top bar: breadcrumb/page title, search, role switcher, avatar
- [x] 3.3 Responsive: sidebar → drawer < 768px, hamburger trigger
- [x] 3.4 Toast host + `sonner`-style local toaster
- [x] 3.5 Command palette (⌘K): pages, projects, tasks, issues, actions
- [x] 3.6 Mock auth gate: `sign-in` page + role switcher; viewer = read-only enforcement
- **Gate**: navigate all routes at 375/1280px; palette jumps work; role switch changes
      enabled controls.

## Phase 4 — Dashboard (FR-1)
- [x] 4.1 Hero band (canvas + gradient mesh) with page title + date context
- [x] 4.2 Stat cards ×4 (FR-1.1)
- [x] 4.3 Charts: donut, project progress, severity, workload, 30-day area (FR-1.2)
- [x] 4.4 Project health table (FR-1.3)
- [x] 4.5 Activity feed (FR-1.4)
- [x] 4.6 Redundancy + accent audit against constitution §II/§III
- **Gate**: US-1, US-2 verified; widgets answer named questions only.

## Phase 5 — Projects & Tasks (FR-2, FR-3)
- [x] 5.1 Project list cards with progress rings; create/edit modal (role-gated)
- [x] 5.2 Project detail: Overview tab (metrics, milestones, members)
- [x] 5.3 Kanban board: dnd-kit, 5 columns, drag persists status + order, activity
- [x] 5.4 List view: sortable table
- [x] 5.5 Filters + search in URL params, collapsed disclosure
- [x] 5.6 Task drawer: fields, edit, linked issues, activity
- [x] 5.7 Project detail tabs: Board · Issues · Activity
- **Gate**: US-3, US-6; full lifecycle < 30s (M2).

## Phase 6 — Issues (FR-4)
- [x] 6.1 Issue list: severity/status filters, critical-first default sort
- [x] 6.2 Triage chart + create/edit issue modal
- [x] 6.3 Issue detail: link/unlink tasks, resolve action
- [x] 6.4 Dashboard counters update on resolve
- **Gate**: US-4 verified end-to-end.

## Phase 7 — Team (FR-5)
- [x] 7.1 Member list: role, open tasks, overdue, workload bar
- [x] 7.2 Role change + remove member (owner-gated)
- [x] 7.3 Workload view with WIP-limit flag (>7)
- [x] 7.4 Permission matrix enforced in every mutation
- **Gate**: US-5 verified as viewer/member/admin/owner.

## Phase 8 — Polish (NFR-2/3)
- [x] 8.1 Empty states on every view (`ex-empty-state-card`)
- [x] 8.2 Keyboard: focus rings, drawer Esc, palette shortcuts, board ARIA
- [x] 8.3 `prefers-reduced-motion` (gradient mesh, chart animation, transitions)
- [x] 8.4 Responsive sweep at 375/768/1024/1280 — implemented (sidebar → drawer <1024,
      single-column stacking, table overflow wrappers); visual spot-check in a browser
      still recommended
- [x] 8.5 Loading skeletons + error boundaries
- [x] 8.6 Visual audit: max 2 accents/screen, 1 green button/view, no dead ends

## Phase 9 — Production readiness
- [x] 9.1 Lint + typecheck + build clean; `next start` smoke test
- [ ] 9.2 Lighthouse ≥ 90 perf/a11y on `/` — **needs a browser run** (no headless
      Chrome in this environment); all static JS ≤ 224 KB/chunk, fonts self-hosted,
      app routes server-rendered
- [x] 9.3 README: setup, scripts, architecture, repo seam, in-memory caveat, roadmap
- [x] 9.4 Final spec-vs-implementation traceability pass (FR-1…FR-6 → code)
- [x] 9.5 Handover notes + next-phase backlog (Postgres, auth, sprints, GitHub)

---

## Manual QA script (run at Phase 9)

1. `pnpm install && pnpm dev` → dashboard renders seeded data, no console errors.
2. Drag a task across 3 columns → status persists, toast fires, activity feed updates.
3. Create a critical issue, link a task → dashboard open-issue count increments.
4. Switch to Viewer → every mutation control disabled/hidden.
5. ⌘K → type "auth" → lands on the project.
6. Resize 375px → sidebar becomes drawer; all charts/tables usable.
7. Restart dev server → store reseeds (documented behavior).
