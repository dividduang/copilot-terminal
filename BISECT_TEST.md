# Git Bisect 测试指南 - 输入法候选框闪动问题

## 问题描述
在终端中使用中文输入法时，候选框会来回闪动/跳动。

## Bisect 范围
- **坏的 commit (bad)**: `HEAD` (当前分支 feature/claude-code-tmux-compat)
- **好的 commit (good)**: `56992aa` (2026-02-28 项目初始化)
- **总 commit 数**: 约 203 个
- **预计测试次数**: 约 8 次 (log2(203) ≈ 7.7)

## 开始 Bisect

```bash
# 1. 开始 bisect
git bisect start

# 2. 标记当前版本为"坏的"
git bisect bad

# 3. 标记项目初始化版本为"好的"
git bisect good 56992aa
```

## 测试步骤

每次 git 切换到一个 commit 后，按以下步骤测试：

### 1. 清理并重新安装依赖
```bash
# 清理旧的构建产物
rm -rf dist out node_modules/.vite

# 重新安装依赖（如果 package.json 有变化）
npm install
```

### 2. 启动开发环境
```bash
npm run dev
```

### 3. 测试输入法候选框

在应用中：
1. 创建或打开一个终端窗口
2. 运行一个有动画输出的命令，例如：
   ```bash
   # PowerShell
   while ($true) { Get-Date; Start-Sleep -Milliseconds 100 }

   # 或者运行 Claude Code
   claude
   ```
3. 在终端中使用中文输入法输入文字
4. **仔细观察候选框是否跳动**

### 4. 判断并标记结果

- **如果候选框稳定不跳动** → 这是"好的" commit
  ```bash
  git bisect good
  ```

- **如果候选框跳动/闪动** → 这是"坏的" commit
  ```bash
  git bisect bad
  ```

- **如果无法编译或运行** → 跳过这个 commit
  ```bash
  git bisect skip
  ```

### 5. 重复测试

Git 会自动切换到下一个需要测试的 commit，重复步骤 1-4。

## 测试技巧

1. **确保测试环境一致**：
   - 使用相同的输入法
   - 使用相同的测试命令
   - 在相同的终端窗口中测试

2. **仔细观察**：
   - 候选框的位置是否稳定
   - 是否有明显的上下跳动
   - 是否有闪烁现象

3. **多次验证**：
   - 如果不确定，可以多输入几次中文
   - 尝试不同的输入场景

## 完成 Bisect

当 git bisect 找到引入问题的 commit 时，会显示类似信息：

```
<commit-hash> is the first bad commit
commit <commit-hash>
Author: ...
Date: ...

    <commit message>
```

### 查看问题 commit 的详细信息

```bash
# 查看 commit 详情
git show <commit-hash>

# 查看修改的文件列表
git show --name-only <commit-hash>

# 导出完整 diff
git show <commit-hash> > problem-commit.diff
```

### 结束 Bisect

```bash
# 查看 bisect 日志
git bisect log

# 结束 bisect，返回原分支
git bisect reset
```

## 注意事项

1. **每次测试都要重新编译**：`npm run dev` 会重新编译代码
2. **不要跳过测试**：除非 commit 无法编译，否则都要测试
3. **记录测试结果**：可以在纸上记录每次测试的 commit hash 和结果
4. **保持耐心**：整个过程可能需要 30-60 分钟

## 预期时间线

- 每次测试约 3-5 分钟（编译 + 测试）
- 总共约 8 次测试
- 预计总时间：30-40 分钟

## 如果遇到问题

1. **编译失败**：使用 `git bisect skip` 跳过
2. **不确定结果**：标记为 `bad`（保守策略）
3. **需要重新开始**：`git bisect reset` 然后重新开始

---

准备好后，执行上面的"开始 Bisect"命令开始测试！
