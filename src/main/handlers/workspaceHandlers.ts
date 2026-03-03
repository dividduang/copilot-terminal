import { ipcMain } from 'electron';
import { HandlerContext } from './HandlerContext';
import { Window } from '../../renderer/types/window';

/**
 * 注册工作区管理相关的 IPC handlers
 */
export function registerWorkspaceHandlers(ctx: HandlerContext) {
  const { workspaceManager, setCurrentWorkspace } = ctx;

  // 保存工作区
  ipcMain.handle('save-workspace', async (_event, windows: Window[]) => {
    try {
      if (!workspaceManager) {
        throw new Error('WorkspaceManager not initialized');
      }

      const workspace = await workspaceManager.loadWorkspace();
      workspace.windows = windows;
      await workspaceManager.saveWorkspace(workspace);

      // 更新缓存的工作区状态
      setCurrentWorkspace(workspace);

      return { success: true };
    } catch (error) {
      console.error('Failed to save workspace:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 加载工作区
  ipcMain.handle('load-workspace', async () => {
    try {
      if (!workspaceManager) {
        throw new Error('WorkspaceManager not initialized');
      }

      const workspace = await workspaceManager.loadWorkspace();
      setCurrentWorkspace(workspace);
      return { success: true, data: workspace };
    } catch (error) {
      console.error('Failed to load workspace:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 从备份恢复工作区
  ipcMain.handle('recover-from-backup', async () => {
    try {
      if (!workspaceManager) {
        throw new Error('WorkspaceManager not initialized');
      }

      // 尝试从备份恢复
      const workspace = await workspaceManager.loadWorkspace();
      setCurrentWorkspace(workspace);

      return { success: true, data: workspace };
    } catch (error) {
      console.error('Failed to recover from backup:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
