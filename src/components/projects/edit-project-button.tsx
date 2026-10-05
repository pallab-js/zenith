"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { ProjectFormModal } from "@/components/projects/project-form-modal";
import { Button } from "@/components/ui/button";
import type { Project, User } from "@/lib/repo/types";

export function EditProjectButton({
  project,
  users,
}: {
  project: Project;
  users: User[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        icon={<Pencil className="h-4 w-4" />}
      >
        Edit project
      </Button>
      {open ? (
        <ProjectFormModal
          open={open}
          onClose={() => setOpen(false)}
          project={project}
          users={users}
          defaultLeadId={project.leadId}
        />
      ) : null}
    </>
  );
}
