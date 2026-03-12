import { ipcMain } from 'electron';
import { HandlerContext } from './HandlerContext';
import { TerminalConfig } from '../types/process';
import { successResponse, errorResponse } from './HandlerResponse';

/**
 * 注册窗格管理相关的 IPC handlers
 */
export function registerPaneHandlers(ctx: HandlerContext) {
  const {
    mainWindow,
    processManager,
    statusPoller,
    ptySubscriptionManager,
  } = ctx;

  // 拆分窗格（创建新的 PTY 进程）
  ipcMain.handle('split-pane', async (_event, config: TerminalConfig) => {
    const t0 = Date.now();
    console.log(`[paneHandlers] split-pane IPC received windowId=${config.windowId} paneId=${config.paneId}`);
    try {
      if (!processManager) {
        throw new Error('ProcessManager not initialized');
      }
      const handle = await processManager.spawnTerminal(config);
      console.log(`[paneHandlers] spawnTerminal done at +${Date.now() - t0}ms pid=${handle.pid}`);

      if (statusPoller && config.windowId && config.paneId) {
        statusPoller.addPane(config.windowId, config.paneId, handle.pid);
      }

      // 订阅 PTY 数据
      const t1 = Date.now();
      let dataCount = 0;
      const unsubscribe = processManager.subscribePtyData(handle.pid, (data: string) => {
        dataCount++;
        const elapsed = Date.now() - t0;
        const hex = Buffer.from(data).toString('hex').slice(0, 80);
        const printable = data.replace(/[\x00-\x1f\x7f-\xff]/g, '.').slice(0, 40);
        console.log(`[paneHandlers] PTY data #${dataCount} pid=${handle.pid} at +${elapsed}ms len=${data.length} hex=${hex} text="${printable}"`);
        // 使用 setImmediate 让 IPC 发送完全异步化，避免阻塞 PTY 数据流
        if (mainWindow && !mainWindow.isDestroyed()) {
          setImmediate(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('pty-data', {
                windowId: config.windowId,
                paneId: config.paneId,
                data
              });
            }
          });
        }
      });
      console.log(`[paneHandlers] subscribePtyData done at +${Date.now() - t0}ms (subscribe took ${Date.now() - t1}ms)`);

      // 使用 PtySubscriptionManager 管理订阅
      if (ptySubscriptionManager && config.paneId) {
        ptySubscriptionManager.add(config.paneId, unsubscribe);
      }

      console.log(`[paneHandlers] split-pane handler total +${Date.now() - t0}ms`);
      return successResponse({ pid: handle.pid });
    } catch (error) {
      console.error(`[paneHandlers] split-pane error at +${Date.now() - t0}ms:`, error);
      return errorResponse(error);
    }
  });

  // 关闭窗格（终止 PTY 进程）
  ipcMain.handle('close-pane', async (_event, { windowId, paneId }: { windowId: string; paneId: string }) => {
    try {
      if (!processManager) {
        throw new Error('ProcessManager not initialized');
      }

      // 清理 PTY 订阅
      if (ptySubscriptionManager) {
        ptySubscriptionManager.remove(paneId);
      }

      statusPoller?.removePane(paneId);

      const processes = processManager.listProcesses();
      const found = processes.find(p => p.windowId === windowId && p.paneId === paneId);
      if (found) {
        await processManager.killProcess(found.pid);
      }

      return successResponse();
    } catch (error) {
      return errorResponse(error);
    }
  });
}
