import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserWindow } from 'electron';
import { WorkspaceRestorerImpl } from '../WorkspaceRestorer';
import { ProcessManager } from '../ProcessManager';
import { Workspace } from '../../types/workspace';
import { WindowStatus } from '../../../shared/types/window';

// Mock Electron
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
}));

// Mock ProcessManager
vi.mock('../ProcessManager');

describe('WorkspaceRestorer', () => {
  let workspaceRestorer: WorkspaceRestorerImpl;
  let mockProcessManager: any;
  let mockMainWindow: any;

  beforeEach(() => {
    // 创建 mock ProcessManager
    mockProcessManager = {
      spawnTerminal: vi.fn(),
      subscribePtyData: vi.fn(),
    } as any;

    // 创建 mock BrowserWindow
    mockMainWindow = {
      webContents: {
        send: vi.fn(),
      },
      isDestroyed: vi.fn().mockReturnValue(false),
    } as any;

    // 创建 WorkspaceRestorer 实例
    workspaceRestorer = new WorkspaceRestorerImpl(mockProcessManager, mockMainWindow);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('restoreWorkspace', () => {
    it('should restore empty workspace without errors', async () => {
      const workspace: Workspace = {
        version: '1.0',
        windows: [],
        settings: {
          notificationsEnabled: true,
          theme: 'dark',
          autoSave: true,
          autoSaveInterval: 5,
        },
        lastSavedAt: new Date().toISOString(),
      };

      const results = await workspaceRestorer.restoreWorkspace(workspace);

      expect(results).toEqual([]);
      expect(mockProcessManager.spawnTerminal).not.toHaveBeenCalled();
    });

    it('should restore single window successfully', async () => {
      const workspace: Workspace = {
        version: '1.0',
        windows: [
          {
            id: 'window-1',
            name: 'Test Window',
            workingDirectory: process.cwd(),
            command: 'bash',
            status: WindowStatus.Running,
            pid: null,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        ],
        settings: {
          notificationsEnabled: true,
          theme: 'dark',
          autoSave: true,
          autoSaveInterval: 5,
        },
        lastSavedAt: new Date().toISOString(),
      };

      mockProcessManager.spawnTerminal.mockResolvedValue({
        pid: 1234,
        pty: {} as any,
      });

      const results = await workspaceRestorer.restoreWorkspace(workspace);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        windowId: 'window-1',
        pid: 1234,
        status: 'restoring',
      });

      expect(mockProcessManager.spawnTerminal).toHaveBeenCalledWith({
        workingDirectory: process.cwd(),
        command: 'bash',
        windowId: 'window-1',
      });

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('window-restored', {
        windowId: 'window-1',
        pid: 1234,
        status: 'restoring',
      });
    });

    it('should restore multiple windows in parallel', async () => {
      const workspace: Workspace = {
        version: '1.0',
        windows: [
          {
            id: 'window-1',
            name: 'Window 1',
            workingDirectory: process.cwd(),
            command: 'bash',
            status: WindowStatus.Running,
            pid: null,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
          {
            id: 'window-2',
            name: 'Window 2',
            workingDirectory: process.cwd(),
            command: 'zsh',
            status: WindowStatus.Running,
            pid: null,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
          {
            id: 'window-3',
            name: 'Window 3',
            workingDirectory: process.cwd(),
            command: 'fish',
            status: WindowStatus.Running,
            pid: null,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        ],
        settings: {
          notificationsEnabled: true,
          theme: 'dark',
          autoSave: true,
          autoSaveInterval: 5,
        },
        lastSavedAt: new Date().toISOString(),
      };

      let callCount = 0;
      mockProcessManager.spawnTerminal.mockImplementation(async () => {
        callCount++;
        return {
          pid: 1000 + callCount,
          pty: {} as any,
        };
      });

      const startTime = Date.now();
      const results = await workspaceRestorer.restoreWorkspace(workspace);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results[0].windowId).toBe('window-1');
      expect(results[1].windowId).toBe('window-2');
      expect(results[2].windowId).toBe('window-3');

      // 验证并行执行（应该很快完成）
      expect(duration).toBeLessThan(100);

      expect(mockProcessManager.spawnTerminal).toHaveBeenCalledTimes(3);
    });

    it('should handle window restore failure gracefully', async () => {
      const workspace: Workspace = {
        version: '1.0',
        windows: [
          {
            id: 'window-1',
            name: 'Good Window',
            workingDirectory: process.cwd(),
            command: 'bash',
            status: WindowStatus.Running,
            pid: null,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
          {
            id: 'window-2',
            name: 'Bad Window',
            workingDirectory: '/invalid/path',
            command: 'bash',
            status: WindowStatus.Running,
            pid: null,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        ],
        settings: {
          notificationsEnabled: true,
          theme: 'dark',
          autoSave: true,
          autoSaveInterval: 5,
        },
        lastSavedAt: new Date().toISOString(),
      };

      mockProcessManager.spawnTerminal
        .mockResolvedValueOnce({ pid: 1234, pty: {} as any });

      const results = await workspaceRestorer.restoreWorkspace(workspace);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        windowId: 'window-1',
        pid: 1234,
        status: 'restoring',
      });
      expect(results[1]).toEqual({
        windowId: 'window-2',
        pid: null,
        status: 'paused',
        error: 'Working directory not found: /invalid/path',
      });

      // 验证暂停窗口也发送了通知
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('window-restored', {
        windowId: 'window-2',
        pid: null,
        status: 'paused',
        error: 'Working directory not found: /invalid/path',
      });
    });

    it('should subscribe to PTY data for restored windows', async () => {
      const workspace: Workspace = {
        version: '1.0',
        windows: [
          {
            id: 'window-1',
            name: 'Test Window',
            workingDirectory: process.cwd(),
            command: 'bash',
            status: WindowStatus.Running,
            pid: null,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        ],
        settings: {
          notificationsEnabled: true,
          theme: 'dark',
          autoSave: true,
          autoSaveInterval: 5,
        },
        lastSavedAt: new Date().toISOString(),
      };

      mockProcessManager.spawnTerminal.mockResolvedValue({
        pid: 1234,
        pty: {} as any,
      });

      await workspaceRestorer.restoreWorkspace(workspace);

      expect(mockProcessManager.subscribePtyData).toHaveBeenCalledWith(
        1234,
        expect.any(Function)
      );
    });

    it('should restore 10+ windows in less than 5 seconds', async () => {
      const windows = Array.from({ length: 15 }, (_, i) => ({
        id: `window-${i}`,
        name: `Window ${i}`,
        workingDirectory: process.cwd(),
        command: 'bash',
        status: WindowStatus.Running,
        pid: null,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }));

      const workspace: Workspace = {
        version: '1.0',
        windows,
        settings: {
          notificationsEnabled: true,
          theme: 'dark',
          autoSave: true,
          autoSaveInterval: 5,
        },
        lastSavedAt: new Date().toISOString(),
      };

      let callCount = 0;
      mockProcessManager.spawnTerminal.mockImplementation(async () => {
        // 模拟进程启动延迟（50ms）
        await new Promise(resolve => setTimeout(resolve, 50));
        callCount++;
        return {
          pid: 1000 + callCount,
          pty: {} as any,
        };
      });

      const startTime = Date.now();
      const results = await workspaceRestorer.restoreWorkspace(workspace);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(15);
      expect(duration).toBeLessThan(5000); // 应该在 5 秒内完成
      expect(duration).toBeLessThan(200); // 由于并行执行，应该接近单个进程的启动时间

      // 验证所有窗口都成功恢复
      const successCount = results.filter(r => r.status === 'restoring').length;
      expect(successCount).toBe(15);
    });

    it('should not send IPC events if window is destroyed', async () => {
      const workspace: Workspace = {
        version: '1.0',
        windows: [
          {
            id: 'window-1',
            name: 'Test Window',
            workingDirectory: process.cwd(),
            command: 'bash',
            status: WindowStatus.Running,
            pid: null,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        ],
        settings: {
          notificationsEnabled: true,
          theme: 'dark',
          autoSave: true,
          autoSaveInterval: 5,
        },
        lastSavedAt: new Date().toISOString(),
      };

      mockProcessManager.spawnTerminal.mockResolvedValue({
        pid: 1234,
        pty: {} as any,
      });

      // 模拟窗口已销毁
      mockMainWindow.isDestroyed.mockReturnValue(true);

      await workspaceRestorer.restoreWorkspace(workspace);

      // 验证不会发送 IPC 事件
      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
});
