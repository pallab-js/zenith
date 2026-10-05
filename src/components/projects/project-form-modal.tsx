"use client";

import { useState } from "react";
import { saveProject } from "@/lib/actions";
import { projectInputSchema, type ProjectForm } from "@/lib/schemas";
import type { Project, User } from "@/lib/repo/types";
import { toDateOnly } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";

const EMPTY: ProjectForm = {
  key: "",
  name: "",
  description: "",
  status: "planning",
  leadId: "",
  startDate: toDateOnly(),
  targetDate: toDateOnly(new Date(Date.now() + 30 * 86400000)),
};

export function ProjectFormModal({
  open,
  onClose,
  project,
  users,
  defaultLeadId,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  users: User[];
  defaultLeadId: string;
}) {
  const [form, setForm] = useState<ProjectForm>(() =>
    project
      ? {
          key: project.key,
          name: project.name,
          description: project.description,
          status: project.status,
          leadId: project.leadId,
          startDate: project.startDate.slice(0, 10),
          targetDate: project.targetDate.slice(0, 10),
        }
      : { ...EMPTY, leadId: defaultLeadId },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof ProjectForm>(k: K, v: ProjectForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const parsed = projectInputSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[String(i.path[0])] = i.message;
      });
      setErrors(next);
      setBusy(false);
      return;
    }
    const res = await saveProject(project?.id ?? null, parsed.data);
    setBusy(false);
    if (res.ok) {
      toast.success(project ? "Project updated" : `${res.data.name} created`);
      onClose();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "New project"}
      description={
        project
          ? "Update the details your dashboard reads from."
          : "A project groups tasks, issues and progress."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Name" htmlFor="p-name" error={errors.name}>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Orbit Analytics"
              autoFocus
            />
          </Field>
          <Field label="Key" htmlFor="p-key" error={errors.key} hint="2–6">
            <Input
              id="p-key"
              value={form.key}
              onChange={(e) => set("key", e.target.value.toUpperCase())}
              placeholder="ORB"
              maxLength={6}
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="p-desc" hint="optional">
          <Textarea
            id="p-desc"
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What does this project deliver?"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Status" htmlFor="p-status">
            <Select
              id="p-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value as ProjectForm["status"])}
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
            </Select>
          </Field>
          <Field label="Lead" htmlFor="p-lead" error={errors.leadId}>
            <Select
              id="p-lead"
              value={form.leadId}
              onChange={(e) => set("leadId", e.target.value)}
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

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Start date" htmlFor="p-start">
            <Input
              id="p-start"
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </Field>
          <Field label="Target date" htmlFor="p-target" error={errors.targetDate}>
            <Input
              id="p-target"
              type="date"
              value={form.targetDate}
              onChange={(e) => set("targetDate", e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : project ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
