import Database from '@tauri-apps/plugin-sql';
import { TaskSchema, type Task, TaskEventSchema, type TaskEvent } from '../types';

let dbInstance: Database | null = null;

/**
 * Returns a memoized Database connection.
 *
 * IMPORTANT: SQLite disables foreign-key enforcement per-connection by default
 * (an ANSI-SQL inconsistency baked into SQLite for backward compatibility).
 * tauri-plugin-sql does NOT enable it for us. The schema in
 * `src-tauri/migrations/001_initial.sql` declares `ON DELETE CASCADE` on
 * task_events.task_id — that cascade only runs when foreign_keys is ON.
 *
 * We issue `PRAGMA foreign_keys = ON;` here, in the single source of truth for
 * connection setup, so every consumer that goes through `getDb()` is safe.
 * See TODOS.md item #5 for full context.
 */
export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    const db = await Database.load('sqlite:tasks.db');
    await db.execute('PRAGMA foreign_keys = ON;');
    dbInstance = db;
  }
  return dbInstance;
}

type DbTaskRow = {
  id: string;
  title: string;
  status: string;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  sort_order: string;
  note: string | null;
};

export function rowToTask(row: DbTaskRow): Task {
  return TaskSchema.parse({
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    sortOrder: row.sort_order,
    note: row.note,
  });
}

type DbEventRow = {
  id: string;
  task_id: string;
  event_type: string;
  timestamp: number;
};

export function rowToEvent(row: DbEventRow): TaskEvent {
  return TaskEventSchema.parse({
    id: row.id,
    taskId: row.task_id,
    eventType: row.event_type,
    timestamp: row.timestamp,
  });
}
