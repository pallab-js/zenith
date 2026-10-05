import { ACTIVITY_LIMIT, activity, type NewActivity } from "@/lib/repo/events";
import type {
  Comment,
  DBShape,
  Issue,
  Member,
  Project,
  Store,
  Task,
} from "@/lib/repo/types";
import { buildSeed } from "@/lib/seed";
import { makeId } from "@/lib/utils";

/**
 * In-memory adapter (tests / `ZENITH_REPO=memory`).
 *
 * The store lives on `globalThis` so every route handler, server action and
 * RSC render shares one instance across HMR. State resets when the server
 * process restarts — the SQLite adapter is the persistent default.
 */

declare global {
  var __zenithStore: DBShape | undefined;
}

function ensure(): DBShape {
  if (!globalThis.__zenithStore) globalThis.__zenithStore = buildSeed();
  return globalThis.__zenithStore;
}

function log(db: DBShape, event: NewActivity): void {
  db.activity.unshift({ ...event, id: makeId("act") });
  if (db.activity.length > ACTIVITY_LIMIT) db.activity.length = ACTIVITY_LIMIT;
}

function memberName(db: DBShape, userId: string | null): string | undefined {
  if (!userId) return undefined;
  return db.users.find((u) => u.id === userId)?.name;
}

export function createInMemoryStore(): Store {
  const repo: Store = {
    getUsers() {
      return ensure().users;
    },
    getUser(id) {
      return ensure().users.find((u) => u.id === id);
    },
    getMemberships() {
      return ensure().memberships;
    },
    getMembers() {
      const db = ensure();
      return db.memberships.flatMap<Member>((m) => {
        const user = db.users.find((u) => u.id === m.userId);
        return user ? [{ user, role: m.role }] : [];
      });
    },
    getRole(userId) {
      return (
        ensure().memberships.find((m) => m.userId === userId)?.role ?? "viewer"
      );
    },
    getProjects() {
      return ensure().projects;
    },
    getProject(id) {
      return ensure().projects.find((p) => p.id === id);
    },
    getTasks() {
      return ensure().tasks;
    },
    getTask(id) {
      return ensure().tasks.find((t) => t.id === id);
    },
    getIssues() {
      return ensure().issues;
    },
    getIssue(id) {
      return ensure().issues.find((i) => i.id === id);
    },
    getComments(taskId) {
      return ensure().comments.filter((c) => c.taskId === taskId);
    },
    getActivity(limit = 15) {
      return ensure().activity.slice(0, limit);
    },

    createProject(actorId, input) {
      const db = ensure();
      const now = new Date().toISOString();
      const project: Project = { id: makeId("prj"), ...input, createdAt: now };
      db.projects.unshift(project);
      log(db, activity.projectCreated(actorId, project, now));
      return project;
    },

    updateProject(actorId, id, input) {
      const db = ensure();
      const idx = db.projects.findIndex((p) => p.id === id);
      if (idx < 0) throw new Error("Project not found");
      db.projects[idx] = { ...db.projects[idx], ...input };
      log(db, activity.projectUpdated(actorId, id, input.name, input.status));
      return db.projects[idx];
    },

    createTask(actorId, input) {
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
      log(db, activity.taskCreated(actorId, task, now));
      return task;
    },

    updateTask(actorId, id, input) {
      const db = ensure();
      const idx = db.tasks.findIndex((t) => t.id === id);
      if (idx < 0) throw new Error("Task not found");
      const prev = db.tasks[idx];
      const next: Task = { ...prev, ...input, updatedAt: new Date().toISOString() };
      db.tasks[idx] = next;
      log(
        db,
        activity.taskUpdated(actorId, prev, next, memberName(db, next.assigneeId)),
      );
      return next;
    },

    moveTask(actorId, id, status, order) {
      const db = ensure();
      const idx = db.tasks.findIndex((t) => t.id === id);
      if (idx < 0) throw new Error("Task not found");
      const now = new Date().toISOString();
      const next: Task = { ...db.tasks[idx], status, order, updatedAt: now };
      db.tasks[idx] = next;
      log(db, activity.taskMoved(actorId, next, now));
      return next;
    },

    deleteTask(actorId, id) {
      const db = ensure();
      const task = db.tasks.find((t) => t.id === id);
      if (!task) return;
      db.tasks = db.tasks.filter((t) => t.id !== id);
      db.issues.forEach((iss) => {
        iss.linkedTaskIds = iss.linkedTaskIds.filter((tid) => tid !== id);
      });
      log(db, activity.taskDeleted(actorId, task));
    },

    createIssue(actorId, input) {
      const db = ensure();
      const now = new Date().toISOString();
      const project = db.projects.find((p) => p.id === input.projectId);
      const count = db.issues.filter((i) => i.projectId === input.projectId).length;
      const issue: Issue = {
        id: makeId("iss"),
        key: `${project?.key ?? "GEN"}-${100 + count}`,
        ...input,
        reporterId: actorId,
        createdAt: now,
        resolvedAt: input.status === "resolved" ? now : null,
      };
      db.issues.unshift(issue);
      log(db, activity.issueCreated(actorId, issue, now));
      return issue;
    },

    updateIssue(actorId, id, input) {
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
      log(db, activity.issueUpdated(actorId, prev.status, next, now));
      return next;
    },

    linkIssueTasks(actorId, issueId, taskIds) {
      const db = ensure();
      const idx = db.issues.findIndex((i) => i.id === issueId);
      if (idx < 0) throw new Error("Issue not found");
      db.issues[idx].linkedTaskIds = taskIds;
      log(db, activity.issueLinked(actorId, db.issues[idx], taskIds.length));
      return db.issues[idx];
    },

    deleteIssue(actorId, id) {
      const db = ensure();
      const issue = db.issues.find((i) => i.id === id);
      if (!issue) return;
      db.issues = db.issues.filter((i) => i.id !== id);
      log(db, activity.issueDeleted(actorId, issue));
    },

    createComment(actorId, taskId, body) {
      const db = ensure();
      const comment: Comment = {
        id: makeId("cmt"),
        taskId,
        authorId: actorId,
        body,
        createdAt: new Date().toISOString(),
      };
      db.comments.push(comment);
      const task = db.tasks.find((t) => t.id === taskId);
      log(
        db,
        activity.commentCreated(actorId, taskId, task?.title ?? taskId, comment.createdAt),
      );
      return comment;
    },

    setRole(actorId, userId, role) {
      const db = ensure();
      const membership = db.memberships.find((m) => m.userId === userId);
      if (!membership) throw new Error("Member not found");
      membership.role = role;
      log(
        db,
        activity.roleChanged(actorId, userId, memberName(db, userId) ?? userId, role),
      );
    },

    removeMember(actorId, userId) {
      const db = ensure();
      if (!db.memberships.some((m) => m.userId === userId)) {
        throw new Error("Member not found");
      }
      const name = memberName(db, userId) ?? userId;
      db.memberships = db.memberships.filter((m) => m.userId !== userId);
      db.tasks.forEach((t) => {
        if (t.assigneeId === userId) t.assigneeId = null;
      });
      log(db, activity.memberRemoved(actorId, userId, name));
    },

    reset() {
      globalThis.__zenithStore = buildSeed();
    },
  };

  return repo;
}
