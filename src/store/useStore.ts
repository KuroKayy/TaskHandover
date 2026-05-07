import { create } from 'zustand';
import type { Task } from '../types';

type Snapshot = Task[];

interface Store {
  tasks: Task[];
  history: Snapshot[];
  setTasks: (tasks: Task[]) => void;
  startTask: (id: string) => void;
  finishTask: (id: string) => void;
  undo: () => void;
}

const HISTORY_LIMIT = 50;

function pushHistory(state: Store): Snapshot[] {
  return [...state.history, state.tasks].slice(-HISTORY_LIMIT);
}

export const useStore = create<Store>((set, get) => ({
  tasks: [],
  history: [],

  setTasks: (tasks) => set({ tasks, history: [] }),

  startTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task || task.status !== 'queued') return;
    const now = Date.now();
    set((state) => ({
      history: pushHistory(state),
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: 'in_progress' as const, startedAt: now } : t,
      ),
    }));
  },

  finishTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task || task.status !== 'in_progress') return;
    const now = Date.now();
    set((state) => ({
      history: pushHistory(state),
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: 'done' as const, finishedAt: now } : t,
      ),
    }));
  },

  undo: () => {
    const history = get().history;
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set({ tasks: previous, history: history.slice(0, -1) });
  },
}));

export function resetStore() {
  useStore.setState({ tasks: [], history: [] });
}
