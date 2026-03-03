# 修复方案 #4: 窗口关闭逻辑复杂

**问题编号**: FIX-004
**优先级**: 🔴 高
**预计工作量**: 2-3 小时
**风险等级**: 中（涉及退出流程，需要仔细测试）

---

## 1. 问题分析

### 1.1 当前问题

**代码位置**: `src/main/index.ts` Line 123-235

**复杂度分析**:
- 113 行代码处理窗口关闭
- 3 层嵌套逻辑（视图判断 → 退出流程 → 清理步骤）
- 3 种退出机制（app.exit, process.exit, process.kill）
- 2 个超时定时器（3秒安全定时器 + 多个 100-200ms 定时器）
- 20 个 IPC handler 手动清理
- 多个 try-catch 块

### 1.2 历史原因

根据你的说明：**之前窗口关闭时主进程一直不退出**

这导致了当前的"过度防御"设计：
1. 添加了 3 秒安全定时器强制退出
2. 添加了 3 种不同的退出机制
3. 添加了大量的日志输出
4. 手动清理所有 IPC handlers
5. 多个 setTimeout 确保退出

### 1.3 根本问题

**为什么主进程不退出？**

可能的原因：
1. **PTY 进程未正确终止** - 子进程阻止主进程退出
2. **事件监听器未清理** - 导致引用保持
3. **定时器未清理** - setInterval/setTimeout 保持运行
4. **异步操作未完成** - Promise 未 resolve
5. **IPC handlers 保持引用** - 阻止垃圾回收

### 1.4 当前设计的问题

1. **过度复杂**:
   - 113 行代码难以理解和维护
   - 多层嵌套逻辑
   - 多个退出机制可能互相干扰

2. **不够优雅**:
   - 使用 SIGKILL 强制杀死进程
   - 手动清理 20 个 IPC handlers
   - 多个 setTimeout 链式调用

3. **可能的竞态条件**:
   - 3 种退出机制可能同时触发
   - 清理步骤可能被超时打断

4. **难以调试**:
   - 大量日志输出
   - 不清楚哪个步骤导致卡住

---

## 2. 解决方案设计

### 2.1 核心原则

1. **简化退出流程** - 减少复杂度
2. **确保资源清理** - 正确清理所有资源
3. **优雅退出** - 避免强制杀死进程
4. **可调试** - 清晰的日志和错误处理

### 2.2 架构设计

创建专门的 `ShutdownManager` 服务类，封装所有退出逻辑：

```
┌─────────────────────────────────────┐
│       ShutdownManager (新增)         │
├─────────────────────────────────────┤
│ - isShuttingDown: boolean           │
│ - shutdownSteps: ShutdownStep[]     │
│ - executeShutdown()                 │
│ - executeStep(step)                 │
│ - cleanupIpcHandlers()              │
│ - forceExit()                       │
└─────────────────────────────────────┘
           ↑
           │ 使用
           │
┌─────────────────────────────────────┐
│      src/main/index.ts              │
├─────────────────────────────────────┤
│ - window.on('close')                │
│ - app.on('window-all-closed')      │
└─────────────────────────────────────┘
```

### 2.3 关键改进

#### 改进 1: 提取 ShutdownManager

将所有退出逻辑封装到独立的服务类：

```typescript
// src/main/services/ShutdownManager.ts
export class ShutdownManager {
  private isShuttingDown = false;
  private shutdownTimeout = 3000; // 3秒安全超时

  async shutdown(context: ShutdownContext): Promise<void> {
    if (this.isShuttingDown) {
      console.log('[ShutdownManager] Already shutting down, skipping');
      return;
    }

    this.isShuttingDown = true;
    console.log('[ShutdownManager] Starting shutdown sequence');

    // 设置安全超时
    const safetyTimer = setTimeout(() => {
      console.error('[ShutdownManager] Safety timeout reached, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);
    safetyTimer.unref();

    try {
      await this.executeShutdownSteps(context);
      console.log('[ShutdownManager] Shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('[ShutdownManager] Shutdown failed:', error);
      process.exit(1);
    }
  }

  private async executeShutdownSteps(context: ShutdownContext): Promise<void> {
    const steps: ShutdownStep[] = [
      {
        name: 'Save workspace',
        fn: () => this.saveWorkspace(context),
        timeout: 1000,
      },
      {
        name: 'Stop services',
        fn: () => this.stopServices(context),
        timeout: 500,
      },
      {
        name: 'Cleanup subscriptions',
        fn: () => this.cleanupSubscriptions(context),
        timeout: 500,
      },
      {
        name: 'Destroy processes',
        fn: () => this.destroyProcesses(context),
        timeout: 2000,
      },
      {
        name: 'Cleanup IPC handlers',
        fn: () => this.cleanupIpcHandlers(),
        timeout: 100,
      },
    ];

    for (const step of steps) {
      try {
        console.log(`[ShutdownManager] Executing: ${step.name}`);
        await this.executeWithTimeout(step.fn, step.timeout, step.name);
        console.log(`[ShutdownManager] Completed: ${step.name}`);
      } catch (error) {
        console.error(`[ShutdownManager] Failed: ${step.name}`, error);
        // 继续执行其他步骤，不要因为一个步骤失败就停止
      }
    }
  }

  private async executeWithTimeout(
    fn: () => Promise<void>,
    timeout: number,
    name: string
  ): Promise<void> {
    return Promise.race([
      fn(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`${name} timeout`)), timeout)
      ),
    ]);
  }

  private async saveWorkspace(context: ShutdownContext): Promise<void> {
    if (context.autoSaveManager && context.currentWorkspace) {
      await context.autoSaveManager.saveImmediately();
    }
  }

  private async stopServices(context: ShutdownContext): Promise<void> {
    context.autoSaveManager?.stopAutoSave();
    context.statusPoller?.stopPolling();
  }

  private async cleanupSubscriptions(context: ShutdownContext): Promise<void> {
    context.ptySubscriptionManager?.clear();
    context.ptyOutputCache.clear();
  }

  private async destroyProcesses(context: ShutdownContext): Promise<void> {
    if (context.processManager) {
      await context.processManager.destroy();
    }
  }

  private async cleanupIpcHandlers(): Promise<void> {
    // 不需要手动清理 IPC handlers
    // Electron 会在进程退出时自动清理
    // 如果确实需要清理，应该由 handlers/index.ts 提供统一的清理方法
  }
}
```

#### 改进 2: 简化 window.on('close')

```typescript
// src/main/index.ts
mainWindow.on('close', async (event) => {
  // 如果在终端视图，返回统一视图而不是关闭窗口
  if (currentView === 'terminal' && !isQuitting) {
    event.preventDefault();
    mainWindow?.webContents.send('view-changed', { view: 'unified' });
    currentView = 'unified';
    return;
  }

  // 在统一视图或已经在退出流程中，执行正常关闭
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;

    // 使用 ShutdownManager 处理退出
    const shutdownContext: ShutdownContext = {
      mainWindow,
      processManager,
      statusPoller,
      autoSaveManager,
      ptySubscriptionManager,
      ptyOutputCache,
      currentWorkspace,
    };

    await shutdownManager.shutdown(shutdownContext);
  }
});
```

#### 改进 3: 不需要手动清理 IPC handlers

**关键发现**: Electron 会在进程退出时自动清理所有 IPC handlers。

手动清理 20 个 IPC handlers 是**不必要的**：
- 增加了代码复杂度
- 容易遗漏新增的 handlers
- 没有实际好处

**建议**: 删除所有 `ipcMain.removeHandler()` 调用

#### 改进 4: 只使用一种退出机制

**当前**: 3 种退出机制（app.exit, process.exit, process.kill）

**问题**:
- 可能互相干扰
- 不清楚哪个生效
- 过度防御

**建议**: 只使用 `process.exit()`
- 简单直接
- 可靠
- 不需要多个 setTimeout

#### 改进 5: 根本解决"不退出"问题

**关键**: 找到并修复导致主进程不退出的根本原因

**可能的原因和解决方案**:

1. **PTY 进程未终止**
   - 检查 `ProcessManager.destroy()` 是否正确终止所有子进程
   - 确保使用 `SIGTERM` 而不是 `SIGKILL`
   - 等待子进程退出事件

2. **定时器未清理**
   - 检查 `StatusPoller` 是否正确停止
   - 检查 `AutoSaveManager` 是否正确停止
   - 使用 `clearInterval` 和 `clearTimeout`

3. **事件监听器未清理**
   - 检查是否有未清理的事件监听器
   - 使用 `removeListener` 清理

---

## 3. 实施步骤

### 步骤 1: 创建 ShutdownManager

**文件**: `src/main/services/ShutdownManager.ts`

### 步骤 2: 创建 ShutdownContext 接口

**文件**: `src/main/services/ShutdownContext.ts`

### 步骤 3: 简化 window.on('close')

**修改**: `src/main/index.ts`

### 步骤 4: 删除不必要的代码

- 删除手动清理 IPC handlers 的代码
- 删除多余的退出机制
- 删除多余的 setTimeout

### 步骤 5: 测试和验证

- 测试正常退出
- 测试异常情况下的退出
- 验证所有资源正确清理

---

## 4. 预期效果

### 代码精简

**重构前**:
- window.on('close'): 113 行

**重构后**:
- window.on('close'): ~20 行
- ShutdownManager: ~150 行
- **总计**: ~170 行（略有增加，但逻辑清晰）

### 可维护性

- ✅ 退出逻辑封装在独立的服务类
- ✅ 清晰的步骤划分
- ✅ 易于调试和测试
- ✅ 易于新增清理步骤

### 可靠性

- ✅ 统一的超时处理
- ✅ 错误不会中断整个流程
- ✅ 清晰的日志输出
- ✅ 优雅的退出机制

---

## 5. 风险评估

### 风险

- **中风险**: 退出流程是关键路径，修改需要谨慎
- **低风险**: 只是重构，不改变核心逻辑

### 缓解措施

1. **充分测试** - 测试各种退出场景
2. **保留日志** - 保留详细的日志输出
3. **保留安全超时** - 保留 3 秒安全超时
4. **Git 分支** - 在独立分支上进行修改

---

## 6. 测试计划

### 测试场景

1. **正常退出** - 点击关闭按钮
2. **终端视图退出** - 在终端视图点击关闭
3. **有运行中的进程** - 有多个 PTY 进程运行时退出
4. **工作区保存失败** - 模拟保存失败
5. **进程终止失败** - 模拟进程终止失败
6. **快速连续关闭** - 快速点击多次关闭按钮

### 验收标准

- [ ] 所有场景下应用都能正常退出
- [ ] 退出时间 < 3 秒
- [ ] 工作区正确保存
- [ ] 所有 PTY 进程正确终止
- [ ] 无僵尸进程残留
- [ ] 日志清晰易懂

---

## 7. 后续优化

### 可选改进

1. **进度反馈** - 显示退出进度给用户
2. **取消退出** - 允许用户取消退出（如果有未保存的工作）
3. **退出原因** - 记录退出原因（正常/异常/强制）
4. **退出统计** - 统计退出时间和成功率

---

**准备开始实施？请确认后我将开始重构。**
