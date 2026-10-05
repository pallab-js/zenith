"use client";

import { Command, LogOut, Menu, X, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { switchUser } from "@/lib/actions";
import { ROLE_LABEL } from "@/lib/permissions";
import type { Role, User } from "@/lib/repo/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { NavLinks } from "./nav-links";

export function Sidebar({
  members,
  currentUser,
  role,
}: {
  members: { user: User; role: Role }[];
  currentUser: User;
  role: Role;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const switcher = (
    <UserSwitcher
      members={members}
      currentUser={currentUser}
      role={role}
      onNavigate={() => router.refresh()}
    />
  );

  const brand = (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-sm px-1"
      aria-label="Zenith home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary shadow-float">
        <Zap className="h-5 w-5 text-ink" aria-hidden />
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        ZENITH
      </span>
    </Link>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-ink-06 bg-canvas px-4 py-5 lg:flex">
        <div className="px-1">{brand}</div>
        <NavLinks className="mt-8 flex-1" />
        <div className="mt-4 space-y-3">
          <PaletteHint />
          {switcher}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-ink-06 bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
        {brand}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("zenith:palette"))}
            className="rounded-sm p-2 text-ink-55 transition hover:bg-ink-06 hover:text-ink"
            aria-label="Open command palette"
          >
            <Command className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-sm p-2 text-ink-55 transition hover:bg-ink-06 hover:text-ink"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-canvas px-4 py-5 shadow-modal">
            <div className="flex items-center justify-between">
              {brand}
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-sm p-2 text-ink-55 hover:bg-ink-06"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks
              className="mt-7 flex-1"
              onNavigate={() => setMobileOpen(false)}
            />
            <div className="mt-4 space-y-3 border-t border-ink-06 pt-4">
              <PaletteHint />
              {switcher}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PaletteHint() {
  return (
    <p className="hidden items-center gap-2 rounded-sm bg-surface px-3 py-2 text-xs text-ink-50 lg:flex">
      <Command className="h-3.5 w-3.5" aria-hidden />
      <span>
        <kbd className="font-head">⌘K</kbd> to jump anywhere
      </span>
    </p>
  );
}

/** Mock session switcher — demonstrates role enforcement without real auth. */
function UserSwitcher({
  members,
  currentUser,
  role,
  onNavigate,
}: {
  members: { user: User; role: Role }[];
  currentUser: User;
  role: Role;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside pointer-down (subscription, not a render-sync effect).
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function pick(userId: string) {
    setOpen(false);
    await switchUser(userId);
    onNavigate();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex w-full items-center gap-3 rounded-md border border-ink-06 bg-canvas p-2.5",
          "transition-colors hover:border-ink-12 hover:bg-ink-06",
          open && "border-primary/50",
        )}
      >
        <Avatar user={currentUser} size="md" />
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate font-head text-sm font-bold">
            {currentUser.name}
          </span>
          <span className="block truncate text-xs text-ink-50">
            {ROLE_LABEL[role]} · {currentUser.title}
          </span>
        </span>
        <Menu className="h-4 w-4 shrink-0 text-ink-50" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-50 overflow-hidden rounded-lg border border-ink-12 bg-canvas p-1.5 shadow-modal animate-fade-up"
        >
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-50">
            View as member
          </p>
          {members.map(({ user: u, role: r }) => (
            <button
              key={u.id}
              role="menuitem"
              onClick={() => pick(u.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors",
                u.id === currentUser.id ? "bg-primary/15" : "hover:bg-ink-06",
              )}
            >
              <Avatar user={u} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {u.name}
                </span>
                <span className="block truncate text-xs text-ink-50">
                  {ROLE_LABEL[r]}
                </span>
              </span>
            </button>
          ))}
          <div className="my-1 h-px bg-ink-06" />
          <Link
            href="/sign-in"
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-sm text-ink-55 transition-colors hover:bg-ink-06 hover:text-ink"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign-in screen
          </Link>
        </div>
      )}
    </div>
  );
}
