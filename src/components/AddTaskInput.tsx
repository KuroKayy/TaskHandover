import { useState } from 'react';

interface Props {
  onAdd: (title: string) => void;
}

export function AddTaskInput({ onAdd }: Props) {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) {
          onAdd(value);
          setValue('');
        }
      }}
      className="flex gap-2"
    >
      <input
        className="flex-1 px-2 py-1 text-sm rounded bg-white/10 text-white placeholder-white/50"
        placeholder="新任务..."
        value={value}
        maxLength={200}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="px-2 py-1 text-xs bg-purple-500 text-white rounded"
      >
        +
      </button>
    </form>
  );
}
