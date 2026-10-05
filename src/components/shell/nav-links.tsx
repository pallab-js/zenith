"use client";

import {
  CircleDot,
  FolderKanban,
  Gauge,
  LayoutGrid,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: LayoutGrid },
  { href: "/issues", label: "Issues", icon: CircleDot },
  { href: "/team", label: "Team", icon: Users },
] as const;

export function NavLinks({
  onNavigate,
  className,
  collapsed = false,
}: {
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label="Primary">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3",
                  "font-head text-[15px] font-medium transition-colors",
                  "min-h-11",
                  collapsed ? "justify-center px-0" : "",
                  active
                    ? "bg-primary/15 text-ink"
                    : "text-ink-55 hover:bg-ink-06 hover:text-ink",
                )}
                title={label}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-pill",
                    "transition-all duration-200",
                    active
                      ? "bg-primary opacity-100"
                      : "bg-primary opacity-0 group-hover:opacity-40",
                  )}
                />
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
