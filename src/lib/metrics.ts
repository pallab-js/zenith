import type {
  ActivityEvent,
  Issue,
  Project,
  Role,
  Task,
  User,
} from "@/lib/repo/types";

export interface ProjectStats {
  projectId: string;
  total: number;
  done: number;
  open: number;
  overdue: number;
  openIssues: number;
  criticalIssues: number;
  progress: number;
  /** Simple health: behind schedule or heavy criticals = at risk. */
  health: "on_track" | "at_risk" | "done";
}

export interface MemberStats {
  userId: string;
  openTasks: number;
  doneTasks: number;
  overdueTasks: number;
  activeIssues: number;
  workload: number;
  overLimit: boolean;
}

export interface DashboardData {
  users: User[];
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  activity: ActivityEvent[];
  currentUser: User;
  role: Role;
  stats: {
    activeProjects: number;
    openTasks: number;
    openIssues: number;
    onTrackPct: number;
    overdue: number;
  };
  statusCounts: { label: string; value: number; color: string }[];
  severityCounts: { label: string; value: number; color: string }[];
  workload: { name: string; open: number; done: number; color: string }[];
  trend: { day: string; events: number }[];
  projectStats: ProjectStats[];
}

export const STATUS_ORDER: Task["status"][] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

export const STATUS_LABEL: Record<Task["status"], string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

export const PRIORITY_LABEL: Record<Task["priority"], string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const SEVERITY_LABEL: Record<Issue["severity"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PROJECT_STATUS_LABEL: Record<Project["status"], string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
};

/** Chart palette — brand chord only (constitution §III: two accents max). */
export const CHART_COLORS = {
  primary: "var(--color-primary)",
  magenta: "var(--color-magenta)",
  green: "var(--color-green)",
  violet: "var(--color-violet)",
  link: "var(--color-link)",
  dim: "var(--color-hairline)",
};

const STATUS_COLOR: Record<Task["status"], string> = {
  backlog: "var(--color-hairline)",
  todo: "var(--color-link)",
  in_progress: "var(--color-primary)",
  in_review: "var(--color-violet)",
  done: "var(--color-green)",
};

const SEVERITY_COLOR: Record<Issue["severity"], string> = {
  critical: "var(--color-magenta)",
  high: "var(--color-primary)",
  medium: "var(--color-link)",
  low: "var(--color-hairline)",
};

export function computeProjectStats(
  projects: Project[],
  tasks: Task[],
  issues: Issue[],
): ProjectStats[] {
  return projects.map((p) => {
    const pt = tasks.filter((t) => t.projectId === p.id);
    const done = pt.filter((t) => t.status === "done").length;
    const open = pt.length - done;
    const pi = issues.filter((i) => i.projectId === p.id && i.status !== "resolved");
    const overdue = pt.filter(
      (t) =>
        t.status !== "done" &&
        t.dueDate &&
        new Date(t.dueDate) < new Date(new Date().toDateString()),
    ).length;
    const critical = pi.filter((i) => i.severity === "critical").length;
    const progress = pt.length === 0 ? 0 : Math.round((done / pt.length) * 100);

    let health: ProjectStats["health"] = "on_track";
    if (p.status === "completed") health = "done";
    else if (critical > 0 || overdue >= 2) health = "at_risk";

    return {
      projectId: p.id,
      total: pt.length,
      done,
      open,
      overdue,
      openIssues: pi.length,
      criticalIssues: critical,
      progress,
      health,
    };
  });
}

export function computeMemberStats(
  userIds: string[],
  tasks: Task[],
  issues: Issue[],
  wipLimit = 7,
): MemberStats[] {
  return userIds.map((userId) => {
    const mine = tasks.filter((t) => t.assigneeId === userId);
    const open = mine.filter((t) => t.status !== "done");
    const overdue = open.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString()),
    );
    const activeIssues = issues.filter(
      (i) => i.assigneeId === userId && i.status !== "resolved",
    );
    const workload = open.length;
    return {
      userId,
      openTasks: open.length,
      doneTasks: mine.length - open.length,
      overdueTasks: overdue.length,
      activeIssues: activeIssues.length,
      workload,
      overLimit: workload > wipLimit,
    };
  });
}

export function buildDashboardData(db: {
  users: User[];
  memberships: { userId: string; role: Role }[];
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  activity: ActivityEvent[];
  currentUserId: string;
}): DashboardData {
  const { users, projects, tasks, issues, activity } = db;
  const currentUser = users.find((u) => u.id === db.currentUserId) ?? users[0];
  const role =
    db.memberships.find((m) => m.userId === currentUser.id)?.role ?? "viewer";

  const projectStats = computeProjectStats(projects, tasks, issues);
  const activeProjects = projects.filter(
    (p) => p.status === "active" || p.status === "planning",
  ).length;
  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const openIssues = issues.filter((i) => i.status !== "resolved").length;
  const onTrack = projectStats.filter((s) => s.health === "on_track").length;
  const finished = projectStats.filter((s) => s.health === "done").length;
  const denom = projectStats.length - finished;
  const onTrackPct = denom <= 0 ? 100 : Math.round((onTrack / denom) * 100);
  const overdue = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.dueDate &&
      new Date(t.dueDate) < new Date(new Date().toDateString()),
  ).length;

  const statusCounts = STATUS_ORDER.map((s) => ({
    label: STATUS_LABEL[s],
    value: tasks.filter((t) => t.status === s).length,
    color: STATUS_COLOR[s],
  }));

  const severityCounts = (["critical", "high", "medium", "low"] as const).map(
    (s) => ({
      label: SEVERITY_LABEL[s],
      value: issues.filter(
        (i) => i.severity === s && i.status !== "resolved",
      ).length,
      color: SEVERITY_COLOR[s],
    }),
  );

  const memberStats = computeMemberStats(
    users.map((u) => u.id),
    tasks,
    issues,
  );
  const workload = users.map((u, idx) => {
    const ms = memberStats[idx];
    return {
      name: u.name.split(" ")[0],
      open: ms.openTasks,
      done: ms.doneTasks,
      color:
        idx % 3 === 0
          ? CHART_COLORS.primary
          : idx % 3 === 1
            ? CHART_COLORS.magenta
            : CHART_COLORS.violet,
    };
  });

  // 30-day activity trend
  const days: { day: string; events: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const count = activity.filter((a) => {
      const t = +new Date(a.at);
      return t >= +d && t < +next;
    }).length;
    days.push({
      day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      events: count,
    });
  }

  return {
    users,
    projects,
    tasks,
    issues,
    activity,
    currentUser,
    role,
    stats: { activeProjects, openTasks, openIssues, onTrackPct, overdue },
    statusCounts,
    severityCounts,
    workload,
    trend: days,
    projectStats,
  };
}
