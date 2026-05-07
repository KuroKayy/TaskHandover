import { useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useStore } from '../store/useStore';
import { TaskItem } from './TaskItem';
import { AddTaskInput } from './AddTaskInput';

export function TaskWidget() {
  const { tasks, loadTasks, addTask, persistStartTask, persistFinishTask } = useTasks();
  const startTask = useStore((s) => s.startTask);
  const finishTask = useStore((s) => s.finishTask);
  const undo = useStore((s) => s.undo);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  const queued = tasks.filter(t => t.status === 'queued');
  const active = tasks.filter(t => t.status === 'in_progress');
  const done = tasks.filter(t => t.status === 'done');

  return (
    <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 h-screen w-screen flex flex-col gap-3">
      <header className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-white">今日任务</h1>
        <button
          className="px-2 py-1 text-xs bg-white/10 text-white rounded"
          onClick={undo}
          title="Ctrl+Z 撤销上一步"
        >
          ↶
        </button>
      </header>

      <AddTaskInput onAdd={addTask} />

      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {tasks.length === 0 && (
          <p className="text-white/50 text-center text-sm py-8">今天还没有任务</p>
        )}

        {active.length > 0 && (
          <section>
            <h2 className="text-xs text-white/60 mb-1">进行中</h2>
            {active.map(t => (
              <TaskItem
                key={t.id}
                task={t}
                onStart={() => { startTask(t.id); void persistStartTask(t.id); }}
                onFinish={() => { finishTask(t.id); void persistFinishTask(t.id); }}
              />
            ))}
          </section>
        )}

        {queued.length > 0 && (
          <section>
            <h2 className="text-xs text-white/60 mb-1">待办</h2>
            {queued.map(t => (
              <TaskItem
                key={t.id}
                task={t}
                onStart={() => { startTask(t.id); void persistStartTask(t.id); }}
                onFinish={() => { finishTask(t.id); void persistFinishTask(t.id); }}
              />
            ))}
          </section>
        )}

        {done.length > 0 && (
          <section className="opacity-50">
            <h2 className="text-xs text-white/60 mb-1">已完成</h2>
            {done.map(t => (
              <div key={t.id} className="text-xs text-white/50 line-through px-2">
                {t.title}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
