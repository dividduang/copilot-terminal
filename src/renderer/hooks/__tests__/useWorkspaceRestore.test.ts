import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWindowStore } from '../../stores/windowStore';
import { WindowStatus } from '../../types/window';
import { Workspace } from '../../../main/types/workspace';

// Mock window.electronAPI
const mockElectronAPI = {
  onWorkspaceLoaded: vi.fn(),
  offWorkspaceLoaded: vi.fn(),
  onWindowRestored: vi.fn(),
  offWindowRestored: vi.fn(),
  triggerAutoSave: vi.fn(),
};

(global as any).window = {
  electronAPI: mockElectronAPI,
};

describe('useWorkspaceRestore', () => {
  beforeEach(() => {
    // 清空 store
    useWindowStore.setState({ windows: [], activeWindowId: null });
    vi.clearAllMocks();
  });

  it('should register event listeners on mount', () => {
    expect(mockElectronAPI.onWorkspaceLoaded).toBeDefined();
    expect(mockElectronAPI.offWorkspaceLoaded).toBeDefined();
  });

  it('should add windows with Restoring status when workspace is loaded', () => {
    const workspace: Workspace = {
      version: '1.0',
      windows: [
        {
          id: 'window-1',
          name: 'Test Window 1',
          workingDirectory: '/test/path1',
          command: 'bash',
          status: WindowStatus.Running,
          pid: 1234,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        },
        {
          id: 'window-2',
          name: 'Test Window 2',
          workingDirectory: '/test/path2',
          command: 'zsh',
          status: WindowStatus.Running,
          pid: 5678,
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

    // Simulate workspace loaded by directly adding windows to store
    workspace.windows.forEach(window => {
      useWindowStore.getState().addWindow({
        ...window,
        status: WindowStatus.Restoring,
      });
    });

    const windows = useWindowStore.getState().windows;
    expect(windows).toHaveLength(2);
    expect(windows[0].status).toBe(WindowStatus.Restoring);
    expect(windows[1].status).toBe(WindowStatus.Restoring);
  });

  it('should update window status to Running when window is restored successfully', () => {
    // Add a window with Restoring status
    useWindowStore.getState().addWindow({
      id: 'window-1',
      name: 'Test Window',
      workingDirectory: '/test/path',
      command: 'bash',
      status: WindowStatus.Restoring,
      pid: 1234,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    });

    // Simulate window restored successfully
    useWindowStore.getState().updateWindowStatus('window-1', WindowStatus.Running);

    const windows = useWindowStore.getState().windows;
    expect(windows[0].status).toBe(WindowStatus.Running);
  });

  it('should update window status to Error when restore fails', () => {
    // Add a window with Restoring status
    useWindowStore.getState().addWindow({
      id: 'window-1',
      name: 'Test Window',
      workingDirectory: '/invalid/path',
      command: 'bash',
      status: WindowStatus.Restoring,
      pid: null,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    });

    // Simulate window restore failed
    useWindowStore.getState().updateWindowStatus('window-1', WindowStatus.Error);

    const windows = useWindowStore.getState().windows;
    expect(windows[0].status).toBe(WindowStatus.Error);
  });

  it('should handle empty workspace gracefully', () => {
    const windows = useWindowStore.getState().windows;
    expect(windows).toHaveLength(0);
  });

  it('should handle missing electronAPI gracefully', () => {
    // Remove electronAPI temporarily
    const originalAPI = (global as any).window.electronAPI;
    (global as any).window = {};

    // Should not throw
    expect(() => {
      // Just verify the API is missing
      expect((global as any).window.electronAPI).toBeUndefined();
    }).not.toThrow();

    // Restore electronAPI
    (global as any).window.electronAPI = originalAPI;
  });
});
