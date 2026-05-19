import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Task, TaskEvent } from '../types';

/**
 * Local storage layer — IndexedDB (browser-native database).
 *
 * Why IndexedDB instead of the original SQLite plan: the app is now a web app
 * first. IndexedDB is built into every browser AND into the Tauri webview, so
 * the SAME storage code runs in the web version and the future desktop widget
 * — no second storage layer to maintain.
 *
 * Two object stores mirror the original schema:
 *   tasks        — keyed by Task.id
 *   task_events  — audit log, keyed by TaskEvent.id, indexed by taskId
 */

const DB_NAME = 'taskhandover';
const DB_VERSION = 1;

interface TaskHandoverSchema extends DBSchema {
  tasks: {
    key: string;
    value: Task;
  };
  task_events: {
    key: string;
    value: TaskEvent;
    indexes: { by_task: string };
  };
}

export type TaskHandoverDB = IDBPDatabase<TaskHandoverSchema>;

let dbPromise: Promise<TaskHandoverDB> | null = null;

/**
 * Returns a memoized IndexedDB connection. Memoizes the promise (not the
 * resolved value) so concurrent first-callers share one open() call.
 */
export function getDb(): Promise<TaskHandoverDB> {
  if (!dbPromise) {
    dbPromise = openDB<TaskHandoverSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('task_events')) {
          const events = db.createObjectStore('task_events', { keyPath: 'id' });
          events.createIndex('by_task', 'taskId');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Test-only: closes the connection and clears the memo so each test gets a
 * fresh database. NEVER call from production code.
 */
export async function __resetDbForTesting(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
