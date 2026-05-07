CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'in_progress', 'done', 'cancelled')),
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    finished_at INTEGER,
    sort_order TEXT NOT NULL,
    note TEXT
);

CREATE INDEX idx_tasks_sort ON tasks(sort_order);
CREATE INDEX idx_tasks_status ON tasks(status);

CREATE TABLE task_events (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('started', 'paused', 'resumed', 'finished', 'cancelled', 'undo', 'error')),
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_events_task ON task_events(task_id, timestamp);
