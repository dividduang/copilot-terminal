import { BrowserWindow } from 'electron';
import { IStatusDetector } from './StatusDetector';
import { WindowStatus } from '../../shared/types/window';
import { GitDetector } from './GitDetector';

interface TrackedPane {
  windowId: string;
  paneId: string;
  pid: number;
  cwd: string; // 工作目录
  isActive: boolean;
  lastStatus: WindowStatus;
  lastCheckTime: number;
  lastGitCheckTime: number; // 上次 git 检测时间
  lastGitBranch?: string; // 上次检测到的 git 分支
  failureCount?: number; // 连续失败次数
}

/**
 * StatusPoller - 窗格状态轮询服务
 *
 * 管理所有窗格的状态轮询，活跃窗格每 1s 检测，非活跃窗格每 5s 检测。
 * 状态变化时通过 IPC 推送 pane-status-changed 事件到渲染进程。
 * 同时检测 git 分支变化（每 3s 检测一次）。
 */
export class StatusPoller {
  private trackedPanes = new Map<string, TrackedPane>(); // key: paneId
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private statusDetector: IStatusDetector;
  private gitDetector: GitDetector;
  private mainWindow: BrowserWindow;

  constructor(statusDetector: IStatusDetector, mainWindow: BrowserWindow) {
    this.statusDetector = statusDetector;
    this.gitDetector = new GitDetector();
    this.mainWindow = mainWindow;
  }

  /**
   * 启动轮询（每 1s 执行一次轮询逻辑）
   */
  startPolling(): void {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(() => {
      this.poll();
    }, 1000);
    this.pollingInterval.unref(); // 不阻止进程退出
  }

  /**
   * 停止轮询
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * 添加窗格到轮询列表
   */
  addPane(windowId: string, paneId: string, pid: number, cwd?: string): void {
    const now = Date.now();
    this.trackedPanes.set(paneId, {
      windowId,
      paneId,
      pid,
      cwd: cwd || '',
      isActive: false,
      lastStatus: WindowStatus.Restoring,
      lastCheckTime: now,
      lastGitCheckTime: now,
    });
  }

  /**
   * 从轮询列表移除窗格
   */
  removePane(paneId: string): void {
    this.trackedPanes.delete(paneId);
  }

  /**
   * 移除窗口的所有窗格
   */
  removeWindow(windowId: string): void {
    for (const [paneId, tracked] of this.trackedPanes.entries()) {
      if (tracked.windowId === windowId) {
        this.trackedPanes.delete(paneId);
      }
    }
  }

  /**
   * 标记活跃窗格（同时将其他窗格设为非活跃）
   */
  setActivePane(paneId: string): void {
    for (const tracked of this.trackedPanes.values()) {
      tracked.isActive = false;
    }
    const tracked = this.trackedPanes.get(paneId);
    if (tracked) {
      tracked.isActive = true;
    }
  }

  /**
   * 获取当前跟踪的窗格数量（用于测试）
   */
  getTrackedPaneCount(): number {
    return this.trackedPanes.size;
  }

  /**
   * 兼容旧接口：添加窗口（实际上是添加窗格）
   * @deprecated 使用 addPane 代替
   */
  addWindow(windowId: string, pid: number, paneId?: string, cwd?: string): void {
    const actualPaneId = paneId || windowId; // 如果没有 paneId，使用 windowId 作为 paneId
    this.addPane(windowId, actualPaneId, pid, cwd);
  }

  /**
   * 兼容旧接口：设置活跃窗口
   * @deprecated 使用 setActivePane 代替
   */
  setActiveWindow(windowId: string): void {
    // 将该窗口的第一个窗格设为活跃
    for (const tracked of this.trackedPanes.values()) {
      if (tracked.windowId === windowId) {
        this.setActivePane(tracked.paneId);
        break;
      }
    }
  }

  /**
   * 兼容旧接口：获取跟踪的窗口数量
   * @deprecated 使用 getTrackedPaneCount 代替
   */
  getTrackedWindowCount(): number {
    return this.getTrackedPaneCount();
  }

  /**
   * 是否正在轮询（用于测试）
   */
  isPolling(): boolean {
    return this.pollingInterval !== null;
  }

  /**
   * 执行一次轮询逻辑
   */
  private poll(): void {
    const now = Date.now();

    for (const [paneId, tracked] of this.trackedPanes.entries()) {
      // 活跃窗格每 1s 检测，非活跃窗格每 5s 检测
      const interval = tracked.isActive ? 1000 : 5000;

      if (now - tracked.lastCheckTime < interval) {
        continue;
      }

      tracked.lastCheckTime = now;

      this.statusDetector.detectStatus(tracked.pid).then((newStatus) => {
        if (newStatus !== tracked.lastStatus) {
          tracked.lastStatus = newStatus;
          this.notifyStatusChange(tracked.windowId, paneId, newStatus);
        }
        // 重置失败计数
        tracked.failureCount = 0;
      }).catch((error) => {
        // 检测失败时记录错误，下次轮询重试
        if (process.env.NODE_ENV === 'development') {
          console.error(`[StatusPoller] Failed to detect status for pid ${tracked.pid}:`, error);
        }
        // 如果连续失败超过 3 次，标记为 Error
        tracked.failureCount = (tracked.failureCount || 0) + 1;
        if (tracked.failureCount >= 3) {
          console.warn(`[StatusPoller] Process ${tracked.pid} failed status detection 3 times, marking as Error`);
          tracked.lastStatus = WindowStatus.Error;
          this.notifyStatusChange(tracked.windowId, paneId, WindowStatus.Error);
        }
      });

      // Git 分支检测（每 3s 检测一次）
      if (tracked.cwd && now - tracked.lastGitCheckTime >= 3000) {
        tracked.lastGitCheckTime = now;

        try {
          const gitBranch = this.gitDetector.detectBranch(tracked.cwd);

          // 只有当分支发生变化时才通知
          if (gitBranch !== tracked.lastGitBranch) {
            tracked.lastGitBranch = gitBranch;
            this.notifyGitBranchChange(tracked.windowId, gitBranch);
          }
        } catch (error) {
          // Git 检测失败不影响主流程，静默忽略
          if (process.env.NODE_ENV === 'development') {
            console.error(`[StatusPoller] Failed to detect git branch for ${tracked.cwd}:`, error);
          }
        }
      }
    }
  }

  /**
   * 通过 IPC 推送状态变化事件到渲染进程
   */
  private notifyStatusChange(windowId: string, paneId: string, status: WindowStatus): void {
    if (this.mainWindow.isDestroyed()) return;

    // 发送 pane-status-changed 事件，每个窗格独立更新状态
    this.mainWindow.webContents.send('pane-status-changed', {
      windowId,
      paneId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 通过 IPC 推送 git 分支变化事件到渲染进程
   */
  private notifyGitBranchChange(windowId: string, gitBranch: string | undefined): void {
    if (this.mainWindow.isDestroyed()) return;

    // 发送 window-git-branch-changed 事件
    this.mainWindow.webContents.send('window-git-branch-changed', {
      windowId,
      gitBranch,
      timestamp: new Date().toISOString(),
    });
  }
}
