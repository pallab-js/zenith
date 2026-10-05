"use server";

import { revalidatePath } from "next/cache";
import { store } from "@/lib/repo/in-memory";
import { can, type Capability } from "@/lib/permissions";
import {
  commentInputSchema,
  issueInputSchema,
  projectInputSchema,
  roleChangeSchema,
  taskInputSchema,
} from "@/lib/schemas";
import type { Issue, Project, Role, Task, TaskStatus } from "@/lib/repo/types";

/* ── Session (mock auth) ──────────────────────────────────── */

export async function getSession() {
  const userId = store.db.currentUserId;
  const user = store.getUser(userId);
  const role = store.getRole(userId);
  return { user: user ?? store.getUsers()[0], role };
}

export async function switchUser(userId: string) {
  if (!store.getUser(userId)) return;
  store.setCurrentUser(userId);
  revalidatePath("/", "layout");
}

/* ── Guard ────────────────────────────────────────────────── */

class PermissionError extends Error {}

function requireCap(cap: Capability): Role {
  const role = store.getRole(store.db.currentUserId);
  if (!can(role, cap)) {
    throw new PermissionError(
      `Your role (${role}) can't perform this action`,
    );
  }
  return role;
}

function result<T>(fn: () => T): { ok: true; data: T } | { ok: false; error: string } {
  try {
    const data = fn();
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (e) {
    const msg =
      e instanceof PermissionError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Something went wrong";
    return { ok: false, error: msg };
  }
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/* ── Projects ─────────────────────────────────────────────── */

export async function saveProject(
  id: string | null,
  input: unknown,
): Promise<ActionResult<Project>> {
  return result(() => {
    requireCap("project:write");
    const parsed = projectInputSchema.parse(input);
    return id ? store.updateProject(id, parsed) : store.createProject(parsed);
  });
}

/* ── Tasks ────────────────────────────────────────────────── */

export async function saveTask(
  id: string | null,
  input: unknown,
): Promise<ActionResult<Task>> {
  return result(() => {
    requireCap("task:write");
    const parsed = taskInputSchema.parse(input);
    return id ? store.updateTask(id, parsed) : store.createTask(parsed);
  });
}

export async function moveTaskAction(
  id: string,
  status: TaskStatus,
  order: number,
): Promise<ActionResult<Task>> {
  return result(() => {
    requireCap("task:write");
    return store.moveTask(id, status, order);
  });
}

export async function deleteTaskAction(id: string): Promise<ActionResult<void>> {
  return result(() => {
    requireCap("task:write");
    store.deleteTask(id);
  });
}

/* ── Issues ───────────────────────────────────────────────── */

export async function saveIssue(
  id: string | null,
  input: unknown,
): Promise<ActionResult<Issue>> {
  return result(() => {
    requireCap("issue:write");
    const parsed = issueInputSchema.parse(input);
    return id ? store.updateIssue(id, parsed) : store.createIssue(parsed);
  });
}

export async function linkIssueTasksAction(
  issueId: string,
  taskIds: string[],
): Promise<ActionResult<Issue>> {
  return result(() => {
    requireCap("issue:write");
    return store.linkIssueTasks(issueId, taskIds);
  });
}

export async function deleteIssueAction(
  id: string,
): Promise<ActionResult<void>> {
  return result(() => {
    requireCap("issue:write");
    store.deleteIssue(id);
  });
}

/* ── Comments ─────────────────────────────────────────────── */

export async function addCommentAction(
  taskId: string,
  body: string,
): Promise<ActionResult<void>> {
  return result(() => {
    requireCap("comment:write");
    const parsed = commentInputSchema.parse({ taskId, body });
    store.createComment(parsed.taskId, parsed.body, store.db.currentUserId);
  });
}

/* ── Team ─────────────────────────────────────────────────── */

export async function setMemberRoleAction(
  userId: string,
  role: Role,
): Promise<ActionResult<void>> {
  return result(() => {
    requireCap("member:write");
    const parsed = roleChangeSchema.parse({ userId, role });
    if (userId === store.db.currentUserId && role === "viewer") {
      throw new Error("You can't demote yourself to viewer");
    }
    store.setRole(parsed.userId, parsed.role);
  });
}

export async function removeMemberAction(
  userId: string,
): Promise<ActionResult<void>> {
  return result(() => {
    requireCap("member:remove");
    if (userId === store.db.currentUserId) {
      throw new Error("You can't remove yourself");
    }
    const ownerCount = store.db.memberships.filter(
      (m) => m.role === "owner",
    ).length;
    const target = store.db.memberships.find((m) => m.userId === userId);
    if (target?.role === "owner" && ownerCount <= 1) {
      throw new Error("There must be at least one owner");
    }
    store.removeMember(userId);
  });
}

export async function resetWorkspaceAction(): Promise<ActionResult<void>> {
  return result(() => {
    requireCap("member:remove");
    store.reset();
  });
}
