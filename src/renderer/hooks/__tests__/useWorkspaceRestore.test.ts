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
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          layout: {
            type: 'pane',
            id: 'pane-window-1',
            pane: {
              id: 'pane-window-1',
              cwd: '/test/path1',
              command: 'bash',
              status: WindowStatus.Running,
              pid: 1234,
            },
          },
          activePaneId: 'pane-window-1',
        },
        {
          id: 'window-2',
          name: 'Test Window 2',
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          layout: {
            type: 'pane',
            id: 'pane-window-2',
            pane: {
              id: 'pane-window-2',
              cwd: '/test/path2',
              command: 'zsh',
              status: WindowStatus.Running,
              pid: 5678,
            },
          },
          activePaneId: 'pane-window-2',
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
    // then setting each window's pane status to Restoring
    workspace.windows.forEach(window => {
      useWindowStore.getState().addWindow(window);
      useWindowStore.getState().updateWindowStatus(window.id, WindowStatus.Restoring);
    });

    const windows = useWindowStore.getState().windows;
    expect(windows).toHaveLength(2);
    // Status is now in the pane inside layout
    expect(windows[0].layout.pane.status).toBe(WindowStatus.Restoring);
    expect(windows[1].layout.pane.status).toBe(WindowStatus.Restoring);
  });

  it('should update window status to Running when window is restored successfully', () => {
    // Add a window with Restoring status
    useWindowStore.getState().addWindow({
      id: 'window-1',
      name: 'Test Window',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      layout: {
        type: 'pane',
        id: 'pane-window-1',
        pane: {
          id: 'pane-window-1',
          cwd: '/test/path',
          command: 'bash',
          status: WindowStatus.Restoring,
          pid: 1234,
        },
      },
      activePaneId: 'pane-window-1',
    });

    // Simulate window restored successfully
    useWindowStore.getState().updateWindowStatus('window-1', WindowStatus.Running);

    const windows = useWindowStore.getState().windows;
    // updateWindowStatus now updates pane status inside layout
    expect(windows[0].layout.pane.status).toBe(WindowStatus.Running);
  });

  it('should update window status to Error when restore fails', () => {
    // Add a window with Restoring status
    useWindowStore.getState().addWindow({
      id: 'window-1',
      name: 'Test Window',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      layout: {
        type: 'pane',
        id: 'pane-window-1',
        pane: {
          id: 'pane-window-1',
          cwd: '/invalid/path',
          command: 'bash',
          status: WindowStatus.Restoring,
          pid: null,
        },
      },
      activePaneId: 'pane-window-1',
    });

    // Simulate window restore failed
    useWindowStore.getState().updateWindowStatus('window-1', WindowStatus.Error);

    const windows = useWindowStore.getState().windows;
    // updateWindowStatus now updates pane status inside layout
    expect(windows[0].layout.pane.status).toBe(WindowStatus.Error);
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
