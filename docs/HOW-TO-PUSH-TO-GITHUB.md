# 怎么把代码推到 GitHub 让它自动帮你打包成 Windows 安装包

> 给非技术 user 的实操清单。**全程不用装 Rust，不用编译，零命令行知识需求。**
> 你只要会复制粘贴命令，10 分钟就能拿到一个 `.msi` 安装包，发给你美工 / 摄影同事直接装。

---

## 整体流程是什么？

1. 你在 GitHub 上注册账号 + 建一个仓库（5 分钟，**只做一次**）
2. 你把 Mac 上的代码推到这个仓库（5 分钟，**只做一次**）
3. **GitHub 自动跑一台虚拟 Windows 机器**，帮你编译出 `.msi` 安装包（自动，5-10 分钟）
4. 你从 GitHub 网页下载这个 `.msi`，发给同事
5. **以后每次改代码**：你 `git push`，GitHub 自动帮你打包新版本，你下载即可

整个流程的关键是：**你不需要有 Windows 机器、不需要装 Rust、不需要在本地跑任何编译。** GitHub 替你跑。

---

## Step 1：注册 GitHub 账号（如果你已经有账号，跳过）

打开浏览器，访问：

```
https://github.com/signup
```

填邮箱、密码、用户名。免费账号就够了。

记住你的 **用户名**，下面会用到，假设你的用户名是 `chongpai`。

---

## Step 2：在 GitHub 上建一个新仓库（3 分钟）

1. 登录后，点右上角你的头像旁边的 **"+"** 按钮，选择 **"New repository"**
   - [截图位置：GitHub 右上角 + 号下拉菜单]

2. 填仓库信息：
   - **Repository name**: `TaskHandover`（一字不差，必须和文件夹名一样）
   - **Description**: 随便写，比如 "Internal task widget"
   - **Visibility**: 选 **Private**（私有！这样只有你能看，不会被搜到）
   - **重要：Initialize this repository with** 这一项 **三个勾全部不要勾**（README、.gitignore、license 都不要勾）。因为我们 Mac 上已经有这些文件了，勾了会冲突。

3. 点最下面绿色的 **"Create repository"** 按钮。

4. 现在你会看到一个新页面，上面写着 "Quick setup"。**先别动**，记下页面上那个网址，长这样：

   ```
   https://github.com/chongpai/TaskHandover.git
   ```

   把 `chongpai` 换成你自己的用户名，下一步要用。

---

## Step 3：创建 Personal Access Token（GitHub 的"密码"，5 分钟）

> **为什么要这个？** GitHub 现在不让你用普通密码推代码了，必须用一个叫 "Token" 的字符串当密码。这是它官方推荐的方式。比 SSH 简单很多。

1. 访问：

   ```
   https://github.com/settings/tokens
   ```

2. 点右上角 **"Generate new token"** → 选 **"Generate new token (classic)"**

3. 填表：
   - **Note**：写 `TaskHandover push` 之类的备注，自己看的
   - **Expiration**：选 **"No expiration"**（永不过期，省事；如果你介意安全可以选 90 天）
   - **Scopes**：**勾选第一项 `repo`**（这一项下面所有子项会自动全勾上）。其他的都不要勾。

4. 拉到最下面，点 **"Generate token"** 绿色按钮。

5. **关键**：页面会显示一串字符，长这样：

   ```
   ghp_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
   ```

   **立刻复制下来贴到一个文本文件里保存好！这串字符只显示一次，关了页面就再也看不到了。**

   假设你的 Token 是 `ghp_xxx...xxx`，下一步要用。

---

## Step 4：把 Mac 上的代码推到 GitHub（5 分钟）

打开 Mac 的 **终端**（Terminal），跑这几条命令。**一条一条复制粘贴**，不要一次粘贴所有。

### 4a. 进项目目录

```bash
cd /Users/chongpai/ClaudeCode/TaskHandover
```

### 4b. 告诉 git 你的远程仓库地址

把 `<USERNAME>` 换成你的 GitHub 用户名（比如 `chongpai`）：

```bash
git remote add origin https://github.com/<USERNAME>/TaskHandover.git
```

> 如果它报错说 "remote origin already exists"，跑这条把它删了再重来：
> ```bash
> git remote remove origin
> ```
> 然后重新跑上面那条 `git remote add` 命令。

### 4c. 把分支重命名为 `main`（GitHub 默认分支名）

```bash
git branch -M main
```

### 4d. 推代码！

```bash
git push -u origin main
```

跑完会让你输入 **Username** 和 **Password**：

- **Username**: 你的 GitHub 用户名（比如 `chongpai`）
- **Password**: **不要输你 GitHub 登录密码！** 输你刚才保存的那个 Token（`ghp_xxx...xxx`）

> Token 粘贴到 Password 框里看不见任何字符——**这是正常的**，终端故意不显示密码。粘完直接回车就行。

如果一切顺利，会看到类似输出：

```
Enumerating objects: 50, done.
...
To https://github.com/chongpai/TaskHandover.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main' from origin.
```

刷新一下 GitHub 仓库页面，应该能看到所有文件已经上去了。

---

## Step 5：等 GitHub 自动打包 Windows 安装包（5-10 分钟）

代码一推上去，GitHub 就开始干活了。

1. 在你 GitHub 仓库页面顶部，点 **"Actions"** 标签
   - [截图位置：仓库页顶部菜单栏，靠左数第 3-4 个标签]

2. 你会看到一个叫 **"Build Windows MSI"** 的 workflow 正在跑（图标是个转动的黄色圆圈）

3. 点进去看进度。**第一次跑大概 5-10 分钟**（要下载 Rust 依赖、编译）。**以后跑只要 1-2 分钟**（缓存了）。

4. 跑完图标会变绿色对勾。

> ⚠️ 如果变红色叉号，说明出错了。点进去看日志，把日志贴给 Claude Code 帮你定位问题。最常见的错误是 lockfile 不一致——下面 FAQ 有解。

---

## Step 6：下载 .msi 安装包（30 秒）

1. 点进刚才跑完的那个绿色对勾的 workflow run（在 Actions 页面）

2. **拉到页面最下面**，会看到一个 **"Artifacts"** 区域

3. 点 **"TaskHandover-windows-msi"** 链接，浏览器会下载一个 `.zip` 文件

4. 解压这个 `.zip`，里面有一个 `TaskHandover_0.1.0_x64_en-US.msi`（具体版本号可能不一样）

5. **这就是你要发给同事的安装包。** 双击就能装，不用任何额外步骤。

---

## Step 7：以后每次改代码（30 秒一次）

每次你（或 Claude Code）改了代码：

```bash
cd /Users/chongpai/ClaudeCode/TaskHandover
git add -A
git commit -m "改了什么的简短说明"
git push
```

push 完去 GitHub Actions 页面看，几分钟后新的 `.msi` 自动出来了，重复 Step 6 下载就行。

---

## Step 8：手动触发打包（不改代码也想重打）

万一你没改代码但想重新打一个包（比如你怀疑上次打的有问题）：

1. 仓库页 → **Actions** 标签
2. 左侧选 **"Build Windows MSI"**
3. 右上角点 **"Run workflow"** 灰色按钮 → 选 `main` 分支 → 点绿色 **"Run workflow"** 确认
   - [截图位置：Actions 页面右上方]

5 分钟后新的 `.msi` 就出来了。

---

## Step 9：发布带版本号的正式版本（可选）

当你觉得某个版本足够稳定，想给它打个版本号（比如 `v0.1.0`），让同事知道这是"正式版本"：

```bash
cd /Users/chongpai/ClaudeCode/TaskHandover
git tag v0.1.0
git push origin v0.1.0
```

这会：

1. 触发 GitHub 重新打包（和平时一样）
2. **自动在 GitHub 创建一个 "Release" 页面**，把 `.msi` 挂在上面
3. 你以后可以在仓库的 **"Releases"** 标签页看到所有正式版本，每个都有独立下载链接

下次发版本就改成 `v0.2.0`、`v0.3.0` 之类的（语义版本号：大改 `0.x.0`，小修 `0.0.x`）。

---

## FAQ

### Q: 我推代码时报错 "Authentication failed"

99% 是密码输错了——你输的是 GitHub 登录密码而不是 Token。重做 Step 3 + 4d。

### Q: 我推代码时报错 "remote origin already exists"

跑这条删掉：

```bash
git remote remove origin
```

然后重新跑 Step 4b。

### Q: GitHub Actions 跑出来红色叉号 "lockfile mismatch"

可能是 `bun.lock` 没跟着代码一起推上去。检查：

```bash
git status
git add bun.lock
git commit -m "add lockfile"
git push
```

### Q: 我每次 push 都要重新输 Username + Token，太烦

可以让 Mac 记住凭证，跑一次：

```bash
git config --global credential.helper osxkeychain
```

下次 push 输一次后，Mac 钥匙串会帮你记住。

### Q: GitHub Actions 免费吗？

**私有仓库**：每月 2000 分钟免费（绰绰有余，每次构建 ~5 分钟）。
**公开仓库**：完全免费、无限。

我们用 Private 仓库，不会超额。

### Q: 我能不能让同事也下载 .msi？

可以。两个方案：

**方案 A（简单）**：你下载完 `.msi`，用微信 / 网盘发给他们。
**方案 B（更专业）**：在仓库 Settings → Collaborators 把同事加进来。他们登录 GitHub 后能直接进 Actions 页面下载。

### Q: Token 我不小心删了 / 弄丢了怎么办

重做 Step 3 生成一个新的就行。旧的不影响（Token 之间互相独立）。

### Q: 这个 .msi 装的时候 Windows 报"未知发布者"警告

正常的，因为我们没买代码签名证书（一年几百到几千块）。点 "更多信息" → "仍要运行" 即可。**MVP 阶段不需要花这个钱。**

### Q: 我能不能不用命令行，全程在 GitHub 网页上操作？

可以，但麻烦。GitHub 网页支持 "Upload files" 但要一个文件夹一个文件夹拖，节点有限制。**不推荐**，命令行 5 分钟搞定的事网页要折腾半小时。

---

## 出问题怎么办？

把红色叉号那个 workflow run 的链接（GitHub URL）贴给 Claude Code，让它读 Actions 日志帮你诊断。常见错误它都见过。
