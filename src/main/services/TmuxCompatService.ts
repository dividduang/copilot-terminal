/**
 * TmuxCompatService 接口定义
 *
 * 主进程中的 tmux 兼容服务，负责接收和处理来自 fake tmux shim 的命令请求。
 */

import { EventEmitter } from 'events';
import {
  TmuxCommandRequest,
  TmuxCommandResponse,
  TmuxPaneId,
  TmuxWindowTarget,
  TmuxSessionName,
  TmuxSession,
  ITmuxCompatService,
  TmuxCommand,
  TmuxPaneMetadata,
} from '../../shared/types/tmux';
import { IProcessManager } from '../types/process';
import { TmuxCommandParser } from './TmuxCommandParser';
import { Window, LayoutNode, Pane } from '../../shared/types/window';
import { v4 as uuidv4 } from 'uuid';
import { TmuxRpcServer } from './TmuxRpcServer';

/**
 * ProcessManager 扩展接口（包含 tmux 兼容层需要的额外方法）
 */
export interface ITmuxProcessManager extends IProcessManager {
  getPidByPane(windowId: string, paneId?: string): number | null;
  writeToPty(pid: number, data: string): void;
}

/**
 * TmuxCompatService 配置
 */
export interface TmuxCompatServiceConfig {
  /** ProcessManager 实例 */
  processManager: ITmuxProcessManager;

  /** 获取 windowStore 状态的函数 */
  getWindowStore: () => any;

  /** 更新 windowStore 的函数 */
  updateWindowStore: (updater: (state: any) => void) => void;

  /** 是否启用调试日志 */
  debug?: boolean;
}

/**
 * TmuxCompatService 实现类
 *
 * 核心职责：
 * 1. 接收和解析 tmux 命令请求
 * 2. 维护 tmux pane ID 到实际 (windowId, paneId) 的映射
 * 3. 管理虚拟 session/window 结构
 * 4. 调用现有服务（ProcessManager, LayoutOperations）执行实际操作
 * 5. 格式化输出为 tmux 风格的响应
 */
export class TmuxCompatService extends EventEmitter implements ITmuxCompatService {
  private config: TmuxCompatServiceConfig;

  /** tmux pane ID 计数器（从 1 开始） */
  private paneIdCounter: number = 1;

  /** tmux pane ID → (windowId, paneId) 映射 */
  private paneIdMap: Map<TmuxPaneId, { windowId: string; paneId: string }>;

  /** 反向映射: (windowId:paneId) → tmux pane ID */
  private reversePaneIdMap: Map<string, TmuxPaneId>;

  /** 虚拟 session 存储: "namespace:sessionName" → TmuxSession */
  private sessions: Map<string, TmuxSession>;

  /** RPC 服务器实例 */
  private rpcServer: TmuxRpcServer;

  /** Pane 元数据存储: tmuxPaneId → TmuxPaneMetadata */
  private paneMetadata: Map<TmuxPaneId, TmuxPaneMetadata>;

  constructor(config: TmuxCompatServiceConfig) {
    super();
    this.config = config;
    this.paneIdMap = new Map();
    this.reversePaneIdMap = new Map();
    this.sessions = new Map();
    this.rpcServer = new TmuxRpcServer({
      tmuxCompatService: this,
      debug: config.debug,
    });
    this.paneMetadata = new Map();
  }

  /**
   * 执行 tmux 命令
   */
  async executeCommand(request: TmuxCommandRequest): Promise<TmuxCommandResponse> {
    try {
      if (this.config.debug) {
        console.log('[TmuxCompatService] Executing command:', request.argv);
      }

      // 解析命令
      const parsed = TmuxCommandParser.parse(request.argv);

      // 路由到对应的处理函数
      switch (parsed.command) {
        case TmuxCommand.Version:
          return this.handleVersion();

        case TmuxCommand.DisplayMessage:
          return this.handleDisplayMessage(parsed, request);

        case TmuxCommand.ListPanes:
          return this.handleListPanes(parsed, request);

        case TmuxCommand.SplitWindow:
          return this.handleSplitWindow(parsed, request);

        case TmuxCommand.SelectLayout:
          return this.handleSelectLayout(parsed, request);

        case TmuxCommand.ResizePane:
          return this.handleResizePane(parsed, request);

        case TmuxCommand.SendKeys:
          return this.handleSendKeys(parsed, request);

        case TmuxCommand.KillPane:
          return this.handleKillPane(parsed, request);

        case TmuxCommand.SelectPane:
          return this.handleSelectPane(parsed, request);

        case TmuxCommand.SetOption:
          return this.handleSetOption(parsed, request);

        default:
          return {
            exitCode: 1,
            stdout: '',
            stderr: `tmux: unknown command: ${request.argv[0]}\n`,
          };
      }
    } catch (error: unknown) {
      console.error('[TmuxCompatService] Command execution error:', error);
      return {
        exitCode: 1,
        stdout: '',
        stderr: `tmux: ${error instanceof Error ? error.message : String(error)}\n`,
      };
    }
  }

  /**
   * 分配新的 tmux pane ID
   */
  allocatePaneId(): TmuxPaneId {
    const id = `%${this.paneIdCounter++}`;
    return id;
  }

  /**
   * 通过 tmux pane ID 查找实际的 window ID 和 pane ID
   */
  resolvePaneId(tmuxPaneId: TmuxPaneId): { windowId: string; paneId: string } | null {
    return this.paneIdMap.get(tmuxPaneId) || null;
  }

  /**
   * 通过 window target 解析 window ID
   *
   * 支持格式:
   * - "session:0" → 查找 session 的第 0 个 window
   * - "session:windowName" → 查找 session 中名为 windowName 的 window
   */
  resolveWindowTarget(target: TmuxWindowTarget): string | null {
    // 简化实现：假设 target 格式为 "session:index"
    // 实际实现需要解析 session 和 window 映射
    const parts = target.split(':');
    if (parts.length !== 2) {
      return null;
    }

    const [sessionName, windowIdentifier] = parts;
    const session = this.findSession(sessionName);
    if (!session) {
      return null;
    }

    // 尝试按索引查找
    const index = parseInt(windowIdentifier, 10);
    if (!isNaN(index) && index >= 0 && index < session.windows.length) {
      return session.windows[index].actualWindowId;
    }

    // 尝试按名称查找
    const window = session.windows.find(w => w.name === windowIdentifier);
    return window?.actualWindowId || null;
  }

  /**
   * 注册 pane ID 映射
   */
  registerPane(tmuxPaneId: TmuxPaneId, windowId: string, paneId: string): void {
    this.paneIdMap.set(tmuxPaneId, { windowId, paneId });
    const reverseKey = `${windowId}:${paneId}`;
    this.reversePaneIdMap.set(reverseKey, tmuxPaneId);

    if (this.config.debug) {
      console.log(`[TmuxCompatService] Registered pane: ${tmuxPaneId} → ${windowId}:${paneId}`);
    }
  }

  /**
   * 注销 pane ID 映射
   */
  unregisterPane(tmuxPaneId: TmuxPaneId): void {
    const mapping = this.paneIdMap.get(tmuxPaneId);
    if (mapping) {
      const reverseKey = `${mapping.windowId}:${mapping.paneId}`;
      this.reversePaneIdMap.delete(reverseKey);
    }
    this.paneIdMap.delete(tmuxPaneId);

    if (this.config.debug) {
      console.log(`[TmuxCompatService] Unregistered pane: ${tmuxPaneId}`);
    }
  }

  /**
   * 获取或创建 session
   */
  getOrCreateSession(sessionName: TmuxSessionName, namespace: string = 'default'): TmuxSession {
    const key = `${namespace}:${sessionName}`;
    let session = this.sessions.get(key);

    if (!session) {
      session = {
        name: sessionName,
        namespace,
        windows: [],
        createdAt: new Date().toISOString(),
      };
      this.sessions.set(key, session);

      if (this.config.debug) {
        console.log(`[TmuxCompatService] Created session: ${key}`);
      }
    }

    return session;
  }

  /**
   * 查找 session
   */
  private findSession(sessionName: TmuxSessionName, namespace: string = 'default'): TmuxSession | null {
    const key = `${namespace}:${sessionName}`;
    return this.sessions.get(key) || null;
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    // 关闭 RPC 服务器
    this.rpcServer.destroy().catch((error: unknown) => {
      console.error('[TmuxCompatService] Failed to destroy RPC server:', error);
    });

    this.paneIdMap.clear();
    this.reversePaneIdMap.clear();
    this.sessions.clear();
    this.paneMetadata.clear();
    this.removeAllListeners();
  }

  /**
   * 为指定 window 启动 RPC 服务器
   *
   * @returns socket 路径（用于注入到环境变量 AUSOME_TMUX_RPC）
   */
  async startRpcServer(windowId: string): Promise<string> {
    return this.rpcServer.startServer(windowId);
  }

  /**
   * 停止指定 window 的 RPC 服务器
   */
  async stopRpcServer(windowId: string): Promise<void> {
    return this.rpcServer.stopServer(windowId);
  }

  /**
   * 获取指定 window 的 RPC socket 路径
   */
  getRpcSocketPath(windowId: string): string {
    return this.rpcServer.getSocketPath(windowId);
  }

  /**
   * 获取 window 的所有 panes
   */
  private getAllPanes(windowId: string): Pane[] {
    const store = this.config.getWindowStore();
    const window = store.windows.find((w: Window) => w.id === windowId);
    if (!window) {
      return [];
    }

    const panes: Pane[] = [];
    const collectPanes = (node: LayoutNode) => {
      if (node.type === 'pane') {
        panes.push(node.pane);
      } else {
        node.children.forEach(collectPanes);
      }
    };

    collectPanes(window.layout);
    return panes;
  }

  /**
   * 查找 pane
   */
  private findPane(windowId: string, paneId: string): Pane | null {
    const panes = this.getAllPanes(windowId);
    return panes.find(p => p.id === paneId) || null;
  }

  /**
   * 格式化输出字段
   */
  private formatField(field: string, context: {
    tmuxPaneId?: TmuxPaneId;
    windowId?: string;
    paneId?: string;
  }): string {
    switch (field) {
      case 'pane_id':
        return context.tmuxPaneId || '';

      case 'session_name':
        // 简化实现：返回默认 session 名称
        return 'default';

      case 'window_index':
        // 简化实现：返回 0
        return '0';

      case 'window_name':
        const store = this.config.getWindowStore();
        const window = store.windows.find((w: Window) => w.id === context.windowId);
        return window?.name || '';

      case 'pane_title':
        if (context.tmuxPaneId) {
          const metadata = this.paneMetadata.get(context.tmuxPaneId);
          return metadata?.title || '';
        }
        return '';

      default:
        return '';
    }
  }

  /**
   * 格式化 format 字符串
   */
  private formatString(format: string, context: {
    tmuxPaneId?: TmuxPaneId;
    windowId?: string;
    paneId?: string;
  }): string {
    const fields = TmuxCommandParser.parseFormatString(format);
    let result = format;

    for (const field of fields) {
      const value = this.formatField(field, context);
      result = result.replace(`#{${field}}`, value);
    }

    return result;
  }

  /**
   * 处理 tmux -V
   */
  private handleVersion(): TmuxCommandResponse {
    return {
      exitCode: 0,
      stdout: 'tmux 3.4\n',
      stderr: '',
    };
  }

  /**
   * 处理 display-message
   */
  private handleDisplayMessage(parsed: any, request: TmuxCommandRequest): TmuxCommandResponse {
    try {
      const options = TmuxCommandParser.parseDisplayMessageOptions(parsed);

      // 确定目标 pane
      let tmuxPaneId: TmuxPaneId | undefined;
      let windowId: string | undefined;
      let paneId: string | undefined;

      if (options.target) {
        const targetInfo = TmuxCommandParser.parseTarget(options.target);
        if (targetInfo.type === 'pane' && targetInfo.paneId) {
          tmuxPaneId = targetInfo.paneId;
          const resolved = this.resolvePaneId(tmuxPaneId);
          if (resolved) {
            windowId = resolved.windowId;
            paneId = resolved.paneId;
          }
        }
      } else {
        // 使用请求中的当前 pane
        tmuxPaneId = request.paneId;
        windowId = request.windowId;
        if (tmuxPaneId) {
          const resolved = this.resolvePaneId(tmuxPaneId);
          if (resolved) {
            paneId = resolved.paneId;
          }
        }
      }

      if (!tmuxPaneId || !windowId) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: can\'t find pane\n',
        };
      }

      // 格式化输出
      let output = '';
      if (options.format) {
        output = this.formatString(options.format, { tmuxPaneId, windowId, paneId });
      } else {
        // 默认输出 pane ID
        output = tmuxPaneId;
      }

      return {
        exitCode: 0,
        stdout: output + '\n',
        stderr: '',
      };
    } catch (error: unknown) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `tmux: ${error instanceof Error ? error.message : String(error)}\n`,
      };
    }
  }

  /**
   * 处理 list-panes
   */
  private handleListPanes(parsed: any, request: TmuxCommandRequest): TmuxCommandResponse {
    try {
      const options = TmuxCommandParser.parseListPanesOptions(parsed);

      // 确定目标 window
      let windowId: string | undefined;

      if (options.target) {
        const targetInfo = TmuxCommandParser.parseTarget(options.target);
        if (targetInfo.type === 'window') {
          // 解析 window target
          windowId = this.resolveWindowTarget(options.target) ?? undefined;
        } else if (targetInfo.type === 'pane' && targetInfo.paneId) {
          // 从 pane 获取 window
          const resolved = this.resolvePaneId(targetInfo.paneId);
          if (resolved) {
            windowId = resolved.windowId;
          }
        }
      } else {
        // 使用请求中的当前 window
        windowId = request.windowId;
      }

      if (!windowId) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: can\'t find window\n',
        };
      }

      // 获取 window 的所有 panes
      const panes = this.getAllPanes(windowId);
      const output: string[] = [];

      for (const pane of panes) {
        // 查找 tmux pane ID
        const reverseKey = `${windowId}:${pane.id}`;
        const tmuxPaneId = this.reversePaneIdMap.get(reverseKey);

        if (tmuxPaneId) {
          if (options.format) {
            const formatted = this.formatString(options.format, {
              tmuxPaneId,
              windowId,
              paneId: pane.id,
            });
            output.push(formatted);
          } else {
            output.push(tmuxPaneId);
          }
        }
      }

      return {
        exitCode: 0,
        stdout: output.join('\n') + (output.length > 0 ? '\n' : ''),
        stderr: '',
      };
    } catch (error: unknown) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `tmux: ${error instanceof Error ? error.message : String(error)}\n`,
      };
    }
  }

  /**
   * 处理 split-window
   */
  private async handleSplitWindow(parsed: any, request: TmuxCommandRequest): Promise<TmuxCommandResponse> {
    try {
      const options = TmuxCommandParser.parseSplitWindowOptions(parsed);

      // 确定目标 pane/window
      let windowId: string | undefined;
      let targetPaneId: string | undefined;

      if (options.target) {
        const targetInfo = TmuxCommandParser.parseTarget(options.target);
        if (targetInfo.type === 'pane' && targetInfo.paneId) {
          const resolved = this.resolvePaneId(targetInfo.paneId);
          if (resolved) {
            windowId = resolved.windowId;
            targetPaneId = resolved.paneId;
          }
        }
      } else {
        windowId = request.windowId;
        if (request.paneId) {
          const resolved = this.resolvePaneId(request.paneId);
          if (resolved) {
            targetPaneId = resolved.paneId;
          }
        }
      }

      if (!windowId) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: can\'t find window\n',
        };
      }

      // 创建新 pane
      const newPaneId = uuidv4();
      const newTmuxPaneId = this.allocatePaneId();

      // 确定分割方向
      const direction = options.horizontal ? 'horizontal' : 'vertical';

      // 计算大小比例
      let sizeRatio = 0.5; // 默认 50/50
      if (options.percentage) {
        sizeRatio = options.percentage / 100;
      }

      // 更新 layout 树
      this.config.updateWindowStore((state: any) => {
        const window = state.windows.find((w: Window) => w.id === windowId);
        if (!window) {
          throw new Error('Window not found');
        }

        // 创建新 pane 对象
        const newPane: Pane = {
          id: newPaneId,
          cwd: window.layout.type === 'pane' ? window.layout.pane.cwd : process.cwd(),
          command: 'shell',
          status: 'paused' as any,
          pid: null,
        };

        // 插入新 pane 到 layout 树
        if (targetPaneId) {
          // 在目标 pane 旁边分割
          this.splitPaneInLayout(window.layout, targetPaneId, newPane, direction, sizeRatio);
        } else {
          // 在根节点分割
          const oldRoot = window.layout;
          window.layout = {
            type: 'split',
            direction,
            sizes: [1 - sizeRatio, sizeRatio],
            children: [
              oldRoot,
              { type: 'pane', id: newPaneId, pane: newPane },
            ],
          };
        }
      });

      // 注册 pane 映射
      this.registerPane(newTmuxPaneId, windowId, newPaneId);

      // 启动 PTY 进程
      const store = this.config.getWindowStore();
      const window = store.windows.find((w: Window) => w.id === windowId);
      if (window) {
        const newPane = this.findPane(windowId, newPaneId);
        if (newPane) {
          try {
            await this.config.processManager.spawnTerminal({
              windowId,
              paneId: newPaneId,
              workingDirectory: newPane.cwd,
              command: options.command,
            });
          } catch (error: unknown) {
            console.error('[TmuxCompatService] Failed to spawn terminal:', error);
          }
        }
      }

      // 返回新 pane ID
      if (options.print && options.format) {
        const output = this.formatString(options.format, {
          tmuxPaneId: newTmuxPaneId,
          windowId,
          paneId: newPaneId,
        });
        return {
          exitCode: 0,
          stdout: output + '\n',
          stderr: '',
        };
      } else if (options.print) {
        return {
          exitCode: 0,
          stdout: newTmuxPaneId + '\n',
          stderr: '',
        };
      } else {
        return {
          exitCode: 0,
          stdout: '',
          stderr: '',
        };
      }
    } catch (error: unknown) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `tmux: ${error instanceof Error ? error.message : String(error)}\n`,
      };
    }
  }

  /**
   * 在 layout 树中分割 pane
   */
  private splitPaneInLayout(
    node: LayoutNode,
    targetPaneId: string,
    newPane: Pane,
    direction: 'horizontal' | 'vertical',
    sizeRatio: number
  ): boolean {
    if (node.type === 'pane') {
      if (node.id === targetPaneId) {
        // 找到目标 pane，但无法在叶子节点上分割
        // 需要在父节点处理
        return true;
      }
      return false;
    }

    // 在子节点中查找
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];

      if (child.type === 'pane' && child.id === targetPaneId) {
        // 找到目标 pane，替换为 split 节点
        const newSplit: LayoutNode = {
          type: 'split',
          direction,
          sizes: [1 - sizeRatio, sizeRatio],
          children: [
            child,
            { type: 'pane', id: newPane.id, pane: newPane },
          ],
        };

        node.children[i] = newSplit;

        // 重新计算 sizes
        // 保持当前子节点的大小不变
        return true;
      }

      if (child.type === 'split') {
        if (this.splitPaneInLayout(child, targetPaneId, newPane, direction, sizeRatio)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 处理 select-layout
   */
  private handleSelectLayout(parsed: any, request: TmuxCommandRequest): TmuxCommandResponse {
    try {
      const options = TmuxCommandParser.parseSelectLayoutOptions(parsed);

      // 确定目标 window
      let windowId: string | undefined;

      if (options.target) {
        const targetInfo = TmuxCommandParser.parseTarget(options.target);
        if (targetInfo.type === 'window') {
          windowId = this.resolveWindowTarget(options.target) ?? undefined;
        } else if (targetInfo.type === 'pane' && targetInfo.paneId) {
          const resolved = this.resolvePaneId(targetInfo.paneId);
          if (resolved) {
            windowId = resolved.windowId;
          }
        }
      } else {
        windowId = request.windowId;
      }

      if (!windowId) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: can\'t find window\n',
        };
      }

      // 应用布局
      if (options.layout === 'main-vertical') {
        this.applyMainVerticalLayout(windowId);
      } else if (options.layout === 'tiled') {
        this.applyTiledLayout(windowId);
      }

      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
      };
    } catch (error: unknown) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `tmux: ${error instanceof Error ? error.message : String(error)}\n`,
      };
    }
  }

  /**
   * 应用 main-vertical 布局（左 30% leader，右 70% teammates）
   */
  private applyMainVerticalLayout(windowId: string): void {
    this.config.updateWindowStore((state: any) => {
      const window = state.windows.find((w: Window) => w.id === windowId);
      if (!window) {
        throw new Error('Window not found');
      }

      const panes = this.getAllPanesFromLayout(window.layout);
      if (panes.length === 0) {
        return;
      }

      // 第一个 pane 作为 leader（左侧 30%）
      const leaderPane = panes[0];
      const teammatesPanes = panes.slice(1);

      if (teammatesPanes.length === 0) {
        // 只有一个 pane，不需要布局
        return;
      }

      // 构建右侧 teammates 布局（垂直堆叠）
      const teammatesLayout: LayoutNode = teammatesPanes.length === 1
        ? { type: 'pane', id: teammatesPanes[0].id, pane: teammatesPanes[0] }
        : {
            type: 'split',
            direction: 'vertical',
            sizes: Array(teammatesPanes.length).fill(1 / teammatesPanes.length),
            children: teammatesPanes.map(p => ({
              type: 'pane',
              id: p.id,
              pane: p,
            })),
          };

      // 构建最终布局
      window.layout = {
        type: 'split',
        direction: 'horizontal',
        sizes: [0.3, 0.7],
        children: [
          { type: 'pane', id: leaderPane.id, pane: leaderPane },
          teammatesLayout,
        ],
      };
    });
  }

  /**
   * 应用 tiled 布局（平铺所有 panes）
   */
  private applyTiledLayout(windowId: string): void {
    this.config.updateWindowStore((state: any) => {
      const window = state.windows.find((w: Window) => w.id === windowId);
      if (!window) {
        throw new Error('Window not found');
      }

      const panes = this.getAllPanesFromLayout(window.layout);
      if (panes.length === 0) {
        return;
      }

      if (panes.length === 1) {
        window.layout = { type: 'pane', id: panes[0].id, pane: panes[0] };
        return;
      }

      // 计算网格布局
      const cols = Math.ceil(Math.sqrt(panes.length));
      const rows = Math.ceil(panes.length / cols);

      // 构建行
      const rowNodes: LayoutNode[] = [];
      for (let row = 0; row < rows; row++) {
        const startIdx = row * cols;
        const endIdx = Math.min(startIdx + cols, panes.length);
        const rowPanes = panes.slice(startIdx, endIdx);

        if (rowPanes.length === 1) {
          rowNodes.push({ type: 'pane', id: rowPanes[0].id, pane: rowPanes[0] });
        } else {
          rowNodes.push({
            type: 'split',
            direction: 'horizontal',
            sizes: Array(rowPanes.length).fill(1 / rowPanes.length),
            children: rowPanes.map(p => ({
              type: 'pane',
              id: p.id,
              pane: p,
            })),
          });
        }
      }

      // 构建最终布局
      if (rowNodes.length === 1) {
        window.layout = rowNodes[0];
      } else {
        window.layout = {
          type: 'split',
          direction: 'vertical',
          sizes: Array(rowNodes.length).fill(1 / rowNodes.length),
          children: rowNodes,
        };
      }
    });
  }

  /**
   * 从 layout 树中提取所有 panes
   */
  private getAllPanesFromLayout(node: LayoutNode): Pane[] {
    if (node.type === 'pane') {
      return [node.pane];
    }

    const panes: Pane[] = [];
    for (const child of node.children) {
      panes.push(...this.getAllPanesFromLayout(child));
    }
    return panes;
  }

  /**
   * 处理 resize-pane
   */
  private handleResizePane(parsed: any, request: TmuxCommandRequest): TmuxCommandResponse {
    try {
      const options = TmuxCommandParser.parseResizePaneOptions(parsed);

      // 解析目标 pane
      const targetInfo = TmuxCommandParser.parseTarget(options.target);
      if (targetInfo.type !== 'pane' || !targetInfo.paneId) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: invalid target\n',
        };
      }

      const resolved = this.resolvePaneId(targetInfo.paneId);
      if (!resolved) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: can\'t find pane\n',
        };
      }

      // 计算新大小
      let widthRatio: number | undefined;
      let heightRatio: number | undefined;

      if (options.percentage) {
        widthRatio = options.percentage / 100;
      }

      // 更新 layout 树中的 sizes
      this.config.updateWindowStore((state: any) => {
        const window = state.windows.find((w: Window) => w.id === resolved.windowId);
        if (!window) {
          throw new Error('Window not found');
        }

        // 在 layout 树中查找并调整 pane 大小
        this.resizePaneInLayout(window.layout, resolved.paneId, widthRatio, heightRatio);
      });

      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
      };
    } catch (error: unknown) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `tmux: ${error instanceof Error ? error.message : String(error)}\n`,
      };
    }
  }

  /**
   * 在 layout 树中调整 pane 大小
   */
  private resizePaneInLayout(
    node: LayoutNode,
    targetPaneId: string,
    widthRatio?: number,
    heightRatio?: number,
    parentNode?: LayoutNode,
    childIndex?: number
  ): boolean {
    if (node.type === 'pane') {
      if (node.id === targetPaneId && parentNode && parentNode.type === 'split' && childIndex !== undefined) {
        // 找到目标 pane，调整父节点的 sizes
        if (parentNode.direction === 'horizontal' && widthRatio !== undefined) {
          // 调整水平方向的大小
          const oldSize = parentNode.sizes[childIndex];
          parentNode.sizes[childIndex] = widthRatio;

          // 重新分配其他子节点的大小
          const remaining = 1 - widthRatio;
          const otherCount = parentNode.sizes.length - 1;
          for (let i = 0; i < parentNode.sizes.length; i++) {
            if (i !== childIndex) {
              parentNode.sizes[i] = remaining / otherCount;
            }
          }
        } else if (parentNode.direction === 'vertical' && heightRatio !== undefined) {
          // 调整垂直方向的大小
          parentNode.sizes[childIndex] = heightRatio;

          const remaining = 1 - heightRatio;
          const otherCount = parentNode.sizes.length - 1;
          for (let i = 0; i < parentNode.sizes.length; i++) {
            if (i !== childIndex) {
              parentNode.sizes[i] = remaining / otherCount;
            }
          }
        }

        return true;
      }
      return false;
    }

    // 在子节点中查找
    for (let i = 0; i < node.children.length; i++) {
      if (this.resizePaneInLayout(node.children[i], targetPaneId, widthRatio, heightRatio, node, i)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 处理 send-keys
   */
  private handleSendKeys(parsed: any, request: TmuxCommandRequest): TmuxCommandResponse {
    try {
      const options = TmuxCommandParser.parseSendKeysOptions(parsed);

      // 解析目标 pane
      const targetInfo = TmuxCommandParser.parseTarget(options.target);
      if (targetInfo.type !== 'pane' || !targetInfo.paneId) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: invalid target\n',
        };
      }

      const resolved = this.resolvePaneId(targetInfo.paneId);
      if (!resolved) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: can\'t find pane\n',
        };
      }

      // 查找 PID
      const pid = this.config.processManager.getPidByPane(resolved.windowId, resolved.paneId);
      if (!pid) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: pane not running\n',
        };
      }

      // 拼接按键序列
      let keys = options.keys.join(' ');
      if (options.hasEnter) {
        keys += '\r';
      }

      // 写入 PTY
      this.config.processManager.writeToPty(pid, keys);

      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
      };
    } catch (error: unknown) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `tmux: ${error instanceof Error ? error.message : String(error)}\n`,
      };
    }
  }

  /**
   * 处理 kill-pane
   */
  private async handleKillPane(parsed: any, request: TmuxCommandRequest): Promise<TmuxCommandResponse> {
    try {
      const target = parsed.options.target as string | undefined;
      if (!target) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: kill-pane requires -t option\n',
        };
      }

      // 解析目标 pane
      const targetInfo = TmuxCommandParser.parseTarget(target);
      if (targetInfo.type !== 'pane' || !targetInfo.paneId) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: invalid target\n',
        };
      }

      const resolved = this.resolvePaneId(targetInfo.paneId);
      if (!resolved) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: can\'t find pane\n',
        };
      }

      // 终止 PTY 进程
      const pid = this.config.processManager.getPidByPane(resolved.windowId, resolved.paneId);
      if (pid) {
        await this.config.processManager.killProcess(pid);
      }

      // 从 layout 树中移除 pane
      this.config.updateWindowStore((state: any) => {
        const window = state.windows.find((w: Window) => w.id === resolved.windowId);
        if (!window) {
          return;
        }

        window.layout = this.removePaneFromLayout(window.layout, resolved.paneId);
      });

      // 注销 pane 映射
      this.unregisterPane(targetInfo.paneId);

      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
      };
    } catch (error: unknown) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `tmux: ${error instanceof Error ? error.message : String(error)}\n`,
      };
    }
  }

  /**
   * 从 layout 树中移除 pane
   */
  private removePaneFromLayout(node: LayoutNode, targetPaneId: string): LayoutNode {
    if (node.type === 'pane') {
      // 叶子节点，无法移除
      return node;
    }

    // 过滤掉目标 pane
    const newChildren = node.children
      .filter(child => {
        if (child.type === 'pane') {
          return child.id !== targetPaneId;
        }
        return true;
      })
      .map(child => this.removePaneFromLayout(child, targetPaneId));

    // 如果只剩一个子节点，提升它
    if (newChildren.length === 1) {
      return newChildren[0];
    }

    // 重新计算 sizes
    const newSizes = Array(newChildren.length).fill(1 / newChildren.length);

    return {
      ...node,
      children: newChildren,
      sizes: newSizes,
    };
  }

  /**
   * 处理 select-pane
   */
  private handleSelectPane(parsed: any, request: TmuxCommandRequest): TmuxCommandResponse {
    try {
      const options = TmuxCommandParser.parseSelectPaneOptions(parsed);

      // 解析目标 pane
      const targetInfo = TmuxCommandParser.parseTarget(options.target);
      if (targetInfo.type !== 'pane' || !targetInfo.paneId) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: invalid target\n',
        };
      }

      const tmuxPaneId = targetInfo.paneId;
      const resolved = this.resolvePaneId(tmuxPaneId);
      if (!resolved) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'tmux: can\'t find pane\n',
        };
      }

      // 获取或创建 pane 元数据
      let metadata = this.paneMetadata.get(tmuxPaneId);
      if (!metadata) {
        metadata = { tmuxPaneId };
        this.paneMetadata.set(tmuxPaneId, metadata);
      }

      // 设置标题
      if (options.title !== undefined) {
        metadata.title = options.title;
        this.emit('pane-title-changed', {
          tmuxPaneId,
          windowId: resolved.windowId,
          paneId: resolved.paneId,
          title: options.title,
        });
      }

      // 设置样式
      if (options.style) {
        this.applyPaneStyle(tmuxPaneId, metadata, options.style);
        this.emit('pane-style-changed', {
          tmuxPaneId,
          windowId: resolved.windowId,
          paneId: resolved.paneId,
          metadata,
        });
      }

      // 设置为活跃 pane
      if (!options.title && !options.style) {
        this.config.updateWindowStore((state: any) => {
          const window = state.windows.find((w: Window) => w.id === resolved.windowId);
          if (window) {
            window.activePaneId = resolved.paneId;
          }
        });
      }

      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
      };
    } catch (error: unknown) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `tmux: ${error instanceof Error ? error.message : String(error)}\n`,
      };
    }
  }

  /**
   * 解析并应用 pane 样式
   * 格式: "fg=colour196,bg=default" 或 "#{pane-border-style}"
   */
  private applyPaneStyle(tmuxPaneId: TmuxPaneId, metadata: TmuxPaneMetadata, style: string): void {
    const parts = style.split(',');
    for (const part of parts) {
      const [key, value] = part.trim().split('=');
      if (!key || !value) continue;

      switch (key.trim()) {
        case 'fg':
          metadata.borderColor = this.tmuxColorToHex(value.trim());
          break;
        case 'bg':
          if (value.trim() !== 'default') {
            metadata.activeBorderColor = this.tmuxColorToHex(value.trim());
          }
          break;
      }
    }
  }

  /**
   * 将 tmux 颜色转换为 hex
   */
  private tmuxColorToHex(color: string): string {
    // tmux 颜色映射（常用颜色）
    const colorMap: Record<string, string> = {
      'black': '#000000',
      'red': '#ff0000',
      'green': '#00ff00',
      'yellow': '#ffff00',
      'blue': '#0000ff',
      'magenta': '#ff00ff',
      'cyan': '#00ffff',
      'white': '#ffffff',
      'colour196': '#ff0000',
      'colour46': '#00ff00',
      'colour21': '#0000ff',
      'colour226': '#ffff00',
      'colour201': '#ff00ff',
      'colour51': '#00ffff',
      'colour208': '#ff8700',
      'colour82': '#5fff00',
      'colour33': '#0087ff',
      'colour160': '#d70000',
      'colour240': '#585858',
      'default': '',
    };

    if (colorMap[color] !== undefined) {
      return colorMap[color];
    }

    // 尝试解析 colour{N} 格式
    const colourMatch = color.match(/^colour(\d+)$/);
    if (colourMatch) {
      const n = parseInt(colourMatch[1], 10);
      return this.xterm256ToHex(n);
    }

    // 如果已经是 hex 格式
    if (color.startsWith('#')) {
      return color;
    }

    return '';
  }

  /**
   * xterm 256 色转 hex
   */
  private xterm256ToHex(n: number): string {
    if (n < 16) {
      // 标准 16 色
      const standard = [
        '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0',
        '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff',
      ];
      return standard[n] || '#ffffff';
    }

    if (n < 232) {
      // 216 色立方体
      const idx = n - 16;
      const r = Math.floor(idx / 36);
      const g = Math.floor((idx % 36) / 6);
      const b = idx % 6;
      const toHex = (v: number) => {
        const val = v === 0 ? 0 : 55 + v * 40;
        return val.toString(16).padStart(2, '0');
      };
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // 灰度
    const gray = 8 + (n - 232) * 10;
    const hex = gray.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
  }

  /**
   * 处理 set-option
   */
  private handleSetOption(parsed: any, request: TmuxCommandRequest): TmuxCommandResponse {
    try {
      const options = TmuxCommandParser.parseSetOptionOptions(parsed);

      // 确定目标
      let tmuxPaneId: TmuxPaneId | undefined;
      let windowId: string | undefined;

      if (options.target) {
        const targetInfo = TmuxCommandParser.parseTarget(options.target);
        if (targetInfo.type === 'pane' && targetInfo.paneId) {
          tmuxPaneId = targetInfo.paneId;
          const resolved = this.resolvePaneId(tmuxPaneId);
          if (resolved) {
            windowId = resolved.windowId;
          }
        }
      } else {
        tmuxPaneId = request.paneId;
        windowId = request.windowId;
      }

      // 处理 pane 级选项
      if (options.pane && tmuxPaneId) {
        let metadata = this.paneMetadata.get(tmuxPaneId);
        if (!metadata) {
          metadata = { tmuxPaneId };
          this.paneMetadata.set(tmuxPaneId, metadata);
        }

        switch (options.optionName) {
          case 'pane-border-style':
            this.applyPaneStyle(tmuxPaneId, metadata, options.optionValue);
            break;
          case 'pane-active-border-style':
            this.applyPaneStyle(tmuxPaneId, metadata, options.optionValue);
            break;
          case 'pane-border-format':
            // 边框格式中可能包含标题信息
            metadata.title = options.optionValue;
            break;
        }

        if (windowId) {
          const resolved = this.resolvePaneId(tmuxPaneId);
          this.emit('pane-style-changed', {
            tmuxPaneId,
            windowId,
            paneId: resolved?.paneId,
            metadata,
          });
        }
      }

      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
      };
    } catch (error: unknown) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `tmux: ${error instanceof Error ? error.message : String(error)}\n`,
      };
    }
  }

  /**
   * 获取 pane 元数据
   */
  getPaneMetadata(tmuxPaneId: TmuxPaneId): TmuxPaneMetadata | undefined {
    return this.paneMetadata.get(tmuxPaneId);
  }

  /**
   * 获取 tmux pane ID（通过内部 pane ID）
   */
  getTmuxPaneId(windowId: string, paneId: string): TmuxPaneId | undefined {
    const reverseKey = `${windowId}:${paneId}`;
    return this.reversePaneIdMap.get(reverseKey);
  }
}
