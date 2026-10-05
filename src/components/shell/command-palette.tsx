"use client";

import {
  CircleDot,
  CornerDownLeft,
  FolderKanban,
  Gauge,
  LayoutGrid,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { can } from "@/lib/permissions";
import type { Issue, Project, Role, Task } from "@/lib/repo/types";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  group: string;
  label: string;
  meta?: string;
  href?: string;
  run?: () => void;
  icon: React.ReactNode;
};

export function CommandPalette({
  projects,
  tasks,
  issues,
  role,
}: {
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  role: Role;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onEvent = () => {
      setOpen((v) => !v);
      setQuery("");
      setCursor(0);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onEvent();
      }
    };
    window.addEventListener("zenith:palette", onEvent);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("zenith:palette", onEvent);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };

    const base: Item[] = [
      { id: "nav-dash", group: "Go to", label: "Dashboard", href: "/", run: go("/"), icon: <Gauge className="h-4 w-4" /> },
      { id: "nav-proj", group: "Go to", label: "Projects", href: "/projects", run: go("/projects"), icon: <FolderKanban className="h-4 w-4" /> },
      { id: "nav-task", group: "Go to", label: "Tasks", href: "/tasks", run: go("/tasks"), icon: <LayoutGrid className="h-4 w-4" /> },
      { id: "nav-issue", group: "Go to", label: "Issues", href: "/issues", run: go("/issues"), icon: <CircleDot className="h-4 w-4" /> },
      { id: "nav-team", group: "Go to", label: "Team", href: "/team", run: go("/team"), icon: <Users className="h-4 w-4" /> },
    ];

    const actions: Item[] = [];
    if (can(role, "task:write")) {
      actions.push({
        id: "act-task",
        group: "Create",
        label: "New task",
        run: go("/tasks?new=1"),
        icon: <Plus className="h-4 w-4" />,
      });
    }
    if (can(role, "issue:write")) {
      actions.push({
        id: "act-issue",
        group: "Create",
        label: "New issue",
        run: go("/issues?new=1"),
        icon: <Plus className="h-4 w-4" />,
      });
    }

    const projItems: Item[] = projects.map((p) => ({
      id: `p-${p.id}`,
      group: "Projects",
      label: p.name,
      meta: p.key,
      run: go(`/projects/${p.id}`),
      icon: <FolderKanban className="h-4 w-4" />,
    }));

    const taskItems: Item[] = tasks.slice(0, 40).map((t) => ({
      id: `t-${t.id}`,
      group: "Tasks",
      label: t.title,
      meta: t.status.replace("_", " "),
      run: go(`/tasks?task=${t.id}`),
      icon: <LayoutGrid className="h-4 w-4" />,
    }));

    const issueItems: Item[] = issues.slice(0, 30).map((i) => ({
      id: `i-${i.id}`,
      group: "Issues",
      label: `${i.key} ${i.title}`,
      meta: i.severity,
      run: go(`/issues?issue=${i.id}`),
      icon: <CircleDot className="h-4 w-4" />,
    }));

    return [...base, ...actions, ...projItems, ...taskItems, ...issueItems];
  }, [projects, tasks, issues, role, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items
      .filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.meta?.toLowerCase().includes(q) ||
          i.group.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [items, query]);

  if (!open) return null;

  const groups = filtered.reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  let index = -1;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
        aria-label="Close command palette"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-lg border border-ink-12 bg-canvas shadow-modal animate-fade-up"
      >
        <div className="flex items-center gap-3 border-b border-ink-06 px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-40" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                filtered[cursor]?.run?.();
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Jump to a project, task or issue…"
            className="h-14 w-full bg-transparent text-[15px] text-ink placeholder:text-ink-40 focus:outline-none"
            aria-label="Search commands"
          />
          <kbd className="hidden shrink-0 rounded-xs border border-ink-12 px-1.5 py-0.5 text-[11px] text-ink-40 sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-40">
              Nothing matches “{query}”
            </p>
          ) : (
            Object.entries(groups).map(([group, groupItems]) => (
              <div key={group} className="mb-1.5">
                <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-40">
                  {group}
                </p>
                {groupItems.map((item) => {
                  index += 1;
                  const i = index;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => item.run?.()}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left",
                        "transition-colors",
                        cursor === i ? "bg-primary/20" : "hover:bg-ink-06",
                      )}
                    >
                      <span className="text-ink-55">{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">
                        {item.label}
                      </span>
                      {item.meta ? (
                        <span className="shrink-0 text-xs text-ink-40">
                          {item.meta}
                        </span>
                      ) : null}
                      {cursor === i ? (
                        <CornerDownLeft
                          className="h-3.5 w-3.5 shrink-0 text-ink-40"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
