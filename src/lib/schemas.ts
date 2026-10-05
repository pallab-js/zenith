import { z } from "zod";

export const roleSchema = z.enum(["owner", "admin", "member", "viewer"]);
export const projectStatusSchema = z.enum([
  "planning",
  "active",
  "on_hold",
  "completed",
]);
export const taskStatusSchema = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
]);
export const prioritySchema = z.enum(["urgent", "high", "medium", "low"]);
export const issueSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export const issueStatusSchema = z.enum(["open", "in_progress", "resolved"]);

const isoish = z.string().min(1);

export const projectInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, "Key needs at least 2 characters")
    .max(6)
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
  name: z.string().trim().min(3, "Name needs at least 3 characters").max(80),
  description: z.string().trim().max(600).default(""),
  status: projectStatusSchema,
  leadId: z.string().min(1),
  startDate: isoish,
  targetDate: isoish,
});

export const taskInputSchema = z.object({
  projectId: z.string().min(1, "Pick a project"),
  title: z.string().trim().min(3, "Title needs at least 3 characters").max(120),
  description: z.string().trim().max(2000).default(""),
  status: taskStatusSchema,
  priority: prioritySchema,
  assigneeId: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  labels: z.array(z.string().trim().min(1).max(24)).max(6).default([]),
});

export const issueInputSchema = z.object({
  projectId: z.string().min(1, "Pick a project"),
  title: z.string().trim().min(4, "Title needs at least 4 characters").max(140),
  description: z.string().trim().max(4000).default(""),
  severity: issueSeveritySchema,
  status: issueStatusSchema,
  assigneeId: z.string().nullable().default(null),
  linkedTaskIds: z.array(z.string()).default([]),
});

export const commentInputSchema = z.object({
  taskId: z.string().min(1),
  body: z.string().trim().min(2, "Say something").max(1000),
});

export const roleChangeSchema = z.object({
  userId: z.string().min(1),
  role: roleSchema,
});

export type ProjectForm = z.infer<typeof projectInputSchema>;
export type TaskForm = z.infer<typeof taskInputSchema>;
export type IssueForm = z.infer<typeof issueInputSchema>;
