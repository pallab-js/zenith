/**
 * Service layer — the *rules* half of the write path.
 *
 *   UI → server action (session + revalidate) → **here** (authorize →
 *   validate → mutate) → repository seam
 *
 * Deliberately free of Next.js imports: no `cookies()`, no `next/cache`, so
 * `scripts/smoke.ts` can exercise every rule (permissions, validation,
 * invariants) directly, with an explicit `actorId`.
 */
import { ZodError } from "zod";
import { can, type Capability } from "@/lib/permissions";
import { store } from "@/lib/repo";
import {
  commentInputSchema,
  issueInputSchema,
  projectInputSchema,
  roleChangeSchema,
  taskInputSchema,
} from "@/lib/schemas";
import type {
  Issue,
  Project,
  Role,
  Task,
  TaskStatus,
} from "@/lib/repo/types";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

class PermissionError extends Error {}

/** Authorize: the acting user's *role* must include the capability. */
function requireCap(actorId: string, cap: Capability): Role {
  const role = store.getRole(actorId);
  if (!can(role, cap)) {
    throw new PermissionError(`Your role (${role}) can't perform this action`);
  }
  return role;
}

/** One shape for every outcome — never leak a stack trace or a Zod dump. */
function run<T>(fn: () => T): ActionResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    if (e instanceof ZodError) {
      return {
        ok: false,
        error: e.issues[0]?.message ?? "Some fields need attention",
      };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

/* ── Projects ─────────────────────────────────────────────── */

export function saveProject(
  actorId: string,
  id: string | null,
  input: unknown,
): ActionResult<Project> {
  return run(() => {
    requireCap(actorId, "project:write");
    const parsed = projectInputSchema.parse(input);
    return id ? store.updateProject(actorId, id, parsed) : store.createProject(actorId, parsed);
  });
}

/* ── Tasks ────────────────────────────────────────────────── */

export function saveTask(
  actorId: string,
  id: string | null,
  input: unknown,
): ActionResult<Task> {
  return run(() => {
    requireCap(actorId, "task:write");
    const parsed = taskInputSchema.parse(input);
    return id ? store.updateTask(actorId, id, parsed) : store.createTask(actorId, parsed);
  });
}

export function moveTask(
  actorId: string,
  id: string,
  status: TaskStatus,
  order: number,
): ActionResult<Task> {
  return run(() => {
    requireCap(actorId, "task:write");
    return store.moveTask(actorId, id, status, order);
  });
}

export function deleteTask(actorId: string, id: string): ActionResult<void> {
  return run(() => {
    requireCap(actorId, "task:write");
    store.deleteTask(actorId, id);
  });
}

/* ── Issues ───────────────────────────────────────────────── */

export function saveIssue(
  actorId: string,
  id: string | null,
  input: unknown,
): ActionResult<Issue> {
  return run(() => {
    requireCap(actorId, "issue:write");
    const parsed = issueInputSchema.parse(input);
    return id ? store.updateIssue(actorId, id, parsed) : store.createIssue(actorId, parsed);
  });
}

export function linkIssueTasks(
  actorId: string,
  issueId: string,
  taskIds: string[],
): ActionResult<Issue> {
  return run(() => {
    requireCap(actorId, "issue:write");
    return store.linkIssueTasks(actorId, issueId, taskIds);
  });
}

export function deleteIssue(actorId: string, id: string): ActionResult<void> {
  return run(() => {
    requireCap(actorId, "issue:write");
    store.deleteIssue(actorId, id);
  });
}

/* ── Comments ─────────────────────────────────────────────── */

export function addComment(
  actorId: string,
  taskId: string,
  body: string,
): ActionResult<void> {
  return run(() => {
    requireCap(actorId, "comment:write");
    const parsed = commentInputSchema.parse({ taskId, body });
    store.createComment(actorId, parsed.taskId, parsed.body);
  });
}

/* ── Team ─────────────────────────────────────────────────── */

export function setMemberRole(
  actorId: string,
  userId: string,
  role: Role,
): ActionResult<void> {
  return run(() => {
    requireCap(actorId, "member:write");
    const parsed = roleChangeSchema.parse({ userId, role });
    if (userId === actorId && role === "viewer") {
      throw new Error("You can't demote yourself to viewer");
    }
    store.setRole(actorId, parsed.userId, parsed.role);
  });
}

export function removeMember(actorId: string, userId: string): ActionResult<void> {
  return run(() => {
    requireCap(actorId, "member:remove");
    if (userId === actorId) throw new Error("You can't remove yourself");

    const target = store.getMemberships().find((m) => m.userId === userId);
    if (!target) throw new Error("Member not found");

    const owners = store.getMemberships().filter((m) => m.role === "owner").length;
    if (target.role === "owner" && owners <= 1) {
      throw new Error("There must be at least one owner");
    }
    store.removeMember(actorId, userId);
  });
}

export function resetWorkspace(actorId: string): ActionResult<void> {
  return run(() => {
    requireCap(actorId, "member:remove");
    store.reset();
  });
}
