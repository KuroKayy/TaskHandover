# TaskHandover — Claude Code 项目规范

> **AI agent: 每次启动会话时读这个文件。这是项目的"契约"——你写代码必须遵守。**

## 项目目标（一句话）

为 1 个电商运营 + 2 美工 + 1 摄影 的小团队做一个 Windows 桌面常驻任务 widget，**减少"插单时刻"的沟通摩擦**。

不是工时统计工具。**永远不是。**

## 不要做的事（红线）

1. ❌ **不要做"今天工作 X 小时"或"本周累计工时"统计面板**——即使技术上能算。这个项目最大的失败模式是被团队读成"被监控"。任何让人觉得在被记录工时的功能都不要做
2. ❌ **不要让"开始/结束"按钮无法撤销**——误点必须能 undo，且 undo 不写惩罚性的审计行
3. ❌ **不要把数据上传到云端 / 飞书 / 钉钉 / 任何外部服务**——MVP 阶段所有数据都在本机 SQLite。Adoption Risk 缓解依赖于"团队能直接看到数据本地"
4. ❌ **不要在主线程做文件 I/O 阻塞**（含 18:00 备份）——必须走 Tauri 的 `tokio::spawn` 后台任务
5. ❌ **不要用 framer-motion 做 layout-affecting properties**（width/height/top/left）的动画——只用 transform 和 opacity，否则 GPU 加速失效
6. ❌ **不要让 SQL 失败 silent fail**——任何 DB 错误必须 toast 弹窗 + 写一行 audit `event_type='error'`

## 技术栈（不可商量）

| 层 | 选择 | 锁定原因 |
|---|---|---|
| 桌面壳 | **Tauri 2.x** | 5MB 包，0.5s 启动；plan-eng-review D1 |
| UI | React 18 + TypeScript | 标配 |
| 样式 | Tailwind CSS | 标配 |
| 动画 | framer-motion | 只用 GPU-accelerated properties |
| 状态管理 | **Zustand** | plan-eng-review D3，Context 太重，useState 不够 |
| 本地存储 | **SQLite via `tauri-plugin-sql`** | plan-eng-review D2，官方插件，Week 1 不自己包 rusqlite |
| 排序 | **Fractional indexing (LexoRank)** | sort_order 是 TEXT，不是 INTEGER；plan-eng-review D5 |
| 测试 | Vitest + React Testing Library | Vite 项目原生 |
| 包管理 | bun (前端) + cargo (Rust) | bun 已确认在 dev 环境 |

## 核心文件结构

```
TaskHandover/
├── src-tauri/
│   ├── tauri.conf.json    # 透明 + 置顶 + 不抢焦点窗口配置
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── window.rs      # Windows: 用 WS_EX_NOACTIVATE 实现真正的不抢焦
│   │   └── migrations.rs
│   └── Cargo.toml
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/        # TaskWidget / TaskItem / CompletionAnimation / SoundToggle
│   ├── hooks/             # useTasks (SQL 唯一入口) / useAudio
│   ├── store/             # useStore.ts (Zustand)
│   ├── lib/               # db.ts (plugin-sql 包) / audio.ts / sounds/*.mp3
│   └── types.ts
├── package.json
├── tsconfig.json
└── CLAUDE.md             # 本文件
```

**`hooks/useTasks.ts` 是 SQL 唯一入口**。组件不直接调 plugin-sql。

## 数据模型

```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,                              -- UUID v4
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'in_progress', 'done', 'cancelled')),
    created_at INTEGER NOT NULL,                      -- Unix epoch ms
    started_at INTEGER,
    finished_at INTEGER,
    sort_order TEXT NOT NULL,                         -- LexoRank, e.g., 'a0', 'a0V', 'a1'
    note TEXT
);
CREATE INDEX idx_tasks_sort ON tasks(sort_order);
CREATE INDEX idx_tasks_status ON tasks(status);

-- 审计表，Adoption Risk 暴雷时给团队看
CREATE TABLE task_events (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('started', 'paused', 'resumed', 'finished', 'cancelled', 'undo', 'error')),
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX idx_events_task ON task_events(task_id, timestamp);
```

## 阶段 (Phased Delivery)

- **Pre-Week-0 Spike (1 天)**：验证 Tauri 透明 + 置顶 + 不抢焦点 + 系统托盘 + DPI 在 Windows 上能跑。撞墙 → 切 Electron
- **Week 1 (单机)**：MVP B —— 任务列表 + 开始/结束 + 完成动画 + 音效。无任何同步。让 1 个美工试用 5 天
- **Week 2-3**：拖拽排序（dnd-kit）+ 任务详情 + 难易度 + 工时估算字段（**只是字段，不是统计面板**）
- **Week 4-5**：路径甲（共享网盘 + 文件 watch，5-6 周到位）OR 路径乙（WebSocket + 离线缓冲，7-9 周到位）。**SQLite 不能直接放 SMB**，每人独立 .db + 汇总只读视图

## Pre-Week-0 Spike 7 项必验证

1. Tauri 2.x + Vite + React 起项目（`cargo tauri dev` 1 分钟内出窗口）
2. 透明背景能看穿到桌面
3. 始终置顶，PS 全屏下仍可见
4. **不抢焦点**：点 widget 按钮 PS 不丢失焦点（关键，可能要 Win32 `WS_EX_NOACTIVATE`）
5. 系统托盘图标可见
6. DPI 125% / 150% 缩放下尺寸正常
7. 多显示器主屏右上角定位正确

任意 #4 / #6 / #7 撞墙 → 切回 Electron，**不要硬撑**。

## Adoption Risk Kill Switch

Week 1 试用后，如果美工/摄影反馈"感觉被盯着 / 老板在统计我"——**立刻停止开发**。回到共享文档。

这不是技术问题，是文化问题。3 个人的内部工具不值得为它把团队气氛搞坏。

## 测试规范

- **每个 state transition 必须有 unit test**：startTask、finishTask、undo（含边界 no-op）
- **audit log 必须有测试**：每个状态变化都写一行 task_events
- **debounce 必须有测试**：连续点 2 次 finishTask → 第二次 no-op，动画不连发
- 测试文件路径：`src/store/useStore.test.ts`、`src/hooks/useTasks.test.ts` 等
- **Coverage 目标 70%+**（不强求 100%，因为很多代码是视觉动画）

## AI 助手编程约束

1. 写 Rust 代码前，先读 Tauri 2.x 官方文档对应章节（v2.x 的 API 与 v1.x 完全不同）
2. SQL 写入前要先做 Zod schema validation（在 `lib/db.ts` 边界一处）
3. 不要在 React 组件里直接 `await db.execute(...)`——必须走 `useTasks` hook
4. 涉及拖拽 / 排序变化时，使用 `fractional-indexing` npm 包，不要自己算
5. 写动画时只用 `transform` 和 `opacity`，不用 `width/height/top/left`
6. 任何新功能加进来前，先问：**这会不会被团队读成"被监控"？** 如果会，重新设计

## 项目状态

- **当前阶段**：Week 0（设计完成，待 Pre-Spike）
- **Design doc**：`~/.gstack/projects/TaskHandover/chongpai-no-git-design-20260506-223510.md`
- **Test plan**：`~/.gstack/projects/TaskHandover/chongpai-no-git-eng-review-test-plan-20260506-231406.md`
- **Reviews 已完成**：office-hours、plan-eng-review

## 待办（在 Pre-Spike 之前）

1. **The Assignment**（design doc）：坐 1 美工身后 1 小时，观察 4 件事
2. `git init` + `git add . && git commit -m "init"`——把这个项目纳入 git
3. Pre-Week-0 Spike

## 跑 gstack skill 的指引

- 重新评估架构 → `/plan-eng-review`
- 审查代码 → `/review`（写完代码后）
- QA 测试 → `/qa`（功能跑起来后）
- 部署/打包 → `/ship`（准备发给团队前）
- 记录进度 → `/context-save`
- 恢复进度 → `/context-restore`
