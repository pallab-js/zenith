# Zenith Constitution

> Prime directives for every contributor (human or agent). A change that violates any
> principle below is rejected regardless of how well it works.

## I. Spec before code

- Work proceeds Phase 0 → 9 as defined in `tasks.md`. No feature code exists before its
  requirement appears in `spec.md`.
- `spec.md` (what) is the source of truth. `plan.md` (how) may change freely; `spec.md`
  changes require user approval.

## II. One screen answers the question

- The dashboard is the product. A tech lead must answer "is the project healthy?" in
  **under 5 seconds, from a single screen, without clicking**.
- **Every widget must answer a real question.** If we cannot name the question a widget
  answers, it does not ship. No widget exists "because dashboards have them".
- Redundancy ban: the same metric may appear in **at most two** places (one summary
  number, one chart). Never three.

## III. Calm UI (anti-clutter law)

- **One primary action per view** — rendered in green (`#35ed7e`). Everything else primary
  is Blurple; secondary actions are ghost buttons.
- **Max two accent colours per screen** (Blurple + one of magenta/green).
- Filters, bulk actions and settings collapse behind a single disclosure control; never
  permanently visible unless the view is a dedicated management page.
- Dense data lives in tables/boards, not in card grids. Cards are reserved for stats,
  empty states and modals.
- Whitespace is a feature: 12-column container, section gaps ≥ 40px, no borders where a
  gap will do.
- If two elements compete for attention, delete one.

## IV. DESIGN.md is law

- All colour, type, radius, spacing and component specs derive from `DESIGN.md` via
  Tailwind 4 `@theme` tokens in `src/styles/globals.css`. **No hard-coded hex values in
  components.**
- Substitutes: Space Grotesk (display, 700–800) for ABC Ginto Nord; Inter (body) for
  ggsans.
- Depth comes from colour, gradient and radius — not drop shadows. The single permitted
  elevation is `0 3px 68px rgba(69,42,124,0.1)`.
- Green is reserved for the single highest-intent action on a screen. Never decorative.
- Corners are never square: 6–16px on controls, 40px on panels, pill on badges.

## V. Seams over rewrites

- All persistence goes through `src/lib/repo/types.ts`. UI never imports the in-memory
  adapter directly. Swapping to Postgres = one file.
- All mutations flow through Zod-validated server actions and emit an `ActivityEvent`.

## VI. Quality gates

- `pnpm lint`, `pnpm typecheck`, `pnpm build` must pass before a phase is "done".
- Responsive at 375px / 768px / 1280px. Keyboard accessible. Respect `prefers-reduced-motion`.
- Seeded demo data must make every chart look alive on first run.

## VII. Scope discipline

- v1 = projects, tasks, issues, team, dashboard, activity. Sprints, GitHub integration,
  real auth, realtime are **out of scope** until v1 ships.
- Every phase ends with a checkpoint review before the next begins.
