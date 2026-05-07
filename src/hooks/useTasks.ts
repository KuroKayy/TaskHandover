import { useState, useCallback } from 'react';
import { getDb, rowToTask } from '../lib/db';
import { useStore } from '../store/useStore';
import { initialOrder, afterAll } from '../lib/lexorank';

function uuid(): string {
  return crypto.randomUUID();
}

export function useTasks() {
  const tasks = useStore((s) => s.tasks);
  const setTasks = useStore((s) => s.setTasks);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<any[]>(
        'SELECT * FROM tasks WHERE status IN (?, ?, ?) ORDER BY sort_order',
        ['queued', 'in_progress', 'done'],
      );
      setTasks(rows.map(rowToTask));
    } catch (e) {
      const msg = String(e);
      setError(msg);
      writeErrorEvent(msg);
    }
  }, [setTasks]);

  const addTask = useCallback(
    async (title: string) => {
      if (!title.trim()) return;
      const db = await getDb();
      const lastSort = tasks.length > 0 ? tasks[tasks.length - 1].sortOrder : null;
      const sortOrder = lastSort ? afterAll(lastSort) : initialOrder();
      await db.execute(
        'INSERT INTO tasks (id, title, status, created_at, sort_order) VALUES (?, ?, ?, ?, ?)',
        [uuid(), title.trim(), 'queued', Date.now(), sortOrder],
      );
      await loadTasks();
    },
    [tasks, loadTasks],
  );

  const persistStartTask = useCallback(async (id: string) => {
    const db = await getDb();
    const now = Date.now();
    await db.execute(
      'UPDATE tasks SET status = ?, started_at = ? WHERE id = ?',
      ['in_progress', now, id],
    );
    await db.execute(
      'INSERT INTO task_events (id, task_id, event_type, timestamp) VALUES (?, ?, ?, ?)',
      [uuid(), id, 'started', now],
    );
  }, []);

  const persistFinishTask = useCallback(async (id: string) => {
    const db = await getDb();
    const now = Date.now();
    await db.execute(
      'UPDATE tasks SET status = ?, finished_at = ? WHERE id = ?',
      ['done', now, id],
    );
    await db.execute(
      'INSERT INTO task_events (id, task_id, event_type, timestamp) VALUES (?, ?, ?, ?)',
      [uuid(), id, 'finished', now],
    );
  }, []);

  return { tasks, error, loadTasks, addTask, persistStartTask, persistFinishTask };
}

/**
 * Logs system-level DB errors that aren't tied to a specific task.
 *
 * Originally the spec proposed inserting a row in task_events with a null-UUID
 * sentinel for task_id. That can't work: task_events.task_id has a NOT NULL +
 * FK constraint to tasks(id), and Task 3 enabled `PRAGMA foreign_keys = ON`,
 * so the INSERT would be rejected at runtime — and then THAT failure would
 * recurse here. We log to console instead. Per-task error events are written
 * by call sites that have task context (none yet — addTask/persistStartTask/
 * persistFinishTask currently let exceptions bubble; they're caught at the
 * component layer in a future task).
 */
function writeErrorEvent(msg: string): void {
  console.error('[useTasks DB error]', msg);
}
