import { buildSeed } from "@/lib/seed";
import type {
  ActivityEvent,
  ActivityVerb,
  Comment,
  DBShape,
  Issue,
  Project,
  Store,
  Task,
} from "@/lib/repo/types";
import { makeId } from "@/lib/utils";

/**
 * In-memory adapter (v1). The store lives on `globalThis` so every route
 * handler, server action and RSC render shares one instance across HMR.
 * State resets when the server process restarts — documented in README.
 *
 * Swap point: implement `Store` against Postgres/Drizzle in a new file;
 * nothing outside `lib/repo` needs to change (constitution §V).
 */

declare global {
  var __zenithStore: DBShape | undefined;
}

function ensure(): DBShape {
  if (!globalThis.__zenithStore) globalThis.__zenithStore = buildSeed();
  return globalThis.__zenithStore;
}

function logActivity(
  db: DBShape,
  event: Omit<ActivityEvent, "id"> & { verb: ActivityVerb },
) {
  db.activity.unshift({ ...event, id: makeId("act") });
  if (db.activity.length > 200) db.activity.length = 200;
}

function actor(db: DBShape): string {
  return db.currentUserId;
}

export function createStore(): Store {
  const repo: Store = {
    get db() {
      return ensure();
    },

    getUser(id) {
      return ensure().users.find((u) => u.id === id);
    },
    getUsers() {
      return ensure().users;
    },
    getRole(userId) {
      return (
        ensure().memberships.find((m) => m.userId === userId)?.role ?? "viewer"
      );
    },
    getProject(id) {
      return ensure().projects.find((p) => p.id === id);
    },
    getProjects() {
      return ensure().projects;
    },
    getTask(id) {
      return ensure().tasks.find((t) => t.id === id);
    },
    getTasks() {
      return ensure().tasks;
    },
    getIssue(id) {
      return ensure().issues.find((i) => i.id === id);
    },
    getIssues() {
      return ensure().issues;
    },
    getComments(taskId) {
      return ensure().comments.filter((c) => c.taskId === taskId);
    },
    getActivity(limit = 15) {
      return ensure().activity.slice(0, limit);
    },

    createProject(input) {
      const db = ensure();
      const now = new Date().toISOString();
      const project: Project = { id: makeId("prj"), ...input, createdAt: now };
      db.projects.unshift(project);
      logActivity(db, {
        actorId: actor(db),
        verb: "created",
        entityType: "project",
        entityId: project.id,
        entityLabel: project.name,
        meta: project.status.replace("_", " "),
        at: now,
      });
      return project;
    },

    updateProject(id, input) {
      const db = ensure();
      const idx = db.projects.findIndex((p) => p.id === id);
      if (idx < 0) throw new Error("Project not found");
      const prev = db.projects[idx];
      db.projects[idx] = { ...prev, ...input };
      logActivity(db, {
        actorId: actor(db),
        verb: "updated",
        entityType: "project",
        entityId: id,
        entityLabel: input.name,
        meta: input.status.replace("_", " "),
        at: new Date().toISOString(),
      });
      return db.projects[idx];
    },

    createTask(input) {
      const db = ensure();
      const now = new Date().toISOString();
      const task: Task = {
        id: makeId("tsk"),
        ...input,
        order: db.tasks.length,
        createdAt: now,
        updatedAt: now,
      };
      db.tasks.unshift(task);
      logActivity(db, {
        actorId: actor(db),
        verb: "created",
        entityType: "task",
        entityId: task.id,
        entityLabel: task.title,
        meta: task.status.replace("_", " "),
        at: now,
      });
      return task;
    },

    updateTask(id, input) {
      const db = ensure();
      const idx = db.tasks.findIndex((t) => t.id === id);
      if (idx < 0) throw new Error("Task not found");
      const prev = db.tasks[idx];
      const next: Task = {
        ...prev,
        ...input,
        updatedAt: new Date().toISOString(),
      };
      db.tasks[idx] = next;
      logActivity(db, {
        actorId: actor(db),
        verb: input.assigneeId && input.assigneeId !== prev.assigneeId ? "assigned" : "updated",
        entityType: "task",
        entityId: id,
        entityLabel: next.title,
        meta: next.assigneeId
          ? (db.users.find((u) => u.id === next.assigneeId)?.name ?? "")
          : next.status.replace("_", " "),
        at: next.updatedAt,
      });
      return next;
    },

    moveTask(id, status, order) {
      const db = ensure();
      const idx = db.tasks.findIndex((t) => t.id === id);
      if (idx < 0) throw new Error("Task not found");
      const now = new Date().toISOString();
      const prev = db.tasks[idx];
      const next: Task = { ...prev, status, order, updatedAt: now };
      db.tasks[idx] = next;
      logActivity(db, {
        actorId: actor(db),
        verb: "moved",
        entityType: "task",
        entityId: id,
        entityLabel: next.title,
        meta: status.replace("_", " "),
        at: now,
      });
      return next;
    },

    deleteTask(id) {
      const db = ensure();
      const task = db.tasks.find((t) => t.id === id);
      if (!task) return;
      db.tasks = db.tasks.filter((t) => t.id !== id);
      db.issues.forEach((iss) => {
        iss.linkedTaskIds = iss.linkedTaskIds.filter((tid) => tid !== id);
      });
      logActivity(db, {
        actorId: actor(db),
        verb: "closed",
        entityType: "task",
        entityId: id,
        entityLabel: task.title,
        at: new Date().toISOString(),
      });
    },

    createIssue(input) {
      const db = ensure();
      const now = new Date().toISOString();
      const project = db.projects.find((p) => p.id === input.projectId);
      const count = db.issues.filter((i) => i.projectId === input.projectId).length;
      const issue: Issue = {
        id: makeId("iss"),
        key: `${project?.key ?? "GEN"}-${100 + count}`,
        ...input,
        reporterId: actor(db),
        createdAt: now,
        resolvedAt: input.status === "resolved" ? now : null,
      };
      db.issues.unshift(issue);
      logActivity(db, {
        actorId: actor(db),
        verb: "created",
        entityType: "issue",
        entityId: issue.id,
        entityLabel: `${issue.key} ${issue.title}`,
        meta: issue.severity,
        at: now,
      });
      return issue;
    },

    updateIssue(id, input) {
      const db = ensure();
      const idx = db.issues.findIndex((i) => i.id === id);
      if (idx < 0) throw new Error("Issue not found");
      const prev = db.issues[idx];
      const now = new Date().toISOString();
      const next: Issue = {
        ...prev,
        ...input,
        resolvedAt:
          input.status === "resolved" ? (prev.resolvedAt ?? now) : null,
      };
      db.issues[idx] = next;
      const verb: ActivityVerb =
        input.status === "resolved" && prev.status !== "resolved"
          ? "resolved"
          : input.status !== "resolved" && prev.status === "resolved"
            ? "reopened"
            : "updated";
      logActivity(db, {
        actorId: actor(db),
        verb,
        entityType: "issue",
        entityId: id,
        entityLabel: `${next.key} ${next.title}`,
        meta: next.severity,
        at: now,
      });
      return next;
    },

    linkIssueTasks(issueId, taskIds) {
      const db = ensure();
      const idx = db.issues.findIndex((i) => i.id === issueId);
      if (idx < 0) throw new Error("Issue not found");
      db.issues[idx].linkedTaskIds = taskIds;
      logActivity(db, {
        actorId: actor(db),
        verb: "linked",
        entityType: "issue",
        entityId: issueId,
        entityLabel: `${db.issues[idx].key} ${db.issues[idx].title}`,
        meta: `${taskIds.length} task${taskIds.length === 1 ? "" : "s"}`,
        at: new Date().toISOString(),
      });
      return db.issues[idx];
    },

    deleteIssue(id) {
      const db = ensure();
      const issue = db.issues.find((i) => i.id === id);
      if (!issue) return;
      db.issues = db.issues.filter((i) => i.id !== id);
      logActivity(db, {
        actorId: actor(db),
        verb: "closed",
        entityType: "issue",
        entityId: id,
        entityLabel: `${issue.key} ${issue.title}`,
        at: new Date().toISOString(),
      });
    },

    createComment(taskId, body, authorId) {
      const db = ensure();
      const comment: Comment = {
        id: makeId("cmt"),
        taskId,
        authorId,
        body,
        createdAt: new Date().toISOString(),
      };
      db.comments.push(comment);
      const task = db.tasks.find((t) => t.id === taskId);
      logActivity(db, {
        actorId: authorId,
        verb: "commented",
        entityType: "task",
        entityId: taskId,
        entityLabel: task?.title ?? taskId,
        at: comment.createdAt,
      });
      return comment;
    },

    setRole(userId, role) {
      const db = ensure();
      const m = db.memberships.find((x) => x.userId === userId);
      if (!m) throw new Error("Member not found");
      m.role = role;
      logActivity(db, {
        actorId: actor(db),
        verb: "updated",
        entityType: "member",
        entityId: userId,
        entityLabel: db.users.find((u) => u.id === userId)?.name ?? userId,
        meta: `role → ${role}`,
        at: new Date().toISOString(),
      });
    },

    removeMember(userId) {
      const db = ensure();
      db.memberships = db.memberships.filter((m) => m.userId !== userId);
      db.tasks.forEach((t) => {
        if (t.assigneeId === userId) t.assigneeId = null;
      });
      logActivity(db, {
        actorId: actor(db),
        verb: "closed",
        entityType: "member",
        entityId: userId,
        entityLabel: db.users.find((u) => u.id === userId)?.name ?? userId,
        at: new Date().toISOString(),
      });
    },

    setCurrentUser(userId) {
      ensure().currentUserId = userId;
    },

    reset() {
      globalThis.__zenithStore = buildSeed();
    },
  };

  return repo;
}

/** Singleton used by server actions and RSC pages. */
export const store: Store = createStore();
