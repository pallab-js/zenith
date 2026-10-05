"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ListFilter,
  Search,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  STATUS_LABEL,
  STATUS_ORDER,
} from "@/lib/metrics";
import type { Project, Task, User } from "@/lib/repo/types";
import { cn, formatShortDate, isOverdue, toDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";

const KEYS = ["project", "assignee", "priority", "status", "label", "q"] as const;

export function TaskFilters({
  projects,
  users,
  labels,
  count,
  total,
}: {
  projects: Project[];
  users: User[];
  labels: string[];
  count: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(params.get("q") ?? "");

  const activeCount = KEYS.filter((k) => params.get(k)).length;

  // Debounced text search. Reads the *live* URL at flush time so a keystroke
  // racing a filter change can't clobber the other param.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(window.location.search);
      if (q) next.set("q", q);
      else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [q, pathname, router]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function clearAll() {
    setQ("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-50"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="pl-9"
          />
        </div>

        <Button
          variant={activeCount > 0 ? "primary" : "ghost"}
          size="md"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          icon={<ListFilter className="h-4 w-4" />}
        >
          Filters{activeCount > 0 ? ` · ${activeCount}` : ""}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </Button>

        <span className="ml-auto text-xs text-ink-50 tabular-nums">
          {count} of {total} shown
        </span>
      </div>

      {open ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-06 bg-surface/60 p-3.5">
          <label className="min-w-[150px] flex-1">
            <span className="mb-1.5 block font-head text-[12px] font-medium text-ink-55">
              Project
            </span>
            <Select
              value={params.get("project") ?? ""}
              onChange={(e) => setParam("project", e.target.value)}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </label>

          <label className="min-w-[150px] flex-1">
            <span className="mb-1.5 block font-head text-[12px] font-medium text-ink-55">
              Assignee
            </span>
            <Select
              value={params.get("assignee") ?? ""}
              onChange={(e) => setParam("assignee", e.target.value)}
            >
              <option value="">Anyone</option>
              <option value="none">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </label>

          <label className="min-w-[130px] flex-1">
            <span className="mb-1.5 block font-head text-[12px] font-medium text-ink-55">
              Priority
            </span>
            <Select
              value={params.get("priority") ?? ""}
              onChange={(e) => setParam("priority", e.target.value)}
            >
              <option value="">Any</option>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </label>

          <label className="min-w-[140px] flex-1">
            <span className="mb-1.5 block font-head text-[12px] font-medium text-ink-55">
              Status
            </span>
            <Select
              value={params.get("status") ?? ""}
              onChange={(e) => setParam("status", e.target.value)}
            >
              <option value="">Any</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </label>

          {labels.length > 0 ? (
            <label className="min-w-[140px] flex-1">
              <span className="mb-1.5 block font-head text-[12px] font-medium text-ink-55">
                Label
              </span>
              <Select
                value={params.get("label") ?? ""}
                onChange={(e) => setParam("label", e.target.value)}
              >
                <option value="">Any</option>
                {labels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}

          {activeCount > 0 ? (
            <Button variant="ghost" onClick={clearAll} icon={<X className="h-4 w-4" />}>
              Clear
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ── Sortable list view (spec FR-3.2) ─────────────────────── */

type SortKey = "title" | "project" | "status" | "priority" | "assignee" | "due";
type Sort = { key: SortKey; dir: "asc" | "desc" };

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "title", label: "Task" },
  { key: "project", label: "Project" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "assignee", label: "Assignee" },
  { key: "due", label: "Due", className: "text-right" },
];

/** Sorts "unassigned / no due date" last when ascending. */
const LAST = "\uffff";

function comparators(
  projects: Project[],
  users: User[],
): Record<SortKey, (a: Task, b: Task) => number> {
  const projectKey = (t: Task) =>
    projects.find((p) => p.id === t.projectId)?.key ?? "";
  const assignee = (t: Task) =>
    users.find((u) => u.id === t.assigneeId)?.name ?? "";
  return {
    title: (a, b) => a.title.localeCompare(b.title),
    project: (a, b) => projectKey(a).localeCompare(projectKey(b)),
    status: (a, b) =>
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    priority: (a, b) =>
      PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
    assignee: (a, b) =>
      (assignee(a) || LAST).localeCompare(assignee(b) || LAST),
    due: (a, b) => {
      const x = toDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const y = toDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return x - y;
    },
  };
}

function SortHeader({
  column,
  sort,
  onSort,
}: {
  column: (typeof COLUMNS)[number];
  sort: Sort | null;
  onSort: (key: SortKey) => void;
}) {
  const active = sort?.key === column.key;
  const dir = active ? sort.dir : null;
  return (
    <TH
      scope="col"
      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
      className={column.className}
    >
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={cn(
          "inline-flex items-center gap-1 rounded-xs transition-colors hover:text-ink",
          active && "text-ink",
        )}
        title={`Sort by ${column.label.toLowerCase()}`}
      >
        {column.label}
        {dir === "asc" ? (
          <ArrowUp className="h-3 w-3" aria-hidden />
        ) : dir === "desc" ? (
          <ArrowDown className="h-3 w-3" aria-hidden />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
        )}
      </button>
    </TH>
  );
}

export function TaskList({
  tasks,
  projects,
  users,
  onOpenTask,
}: {
  tasks: Task[];
  projects: Project[];
  users: User[];
  onOpenTask?: (task: Task) => void;
}) {
  const [sort, setSort] = useState<Sort | null>(null);

  function toggle(key: SortKey) {
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const rows = useMemo(() => {
    if (!sort) return tasks;
    const cmp = comparators(projects, users)[sort.key];
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...tasks].sort((a, b) => sign * cmp(a, b));
  }, [tasks, sort, projects, users]);

  return (
    <Table>
      <caption className="sr-only">
        {tasks.length} tasks
        {sort
          ? `, sorted by ${COLUMNS.find((c) => c.key === sort.key)?.label} ${
              sort.dir === "asc" ? "ascending" : "descending"
            }`
          : ""}
      </caption>
      <THead>
        {COLUMNS.map((c) => (
          <SortHeader key={c.key} column={c} sort={sort} onSort={toggle} />
        ))}
      </THead>
      <tbody>
        {rows.map((t) => {
          const project = projects.find((p) => p.id === t.projectId);
          const assignee = users.find((u) => u.id === t.assigneeId);
          const late = isOverdue(t.dueDate) && t.status !== "done";
          return (
            <TR key={t.id}>
              <TD>
                <button
                  onClick={() => onOpenTask?.(t)}
                  className="text-left font-head font-bold text-ink transition hover:text-link"
                >
                  {t.title}
                </button>
                {t.labels.length > 0 ? (
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {t.labels.map((l) => (
                      <span
                        key={l}
                        className="rounded-xs bg-ink-06 px-1.5 py-0.5 text-[10px] text-ink-55"
                      >
                        {l}
                      </span>
                    ))}
                  </span>
                ) : null}
              </TD>
              <TD className="whitespace-nowrap text-xs text-ink-55">
                {project ? `${project.key} · ${project.name}` : "—"}
              </TD>
              <TD>
                <Badge
                  tone={
                    t.status === "done"
                      ? "green"
                      : t.status === "in_progress"
                        ? "primary"
                        : "neutral"
                  }
                >
                  {STATUS_LABEL[t.status]}
                </Badge>
              </TD>
              <TD>
                <span
                  className={cn(
                    "font-head text-[12px] font-bold uppercase tracking-wide",
                    t.priority === "urgent"
                      ? "text-magenta"
                      : t.priority === "high"
                        ? "text-primary"
                        : "text-ink-50",
                  )}
                >
                  {PRIORITY_LABEL[t.priority]}
                </span>
              </TD>
              <TD>
                {assignee ? (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Avatar user={assignee} size="xs" />
                    <span className="text-xs">{assignee.name}</span>
                  </span>
                ) : (
                  <span className="text-xs text-ink-50">Unassigned</span>
                )}
              </TD>
              <TD
                className={cn(
                  "text-right text-xs tabular-nums whitespace-nowrap",
                  late ? "font-bold text-magenta" : "text-ink-50",
                )}
              >
                {formatShortDate(t.dueDate)}
              </TD>
            </TR>
          );
        })}
      </tbody>
    </Table>
  );
}
