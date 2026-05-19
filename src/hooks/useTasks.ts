import { useState, useCallback } from 'react';
import { getDb } from '../lib/db';
import { useStore } from '../store/useStore';
import { initialOrder, afterAll } from '../lib/lexorank';
import { TaskSchema, type Task } from '../types';

function uuid(): string {
  return crypto.randomUUID();
}

/**
 * The single storage entry point. Components never touch IndexedDB directly —
 * they go through this hook. (CLAUDE.md: useTasks is the sole storage boundary.)
 */
export function useTasks() {
  const tasks = useStore((s) => s.tasks);
  const setTasks = useStore((s) => s.setTasks);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const db = await getDb();
      const all = await db.getAll('tasks');
      const visible = all
        .filter((t) => TaskSchema.safeParse(t).success)
        .filter((t) => t.status !== 'cancelled')
        .sort((a, b) =>
          a.sortOrder < b.sortOrder ? -1 : a.sortOrder > b.sortOrder ? 1 : 0,
        );
      setTasks(visible);
    } catch (e) {
      const msg = String(e);
      setError(msg);
      console.error('[useTasks] loadTasks failed:', msg);
    }
  }, [setTasks]);

  const addTask = useCallback(
    async (title: string) => {
      if (!title.trim()) return;
      const db = await getDb();
      const lastSort = tasks.length > 0 ? tasks[tasks.length - 1].sortOrder : null;
      const sortOrder = lastSort ? afterAll(lastSort) : initialOrder();
      const task: Task = {
        id: uuid(),
        title: title.trim(),
        status: 'queued',
        createdAt: Date.now(),
        startedAt: null,
        finishedAt: null,
        sortOrder,
        note: null,
      };
      await db.put('tasks', task);
      await loadTasks();
    },
    [tasks, loadTasks],
  );

  const persistStartTask = useCallback(async (id: string) => {
    const db = await getDb();
    const task = await db.get('tasks', id);
    if (!task) return;
    const now = Date.now();
    await db.put('tasks', { ...task, status: 'in_progress', startedAt: now });
    await db.put('task_events', {
      id: uuid(),
      taskId: id,
      eventType: 'started',
      timestamp: now,
    });
  }, []);

  const persistFinishTask = useCallback(async (id: string) => {
    const db = await getDb();
    const task = await db.get('tasks', id);
    if (!task) return;
    const now = Date.now();
    await db.put('tasks', { ...task, status: 'done', finishedAt: now });
    await db.put('task_events', {
      id: uuid(),
      taskId: id,
      eventType: 'finished',
      timestamp: now,
    });
  }, []);

  return { tasks, error, loadTasks, addTask, persistStartTask, persistFinishTask };
}
