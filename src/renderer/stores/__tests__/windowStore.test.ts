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
        lastActiveAt: new Date().toISOString()
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
        lastActiveAt: new Date().toISOString()
      }

      const window2: Window = {
        id: 'test-id-2',
        name: 'Window 2',
        workingDirectory: '/test/path2',
        command: 'zsh',
        status: WindowStatus.Running,
        pid: 5678,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
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
        lastActiveAt: new Date().toISOString()
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
        lastActiveAt: new Date().toISOString()
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
        lastActiveAt: new Date().toISOString()
      }

      const window2: Window = {
        id: 'test-id-2',
        name: 'Window 2',
        workingDirectory: '/test/path2',
        command: 'zsh',
        status: WindowStatus.Running,
        pid: 5678,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
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
    it('should update window status', () => {
      const window: Window = {
        id: 'test-id-1',
        name: 'Test Window',
        workingDirectory: '/test/path',
        command: 'bash',
        status: WindowStatus.Running,
        pid: 1234,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      }

      useWindowStore.getState().addWindow(window)
      useWindowStore.getState().updateWindowStatus('test-id-1', WindowStatus.Completed)

      const state = useWindowStore.getState()
      expect(state.windows[0].status).toBe(WindowStatus.Completed)
    })

    it('should update lastActiveAt when updating status', () => {
      const window: Window = {
        id: 'test-id-1',
        name: 'Test Window',
        workingDirectory: '/test/path',
        command: 'bash',
        status: WindowStatus.Running,
        pid: 1234,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActiveAt: '2024-01-01T00:00:00.000Z'
      }

      useWindowStore.getState().addWindow(window)
      useWindowStore.getState().updateWindowStatus('test-id-1', WindowStatus.WaitingForInput)

      const state = useWindowStore.getState()
      expect(state.windows[0].lastActiveAt).not.toBe('2024-01-01T00:00:00.000Z')
    })
  })

  describe('setActiveWindow', () => {
    it('should set active window id', () => {
      useWindowStore.getState().setActiveWindow('test-id-1')

      const state = useWindowStore.getState()
      expect(state.activeWindowId).toBe('test-id-1')
    })

    it('should allow setting activeWindowId to null', () => {
      useWindowStore.getState().setActiveWindow('test-id-1')
      useWindowStore.getState().setActiveWindow(null)

      const state = useWindowStore.getState()
      expect(state.activeWindowId).toBeNull()
    })
  })
})

