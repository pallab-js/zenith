/**
 * Repository seam (plan.md §1, constitution §V).
 * UI and server actions depend ONLY on these interfaces. Swapping the in-memory
 * adapter for Postgres/Drizzle means adding one file — nothing else changes.
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

export interface DBShape {
  users: User[];
  memberships: Membership[];
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  comments: Comment[];
  activity: ActivityEvent[];
  /** Mock session: currently signed-in user id. */
  currentUserId: string;
}

/* ── Read API ─────────────────────────────────────────────── */

export interface Repo {
  readonly db: DBShape;
  getUser(id: string): User | undefined;
  getUsers(): User[];
  getRole(userId: string): Role;
  getProject(id: string): Project | undefined;
  getProjects(): Project[];
  getTask(id: string): Task | undefined;
  getTasks(): Task[];
  getIssue(id: string): Issue | undefined;
  getIssues(): Issue[];
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

export interface Store extends Repo {
  createProject(input: ProjectInput): Project;
  updateProject(id: string, input: ProjectInput): Project;
  createTask(input: TaskInput): Task;
  updateTask(id: string, input: TaskInput): Task;
  moveTask(id: string, status: TaskStatus, order: number): Task;
  deleteTask(id: string): void;
  createIssue(input: IssueInput): Issue;
  updateIssue(id: string, input: IssueInput): Issue;
  linkIssueTasks(issueId: string, taskIds: string[]): Issue;
  deleteIssue(id: string): void;
  createComment(taskId: string, body: string, authorId: string): Comment;
  setRole(userId: string, role: Role): void;
  removeMember(userId: string): void;
  setCurrentUser(userId: string): void;
  reset(): void;
}
