import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks } from './useTasks';
import { resetStore } from '../store/useStore';

const mockExecute = vi.fn();
const mockSelect = vi.fn();

vi.mock('../lib/db', () => ({
  getDb: async () => ({
    execute: mockExecute,
    select: mockSelect,
  }),
  rowToTask: vi.fn((row: any) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    sortOrder: row.sort_order,
    note: row.note,
  })),
  rowToEvent: vi.fn(),
}));

describe('useTasks', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockSelect.mockReset();
    resetStore();
  });

  it('loadTasks: queries SELECT and parses rows', async () => {
    mockSelect.mockResolvedValueOnce([
      {
        id: '1',
        title: 'A',
        status: 'queued',
        created_at: 1000,
        started_at: null,
        finished_at: null,
        sort_order: 'a0',
        note: null,
      },
    ]);
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.loadTasks();
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('A');
  });

  it('addTask: inserts row + writes audit event "started"... no, just creates task', async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1 });
    mockSelect.mockResolvedValue([]);
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.addTask('New task');
    });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tasks'),
      expect.arrayContaining(['New task']),
    );
  });

  it('persistStartTask: updates status + writes audit event', async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1 });
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.persistStartTask('task-id-1');
    });
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE tasks SET status'),
      expect.arrayContaining(['in_progress', expect.any(Number), 'task-id-1']),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO task_events'),
      expect.arrayContaining(['task-id-1', 'started']),
    );
  });
});
