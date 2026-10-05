import { AppShell } from "@/components/shell/app-shell";
import { store } from "@/lib/repo/in-memory";

/** The in-memory store is mutable server state — never prerender these pages. */
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const db = store.db;
  const members = db.memberships.map((m) => ({
    user: store.getUser(m.userId)!,
    role: m.role,
  }));

  return (
    <AppShell
      members={members}
      currentUser={store.getUser(db.currentUserId) ?? members[0].user}
      role={store.getRole(db.currentUserId)}
      projects={store.getProjects()}
      tasks={store.getTasks()}
      issues={store.getIssues()}
    >
      {children}
    </AppShell>
  );
}
