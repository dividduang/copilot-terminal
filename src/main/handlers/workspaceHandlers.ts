import { ipcMain } from 'electron';
import { HandlerContext } from './HandlerContext';
import { Window } from '../../renderer/types/window';
import { successResponse, errorResponse } from './HandlerResponse';

export function registerWorkspaceHandlers(ctx: HandlerContext) {
  const { workspaceManager, autoSaveManager, setCurrentWorkspace } = ctx;

  // 监听自动保存触发事件
  ipcMain.on('trigger-auto-save', (_event, windows: Window[]) => {
    try {
      if (!autoSaveManager) {
        console.warn('[WorkspaceHandlers] AutoSaveManager not initialized');
        return;
      }

      // 更新当前工作区的窗口列表
      if (ctx.currentWorkspace) {
        ctx.currentWorkspace.windows = windows;
      }

      // 触发自动保存（带防抖）
      autoSaveManager.triggerSave();
    } catch (error) {
      console.error('[WorkspaceHandlers] Failed to trigger auto-save:', error);
    }
  });

  ipcMain.handle('save-workspace', async (_event, windows: Window[]) => {
    try {
      if (!workspaceManager) throw new Error('WorkspaceManager not initialized');
      const workspace = await workspaceManager.loadWorkspace();
      workspace.windows = windows;
      await workspaceManager.saveWorkspace(workspace);
      setCurrentWorkspace(workspace);
      return successResponse();
    } catch (error) {
      return errorResponse(error);
    }
  });

  ipcMain.handle('load-workspace', async () => {
    try {
      if (!workspaceManager) throw new Error('WorkspaceManager not initialized');
      const workspace = await workspaceManager.loadWorkspace();
      setCurrentWorkspace(workspace);
      return successResponse(workspace);
    } catch (error) {
      return errorResponse(error);
    }
  });

  ipcMain.handle('recover-from-backup', async () => {
    try {
      if (!workspaceManager) throw new Error('WorkspaceManager not initialized');
      const workspace = await workspaceManager.loadWorkspace();
      setCurrentWorkspace(workspace);
      return successResponse(workspace);
    } catch (error) {
      return errorResponse(error);
    }
  });
}
