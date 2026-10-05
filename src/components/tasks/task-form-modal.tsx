"use client";

import { useMemo, useState } from "react";
import { saveTask } from "@/lib/actions";
import { STATUS_LABEL } from "@/lib/metrics";
import { taskInputSchema, type TaskForm } from "@/lib/schemas";
import type { Project, Task, User } from "@/lib/repo/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";

type Overrides = Partial<TaskForm>;

function buildForm(task?: Task | null, overrides?: Overrides): TaskForm {
  return {
    projectId: task?.projectId ?? overrides?.projectId ?? "",
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? overrides?.status ?? "todo",
    priority: task?.priority ?? overrides?.priority ?? "medium",
    assigneeId: task?.assigneeId ?? overrides?.assigneeId ?? null,
    dueDate: task?.dueDate ?? overrides?.dueDate ?? null,
    labels: task?.labels ?? overrides?.labels ?? [],
  };
}

export function TaskFormModal({
  open,
  onClose,
  task,
  overrides,
  projects,
  users,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  overrides?: Overrides;
  projects: Project[];
  users: User[];
}) {
  // Mounted fresh on open (callers conditionally render), so the initial
  // state is derived straight from props — no reset-in-effect needed.
  const [form, setForm] = useState<TaskForm>(() => buildForm(task, overrides));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");

  const set = <K extends keyof TaskForm>(k: K, v: TaskForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const defaultProject = useMemo(
    () => form.projectId || projects[0]?.id || "",
    [form.projectId, projects],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const candidate = { ...form, projectId: defaultProject };
    const parsed = taskInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[String(i.path[0])] = i.message;
      });
      setErrors(next);
      setBusy(false);
      return;
    }
    const res = await saveTask(task?.id ?? null, parsed.data);
    setBusy(false);
    if (res.ok) {
      toast.success(task ? "Task updated" : `“${res.data.title}” created`);
      onClose();
    } else {
      toast.error(res.error);
    }
  }

  function addLabel() {
    const v = labelDraft.trim().slice(0, 24);
    if (!v || form.labels.includes(v) || form.labels.length >= 6) return;
    set("labels", [...form.labels, v]);
    setLabelDraft("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Edit task" : "New task"}
      description={
        task
          ? "Changes are logged to the activity feed."
          : "Give it a home, an owner and a priority."
      }
      className="sm:max-w-xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" htmlFor="t-title" error={errors.title}>
          <Input
            id="t-title"
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Optimise funnel query"
          />
        </Field>

        <Field label="Description" htmlFor="t-desc" hint="optional">
          <Textarea
            id="t-desc"
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Acceptance criteria, context, links…"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Project" htmlFor="t-proj" error={errors.projectId}>
            <Select
              id="t-proj"
              value={defaultProject}
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
          <Field label="Status" htmlFor="t-status">
            <Select
              id="t-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value as TaskForm["status"])}
            >
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Priority" htmlFor="t-prio">
            <Select
              id="t-prio"
              value={form.priority}
              onChange={(e) => set("priority", e.target.value as TaskForm["priority"])}
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </Field>
          <Field label="Assignee" htmlFor="t-assignee">
            <Select
              id="t-assignee"
              value={form.assigneeId ?? ""}
              onChange={(e) =>
                set("assigneeId", e.target.value || null)
              }
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date" htmlFor="t-due" hint="optional">
            <Input
              id="t-due"
              type="date"
              value={form.dueDate ? form.dueDate.slice(0, 10) : ""}
              onChange={(e) => set("dueDate", e.target.value || null)}
            />
          </Field>
        </div>

        <Field label="Labels" htmlFor="t-label" hint={`${form.labels.length}/6`}>
          <div className="flex flex-wrap items-center gap-2">
            {form.labels.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => set("labels", form.labels.filter((x) => x !== l))}
                className="rounded-lg border border-ink-12 bg-surface px-2.5 py-1 text-xs text-ink-70 transition hover:border-magenta/50 hover:text-magenta"
                title="Remove label"
              >
                {l} ×
              </button>
            ))}
            <input
              id="t-label"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={addLabel}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addLabel();
                }
              }}
              placeholder={form.labels.length ? "Add another…" : "e.g. frontend"}
              className="h-8 w-36 rounded-lg border border-dashed border-ink-12 bg-transparent px-2.5 text-xs text-ink placeholder:text-ink-50 focus:border-primary focus:outline-none"
            />
          </div>
        </Field>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : task ? "Save changes" : "Create task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
