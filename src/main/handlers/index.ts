import { HandlerContext } from './HandlerContext';
import { registerWindowHandlers } from './windowHandlers';
import { registerPaneHandlers } from './paneHandlers';
import { registerPtyHandlers } from './ptyHandlers';
import { registerWorkspaceHandlers } from './workspaceHandlers';
import { registerViewHandlers } from './viewHandlers';
import { registerFileHandlers } from './fileHandlers';
import { registerProcessHandlers } from './processHandlers';
import { registerMiscHandlers } from './miscHandlers';
import { registerSettingsHandlers } from './settingsHandlers';
import { registerStatusLineHandlers } from './statusLineHandlers';
import { registerGroupHandlers } from './groupHandlers';

/**
 * 统一错误边界包装器
 * 包装所有 IPC handlers 以提供统一的错误处理和日志记录
 */
function wrapHandler<T extends any[]>(
  handlerName: string,
  handler: (...args: T) => Promise<any>
): (...args: T) => Promise<any> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error(`[IPC Handler] ${handlerName} Error:`, error);
      // 返回标准错误响应格式
      return {
        success: false as const,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };
}

/**
 * 注册所有 IPC handlers
 *
 * 将 IPC handlers 按功能分类到不同的模块中，提高代码可维护性
 */
export function registerAllHandlers(ctx: HandlerContext) {
  // 窗口管理 (create-window, start-window, close-window, delete-window)
  registerWindowHandlers(ctx);

  // 窗格管理 (split-pane, close-pane)
  registerPaneHandlers(ctx);

  // PTY 通信 (pty-write, pty-resize, get-pty-history)
  registerPtyHandlers(ctx);

  // 工作区管理 (save-workspace, load-workspace, recover-from-backup)
  registerWorkspaceHandlers(ctx);

  // 视图切换 (switch-to-terminal-view, switch-to-unified-view)
  registerViewHandlers(ctx);

  // 文件系统 (validate-path, select-directory, open-folder)
  registerFileHandlers(ctx);

  // 进程管理 (create-terminal, kill-terminal, get-terminal-status, list-terminals)
  registerProcessHandlers(ctx);

  // 设置管理 (get-settings, update-settings, scan-ides, etc.)
  registerSettingsHandlers(ctx);

  // StatusLine 管理 (statusline-configure, statusline-remove, etc.)
  registerStatusLineHandlers(ctx);

  // 窗口组管理 (create-group, delete-group, archive-group, etc.)
  registerGroupHandlers(ctx);

  // 其他 (ping)
  registerMiscHandlers(ctx);
}

// 导出 wrapHandler 供其他模块使用（如果需要）
export { wrapHandler };
