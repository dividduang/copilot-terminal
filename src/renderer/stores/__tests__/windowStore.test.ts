import { describe, it, expect, beforeEach } from 'vitest'
import { useWindowStore, WindowStatus, Window } from '../windowStore'

describe('windowStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useWindowStore.setState({ windows: [], activeWindowId: null })
  })

  describe('addWindow', () => {
    it('should add a window to the store', () => {
      const window: Window = {
        id: 'test-id-1',
        name: 'Test Window',
        workingDirectory: '/test/path',
        command: 'bash',
        status: WindowStatus.Running,
        pid: 1234,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
      }

      useWindowStore.getState().addWindow(window)

      const state = useWindowStore.getState()
      expect(state.windows).toHaveLength(1)
      expect(state.windows[0]).toEqual(window)
    })

    it('should add multiple windows', () => {
      const window1: Window = {
        id: 'test-id-1',
        name: 'Window 1',
        workingDirectory: '/test/path1',
        command: 'bash',
        status: WindowStatus.Running,
        pid: 1234,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path1',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
      }

      const window2: Window = {
        id: 'test-id-2',
        name: 'Window 2',
        workingDirectory: '/test/path2',
        command: 'zsh',
        status: WindowStatus.Running,
        pid: 5678,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-2',
          pane: {
            id: 'pane-test-id-2',
            cwd: '/test/path2',
            command: 'zsh',
            status: WindowStatus.Running,
            pid: 5678,
          },
        },
        activePaneId: 'pane-test-id-2',
      }

      useWindowStore.getState().addWindow(window1)
      useWindowStore.getState().addWindow(window2)

      const state = useWindowStore.getState()
      expect(state.windows).toHaveLength(2)
      expect(state.windows[0].id).toBe('test-id-1')
      expect(state.windows[1].id).toBe('test-id-2')
    })
  })

  describe('removeWindow', () => {
    it('should remove a window by id', () => {
      const window: Window = {
        id: 'test-id-1',
        name: 'Test Window',
        workingDirectory: '/test/path',
        command: 'bash',
        status: WindowStatus.Running,
        pid: 1234,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
      }

      useWindowStore.getState().addWindow(window)
      useWindowStore.getState().removeWindow('test-id-1')

      const state = useWindowStore.getState()
      expect(state.windows).toHaveLength(0)
    })

    it('should clear activeWindowId when removing active window', () => {
      const window: Window = {
        id: 'test-id-1',
        name: 'Test Window',
        workingDirectory: '/test/path',
        command: 'bash',
        status: WindowStatus.Running,
        pid: 1234,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
      }

      useWindowStore.getState().addWindow(window)
      useWindowStore.getState().setActiveWindow('test-id-1')
      useWindowStore.getState().removeWindow('test-id-1')

      const state = useWindowStore.getState()
      expect(state.activeWindowId).toBeNull()
    })

    it('should not clear activeWindowId when removing non-active window', () => {
      const window1: Window = {
        id: 'test-id-1',
        name: 'Window 1',
        workingDirectory: '/test/path1',
        command: 'bash',
        status: WindowStatus.Running,
        pid: 1234,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path1',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
      }

      const window2: Window = {
        id: 'test-id-2',
        name: 'Window 2',
        workingDirectory: '/test/path2',
        command: 'zsh',
        status: WindowStatus.Running,
        pid: 5678,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-2',
          pane: {
            id: 'pane-test-id-2',
            cwd: '/test/path2',
            command: 'zsh',
            status: WindowStatus.Running,
            pid: 5678,
          },
        },
        activePaneId: 'pane-test-id-2',
      }

      useWindowStore.getState().addWindow(window1)
      useWindowStore.getState().addWindow(window2)
      useWindowStore.getState().setActiveWindow('test-id-1')
      useWindowStore.getState().removeWindow('test-id-2')

      const state = useWindowStore.getState()
      expect(state.activeWindowId).toBe('test-id-1')
    })
  })

  describe('updateWindowStatus', () => {
    it('should update pane status via updateWindowStatus', () => {
      const window: Window = {
        id: 'test-id-1',
        name: 'Test Window',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
      }

      useWindowStore.getState().addWindow(window)
      useWindowStore.getState().updateWindowStatus('test-id-1', WindowStatus.Completed)

      const state = useWindowStore.getState()
      // updateWindowStatus now updates pane status inside layout
      expect(state.windows[0].layout.pane.status).toBe(WindowStatus.Completed)
    })

    it('should update lastActiveAt when updating status', () => {
      const window: Window = {
        id: 'test-id-1',
        name: 'Test Window',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActiveAt: '2024-01-01T00:00:00.000Z',
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
      }

      useWindowStore.getState().addWindow(window)
      useWindowStore.getState().updateWindowStatus('test-id-1', WindowStatus.WaitingForInput)

      const state = useWindowStore.getState()
      expect(state.windows[0].lastActiveAt).not.toBe('2024-01-01T00:00:00.000Z')
    })
  })

  describe('setActiveWindow', () => {
    it('should set active window id', () => {
      const window: Window = {
        id: 'test-id-1',
        name: 'Test Window',
        workingDirectory: '/test/path',
        command: 'bash',
        status: WindowStatus.Running,
        pid: 1234,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
      }

      useWindowStore.getState().addWindow(window)
      useWindowStore.getState().setActiveWindow('test-id-1')

      const state = useWindowStore.getState()
      expect(state.activeWindowId).toBe('test-id-1')
    })

    it('should update lastActiveAt when setting active window', () => {
      const window: Window = {
        id: 'test-id-1',
        name: 'Test Window',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActiveAt: '2024-01-01T00:00:00.000Z',
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
      }

      useWindowStore.getState().addWindow(window)
      useWindowStore.getState().setActiveWindow('test-id-1')

      const state = useWindowStore.getState()
      expect(state.windows[0].lastActiveAt).not.toBe('2024-01-01T00:00:00.000Z')
    })
  })

  describe('getWindowById', () => {
    it('should return window by id', () => {
      const window: Window = {
        id: 'test-id-1',
        name: 'Test Window',
        workingDirectory: '/test/path',
        command: 'bash',
        status: WindowStatus.Running,
        pid: 1234,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
      }

      useWindowStore.getState().addWindow(window)
      const result = useWindowStore.getState().getWindowById('test-id-1')

      expect(result).toEqual(window)
    })

    it('should return undefined for non-existent window', () => {
      const result = useWindowStore.getState().getWindowById('non-existent')
      expect(result).toBeUndefined()
    })
  })

  describe('getActiveWindows / getArchivedWindows', () => {
    it('should return active (non-archived) windows', () => {
      const window1: Window = {
        id: 'test-id-1',
        name: 'Window 1',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path1',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
      }

      const window2: Window = {
        id: 'test-id-2',
        name: 'Window 2',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-2',
          pane: {
            id: 'pane-test-id-2',
            cwd: '/test/path2',
            command: 'zsh',
            status: WindowStatus.Running,
            pid: 5678,
          },
        },
        activePaneId: 'pane-test-id-2',
        archived: true,
      }

      const window3: Window = {
        id: 'test-id-3',
        name: 'Window 3',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-3',
          pane: {
            id: 'pane-test-id-3',
            cwd: '/test/path3',
            command: 'fish',
            status: WindowStatus.Running,
            pid: 9012,
          },
        },
        activePaneId: 'pane-test-id-3',
      }

      useWindowStore.getState().addWindow(window1)
      useWindowStore.getState().addWindow(window2)
      useWindowStore.getState().addWindow(window3)

      const activeWindows = useWindowStore.getState().getActiveWindows()
      expect(activeWindows).toHaveLength(2)
      expect(activeWindows[0].id).toBe('test-id-1')
      expect(activeWindows[1].id).toBe('test-id-3')

      const archivedWindows = useWindowStore.getState().getArchivedWindows()
      expect(archivedWindows).toHaveLength(1)
      expect(archivedWindows[0].id).toBe('test-id-2')
    })

    it('should return empty array when no active windows exist', () => {
      const window: Window = {
        id: 'test-id-1',
        name: 'Test Window',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        layout: {
          type: 'pane',
          id: 'pane-test-id-1',
          pane: {
            id: 'pane-test-id-1',
            cwd: '/test/path',
            command: 'bash',
            status: WindowStatus.Running,
            pid: 1234,
          },
        },
        activePaneId: 'pane-test-id-1',
        archived: true,
      }

      useWindowStore.getState().addWindow(window)
      const activeWindows = useWindowStore.getState().getActiveWindows()

      expect(activeWindows).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('should not throw when removing non-existent window', () => {
      expect(() => {
        useWindowStore.getState().removeWindow('non-existent')
      }).not.toThrow()

      const state = useWindowStore.getState()
      expect(state.windows).toHaveLength(0)
    })

    it('should not throw when updating non-existent window status', () => {
      expect(() => {
        useWindowStore.getState().updateWindowStatus('non-existent', WindowStatus.Completed)
      }).not.toThrow()

      const state = useWindowStore.getState()
      expect(state.windows).toHaveLength(0)
    })

    it('should not throw when setting non-existent window as active', () => {
      expect(() => {
        useWindowStore.getState().setActiveWindow('non-existent')
      }).not.toThrow()

      const state = useWindowStore.getState()
      expect(state.activeWindowId).toBe('non-existent')
    })
  })
})

