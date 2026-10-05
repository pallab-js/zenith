"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { ProjectFormModal } from "@/components/projects/project-form-modal";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/repo/types";
import type { Role } from "@/lib/repo/types";
import { can } from "@/lib/permissions";
export function ProjectActions({
  users,
  role,
  defaultLeadId,
}: {
  users: User[];
  role: Role;
  defaultLeadId: string;
}) {
  const [open, setOpen] = useState(false);
  if (!can(role, "project:write")) return null;

  return (
    <>
      <Button
        variant="green"
        onClick={() => setOpen(true)}
        icon={<Plus className="h-4 w-4" />}
      >
        New project
      </Button>
      {open ? (
        <ProjectFormModal
          open={open}
          onClose={() => setOpen(false)}
          users={users}
          defaultLeadId={defaultLeadId}
        />
      ) : null}
    </>
  );
}
