import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { EditProjectButton } from "@/components/projects/edit-project-button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import {
  PROJECT_STATUS_LABEL,
  computeProjectStats,
} from "@/lib/metrics";
import { can } from "@/lib/permissions";
import { store } from "@/lib/repo";
import { getSession } from "@/lib/server/session";
import { cn, formatShortDate, isOverdue, toDate } from "@/lib/utils";

export const metadata = { title: "Project" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = store.getProject(id);
  if (!project) notFound();

  const session = await getSession();
  const tasks = store.getTasks().filter((t) => t.projectId === id);
  const issues = store.getIssues().filter((i) => i.projectId === id);
  const users = store.getUsers();
  const role = session.role;

  const stats = computeProjectStats([project], store.getTasks(), store.getIssues())[0];
  const lead = users.find((u) => u.id === project.leadId);
  const crew = users.filter((u) => tasks.some((t) => t.assigneeId === u.id));
  const late = isOverdue(project.targetDate) && project.status !== "completed";

  const elapsed = Math.max(
    1,
    Math.round((+new Date() - +(toDate(project.startDate) ?? new Date())) / 86400000),
  );

  const activity = store
    .getActivity(200)
    .filter(
      (e) =>
        e.entityId === id ||
        (e.entityType === "task" &&
          store.getTask(e.entityId)?.projectId === id) ||
        (e.entityType === "issue" &&
          store.getIssue(e.entityId)?.projectId === id),
    )
    .slice(0, 20)
    .map((e) => ({
      id: e.id,
      actor: store.getUser(e.actorId) ?? null,
      verb: e.verb,
      entityLabel: e.entityLabel,
      at: e.at,
      meta: e.meta,
    }));

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-ink-55 transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All projects
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/20 font-head text-base font-bold">
            {project.key}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  project.status === "completed"
                    ? "green"
                    : project.status === "on_hold"
                      ? "magenta"
                      : "primary"
                }
              >
                {PROJECT_STATUS_LABEL[project.status]}
              </Badge>
              {late ? <Badge tone="magenta">Behind schedule</Badge> : null}
            </div>
            <h1 className="mt-2 font-display text-[30px] font-bold leading-tight tracking-tight sm:text-[38px]">
              {project.name}
            </h1>
            <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-55">
              {project.description || "No description yet."}
            </p>
          </div>
        </div>

        {can(role, "project:write") ? (
          <EditProjectButton
            project={project}
            users={users}
          />
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Progress" value={`${stats.progress}%`}>
          <ProgressBar
            value={stats.progress}
            tone={stats.health === "at_risk" ? "magenta" : "primary"}
            className="mt-2"
          />
        </MiniStat>
        <MiniStat
          label="Open tasks"
          value={String(stats.open)}
          sub={`${stats.done} of ${stats.total} done`}
        />
        <MiniStat
          label="Open issues"
          value={String(stats.openIssues)}
          sub={
            stats.criticalIssues > 0
              ? `${stats.criticalIssues} critical`
              : "no criticals"
          }
          tone={stats.criticalIssues > 0 ? "magenta" : undefined}
        />
        <MiniStat
          label="Days running"
          value={String(elapsed)}
          sub={`target ${formatShortDate(project.targetDate)}`}
        />
      </div>

      <ProjectTabs
        projectId={id}
        project={project}
        tasks={tasks}
        issues={issues}
        users={users}
        role={role}
        lead={lead ?? null}
        crew={crew}
        activity={activity}
        startDate={project.startDate}
        targetDate={project.targetDate}
        status={project.status}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "magenta";
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-ink-06 bg-surface p-5">
      <p className="font-head text-[11px] font-bold uppercase tracking-[0.12em] text-ink-40">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-[32px] font-bold leading-none tracking-tight",
          tone === "magenta" ? "text-magenta" : "text-ink",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-xs text-ink-40">{sub}</p> : null}
      {children}
    </div>
  );
}
