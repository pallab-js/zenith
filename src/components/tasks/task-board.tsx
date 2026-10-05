"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { moveTaskAction } from "@/lib/actions";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/metrics";
import type { Task, TaskStatus, User } from "@/lib/repo/types";
import { cn, formatShortDate, isOverdue } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";

const PRIORITY_TONE: Record<Task["priority"], string> = {
  urgent: "border-l-magenta",
  high: "border-l-primary",
  medium: "border-l-link",
  low: "border-l-ink-12",
};

const COLUMN_TONE: Record<TaskStatus, string> = {
  backlog: "bg-ink-40",
  todo: "bg-link",
  in_progress: "bg-primary",
  in_review: "bg-violet",
  done: "bg-green",
};

export function TaskBoard({
  tasks,
  users,
  canEdit,
  onOpenTask,
}: {
  tasks: Task[];
  users: User[];
  canEdit: boolean;
  onOpenTask?: (task: Task) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columns = useMemo(() => {
    const list: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    [...tasks]
      .sort((a, b) => a.order - b.order)
      .forEach((t) => list[t.status].push(t));
    return list;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  async function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const taskId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const status = overId.replace("col:", "") as TaskStatus;
    if (!(status in columns)) return;
    if (task.status === status) return;

    // Optimistic move, then persist.
    const res = await moveTaskAction(taskId, status, columns[status].length);
    if (res.ok) toast.success(`Moved to ${STATUS_LABEL[status]}`);
    else toast.error(res.error);
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Nothing on the board"
        description="Create a task and it will land here — then drag it across columns as it moves."
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-5 md:overflow-visible">
        {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={columns[status]}
            users={users}
            canEdit={canEdit}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            users={users}
            onOpenTask={() => undefined}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  status,
  tasks,
  users,
  canEdit,
  onOpenTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  users: User[];
  canEdit: boolean;
  onOpenTask?: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABEL[status]} column, ${tasks.length} tasks`}
      className={cn(
        "flex min-h-[220px] flex-col rounded-lg border bg-canvas/60 p-2.5 transition-colors",
        isOver ? "border-primary/60 bg-primary/8" : "border-ink-06",
      )}
    >
      <header className="mb-2.5 flex items-center gap-2 px-1.5 pt-1">
        <span
          className={cn("h-2.5 w-2.5 rounded-pill", COLUMN_TONE[status])}
          aria-hidden
        />
        <h3 className="font-head text-[13px] font-bold uppercase tracking-[0.08em] text-ink-70">
          {STATUS_LABEL[status]}
        </h3>
        <span className="ml-auto rounded-pill bg-ink-06 px-2 py-0.5 font-head text-[11px] font-bold text-ink-55">
          {tasks.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            users={users}
            canEdit={canEdit}
            onOpenTask={onOpenTask}
          />
        ))}
        {tasks.length === 0 ? (
          <p className="rounded-sm border border-dashed border-ink-06 px-3 py-6 text-center text-xs text-ink-40">
            Drop here
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  users,
  canEdit = false,
  onOpenTask,
  dragging,
}: {
  task: Task;
  users: User[];
  canEdit?: boolean;
  onOpenTask?: (task: Task) => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: !canEdit,
  });
  const assignee = users.find((u) => u.id === task.assigneeId);
  const late = isOverdue(task.dueDate) && task.status !== "done";

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "group relative rounded-md border border-ink-06 bg-surface p-3",
        "border-l-[3px] transition-[border-color,box-shadow,transform]",
        PRIORITY_TONE[task.priority],
        isDragging ? "opacity-30" : "hover:border-ink-12 hover:shadow-float",
        dragging && "rotate-2 shadow-modal",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => onOpenTask?.(task)}
          className="min-w-0 flex-1 text-left"
          aria-label={`Open task ${task.title}`}
        >
          <span className="line-clamp-2 font-head text-[14px] font-medium leading-snug text-ink">
            {task.title}
          </span>
        </button>
        {canEdit ? (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded-xs p-0.5 text-ink-40 opacity-0 transition hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
            aria-label={`Drag ${task.title}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {task.labels.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.labels.slice(0, 3).map((l) => (
            <span
              key={l}
              className="rounded-xs bg-ink-06 px-1.5 py-0.5 text-[10px] font-medium text-ink-55"
            >
              {l}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {task.priority === "urgent" ? (
            <Badge tone="magenta" className="px-1.5 py-0 text-[10px]">
              <Sparkles className="h-2.5 w-2.5" />
              {PRIORITY_LABEL[task.priority]}
            </Badge>
          ) : task.priority !== "medium" ? (
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-40">
              {PRIORITY_LABEL[task.priority]}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {task.dueDate ? (
            <span
              className={cn(
                "text-[11px] tabular-nums",
                late ? "font-bold text-magenta" : "text-ink-40",
              )}
            >
              {formatShortDate(task.dueDate)}
            </span>
          ) : null}
          <Avatar user={assignee} size="xs" />
        </div>
      </div>
    </article>
  );
}
