import { AppShell } from "@/components/shell/app-shell";
import { store } from "@/lib/repo";
import { getSession } from "@/lib/server/session";

/** Mutable server state (SQLite) — never prerender these pages. */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <AppShell
      members={store.getMembers()}
      currentUser={session.user}
      role={session.role}
      projects={store.getProjects()}
      tasks={store.getTasks()}
      issues={store.getIssues()}
    >
      {children}
    </AppShell>
  );
}
