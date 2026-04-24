import { ipcMain } from 'electron';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { HandlerContext } from './HandlerContext';
import { successResponse, errorResponse } from './HandlerResponse';
import { scanInstalledIDEs, scanSpecificIDE, getSupportedIDENames } from '../utils/ideScanner';
import { IDEConfig } from '../types/workspace';
import { scanAvailableShellPrograms } from '../utils/shell';
import { PathValidator } from '../utils/pathValidator';

export function registerSettingsHandlers(ctx: HandlerContext) {
  const { workspaceManager, getCurrentWorkspace, setCurrentWorkspace } = ctx;

  // 获取设置
  ipcMain.handle('get-settings', async () => {
    try {
      const workspace = getCurrentWorkspace();
      if (!workspace) {
        throw new Error('Workspace not loaded');
      }
      return successResponse(workspace.settings);
    } catch (error) {
      return errorResponse(error);
    }
  });

  // 更新设置
  ipcMain.handle('update-settings', async (_event, settings: any) => {
    try {
      const workspace = getCurrentWorkspace();
      if (!workspace || !workspaceManager) {
        throw new Error('Workspace not loaded');
      }

      const terminalSettings = settings?.terminal
        ? {
            ...workspace.settings.terminal,
            ...settings.terminal,
          }
        : workspace.settings.terminal;

      const tmuxSettings = settings?.tmux
        ? {
            ...workspace.settings.tmux,
            ...settings.tmux,
          }
        : workspace.settings.tmux;

      const updatedWorkspace = {
        ...workspace,
        settings: {
          ...workspace.settings,
          ...settings,
          terminal: terminalSettings,
          tmux: tmuxSettings,
        },
      };

      await workspaceManager.saveWorkspace(updatedWorkspace);
      setCurrentWorkspace(updatedWorkspace);

      return successResponse(updatedWorkspace.settings);
    } catch (error) {
      return errorResponse(error);
    }
  });

  // 扫描已安装的 IDE
  ipcMain.handle('scan-ides', async () => {
    try {
      const installedIDEs = scanInstalledIDEs();
      return successResponse(installedIDEs);
    } catch (error) {
      return errorResponse(error);
    }
  });

  // 扫描特定 IDE
  ipcMain.handle('scan-specific-ide', async (_event, ideName: string) => {
    try {
      const path = scanSpecificIDE(ideName);
      return successResponse(path);
    } catch (error) {
      return errorResponse(error);
    }
  });

  // 获取支持的 IDE 名称列表
  ipcMain.handle('get-supported-ide-names', async () => {
    try {
      const names = getSupportedIDENames();
      return successResponse(names);
    } catch (error) {
      return errorResponse(error);
    }
  });

  ipcMain.handle('get-available-shells', async () => {
    try {
      return successResponse(scanAvailableShellPrograms());
    } catch (error) {
      return errorResponse(error);
    }
  });

  // 更新 IDE 配置
  ipcMain.handle('update-ide-config', async (_event, ideConfig: IDEConfig) => {
    try {
      const workspace = getCurrentWorkspace();
      if (!workspace || !workspaceManager) {
        throw new Error('Workspace not loaded');
      }

      const existingIndex = workspace.settings.ides.findIndex(ide => ide.id === ideConfig.id);

      let updatedIDEs: IDEConfig[];
      if (existingIndex >= 0) {
        // 更新现有 IDE
        updatedIDEs = [...workspace.settings.ides];
        updatedIDEs[existingIndex] = ideConfig;
      } else {
        // 添加新 IDE
        updatedIDEs = [...workspace.settings.ides, ideConfig];
      }

      const updatedWorkspace = {
        ...workspace,
        settings: {
          ...workspace.settings,
          ides: updatedIDEs,
        },
      };

      await workspaceManager.saveWorkspace(updatedWorkspace);
      setCurrentWorkspace(updatedWorkspace);

      return successResponse(updatedIDEs);
    } catch (error) {
      return errorResponse(error);
    }
  });

  // 删除 IDE 配置
  ipcMain.handle('delete-ide-config', async (_event, ideId: string) => {
    try {
      const workspace = getCurrentWorkspace();
      if (!workspace || !workspaceManager) {
        throw new Error('Workspace not loaded');
      }

      const updatedIDEs = workspace.settings.ides.filter(ide => ide.id !== ideId);

      const updatedWorkspace = {
        ...workspace,
        settings: {
          ...workspace.settings,
          ides: updatedIDEs,
        },
      };

      await workspaceManager.saveWorkspace(updatedWorkspace);
      setCurrentWorkspace(updatedWorkspace);

      return successResponse(updatedIDEs);
    } catch (error) {
      return errorResponse(error);
    }
  });

  // 获取IDE图标数据(base64)
  ipcMain.handle('get-ide-icon', async (_event, iconPath: string) => {
    try {
      // 1. 路径验证
      const pathValidation = PathValidator.validate(iconPath);
      if (!pathValidation.valid) {
        throw new Error(`Invalid icon path: ${pathValidation.reason}`);
      }

      // 2. 限制文件扩展名
      const allowedExts = ['.png', '.jpg', '.jpeg', '.ico', '.icns', '.svg'];
      const ext = path.extname(iconPath).toLowerCase();
      if (!allowedExts.includes(ext)) {
        throw new Error('Invalid file type: only images are allowed');
      }

      // 3. 检查文件是否存在
      if (!existsSync(iconPath)) {
        throw new Error(`Icon file not found: ${iconPath}`);
      }

      // 4. 限制文件大小 (1MB)
      const stat = await import('fs').then(m => m.statSync(iconPath));
      if (stat.size > 1024 * 1024) {
        throw new Error('Icon file too large: maximum 1MB allowed');
      }

      const iconData = readFileSync(iconPath);
      const base64Data = iconData.toString('base64');
      const extName = iconPath.split('.').pop()?.toLowerCase();

      // 根据文件扩展名确定MIME类型
      let mimeType = 'image/png';
      if (extName === 'ico') {
        mimeType = 'image/x-icon';
      } else if (extName === 'jpg' || extName === 'jpeg') {
        mimeType = 'image/jpeg';
      } else if (extName === 'svg') {
        mimeType = 'image/svg+xml';
      } else if (extName === 'icns') {
        mimeType = 'image/x-icns';
      }

      return successResponse(`data:${mimeType};base64,${base64Data}`);
    } catch (error) {
      return errorResponse(error);
    }
  });
}
