import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Radix UI ScrollArea uses ResizeObserver which is not available in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.electronAPI for all renderer tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    ping: vi.fn().mockResolvedValue('pong'),
    createWindow: vi.fn().mockResolvedValue({}),
    killTerminal: vi.fn().mockResolvedValue(undefined),
    getTerminalStatus: vi.fn().mockResolvedValue('alive'),
    listTerminals: vi.fn().mockResolvedValue([]),
    closeWindow: vi.fn().mockResolvedValue(undefined),
    deleteWindow: vi.fn().mockResolvedValue(undefined),
    startWindow: vi.fn().mockResolvedValue({ success: true }),
    validatePath: vi.fn().mockResolvedValue(true),
    selectDirectory: vi.fn().mockResolvedValue(null),
    openFolder: vi.fn().mockResolvedValue(undefined),
    onWindowStatusChanged: vi.fn(),
    offWindowStatusChanged: vi.fn(),
    onPaneStatusChanged: vi.fn(),
    offPaneStatusChanged: vi.fn(),
    ptyWrite: vi.fn().mockResolvedValue(undefined),
    ptyResize: vi.fn().mockResolvedValue(undefined),
    onPtyData: vi.fn(),
    offPtyData: vi.fn(),
    splitPane: vi.fn().mockResolvedValue({ success: true }),
    closePane: vi.fn().mockResolvedValue({ success: true }),
    switchToTerminalView: vi.fn().mockResolvedValue(undefined),
    switchToUnifiedView: vi.fn().mockResolvedValue(undefined),
    onViewChanged: vi.fn(),
    offViewChanged: vi.fn(),
    saveWorkspace: vi.fn().mockResolvedValue({ success: true }),
    loadWorkspace: vi.fn().mockResolvedValue({ success: true, data: {} }),
    onWorkspaceLoaded: vi.fn(),
    offWorkspaceLoaded: vi.fn(),
    triggerAutoSave: vi.fn(),
    writeClipboardText: vi.fn().mockResolvedValue(undefined),
    readClipboardText: vi.fn().mockResolvedValue({ success: true, data: '' }),
    notifyRendererReady: vi.fn(),
    onWindowRestored: vi.fn(),
    offWindowRestored: vi.fn(),
    onWorkspaceRestoreError: vi.fn(),
    offWorkspaceRestoreError: vi.fn(),
    recoverFromBackup: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
  writable: true,
});
