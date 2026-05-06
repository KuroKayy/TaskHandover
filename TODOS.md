# TODOS

> 不在当前 scope 但需要在合适时机回头处理的事。每项有完整 context，3 个月后回来读还能上手。

## 1. Pre-Spike 撞墙后的备份方案：Electron 切换路径

**What**：如果 Pre-Week-0 Spike 第 4/6/7 项任意撞墙（不抢焦点失败、DPI 错位、多显示器错位），切换到 Electron 时需要的步骤清单。

**Why**：design doc 已经说了"撞墙立刻切 Electron"，但没说切的具体步骤。撞墙的时刻通常情绪很糟，一份清单能省 2-3 小时的迷茫。

**Pros**：
- 让"切 Electron"成为 5 分钟决定，而不是半天纠结
- 前端 React 代码 100% 复用，只换壳

**Cons**：
- 写这份清单要花 30 分钟
- 80% 概率用不上（Pre-Spike 一般能过）

**Context**：
- Tauri 版前端代码与 Electron 版几乎完全可移植，只需替换：
  - `tauri-plugin-sql` → `better-sqlite3`（自己包成 ipcMain handler）
  - Tauri command 调用 → IPC `ipcRenderer.invoke`
  - 窗口配置：tauri.conf.json → main.js BrowserWindow options
- electron-builder 替代 tauri build
- 包大小：5MB → 200MB（接受）

**Depends on**：Pre-Spike 撞墙后才需要——不要预先做。

---

## 2. Week 4 之前补齐 LAN 同步技术细节

**What**：到 Week 4 起前，补足以下细节决定：
- 路径甲（共享网盘）vs 路径乙（WebSocket）选哪条？
- 路径甲：每人独立 .db 文件后，运营怎么看到所有人的任务？（建议：read-only ATTACH DATABASE 多个 .db 做汇总视图）
- 路径乙：host 选哪台机器？运营机器关机后怎么办？（fallback 选项：拉成 mesh 网，每人都是 server）
- 冲突合并策略：两人同时拖动同一任务到不同位置怎么办？

**Why**：现在没有可参考的代码，纯设计耗时长且容易跑偏。Week 3 末（Week 4 临近）时实测 Week 1-3 的代码状态后再定，决策质量高得多。

**Pros**：
- 避免现在做"假设性设计"，到时候发现 W2-3 的某些代码限制了选择
- 团队真实使用 Week 1-3 后，对 LAN 同步的需求会更具体

**Cons**：
- Week 3 末做这个评估要 1-2 天，会感觉延误了 Week 4 启动
- 但实际上比现在做的设计质量高 5x

**Context**：
- design doc 给了两条路径，user 暂时没选（D 选项保留）
- 路径甲的 SMB+SQLite 警告已写入 design doc 和 CLAUDE.md
- LexoRank 排序已采用，对 LAN 冲突合并友好

**Depends on**：Week 1-3 必须实际跑过，否则设计是空中楼阁。

---

## 3. CI/CD pipeline + tauri-plugin-updater 接入

**What**：Week 4 上线 LAN 同步时，配套引入：
- GitHub Actions（或 Gitee/Coding，看你用哪个）跑 `tauri build` 自动产 .msi
- tauri-plugin-updater 接入，配公司内网静态文件服务器（IIS / nginx 任选）做更新源
- 版本号策略：Semver，CHANGELOG.md 每次发版手写

**Why**：Week 1-3 你手动给 3 个人发 .msi 是 OK 的（每周 5 分钟）。但 Week 4 起改动会更频繁（同步 bug 修复），手动发版很快变成噩梦。

**Pros**：
- 每次 push 自动产 .msi
- 团队的工具自动更新，不用打扰他们装新版

**Cons**：
- 需要一台公司内网服务器（NAS 或闲置 PC 装个 IIS 即可）
- 第一次配置 tauri-plugin-updater + endpoint 大概 1 天

**Context**：
- design doc 的 Distribution Plan 章节已经写了"Week 1-3 手动，Week 4 起 tauri-plugin-updater"
- 内网工具不需要代码签名，跳过这步省事

**Depends on**：完成 Week 4 LAN 同步基础后再做（不然没有"同步 bug 修复"的频繁发版需求）。

---

## 4. Adoption Risk Week 1 后评估机制

**What**：Week 1 试用一周后，主动找试用的美工/摄影做一次结构化访谈。3 个问题：
1. "你觉得这个工具是给谁服务的？" （想听到："给我自己" 或 "给运营"，而不是 "给老板看我们工作")
2. "你最想让它新加什么、最想让它去掉什么？"
3. "如果明天突然没了，你会回到飞书表格吗？还是会想念这个？"

记录原话，写进 `~/.gstack/projects/TaskHandover/week1-feedback.md`。

**Why**：design doc 的 Success Criteria 写了 "至少 1 个美工主动说'这个比文档好用'"，但被动等待 vs 主动询问差别巨大。主动问能拿到具体反馈，被动等可能只听到客气话。

**Pros**：
- 这是 Adoption Risk kill switch 的真实触发判断依据
- 能引出 Week 2-3 的真实优先级（不靠猜）

**Cons**：
- 25 分钟左右访谈，要选合适时机（别在他们忙的时候）
- 你可能听到不想听的话——但这是好事

**Context**：
- design doc Adoption Risk 章节已经预告了这一步的重要性
- 用户在 office-hours 已经承诺要"坐在美工身后 1 小时"——这一步是 Week 1 后的版本
- 访谈不要在 widget 上跑——开个真实对话，最好咖啡时间

**Depends on**：Week 1 至少有 5 天连续试用数据。
