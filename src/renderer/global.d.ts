import { TerminalWindow } from './types/window'

export interface ElectronAPI {
  ping: () => Promise<string>

  // Terminal management
  createWindow: (config: {
    name?: string
    workingDirectory: string
    command?: string
  }) => Promise<TerminalWindow>
  killTerminal: (pid: number) => Promise<void>
  getTerminalStatus: (pid: number) => Promise<string>
  listTerminals: () => Promise<any[]>

  // Window management
  closeWindow: (windowId: string) => Promise<void>
  deleteWindow: (windowId: string) => Promise<void>

  // File system
  validatePath: (path: string) => Promise<boolean>
  selectDirectory: () => Promise<string | null>

  // Status events
  onWindowStatusChanged: (callback: (event: unknown, payload: unknown) => void) => void
  offWindowStatusChanged: (callback: (event: unknown, payload: unknown) => void) => void

  // PTY I/O
  ptyWrite: (windowId: string, data: string) => Promise<void>
  ptyResize: (windowId: string, cols: number, rows: number) => Promise<void>
  onPtyData: (callback: (event: unknown, payload: { windowId: string; data: string }) => void) => void
  offPtyData: (callback: (event: unknown, payload: { windowId: string; data: string }) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
