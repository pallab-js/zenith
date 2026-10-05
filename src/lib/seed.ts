import type {
  ActivityEvent,
  DBShape,
  Issue,
  Project,
  Task,
  User,
} from "@/lib/repo/types";
import { daysAgo, daysFromNow } from "@/lib/utils";

/* ── Users ────────────────────────────────────────────────── */

const users: User[] = [
  {
    id: "usr_avery",
    name: "Avery Chen",
    email: "avery@zenith.dev",
    title: "Engineering Lead",
    avatarColor: "var(--color-primary)",
  },
  {
    id: "usr_mira",
    name: "Mira Okafor",
    email: "mira@zenith.dev",
    title: "Full-stack Developer",
    avatarColor: "var(--color-magenta)",
  },
  {
    id: "usr_dmitri",
    name: "Dmitri Volkov",
    email: "dmitri@zenith.dev",
    title: "Frontend Engineer",
    avatarColor: "var(--color-violet)",
  },
  {
    id: "usr_sana",
    name: "Sana Iqbal",
    email: "sana@zenith.dev",
    title: "Product Designer",
    avatarColor: "var(--color-link)",
  },
  {
    id: "usr_leo",
    name: "Leo Marchetti",
    email: "leo@zenith.dev",
    title: "Backend Engineer",
    avatarColor: "var(--color-green)",
  },
  {
    id: "usr_priya",
    name: "Priya Raman",
    email: "priya@zenith.dev",
    title: "QA & Release",
    avatarColor: "var(--color-primary-soft)",
  },
];

const memberships = [
  { userId: "usr_avery", role: "owner" as const },
  { userId: "usr_mira", role: "admin" as const },
  { userId: "usr_dmitri", role: "member" as const },
  { userId: "usr_sana", role: "member" as const },
  { userId: "usr_leo", role: "member" as const },
  { userId: "usr_priya", role: "member" as const },
];

/* ── Projects ─────────────────────────────────────────────── */

const projects: Project[] = [
  {
    id: "prj_orbit",
    key: "ORB",
    name: "Orbit Analytics",
    description:
      "Real-time product analytics engine — event ingestion, funnels and retention cohorts for the flagship SaaS.",
    status: "active",
    leadId: "usr_avery",
    startDate: daysAgo(74),
    targetDate: daysFromNow(26),
    createdAt: daysAgo(80),
  },
  {
    id: "prj_pulse",
    key: "PLS",
    name: "Pulse Mobile App",
    description:
      "React Native companion app: push notifications, offline drafts and the new onboarding flow.",
    status: "active",
    leadId: "usr_mira",
    startDate: daysAgo(52),
    targetDate: daysAgo(6),
    createdAt: daysAgo(58),
  },
  {
    id: "prj_harbor",
    key: "HBR",
    name: "Harbor Design System",
    description:
      "Token-driven component library and documentation site shared by every product surface.",
    status: "planning",
    leadId: "usr_sana",
    startDate: daysAgo(14),
    targetDate: daysFromNow(72),
    createdAt: daysAgo(20),
  },
];

/* ── Tasks ────────────────────────────────────────────────── */

type TaskSeed = Omit<Task, "createdAt" | "updatedAt" | "order"> & {
  age: number;
};

const taskSeeds: TaskSeed[] = [
  // Orbit Analytics — done/progress mix (14)
  t("prj_orbit", "Event ingestion pipeline v2", "done", "high", "usr_leo", 46, 4, ["backend"]),
  t("prj_orbit", "Kafka consumer lag dashboard", "done", "medium", "usr_leo", 40, 3, ["observability"]),
  t("prj_orbit", "Funnel query optimizer", "done", "urgent", "usr_avery", 34, 6, ["perf"]),
  t("prj_orbit", "Cohort retention charts", "in_review", "high", "usr_dmitri", 20, 2, ["frontend"]),
  t("prj_orbit", "SQL builder refactor", "in_progress", "high", "usr_avery", 16, 7, ["backend"]),
  t("prj_orbit", "Realtime websocket fanout", "in_progress", "urgent", "usr_leo", 11, 4, ["backend"]),
  t("prj_orbit", "Dashboard empty states", "in_progress", "low", "usr_sana", 9, 1, ["design"]),
  t("prj_orbit", "Session replay sampling", "todo", "medium", "usr_mira", 8, 1, ["product"]),
  t("prj_orbit", "Billing meter integration", "todo", "high", "usr_priya", 6, 1, ["billing"]),
  t("prj_orbit", "API rate-limit tiers", "todo", "medium", null, 5, null, ["backend"]),
  t("prj_orbit", "Data retention policy config", "backlog", "low", null, 12, null, ["compliance"]),
  t("prj_orbit", "Warehouse export (BigQuery)", "backlog", "medium", null, 10, null, ["backend"]),
  t("prj_orbit", "Anomaly alerts beta", "backlog", "high", null, 7, null, ["ml"]),
  t("prj_orbit", "Instrument docs site events", "todo", "low", "usr_dmitri", 4, 1, ["frontend"]),

  // Pulse Mobile App — slipping schedule (14)
  t("prj_pulse", "Push notification service", "done", "urgent", "usr_mira", 44, 5, ["mobile"]),
  t("prj_pulse", "Offline draft sync", "done", "high", "usr_mira", 36, 8, ["mobile"]),
  t("prj_pulse", "Auth biometric unlock", "done", "medium", "usr_leo", 28, 4, ["security"]),
  t("prj_pulse", "Onboarding carousel", "in_review", "medium", "usr_sana", 18, 3, ["design"]),
  t("prj_pulse", "Deep-link routing table", "in_progress", "high", "usr_dmitri", 14, 5, ["mobile"]),
  t("prj_pulse", "Crash reporting rollout", "in_progress", "urgent", "usr_priya", 12, 6, ["observability"]),
  t("prj_pulse", "Store screenshots + listing", "in_progress", "medium", "usr_sana", 10, 2, ["release"]),
  t("prj_pulse", "iOS build pipeline", "todo", "high", "usr_priya", 9, 4, ["ci"]),
  t("prj_pulse", "Inbox swipe gestures", "todo", "medium", "usr_dmitri", 7, 1, ["mobile"]),
  t("prj_pulse", "Tablet layout pass", "backlog", "low", null, 6, null, ["design"]),
  t("prj_pulse", "Widget: today summary", "backlog", "medium", null, 5, null, ["mobile"]),
  t("prj_pulse", "Localisation (es, de, ja)", "backlog", "medium", null, 11, null, ["i18n"]),
  t("prj_pulse", "Rate the app prompt", "backlog", "low", null, 3, null, ["growth"]),
  t("prj_pulse", "Fix: cold start regression", "in_progress", "urgent", "usr_mira", 3, 9, ["perf", "bug"]),

  // Harbor Design System — early (12)
  t("prj_harbor", "Audit existing component debt", "done", "high", "usr_sana", 13, 5, ["audit"]),
  t("prj_harbor", "Token architecture (color/typo)", "in_progress", "urgent", "usr_sana", 12, 6, ["tokens"]),
  t("prj_harbor", "Button + Input primitives", "in_progress", "high", "usr_dmitri", 9, 5, ["components"]),
  t("prj_harbor", "Form controls accessibility", "todo", "high", "usr_dmitri", 6, 3, ["a11y"]),
  t("prj_harbor", "Data table pattern", "todo", "medium", "usr_dmitri", 5, 4, ["components"]),
  t("prj_harbor", "Icon set consolidation", "backlog", "low", null, 8, null, ["icons"]),
  t("prj_harbor", "Documentation site scaffold", "backlog", "medium", null, 10, null, ["docs"]),
  t("prj_harbor", "Dark theme contrast audit", "backlog", "medium", "usr_priya", 7, 3, ["a11y"]),
  t("prj_harbor", "Contribution guide", "backlog", "low", null, 4, null, ["docs"]),
  t("prj_harbor", "Versioning & changelog flow", "backlog", "medium", null, 6, null, ["process"]),
  t("prj_harbor", "Storybook chromatic CI", "backlog", "medium", null, 5, null, ["ci"]),
  t("prj_harbor", "Motion primitives spec", "todo", "low", "usr_sana", 4, 8, ["design"]),
];

function t(
  projectId: string,
  title: string,
  status: Task["status"],
  priority: Task["priority"],
  assigneeId: string | null,
  age: number,
  dueIn: number | null,
  labels: string[],
): TaskSeed {
  return {
    id: `tsk_${projectId.slice(4, 8)}_${title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14)}`,
    projectId,
    title,
    description: "",
    status,
    priority,
    assigneeId,
    dueDate: dueIn === null ? null : daysFromNow(dueIn),
    labels,
    age,
  };
}

/* ── Issues ───────────────────────────────────────────────── */

type IssueSeed = Omit<Issue, "createdAt" | "resolvedAt"> & { age: number };

const issueSeeds: IssueSeed[] = [
  i("prj_pulse", "IOS-142", "Cold start exceeds 4s on iPhone 12", "critical", "in_progress", "usr_priya", "usr_mira", [], 3),
  i("prj_orbit", "ORB-88", "Funnel counts double-count returning users", "critical", "open", "usr_avery", "usr_leo", [], 5),
  i("prj_orbit", "ORB-91", "Websocket drops under 10k concurrent", "high", "in_progress", "usr_leo", "usr_leo", [], 6),
  i("prj_pulse", "IOS-138", "Push token rotates on every app resume", "high", "open", "usr_mira", null, [], 8),
  i("prj_orbit", "ORB-76", "Chart tooltip flickers on hover", "medium", "open", "usr_dmitri", "usr_dmitri", [], 12),
  i("prj_harbor", "HBR-12", "Focus ring invisible on magenta fills", "high", "open", "usr_priya", "usr_sana", [], 4),
  i("prj_pulse", "IOS-131", "Offline drafts lose attachments", "critical", "open", "usr_mira", "usr_mira", [], 9),
  i("prj_orbit", "ORB-69", "Cohort export ignores timezone", "medium", "resolved", "usr_priya", "usr_avery", [], 21),
  i("prj_pulse", "IOS-127", "Biometric prompt loops after reinstall", "high", "resolved", "usr_leo", "usr_leo", [], 24),
  i("prj_orbit", "ORB-94", "Dashboard loads 3.1MB of JS", "high", "open", "usr_avery", "usr_dmitri", [], 7),
  i("prj_harbor", "HBR-9", "Button sizes drift across products", "medium", "in_progress", "usr_sana", "usr_dmitri", [], 6),
  i("prj_pulse", "IOS-135", "Tablet: settings list clips", "low", "open", "usr_sana", null, [], 10),
  i("prj_orbit", "ORB-72", "Retry storm on 429 responses", "high", "resolved", "usr_leo", "usr_leo", [], 18),
  i("prj_pulse", "IOS-140", "Deep link opens blank screen", "high", "in_progress", "usr_dmitri", "usr_dmitri", [], 4),
  i("prj_harbor", "HBR-14", "Docs site 404s on token pages", "low", "open", "usr_sana", null, [], 3),
  i("prj_orbit", "ORB-81", "Retention email uses stale logo", "low", "resolved", "usr_sana", "usr_sana", [], 26),
  i("prj_pulse", "IOS-144", "Android: back button exits app", "medium", "open", "usr_priya", "usr_mira", [], 2),
  i("prj_orbit", "ORB-97", "Ingest lag spikes at UTC midnight", "medium", "open", "usr_avery", "usr_leo", [], 1),
];

function i(
  projectId: string,
  key: string,
  title: string,
  severity: Issue["severity"],
  status: Issue["status"],
  reporterId: string,
  assigneeId: string | null,
  linkedTaskIds: string[],
  age: number,
): IssueSeed {
  return {
    id: `iss_${key.toLowerCase().replace("-", "")}`,
    key,
    projectId,
    title,
    description: "",
    severity,
    status,
    reporterId,
    assigneeId,
    linkedTaskIds,
    age,
  };
}

/* ── Build ────────────────────────────────────────────────── */

export function buildSeed(): DBShape {
  const now = Date.now();
  const createdAt = (age: number) => new Date(now - age * 86400000).toISOString();

  const tasks: Task[] = taskSeeds.map((seed, idx) => {
    const { age, ...rest } = seed;
    return {
      ...rest,
      order: idx,
      createdAt: createdAt(age),
      updatedAt: createdAt(Math.max(0, age - (idx % 7))),
      description: "",
    };
  });

  const issues: Issue[] = issueSeeds.map((seed) => {
    const { age, ...rest } = seed;
    const resolved = rest.status === "resolved";
    return {
      ...rest,
      createdAt: createdAt(age),
      resolvedAt: resolved ? createdAt(Math.max(0, age - 4)) : null,
      description: "",
    };
  });

  const activity = buildActivity(tasks, issues, createdAt);

  return {
    users,
    memberships: memberships.map((m) => ({ ...m })),
    projects: projects.map((p) => ({ ...p })),
    tasks,
    issues,
    comments: [],
    activity,
    currentUserId: "usr_avery",
  };
}

function buildActivity(
  tasks: Task[],
  issues: Issue[],
  createdAt: (age: number) => string,
): ActivityEvent[] {
  const events: Omit<ActivityEvent, "id">[] = [];

  const recentTasks = [...tasks]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 26);
  recentTasks.forEach((task) => {
    const actor = task.assigneeId ?? "usr_avery";
    events.push({
      actorId: actor,
      verb: task.status === "done" ? "moved" : "updated",
      entityType: "task",
      entityId: task.id,
      entityLabel: task.title,
      meta: task.status.replace("_", " "),
      at: task.updatedAt,
    });
  });

  issues.slice(0, 18).forEach((issue) => {
    const verb =
      issue.status === "resolved"
        ? "resolved"
        : issue.assigneeId
          ? "assigned"
          : "created";
    events.push({
      actorId:
        verb === "created" ? issue.reporterId : (issue.assigneeId ?? issue.reporterId),
      verb,
      entityType: "issue",
      entityId: issue.id,
      entityLabel: `${issue.key} ${issue.title}`,
      meta: issue.severity,
      at: issue.resolvedAt ?? issue.createdAt,
    });
    if (issue.status === "open") {
      events.push({
        actorId: issue.reporterId,
        verb: "created",
        entityType: "issue",
        entityId: issue.id,
        entityLabel: `${issue.key} ${issue.title}`,
        meta: issue.severity,
        at: issue.createdAt,
      });
    }
  });

  const projectEvents: Omit<ActivityEvent, "id">[] = [
    { actorId: "usr_avery", verb: "updated", entityType: "project", entityId: "prj_orbit", entityLabel: "Orbit Analytics", meta: "milestone 3 of 4", at: createdAt(2) },
    { actorId: "usr_mira", verb: "updated", entityType: "project", entityId: "prj_pulse", entityLabel: "Pulse Mobile App", meta: "target date passed", at: createdAt(4) },
    { actorId: "usr_sana", verb: "created", entityType: "project", entityId: "prj_harbor", entityLabel: "Harbor Design System", meta: "planning", at: createdAt(20) },
    { actorId: "usr_priya", verb: "assigned", entityType: "task", entityId: tasks[15]?.id ?? "", entityLabel: tasks[15]?.title ?? "Crash reporting rollout", meta: "to Priya Raman", at: createdAt(1) },
    { actorId: "usr_dmitri", verb: "linked", entityType: "issue", entityId: "iss_ios140", entityLabel: "IOS-140 Deep link opens blank screen", meta: "Deep-link routing table", at: createdAt(1) },
  ];

  return [...events, ...projectEvents]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 60)
    .map((e, idx) => ({ ...e, id: `act_${idx}` }));
}
