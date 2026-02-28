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

  // File system
  validatePath: (path: string) => Promise<boolean>
  selectDirectory: () => Promise<string | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
