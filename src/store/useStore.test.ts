import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, resetStore } from './useStore';

describe('useStore — task state machine', () => {
  beforeEach(() => {
    resetStore();
  });

  it('startTask: queued → in_progress and sets startedAt', () => {
    useStore.getState().setTasks([
      { id: '1', title: 'A', status: 'queued', createdAt: 1000, startedAt: null, finishedAt: null, sortOrder: 'a0', note: null },
    ]);
    useStore.getState().startTask('1');
    const task = useStore.getState().tasks.find(t => t.id === '1')!;
    expect(task.status).toBe('in_progress');
    expect(task.startedAt).not.toBeNull();
  });

  it('startTask: already in_progress is a no-op', () => {
    useStore.getState().setTasks([
      { id: '1', title: 'A', status: 'in_progress', createdAt: 1000, startedAt: 5000, finishedAt: null, sortOrder: 'a0', note: null },
    ]);
    const before = useStore.getState().tasks[0].startedAt;
    useStore.getState().startTask('1');
    const after = useStore.getState().tasks[0].startedAt;
    expect(after).toBe(before);
  });

  it('finishTask: in_progress → done and sets finishedAt', () => {
    useStore.getState().setTasks([
      { id: '1', title: 'A', status: 'in_progress', createdAt: 1000, startedAt: 5000, finishedAt: null, sortOrder: 'a0', note: null },
    ]);
    useStore.getState().finishTask('1');
    const task = useStore.getState().tasks[0];
    expect(task.status).toBe('done');
    expect(task.finishedAt).not.toBeNull();
  });

  it('finishTask: queued task cannot finish (no-op)', () => {
    useStore.getState().setTasks([
      { id: '1', title: 'A', status: 'queued', createdAt: 1000, startedAt: null, finishedAt: null, sortOrder: 'a0', note: null },
    ]);
    useStore.getState().finishTask('1');
    expect(useStore.getState().tasks[0].status).toBe('queued');
  });

  it('finishTask: rapid double-call only flips state once', () => {
    useStore.getState().setTasks([
      { id: '1', title: 'A', status: 'in_progress', createdAt: 1000, startedAt: 5000, finishedAt: null, sortOrder: 'a0', note: null },
    ]);
    useStore.getState().finishTask('1');
    const firstFinishedAt = useStore.getState().tasks[0].finishedAt;
    useStore.getState().finishTask('1');
    expect(useStore.getState().tasks[0].finishedAt).toBe(firstFinishedAt);
  });

  it('undo: undo finish restores in_progress', () => {
    useStore.getState().setTasks([
      { id: '1', title: 'A', status: 'in_progress', createdAt: 1000, startedAt: 5000, finishedAt: null, sortOrder: 'a0', note: null },
    ]);
    useStore.getState().finishTask('1');
    expect(useStore.getState().tasks[0].status).toBe('done');
    useStore.getState().undo();
    expect(useStore.getState().tasks[0].status).toBe('in_progress');
  });

  it('undo: undo start restores queued', () => {
    useStore.getState().setTasks([
      { id: '1', title: 'A', status: 'queued', createdAt: 1000, startedAt: null, finishedAt: null, sortOrder: 'a0', note: null },
    ]);
    useStore.getState().startTask('1');
    useStore.getState().undo();
    expect(useStore.getState().tasks[0].status).toBe('queued');
  });

  it('undo: undo on empty history is a safe no-op', () => {
    useStore.getState().setTasks([]);
    expect(() => useStore.getState().undo()).not.toThrow();
  });
});
