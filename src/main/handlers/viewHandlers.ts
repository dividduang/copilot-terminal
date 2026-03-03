import { ipcMain } from 'electron';
import { HandlerContext } from './HandlerContext';

/**
 * 注册视图切换相关的 IPC handlers
 */
export function registerViewHandlers(ctx: HandlerContext) {
  const { viewSwitcher } = ctx;

  // 视图切换：切换到终端视图
  ipcMain.handle('switch-to-terminal-view', (_event, { windowId }: { windowId: string }) => {
    if (!viewSwitcher) {
      throw new Error('ViewSwitcher not initialized');
    }
    viewSwitcher.switchToTerminalView(windowId);
  });

  // 视图切换：切换到统一视图
  ipcMain.handle('switch-to-unified-view', () => {
    if (!viewSwitcher) {
      throw new Error('ViewSwitcher not initialized');
    }
    viewSwitcher.switchToUnifiedView();
  });
}
