"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { TaskFilters, TaskList } from "@/components/tasks/task-views";
import { TaskFormModal } from "@/components/tasks/task-form-modal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import type { Issue, Project, Role, Task, User } from "@/lib/repo/types";
import { can } from "@/lib/permissions";

type View = "board" | "list";

export function TasksWorkspace({
  tasks,
  allTasks,
  projects,
  users,
  issues,
  role,
}: {
  tasks: Task[];
  allTasks: Task[];
  projects: Project[];
  users: User[];
  issues: Issue[];
  role: Role;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const canEdit = can(role, "task:write");

  // URL is the single source of truth for drawers and deep links.
  const drawerParam = params.get("task");
  const createParam = params.get("new") === "1";
  const [view, setView] = useState<View>("board");

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const drawerTask = useMemo(
    () => (drawerParam ? (allTasks.find((t) => t.id === drawerParam) ?? null) : null),
    [allTasks, drawerParam],
  );

  const filteredCount = tasks.length;

  /** Every label in use, for the FR-3.3 label filter. */
  const labels = useMemo(
    () =>
      Array.from(new Set(allTasks.flatMap((t) => t.labels))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [allTasks],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { id: "board", label: "Board" },
            { id: "list", label: "List" },
          ]}
          active={view}
          onChange={(id) => setView(id as View)}
        />

        {canEdit ? (
          <Button
            variant="green"
            onClick={() => setParam("new", "1")}
            icon={<Plus className="h-4 w-4" />}
          >
            New task
          </Button>
        ) : null}
      </div>

      <TaskFilters
        projects={projects}
        users={users}
        labels={labels}
        count={filteredCount}
        total={allTasks.length}
      />

      {filteredCount === 0 ? (
        <EmptyState
          title={allTasks.length === 0 ? "No tasks yet" : "No tasks match"}
          description={
            allTasks.length === 0
              ? "Create your first task — it lands in To do and can be dragged from there."
              : "Loosen the filters to see more of the board."
          }
          action={
            allTasks.length > 0 && filteredCount < allTasks.length ? (
              <Button
                variant="ghost"
                onClick={() => router.replace(pathname, { scroll: false })}
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : view === "board" ? (
        <TaskBoard
          tasks={tasks}
          users={users}
          canEdit={canEdit}
          onOpenTask={(t) => setParam("task", t.id)}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-ink-06">
          <TaskList
            tasks={tasks}
            projects={projects}
            users={users}
            onOpenTask={(t) => setParam("task", t.id)}
          />
        </div>
      )}

      {drawerTask ? (
        <TaskDrawer
          task={drawerTask}
          projects={projects}
          users={users}
          issues={issues}
          canEdit={canEdit}
          onClose={() => setParam("task", null)}
          onDeleted={() => setParam("task", null)}
        />
      ) : null}

      {createParam ? (
        <TaskFormModal
          open={createParam}
          onClose={() => setParam("new", null)}
          projects={projects}
          users={users}
          overrides={{
            projectId: params.get("project") ?? undefined,
          }}
        />
      ) : null}
    </div>
  );
}
