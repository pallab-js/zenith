/**
 * Session resolution — pure, so it can be tested without a request.
 *
 * The identity is carried in an httpOnly cookie set by the server
 * (`lib/server/session.ts`), never read from the client. The "who am I?"
 * picker is still a mock (see README → Security), but the value itself is
 * no longer something the browser can edit from JS.
 */
import type { Membership, Role, User } from "@/lib/repo/types";

export const SESSION_COOKIE = "zenith_user";

export interface Session {
  userId: string;
  user: User;
  role: Role;
}

/**
 * Resolve the signed-in member from the stored cookie value.
 * Falls back to the first member when the cookie is missing, stale, or the
 * member no longer exists — the workspace always has a viewer.
 */
export function resolveSession(
  storedUserId: string | undefined,
  users: User[],
  memberships: Membership[],
): Session {
  const known = storedUserId && users.some((u) => u.id === storedUserId)
    ? storedUserId
    : undefined;
  const userId = known ?? memberships[0]?.userId ?? users[0]?.id;

  if (!userId) throw new Error("This workspace has no members");
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error("This workspace has no members");

  return {
    userId,
    user,
    role: memberships.find((m) => m.userId === userId)?.role ?? "viewer",
  };
}
