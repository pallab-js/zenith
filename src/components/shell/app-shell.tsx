import type { Role, User } from "@/lib/repo/types";
import { Sidebar } from "./sidebar";

export function AppShell({
  members,
  currentUser,
  role,
  children,
}: {
  members: { user: User; role: Role }[];
  currentUser: User;
  role: Role;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar members={members} currentUser={currentUser} role={role} />
      <main className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {children}
        </div>
      </main>
    </div>
  );
}
