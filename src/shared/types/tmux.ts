/**
 * tmux 兼容层类型定义
 *
 * 本文件定义了 tmux 兼容层所需的核心类型，用于支持 Claude Code Agent Teams 功能。
 * 不追求完整 tmux 实现，仅兼容 Claude Code 实际使用的命令子集。
 */

/**
 * tmux 命令类型枚举（P0 优先级）
 */
export enum TmuxCommand {
  // 版本检测
  Version = '-V',

  // 查询命令
  DisplayMessage = 'display-message',
  ListPanes = 'list-panes',
  ListWindows = 'list-windows',
  HasSession = 'has-session',

  // 窗格操作
  SplitWindow = 'split-window',
  KillPane = 'kill-pane',
  SelectPane = 'select-pane',
  ResizePane = 'resize-pane',
  SendKeys = 'send-keys',

  // 布局操作
  SelectLayout = 'select-layout',

  // 会话操作
  NewSession = 'new-session',
  KillSession = 'kill-session',
  AttachSession = 'attach-session',
  SwitchClient = 'switch-client',

  // 窗口操作
  NewWindow = 'new-window',

  // 选项设置
  SetOption = 'set-option',

  // Pane hide/show (P3)
  BreakPane = 'break-pane',
  JoinPane = 'join-pane',
}

/**
 * tmux 布局模式
 */
export enum TmuxLayout {
  MainVertical = 'main-vertical',  // 左 leader / 右 teammates
  Tiled = 'tiled',                 // 平铺布局
  EvenHorizontal = 'even-horizontal',
  EvenVertical = 'even-vertical',
}

/**
 * tmux Pane ID 格式：%1, %2, %3...
 */
export type TmuxPaneId = string;

/**
 * tmux Session 名称
 */
export type TmuxSessionName = string;

/**
 * tmux Window Target 格式：<session>:<index> 或 <session>:<windowName>
 */
export type TmuxWindowTarget = string;

/**
 * tmux 格式化字段
 */
export enum TmuxFormatField {
  PaneId = '#{pane_id}',
  SessionName = '#{session_name}',
  WindowIndex = '#{window_index}',
  WindowName = '#{window_name}',
  PaneTitle = '#{pane_title}',
}

/**
 * tmux 命令请求（从 shim 发送到主进程）
 */
export interface TmuxCommandRequest {
  /** 完整的命令行参数数组 */
  argv: string[];

  /** 当前窗口 ID（从环境变量读取） */
  windowId?: string;

  /** 当前窗格 ID（从环境变量读取） */
  paneId?: TmuxPaneId;

  /** 命名空间（对应 -L socket 参数） */
  namespace?: string;

  /** 工作目录（用于相对路径解析） */
  cwd?: string;
}

/**
 * tmux 命令响应（从主进程返回到 shim）
 */
export interface TmuxCommandResponse {
  /** 退出码（0 表示成功） */
  exitCode: number;

  /** 标准输出 */
  stdout: string;

  /** 标准错误输出 */
  stderr: string;
}

/**
 * tmux Pane 元数据扩展（添加到现有 Pane 接口）
 */
export interface TmuxPaneMetadata {
  /** tmux 风格的 pane ID（%1, %2...） */
  tmuxPaneId?: TmuxPaneId;

  /** Pane 标题（通过 select-pane -T 设置） */
  title?: string;

  /** 边框颜色（通过 select-pane -P 或 set-option 设置） */
  borderColor?: string;

  /** 激活边框颜色 */
  activeBorderColor?: string;

  /** 团队名称（Claude Agent Teams） */
  teamName?: string;

  /** Agent ID */
  agentId?: string;

  /** Agent 名称 */
  agentName?: string;

  /** Agent 颜色 */
  agentColor?: string;

  /** Teammate 模式 */
  teammateMode?: 'tmux' | 'in-process' | 'auto';
}

/**
 * tmux Session 状态
 */
export interface TmuxSession {
  /** Session 名称 */
  name: TmuxSessionName;

  /** 所属命名空间（对应 -L socket） */
  namespace: string;

  /** Session 中的 windows */
  windows: TmuxWindow[];

  /** 创建时间 */
  createdAt: string;

  /** 是否为隐藏 session（用于 break-pane） */
  hidden?: boolean;
}

/**
 * tmux Window 状态（虚拟映射）
 */
export interface TmuxWindow {
  /** Window 索引 */
  index: number;

  /** Window 名称 */
  name: string;

  /** 对应的实际 Window ID（本项目内部） */
  actualWindowId: string;

  /** Session 名称 */
  sessionName: TmuxSessionName;
}

/**
 * tmux 命令解析结果
 */
export interface ParsedTmuxCommand {
  /** 命令类型 */
  command: TmuxCommand;

  /** 全局选项 */
  globalOptions: {
    /** -L socket 参数 */
    socket?: string;
  };

  /** 命令选项 */
  options: Record<string, string | boolean | number>;

  /** 位置参数 */
  args: string[];
}

/**
 * split-window 命令选项
 */
export interface SplitWindowOptions {
  /** 目标 pane/window (-t) */
  target?: string;

  /** 水平分割 (-h) */
  horizontal?: boolean;

  /** 垂直分割 (-v) */
  vertical?: boolean;

  /** 大小 (-l) */
  size?: string;

  /** 百分比大小 */
  percentage?: number;

  /** 打印新 pane ID (-P) */
  print?: boolean;

  /** 格式化输出 (-F) */
  format?: string;

  /** 启动命令 */
  command?: string;
}

/**
 * send-keys 命令选项
 */
export interface SendKeysOptions {
  /** 目标 pane (-t) */
  target: string;

  /** 按键序列 */
  keys: string[];

  /** 是否包含 Enter 键 */
  hasEnter: boolean;
}

/**
 * select-layout 命令选项
 */
export interface SelectLayoutOptions {
  /** 目标 window (-t) */
  target?: string;

  /** 布局名称 */
  layout: TmuxLayout;
}

/**
 * resize-pane 命令选项
 */
export interface ResizePaneOptions {
  /** 目标 pane (-t) */
  target: string;

  /** 宽度 (-x) */
  width?: string;

  /** 高度 (-y) */
  height?: string;

  /** 百分比 */
  percentage?: number;
}

/**
 * select-pane 命令选项
 */
export interface SelectPaneOptions {
  /** 目标 pane (-t) */
  target: string;

  /** 设置标题 (-T) */
  title?: string;

  /** 设置样式 (-P) */
  style?: string;

  /** 背景色 */
  backgroundColor?: string;

  /** 前景色 */
  foregroundColor?: string;
}

/**
 * set-option 命令选项
 */
export interface SetOptionOptions {
  /** 窗格级选项 (-p) */
  pane?: boolean;

  /** 窗口级选项 (-w) */
  window?: boolean;

  /** 目标 (-t) */
  target?: string;

  /** 选项名称 */
  optionName: string;

  /** 选项值 */
  optionValue: string;
}

/**
 * display-message 命令选项
 */
export interface DisplayMessageOptions {
  /** 目标 pane/window (-t) */
  target?: string;

  /** 打印到 stdout (-p) */
  print?: boolean;

  /** 格式化字符串 */
  format?: string;
}

/**
 * list-panes 命令选项
 */
export interface ListPanesOptions {
  /** 目标 window (-t) */
  target?: string;

  /** 格式化输出 (-F) */
  format?: string;
}

/**
 * TmuxCompatService 接口
 * 主进程中的 tmux 兼容服务
 */
export interface ITmuxCompatService {
  /**
   * 执行 tmux 命令
   */
  executeCommand(request: TmuxCommandRequest): Promise<TmuxCommandResponse>;

  /**
   * 分配新的 tmux pane ID
   */
  allocatePaneId(): TmuxPaneId;

  /**
   * 通过 tmux pane ID 查找实际的 window ID 和 pane ID
   */
  resolvePaneId(tmuxPaneId: TmuxPaneId): { windowId: string; paneId: string } | null;

  /**
   * 通过 window target 解析 window ID
   */
  resolveWindowTarget(target: TmuxWindowTarget): string | null;

  /**
   * 注册 pane ID 映射
   */
  registerPane(tmuxPaneId: TmuxPaneId, windowId: string, paneId: string): void;

  /**
   * 注销 pane ID 映射
   */
  unregisterPane(tmuxPaneId: TmuxPaneId): void;

  /**
   * 获取或创建 session
   */
  getOrCreateSession(sessionName: TmuxSessionName, namespace: string): TmuxSession;

  /**
   * 销毁服务
   */
  destroy(): void;
}

/**
 * RPC 通信协议（shim <-> 主进程）
 */
export interface TmuxRpcMessage {
  /** 消息类型 */
  type: 'request' | 'response';

  /** 请求 ID（用于匹配请求和响应） */
  requestId: string;

  /** 请求数据 */
  request?: TmuxCommandRequest;

  /** 响应数据 */
  response?: TmuxCommandResponse;

  /** 错误信息 */
  error?: string;
}

/**
 * 环境变量注入规范
 */
export interface TmuxEnvironmentVariables {
  /** 窗口 ID */
  AUSOME_TERMINAL_WINDOW_ID: string;

  /** Pane ID */
  AUSOME_TERMINAL_PANE_ID: string;

  /** tmux RPC 通道（named pipe 或 socket 路径） */
  AUSOME_TMUX_RPC: string;

  /** 模拟 TMUX 环境变量（让 Claude 认为在 tmux 中） */
  TMUX: string;

  /** 模拟 TMUX_PANE 环境变量 */
  TMUX_PANE: TmuxPaneId;
}

/**
 * 布局操作接口（供 TmuxCompatService 调用）
 */
export interface ILayoutOperations {
  /**
   * 应用 main-vertical 布局
   */
  applyMainVerticalLayout(windowId: string): Promise<void>;

  /**
   * 应用 tiled 布局
   */
  applyTiledLayout(windowId: string): Promise<void>;

  /**
   * 调整 pane 大小（百分比）
   */
  resizePaneToRatio(windowId: string, paneId: string, widthRatio?: number, heightRatio?: number): Promise<void>;

  /**
   * 移动 pane 到目标位置
   */
  movePane(windowId: string, paneId: string, targetGroup: string): Promise<void>;
}
