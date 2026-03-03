import { ipcMain } from 'electron';
import { HandlerContext } from './HandlerContext';
import { Window } from '../../renderer/types/window';
import { successResponse, errorResponse } from './HandlerResponse';

export function registerWorkspaceHandlers(ctx: HandlerContext) {
  const { workspaceManager, autoSaveManager, setCurrentWorkspace } = ctx;

  // 监听自动保存触发事件
  ipcMain.on('trigger-auto-save', (_event, windows: Window[]) => {
    console.log(`[WorkspaceHandlers] Received trigger-auto-save event with ${windows?.length || 0} windows`);

    try {
      if (!autoSaveManager) {
        console.warn('[WorkspaceHandlers] AutoSaveManager not initialized');
        return;
      }

      if (!ctx.currentWorkspace) {
        console.warn('[WorkspaceHandlers] currentWorkspace is null');
        return;
      }

      // 更新当前工作区的窗口列表
      ctx.currentWorkspace.windows = windows;
      console.log(`[WorkspaceHandlers] Updated currentWorkspace with ${windows.length} windows`);

      // 打印归档窗口信息
      const archivedCount = windows.filter(w => w.archived).length;
      console.log(`[WorkspaceHandlers] Archived windows: ${archivedCount}`);

      // 触发自动保存（带防抖）
      autoSaveManager.triggerSave();
      console.log('[WorkspaceHandlers] Auto-save triggered');
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
