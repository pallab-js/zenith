import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Flame,
} from "lucide-react";
import Link from "next/link";
import {
  DonutChart,
  SeverityChart,
  TrendChart,
  WorkloadChart,
} from "@/components/charts/charts";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { buildDashboardData, PROJECT_STATUS_LABEL } from "@/lib/metrics";
import { can } from "@/lib/permissions";
import { store } from "@/lib/repo";
import { getSession } from "@/lib/server/session";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const VERB_COPY: Record<string, string> = {
  created: "created",
  updated: "updated",
  moved: "moved",
  assigned: "assigned",
  resolved: "resolved",
  closed: "closed",
  reopened: "reopened",
  commented: "commented on",
  linked: "linked tasks to",
};

export default async function DashboardPage() {
  const session = await getSession();
  const data = buildDashboardData({
    users: store.getUsers(),
    memberships: store.getMemberships(),
    projects: store.getProjects(),
    tasks: store.getTasks(),
    issues: store.getIssues(),
    activity: store.getActivity(200),
    currentUserId: session.userId,
  });
  const { stats, projectStats, projects, users, activity } = data;
  const writable = can(data.role, "task:write");

  return (
    <div className="space-y-6">
      {/* Hero — the single gradient-mesh wash on this view */}
      <div className="brand-mesh rounded-xl border border-ink-06 px-6 py-8 sm:px-9 sm:py-10">
        <p className="text-eyebrow">Bird&apos;s-eye view</p>
        <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold leading-[1.08] tracking-tight sm:text-[42px]">
          EVERY PROJECT.
          <br />
          ONE PULSE.
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-ink-70">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
          {" · "}
          {stats.openTasks} tasks in flight, {stats.openIssues} issues open,
          {" "}
          {stats.overdue > 0
            ? `${stats.overdue} overdue across the board.`
            : "nothing overdue."}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Active projects"
          value={stats.activeProjects}
          detail={`${projects.length} total in workspace`}
        />
        <StatCard
          label="Open tasks"
          value={stats.openTasks}
          detail={
            stats.overdue > 0
              ? `${stats.overdue} past due`
              : "all on schedule"
          }
          tone="surface"
        />
        <StatCard
          label="Open issues"
          value={stats.openIssues}
          detail={
            data.issues.filter(
              (i) => i.severity === "critical" && i.status !== "resolved",
            ).length > 0
              ? `${data.issues.filter((i) => i.severity === "critical" && i.status !== "resolved").length} critical`
              : "no criticals"
          }
          tone="surface"
        />
        <StatCard
          label="On track"
          value={`${stats.onTrackPct}%`}
          detail="projects healthy right now"
        />
      </div>

      {/* Row: task mix + activity trend */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Task mix" hint="Where work sits today" />
          <DonutChart
            data={data.statusCounts}
            centerLabel="tasks"
            centerValue={String(data.tasks.length)}
            ariaLabel="Task status distribution donut chart"
          />
        </Panel>

        <Panel className="lg:col-span-3">
          <PanelHeader
            title="Activity trend"
            hint="Mutations logged over the last 30 days"
          />
          <TrendChart
            data={data.trend}
            ariaLabel="30-day activity trend area chart"
          />
        </Panel>
      </div>

      {/* Row: health table + feed */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelHeader
            title="Project health"
            hint="Progress, blockers and risk in one pass"
            action={
              <Link
                href="/projects"
                className="inline-flex items-center gap-1 text-sm font-medium text-link transition hover:opacity-80"
              >
                All projects <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description="Create your first project to start tracking progress."
            />
          ) : (
            <Table>
              <THead>
                <TH>Project</TH>
                <TH className="text-right">Progress</TH>
                <TH className="text-right">Open</TH>
                <TH className="text-right">Issues</TH>
                <TH>Status</TH>
              </THead>
              <tbody>
                {projects.map((p) => {
                  const s = projectStats.find((x) => x.projectId === p.id)!;
                  const lead = users.find((u) => u.id === p.leadId);
                  return (
                    <TR key={p.id}>
                      <TD>
                        <Link
                          href={`/projects/${p.id}`}
                          className="group flex items-center gap-2.5"
                        >
                          <Avatar user={lead} size="xs" />
                          <span>
                            <span className="block font-head font-bold text-ink transition group-hover:text-link">
                              {p.name}
                            </span>
                            <span className="block text-xs text-ink-50">
                              {p.key} · {PROJECT_STATUS_LABEL[p.status]}
                            </span>
                          </span>
                        </Link>
                      </TD>
                      <TD className="w-[180px]">
                        <div className="flex items-center gap-2.5">
                          <ProgressBar
                            value={s.progress}
                            tone={s.health === "at_risk" ? "magenta" : "primary"}
                            className="flex-1"
                          />
                          <span className="w-9 text-right font-head text-xs font-bold tabular-nums">
                            {s.progress}%
                          </span>
                        </div>
                      </TD>
                      <TD className="text-right tabular-nums">{s.open}</TD>
                      <TD className="text-right">
                        <span
                          className={
                            s.openIssues > 0
                              ? "tabular-nums text-magenta"
                              : "tabular-nums text-ink-50"
                          }
                        >
                          {s.openIssues}
                        </span>
                      </TD>
                      <TD>
                        {s.health === "done" ? (
                          <Badge tone="green">
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </Badge>
                        ) : s.health === "at_risk" ? (
                          <Badge tone="magenta">
                            <AlertTriangle className="h-3 w-3" /> At risk
                          </Badge>
                        ) : (
                          <Badge tone="primary">On track</Badge>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="Latest activity" hint="Every mutation, newest first" />
          {activity.length === 0 ? (
            <EmptyState
              title="Quiet in here"
              description="Activity appears as soon as the team moves work."
            />
          ) : (
            <ol className="space-y-0.5">
              {activity.slice(0, 15).map((a) => {
                const actor = users.find((u) => u.id === a.actorId);
                return (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 rounded-sm px-2 py-2.5 transition-colors hover:bg-ink-06"
                  >
                    <Avatar user={actor} size="sm" className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-ink-70">
                        <span className="font-head font-bold text-ink">
                          {actor?.name.split(" ")[0] ?? "Someone"}
                        </span>{" "}
                        {VERB_COPY[a.verb] ?? a.verb}{" "}
                        <span className="text-ink">{a.entityLabel}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-50">
                        <span>{relativeTime(a.at)}</span>
                        {a.meta ? <span>· {a.meta}</span> : null}
                      </p>
                    </div>
                    <span className="mt-1 shrink-0 text-ink-50">
                      {a.entityType === "issue" ? (
                        <CircleDot className="h-3.5 w-3.5" />
                      ) : a.verb === "resolved" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green" />
                      ) : a.entityType === "project" ? (
                        <Flame className="h-3.5 w-3.5" />
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>

      {/* Row: severity + workload */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Open issues by severity"
            hint="Triage order, critical first"
            action={
              <Link
                href="/issues"
                className="inline-flex items-center gap-1 text-sm font-medium text-link transition hover:opacity-80"
              >
                Triage <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <SeverityChart
            data={data.severityCounts}
            ariaLabel="Open issues by severity bar chart"
          />
        </Panel>

        <Panel>
          <PanelHeader
            title="Team workload"
            hint="Open vs. completed tasks per person"
            action={
              writable ? (
                <Badge tone="neutral">WIP limit 7</Badge>
              ) : null
            }
          />
          <WorkloadChart
            data={data.workload}
            ariaLabel="Team workload bar chart"
          />
          <p className="mt-3 flex items-center gap-2 text-xs text-ink-50">
            <span
              className="h-2.5 w-2.5 rounded-pill bg-primary"
              aria-hidden
            />
            open
            <span
              className="ml-2 h-2.5 w-2.5 rounded-pill bg-ink-12"
              aria-hidden
            />
            completed
          </p>
        </Panel>
      </div>
    </div>
  );
}
