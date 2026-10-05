/**
 * Repository seam (plan.md §5, constitution §V).
 *
 * UI, server actions and the service layer depend ONLY on these interfaces.
 * Nothing outside `src/lib/repo` knows which adapter is behind them — swap
 * the SQLite adapter for Postgres by implementing `Store` in a new file and
 * changing one line in `src/lib/repo/index.ts`.
 *
 * Sealed on purpose:
 *  - there is no `db: DBShape` escape hatch, so callers cannot depend on the
 *    adapter's storage shape (a SQL adapter would otherwise have to
 *    materialise the whole database in memory to satisfy it);
 *  - mutations take an explicit `actorId`, so the store never holds session
 *    state and can be driven from tests without a Next.js request.
 */

export type Role = "owner" | "admin" | "member" | "viewer";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done";
export type Priority = "urgent" | "high" | "medium" | "low";
export type IssueSeverity = "critical" | "high" | "medium" | "low";
export type IssueStatus = "open" | "in_progress" | "resolved";
export type ActivityVerb =
  | "created"
  | "updated"
  | "moved"
  | "assigned"
  | "resolved"
  | "closed"
  | "reopened"
  | "commented"
  | "linked";

export interface User {
  id: string;
  name: string;
  email: string;
  title: string;
  /** Avatar fill — one of the brand chord steps (no arbitrary colours). */
  avatarColor: string;
}

export interface Membership {
  userId: string;
  role: Role;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  status: ProjectStatus;
  leadId: string;
  startDate: string;
  targetDate: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  dueDate: string | null;
  labels: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: string;
  key: string;
  projectId: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  reporterId: string;
  assigneeId: string | null;
  linkedTaskIds: string[];
  createdAt: string;
  resolvedAt: string | null;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  actorId: string;
  verb: ActivityVerb;
  entityType: "task" | "issue" | "project" | "member";
  entityId: string;
  entityLabel: string;
  meta?: string;
  at: string;
}

/** A member with the role they hold in this workspace. */
export interface Member {
  user: User;
  role: Role;
}

/**
 * Adapter-internal row bundle. Not part of the public seam — it exists so
 * `buildSeed()` can hand the same data to whichever adapter is active.
 */
export interface DBShape {
  users: User[];
  memberships: Membership[];
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  comments: Comment[];
  activity: ActivityEvent[];
}

/* ── Read API ─────────────────────────────────────────────── */

export interface Repo {
  getUsers(): User[];
  getUser(id: string): User | undefined;
  getMemberships(): Membership[];
  /** Members in workspace order (membership order), never `undefined`. */
  getMembers(): Member[];
  getRole(userId: string): Role;
  getProjects(): Project[];
  getProject(id: string): Project | undefined;
  getTasks(): Task[];
  getTask(id: string): Task | undefined;
  getIssues(): Issue[];
  getIssue(id: string): Issue | undefined;
  getComments(taskId: string): Comment[];
  getActivity(limit?: number): ActivityEvent[];
}

/* ── Mutation payloads (validated by Zod in lib/schemas) ──── */

export interface ProjectInput {
  key: string;
  name: string;
  description: string;
  status: ProjectStatus;
  leadId: string;
  startDate: string;
  targetDate: string;
}

export interface TaskInput {
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  dueDate: string | null;
  labels: string[];
}

export interface IssueInput {
  projectId: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  assigneeId: string | null;
  linkedTaskIds: string[];
}

/**
 * The only write path. Every mutation takes the acting user's id first —
 * authorization is the service layer's job, provenance is the store's.
 */
export interface Store extends Repo {
  createProject(actorId: string, input: ProjectInput): Project;
  updateProject(actorId: string, id: string, input: ProjectInput): Project;
  createTask(actorId: string, input: TaskInput): Task;
  updateTask(actorId: string, id: string, input: TaskInput): Task;
  moveTask(actorId: string, id: string, status: TaskStatus, order: number): Task;
  deleteTask(actorId: string, id: string): void;
  createIssue(actorId: string, input: IssueInput): Issue;
  updateIssue(actorId: string, id: string, input: IssueInput): Issue;
  linkIssueTasks(actorId: string, issueId: string, taskIds: string[]): Issue;
  deleteIssue(actorId: string, id: string): void;
  createComment(actorId: string, taskId: string, body: string): Comment;
  setRole(actorId: string, userId: string, role: Role): void;
  removeMember(actorId: string, userId: string): void;
  /** Restore the seed data (demo escape hatch). */
  reset(): void;
}
