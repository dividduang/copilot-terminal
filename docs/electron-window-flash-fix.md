# Electron 窗口启动白色闪烁问题解决方案

## 问题描述

在 Electron 应用启动时，会出现短暂的白色窗口闪烁现象，即使采取了以下措施仍然无法完全解决：
- 设置 `BrowserWindow` 的 `backgroundColor: '#0a0a0a'`
- 在 HTML 中添加内联样式设置黑色背景
- 使用 `show: false` 延迟显示窗口
- 使用 `ready-to-show` 或 `did-finish-load` 事件

这个问题在用户体验上非常明显，特别是在深色主题应用中，白色闪烁会显得格外刺眼。

## 问题根本原因

1. **Electron 事件触发时机不精确**
   - `ready-to-show` 事件可能在 React 组件完全渲染前就触发
   - `did-finish-load` 事件只表示 DOM 加载完成，不代表样式已应用

2. **CSS 加载和应用延迟**
   - 外部 CSS 文件需要加载时间
   - Tailwind CSS 的 `@apply` 指令需要处理时间
   - CSS 变量需要解析和应用

3. **窗口显示和内容渲染的时间差**
   - 窗口显示是同步的，但内容渲染是异步的
   - 在渲染完成前，浏览器会显示默认的白色背景

## 解决方案

### 核心思路

使用 **IPC 通信**让渲染进程在真正准备好后主动通知主进程，而不是依赖 Electron 的事件。结合**透明窗口**和**淡入动画**来掩盖任何可能的闪烁。

### 实现步骤

#### 1. 主进程配置 (src/main/index.ts)

```typescript
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 480,
    minHeight: 360,
    backgroundColor: '#0a0a0a', // 设置背景色（第一层防护）
    title: 'ausome-terminal',
    show: false, // 创建时不显示，等待渲染进程通知
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  // 移除菜单栏
  Menu.setApplicationMenu(null);

  // 🎯 关键：等待渲染进程明确通知"我准备好了"
  ipcMain.once('renderer-ready', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // 1. 先设置窗口为完全透明
      mainWindow.setOpacity(0);

      // 2. 最大化并显示窗口（此时是透明的，用户看不到）
      mainWindow.maximize();
      mainWindow.show();

      // 3. 延迟 50ms 后开始淡入（确保内容完全渲染）
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          // 使用平滑的淡入动画（约 160ms）
          let opacity = 0;
          const fadeInterval = setInterval(() => {
            opacity += 0.05; // 每次增加 5%
            if (opacity >= 1) {
              mainWindow?.setOpacity(1);
              clearInterval(fadeInterval);
            } else {
              mainWindow?.setOpacity(opacity);
            }
          }, 8); // 每 8ms 增加一次，总共约 160ms
        }
      }, 50);
    }
  });

  // 加载页面
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}
```

#### 2. Preload 脚本配置 (src/preload/index.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ... 其他 API

  // 🎯 添加通知主进程渲染完成的方法
  notifyRendererReady: () => ipcRenderer.send('renderer-ready'),
});
```

#### 3. 渲染进程通知 (src/renderer/App.tsx)

```typescript
import React, { useEffect, useState } from 'react';

function App() {
  // ... 其他代码

  // 🎯 通知主进程渲染完成（延迟确保主题和样式完全应用）
  useEffect(() => {
    const timer = setTimeout(() => {
      window.electronAPI.notifyRendererReady();
    }, 100); // 延迟 100ms 确保样式完全应用

    return () => clearTimeout(timer);
  }, []); // 只执行一次

  // ... 其他代码
}
```

#### 4. HTML 内联样式 (src/renderer/index.html)

```html
<!DOCTYPE html>
<html lang="zh-CN" style="background-color: #0a0a0a;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ausome-terminal</title>
  <style>
    /* 防止白色闪烁：在 CSS 加载前就设置黑色背景（第二层防护） */
    html {
      background-color: #0a0a0a !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #0a0a0a;
      color: #fafafa;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    #root {
      background-color: #0a0a0a;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body style="background-color: #0a0a0a;">
  <div id="root" style="background-color: #0a0a0a;"></div>
  <script type="module" src="/index.tsx"></script>
</body>
</html>
```

## 为什么这个方案有效

### 多层防护机制

1. **HTML 内联样式**（第一层）
   - 在任何外部 CSS 加载前就设置黑色背景
   - 使用 `!important` 确保优先级最高
   - 在 `<html>`、`<body>`、`#root` 都设置背景色

2. **BrowserWindow 背景色**（第二层）
   - 设置窗口级别的背景色
   - 在页面加载前就生效

3. **透明窗口显示**（第三层）
   - 窗口显示时完全透明（opacity = 0）
   - 即使有白色闪烁也看不到

4. **淡入动画**（第四层）
   - 平滑过渡到完全不透明
   - 提供优雅的视觉体验

### 精确的时机控制

- **不依赖 Electron 事件**：让 React 应用自己决定何时准备好
- **延迟通知**：100ms 延迟确保 React 组件和样式完全加载
- **延迟淡入**：50ms 延迟确保内容完全渲染后再开始淡入
- **平滑动画**：160ms 的淡入时间既不会太快（看不清）也不会太慢（感觉卡顿）

## 关键要点

### ✅ 必须做的

1. **使用 IPC 通信**
   - 渲染进程主动通知，不依赖 Electron 事件
   - 在 React 组件挂载后延迟通知（100ms）

2. **先透明再显示**
   - 设置 `opacity: 0` 后再调用 `show()`
   - 避免用户看到任何中间状态

3. **多层背景色设置**
   - HTML 内联样式
   - BrowserWindow backgroundColor
   - 确保从头到尾都是黑色

4. **合适的动画时长**
   - 淡入时间 150-200ms 最佳
   - 太快看不清，太慢感觉卡顿

### ❌ 不要做的

1. **不要依赖 Electron 事件**
   - `ready-to-show` 时机不够精确
   - `did-finish-load` 只表示 DOM 加载完成

2. **不要立即显示窗口**
   - 必须等待渲染进程通知
   - 不要在 `ready-to-show` 中直接 `show()`

3. **不要跳过延迟**
   - 渲染进程通知前的 100ms 延迟很重要
   - 淡入前的 50ms 延迟也很重要

4. **不要使用过长的动画**
   - 超过 300ms 会让用户感觉启动慢
   - 低于 100ms 可能看不到淡入效果

## 参考项目

这个解决方案参考了 [nota-pro](D:\sources\pycharm_projects\private\pc-programs\nota-pro) 项目的实现，该项目成功解决了相同的白色闪烁问题。

关键文件：
- `src/main/index.ts` (第 367-389 行)
- `src/preload/index.ts` (第 307 行)
- `src/renderer/hooks/useAppInit.ts` (第 197-204 行)

## 测试验证

启动应用后应该看到：
1. ✅ 没有白色闪烁
2. ✅ 窗口直接以最大化状态显示
3. ✅ 有平滑的淡入效果（约 160ms）
4. ✅ 从头到尾都是黑色背景

如果仍然有闪烁，检查：
- 渲染进程是否正确发送了 `renderer-ready` 通知
- 延迟时间是否足够（可以适当增加到 150ms）
- HTML 内联样式是否正确设置
- 是否有其他 CSS 覆盖了背景色

## 总结

Electron 窗口启动白色闪烁问题的根本原因是窗口显示和内容渲染之间的时间差。通过让渲染进程主动通知准备就绪，结合透明窗口和淡入动画，可以完全消除白色闪烁，提供优雅的启动体验。

这个方案的核心是**精确的时机控制**和**多层防护机制**，确保用户从头到尾看到的都是黑色背景和平滑的过渡效果。
