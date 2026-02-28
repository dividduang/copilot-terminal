/**
 * 视图切换 IPC 命令和事件类型定义
 */

/** switch-to-terminal-view 命令参数 */
export interface SwitchToTerminalViewPayload {
  windowId: string;
}

/** view-changed 事件数据 */
export interface ViewChangedPayload {
  view: 'unified' | 'terminal';
  windowId?: string;
}
