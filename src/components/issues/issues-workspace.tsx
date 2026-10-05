"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { SeverityChart } from "@/components/charts/charts";
import { IssueDrawer, IssueFormModal } from "@/components/issues/issue-components";
import { SEVERITY_LABEL } from "@/lib/metrics";
import type { Issue, IssueSeverity, Project, Task, User } from "@/lib/repo/types";
import type { Role } from "@/lib/repo/types";
import { can } from "@/lib/permissions";
import { cn, relativeTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Select } from "@/components/ui/input";

const SEVERITY_ORDER: IssueSeverity[] = ["critical", "high", "medium", "low"];
const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  critical: "var(--color-magenta)",
  high: "var(--color-primary)",
  medium: "var(--color-link)",
  low: "var(--color-hairline)",
};

export function IssuesWorkspace({
  issues,
  tasks,
  projects,
  users,
  role,
}: {
  issues: Issue[];
  tasks: Task[];
  projects: Project[];
  users: User[];
  role: Role;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const canEdit = can(role, "issue:write");

  // URL is the single source of truth (⌘K deep links, back button).
  const drawerId = params.get("issue");
  const createOpen = params.get("new") === "1";

  const severityFilter = params.get("severity") ?? "";
  const statusFilter = params.get("status") ?? "";

  const visible = useMemo(() => {
    const rank = (i: Issue) => SEVERITY_ORDER.indexOf(i.severity);
    return issues
      .filter((i) => {
        if (severityFilter && i.severity !== severityFilter) return false;
        if (statusFilter && i.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        // Resolved sinks; severity orders the rest (triage-first).
        const ar = a.status === "resolved" ? 1 : 0;
        const br = b.status === "resolved" ? 1 : 0;
        if (ar !== br) return ar - br;
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      });
  }, [issues, severityFilter, statusFilter]);

  const drawerIssue = issues.find((i) => i.id === drawerId) ?? null;

  const openBySeverity = SEVERITY_ORDER.map((s) => ({
    label: SEVERITY_LABEL[s],
    value: issues.filter((i) => i.severity === s && i.status !== "resolved").length,
    color: SEVERITY_COLOR[s],
  }));

  const criticals = issues.filter(
    (i) => i.severity === "critical" && i.status !== "resolved",
  ).length;

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const closeDrawer = () => setParam("issue", null);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Severity breakdown"
            hint="Open issues only — this is the triage queue"
          />
          <SeverityChart
            data={openBySeverity}
            ariaLabel="Open issues by severity"
          />
        </Panel>

        <Panel className={cn(criticals > 0 && "border-magenta/40")}>
          <PanelHeader title="Needs attention" />
          <p className="font-display text-[52px] font-bold leading-none text-magenta">
            {criticals}
          </p>
          <p className="mt-2 text-sm text-ink-55">
            critical {criticals === 1 ? "issue is" : "issues are"} unresolved
            right now.
          </p>
          {criticals > 0 ? (
            <p className="mt-4 rounded-lg bg-magenta/10 px-3.5 py-3 text-[13px] leading-relaxed text-ink-70">
              {issues
                .filter((i) => i.severity === "critical" && i.status !== "resolved")
                .slice(0, 2)
                .map((i) => i.title)
                .join(" · ")}
            </p>
          ) : null}
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="min-w-[150px]">
          <span className="sr-only">Filter by severity</span>
          <Select
            value={severityFilter}
            onChange={(e) => setParam("severity", e.target.value)}
          >
            <option value="">All severities</option>
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </Select>
        </label>
        <label className="min-w-[150px]">
          <span className="sr-only">Filter by status</span>
          <Select
            value={statusFilter}
            onChange={(e) => setParam("status", e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </Select>
        </label>

        <span className="ml-auto text-xs text-ink-50 tabular-nums">
          {visible.length} of {issues.length}
        </span>

        {canEdit ? (
          <Button
            variant="green"
            onClick={() => setParam("new", "1")}
            icon={<Plus className="h-4 w-4" />}
          >
            New issue
          </Button>
        ) : null}
      </div>

      <ul className="space-y-2.5">
        {visible.map((i) => {
          const project = projects.find((p) => p.id === i.projectId);
          const assignee = users.find((u) => u.id === i.assigneeId);
          const resolved = i.status === "resolved";
          return (
            <li key={i.id}>
              <button
                onClick={() => setParam("issue", i.id)}
                className={cn(
                  "flex w-full items-start gap-4 rounded-lg border border-ink-06 bg-surface p-4 text-left",
                  "transition hover:border-ink-12 hover:shadow-float",
                  resolved && "opacity-65",
                )}
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-pill"
                  style={{ background: SEVERITY_COLOR[i.severity] }}
                  aria-label={SEVERITY_LABEL[i.severity]}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-head text-[13px] font-bold text-ink-50">
                      {i.key}
                    </span>
                    <span className="font-head text-[15px] font-bold text-ink">
                      {i.title}
                    </span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-50">
                    <span>{project?.name ?? "—"}</span>
                    <span>· {relativeTime(i.createdAt)}</span>
                    {i.linkedTaskIds.length > 0 ? (
                      <span>· {i.linkedTaskIds.length} linked</span>
                    ) : null}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <Badge
                    tone={
                      resolved
                        ? "green"
                        : i.severity === "critical"
                          ? "magenta"
                          : i.severity === "high"
                            ? "primary"
                            : "neutral"
                    }
                  >
                    {resolved ? "Resolved" : SEVERITY_LABEL[i.severity]}
                  </Badge>
                  <Avatar user={assignee} size="sm" className="hidden sm:inline-flex" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {drawerIssue ? (
        <IssueDrawer
          issue={drawerIssue}
          tasks={tasks}
          users={users}
          projects={projects}
          canEdit={canEdit}
          onClose={closeDrawer}
        />
      ) : null}

      {createOpen ? (
        <IssueFormModal
          open={createOpen}
          onClose={() => setParam("new", null)}
          projects={projects}
          users={users}
          defaultProjectId={params.get("project") ?? undefined}
        />
      ) : null}
    </div>
  );
}
