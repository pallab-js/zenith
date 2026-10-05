import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TasksWorkspace } from "@/components/tasks/tasks-workspace";
import type { TaskStatus } from "@/lib/repo/types";
import { store } from "@/lib/repo";
import { getSession } from "@/lib/server/session";

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
  const session = await getSession();
  const allTasks = store.getTasks();

  const q = pick(sp.q).toLowerCase();
  const project = pick(sp.project);
  const assignee = pick(sp.assignee);
  const priority = pick(sp.priority);
  const status = pick(sp.status);
  const label = pick(sp.label);

  const tasks = allTasks.filter((t) => {
    if (project && t.projectId !== project) return false;
    if (assignee === "none" && t.assigneeId) return false;
    if (assignee && assignee !== "none" && t.assigneeId !== assignee) return false;
    if (priority && t.priority !== priority) return false;
    if (status && t.status !== (status as TaskStatus)) return false;
    if (label && !t.labels.includes(label)) return false;
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
          tasks={tasks}
          allTasks={allTasks}
          projects={store.getProjects()}
          users={store.getUsers()}
          issues={store.getIssues()}
          role={session.role}
        />
      </Suspense>
    </div>
  );
}
