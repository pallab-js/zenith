"use client";

import { Link2, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteTaskAction, saveTask } from "@/lib/actions";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/metrics";
import type { Issue, Project, Task, User } from "@/lib/repo/types";
import { formatShortDate, isOverdue, relativeTime, toDateOnly } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";

/** Precomputed so render stays pure (no Date.now() inside JSX). */
const DUE_OPTIONS = [3, 7, 14, 30].map((days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return { value: toDateOnly(d), label: `In ${days} days` };
});

export function TaskDrawer({
  task,
  projects,
  users,
  issues,
  canEdit,
  onClose,
  onDeleted,
}: {
  task: Task;
  projects: Project[];
  users: User[];
  issues: Issue[];
  canEdit: boolean;
  onClose: () => void;
  onDeleted?: (id: string) => void;
}) {
  // Mounted fresh each time a task opens (callers render conditionally).
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const project = projects.find((p) => p.id === task.projectId);
  const assignee = users.find((u) => u.id === task.assigneeId);
  const linked = issues.filter((i) => i.linkedTaskIds.includes(task.id));
  const late = isOverdue(task.dueDate) && task.status !== "done";

  async function patch(fields: Partial<Task>) {
    if (!canEdit) return;
    setBusy(true);
    const res = await saveTask(task.id, {
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate,
      labels: task.labels,
      ...fields,
    });
    setBusy(false);
    if (!res.ok) toast.error(res.error);
  }

  async function remove() {
    setBusy(true);
    const res = await deleteTaskAction(task.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Task deleted");
      onDeleted?.(task.id);
      onClose();
    } else toast.error(res.error);
  }

  return (
    <div className="fixed inset-0 z-[75]">
      <button
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close task details"
        tabIndex={-1}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Task: ${task.title}`}
        className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-ink-12 bg-canvas shadow-modal animate-fade-up"
      >
        <header className="flex items-start justify-between gap-3 border-b border-ink-06 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{project?.key ?? "TASK"}</Badge>
              <Badge
                tone={task.status === "done" ? "green" : "primary"}
              >
                {STATUS_LABEL[task.status]}
              </Badge>
              {late ? <Badge tone="magenta">Overdue</Badge> : null}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-40 transition hover:bg-ink-06 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <label htmlFor="drawer-title" className="sr-only">
            Task title
          </label>
          <textarea
            id="drawer-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() !== task.title && patch({ title: title.trim() })}
            rows={Math.min(3, Math.ceil(title.length / 40) + 1)}
            disabled={!canEdit}
            className="w-full resize-none bg-transparent font-display text-[22px] font-bold leading-tight tracking-tight text-ink focus:outline-none disabled:opacity-70"
          />

          <div className="mt-5 space-y-4">
            <DrawerField label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() =>
                  description !== task.description &&
                  patch({ description: description.trim() })
                }
                rows={4}
                disabled={!canEdit}
                placeholder="Add context, acceptance criteria or links…"
                className="bg-surface/60"
              />
            </DrawerField>

            <div className="grid grid-cols-2 gap-3">
              <DrawerField label="Status">
                <Select
                  value={task.status}
                  disabled={!canEdit || busy}
                  onChange={(e) =>
                    patch({ status: e.target.value as Task["status"] })
                  }
                >
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </DrawerField>

              <DrawerField label="Priority">
                <Select
                  value={task.priority}
                  disabled={!canEdit || busy}
                  onChange={(e) =>
                    patch({ priority: e.target.value as Task["priority"] })
                  }
                >
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </DrawerField>

              <DrawerField label="Assignee">
                <Select
                  value={task.assigneeId ?? ""}
                  disabled={!canEdit || busy}
                  onChange={(e) =>
                    patch({ assigneeId: e.target.value || null })
                  }
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </DrawerField>

              <DrawerField label="Due date">
                <Select
                  value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                  disabled={!canEdit || busy}
                  onChange={(e) => patch({ dueDate: e.target.value || null })}
                >
                  <option value="">No due date</option>
                  {DUE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </DrawerField>
            </div>

            <DrawerField label="Details">
              <dl className="space-y-2.5 rounded-lg bg-surface/60 p-3.5 text-[13px]">
                <Row label="Project" value={project?.name ?? "—"} />
                <Row
                  label="Created"
                  value={relativeTime(task.createdAt)}
                />
                <Row label="Updated" value={relativeTime(task.updatedAt)} />
                <Row
                  label="Due"
                  value={
                    task.dueDate ? (
                      <span className={late ? "font-bold text-magenta" : ""}>
                        {formatShortDate(task.dueDate)}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                {assignee ? (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <dt className="text-ink-40">Assignee</dt>
                    <dd className="flex items-center gap-2">
                      <Avatar user={assignee} size="xs" />
                      {assignee.name}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </DrawerField>

            <DrawerField label="Linked issues">
              {linked.length === 0 ? (
                <p className="flex items-center gap-2 rounded-lg border border-dashed border-ink-12 px-3.5 py-3 text-[13px] text-ink-40">
                  <Link2 className="h-4 w-4" aria-hidden />
                  No issues linked to this task.
                </p>
              ) : (
                <ul className="space-y-2">
                  {linked.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center gap-2.5 rounded-lg bg-surface/60 px-3.5 py-2.5 text-[13px]"
                    >
                      <Badge
                        tone={
                          i.status === "resolved"
                            ? "green"
                            : i.severity === "critical"
                              ? "magenta"
                              : "neutral"
                        }
                      >
                        {i.key}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-ink-70">
                        {i.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DrawerField>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-ink-06 px-5 py-4">
          <span className="text-xs text-ink-40">
            {canEdit ? "Autosaves on blur" : "Read-only role"}
          </span>
          {canEdit ? (
            <Button
              variant="danger"
              size="sm"
              onClick={remove}
              disabled={busy}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Delete
            </Button>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}

function DrawerField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 font-head text-[12px] font-bold uppercase tracking-[0.08em] text-ink-40">
        {label}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-40">{label}</dt>
      <dd className="text-right text-ink-70">{value}</dd>
    </div>
  );
}
