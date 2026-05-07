import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskWidget } from './TaskWidget';
import { useStore, resetStore } from '../store/useStore';

vi.mock('../hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: useStore.getState().tasks,
    loadTasks: vi.fn(),
    addTask: vi.fn(),
    persistStartTask: vi.fn(),
    persistFinishTask: vi.fn(),
  }),
}));

describe('TaskWidget', () => {
  beforeEach(() => resetStore());

  it('shows empty state when no tasks', () => {
    render(<TaskWidget />);
    expect(screen.getByText(/今天还没有任务/)).toBeInTheDocument();
  });

  it('renders queued and in_progress tasks separately', () => {
    useStore.getState().setTasks([
      { id: '1', title: 'Queued task', status: 'queued', createdAt: 1, startedAt: null, finishedAt: null, sortOrder: 'a0', note: null },
      { id: '2', title: 'Active task', status: 'in_progress', createdAt: 1, startedAt: 5, finishedAt: null, sortOrder: 'a1', note: null },
    ]);
    render(<TaskWidget />);
    expect(screen.getByText('Queued task')).toBeInTheDocument();
    expect(screen.getByText('Active task')).toBeInTheDocument();
  });
});
