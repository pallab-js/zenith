import Database, { type Database as Sqlite } from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { ACTIVITY_LIMIT, activity, type NewActivity } from "@/lib/repo/events";
import type {
  ActivityEvent,
  Comment,
  DBShape,
  Issue,
  Member,
  Membership,
  Project,
  Store,
  Task,
} from "@/lib/repo/types";
import { buildSeed } from "@/lib/seed";
import { makeId } from "@/lib/utils";

/**
 * SQLite adapter — the default store.
 *
 * Zero-config: the file is created and seeded on first use, so "clone →
 * pnpm install → pnpm dev" still holds. WAL mode + a busy timeout keep the
 * single Next.js server process (and `next build`'s page-data workers) safe.
 *
 * Swap point: implement `Store` against Postgres/Drizzle in a new file and
 * point `src/lib/repo/index.ts` at it — nothing outside `src/lib/repo` changes.
 *
 * Path comes from `ZENITH_DB_PATH` (default `./zenith.db`, `:memory:` allowed).
 */

const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  avatar_color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL,
  lead_id     TEXT NOT NULL,
  start_date  TEXT NOT NULL,
  target_date TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL,
  priority    TEXT NOT NULL,
  assignee_id TEXT,
  due_date    TEXT,
  labels      TEXT NOT NULL DEFAULT '[]',
  ord         INTEGER NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_project  ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

CREATE TABLE IF NOT EXISTS issues (
  id              TEXT PRIMARY KEY,
  key             TEXT NOT NULL,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  severity        TEXT NOT NULL,
  status          TEXT NOT NULL,
  reporter_id     TEXT NOT NULL,
  assignee_id     TEXT,
  linked_task_ids TEXT NOT NULL DEFAULT '[]',
  created_at      TEXT NOT NULL,
  resolved_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);

CREATE TABLE IF NOT EXISTS activity (
  seq         INTEGER PRIMARY KEY AUTOINCREMENT,
  id          TEXT NOT NULL UNIQUE,
  actor_id    TEXT NOT NULL,
  verb        TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  entity_label TEXT NOT NULL,
  meta        TEXT,
  at          TEXT NOT NULL
);
`;

/* ── Row shapes ───────────────────────────────────────────── */

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string | null;
  due_date: string | null;
  labels: string;
  ord: number;
  created_at: string;
  updated_at: string;
}

interface IssueRow {
  id: string;
  key: string;
  project_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  reporter_id: string;
  assignee_id: string | null;
  linked_task_ids: string;
  created_at: string;
  resolved_at: string | null;
}

const parseIds = (json: string): string[] => {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const taskFromRow = (r: TaskRow): Task => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  description: r.description,
  status: r.status as Task["status"],
  priority: r.priority as Task["priority"],
  assigneeId: r.assignee_id,
  dueDate: r.due_date,
  labels: parseIds(r.labels),
  order: r.ord,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const issueFromRow = (r: IssueRow): Issue => ({
  id: r.id,
  key: r.key,
  projectId: r.project_id,
  title: r.title,
  description: r.description,
  severity: r.severity as Issue["severity"],
  status: r.status as Issue["status"],
  reporterId: r.reporter_id,
  assigneeId: r.assignee_id,
  linkedTaskIds: parseIds(r.linked_task_ids),
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
});

/* ── Connection ───────────────────────────────────────────── */

declare global {
  var __zenithSqlite: Sqlite | undefined;
}

function databaseFile(): string {
  return process.env.ZENITH_DB_PATH ?? path.join(process.cwd(), "zenith.db");
}

function seedIfEmpty(db: Sqlite): void {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (n > 0) return;

  const seed = buildSeed();
  const insert = db.transaction((s: DBShape) => {
    const user = s.users.length
      ? db.prepare(
          "INSERT INTO users (id, name, email, title, avatar_color) VALUES (?, ?, ?, ?, ?)",
        )
      : null;
    for (const u of s.users) user?.run(u.id, u.name, u.email, u.title, u.avatarColor);

    const membership = db.prepare(
      "INSERT INTO memberships (user_id, role) VALUES (?, ?)",
    );
    for (const m of s.memberships) membership.run(m.userId, m.role);

    const project = db.prepare(
      `INSERT INTO projects (id, key, name, description, status, lead_id, start_date, target_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const p of s.projects) {
      project.run(
        p.id, p.key, p.name, p.description, p.status, p.leadId,
        p.startDate, p.targetDate, p.createdAt,
      );
    }

    const task = db.prepare(
      `INSERT INTO tasks (id, project_id, title, description, status, priority,
                          assignee_id, due_date, labels, ord, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const t of s.tasks) {
      task.run(
        t.id, t.projectId, t.title, t.description, t.status, t.priority,
        t.assigneeId, t.dueDate, JSON.stringify(t.labels), t.order,
        t.createdAt, t.updatedAt,
      );
    }

    const issue = db.prepare(
      `INSERT INTO issues (id, key, project_id, title, description, severity, status,
                           reporter_id, assignee_id, linked_task_ids, created_at, resolved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const i of s.issues) {
      issue.run(
        i.id, i.key, i.projectId, i.title, i.description, i.severity, i.status,
        i.reporterId, i.assigneeId, JSON.stringify(i.linkedTaskIds),
        i.createdAt, i.resolvedAt,
      );
    }

    const comment = db.prepare(
      "INSERT INTO comments (id, task_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    for (const c of s.comments) {
      comment.run(c.id, c.taskId, c.authorId, c.body, c.createdAt);
    }

    const log = db.prepare(
      `INSERT INTO activity (id, actor_id, verb, entity_type, entity_id, entity_label, meta, at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    // buildSeed() returns newest-first; insert oldest-first so `seq` reads chronologically.
    for (const e of [...s.activity].reverse()) {
      log.run(e.id, e.actorId, e.verb, e.entityType, e.entityId, e.entityLabel, e.meta ?? null, e.at);
    }
  });
  insert(seed);
}

function open(): Sqlite {
  if (globalThis.__zenithSqlite) return globalThis.__zenithSqlite;

  const file = databaseFile();
  if (file !== ":memory:") {
    mkdirSync(path.dirname(file), { recursive: true });
  }

  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  seedIfEmpty(db);

  globalThis.__zenithSqlite = db;
  return db;
}

function log(db: Sqlite, event: NewActivity): void {
  db.prepare(
    `INSERT INTO activity (id, actor_id, verb, entity_type, entity_id, entity_label, meta, at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    makeId("act"),
    event.actorId,
    event.verb,
    event.entityType,
    event.entityId,
    event.entityLabel,
    event.meta ?? null,
    event.at,
  );
  db.prepare(
    "DELETE FROM activity WHERE seq <= (SELECT MAX(seq) - ? FROM activity)",
  ).run(ACTIVITY_LIMIT - 1);
}

const now = () => new Date().toISOString();

/* ── Standalone readers (shared by the store methods — no `this`) ── */

interface UserRow {
  id: string;
  name: string;
  email: string;
  title: string;
  avatar_color: string;
}

interface ProjectRow {
  id: string;
  key: string;
  name: string;
  description: string;
  status: string;
  lead_id: string;
  start_date: string;
  target_date: string;
  created_at: string;
}

interface CommentRow {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface ActivityRow {
  id: string;
  actor_id: string;
  verb: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  meta: string | null;
  at: string;
}

const mapUser = (r: UserRow) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  title: r.title,
  avatarColor: r.avatar_color,
});

const mapProject = (r: ProjectRow): Project => ({
  id: r.id,
  key: r.key,
  name: r.name,
  description: r.description,
  status: r.status as Project["status"],
  leadId: r.lead_id,
  startDate: r.start_date,
  targetDate: r.target_date,
  createdAt: r.created_at,
});

const TASK_COLUMNS = `id, project_id, title, description, status, priority,
                      assignee_id, due_date, labels, ord, created_at, updated_at`;
const ISSUE_COLUMNS = `id, key, project_id, title, description, severity, status,
                       reporter_id, assignee_id, linked_task_ids, created_at, resolved_at`;
const PROJECT_COLUMNS = `id, key, name, description, status, lead_id,
                         start_date, target_date, created_at`;

function readUser(id: string) {
  const row = open()
    .prepare("SELECT id, name, email, title, avatar_color FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;
  return row ? mapUser(row) : undefined;
}

function readProject(id: string) {
  const row = open()
    .prepare(`SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = ?`)
    .get(id) as ProjectRow | undefined;
  return row ? mapProject(row) : undefined;
}

function readTask(id: string) {
  const row = open()
    .prepare(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ?`)
    .get(id) as TaskRow | undefined;
  return row ? taskFromRow(row) : undefined;
}

function readIssue(id: string) {
  const row = open()
    .prepare(`SELECT ${ISSUE_COLUMNS} FROM issues WHERE id = ?`)
    .get(id) as IssueRow | undefined;
  return row ? issueFromRow(row) : undefined;
}

function readIssues(): Issue[] {
  return (open().prepare(`SELECT ${ISSUE_COLUMNS} FROM issues`).all() as IssueRow[]).map(
    issueFromRow,
  );
}

/* ── Store ────────────────────────────────────────────────── */

export function createSqliteStore(): Store {
  const repo: Store = {
    getUsers() {
      return (
        open()
          .prepare("SELECT id, name, email, title, avatar_color FROM users")
          .all() as UserRow[]
      ).map(mapUser);
    },

    getUser(id) {
      return readUser(id);
    },

    getMemberships() {
      return (
        open()
          .prepare("SELECT user_id, role FROM memberships")
          .all() as { user_id: string; role: string }[]
      ).map((r) => ({ userId: r.user_id, role: r.role as Membership["role"] }));
    },

    getMembers() {
      return (
        open()
          .prepare(
            `SELECT u.id, u.name, u.email, u.title, u.avatar_color, m.role
               FROM memberships m JOIN users u ON u.id = m.user_id`,
          )
          .all() as (UserRow & { role: string })[]
      ).map((r) => ({ user: mapUser(r), role: r.role as Member["role"] }));
    },

    getRole(userId) {
      const row = open()
        .prepare("SELECT role FROM memberships WHERE user_id = ?")
        .get(userId) as { role: string } | undefined;
      return (row?.role as Member["role"]) ?? "viewer";
    },

    getProjects() {
      return (
        open().prepare(`SELECT ${PROJECT_COLUMNS} FROM projects`).all() as ProjectRow[]
      ).map(mapProject);
    },

    getProject(id) {
      return readProject(id);
    },

    getTasks() {
      return (
        open()
          .prepare(`SELECT ${TASK_COLUMNS} FROM tasks ORDER BY ord ASC, created_at ASC`)
          .all() as TaskRow[]
      ).map(taskFromRow);
    },

    getTask(id) {
      return readTask(id);
    },

    getIssues() {
      return readIssues();
    },

    getIssue(id) {
      return readIssue(id);
    },

    getComments(taskId) {
      return (
        open()
          .prepare(
            `SELECT id, task_id, author_id, body, created_at
               FROM comments WHERE task_id = ? ORDER BY created_at ASC, rowid ASC`,
          )
          .all(taskId) as CommentRow[]
      ).map((r) => ({
        id: r.id,
        taskId: r.task_id,
        authorId: r.author_id,
        body: r.body,
        createdAt: r.created_at,
      }));
    },

    getActivity(limit = 15) {
      return (
        open()
          .prepare(
            `SELECT id, actor_id, verb, entity_type, entity_id, entity_label, meta, at
               FROM activity ORDER BY seq DESC LIMIT ?`,
          )
          .all(limit) as ActivityRow[]
      ).map((r) => ({
        id: r.id,
        actorId: r.actor_id,
        verb: r.verb as ActivityEvent["verb"],
        entityType: r.entity_type as ActivityEvent["entityType"],
        entityId: r.entity_id,
        entityLabel: r.entity_label,
        meta: r.meta ?? undefined,
        at: r.at,
      }));
    },

    createProject(actorId, input) {
      const db = open();
      const ts = now();
      const project: Project = { id: makeId("prj"), ...input, createdAt: ts };
      db.prepare(
        `INSERT INTO projects (id, key, name, description, status, lead_id, start_date, target_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        project.id, project.key, project.name, project.description, project.status,
        project.leadId, project.startDate, project.targetDate, project.createdAt,
      );
      log(db, activity.projectCreated(actorId, project, ts));
      return project;
    },

    updateProject(actorId, id, input) {
      const db = open();
      const prev = readProject(id);
      if (!prev) throw new Error("Project not found");
      db.prepare(
        `UPDATE projects SET key = ?, name = ?, description = ?, status = ?,
                             lead_id = ?, start_date = ?, target_date = ?
           WHERE id = ?`,
      ).run(
        input.key, input.name, input.description, input.status,
        input.leadId, input.startDate, input.targetDate, id,
      );
      log(db, activity.projectUpdated(actorId, id, input.name, input.status));
      return { ...prev, ...input };
    },

    createTask(actorId, input) {
      const db = open();
      const ts = now();
      const { n } = db.prepare("SELECT COUNT(*) AS n FROM tasks").get() as { n: number };
      const task: Task = {
        id: makeId("tsk"),
        ...input,
        order: n,
        createdAt: ts,
        updatedAt: ts,
      };
      db.prepare(
        `INSERT INTO tasks (id, project_id, title, description, status, priority,
                            assignee_id, due_date, labels, ord, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        task.id, task.projectId, task.title, task.description, task.status,
        task.priority, task.assigneeId, task.dueDate, JSON.stringify(task.labels),
        task.order, task.createdAt, task.updatedAt,
      );
      log(db, activity.taskCreated(actorId, task, ts));
      return task;
    },

    updateTask(actorId, id, input) {
      const db = open();
      const prev = readTask(id);
      if (!prev) throw new Error("Task not found");
      const ts = now();
      const next: Task = { ...prev, ...input, updatedAt: ts };
      db.prepare(
        `UPDATE tasks SET project_id = ?, title = ?, description = ?, status = ?,
                          priority = ?, assignee_id = ?, due_date = ?, labels = ?,
                          updated_at = ?
           WHERE id = ?`,
      ).run(
        next.projectId, next.title, next.description, next.status, next.priority,
        next.assigneeId, next.dueDate, JSON.stringify(next.labels), next.updatedAt, id,
      );
      const assigneeName = next.assigneeId
        ? readUser(next.assigneeId)?.name
        : undefined;
      log(db, activity.taskUpdated(actorId, prev, next, assigneeName));
      return next;
    },

    moveTask(actorId, id, status, order) {
      const db = open();
      const prev = readTask(id);
      if (!prev) throw new Error("Task not found");
      const ts = now();
      const next: Task = { ...prev, status, order, updatedAt: ts };
      db.prepare(
        "UPDATE tasks SET status = ?, ord = ?, updated_at = ? WHERE id = ?",
      ).run(status, order, ts, id);
      log(db, activity.taskMoved(actorId, next, ts));
      return next;
    },

    deleteTask(actorId, id) {
      const db = open();
      const task = readTask(id);
      if (!task) return;
      const unlink = db.transaction(() => {
        db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
        // Cascade would drop the rows; we only need to de-link task ids.
        for (const issue of readIssues()) {
          if (!issue.linkedTaskIds.includes(id)) continue;
          db.prepare("UPDATE issues SET linked_task_ids = ? WHERE id = ?").run(
            JSON.stringify(issue.linkedTaskIds.filter((t) => t !== id)),
            issue.id,
          );
        }
      });
      unlink();
      log(db, activity.taskDeleted(actorId, task));
    },

    createIssue(actorId, input) {
      const db = open();
      const ts = now();
      const project = readProject(input.projectId);
      const { n } = db
        .prepare("SELECT COUNT(*) AS n FROM issues WHERE project_id = ?")
        .get(input.projectId) as { n: number };
      const issue: Issue = {
        id: makeId("iss"),
        key: `${project?.key ?? "GEN"}-${100 + n}`,
        ...input,
        reporterId: actorId,
        createdAt: ts,
        resolvedAt: input.status === "resolved" ? ts : null,
      };
      db.prepare(
        `INSERT INTO issues (id, key, project_id, title, description, severity, status,
                             reporter_id, assignee_id, linked_task_ids, created_at, resolved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        issue.id, issue.key, issue.projectId, issue.title, issue.description,
        issue.severity, issue.status, issue.reporterId, issue.assigneeId,
        JSON.stringify(issue.linkedTaskIds), issue.createdAt, issue.resolvedAt,
      );
      log(db, activity.issueCreated(actorId, issue, ts));
      return issue;
    },

    updateIssue(actorId, id, input) {
      const db = open();
      const prev = readIssue(id);
      if (!prev) throw new Error("Issue not found");
      const ts = now();
      const next: Issue = {
        ...prev,
        ...input,
        resolvedAt: input.status === "resolved" ? (prev.resolvedAt ?? ts) : null,
      };
      db.prepare(
        `UPDATE issues SET project_id = ?, title = ?, description = ?, severity = ?,
                           status = ?, assignee_id = ?, linked_task_ids = ?, resolved_at = ?
           WHERE id = ?`,
      ).run(
        next.projectId, next.title, next.description, next.severity, next.status,
        next.assigneeId, JSON.stringify(next.linkedTaskIds), next.resolvedAt, id,
      );
      log(db, activity.issueUpdated(actorId, prev.status, next, ts));
      return next;
    },

    linkIssueTasks(actorId, issueId, taskIds) {
      const db = open();
      const issue = readIssue(issueId);
      if (!issue) throw new Error("Issue not found");
      db.prepare("UPDATE issues SET linked_task_ids = ? WHERE id = ?").run(
        JSON.stringify(taskIds),
        issueId,
      );
      const next = { ...issue, linkedTaskIds: taskIds };
      log(db, activity.issueLinked(actorId, next, taskIds.length));
      return next;
    },

    deleteIssue(actorId, id) {
      const db = open();
      const issue = readIssue(id);
      if (!issue) return;
      db.prepare("DELETE FROM issues WHERE id = ?").run(id);
      log(db, activity.issueDeleted(actorId, issue));
    },

    createComment(actorId, taskId, body) {
      const db = open();
      const comment: Comment = {
        id: makeId("cmt"),
        taskId,
        authorId: actorId,
        body,
        createdAt: now(),
      };
      db.prepare(
        "INSERT INTO comments (id, task_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(comment.id, comment.taskId, comment.authorId, comment.body, comment.createdAt);
      const task = readTask(taskId);
      log(db, activity.commentCreated(actorId, taskId, task?.title ?? taskId, comment.createdAt));
      return comment;
    },

    setRole(actorId, userId, role) {
      const db = open();
      const { changes } = db
        .prepare("UPDATE memberships SET role = ? WHERE user_id = ?")
        .run(role, userId);
      if (changes === 0) throw new Error("Member not found");
      const name = readUser(userId)?.name ?? userId;
      log(db, activity.roleChanged(actorId, userId, name, role));
    },

    removeMember(actorId, userId) {
      const db = open();
      const membership = db
        .prepare("SELECT 1 AS present FROM memberships WHERE user_id = ?")
        .get(userId);
      if (!membership) throw new Error("Member not found");
      const name = readUser(userId)?.name ?? userId;
      const strip = db.transaction(() => {
        db.prepare("DELETE FROM memberships WHERE user_id = ?").run(userId);
        db.prepare("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?").run(userId);
      });
      strip();
      log(db, activity.memberRemoved(actorId, userId, name));
    },

    reset() {
      const db = open();
      const wipe = db.transaction(() => {
        db.exec(
          "DELETE FROM activity; DELETE FROM comments; DELETE FROM issues; " +
            "DELETE FROM tasks; DELETE FROM projects; DELETE FROM memberships; DELETE FROM users;",
        );
      });
      wipe();
      seedIfEmpty(db);
    },
  };

  return repo;
}
