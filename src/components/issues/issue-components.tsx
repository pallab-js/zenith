"use client";

import { CircleDot, Link2, Unlink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deleteIssueAction, linkIssueTasksAction, saveIssue } from "@/lib/actions";
import { SEVERITY_LABEL, STATUS_LABEL as TASK_STATUS_LABEL } from "@/lib/metrics";
import { issueInputSchema, type IssueForm } from "@/lib/schemas";
import type { Issue, Project, Task, User } from "@/lib/repo/types";
import { cn, relativeTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";

export function IssueFormModal({
  open,
  onClose,
  issue,
  projects,
  users,
  defaultProjectId,
}: {
  open: boolean;
  onClose: () => void;
  issue?: Issue | null;
  projects: Project[];
  users: User[];
  defaultProjectId?: string;
}) {
  const [form, setForm] = useState<IssueForm>(() =>
    issue
      ? {
          projectId: issue.projectId,
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
          status: issue.status,
          assigneeId: issue.assigneeId,
          linkedTaskIds: issue.linkedTaskIds,
        }
      : {
          projectId: defaultProjectId ?? projects[0]?.id ?? "",
          title: "",
          description: "",
          severity: "medium",
          status: "open",
          assigneeId: null,
          linkedTaskIds: [],
        },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const set = <K extends keyof IssueForm>(k: K, v: IssueForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const parsed = issueInputSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[String(i.path[0])] = i.message;
      });
      setErrors(next);
      setBusy(false);
      return;
    }
    const res = await saveIssue(issue?.id ?? null, parsed.data);
    setBusy(false);
    if (res.ok) {
      toast.success(issue ? "Issue updated" : `${res.data.key} filed`);
      onClose();
    } else toast.error(res.error);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={issue ? `Edit ${issue.key}` : "New issue"}
      description={
        issue
          ? "Severity drives the dashboard triage view."
          : "Report a bug, blocker or technical debt item."
      }
      className="sm:max-w-xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" htmlFor="i-title" error={errors.title}>
          <Input
            id="i-title"
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Dashboard loads 3MB of JS"
          />
        </Field>

        <Field label="Description" htmlFor="i-desc" hint="optional">
          <Textarea
            id="i-desc"
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Steps to reproduce, expected vs actual…"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Project" htmlFor="i-proj" error={errors.projectId}>
            <Select
              id="i-proj"
              value={form.projectId}
              onChange={(e) => set("projectId", e.target.value)}
            >
              <option value="">Choose a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.key} · {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Severity" htmlFor="i-sev">
            <Select
              id="i-sev"
              value={form.severity}
              onChange={(e) => set("severity", e.target.value as IssueForm["severity"])}
            >
              {Object.entries(SEVERITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Status" htmlFor="i-status">
            <Select
              id="i-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value as IssueForm["status"])}
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </Select>
          </Field>
          <Field label="Assignee" htmlFor="i-assignee">
            <Select
              id="i-assignee"
              value={form.assigneeId ?? ""}
              onChange={(e) => set("assigneeId", e.target.value || null)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : issue ? "Save changes" : "File issue"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Issue detail drawer with task linking ───────────────── */

export function IssueDrawer({
  issue,
  tasks,
  users,
  projects,
  canEdit,
  onClose,
}: {
  issue: Issue;
  tasks: Task[];
  users: User[];
  projects: Project[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const [linkedIds, setLinkedIds] = useState<string[]>(issue.linkedTaskIds);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === issue.projectId),
    [tasks, issue.projectId],
  );

  const project = projects.find((p) => p.id === issue.projectId);
  const reporter = users.find((u) => u.id === issue.reporterId);
  const assignee = users.find((u) => u.id === issue.assigneeId);

  async function toggleLink(taskId: string) {
    if (!canEdit || busy) return;
    const next = linkedIds.includes(taskId)
      ? linkedIds.filter((id) => id !== taskId)
      : [...linkedIds, taskId];
    setLinkedIds(next);
    setBusy(true);
    const res = await linkIssueTasksAction(issue!.id, next);
    setBusy(false);
    if (res.ok) toast.success("Links updated");
    else {
      setLinkedIds(issue!.linkedTaskIds);
      toast.error(res.error);
    }
  }

  async function setStatus(status: Issue["status"]) {
    if (!canEdit) return;
    const res = await saveIssue(issue!.id, {
      projectId: issue!.projectId,
      title: issue!.title,
      description: issue!.description,
      severity: issue!.severity,
      status,
      assigneeId: issue!.assigneeId,
      linkedTaskIds: issue!.linkedTaskIds,
    });
    if (res.ok)
      toast.success(status === "resolved" ? "Issue resolved" : "Status updated");
    else toast.error(res.error);
  }

  async function remove() {
    const res = await deleteIssueAction(issue!.id);
    if (res.ok) {
      toast.success("Issue deleted");
      onClose();
    } else toast.error(res.error);
  }

  return (
    <div className="fixed inset-0 z-[75]">
      <button
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close issue details"
        tabIndex={-1}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Issue ${issue.key}`}
        className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-ink-12 bg-canvas shadow-modal animate-fade-up"
      >
        <header className="flex items-start justify-between gap-3 border-b border-ink-06 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{issue.key}</Badge>
            <Badge
              tone={
                issue.severity === "critical"
                  ? "magenta"
                  : issue.severity === "high"
                    ? "primary"
                    : "neutral"
              }
            >
              {SEVERITY_LABEL[issue.severity]}
            </Badge>
            <Badge tone={issue.status === "resolved" ? "green" : "link"}>
              {issue.status === "in_progress"
                ? "In progress"
                : issue.status === "resolved"
                  ? "Resolved"
                  : "Open"}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-40 transition hover:bg-ink-06 hover:text-ink"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <h2 className="font-display text-[21px] font-bold leading-tight tracking-tight">
            {issue.title}
          </h2>

          {issue.description ? (
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-surface/60 p-3.5 text-[13px] leading-relaxed text-ink-70">
              {issue.description}
            </p>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-40">
              <CircleDot className="h-4 w-4" aria-hidden />
              No description provided.
            </p>
          )}

          <dl className="mt-5 space-y-2.5 rounded-lg bg-surface/60 p-3.5 text-[13px]">
            <MetaRow label="Project" value={project?.name ?? "—"} />
            <MetaRow label="Filed" value={relativeTime(issue.createdAt)} />
            {issue.resolvedAt ? (
              <MetaRow label="Resolved" value={relativeTime(issue.resolvedAt)} />
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-40">Reporter</dt>
              <dd className="flex items-center gap-2">
                <Avatar user={reporter} size="xs" />
                {reporter?.name}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-40">Assignee</dt>
              <dd className="flex items-center gap-2">
                <Avatar user={assignee} size="xs" />
                {assignee?.name ?? "Unassigned"}
              </dd>
            </div>
          </dl>

          {canEdit ? (
            <div className="mt-5">
              <p className="mb-2 font-head text-[12px] font-bold uppercase tracking-[0.08em] text-ink-40">
                Resolution
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={issue.status === "resolved" ? "ghost" : "green"}
                  onClick={() => setStatus("resolved")}
                  disabled={issue.status === "resolved"}
                >
                  Mark resolved
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStatus("in_progress")}
                  disabled={issue.status === "in_progress"}
                >
                  In progress
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStatus("open")}
                  disabled={issue.status === "open"}
                >
                  Reopen
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="mb-2 flex items-center gap-2 font-head text-[12px] font-bold uppercase tracking-[0.08em] text-ink-40">
              <Link2 className="h-3.5 w-3.5" aria-hidden />
              Linked tasks · {linkedIds.length}
            </p>
            {projectTasks.length === 0 ? (
              <p className="text-[13px] text-ink-40">
                This project has no tasks to link.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {projectTasks.map((t) => {
                  const on = linkedIds.includes(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => toggleLink(t.id)}
                        disabled={!canEdit || busy}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-[13px] transition",
                          on
                            ? "border-primary/40 bg-primary/12 text-ink"
                            : "border-ink-06 bg-surface/60 text-ink-55 hover:border-ink-12 hover:text-ink",
                          !canEdit && "cursor-not-allowed opacity-60",
                        )}
                        aria-pressed={on}
                      >
                        {on ? (
                          <Unlink className="h-3.5 w-3.5 shrink-0 text-primary" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-ink-40" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        <span className="shrink-0 text-[11px] text-ink-40">
                          {TASK_STATUS_LABEL[t.status]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {canEdit ? (
          <footer className="flex justify-end border-t border-ink-06 px-5 py-4">
            <Button variant="danger" size="sm" onClick={remove}>
              Delete issue
            </Button>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-40">{label}</dt>
      <dd className="text-right text-ink-70">{value}</dd>
    </div>
  );
}
