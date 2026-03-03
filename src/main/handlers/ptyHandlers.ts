import { ipcMain } from 'electron';
import { HandlerContext } from './HandlerContext';

/**
 * 注册 PTY 通信相关的 IPC handlers
 */
export function registerPtyHandlers(ctx: HandlerContext) {
  const { processManager, ptyOutputCache } = ctx;

  // PTY 数据写入（用户输入 → PTY 进程）
  ipcMain.handle('pty-write', async (_event, { windowId, paneId, data }: { windowId: string; paneId?: string; data: string }) => {
    try {
      if (!processManager) {
        throw new Error('ProcessManager not initialized');
      }
      const processes = processManager.listProcesses();
      const found = processes.find(p =>
        p.windowId === windowId && (paneId ? p.paneId === paneId : true)
      );
      if (found) {
        processManager.writeToPty(found.pid, data);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to write to PTY:', error);
      }
    }
  });

  // PTY resize
  ipcMain.handle('pty-resize', async (_event, { windowId, paneId, cols, rows }: { windowId: string; paneId?: string; cols: number; rows: number }) => {
    try {
      if (!processManager) {
        throw new Error('ProcessManager not initialized');
      }
      const processes = processManager.listProcesses();
      const found = processes.find(p =>
        p.windowId === windowId && (paneId ? p.paneId === paneId : true)
      );
      if (found) {
        processManager.resizePty(found.pid, cols, rows);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to resize PTY:', error);
      }
    }
  });

  // 获取 PTY 历史输出
  ipcMain.handle('get-pty-history', async (_event, { paneId }: { paneId: string }) => {
    try {
      const cache = ptyOutputCache.get(paneId);
      return cache || [];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to get PTY history:', error);
      }
      return [];
    }
  });
}
