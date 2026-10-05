/**
 * Smoke test for the repository seam + mutation path (constitution §V, tasks 2.6).
 * Run: pnpm tsx scripts/smoke.ts
 */
import { store } from "../src/lib/repo/in-memory";
import { buildDashboardData, computeMemberStats } from "../src/lib/metrics";
import { can } from "../src/lib/permissions";

let failures = 0;
function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}`, extra ?? "");
  }
}

console.log("\nSeed");
const db = store.db;
check("6 users", db.users.length === 6, db.users.length);
check("3 projects", db.projects.length === 3, db.projects.length);
check("40 tasks", db.tasks.length === 40, db.tasks.length);
check("18 issues", db.issues.length === 18, db.issues.length);
check("activity seeded", db.activity.length >= 40, db.activity.length);
check(
  "every task references a project",
  db.tasks.every((t) => db.projects.some((p) => p.id === t.projectId)),
);
check(
  "every issue references a project",
  db.issues.every((i) => db.projects.some((p) => p.id === i.projectId)),
);
check(
  "no orphan assignees",
  db.tasks.every(
    (t) => t.assigneeId === null || db.users.some((u) => u.id === t.assigneeId),
  ),
);

console.log("\nMetrics");
const data = buildDashboardData(db);
check("status counts sum to task total",
  data.statusCounts.reduce((s, x) => s + x.value, 0) === db.tasks.length);
check("severity counts <= open issues",
  data.severityCounts.reduce((s, x) => s + x.value, 0) <=
    db.issues.filter((i) => i.status !== "resolved").length);
check("trend has 30 buckets", data.trend.length === 30, data.trend.length);
check("on-track % in range",
  data.stats.onTrackPct >= 0 && data.stats.onTrackPct <= 100,
  data.stats.onTrackPct);
check("project stats cover all projects",
  data.projectStats.length === db.projects.length);
check("workload covers all users", data.workload.length === db.users.length);

console.log("\nMutations");
const before = store.getTasks().length;
const created = store.createTask({
  projectId: db.projects[0].id,
  title: "Smoke test task",
  description: "",
  status: "todo",
  priority: "high",
  assigneeId: db.users[1].id,
  dueDate: null,
  labels: ["qa"],
});
check("task created", store.getTasks().length === before + 1);
check("activity emitted for create",
  store.getActivity(5).some((a) => a.entityId === created.id));

store.moveTask(created.id, "done", 0);
check("move persists status", store.getTask(created.id)?.status === "done");
check("activity emitted for move",
  store.getActivity(5).some((a) => a.entityId === created.id && a.verb === "moved"));

store.deleteTask(created.id);
check("task deleted", store.getTasks().length === before);

const issue = store.createIssue({
  projectId: db.projects[0].id,
  title: "Smoke test issue",
  description: "",
  severity: "critical",
  status: "open",
  assigneeId: null,
  linkedTaskIds: [],
});
store.updateIssue(issue.id, { ...issue, status: "resolved" });
check("resolve sets resolvedAt",
  store.getIssue(issue.id)?.resolvedAt != null);
check("resolve logged",
  store.getActivity(5).some((a) => a.entityId === issue.id && a.verb === "resolved"));

console.log("\nPermissions");
check("viewer can't write tasks", !can("viewer", "task:write"));
check("member can write tasks", can("member", "task:write"));
check("member can't manage projects", !can("member", "project:write"));
check("admin can manage projects", can("admin", "project:write"));
check("admin can't remove members", !can("admin", "member:remove"));
check("owner can remove members", can("owner", "member:remove"));

console.log("\nWorkload");
const stats = computeMemberStats(
  db.users.map((u) => u.id),
  store.getTasks(),
  store.getIssues(),
);
check("stats per user", stats.length === db.users.length);
check("workload is non-negative", stats.every((s) => s.workload >= 0));

console.log(
  failures === 0
    ? "\nAll smoke checks passed.\n"
    : `\n${failures} check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
