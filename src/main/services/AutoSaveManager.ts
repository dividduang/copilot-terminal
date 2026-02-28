import { IWorkspaceManager } from './WorkspaceManager';
import { Workspace } from '../types/workspace';

/**
 * AutoSaveManager 接口
 * 负责在窗口变化时自动保存工作区配置
 */
export interface IAutoSaveManager {
  startAutoSave(workspaceManager: IWorkspaceManager, getWorkspace: () => Workspace): void;
  stopAutoSave(): void;
  triggerSave(): void;
  saveImmediately(): Promise<void>;
}

/**
 * AutoSaveManager 实现
 *
 * 功能：
 * - 防抖保存：频繁修改时只保存一次（1 秒延迟）
 * - 异步保存：不阻塞主进程
 * - 错误处理：保存失败时记录日志，不影响应用运行
 * - 应用关闭时立即保存
 */
export class AutoSaveManagerImpl implements IAutoSaveManager {
  private saveTimer: NodeJS.Timeout | null = null;
  private workspaceManager: IWorkspaceManager | null = null;
  private getWorkspace: (() => Workspace) | null = null;
  private readonly DEBOUNCE_DELAY = 1000; // 1 秒防抖延迟

  /**
   * 启动自动保存
   * @param workspaceManager WorkspaceManager 实例
   * @param getWorkspace 获取当前工作区状态的函数
   */
  startAutoSave(workspaceManager: IWorkspaceManager, getWorkspace: () => Workspace): void {
    this.workspaceManager = workspaceManager;
    this.getWorkspace = getWorkspace;
    console.log('AutoSaveManager started');
  }

  /**
   * 停止自动保存
   * 清理定时器，避免内存泄漏
   */
  stopAutoSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    console.log('AutoSaveManager stopped');
  }

  /**
   * 触发保存（防抖）
   * 如果已有待处理的保存，清除旧的定时器
   * 设置新的定时器，延迟 1 秒后执行保存
   */
  triggerSave(): void {
    // 清除旧的定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // 设置新的定时器，延迟 1 秒后执行保存
    this.saveTimer = setTimeout(() => {
      this.performSave();
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * 立即保存（用于应用关闭时）
   * 不使用防抖，直接执行保存
   */
  async saveImmediately(): Promise<void> {
    // 清除待处理的定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    // 立即执行保存
    await this.performSave();
  }

  /**
   * 执行保存操作
   * 异步执行，不阻塞主进程
   * 保存失败时记录错误日志，不抛出异常
   */
  private async performSave(): Promise<void> {
    try {
      const workspace = this.getWorkspace?.();
      if (workspace && this.workspaceManager) {
        await this.workspaceManager.saveWorkspace(workspace);
        console.log(`[AutoSave] Workspace saved successfully at ${new Date().toISOString()}`);
      }
    } catch (error) {
      // 保存失败时记录错误日志，不影响应用运行
      console.error('[AutoSave] Failed to save workspace:', error instanceof Error ? error.message : String(error));
    }
  }
}
