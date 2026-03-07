import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { ProjectConfig } from '../../shared/types/project-config';
import { readProjectConfig } from '../utils/project-config';

/**
 * 项目配置文件监听器
 * 监听 copilot.json 文件变化，自动重新加载配置
 */
class ProjectConfigWatcher {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 开始监听窗口的 copilot.json
   * @param windowId 窗口 ID
   * @param projectPath 项目路径
   * @param onUpdate 更新回调
   */
  startWatching(
    windowId: string,
    projectPath: string,
    onUpdate: (config: ProjectConfig | null) => void
  ): void {
    // 如果已经在监听，先停止
    this.stopWatching(windowId);

    const configPath = path.join(projectPath, 'copilot.json');

    // 检查文件是否存在
    if (!fs.existsSync(configPath)) {
      console.log(`[ProjectConfigWatcher] copilot.json not found for window ${windowId}`);
      return;
    }

    console.log(`[ProjectConfigWatcher] Start watching ${configPath} for window ${windowId}`);

    // 创建防抖的更新函数（500ms）
    const debouncedUpdate = () => {
      // 清除之前的定时器
      const existingTimer = this.debounceTimers.get(windowId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 设置新的定时器
      const timer = setTimeout(async () => {
        try {
          console.log(`[ProjectConfigWatcher] Reloading config for window ${windowId}`);
          const config = await readProjectConfig(projectPath);
          onUpdate(config);
        } catch (error) {
          console.error('[ProjectConfigWatcher] Failed to reload project config:', error);
          onUpdate(null);
        } finally {
          this.debounceTimers.delete(windowId);
        }
      }, 500);

      this.debounceTimers.set(windowId, timer);
    };

    // 创建文件监听器
    const watcher = chokidar.watch(configPath, {
      persistent: true,
      ignoreInitial: true, // 忽略初始扫描
      awaitWriteFinish: {
        stabilityThreshold: 200, // 文件稳定 200ms 后才触发
        pollInterval: 100
      }
    });

    watcher
      .on('change', () => {
        console.log(`[ProjectConfigWatcher] copilot.json changed for window ${windowId}`);
        debouncedUpdate();
      })
      .on('add', () => {
        console.log(`[ProjectConfigWatcher] copilot.json created for window ${windowId}`);
        debouncedUpdate();
      })
      .on('unlink', () => {
        console.log(`[ProjectConfigWatcher] copilot.json deleted for window ${windowId}`);
        onUpdate(null);
      })
      .on('error', (error) => {
        console.error(`[ProjectConfigWatcher] Watcher error for window ${windowId}:`, error);
      });

    this.watchers.set(windowId, watcher);
  }

  /**
   * 停止监听指定窗口
   */
  stopWatching(windowId: string): void {
    const watcher = this.watchers.get(windowId);
    if (watcher) {
      console.log(`[ProjectConfigWatcher] Stop watching for window ${windowId}`);
      watcher.close();
      this.watchers.delete(windowId);
    }

    // 清除防抖定时器
    const timer = this.debounceTimers.get(windowId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(windowId);
    }
  }

  /**
   * 停止所有监听
   */
  stopAll(): void {
    console.log('[ProjectConfigWatcher] Stopping all watchers');
    for (const [windowId, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();

    // 清除所有防抖定时器
    for (const [windowId, timer] of this.debounceTimers) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * 获取当前监听的窗口数量
   */
  getWatcherCount(): number {
    return this.watchers.size;
  }
}

// 导出单例
export const projectConfigWatcher = new ProjectConfigWatcher();
