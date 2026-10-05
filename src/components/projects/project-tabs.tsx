"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { IssueFormModal } from "@/components/issues/issue-components";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { TaskFormModal } from "@/components/tasks/task-form-modal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ui/progress";
import {
  PROJECT_STATUS_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
} from "@/lib/metrics";
import { can } from "@/lib/permissions";
import type {
  Issue,
  Project,
  Role,
  Task,
  User,
} from "@/lib/repo/types";
import { cn, formatShortDate, isOverdue, relativeTime } from "@/lib/utils";

export type ActivityFeedItem = {
  id: string;
  actor: User | null;
  verb: string;
  entityLabel: string;
  at: string;
  meta?: string;
};

export function ProjectTabs({
  projectId,
  project,
  tasks,
  issues,
  users,
  role,
  lead,
  crew,
  activity,
  startDate,
  targetDate,
  status,
}: {
  projectId: string;
  project: Project;
  tasks: Task[];
  issues: Issue[];
  users: User[];
  role: Role;
  lead: User | null;
  crew: User[];
  activity: ActivityFeedItem[];
  startDate: string;
  targetDate: string;
  status: Project["status"];
}) {
  const [tab, setTab] = useState("overview");
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);
  const [createTask, setCreateTask] = useState(false);
  const [createIssue, setCreateIssue] = useState(false);

  const canEdit = can(role, "task:write");
  const canEditIssue = can(role, "issue:write");

  const openIssues = issues.filter((i) => i.status !== "resolved");
  const done = tasks.filter((t) => t.status === "done").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const late = isOverdue(targetDate) && status !== "completed";

  const label = (id: string) => {
    if (id === "board") return "Board";
    if (id === "issues") return "Issues";
    if (id === "activity") return "Activity";
    return "Overview";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "overview", label: label("overview") },
            { id: "board", label: label("board"), count: tasks.length },
            { id: "issues", label: label("issues"), count: openIssues.length },
            { id: "activity", label: label("activity") },
          ]}
        />
        {canEdit ? (
          <Button
            variant="green"
            size="sm"
            onClick={() => setCreateTask(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            New task
          </Button>
        ) : null}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel className="lg:col-span-2">
            <PanelHeader title="Milestones" hint="How the work is stacking up" />
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-baseline justify-between text-sm">
                  <span className="text-ink-70">Overall completion</span>
                  <span className="font-head font-bold tabular-nums">
                    {progress}%
                  </span>
                </div>
                <ProgressBar
                  value={progress}
                  tone={late ? "magenta" : "primary"}
                />
              </div>

              <ul className="grid gap-2.5 sm:grid-cols-2">
                {Object.entries(STATUS_LABEL).map(([k, v]) => {
                  const count = tasks.filter(
                    (t) => t.status === (k as Task["status"]),
                  ).length;
                  return (
                    <li
                      key={k}
                      className="flex items-center justify-between rounded-sm bg-canvas/60 px-3.5 py-2.5 text-sm"
                    >
                      <span className="text-ink-55">{v}</span>
                      <span className="font-head font-bold tabular-nums">
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="grid gap-3 border-t border-ink-06 pt-4 sm:grid-cols-2">
                <Fact label="Start" value={formatShortDate(startDate)} />
                <Fact
                  label="Target"
                  value={formatShortDate(targetDate)}
                  tone={late ? "magenta" : undefined}
                />
                <Fact label="Status" value={PROJECT_STATUS_LABEL[status]} />
                <Fact
                  label="Open issues"
                  value={String(openIssues.length)}
                  tone={
                    issues.some(
                      (i) => i.severity === "critical" && i.status !== "resolved",
                    )
                      ? "magenta"
                      : undefined
                  }
                />
              </div>
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel>
              <PanelHeader title="Lead" />
              <div className="flex items-center gap-3">
                <Avatar user={lead} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-head text-[15px] font-bold">
                    {lead?.name ?? "Unassigned"}
                  </p>
                  <p className="truncate text-[13px] text-ink-55">
                    {lead?.title ?? "—"}
                  </p>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                title="Crew"
                hint={`${crew.length} ${crew.length === 1 ? "person" : "people"} with assigned work`}
              />
              {crew.length === 0 ? (
                <p className="text-sm text-ink-40">No tasks assigned yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {crew.map((m) => {
                    const open = tasks.filter(
                      (t) => t.assigneeId === m.id && t.status !== "done",
                    ).length;
                    return (
                      <li key={m.id} className="flex items-center gap-3">
                        <Avatar user={m} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {m.name}
                        </span>
                        <Badge tone={open > 5 ? "magenta" : "neutral"}>
                          {open} open
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "board" ? (
        <TaskBoard
          tasks={tasks}
          users={users}
          canEdit={canEdit}
          onOpenTask={setDrawerTask}
        />
      ) : null}

      {tab === "issues" ? (
        <ProjectIssues
          issues={issues}
          tasks={tasks}
          users={users}
          canEdit={canEditIssue}
          onCreate={() => setCreateIssue(true)}
        />
      ) : null}

      {tab === "activity" ? <ProjectActivity events={activity} /> : null}

      {drawerTask ? (
        <TaskDrawer
          task={drawerTask}
          projects={[project]}
          users={users}
          issues={issues}
          canEdit={canEdit}
          onClose={() => setDrawerTask(null)}
        />
      ) : null}

      {createTask ? (
        <TaskFormModal
          open={createTask}
          onClose={() => setCreateTask(false)}
          projects={[project]}
          users={users}
          overrides={{ projectId }}
        />
      ) : null}

      {createIssue ? (
        <IssueFormModal
          open={createIssue}
          onClose={() => setCreateIssue(false)}
          projects={[project]}
          users={users}
          defaultProjectId={projectId}
        />
      ) : null}
    </div>
  );
}

function Fact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "magenta";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-ink-40">{label}</span>
      <span
        className={cn(
          "font-head font-medium",
          tone === "magenta" ? "text-magenta" : "text-ink-70",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ProjectIssues({
  issues,
  tasks,
  users,
  canEdit,
  onCreate,
}: {
  issues: Issue[];
  tasks: Task[];
  users: User[];
  canEdit: boolean;
  onCreate: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = issues.find((i) => i.id === activeId) ?? null;

  const sorted = useMemo(
    () =>
      [...issues].sort((a, b) => {
        const ar = a.status === "resolved" ? 1 : 0;
        const br = b.status === "resolved" ? 1 : 0;
        if (ar !== br) return ar - br;
        return (
          ["critical", "high", "medium", "low"].indexOf(a.severity) -
          ["critical", "high", "medium", "low"].indexOf(b.severity)
        );
      }),
    [issues],
  );

  return (
    <>
      {sorted.length === 0 ? (
        <EmptyState
          title="No issues for this project"
          description={
            canEdit
              ? "File one when something blocks the work — it feeds the dashboard triage view."
              : "Nothing has been reported here yet."
          }
          action={
            canEdit ? (
              <Button variant="green" onClick={onCreate} icon={<Plus className="h-4 w-4" />}>
                New issue
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((i) => {
            const assignee = users.find((u) => u.id === i.assigneeId);
            const linked = i.linkedTaskIds
              .map((id) => tasks.find((t) => t.id === id))
              .filter(Boolean) as Task[];
            return (
              <li key={i.id}>
                <button
                  onClick={() => setActiveId(i.id)}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-lg border border-ink-06 bg-surface p-4 text-left transition",
                    "hover:border-ink-12 hover:shadow-float",
                    i.status === "resolved" && "opacity-65",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-head text-[13px] font-bold text-ink-40">
                        {i.key}
                      </span>
                      <span className="font-head text-[15px] font-bold">
                        {i.title}
                      </span>
                    </span>
                    <span className="mt-1.5 block text-xs text-ink-40">
                      {linked.length > 0
                        ? linked.map((t) => t.title).join(" · ")
                        : `Filed ${relativeTime(i.createdAt)}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge
                      tone={
                        i.status === "resolved"
                          ? "green"
                          : i.severity === "critical"
                            ? "magenta"
                            : i.severity === "high"
                              ? "primary"
                              : "neutral"
                      }
                    >
                      {i.status === "resolved"
                        ? "Resolved"
                        : SEVERITY_LABEL[i.severity]}
                    </Badge>
                    <Avatar user={assignee} size="sm" className="hidden sm:inline-flex" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <IssueQuickView
        issue={active}
        tasks={tasks}
        users={users}
        onClose={() => setActiveId(null)}
      />
    </>
  );
}

/* Lightweight in-tab issue panel — reuses the drawer when opened from /issues,
   this keeps the project page free of another modal layer. */
function IssueQuickView({
  issue,
  tasks,
  users,
  onClose,
}: {
  issue: Issue | null;
  tasks: Task[];
  users: User[];
  onClose: () => void;
}) {
  if (!issue) return null;
  const assignee = users.find((u) => u.id === issue.assigneeId);
  const linked = issue.linkedTaskIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter(Boolean) as Task[];

  return (
    <div className="fixed inset-0 z-[75]">
      <button
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Close issue"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Issue ${issue.key}`}
        className="absolute inset-x-4 bottom-4 top-auto mx-auto max-w-lg rounded-lg border border-ink-12 bg-canvas p-5 shadow-modal animate-fade-up sm:inset-x-auto sm:right-6 sm:top-6 sm:bottom-6 sm:mx-0 sm:w-[400px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">{issue.key}</Badge>
            <Badge tone={issue.severity === "critical" ? "magenta" : "primary"}>
              {SEVERITY_LABEL[issue.severity]}
            </Badge>
            <Badge tone={issue.status === "resolved" ? "green" : "link"}>
              {STATUS_LABEL[issue.status === "in_progress" ? "in_progress" : "todo"] ??
                issue.status}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-ink-40 hover:bg-ink-06 hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <h3 className="mt-4 font-display text-lg font-bold leading-tight">
          {issue.title}
        </h3>
        {issue.description ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-70">
            {issue.description}
          </p>
        ) : null}

        <dl className="mt-4 space-y-2 rounded-lg bg-surface/60 p-3.5 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-40">Assignee</dt>
            <dd className="flex items-center gap-2">
              <Avatar user={assignee} size="xs" />
              {assignee?.name ?? "Unassigned"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-40">Filed</dt>
            <dd>{relativeTime(issue.createdAt)}</dd>
          </div>
        </dl>

        <p className="mt-4 font-head text-[12px] font-bold uppercase tracking-[0.08em] text-ink-40">
          Linked tasks
        </p>
        {linked.length === 0 ? (
          <p className="mt-1.5 text-sm text-ink-40">
            None — link tasks from the Issues page.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {linked.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-sm bg-surface/60 px-3 py-2 text-[13px]"
              >
                <span className="truncate">{t.title}</span>
                <span className="shrink-0 text-xs text-ink-40">
                  {STATUS_LABEL[t.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProjectActivity({ events }: { events: ActivityFeedItem[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Moves, assignments and issue changes on this project will appear here."
      />
    );
  }

  return (
    <Panel>
      <PanelHeader title="Project activity" hint="Newest first" />
      <ol className="space-y-1">
        {events.map((e) => (
          <li
            key={e.id}
            className="flex items-start gap-3 rounded-sm px-2 py-2.5 hover:bg-ink-06"
          >
            <Avatar user={e.actor} size="sm" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-ink-70">
                <span className="font-head font-bold text-ink">
                  {e.actor?.name.split(" ")[0] ?? "Someone"}
                </span>{" "}
                {e.verb} <span className="text-ink">{e.entityLabel}</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-40">
                {relativeTime(e.at)}
                {e.meta ? ` · ${e.meta}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
