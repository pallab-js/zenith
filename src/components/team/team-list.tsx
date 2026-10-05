"use client";

import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { removeMemberAction, setMemberRoleAction } from "@/lib/actions";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/permissions";
import type { MemberStats } from "@/lib/metrics";
import type { Role, User } from "@/lib/repo/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";

const WIP_LIMIT = 7;

export function TeamList({
  members,
  stats,
  role,
  currentUserId,
}: {
  members: { user: User; role: Role }[];
  stats: MemberStats[];
  role: Role;
  currentUserId: string;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const canManage = role === "owner" || role === "admin";
  const canRemove = role === "owner";

  async function changeRole(userId: string, next: Role) {
    setBusyId(userId);
    const res = await setMemberRoleAction(userId, next);
    setBusyId(null);
    if (res.ok) toast.success(`Role updated to ${ROLE_LABEL[next]}`);
    else toast.error(res.error);
  }

  async function remove(userId: string, name: string) {
    setBusyId(userId);
    const res = await removeMemberAction(userId);
    setBusyId(null);
    if (res.ok) toast.success(`${name} removed from workspace`);
    else toast.error(res.error);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {members.map(({ user, role: memberRole }) => {
        const s = stats.find((x) => x.userId === user.id)!;
        const isSelf = user.id === currentUserId;
        const capacity = Math.min(100, Math.round((s.workload / WIP_LIMIT) * 100));

        return (
          <article
            key={user.id}
            className={cn(
              "flex flex-col rounded-lg border border-ink-06 bg-surface p-5",
              s.overLimit && "border-magenta/40",
            )}
          >
            <div className="flex items-start gap-3.5">
              <Avatar user={user} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-head text-[16px] font-bold leading-tight">
                  {user.name}
                  {isSelf ? (
                    <span className="ml-1.5 text-xs font-medium text-ink-50">
                      (you)
                    </span>
                  ) : null}
                </h2>
                <p className="truncate text-[13px] text-ink-55">{user.title}</p>
                <p className="truncate text-xs text-ink-50">{user.email}</p>
              </div>
              <Badge
                tone={
                  memberRole === "owner"
                    ? "magenta"
                    : memberRole === "admin"
                      ? "primary"
                      : "neutral"
                }
              >
                {ROLE_LABEL[memberRole]}
              </Badge>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Metric label="Open" value={s.openTasks} />
              <Metric label="Done" value={s.doneTasks} />
              <Metric
                label="Overdue"
                value={s.overdueTasks}
                tone={s.overdueTasks > 0 ? "magenta" : undefined}
              />
            </dl>

            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="text-ink-50">Workload vs limit ({WIP_LIMIT})</span>
                <span
                  className={cn(
                    "font-head font-bold tabular-nums",
                    s.overLimit ? "text-magenta" : "text-ink-70",
                  )}
                >
                  {capacity}%
                </span>
              </div>
              <ProgressBar
                value={capacity}
                tone={s.overLimit ? "magenta" : "primary"}
              />
              {s.overLimit ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-magenta">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Over the WIP limit — reassign before adding work.
                </p>
              ) : null}
            </div>

            {canManage ? (
              <div className="mt-5 flex items-center gap-2 border-t border-ink-06 pt-4">
                <label className="flex-1">
                  <span className="sr-only">Role for {user.name}</span>
                  <Select
                    value={memberRole}
                    disabled={busyId === user.id}
                    onChange={(e) =>
                      changeRole(user.id, e.target.value as Role)
                    }
                    className="h-9 text-xs"
                  >
                    {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                </label>
                {canRemove && !isSelf ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busyId === user.id}
                    onClick={() => remove(user.id, user.name)}
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 border-t border-ink-06 pt-4 text-xs text-ink-50">
                {ROLE_DESCRIPTION[memberRole]}
              </p>
            )}
          </article>
        );
      })}

      {canManage ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-ink-12 p-6 text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-primary">
            <UserPlus className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-head text-sm font-bold">Invite teammates</p>
          <p className="mt-1 max-w-[220px] text-xs text-ink-50">
            Invitations are out of scope for v1 — the workspace is seeded with
            the demo crew.
          </p>
          <Button variant="ghostSm" size="sm" className="mt-4" disabled>
            Coming after v1
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "magenta";
}) {
  return (
    <div className="rounded-sm bg-canvas/60 py-2.5">
      <dd
        className={cn(
          "font-display text-xl font-bold leading-none",
          tone === "magenta" ? "text-magenta" : "text-ink",
        )}
      >
        {value}
      </dd>
      <dt className="mt-1 text-[11px] uppercase tracking-wide text-ink-50">
        {label}
      </dt>
    </div>
  );
}
