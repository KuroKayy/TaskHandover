import { z } from 'zod';

export const TaskStatus = z.enum(['queued', 'in_progress', 'done', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
  status: TaskStatus,
  createdAt: z.number().int(),
  startedAt: z.number().int().nullable(),
  finishedAt: z.number().int().nullable(),
  sortOrder: z.string(),
  note: z.string().nullable(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskEventType = z.enum([
  'started',
  'paused',
  'resumed',
  'finished',
  'cancelled',
  'undo',
  'error',
]);
export type TaskEventType = z.infer<typeof TaskEventType>;

export const TaskEventSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  eventType: TaskEventType,
  timestamp: z.number().int(),
});
export type TaskEvent = z.infer<typeof TaskEventSchema>;
