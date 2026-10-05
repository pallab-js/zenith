import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TasksWorkspace } from "@/components/tasks/tasks-workspace";
import type { Task, TaskStatus } from "@/lib/repo/types";
import { store } from "@/lib/repo/in-memory";

export const metadata = { title: "Tasks" };

type Search = { [key: string]: string | string[] | undefined };

function pick(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const allTasks = store.getTasks();

  const q = pick(sp.q).toLowerCase();
  const project = pick(sp.project);
  const assignee = pick(sp.assignee);
  const priority = pick(sp.priority);
  const status = pick(sp.status);

  const tasks = allTasks.filter((t) => {
    if (project && t.projectId !== project) return false;
    if (assignee === "none" && t.assigneeId) return false;
    if (assignee && assignee !== "none" && t.assigneeId !== assignee) return false;
    if (priority && t.priority !== priority) return false;
    if (status && t.status !== (status as TaskStatus)) return false;
    if (q) {
      const hay = `${t.title} ${t.description} ${t.labels.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Execution"
        title="TASKS"
        description="One board, every project. Drag work across the pipeline — moves are logged instantly."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <TasksWorkspace
          tasks={tasks as Task[]}
          allTasks={allTasks}
          projects={store.getProjects()}
          users={store.getUsers()}
          issues={store.getIssues()}
          role={store.getRole(store.db.currentUserId)}
        />
      </Suspense>
    </div>
  );
}
