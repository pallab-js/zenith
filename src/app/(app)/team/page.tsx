import { TeamList } from "@/components/team/team-list";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { computeMemberStats, type MemberStats } from "@/lib/metrics";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/permissions";
import type { Role } from "@/lib/repo/types";
import { store } from "@/lib/repo/in-memory";

export const metadata = { title: "Team" };

const ROLE_MATRIX: { cap: string; roles: Role[] }[] = [
  { cap: "View everything", roles: ["owner", "admin", "member", "viewer"] },
  { cap: "Create & move tasks", roles: ["owner", "admin", "member"] },
  { cap: "File & resolve issues", roles: ["owner", "admin", "member"] },
  { cap: "Manage projects", roles: ["owner", "admin"] },
  { cap: "Change member roles", roles: ["owner", "admin"] },
  { cap: "Remove members", roles: ["owner"] },
];

export default function TeamPage() {
  const db = store.db;
  const members = db.memberships.map((m) => ({
    user: store.getUser(m.userId)!,
    role: m.role,
  }));

  const stats: MemberStats[] = computeMemberStats(
    db.users.map((u) => u.id),
    store.getTasks(),
    store.getIssues(),
  );

  const role = store.getRole(db.currentUserId);
  const overloaded = stats.filter((s) => s.overLimit).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="TEAM"
        description={
          overloaded > 0
            ? `${overloaded} ${overloaded === 1 ? "person is" : "people are"} over the WIP limit right now.`
            : "Everyone is within their work-in-progress limit."
        }
      />

      <TeamList
        members={members}
        stats={stats}
        role={role}
        currentUserId={db.currentUserId}
      />

      <Panel>
        <PanelHeader
          title="What each role can do"
          hint="Enforced on every server action — switch roles from the sidebar to see it live"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="pb-3 font-head text-[12px] font-bold uppercase tracking-[0.08em] text-ink-40">
                  Capability
                </th>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <th
                    key={r}
                    className="pb-3 text-center font-head text-[12px] font-bold uppercase tracking-[0.08em] text-ink-40"
                  >
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX.map((row) => (
                <tr key={row.cap} className="border-t border-ink-06">
                  <td className="py-3 pr-4 text-ink-70">{row.cap}</td>
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                    <td key={r} className="py-3 text-center">
                      {row.roles.includes(r) ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                          ✓
                        </span>
                      ) : (
                        <span className="text-ink-40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 grid gap-1.5 text-xs text-ink-40 sm:grid-cols-2">
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
            <li key={r}>
              <span className="font-head font-bold text-ink-70">
                {ROLE_LABEL[r]}
              </span>{" "}
              — {ROLE_DESCRIPTION[r]}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
