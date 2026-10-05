/**
 * Activity policy — the *what do we log* rules, shared by every adapter.
 *
 * Keeping verb/label/meta selection here means the in-memory and SQLite
 * adapters cannot drift apart on the audit trail: each adapter owns
 * persistence and ordering, this module owns meaning.
 */
import type { ActivityEvent, Issue, Project, Task } from "./types";

export type NewActivity = Omit<ActivityEvent, "id">;

const now = () => new Date().toISOString();
const statusMeta = (status: string) => status.replace("_", " ");

export const activity = {
  projectCreated(actorId: string, p: Project, at = now()): NewActivity {
    return {
      actorId,
      verb: "created",
      entityType: "project",
      entityId: p.id,
      entityLabel: p.name,
      meta: statusMeta(p.status),
      at,
    };
  },

  projectUpdated(
    actorId: string,
    id: string,
    name: string,
    status: string,
    at = now(),
  ): NewActivity {
    return {
      actorId,
      verb: "updated",
      entityType: "project",
      entityId: id,
      entityLabel: name,
      meta: statusMeta(status),
      at,
    };
  },

  taskCreated(actorId: string, t: Task, at = now()): NewActivity {
    return {
      actorId,
      verb: "created",
      entityType: "task",
      entityId: t.id,
      entityLabel: t.title,
      meta: statusMeta(t.status),
      at,
    };
  },

  taskUpdated(
    actorId: string,
    prev: Task,
    next: Task,
    assigneeName?: string,
    at = now(),
  ): NewActivity {
    const reassigned = Boolean(next.assigneeId && next.assigneeId !== prev.assigneeId);
    return {
      actorId,
      verb: reassigned ? "assigned" : "updated",
      entityType: "task",
      entityId: next.id,
      entityLabel: next.title,
      meta: next.assigneeId ? (assigneeName ?? "") : statusMeta(next.status),
      at,
    };
  },

  taskMoved(actorId: string, t: Task, at = now()): NewActivity {
    return {
      actorId,
      verb: "moved",
      entityType: "task",
      entityId: t.id,
      entityLabel: t.title,
      meta: statusMeta(t.status),
      at,
    };
  },

  taskDeleted(actorId: string, t: Task, at = now()): NewActivity {
    return {
      actorId,
      verb: "closed",
      entityType: "task",
      entityId: t.id,
      entityLabel: t.title,
      at,
    };
  },

  issueCreated(actorId: string, i: Issue, at = now()): NewActivity {
    return {
      actorId,
      verb: "created",
      entityType: "issue",
      entityId: i.id,
      entityLabel: `${i.key} ${i.title}`,
      meta: i.severity,
      at,
    };
  },

  issueUpdated(
    actorId: string,
    prevStatus: string,
    next: Issue,
    at = now(),
  ): NewActivity {
    const verb =
      next.status === "resolved" && prevStatus !== "resolved"
        ? "resolved"
        : next.status !== "resolved" && prevStatus === "resolved"
          ? "reopened"
          : "updated";
    return {
      actorId,
      verb,
      entityType: "issue",
      entityId: next.id,
      entityLabel: `${next.key} ${next.title}`,
      meta: next.severity,
      at,
    };
  },

  issueLinked(
    actorId: string,
    i: Issue,
    count: number,
    at = now(),
  ): NewActivity {
    return {
      actorId,
      verb: "linked",
      entityType: "issue",
      entityId: i.id,
      entityLabel: `${i.key} ${i.title}`,
      meta: `${count} task${count === 1 ? "" : "s"}`,
      at,
    };
  },

  issueDeleted(actorId: string, i: Issue, at = now()): NewActivity {
    return {
      actorId,
      verb: "closed",
      entityType: "issue",
      entityId: i.id,
      entityLabel: `${i.key} ${i.title}`,
      at,
    };
  },

  commentCreated(
    actorId: string,
    taskId: string,
    taskTitle: string,
    at = now(),
  ): NewActivity {
    return {
      actorId,
      verb: "commented",
      entityType: "task",
      entityId: taskId,
      entityLabel: taskTitle,
      at,
    };
  },

  roleChanged(
    actorId: string,
    userId: string,
    userName: string,
    role: string,
    at = now(),
  ): NewActivity {
    return {
      actorId,
      verb: "updated",
      entityType: "member",
      entityId: userId,
      entityLabel: userName,
      meta: `role → ${role}`,
      at,
    };
  },

  memberRemoved(
    actorId: string,
    userId: string,
    userName: string,
    at = now(),
  ): NewActivity {
    return {
      actorId,
      verb: "closed",
      entityType: "member",
      entityId: userId,
      entityLabel: userName,
      at,
    };
  },
};

/** Newest-first cap so the feed (and its table) stay bounded. */
export const ACTIVITY_LIMIT = 200;
