import type { Role } from "@/lib/repo/types";

export type Capability =
  | "task:write"
  | "issue:write"
  | "project:write"
  | "member:write"
  | "member:remove"
  | "comment:write";

const MATRIX: Record<Role, Capability[]> = {
  viewer: [],
  member: ["task:write", "issue:write", "comment:write"],
  admin: ["task:write", "issue:write", "project:write", "member:write"],
  owner: [
    "task:write",
    "issue:write",
    "project:write",
    "member:write",
    "member:remove",
    "comment:write",
  ],
};

export function can(role: Role, cap: Capability): boolean {
  return MATRIX[role].includes(cap);
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  owner: "Full control including team membership",
  admin: "Manage projects, tasks and issues",
  member: "Work on tasks and file issues",
  viewer: "Read-only access to everything",
};
