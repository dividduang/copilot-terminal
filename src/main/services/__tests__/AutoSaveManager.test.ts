import { AutoSaveManagerImpl, IAutoSaveManager } from '../AutoSaveManager';
import { IWorkspaceManager } from '../WorkspaceManager';
import { Workspace } from '../../types/workspace';

// Mock WorkspaceManager
class MockWorkspaceManager implements IWorkspaceManager {
  saveWorkspaceCalled = 0;
  lastSavedWorkspace: Workspace | null = null;
  shouldThrowError = false;

  async saveWorkspace(workspace: Workspace): Promise<void> {
    this.saveWorkspaceCalled++;
    this.lastSavedWorkspace = workspace;
    if (this.shouldThrowError) {
      throw new Error('Mock save error');
    }
  }

  async loadWorkspace(): Promise<Workspace> {
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

  async backupWorkspace(): Promise<void> {}
  async recoverFromCrash(): Promise<void> {}
}

// Mock workspace getter
function createMockWorkspace(): Workspace {
  return {
    version: '1.0',
    windows: [
      {
        id: 'test-window-1',
        name: 'Test Window',
        workingDirectory: '/test/path',
        command: 'bash',
        status: 'running' as any,
        pid: 1234,
        createdAt: '2026-02-28T10:00:00Z',
        lastActiveAt: '2026-02-28T10:00:00Z',
        layout: {
          type: 'pane',
          id: 'pane-1',
          pane: {
            id: 'pane-1',
            cwd: '/test/path',
            command: 'bash',
            pid: 1234,
          },
        },
      },
    ],
    settings: {
      notificationsEnabled: true,
      theme: 'dark',
      autoSave: true,
      autoSaveInterval: 5,
    },
    lastSavedAt: '',
  };
}

describe('AutoSaveManager', () => {
  let autoSaveManager: IAutoSaveManager;
  let mockWorkspaceManager: MockWorkspaceManager;
  let mockWorkspace: Workspace;

  beforeEach(() => {
    autoSaveManager = new AutoSaveManagerImpl();
    mockWorkspaceManager = new MockWorkspaceManager();
    mockWorkspace = createMockWorkspace();
  });

  afterEach(() => {
    autoSaveManager.stopAutoSave();
  });

  describe('startAutoSave', () => {
    it('should initialize auto-save with workspace manager and getter', () => {
      expect(() => {
        autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);
      }).not.toThrow();
    });
  });

  describe('stopAutoSave', () => {
    it('should clear pending timers', async () => {
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);
      autoSaveManager.triggerSave();
      autoSaveManager.stopAutoSave();

      // Wait to ensure timer was cleared
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(0);
    });
  });

  describe('triggerSave - debounce mechanism', () => {
    it('should debounce multiple rapid saves into one', async () => {
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      // Trigger multiple saves rapidly
      autoSaveManager.triggerSave();
      autoSaveManager.triggerSave();
      autoSaveManager.triggerSave();

      // Wait for debounce delay (1 second)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should only save once
      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(1);
      expect(mockWorkspaceManager.lastSavedWorkspace).toEqual(mockWorkspace);
    });

    it('should reset timer on each trigger', async () => {
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      autoSaveManager.triggerSave();
      await new Promise(resolve => setTimeout(resolve, 200));

      autoSaveManager.triggerSave();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not have saved yet (timer keeps resetting, 300ms debounce not elapsed)
      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(0);

      // Wait for full debounce delay
      await new Promise(resolve => setTimeout(resolve, 400));

      // Now should have saved
      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(1);
    });

    it('should save at least 1 second after last trigger', async () => {
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      const startTime = Date.now();
      autoSaveManager.triggerSave();

      // Wait for save to complete
      await new Promise(resolve => setTimeout(resolve, 1100));

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(1);
      expect(elapsed).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('saveImmediately', () => {
    it('should save immediately without debounce', async () => {
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      const startTime = Date.now();
      await autoSaveManager.saveImmediately();
      const endTime = Date.now();

      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(1);
      expect(endTime - startTime).toBeLessThan(100); // Should be immediate
    });

    it('should cancel pending debounced save', async () => {
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      // Trigger debounced save
      autoSaveManager.triggerSave();

      // Immediately save
      await autoSaveManager.saveImmediately();

      // Wait for original debounce delay
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should only have saved once (immediate save)
      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should not throw error when save fails', async () => {
      mockWorkspaceManager.shouldThrowError = true;
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      await expect(autoSaveManager.saveImmediately()).resolves.not.toThrow();
    });

    it('should log error when save fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockWorkspaceManager.shouldThrowError = true;
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      await autoSaveManager.saveImmediately();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AutoSave] Failed to save workspace:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should continue working after save error', async () => {
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      // First save fails
      mockWorkspaceManager.shouldThrowError = true;
      await autoSaveManager.saveImmediately();
      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(1);

      // Second save succeeds
      mockWorkspaceManager.shouldThrowError = false;
      await autoSaveManager.saveImmediately();
      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(2);
    });
  });

  describe('async save - non-blocking', () => {
    it('should not block when triggering save', () => {
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      const startTime = Date.now();
      autoSaveManager.triggerSave();
      const endTime = Date.now();

      // Should return immediately
      expect(endTime - startTime).toBeLessThan(10);
      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(0); // Not saved yet
    });

    it('should save asynchronously after debounce', async () => {
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      autoSaveManager.triggerSave();
      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(0);

      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(1);
    });
  });

  describe('workspace getter', () => {
    it('should call workspace getter when saving', async () => {
      let getterCalled = 0;
      const getter = () => {
        getterCalled++;
        return mockWorkspace;
      };

      autoSaveManager.startAutoSave(mockWorkspaceManager, getter);
      await autoSaveManager.saveImmediately();

      expect(getterCalled).toBe(1);
      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(1);
    });

    it('should use latest workspace state when saving', async () => {
      let workspaceVersion = 1;
      const getter = () => {
        return {
          ...mockWorkspace,
          windows: [
            {
              ...mockWorkspace.windows[0],
              name: `Window v${workspaceVersion}`,
            },
          ],
        };
      };

      autoSaveManager.startAutoSave(mockWorkspaceManager, getter);

      // First save
      await autoSaveManager.saveImmediately();
      expect(mockWorkspaceManager.lastSavedWorkspace?.windows[0].name).toBe('Window v1');

      // Update workspace
      workspaceVersion = 2;

      // Second save
      await autoSaveManager.saveImmediately();
      expect(mockWorkspaceManager.lastSavedWorkspace?.windows[0].name).toBe('Window v2');
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid window changes correctly', async () => {
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      // Simulate rapid window changes
      for (let i = 0; i < 10; i++) {
        autoSaveManager.triggerSave();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for final debounce
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should only save once after all changes
      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(1);
    });

    it('should handle app quit scenario', async () => {
      autoSaveManager.startAutoSave(mockWorkspaceManager, () => mockWorkspace);

      // Trigger some changes
      autoSaveManager.triggerSave();
      autoSaveManager.triggerSave();

      // App is quitting - save immediately
      await autoSaveManager.saveImmediately();

      // Stop auto-save
      autoSaveManager.stopAutoSave();

      expect(mockWorkspaceManager.saveWorkspaceCalled).toBe(1);
    });
  });
});
