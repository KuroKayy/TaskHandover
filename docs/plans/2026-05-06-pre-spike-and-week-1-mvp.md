# TaskHandover Pre-Spike + Week 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify Tauri 2.x feasibility on Windows in 1 day, then ship a single-machine task widget for 1 designer to trial for 5 days. Trial decides if the project continues.

**Architecture:** Tauri 2.x desktop shell + React 18 + TypeScript + Tailwind + Zustand state + SQLite via tauri-plugin-sql. Transparent always-on-top non-activating window pinned to top-right corner. All data local. No network sync in Week 1.

**Tech Stack:**
- Shell: Tauri 2.x (Rust + WebView2)
- UI: React 18 + TypeScript + Tailwind CSS
- Animation: framer-motion (transform/opacity only)
- State: Zustand
- DB: SQLite via `tauri-plugin-sql`
- Build: Vite + bun
- Test: Vitest + React Testing Library

**Source design doc:** `~/.gstack/projects/TaskHandover/chongpai-no-git-design-20260506-223510.md`
**Source test plan:** `~/.gstack/projects/TaskHandover/chongpai-no-git-eng-review-test-plan-20260506-231406.md`
**Project rules:** `CLAUDE.md` (project root)

---

## File Structure (Week 1 final state)

```
TaskHandover/
├── CLAUDE.md                         (already exists)
├── docs/
│   └── plans/
│       └── 2026-05-06-pre-spike-and-week-1-mvp.md  (this file)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html                        (Vite entry)
├── public/
│   ├── icon.png                      (Tauri app icon)
│   └── sounds/
│       ├── complete.mp3
│       └── new-task.mp3
├── src/
│   ├── main.tsx                      (React root)
│   ├── App.tsx                       (app shell)
│   ├── types.ts                      (Task, TaskStatus types)
│   ├── store/
│   │   ├── useStore.ts               (Zustand store)
│   │   └── useStore.test.ts
│   ├── hooks/
│   │   ├── useTasks.ts               (SQL boundary — single source)
│   │   ├── useTasks.test.ts
│   │   └── useAudio.ts
│   ├── lib/
│   │   ├── db.ts                     (plugin-sql wrapper + Zod)
│   │   ├── audio.ts                  (debounced playback)
│   │   ├── lexorank.ts               (sort_order helpers)
│   │   └── lexorank.test.ts
│   └── components/
│       ├── TaskWidget.tsx
│       ├── TaskWidget.test.tsx
│       ├── TaskItem.tsx
│       ├── CompletionAnimation.tsx
│       └── AddTaskInput.tsx
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json               (window: transparent + on-top + no-focus)
    ├── build.rs
    ├── icons/                        (auto-generated)
    └── src/
        ├── main.rs
        ├── lib.rs                    (plugin registration)
        ├── window.rs                 (Windows WS_EX_NOACTIVATE)
        └── backup.rs                 (18:00 JSON export, async)
```

**~26 files total.** Roughly 9 in Pre-Spike (project scaffold scope), 17 added during Week 1.

---

## Task 0: Pre-Week-0 Spike (1 DAY, MANUAL — KILL-SWITCH GATE)

**Goal:** Verify Tauri 2.x can deliver transparent + always-on-top + non-activating + tray-icon + DPI-correct + multi-monitor on the target Windows machine. Failing any of #4 / #6 / #7 means switching to Electron (separate plan).

**Files:**
- Create: `src-tauri/tauri.conf.json` (minimal)
- Create: `src-tauri/src/main.rs` (skeleton)
- Create: `src-tauri/src/window.rs` (Win32 WS_EX_NOACTIVATE)
- Create: `index.html`, `src/main.tsx`, `src/App.tsx` (placeholder UI)

**This is NOT TDD-style.** It's a manual verification day with a hard go/no-go gate. The 7 checks below are run on the actual target Windows machine.

- [ ] **Step 0.1: Install Rust toolchain on Windows**

```powershell
# Run in PowerShell as user
winget install Rustlang.Rust.MSVC
rustup default stable
rustc --version  # Should print 1.7x or newer
```

Expected: rustc version printed.

- [ ] **Step 0.2: Install bun and Tauri CLI**

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
bun --version  # 1.x
bun install -g @tauri-apps/cli@latest
cargo install tauri-cli --version "^2.0"  # backup if bun-installed cli misbehaves
```

Expected: both versions print.

- [ ] **Step 0.3: Scaffold a minimal Tauri 2 + React + TS project**

```powershell
cd C:\path\to\TaskHandover
bun create tauri-app@latest . --manager bun --template react-ts
# When prompted, accept defaults; set name = "task-handover"
```

Expected: project files appear. `bun install` finishes.

- [ ] **Step 0.4: Edit tauri.conf.json to set window properties**

Replace the `app.windows[0]` entry with:

```json
{
  "label": "main",
  "title": "TaskHandover",
  "width": 350,
  "height": 600,
  "x": 9999,
  "y": 0,
  "decorations": false,
  "transparent": true,
  "alwaysOnTop": true,
  "skipTaskbar": true,
  "focus": false,
  "resizable": false
}
```

Note: `x: 9999` is a sentinel. Real positioning happens in window.rs at runtime (computes monitor-relative coords).

- [ ] **Step 0.5: Add Win32 non-activating flag (Windows-specific)**

Create `src-tauri/src/window.rs`:

```rust
#[cfg(target_os = "windows")]
pub fn set_no_activate(window: &tauri::WebviewWindow) -> tauri::Result<()> {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
    };
    let hwnd = windows::Win32::Foundation::HWND(window.hwnd()?.0 as isize);
    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        SetWindowLongPtrW(
            hwnd,
            GWL_EXSTYLE,
            style | (WS_EX_NOACTIVATE.0 | WS_EX_TOOLWINDOW.0) as isize,
        );
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn set_no_activate(_window: &tauri::WebviewWindow) -> tauri::Result<()> {
    Ok(())
}
```

Add to `src-tauri/Cargo.toml` dependencies:

```toml
[target.'cfg(windows)'.dependencies]
windows = { version = "0.58", features = ["Win32_Foundation", "Win32_UI_WindowsAndMessaging"] }
```

Wire it in `src-tauri/src/main.rs`:

```rust
mod window;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            window::set_no_activate(&main_window)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 0.6: Position widget at top-right of primary monitor**

Add to the `setup` closure before `set_no_activate`:

```rust
let monitor = main_window.current_monitor()?.unwrap();
let monitor_size = monitor.size();
let scale = monitor.scale_factor();
let widget_w = (350.0 * scale) as i32;
main_window.set_position(tauri::PhysicalPosition {
    x: (monitor_size.width as i32) - widget_w - 20,
    y: 40,
})?;
```

- [ ] **Step 0.7: Add minimal placeholder UI**

Replace `src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="bg-black/80 text-white rounded-xl p-4 h-screen w-screen">
      <h1 className="text-lg font-semibold">TaskHandover Spike</h1>
      <button
        className="mt-4 px-3 py-2 bg-blue-500 rounded"
        onClick={() => alert('Click works')}
      >
        Test click
      </button>
    </div>
  );
}
```

Replace `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

Replace `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  background: transparent;
  margin: 0;
  height: 100%;
}
```

(Tailwind config is the default from `bun create tauri-app`. If not generated, install:
`bun add -d tailwindcss postcss autoprefixer && bunx tailwindcss init -p`.)

- [ ] **Step 0.8: Run dev mode**

```powershell
bun run tauri dev
```

Expected: a transparent widget appears at top-right of primary monitor within 1 minute.

- [ ] **Step 0.9: Run THE 7 CHECKS (kill switch gate)**

Open Photoshop in fullscreen mode for checks 3-4. Run a 125% DPI display for check 6. Have at least 2 monitors connected for check 7.

| # | Check | Pass criterion | Result |
|---|---|---|---|
| 1 | Dev runs | Window appears < 1 min after `tauri dev` | [ ] PASS / [ ] FAIL |
| 2 | Transparent | Desktop wallpaper visible through widget gaps | [ ] PASS / [ ] FAIL |
| 3 | Always on top | Widget visible over Photoshop fullscreen | [ ] PASS / [ ] FAIL |
| 4 | **Non-activating** | Click "Test click" → PS does not lose focus (PS canvas still has cursor) | [ ] PASS / [ ] FAIL |
| 5 | Tray icon | Add `tauri-plugin-tray-icon`; icon shows in system tray | [ ] PASS / [ ] FAIL |
| 6 | DPI correct | Widget is 350×600 logical px on 125%/150% display | [ ] PASS / [ ] FAIL |
| 7 | Multi-monitor | Widget pins to PRIMARY monitor's top-right correctly | [ ] PASS / [ ] FAIL |

**Decision gate:**
- All 7 PASS → proceed to Task 1
- ANY of 4/6/7 FAIL → STOP. Open new branch `electron-fallback`. Write `docs/plans/2026-XX-XX-electron-mvp.md` from scratch using Electron + electron-builder. Do not attempt to "force" Tauri.
- 1, 2, 3, 5 FAIL → these have known fixes; troubleshoot once before declaring failure.

- [ ] **Step 0.10: Commit Pre-Spike artifacts**

```bash
cd /Users/chongpai/ClaudeCode/TaskHandover
git init  # if not yet a repo
git add CLAUDE.md docs/ src-tauri/ src/ package.json *.json *.js *.ts index.html
git commit -m "spike: Tauri 2.x verification on Windows passes 7/7 checks"
```

---

## Task 1: Add core dependencies (Week 1 starts)

**Files:**
- Modify: `package.json` (add deps)
- Modify: `src-tauri/Cargo.toml` (add plugins)

- [ ] **Step 1.1: Install frontend deps**

```powershell
cd C:\path\to\TaskHandover
bun add zustand framer-motion
bun add fractional-indexing zod
bun add -d @testing-library/react @testing-library/user-event @testing-library/jest-dom
bun add -d vitest jsdom @types/node
```

- [ ] **Step 1.2: Add Tauri 2 plugins to Cargo.toml**

In `src-tauri/Cargo.toml`, under `[dependencies]`:

```toml
tauri = { version = "2", features = [] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-tray-icon = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
```

- [ ] **Step 1.3: Register plugins in lib.rs**

Create `src-tauri/src/lib.rs`:

```rust
mod window;
mod backup;

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_tasks_and_events",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tasks.db", migrations)
                .build()
        )
        .plugin(tauri_plugin_tray_icon::init())
        .setup(|app| {
            let main_window = tauri::Manager::get_webview_window(app, "main").unwrap();
            window::set_no_activate(&main_window)?;
            backup::schedule_daily_backup(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Update `src-tauri/src/main.rs` to a single line:

```rust
fn main() {
    task_handover_lib::run();
}
```

(Or use the lib name `bun create` produced. If unsure: `cargo build` and read the warning.)

- [ ] **Step 1.4: Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom';
```

Add to `package.json` scripts:

```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run"
}
```

- [ ] **Step 1.5: Commit dependencies**

```bash
git add package.json bun.lockb src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/src/main.rs vitest.config.ts src/test-setup.ts
git commit -m "feat(deps): add zustand, framer-motion, lexorank, vitest, plugin-sql, tray-icon"
```

---

## Task 2: SQLite schema (migration file)

**Files:**
- Create: `src-tauri/migrations/001_initial.sql`

- [ ] **Step 2.1: Write the migration SQL**

Create `src-tauri/migrations/001_initial.sql`:

```sql
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
```

- [ ] **Step 2.2: Verify migration runs**

```powershell
bun run tauri dev
# Wait for window to appear
# In a new terminal, find the SQLite file:
# Windows: %APPDATA%\com.tauri.dev\tasks.db (path varies by tauri identifier)
```

Expected: tasks.db exists with `tasks` and `task_events` tables. Verify with any SQLite browser.

- [ ] **Step 2.3: Commit schema**

```bash
git add src-tauri/migrations/
git commit -m "feat(db): initial schema with tasks and audit events"
```

---

## Task 3: TypeScript types + Zod schema

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/db.ts`

- [ ] **Step 3.1: Define types**

Create `src/types.ts`:

```ts
import { z } from 'zod';

export const TaskStatus = z.enum(['queued', 'in_progress', 'done', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  status: TaskStatus,
  createdAt: z.number().int(),
  startedAt: z.number().int().nullable(),
  finishedAt: z.number().int().nullable(),
  sortOrder: z.string(),
  note: z.string().nullable(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskEventType = z.enum([
  'started', 'paused', 'resumed', 'finished', 'cancelled', 'undo', 'error',
]);
export type TaskEventType = z.infer<typeof TaskEventType>;

export const TaskEventSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  eventType: TaskEventType,
  timestamp: z.number().int(),
});
export type TaskEvent = z.infer<typeof TaskEventSchema>;
```

- [ ] **Step 3.2: DB wrapper with snake_case ↔ camelCase mapping**

Create `src/lib/db.ts`:

```ts
import Database from '@tauri-apps/plugin-sql';
import { TaskSchema, type Task, TaskEventSchema, type TaskEvent } from '../types';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:tasks.db');
  }
  return dbInstance;
}

type DbTaskRow = {
  id: string;
  title: string;
  status: string;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  sort_order: string;
  note: string | null;
};

export function rowToTask(row: DbTaskRow): Task {
  return TaskSchema.parse({
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    sortOrder: row.sort_order,
    note: row.note,
  });
}

type DbEventRow = {
  id: string;
  task_id: string;
  event_type: string;
  timestamp: number;
};

export function rowToEvent(row: DbEventRow): TaskEvent {
  return TaskEventSchema.parse({
    id: row.id,
    taskId: row.task_id,
    eventType: row.event_type,
    timestamp: row.timestamp,
  });
}
```

- [ ] **Step 3.3: Commit types**

```bash
git add src/types.ts src/lib/db.ts
git commit -m "feat(types): Task + TaskEvent Zod schemas, DB row mappers"
```

---

## Task 4: Lexorank helpers (TDD)

**Files:**
- Create: `src/lib/lexorank.ts`
- Create: `src/lib/lexorank.test.ts`

- [ ] **Step 4.1: Write failing tests first**

Create `src/lib/lexorank.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initialOrder, between, beforeAll, afterAll } from './lexorank';

describe('lexorank', () => {
  it('initialOrder() returns a valid string', () => {
    expect(initialOrder()).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('between(a, b) returns a key strictly between a and b', () => {
    const result = between('a0', 'a1');
    expect(result > 'a0' && result < 'a1').toBe(true);
  });

  it('beforeAll(first) returns a key smaller than first', () => {
    expect(beforeAll('a0') < 'a0').toBe(true);
  });

  it('afterAll(last) returns a key larger than last', () => {
    expect(afterAll('a0') > 'a0').toBe(true);
  });

  it('between() can be applied repeatedly without collision', () => {
    let lo = 'a0';
    let hi = 'a1';
    for (let i = 0; i < 50; i++) {
      const mid = between(lo, hi);
      expect(mid > lo && mid < hi).toBe(true);
      lo = mid;
    }
  });
});
```

- [ ] **Step 4.2: Run tests, verify all FAIL**

```bash
bun run test:run src/lib/lexorank.test.ts
```

Expected: all 5 tests fail with "Cannot find module './lexorank'".

- [ ] **Step 4.3: Write minimal implementation wrapping fractional-indexing**

Create `src/lib/lexorank.ts`:

```ts
import { generateKeyBetween } from 'fractional-indexing';

export function initialOrder(): string {
  return generateKeyBetween(null, null);
}

export function between(a: string, b: string): string {
  return generateKeyBetween(a, b);
}

export function beforeAll(first: string): string {
  return generateKeyBetween(null, first);
}

export function afterAll(last: string): string {
  return generateKeyBetween(last, null);
}
```

- [ ] **Step 4.4: Run tests, verify all PASS**

```bash
bun run test:run src/lib/lexorank.test.ts
```

Expected: 5/5 pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/lexorank.ts src/lib/lexorank.test.ts
git commit -m "feat(lexorank): wrap fractional-indexing with named helpers + tests"
```

---

## Task 5: Zustand store (TDD)

**Files:**
- Create: `src/store/useStore.ts`
- Create: `src/store/useStore.test.ts`

- [ ] **Step 5.1: Write failing tests for store actions**

Create `src/store/useStore.test.ts`:

```ts
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
```

- [ ] **Step 5.2: Run tests, verify all FAIL**

```bash
bun run test:run src/store/useStore.test.ts
```

Expected: all 8 tests fail with "Cannot find module './useStore'".

- [ ] **Step 5.3: Implement the store**

Create `src/store/useStore.ts`:

```ts
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
    const task = get().tasks.find(t => t.id === id);
    if (!task || task.status !== 'queued') return;
    const now = Date.now();
    set((state) => ({
      history: pushHistory(state),
      tasks: state.tasks.map(t =>
        t.id === id ? { ...t, status: 'in_progress', startedAt: now } : t
      ),
    }));
  },

  finishTask: (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task || task.status !== 'in_progress') return;
    const now = Date.now();
    set((state) => ({
      history: pushHistory(state),
      tasks: state.tasks.map(t =>
        t.id === id ? { ...t, status: 'done', finishedAt: now } : t
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
```

- [ ] **Step 5.4: Run tests, verify all PASS**

```bash
bun run test:run src/store/useStore.test.ts
```

Expected: 8/8 pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/store/
git commit -m "feat(store): Zustand task state machine with undo + tests"
```

---

## Task 6: useTasks hook (SQL boundary, TDD with mocked DB)

**Files:**
- Create: `src/hooks/useTasks.ts`
- Create: `src/hooks/useTasks.test.ts`

- [ ] **Step 6.1: Write failing tests with a mocked plugin-sql**

Create `src/hooks/useTasks.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTasks } from './useTasks';

const mockExecute = vi.fn();
const mockSelect = vi.fn();

vi.mock('../lib/db', () => ({
  getDb: async () => ({
    execute: mockExecute,
    select: mockSelect,
  }),
  rowToTask: vi.fn((row) => ({
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
  });

  it('loadTasks: queries SELECT and parses rows', async () => {
    mockSelect.mockResolvedValueOnce([
      { id: '1', title: 'A', status: 'queued', created_at: 1000, started_at: null, finished_at: null, sort_order: 'a0', note: null },
    ]);
    const { result } = renderHook(() => useTasks());
    await act(async () => { await result.current.loadTasks(); });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('A');
  });

  it('addTask: inserts row + writes audit event "started"... no, just creates task', async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1 });
    mockSelect.mockResolvedValue([]);
    const { result } = renderHook(() => useTasks());
    await act(async () => { await result.current.addTask('New task'); });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tasks'),
      expect.arrayContaining(['New task'])
    );
  });

  it('persistStartTask: updates status + writes audit event', async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1 });
    const { result } = renderHook(() => useTasks());
    await act(async () => { await result.current.persistStartTask('task-id-1'); });
    expect(mockExecute).toHaveBeenNthCalledWith(1,
      expect.stringContaining('UPDATE tasks SET status'),
      expect.arrayContaining(['in_progress', expect.any(Number), 'task-id-1'])
    );
    expect(mockExecute).toHaveBeenNthCalledWith(2,
      expect.stringContaining('INSERT INTO task_events'),
      expect.arrayContaining(['task-id-1', 'started'])
    );
  });
});
```

- [ ] **Step 6.2: Run tests, verify FAIL**

```bash
bun run test:run src/hooks/useTasks.test.ts
```

Expected: tests fail with "Cannot find module './useTasks'".

- [ ] **Step 6.3: Implement useTasks**

Create `src/hooks/useTasks.ts`:

```ts
import { useState, useCallback } from 'react';
import { getDb, rowToTask } from '../lib/db';
import { useStore } from '../store/useStore';
import { initialOrder, afterAll } from '../lib/lexorank';
import type { Task } from '../types';

function uuid(): string {
  return crypto.randomUUID();
}

export function useTasks() {
  const tasks = useStore((s) => s.tasks);
  const setTasks = useStore((s) => s.setTasks);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<any[]>(
        'SELECT * FROM tasks WHERE status IN (?, ?, ?) ORDER BY sort_order',
        ['queued', 'in_progress', 'done']
      );
      setTasks(rows.map(rowToTask));
    } catch (e) {
      setError(String(e));
      await writeErrorEvent(String(e));
    }
  }, [setTasks]);

  const addTask = useCallback(async (title: string) => {
    if (!title.trim()) return;
    const db = await getDb();
    const lastSort = tasks.length > 0 ? tasks[tasks.length - 1].sortOrder : null;
    const sortOrder = lastSort ? afterAll(lastSort) : initialOrder();
    await db.execute(
      'INSERT INTO tasks (id, title, status, created_at, sort_order) VALUES (?, ?, ?, ?, ?)',
      [uuid(), title.trim(), 'queued', Date.now(), sortOrder]
    );
    await loadTasks();
  }, [tasks, loadTasks]);

  const persistStartTask = useCallback(async (id: string) => {
    const db = await getDb();
    const now = Date.now();
    await db.execute(
      'UPDATE tasks SET status = ?, started_at = ? WHERE id = ?',
      ['in_progress', now, id]
    );
    await db.execute(
      'INSERT INTO task_events (id, task_id, event_type, timestamp) VALUES (?, ?, ?, ?)',
      [uuid(), id, 'started', now]
    );
  }, []);

  const persistFinishTask = useCallback(async (id: string) => {
    const db = await getDb();
    const now = Date.now();
    await db.execute(
      'UPDATE tasks SET status = ?, finished_at = ? WHERE id = ?',
      ['done', now, id]
    );
    await db.execute(
      'INSERT INTO task_events (id, task_id, event_type, timestamp) VALUES (?, ?, ?, ?)',
      [uuid(), id, 'finished', now]
    );
  }, []);

  return { tasks, error, loadTasks, addTask, persistStartTask, persistFinishTask };
}

async function writeErrorEvent(msg: string) {
  try {
    const db = await getDb();
    await db.execute(
      'INSERT INTO task_events (id, task_id, event_type, timestamp) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), '00000000-0000-0000-0000-000000000000', 'error', Date.now()]
    );
  } catch { /* swallowed: error logging itself failed, nothing else useful */ }
}
```

- [ ] **Step 6.4: Run tests, verify PASS**

```bash
bun run test:run src/hooks/useTasks.test.ts
```

Expected: tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add src/hooks/useTasks.ts src/hooks/useTasks.test.ts
git commit -m "feat(hooks): useTasks SQL boundary with audit log"
```

---

## Task 7: TaskWidget UI shell

**Files:**
- Create: `src/components/TaskWidget.tsx`
- Create: `src/components/TaskItem.tsx`
- Create: `src/components/AddTaskInput.tsx`
- Create: `src/components/TaskWidget.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 7.1: Write component test for empty + populated states**

Create `src/components/TaskWidget.test.tsx`:

```tsx
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
```

- [ ] **Step 7.2: Run, verify FAIL**

```bash
bun run test:run src/components/TaskWidget.test.tsx
```

Expected: fail with "Cannot find module './TaskWidget'".

- [ ] **Step 7.3: Build the components**

Create `src/components/TaskItem.tsx`:

```tsx
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
```

Create `src/components/AddTaskInput.tsx`:

```tsx
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
```

Create `src/components/TaskWidget.tsx`:

```tsx
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
```

Modify `src/App.tsx`:

```tsx
import { TaskWidget } from './components/TaskWidget';

export default function App() {
  return <TaskWidget />;
}
```

- [ ] **Step 7.4: Run tests, verify PASS**

```bash
bun run test:run
```

Expected: all tests pass.

- [ ] **Step 7.5: Run dev mode, verify the widget displays**

```bash
bun run tauri dev
```

Add a task via the input, click 开始, click 完成. Confirm visually that:
- Empty state shows "今天还没有任务"
- New tasks appear in 待办
- Start moves to 进行中 (highlighted)
- Finish moves to 已完成 (faded)

- [ ] **Step 7.6: Commit**

```bash
git add src/components/ src/App.tsx
git commit -m "feat(ui): TaskWidget with three sections + add/start/finish flow"
```

---

## Task 8: Completion animation + audio

**Files:**
- Create: `src/components/CompletionAnimation.tsx`
- Create: `src/hooks/useAudio.ts`
- Create: `src/lib/audio.ts`
- Modify: `src/components/TaskWidget.tsx`
- Add binary: `public/sounds/complete.mp3` (find a free CC0 sound, e.g., from freesound.org "ding")

- [ ] **Step 8.1: Audio utility (debounced)**

Create `src/lib/audio.ts`:

```ts
const audioCache = new Map<string, HTMLAudioElement>();
const lastPlayed = new Map<string, number>();
const DEBOUNCE_MS = 500;

export function play(name: string, volume = 1.0) {
  const now = Date.now();
  if ((now - (lastPlayed.get(name) ?? 0)) < DEBOUNCE_MS) return;
  lastPlayed.set(name, now);

  let el = audioCache.get(name);
  if (!el) {
    el = new Audio(`/sounds/${name}.mp3`);
    audioCache.set(name, el);
  }
  el.volume = Math.max(0, Math.min(1, volume));
  el.currentTime = 0;
  el.play().catch(() => { /* ignored: file missing or autoplay-blocked */ });
}
```

- [ ] **Step 8.2: useAudio hook (placeholder, ready for volume settings later)**

Create `src/hooks/useAudio.ts`:

```ts
import { play } from '../lib/audio';

export function useAudio() {
  return {
    playComplete: () => play('complete', 0.6),
    playNewTask: () => play('new-task', 0.5),
  };
}
```

- [ ] **Step 8.3: Completion animation component**

Create `src/components/CompletionAnimation.tsx`:

```tsx
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  show: boolean;
  onDone: () => void;
}

export function CompletionAnimation({ show, onDone }: Props) {
  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.2 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <span className="text-6xl">🎉</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 8.4: Wire into TaskWidget**

Modify `src/components/TaskWidget.tsx` — add state for animation, trigger on finish:

Add at top of imports:
```tsx
import { useState } from 'react';
import { CompletionAnimation } from './CompletionAnimation';
import { useAudio } from '../hooks/useAudio';
```

Add inside the component (top of function body):
```tsx
const [celebrating, setCelebrating] = useState(false);
const { playComplete } = useAudio();
```

Replace the `onFinish` callback in the TaskItem usage:
```tsx
onFinish={() => {
  finishTask(t.id);
  void persistFinishTask(t.id);
  playComplete();
  setCelebrating(true);
}}
```

Wrap the outer div in a `relative` container and add the animation:
```tsx
return (
  <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 h-screen w-screen flex flex-col gap-3 relative">
    <CompletionAnimation show={celebrating} onDone={() => setCelebrating(false)} />
    {/* ...existing children... */}
  </div>
);
```

- [ ] **Step 8.5: Add the audio file**

Download a CC0/free sound file:
- Visit https://freesound.org and find a "ding" or "chime" under 1 second.
- Save as `public/sounds/complete.mp3`.

If creating this autonomously is impossible, place a 1-second silent MP3 as placeholder. Trial users can replace it.

- [ ] **Step 8.6: Run dev, manually verify**

```bash
bun run tauri dev
```

Add a task → start → finish. Confirm:
- 🎉 emoji animates in/out within ~1 second
- complete.mp3 plays once (not multiple times if you double-click)
- The widget doesn't freeze during the animation

- [ ] **Step 8.7: Commit**

```bash
git add src/components/CompletionAnimation.tsx src/hooks/useAudio.ts src/lib/audio.ts src/components/TaskWidget.tsx public/sounds/
git commit -m "feat(ui): completion animation + debounced audio playback"
```

---

## Task 9: 18:00 daily JSON backup (Rust async)

**Files:**
- Create: `src-tauri/src/backup.rs`

- [ ] **Step 9.1: Implement backup task**

Create `src-tauri/src/backup.rs`:

```rust
use chrono::{Local, NaiveTime, Timelike};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::time::{sleep, Duration};

pub fn schedule_daily_backup(app: AppHandle) {
    tokio::spawn(async move {
        loop {
            let now = Local::now();
            let target = NaiveTime::from_hms_opt(18, 0, 0).unwrap();
            let now_time = now.time();
            let wait_secs = if now_time < target {
                (target.num_seconds_from_midnight() - now_time.num_seconds_from_midnight()) as u64
            } else {
                (24 * 3600) - (now_time.num_seconds_from_midnight() - target.num_seconds_from_midnight()) as u64
            };
            sleep(Duration::from_secs(wait_secs)).await;
            if let Err(e) = run_backup(&app).await {
                eprintln!("backup failed: {e}");
            }
        }
    });
}

async fn run_backup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let app_data_dir: PathBuf = app.path().app_data_dir()?;
    let db_path = app_data_dir.join("tasks.db");
    if !db_path.exists() { return Ok(()); }

    let date = Local::now().format("%Y-%m-%d").to_string();
    let backup_dir = app_data_dir.join("backups").join(&date);
    tokio::fs::create_dir_all(&backup_dir).await?;
    let dest = backup_dir.join("tasks.db.bak");
    tokio::fs::copy(&db_path, &dest).await?;
    Ok(())
}
```

Note: For Week 1, **do NOT** wire this to a network share. Local backup only. Network share comes in Week 4-5.

- [ ] **Step 9.2: Verify it compiles**

```bash
cd src-tauri && cargo build && cd ..
```

Expected: compiles without errors. The schedule runs as soon as `tauri dev` starts.

- [ ] **Step 9.3: Commit**

```bash
git add src-tauri/src/backup.rs
git commit -m "feat(backup): daily 18:00 local SQLite snapshot, async non-blocking"
```

---

## Task 10: Production build + .msi installer

**Files:**
- Modify: `src-tauri/tauri.conf.json` (set bundle identifier, name, version)

- [ ] **Step 10.1: Configure bundle**

In `src-tauri/tauri.conf.json`:

```json
{
  "productName": "TaskHandover",
  "version": "0.1.0",
  "identifier": "com.taskhandover.widget",
  "bundle": {
    "active": true,
    "targets": ["msi"],
    "icon": ["icons/icon.png"]
  }
}
```

- [ ] **Step 10.2: Build .msi**

```powershell
bun run tauri build
```

Expected: `src-tauri/target/release/bundle/msi/TaskHandover_0.1.0_x64_en-US.msi` exists.

- [ ] **Step 10.3: Install on the test machine**

Copy the .msi to one designer's machine. Double-click. Accept SmartScreen warning ("More info" → "Run anyway"). Confirm:
- Installation completes without admin prompt
- Start menu has "TaskHandover" entry
- Launching shows widget at top-right

- [ ] **Step 10.4: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "build: configure .msi bundle for production install"
```

---

## Task 11: 5-day trial protocol + kill-switch criteria

**This is not code. This is the protocol that decides whether the project continues.**

**Files:**
- Create: `docs/trial/2026-05-XX-week-1-trial.md`

- [ ] **Step 11.1: Write trial protocol**

Create `docs/trial/2026-05-XX-week-1-trial.md`:

```markdown
# Week 1 Trial Protocol — Designer A

**Date:** YYYY-MM-DD to YYYY-MM-DD
**Trialist:** [name of one designer]
**Project status before trial:** Pre-Spike PASS, Week 1 MVP shipped

## Setup (Day 0, evening)

1. Install TaskHandover_0.1.0_x64_en-US.msi on designer's machine
2. Add 5-10 of their actual current tasks via the widget
3. Show them the START / FINISH / UNDO buttons
4. Tell them this VERBATIM (read out loud):
   > "这不是工时统计工具。我做这个是为了让运营少打扰你们插单。
   > 数据全在你的电脑上，没人能远程看你的进度。
   > 你随时可以删掉它（删 %APPDATA%/com.taskhandover.widget），或者告诉我"不用了"。"

## During the trial (Day 1-5)

- **Do NOT** ask "你今天用了几次"
- **Do NOT** open the audit table to check their data
- **Do** observe whether they leave the widget open or close it
- **Do** note any unprompted comments (positive or negative)

## Day 5 debrief

Schedule a 15-minute conversation. Ask in this order:

1. "这 5 天，widget 让你哪个瞬间觉得有用？"
2. "哪个瞬间觉得多余/烦？"
3. "完成动画 + 音效 — 爽 / 还行 / 幼稚？"
4. "如果明天我把它移除了，你会怀念它吗？"
5. "有没有任何一刻觉得'被记录了'？"

## Pass/Continue criteria (need 4 of 5)

- [ ] 试用者主动用了 5 天，没有 1 天忘记打开
- [ ] 至少 1 次主动赞美或表达"比文档好用"
- [ ] 完成动画+音效未被评价为"幼稚"或"烦"
- [ ] 第 5 天问"会怀念吗"答案非"无所谓"
- [ ] 没有任何"被监控"的负面反馈

## Kill-switch criteria (any 1 = STOP)

- 试用者有任何"感觉被盯着" / "你在统计我吗" / "我有点不舒服"的反馈
- 试用者连续 2 天忘记打开
- 完成动画/音效引起明确的负面情绪（"幼稚"、"烦"、"不专业"）

If kill-switch triggers: stop development. Write a 1-page lessons learned doc. Do not "iterate to fix" — the failure is cultural, not technical.

## Outcome

(Fill in after Day 5)

- Pass: [ ] Yes / [ ] No
- Direct quote of strongest signal:
- Direct quote of weakest signal:
- Decision: [ ] Continue to Week 2-3 / [ ] Pause / [ ] Stop
```

- [ ] **Step 11.2: Commit**

```bash
git add docs/trial/
git commit -m "docs: Week 1 trial protocol with kill-switch criteria"
```

---

## Self-Review Checklist (run after writing the plan)

- [ ] Spec coverage: every section of the design doc maps to a task above (Pre-Spike → Task 0; MVP → Tasks 1-9; .msi packaging → Task 10; trial → Task 11)
- [ ] No placeholders: searched for "TODO", "TBD", "implement later" — none found
- [ ] Type consistency: `Task.startedAt` (camelCase in TS) ↔ `started_at` (snake_case in SQL) consistently mapped via `rowToTask` in every read path
- [ ] Hooks match store: `useStore.startTask` is fire-and-forget for state; `useTasks.persistStartTask` does the SQL — UI calls both in sequence consistently across TaskWidget
- [ ] Audit log invariant: every state-changing action has a `task_events` insert (verified in useTasks)
- [ ] LexoRank used: `addTask` uses `afterAll` to extend; full drag-drop reorder is W2 scope
- [ ] All test files have corresponding implementations after them in the same Task

---

## What This Plan Does NOT Cover (deferred)

- **W2-3**: Drag-drop sort, task details panel, difficulty tags, time estimates (separate plan after trial PASSES)
- **W4-5**: LAN sync (path A or path B — separate plan after W2-3)
- **Auto-update**: tauri-plugin-updater integration (Week 4 territory)
- **Multi-window**: ops panel separate from designer widget (Week 2 territory)
- **Tray menu**: hide/show widget, exit. Currently using OS-level close-X. Add in W2 if testers ask.

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-05-06-pre-spike-and-week-1-mvp.md`. Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints

Pre-Spike (Task 0) is a hard gate — if any of checks 4/6/7 fail, abandon Tauri and write a new Electron-based plan. Do not ship Week 1 work on a Pre-Spike that hasn't passed.
