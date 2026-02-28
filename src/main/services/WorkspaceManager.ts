import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import { Workspace, Settings } from '../types/workspace';

/**
 * WorkspaceManager 接口
 * 负责工作区配置的保存和加载
 */
export interface IWorkspaceManager {
  saveWorkspace(workspace: Workspace): Promise<void>;
  loadWorkspace(): Promise<Workspace>;
  backupWorkspace(): Promise<void>;
  recoverFromCrash(): Promise<void>;
}

/**
 * WorkspaceManager 实现
 *
 * 功能：
 * - 保存工作区配置到本地 JSON 文件
 * - 加载工作区配置
 * - 原子写入机制（临时文件 + 重命名）
 * - 自动备份（保留最近 3 个版本）
 * - 崩溃恢复（检查临时文件）
 * - 数据校验（JSON 格式和版本）
 */
export class WorkspaceManagerImpl implements IWorkspaceManager {
  private workspacePath: string;
  private tempPath: string;
  private backupBasePath: string;

  constructor() {
    // 获取用户数据目录
    // Windows: %APPDATA%/ausome-terminal
    // macOS: ~/Library/Application Support/ausome-terminal
    const userDataPath = app.getPath('userData');
    this.workspacePath = path.join(userDataPath, 'workspace.json');
    this.tempPath = `${this.workspacePath}.tmp`;
    this.backupBasePath = `${this.workspacePath}.backup`;
  }

  /**
   * 保存工作区配置
   * 使用原子写入机制确保数据完整性
   */
  async saveWorkspace(workspace: Workspace): Promise<void> {
    try {
      // 创建副本并添加时间戳（避免修改输入参数）
      const workspaceToSave = {
        ...workspace,
        lastSavedAt: new Date().toISOString(),
      };

      // 确保目录存在
      await fs.ensureDir(path.dirname(this.workspacePath));

      // 写入临时文件
      await fs.writeJson(this.tempPath, workspaceToSave, { spaces: 2 });

      // 原子重命名（如果目标文件存在，会被覆盖）
      await fs.rename(this.tempPath, this.workspacePath);

      // 创建备份
      await this.backupWorkspace();
    } catch (error) {
      // 清理临时文件
      await fs.remove(this.tempPath).catch(() => {});
      throw new Error(`Failed to save workspace: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 加载工作区配置
   * 如果文件不存在或损坏，尝试从备份恢复
   */
  async loadWorkspace(): Promise<Workspace> {
    try {
      // 检查工作区文件是否存在
      if (await fs.pathExists(this.workspacePath)) {
        const workspace = await fs.readJson(this.workspacePath);

        // 校验数据格式
        if (this.validateWorkspace(workspace)) {
          return workspace;
        }

        // 校验失败，尝试从备份恢复
        console.warn('Workspace validation failed, attempting to restore from backup');
        return await this.restoreFromBackup();
      }

      // 文件不存在，返回默认工作区
      return this.getDefaultWorkspace();
    } catch (error) {
      console.error('Failed to load workspace:', error);

      // 尝试从备份恢复
      try {
        return await this.restoreFromBackup();
      } catch (backupError) {
        console.error('Failed to restore from backup:', backupError);
        return this.getDefaultWorkspace();
      }
    }
  }

  /**
   * 备份工作区配置
   * 保留最近 3 个版本
   */
  async backupWorkspace(): Promise<void> {
    try {
      // 检查主文件是否存在
      if (!(await fs.pathExists(this.workspacePath))) {
        return;
      }

      // 删除最旧的备份（backup.3）
      const backup3 = `${this.backupBasePath}.3`;
      if (await fs.pathExists(backup3)) {
        await fs.remove(backup3);
      }

      // 轮转备份文件：backup.2 -> backup.3, backup.1 -> backup.2
      for (let i = 2; i >= 1; i--) {
        const oldPath = `${this.backupBasePath}.${i}`;
        const newPath = `${this.backupBasePath}.${i + 1}`;
        if (await fs.pathExists(oldPath)) {
          await fs.rename(oldPath, newPath);
        }
      }

      // 创建新备份（backup.1）
      await fs.copy(this.workspacePath, `${this.backupBasePath}.1`);
    } catch (error) {
      console.error('Failed to backup workspace:', error);
      // 备份失败不应该阻止主流程
    }
  }

  /**
   * 崩溃恢复
   * 启动时检查临时文件，恢复未完成的写入
   */
  async recoverFromCrash(): Promise<void> {
    try {
      // 检查临时文件是否存在
      if (await fs.pathExists(this.tempPath)) {
        console.log('Detected incomplete save operation, attempting recovery');

        try {
          // 尝试读取临时文件并验证
          const workspace = await fs.readJson(this.tempPath);

          if (this.validateWorkspace(workspace)) {
            // 临时文件有效，恢复到主文件
            await fs.rename(this.tempPath, this.workspacePath);
            console.log('Successfully recovered workspace from temporary file');
          } else {
            // 临时文件无效，删除它
            await fs.remove(this.tempPath);
            console.warn('Temporary file is invalid, removed');
          }
        } catch (error) {
          // 临时文件损坏，尝试从备份恢复
          console.error('Temporary file is corrupted, attempting backup recovery:', error);
          await fs.remove(this.tempPath);

          // 尝试从备份恢复
          const backup1 = `${this.backupBasePath}.1`;
          if (await fs.pathExists(backup1)) {
            await fs.copy(backup1, this.workspacePath);
            console.log('Recovered workspace from backup.1');
          }
        }
      }
    } catch (error) {
      console.error('Failed to recover from crash:', error);
      // 恢复失败不应该阻止应用启动
    }
  }

  /**
   * 从备份恢复工作区
   */
  private async restoreFromBackup(): Promise<Workspace> {
    // 尝试从 backup.1, backup.2, backup.3 依次恢复
    for (let i = 1; i <= 3; i++) {
      const backupPath = `${this.backupBasePath}.${i}`;

      if (await fs.pathExists(backupPath)) {
        try {
          const workspace = await fs.readJson(backupPath);

          if (this.validateWorkspace(workspace)) {
            // 恢复到主文件
            await fs.copy(backupPath, this.workspacePath);
            console.log(`Restored workspace from backup.${i}`);
            return workspace;
          }
        } catch (error) {
          console.error(`Failed to restore from backup.${i}:`, error);
        }
      }
    }

    // 所有备份都失败，返回默认工作区
    throw new Error('All backup restoration attempts failed');
  }

  /**
   * 校验工作区数据格式
   */
  private validateWorkspace(workspace: any): workspace is Workspace {
    if (!workspace || typeof workspace !== 'object') {
      return false;
    }

    // 检查必需字段
    if (typeof workspace.version !== 'string') {
      return false;
    }

    if (!Array.isArray(workspace.windows)) {
      return false;
    }

    // 验证每个窗口对象的基本结构
    for (const window of workspace.windows) {
      if (!window || typeof window !== 'object') {
        return false;
      }
      if (typeof window.id !== 'string' ||
          typeof window.name !== 'string' ||
          typeof window.workingDirectory !== 'string' ||
          typeof window.command !== 'string' ||
          typeof window.status !== 'string' ||
          (window.pid !== null && typeof window.pid !== 'number') ||
          typeof window.createdAt !== 'string' ||
          typeof window.lastActiveAt !== 'string') {
        return false;
      }
    }

    if (!workspace.settings || typeof workspace.settings !== 'object') {
      return false;
    }

    // 检查 settings 字段
    const settings = workspace.settings;
    if (
      typeof settings.notificationsEnabled !== 'boolean' ||
      (settings.theme !== 'dark' && settings.theme !== 'light') ||
      typeof settings.autoSave !== 'boolean' ||
      typeof settings.autoSaveInterval !== 'number'
    ) {
      return false;
    }

    // 版本检查（当前只支持 1.0）
    if (workspace.version !== '1.0') {
      console.warn(`Unsupported workspace version: ${workspace.version}`);
      return false;
    }

    return true;
  }

  /**
   * 获取默认工作区配置
   */
  private getDefaultWorkspace(): Workspace {
    return {
      version: '1.0',
      windows: [],
      settings: {
        notificationsEnabled: true,
        theme: 'dark',
        autoSave: true,
        autoSaveInterval: 5,
      },
      lastSavedAt: '',
    };
  }
}
