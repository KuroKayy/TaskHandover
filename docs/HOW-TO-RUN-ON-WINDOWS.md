# 怎么在 Windows 上跑这个项目

> 给非技术 user 的实操清单。Mac 上代码全写完了（20/20 测试通过），但 Tauri 必须在 Windows 上才能编译运行。

---

## Step 1：把代码搬到 Windows 机器（5 分钟）

### 选项 A：用 git（推荐）

如果 Windows 机器装了 git：

```powershell
# 在 Windows 上
git clone <你 Mac 上同步过来的仓库地址> TaskHandover
cd TaskHandover
```

### 选项 B：直接拷贝

把 Mac 上的 `/Users/chongpai/ClaudeCode/TaskHandover/` 整个文件夹（**排除 `node_modules/` 和 `src-tauri/target/`**——这俩太大且能重新生成）拷到 Windows，比如 `C:\TaskHandover\`。

可以用 U 盘 / 共享网盘 / SCP / Git LFS。

---

## Step 2：在 Windows 上装环境（一次性，~15 分钟）

打开 **PowerShell**，依次跑：

### 2a. 装 Rust

```powershell
# 装 MSVC build tools (Tauri 在 Windows 必需)
winget install Rustlang.Rust.MSVC

# 验证
rustc --version
# 应该打印 rustc 1.7x 或更新
```

### 2b. 装 bun

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"

# 重启 PowerShell 后验证
bun --version
# 应该打印 1.3 或更新
```

### 2c. 装项目依赖

```powershell
cd C:\path\to\TaskHandover
bun install
# 大概装 200+ 个包，1-2 分钟
```

---

## Step 3：跑 Pre-Week-0 Spike（30 分钟，KILL-SWITCH GATE）

**这是 go/no-go 节点**——撞墙就切 Electron，过了才继续。

```powershell
cd C:\path\to\TaskHandover
bun run tauri dev
```

**第一次跑会编译 Rust，~5-10 分钟**。之后会自动打开一个 widget 窗口在右上角。

### 7 项检查清单

打开 Photoshop 全屏（用于 #3-#4 检查）。如果有 125% DPI 显示器开（用于 #6）。如果有多显示器开（用于 #7）。

| # | 检查 | 通过标准 | 结果 |
|---|---|---|---|
| 1 | Dev runs | `bun run tauri dev` 1 分钟内出窗口 | ☐ PASS / ☐ FAIL |
| 2 | 透明 | 桌面壁纸能从 widget 缝隙看到 | ☐ PASS / ☐ FAIL |
| 3 | 始终置顶 | Widget 在 Photoshop 全屏时仍然可见 | ☐ PASS / ☐ FAIL |
| 4 | **不抢焦点** | 点 widget 上的"+" 按钮 → Photoshop 不丢焦点（鼠标光标还在 PS 画布上） | ☐ PASS / ☐ FAIL |
| 5 | 系统托盘 | 右下角能看到 widget 图标 | ☐ PASS / ☐ FAIL |
| 6 | DPI 缩放 | 在 125% / 150% 缩放显示器上 widget 是 350×600 逻辑 px | ☐ PASS / ☐ FAIL |
| 7 | 多显示器 | Widget 固定在主显示器右上角（不跑到副屏） | ☐ PASS / ☐ FAIL |

### 决策

- **全部 PASS**：进 Step 4。打字试一下"添加任务"、点"开始"、点"完成"——应该看到 🎉 动画 + 听到（无声）音效（你需要把 `public/sounds/complete.mp3` 替换成真音效）
- **#4 / #6 / #7 任一 FAIL**：**STOP**。Tauri 在你的 Windows 环境撑不住核心需求。回到 design doc 里的"Approach A: Electron"路线。我会另写一份 Electron 实施计划。
- **#1 / #2 / #3 / #5 FAIL**：是已知问题，先 troubleshoot 一次再决定（通常是配置问题，不是 Tauri 不支持）

---

## Step 4：试用一周（5 天，最重要的环节）

### 4a. 装到 1 台美工/摄影的机器

如果 Pre-Spike 都过了，先打个 .msi 安装包：

```powershell
bun run tauri build
```

输出在 `src-tauri/target/release/bundle/msi/TaskHandover_0.1.0_x64_en-US.msi`。

复制 .msi 到一台美工的机器，双击安装（Windows SmartScreen 警告时点"更多信息" → "仍要运行"）。

### 4b. 介绍话术（**第一句必须照念**）

跟试用的美工/摄影说：

> **"这不是工时统计工具。我做这个是为了让运营少打扰你们插单。**
>
> 数据全在你的电脑上，没人能远程看你的进度。
>
> 你随时可以删掉它（删 `%APPDATA%\com.taskhandover.widget`），或者告诉我"不用了"。"

### 4c. 试用规则

参考 [docs/plans/2026-05-06-pre-spike-and-week-1-mvp.md](plans/2026-05-06-pre-spike-and-week-1-mvp.md) 里 Task 11 的协议——5 个 PASS 标准 + 3 个 KILL-SWITCH 标准。

---

## 替换音效（可选）

`public/sounds/complete.mp3` 现在是 1 秒静音占位。要换成真音效：

1. 找一个 < 1 秒的 .mp3（推荐 [freesound.org](https://freesound.org) 找 "ding" 或 "chime"，CC0 协议）
2. 替换 `public/sounds/complete.mp3`
3. （可选）替换 `public/sounds/new-task.mp3`——目前没用，Week 4 LAN 同步时新任务进来才会响
4. 重新 `bun run tauri build`

---

## 故障排查

### `bun run tauri dev` 编译失败

最常见原因：MSVC build tools 没装全。跑：

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

然后重启 PowerShell，再 `bun run tauri dev`。

### Widget 窗口没出现

检查 `bun run tauri dev` 的输出有没有 error。常见：
- 端口 1420 被占用 → 关掉占用的程序，或改 `vite.config.ts` 的端口
- Rust 编译还在跑 → 第一次要等 5-10 分钟

### 任务点了"开始"没反应

打开 PowerShell 看 dev 模式输出。如果有 SQL error，可能是数据库初始化失败。删除 `%APPDATA%\com.taskhandover.widget\tasks.db` 让它重建一次。

### 想看后台数据

数据库文件位置：`%APPDATA%\com.taskhandover.widget\tasks.db`

用 [DB Browser for SQLite](https://sqlitebrowser.org/)（免费）打开能看：
- `tasks` 表：所有任务
- `task_events` 表：每个"开始/结束/撤销"的审计记录——**Adoption Risk 暴雷时给团队看这个，证明数据本地、没上传**

### 备份位置

每天 18:00 自动产生：`%APPDATA%\com.taskhandover.widget\backups\YYYY-MM-DD\tasks.db.bak`

恢复昨天数据：复制 .bak 文件覆盖到 `%APPDATA%\com.taskhandover.widget\tasks.db`，重启 widget。

---

## 收到反馈后告诉我

试用 5 天后，把以下信息复制给我：

1. **试用者原话**——他们说了什么
2. **kill switch 触发了吗**——有没有"被监控"的反馈
3. **5 个 PASS 条件命中几个**（详见 plan Task 11）
4. **要 Week 2 加什么、去什么**——先听他们的需求

我根据你的反馈写 Week 2-3 的实施计划。

**最关键**：如果有任何一个"感觉被盯着 / 老板在统计我"的反馈——**立刻停**。这个项目不值得为 3 个人的工具搞坏团队气氛。
