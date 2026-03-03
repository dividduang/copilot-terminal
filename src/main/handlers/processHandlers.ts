import { ipcMain } from 'electron';
import { HandlerContext } from './HandlerContext';
import { TerminalConfig } from '../types/process';

/**
 * 注册进程管理相关的 IPC handlers
 */
export function registerProcessHandlers(ctx: HandlerContext) {
  const { processManager } = ctx;

  // 创建终端进程
  ipcMain.handle('create-terminal', async (_event, config: TerminalConfig) => {
    try {
      if (!processManager) {
        throw new Error('ProcessManager not initialized');
      }
      const handle = await processManager.spawnTerminal(config);
      return { success: true, data: handle };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 终止终端进程
  ipcMain.handle('kill-terminal', async (_event, pid: number) => {
    try {
      if (!processManager) {
        throw new Error('ProcessManager not initialized');
      }
      await processManager.killProcess(pid);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 获取终端状态
  ipcMain.handle('get-terminal-status', async (_event, pid: number) => {
    try {
      if (!processManager) {
        throw new Error('ProcessManager not initialized');
      }
      const status = processManager.getProcessStatus(pid);
      return { success: true, data: status };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 列出所有终端进程
  ipcMain.handle('list-terminals', async () => {
    try {
      if (!processManager) {
        throw new Error('ProcessManager not initialized');
      }
      const processes = processManager.listProcesses();
      return { success: true, data: processes };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
