import { ArrowUpRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { ProjectActions } from "@/components/projects/project-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress";
import { computeProjectStats, PROJECT_STATUS_LABEL } from "@/lib/metrics";
import { store } from "@/lib/repo";
import { getSession } from "@/lib/server/session";
import { formatShortDate, isOverdue } from "@/lib/utils";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await getSession();
  const users = store.getUsers();
  const projects = store.getProjects();
  const stats = computeProjectStats(
    projects,
    store.getTasks(),
    store.getIssues(),
  );
  const role = session.role;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Portfolio"
        title="PROJECTS"
        description="Every initiative, its progress and whether it needs attention."
        actions={
          projects.length > 0 ? (
            <ProjectActions
              users={users}
              role={role}
              defaultLeadId={session.userId}
            />
          ) : undefined
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project to start grouping tasks, issues and progress."
          action={
            <ProjectActions
              users={users}
              role={role}
              defaultLeadId={session.userId}
            />
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const s = stats.find((x) => x.projectId === p.id)!;
            const lead = users.find((u) => u.id === p.leadId);
            const members = users.filter((u) =>
              store
                .getTasks()
                .some((t) => t.projectId === p.id && t.assigneeId === u.id),
            );
            const late = isOverdue(p.targetDate) && p.status !== "completed";

            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="group">
                <Panel className="h-full transition-all hover:border-primary/40 hover:shadow-float">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/20 font-head text-[13px] font-bold text-ink">
                        {p.key}
                      </span>
                      <div>
                        <h2 className="font-head text-[16px] font-bold leading-tight transition group-hover:text-link">
                          {p.name}
                        </h2>
                        <p className="text-xs text-ink-40">
                          {PROJECT_STATUS_LABEL[p.status]}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 text-ink-40 transition group-hover:text-link"
                      aria-hidden
                    />
                  </div>

                  <p className="mt-4 line-clamp-2 min-h-[40px] text-[13px] leading-relaxed text-ink-55">
                    {p.description || "No description yet."}
                  </p>

                  <div className="mt-5 flex items-center justify-between text-xs text-ink-40">
                    <span>
                      {s.done}/{s.total} tasks
                    </span>
                    <span
                      className={
                        s.health === "at_risk" ? "text-magenta" : "text-ink-40"
                      }
                    >
                      {s.openIssues} open issue{s.openIssues === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <ProgressBar
                      value={s.progress}
                      tone={s.health === "at_risk" ? "magenta" : "primary"}
                    />
                  </div>

                  <footer className="mt-5 flex items-center justify-between gap-3 border-t border-ink-06 pt-4">
                    <div className="flex -space-x-2">
                      {members.slice(0, 4).map((m) => (
                        <Avatar
                          key={m.id}
                          user={m}
                          size="xs"
                          ring
                          className="border-2 border-surface"
                        />
                      ))}
                      {members.length === 0 ? (
                        <Avatar user={lead} size="xs" ring />
                      ) : null}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${
                        late ? "text-magenta" : "text-ink-40"
                      }`}
                    >
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      {formatShortDate(p.targetDate)}
                    </span>
                  </footer>

                  {s.health === "at_risk" || late ? (
                    <Badge tone="magenta" className="mt-3">
                      {s.criticalIssues > 0
                        ? `${s.criticalIssues} critical`
                        : late
                          ? "Behind schedule"
                          : `${s.overdue} overdue`}
                    </Badge>
                  ) : null}
                </Panel>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
