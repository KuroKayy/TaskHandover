import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks } from './useTasks';
import { resetStore } from '../store/useStore';
import { getDb, __resetDbForTesting } from '../lib/db';
import type { Task } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    title: 'T',
    status: 'queued',
    createdAt: 1000,
    startedAt: null,
    finishedAt: null,
    sortOrder: 'a0',
    note: null,
    ...overrides,
  };
}

function deleteDb(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('taskhandover');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

describe('useTasks (IndexedDB)', () => {
  beforeEach(async () => {
    resetStore();
    await __resetDbForTesting();
    await deleteDb();
  });

  it('addTask: creates a queued task in the DB and store', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.addTask('New task');
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('New task');
    expect(result.current.tasks[0].status).toBe('queued');
  });

  it('addTask: empty / whitespace title is a no-op', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.addTask('   ');
    });
    expect(result.current.tasks).toHaveLength(0);
  });

  it('loadTasks: reads tasks back from the DB, sorted by sortOrder', async () => {
    const db = await getDb();
    await db.put('tasks', makeTask({ title: 'Second', sortOrder: 'a1' }));
    await db.put('tasks', makeTask({ title: 'First', sortOrder: 'a0' }));
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.loadTasks();
    });
    expect(result.current.tasks.map((t) => t.title)).toEqual(['First', 'Second']);
  });

  it('loadTasks: hides cancelled tasks', async () => {
    const db = await getDb();
    await db.put('tasks', makeTask({ title: 'Visible', status: 'queued' }));
    await db.put('tasks', makeTask({ title: 'Gone', status: 'cancelled', sortOrder: 'a1' }));
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.loadTasks();
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('Visible');
  });

  it('persistStartTask: flips status to in_progress + writes a started event', async () => {
    const db = await getDb();
    const task = makeTask({ status: 'queued' });
    await db.put('tasks', task);
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.persistStartTask(task.id);
    });
    const stored = await db.get('tasks', task.id);
    expect(stored?.status).toBe('in_progress');
    expect(stored?.startedAt).not.toBeNull();
    const events = await db.getAll('task_events');
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('started');
    expect(events[0].taskId).toBe(task.id);
  });

  it('persistFinishTask: flips status to done + writes a finished event', async () => {
    const db = await getDb();
    const task = makeTask({ status: 'in_progress', startedAt: 5000 });
    await db.put('tasks', task);
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.persistFinishTask(task.id);
    });
    const stored = await db.get('tasks', task.id);
    expect(stored?.status).toBe('done');
    expect(stored?.finishedAt).not.toBeNull();
    const events = await db.getAll('task_events');
    expect(events[0].eventType).toBe('finished');
  });

  it('persistStartTask: unknown id is a safe no-op', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.persistStartTask('does-not-exist');
    });
    const db = await getDb();
    const events = await db.getAll('task_events');
    expect(events).toHaveLength(0);
  });
});
