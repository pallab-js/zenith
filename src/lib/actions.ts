"use server";

import { revalidatePath } from "next/cache";
import { store } from "@/lib/repo";
import { getSession, setSessionUser } from "@/lib/server/session";
import * as service from "@/lib/service";
import type { Issue, Project, Role, Task, TaskStatus } from "@/lib/repo/types";

/**
 * Server actions — the HTTP edge of the write path and nothing else:
 *
 *   cookie → session → `lib/service.ts` (authorize · validate · mutate) →
 *   revalidate → typed result
 *
 * Keeping this file thin is what lets `scripts/smoke.ts` test the rules
 * without a request, and what keeps the rules testable without a server.
 */

export type ActionResult<T> = service.ActionResult<T>;

/** Resolve the acting user, run the domain rule, refresh on success. */
async function action<T>(
  fn: (actorId: string) => service.ActionResult<T>,
): Promise<service.ActionResult<T>> {
  try {
    const session = await getSession();
    const result = fn(session.userId);
    if (result.ok) revalidatePath("/", "layout");
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

/* ── Session (mock auth) ──────────────────────────────────── */

/**
 * Adopt an identity for this browser. The id is validated against the
 * member list and written to an httpOnly cookie — the client can request an
 * identity but can never edit the session value itself.
 */
export async function switchUser(userId: string): Promise<void> {
  if (!store.getUser(userId)) return;
  await setSessionUser(userId);
  revalidatePath("/", "layout");
}

/* ── Projects ─────────────────────────────────────────────── */

export async function saveProject(
  id: string | null,
  input: unknown,
): Promise<ActionResult<Project>> {
  return action((actorId) => service.saveProject(actorId, id, input));
}

/* ── Tasks ────────────────────────────────────────────────── */

export async function saveTask(
  id: string | null,
  input: unknown,
): Promise<ActionResult<Task>> {
  return action((actorId) => service.saveTask(actorId, id, input));
}

export async function moveTaskAction(
  id: string,
  status: TaskStatus,
  order: number,
): Promise<ActionResult<Task>> {
  return action((actorId) => service.moveTask(actorId, id, status, order));
}

export async function deleteTaskAction(id: string): Promise<ActionResult<void>> {
  return action((actorId) => service.deleteTask(actorId, id));
}

/* ── Issues ───────────────────────────────────────────────── */

export async function saveIssue(
  id: string | null,
  input: unknown,
): Promise<ActionResult<Issue>> {
  return action((actorId) => service.saveIssue(actorId, id, input));
}

export async function linkIssueTasksAction(
  issueId: string,
  taskIds: string[],
): Promise<ActionResult<Issue>> {
  return action((actorId) => service.linkIssueTasks(actorId, issueId, taskIds));
}

export async function deleteIssueAction(id: string): Promise<ActionResult<void>> {
  return action((actorId) => service.deleteIssue(actorId, id));
}

/* ── Comments ─────────────────────────────────────────────── */

export async function addCommentAction(
  taskId: string,
  body: string,
): Promise<ActionResult<void>> {
  return action((actorId) => service.addComment(actorId, taskId, body));
}

/* ── Team ─────────────────────────────────────────────────── */

export async function setMemberRoleAction(
  userId: string,
  role: Role,
): Promise<ActionResult<void>> {
  return action((actorId) => service.setMemberRole(actorId, userId, role));
}

export async function removeMemberAction(userId: string): Promise<ActionResult<void>> {
  return action((actorId) => service.removeMember(actorId, userId));
}

export async function resetWorkspaceAction(): Promise<ActionResult<void>> {
  return action((actorId) => service.resetWorkspace(actorId));
}
