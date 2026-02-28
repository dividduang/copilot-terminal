import { contextBridge, ipcRenderer } from 'electron';

// 暴露受控的 IPC API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),

  // Terminal management
  createWindow: (config: { name?: string; workingDirectory: string; command?: string }) =>
    ipcRenderer.invoke('create-window', config),
  killTerminal: (pid: number) => ipcRenderer.invoke('kill-terminal', pid),
  getTerminalStatus: (pid: number) => ipcRenderer.invoke('get-terminal-status', pid),
  listTerminals: () => ipcRenderer.invoke('list-terminals'),

  // Window management
  closeWindow: (windowId: string) => ipcRenderer.invoke('close-window', { windowId }),
  deleteWindow: (windowId: string) => ipcRenderer.invoke('delete-window', { windowId }),

  // File system
  validatePath: (path: string) => ipcRenderer.invoke('validate-path', path),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // Status events
  onWindowStatusChanged: (callback: (event: unknown, payload: unknown) => void) => {
    ipcRenderer.on('window-status-changed', callback);
  },
  offWindowStatusChanged: (callback: (event: unknown, payload: unknown) => void) =>
    ipcRenderer.removeListener('window-status-changed', callback),

  // PTY I/O
  ptyWrite: (windowId: string, data: string) =>
    ipcRenderer.invoke('pty-write', { windowId, data }),
  ptyResize: (windowId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('pty-resize', { windowId, cols, rows }),
  onPtyData: (callback: (event: unknown, payload: { windowId: string; data: string }) => void) => {
    ipcRenderer.on('pty-data', callback);
  },
  offPtyData: (callback: (event: unknown, payload: { windowId: string; data: string }) => void) => {
    ipcRenderer.removeListener('pty-data', callback);
  },

  // View switching
  switchToTerminalView: (windowId: string) =>
    ipcRenderer.invoke('switch-to-terminal-view', { windowId }),
  switchToUnifiedView: () =>
    ipcRenderer.invoke('switch-to-unified-view'),
  onViewChanged: (callback: (event: unknown, payload: { view: 'unified' | 'terminal'; windowId?: string }) => void) => {
    ipcRenderer.on('view-changed', callback);
  },
  offViewChanged: (callback: (event: unknown, payload: { view: 'unified' | 'terminal'; windowId?: string }) => void) => {
    ipcRenderer.removeListener('view-changed', callback);
  },
});
