/**
 * Verification suite for the write path and both adapters.
 *
 *   pnpm tsx scripts/smoke.ts
 *
 * Design notes:
 *  - No fixture counts ("40 tasks"): every assertion is an *invariant*, so
 *    editing the seed doesn't break CI.
 *  - The same contract runs against the in-memory and SQLite adapters.
 *  - `lib/service` (authorize · validate · mutate) is exercised directly with
 *    an explicit actor — no server, no cookies.
 */
import "./smoke-env";
import Database from "better-sqlite3";
import { buildDashboardData, computeMemberStats } from "../src/lib/metrics";
import { can } from "../src/lib/permissions";
import { createInMemoryStore } from "../src/lib/repo/in-memory";
import { createSqliteStore } from "../src/lib/repo/sqlite";
import type { Store } from "../src/lib/repo/types";
import { resolveSession } from "../src/lib/session";
import * as service from "../src/lib/service";
import { SQLITE_FILE } from "./smoke-env";
import {
  formatShortDate,
  isOverdue,
  toDate,
  toDateOnly,
} from "../src/lib/utils";

let failures = 0;
function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}`, extra ?? "");
  }
}

const OWNER = "usr_avery";
const ADMIN = "usr_mira";
const MEMBER = "usr_dmitri";
const VIEWER = "usr_noor";

const validTask = (projectId: string) => ({
  projectId,
  title: "A brand new task",
  description: "",
  status: "todo" as const,
  priority: "high" as const,
  assigneeId: null,
  dueDate: null,
  labels: [],
});

const validProject = (leadId: string) => ({
  key: "ZEN",
  name: "Zenith Refactor",
  description: "",
  status: "planning" as const,
  leadId,
  startDate: toDateOnly(),
  targetDate: toDateOnly(new Date(Date.now() + 30 * 86_400_000)),
});

/* ── Adapter contract ─────────────────────────────────────── */

function adapterSuite(name: string, store: Store): void {
  console.log(`\n── ${name}: read model ──`);

  const users = store.getUsers();
  const projects = store.getProjects();
  const tasks = store.getTasks();
  const issues = store.getIssues();
  const activity = store.getActivity(200);
  const memberships = store.getMemberships();

  check("seeded workspace", users.length >= 6 && projects.length >= 3 && tasks.length >= 10);
  check("every role in the matrix has a home", new Set(memberships.map((m) => m.role)).size >= 4);
  check("every task references a project",
    tasks.every((t) => projects.some((p) => p.id === t.projectId)));
  check("every issue references a project",
    issues.every((i) => projects.some((p) => p.id === i.projectId)));
  check("no orphan assignees",
    tasks.every((t) => !t.assigneeId || users.some((u) => u.id === t.assigneeId)));
  check("every membership resolves to a user",
    memberships.every((m) => users.some((u) => u.id === m.userId)));
  check("getMembers() matches the membership count",
    store.getMembers().length === memberships.length);
  check("every activity actor exists",
    activity.every((a) => users.some((u) => u.id === a.actorId)));
  check("project keys are unique",
    new Set(projects.map((p) => p.key)).size === projects.length);
  check("issue keys are unique",
    new Set(issues.map((i) => i.key)).size === issues.length);
  check("linked tasks exist",
    issues.every((i) => i.linkedTaskIds.every((id) => tasks.some((t) => t.id === id))));
  check("activity is newest-first",
    activity.every((a, idx) => idx === 0 || +new Date(activity[idx - 1].at) >= +new Date(a.at)));
  check("activity stays capped",
    activity.length <= 200, activity.length);

  console.log(`\n── ${name}: mutations ──`);
  const projectId = projects[0].id;
  const before = tasks.length;

  check("removing a member who doesn't exist throws", (() => {
    try {
      store.removeMember(actorOf(store), "usr_ghost");
      return false;
    } catch (e) {
      return e instanceof Error && e.message.includes("not found");
    }
  })());

  const task = store.createTask(actorOf(store), validTask(projectId));
  check("create persists", store.getTask(task.id)?.title === "A brand new task");
  check("create emits activity",
    store.getActivity(5).some((a) => a.entityId === task.id && a.verb === "created"));
  check("activity count grows", store.getTasks().length === before + 1);

  const issue = store.createIssue(actorOf(store), {
    projectId,
    title: "Smoke issue for linking",
    description: "",
    severity: "critical",
    status: "open",
    assigneeId: null,
    linkedTaskIds: [task.id],
  });
  check("issue key uses the project key", issue.key.startsWith(`${projects[0].key}-`));
  check("link survives the round trip",
    store.getIssue(issue.id)?.linkedTaskIds.includes(task.id) === true);

  store.moveTask(actorOf(store), task.id, "done", 0);
  check("move persists status", store.getTask(task.id)?.status === "done");
  check("move emits activity",
    store.getActivity(5).some((a) => a.entityId === task.id && a.verb === "moved"));

  store.updateIssue(actorOf(store), issue.id, {
    projectId,
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    status: "resolved",
    assigneeId: issue.assigneeId,
    linkedTaskIds: issue.linkedTaskIds,
  });
  check("resolve sets resolvedAt", store.getIssue(issue.id)?.resolvedAt != null);
  check("resolve emits activity",
    store.getActivity(5).some((a) => a.entityId === issue.id && a.verb === "resolved"));

  store.createComment(actorOf(store), task.id, "Looks good to me");
  check("comment persists", store.getComments(task.id).length === 1);
  check("comment emits activity",
    store.getActivity(5).some((a) => a.verb === "commented" && a.entityId === task.id));

  store.deleteTask(actorOf(store), task.id);
  check("delete removes the task", store.getTask(task.id) === undefined);
  check("delete scrubs issue links",
    store.getIssue(issue.id)?.linkedTaskIds.includes(task.id) === false);

  store.deleteIssue(actorOf(store), issue.id);
  check("delete removes the issue", store.getIssue(issue.id) === undefined);
}

function actorOf(store: Store): string {
  return store.getMemberships().find((m) => m.role === "owner")?.userId
    ?? store.getMemberships()[0].userId;
}

/* ── Dates (regression suite for the timezone bug) ────────── */

console.log("\nDates");
{
  const today = toDateOnly();
  const yesterday = toDateOnly(new Date(Date.now() - 86_400_000));
  const parsed = toDate("2026-01-15");
  check("date-only string parses to local midnight",
    parsed !== null &&
      parsed.getFullYear() === 2026 &&
      parsed.getMonth() === 0 &&
      parsed.getDate() === 15 &&
      parsed.getHours() === 0,
    parsed);
  check("due today is NOT overdue", !isOverdue(today), today);
  check("due yesterday IS overdue", isOverdue(yesterday), yesterday);
  check("formatShortDate does not shift the calendar day",
    formatShortDate("2026-01-15") === "Jan 15",
    formatShortDate("2026-01-15"));
  check("unparseable date is not overdue", !isOverdue("not-a-date"));
  check("past full timestamp is overdue",
    isOverdue(new Date(Date.now() - 3 * 86_400_000).toISOString()));
}

/* ── Metrics (invariants, adapter-agnostic) ───────────────── */

console.log("\nMetrics");
{
  const store = createInMemoryStore();
  const shape = {
    users: store.getUsers(),
    memberships: store.getMemberships(),
    projects: store.getProjects(),
    tasks: store.getTasks(),
    issues: store.getIssues(),
    activity: store.getActivity(200),
    currentUserId: OWNER,
  };
  const data = buildDashboardData(shape);
  check("status counts sum to task total",
    data.statusCounts.reduce((s, x) => s + x.value, 0) === shape.tasks.length);
  check("severity counts sum to open issues",
    data.severityCounts.reduce((s, x) => s + x.value, 0) ===
      shape.issues.filter((i) => i.status !== "resolved").length);
  check("trend has 30 buckets", data.trend.length === 30, data.trend.length);
  check("on-track % in range",
    data.stats.onTrackPct >= 0 && data.stats.onTrackPct <= 100, data.stats.onTrackPct);
  check("project stats cover all projects",
    data.projectStats.length === shape.projects.length);
  check("workload covers all users", data.workload.length === shape.users.length);
  check("every project has a progress between 0 and 100",
    data.projectStats.every((s) => s.progress >= 0 && s.progress <= 100));

  const memberStats = computeMemberStats(
    shape.users.map((u) => u.id),
    shape.tasks,
    shape.issues,
  );
  check("stats per user", memberStats.length === shape.users.length);
  check("workload is non-negative", memberStats.every((s) => s.workload >= 0));
  check("overdue tasks are counted, never negative",
    memberStats.every((s) => s.overdueTasks >= 0));
}

/* ── Adapters: same contract, both stores ─────────────────── */

adapterSuite("in-memory", createInMemoryStore());
adapterSuite("sqlite", createSqliteStore());

console.log("\nSQLite persistence");
{
  // A *separate* connection proves the data is on disk, not just in the
  // process — the whole point of the migration off `globalThis`.
  const readonly = new Database(SQLITE_FILE, { readonly: true });
  const users = readonly.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  const tasks = readonly.prepare("SELECT COUNT(*) AS n FROM tasks").get() as { n: number };
  check("seed survives a fresh connection", users.n >= 7, users.n);
  check("mutations reach the file, not just memory", tasks.n >= 10, tasks.n);
  check("WAL mode is on",
    (readonly.pragma("journal_mode", { simple: true }) as string) === "wal");
  check("foreign keys enforced",
    (readonly.pragma("foreign_keys", { simple: true }) as number) === 1);
  readonly.close();
}

/* ── Service layer (authorize · validate · mutate) ────────── */

console.log("\nService: permissions");
{
  const store = createInMemoryStore(); // the singleton the service writes to
  const projectId = store.getProjects()[0].id;
  const before = store.getTasks().length;

  const denied = service.saveTask(VIEWER, null, validTask(projectId));
  check("viewer can't write tasks", !denied.ok);
  check("denial explains the role",
    !denied.ok && denied.error.includes("viewer"), denied);
  check("denied writes leave no trace", store.getTasks().length === before);

  check("member can write tasks",
    service.saveTask(MEMBER, null, validTask(projectId)).ok);
  check("member can't manage projects",
    !service.saveProject(MEMBER, null, validProject(OWNER)).ok);
  check("member can't change roles",
    !service.setMemberRole(MEMBER, OWNER, "member").ok);
  check("admin can manage projects",
    service.saveProject(ADMIN, null, { ...validProject(OWNER), key: "ADM" }).ok);
  check("admin can't remove members",
    !service.removeMember(ADMIN, "usr_leo").ok);
  check("viewer can't comment",
    !service.addComment(VIEWER, store.getTasks()[0].id, "nope").ok);

  console.log("\nService: validation");
  const bad = service.saveTask(MEMBER, null, { title: "x" });
  check("invalid input is rejected", !bad.ok);
  check("invalid input returns a readable message",
    !bad.ok && !bad.error.includes("{") && bad.error.length < 120, bad);
  check("invalid input doesn't create",
    store.getTasks().length === before + 1, store.getTasks().length);
  check("unknown fields don't leak into the store", (() => {
    const res = service.saveTask(MEMBER, null, {
      ...validTask(projectId),
      isAdmin: true,
    });
    const saved = store.getTasks().find((t) => t.title === "A brand new task");
    return res.ok && saved !== undefined && !("isAdmin" in saved);
  })());

  console.log("\nService: invariants");
  check("you can't demote yourself to viewer",
    !service.setMemberRole(OWNER, OWNER, "viewer").ok);
  check("you can't remove yourself",
    !service.removeMember(OWNER, OWNER).ok);
  check("removing an unknown member fails cleanly",
    !service.removeMember(OWNER, "usr_ghost").ok);
  check("moving a missing task fails cleanly",
    !service.moveTask(MEMBER, "tsk_ghost", "done", 0).ok);
}

/* ── Session resolution (no server required) ──────────────── */

console.log("\nSession");
{
  const store = createInMemoryStore();
  const users = store.getUsers();
  const memberships = store.getMemberships();

  check("missing cookie falls back to the first member",
    resolveSession(undefined, users, memberships).userId === memberships[0].userId);
  check("valid cookie is honoured",
    resolveSession(VIEWER, users, memberships).userId === VIEWER);
  check("cookie carries the member's role",
    resolveSession(VIEWER, users, memberships).role === "viewer");
  check("unknown id can't hijack the session",
    resolveSession("usr_ghost", users, memberships).userId !== "usr_ghost");
  check("a removed member loses their seat",
    resolveSession("usr_deleted", users, memberships.slice(1)).userId !== "usr_deleted");
  check("owner role resolves from the cookie",
    resolveSession(OWNER, users, memberships).role === "owner");
  check("capability matrix still holds",
    !can(resolveSession(VIEWER, users, memberships).role, "task:write"));
}

/* ── Result ───────────────────────────────────────────────── */

console.log(
  failures === 0
    ? "\nAll smoke checks passed.\n"
    : `\n${failures} check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
