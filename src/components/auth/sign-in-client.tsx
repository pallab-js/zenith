"use client";

import { ArrowRight, Eye, ShieldCheck, User as UserIcon, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { switchUser } from "@/lib/actions";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/permissions";
import type { Role, User } from "@/lib/repo/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const ROLE_ICON: Record<Role, React.ReactNode> = {
  owner: <ShieldCheck className="h-4 w-4" />,
  admin: <Users className="h-4 w-4" />,
  member: <UserIcon className="h-4 w-4" />,
  viewer: <Eye className="h-4 w-4" />,
};

export default function SignInClient({
  members,
}: {
  members: { user: User; role: Role }[];
}) {
  const [selected, setSelected] = useState(members[0]?.user.id ?? "");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function enter() {
    if (!selected) return;
    setBusy(true);
    await switchUser(selected);
    router.push("/");
    router.refresh();
  }

  const active = members.find((m) => m.user.id === selected);

  return (
    <div className="brand-mesh flex min-h-screen flex-col">
      <header className="flex items-center gap-2.5 px-6 py-6 sm:px-10">
        <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary">
          <Zap className="h-5 w-5" aria-hidden />
        </span>
        <span className="font-display text-lg font-bold tracking-tight">
          ZENITH
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[480px]">
          <p className="text-eyebrow">Mock session</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            PICK A SEAT.
          </h1>
          <p className="mt-3 text-[15px] text-ink-70">
            Zenith has no real authentication in v1 — choose who you are to see
            how roles change what the dashboard lets you do.
          </p>

          <div className="mt-7 space-y-2.5" role="radiogroup" aria-label="Choose a member">
            {members.map(({ user, role }) => {
              const isActive = user.id === selected;
              return (
                <button
                  key={user.id}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setSelected(user.id)}
                  className={cn(
                    "flex w-full items-center gap-3.5 rounded-lg border p-4 text-left transition-all",
                    isActive
                      ? "border-primary bg-primary/12 shadow-float"
                      : "border-ink-06 bg-surface/70 hover:border-ink-12 hover:bg-surface",
                  )}
                >
                  <Avatar user={user} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-head text-[15px] font-bold">
                      {user.name}
                    </span>
                    <span className="block truncate text-[13px] text-ink-55">
                      {user.title}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 font-head text-[12px] font-bold",
                      isActive
                        ? "border-primary/40 bg-primary/20 text-ink"
                        : "border-ink-12 bg-canvas text-ink-40",
                    )}
                  >
                    {ROLE_ICON[role]}
                    {ROLE_LABEL[role]}
                  </span>
                </button>
              );
            })}
          </div>

          {active ? (
            <p className="mt-4 flex items-start gap-2 rounded-sm bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-ink-55">
              <span className="mt-0.5 shrink-0 text-primary">
                {ROLE_ICON[active.role]}
              </span>
              <span>
                <span className="font-head font-bold text-ink">
                  {ROLE_LABEL[active.role]}
                </span>{" "}
                — {ROLE_DESCRIPTION[active.role]}
              </span>
            </p>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="green"
              size="lg"
              className="flex-1"
              onClick={enter}
              disabled={!selected || busy}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Enter dashboard
            </Button>
            <Link href="/" className="sm:self-center">
              <Button variant="ghost" size="lg">
                Skip
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
