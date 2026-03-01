/**
 * 窗口状态枚举
 * 定义窗口在生命周期中的各种状态
 */
export enum WindowStatus {
  Running = 'running',           // 运行中
  WaitingForInput = 'waiting',   // 等待输入
  Completed = 'completed',       // 已完成
  Error = 'error',               // 出错
  Restoring = 'restoring',       // 恢复中（启动时）
  Paused = 'paused'              // 暂停（未启动）
}

/**
 * 窗口接口
 * 表示一个终端窗口的完整状态
 */
export interface Window {
  id: string;                    // UUID
  name: string;                  // 窗口名称（用户可自定义）
  workingDirectory: string;      // 工作目录路径
  command: string;               // 启动命令（如 "claude"）
  status: WindowStatus;          // 当前状态
  pid: number | null;            // 进程 PID
  createdAt: string;             // 创建时间（ISO 8601）
  lastActiveAt: string;          // 最后活跃时间
  model?: string;                // 使用的 AI 模型（如 "Claude Opus 4.6"）
  lastOutput?: string;           // 最新输出摘要（前 100 字符）
  archived?: boolean;            // 是否已归档
}

/**
 * @deprecated 使用 Window 接口代替
 * 保留用于向后兼容
 */
export type TerminalWindow = Window;
