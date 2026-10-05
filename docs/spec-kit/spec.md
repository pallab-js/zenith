# Zenith — SDA + PRD (spec.md)

**Product**: Zenith — an all-in-one central dashboard for software teams doing
vibecoding-style development: project management, progress tracking, task assignment,
issue tracking and team management in a single bird's-eye view.

**Status**: v1 approved scope. Source of truth for *what*; see `plan.md` for *how*.

---

## 1. Problem & goals

Software teams (especially AI-assisted "vibecoding" teams moving fast) scatter state
across a repo, a tracker, a board and a spreadsheet. Leads lose the bird's-eye view.

**Goals**
- G1 — One screen answers "is this project healthy?" in < 5 seconds.
- G2 — Tasks, issues, projects and people live in one system with one activity trail.
- G3 — Visual monitoring: charts beat tabular reading for progress, load and severity.
- G4 — A calm, non-cluttered UI per `constitution.md` §III, uniformly styled by `DESIGN.md`.

**Non-goals (v1)** — sprints/burndown, GitHub sync, real authentication, realtime
collaboration, mobile apps, notifications/email.

**Success metrics**
- M1 — Dashboard load shows health without navigation.
- M2 — Full task lifecycle (create → assign → move → complete) achievable in < 30s.
- M3 — Lighthouse ≥ 90 performance/a11y on the dashboard; 0 lint/type errors.

---

## 2. Personas

| Persona | Role | Needs |
|---|---|---|
| **Lead** (owner/admin) | Tech lead / founder | Health at a glance, blockers, who is overloaded |
| **Contributor** (member) | Dev / designer | Their tasks, moving work, filing issues |
| **Stakeholder** (viewer) | PM / client | Read-only progress view |

Roles: `owner`, `admin`, `member`, `viewer`. Viewers see everything, change nothing.
Members mutate tasks/issues they can access; admins+ manage projects and team.

---

## 3. Functional requirements

### FR-1 Dashboard (`/`)
- FR-1.1 Four stat cards: Active projects · Open tasks · Open issues · On-track %.
- FR-1.2 Charts: task-status donut, project progress bars, issues-by-severity,
  member workload bars, 30-day activity trend (area).
- FR-1.3 Project health table: project, progress, open tasks, open issues, risk flag.
- FR-1.4 Activity feed: latest 15 events with actor, verb, entity, relative time.
- FR-1.5 Acceptance: all widgets render from seed data with zero interaction; no widget
  duplicates another metric beyond the constitution's two-place limit.

### FR-2 Projects
- FR-2.1 List: card per project with progress ring, lead, task/issue counts, status.
- FR-2.2 Detail `/projects/[id]`: tabs Overview · Board · Issues · Activity.
- FR-2.3 Overview: description, dates, key metrics, milestone progress, members.
- FR-2.4 Create/edit project (owner/admin): name, key, description, status, dates.

### FR-3 Tasks
- FR-3.1 Board view: columns Backlog · Todo · In progress · In review · Done; drag-and-drop
  between columns persists status.
- FR-3.2 List view: sortable table (title, project, assignee, priority, due, status).
- FR-3.3 Filters: project, assignee, priority, status, label + text search. Collapsed by
  default behind one disclosure control.
- FR-3.4 Create/edit task: title, description, project, status, priority, assignee,
  due date, labels.
- FR-3.5 Task detail drawer: all fields, comments (optional v1.1), linked issues, activity.

### FR-4 Issues
- FR-4.1 List with severity (critical/high/medium/low), status (open/in progress/resolved),
  project, reporter, linked tasks.
- FR-4.2 Triage view: severity breakdown chart + critical-first ordering.
- FR-4.3 Create/edit issue; link/unlink tasks; resolve reopens nothing else.
- FR-4.4 Acceptance: resolving an issue emits activity and updates dashboard counts.

### FR-5 Team
- FR-5.1 Member list: avatar, name, role, open tasks, overdue, workload bar.
- FR-5.2 Role change (owner/admin) and remove member (owner).
- FR-5.3 Workload view: per-member assignment distribution, red flag when > WIP limit (7).
- FR-5.4 Mock session: a role switcher in the sidebar (and on `/sign-in`) simulates the
  signed-in user so permission enforcement is demonstrable without real auth. The picked
  identity is stored server-side in an httpOnly cookie — the browser can request a seat
  but cannot edit the session value itself.

### FR-6 Global
- FR-6.1 App shell: indigo sidebar (Dashboard, Projects, Tasks, Issues, Team), collapses
  to hamburger < 768px; top bar with search and ⌘K command palette.
- FR-6.2 Command palette: fuzzy jump to pages, projects, tasks, issues; create actions.
- FR-6.3 Toasts on every mutation; empty states on every empty view.
- FR-6.4 Every mutation writes an `ActivityEvent` and updates the dashboard feed.
- FR-6.5 Persist to in-memory store (state resets on server restart — documented).

---

## 4. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | TypeScript strict; no `any` in exported signatures |
| NFR-2 | Responsive: 375 / 768 / 1024 / 1280; sidebar → drawer below 768 |
| NFR-3 | a11y: landmarks, focus rings, ≥44px targets, ARIA on board/drawer, reduced-motion |
| NFR-4 | Performance: dashboard server-rendered; charts client-only; no layout shift |
| NFR-5 | Design tokens only — zero hard-coded colours outside `globals.css` |
| NFR-6 | `lint`, `typecheck`, `build` all green at every phase gate |
| NFR-7 | Repo seam documented so Postgres/Drizzle replaces in-memory in one file |

---

## 5. User stories (acceptance-mapped)

- US-1 As a lead I open `/` and see health, blockers and workload without clicking.
- US-2 As a lead I see who is overloaded before assigning more work.
- US-3 As a contributor I drag my task to *Done* and it is recorded in activity.
- US-4 As a lead I file a critical issue, link the task, and see it on the dashboard.
- US-5 As a viewer I can browse everything but see no enabled mutation controls.
- US-6 As any user I press ⌘K and jump to any project or task in two keystrokes.

---

## 6. Out-of-scope backlog (post-v1)

Sprints + burndown/velocity · GitHub issue/PR sync · real Auth.js + Postgres ·
comments & mentions · file attachments · notifications · saved views · dark/light theme.
