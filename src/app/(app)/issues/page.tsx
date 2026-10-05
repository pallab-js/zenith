import { Suspense } from "react";
import { IssuesWorkspace } from "@/components/issues/issues-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { store } from "@/lib/repo";
import { getSession } from "@/lib/server/session";

export const metadata = { title: "Issues" };

export default async function IssuesPage() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Triage"
        title="ISSUES"
        description="Bugs, blockers and debt — severity-ordered so the worst surfaces first."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <IssuesWorkspace
          issues={store.getIssues()}
          tasks={store.getTasks()}
          projects={store.getProjects()}
          users={store.getUsers()}
          role={session.role}
        />
      </Suspense>
    </div>
  );
}
