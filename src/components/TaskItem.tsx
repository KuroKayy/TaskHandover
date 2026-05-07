import type { Task } from '../types';

interface Props {
  task: Task;
  onStart: () => void;
  onFinish: () => void;
}

export function TaskItem({ task, onStart, onFinish }: Props) {
  const isActive = task.status === 'in_progress';
  const isQueued = task.status === 'queued';
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded ${
        isActive ? 'bg-blue-500/20 border border-blue-400' : 'bg-white/10'
      }`}
    >
      <span className="flex-1 text-sm text-white">{task.title}</span>
      {isQueued && (
        <button
          className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
          onClick={onStart}
        >
          开始
        </button>
      )}
      {isActive && (
        <button
          className="px-2 py-1 text-xs bg-green-500 text-white rounded"
          onClick={onFinish}
        >
          完成
        </button>
      )}
    </div>
  );
}
