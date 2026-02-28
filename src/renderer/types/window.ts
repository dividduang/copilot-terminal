// Window status enum
export enum WindowStatus {
  Running = 'running',
  WaitingForInput = 'waiting',
  Completed = 'completed',
  Error = 'error',
  Restoring = 'restoring',
}

// Terminal Window interface
export interface TerminalWindow {
  id: string;
  name: string;
  workingDirectory: string;
  command: string;
  status: WindowStatus;
  pid: number | null;
  createdAt: string; // ISO 8601 format
  lastActiveAt: string; // ISO 8601 format
}
