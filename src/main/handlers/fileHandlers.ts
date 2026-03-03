import { ipcMain, dialog } from 'electron';
import { HandlerContext } from './HandlerContext';
import { PathValidator } from '../utils/pathValidator';

/**
 * 注册文件系统相关的 IPC handlers
 */
export function registerFileHandlers(ctx: HandlerContext) {
  const { mainWindow } = ctx;

  // 验证路径（包含权限检查和安全验证）
  ipcMain.handle('validate-path', async (_event, pathToValidate: string) => {
    const result = PathValidator.validate(pathToValidate);

    if (process.env.NODE_ENV === 'development' && !result.valid) {
      console.log(`[PathValidator] Path validation failed: ${pathToValidate}, reason: ${result.reason}`);
    }

    return result.valid;
  });

  // 选择目录
  ipcMain.handle('select-directory', async () => {
    try {
      if (!mainWindow) {
        throw new Error('Main window not available');
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      // 不记录敏感路径信息到控制台
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to select directory:', error);
      }
      return null;
    }
  });

  // 打开文件夹
  ipcMain.handle('open-folder', async (_event, { path }: { path: string }) => {
    try {
      const { shell } = require('electron');
      await shell.openPath(path);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to open folder:', error);
      }
      throw error;
    }
  });
}
