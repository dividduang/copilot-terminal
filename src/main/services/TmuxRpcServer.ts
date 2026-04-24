/**
 * TmuxRpcServer - tmux RPC 服务器
 *
 * 为每个 window 创建一个 named pipe（Windows）或 Unix domain socket 服务器，
 * 接收来自 fake tmux shim 的 RPC 请求，调用 TmuxCompatService 处理命令，
 * 返回 JSON 格式的响应。
 *
 * 协议：每个连接发送一个 JSON 请求，服务器返回一个 JSON 响应后关闭连接。
 * 消息使用换行符分隔（newline-delimited JSON）。
 */

import * as net from 'net';
import * as fs from 'fs';
import { platform } from 'os';
import { ITmuxCompatService, TmuxCommandRequest } from '../../shared/types/tmux';

/**
 * RPC 请求消息格式
 */
interface TmuxRpcRequest {
  type: 'request';
  requestId: string;
  request: TmuxCommandRequest;
}

/**
 * RPC 响应消息格式
 */
interface TmuxRpcResponse {
  type: 'response';
  requestId: string;
  response?: {
    exitCode: number;
    stdout: string;
    stderr: string;
  };
  error?: string;
  errorCode?: string;
}

/**
 * 验证请求消息格式
 */
function isValidRequest(data: unknown): data is TmuxRpcRequest {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return (
    msg.type === 'request' &&
    typeof msg.requestId === 'string' &&
    msg.request != null &&
    typeof msg.request === 'object' &&
    Array.isArray((msg.request as Record<string, unknown>).argv)
  );
}

/**
 * TmuxRpcServer 配置
 */
export interface TmuxRpcServerConfig {
  /** TmuxCompatService 实例 */
  tmuxCompatService: ITmuxCompatService;

  /** 是否启用调试日志 */
  debug?: boolean;
}

/**
 * 单个 window 的 RPC 服务器实例
 */
interface WindowServer {
  server: net.Server;
  socketPath: string;
  activeConnections: Set<net.Socket>;
}

/**
 * TmuxRpcServer
 *
 * 管理所有 window 的 RPC 服务器生命周期。
 * 每个 window 对应一个 named pipe / Unix socket。
 */
export class TmuxRpcServer {
  private config: TmuxRpcServerConfig;
  private servers: Map<string, WindowServer> = new Map();
  private destroyed = false;

  constructor(config: TmuxRpcServerConfig) {
    this.config = config;
  }

  /**
   * 为指定 window 启动 RPC 服务器
   *
   * @returns socket 路径（用于注入到环境变量 AUSOME_TMUX_RPC）
   */
  async startServer(windowId: string): Promise<string> {
    if (this.destroyed) {
      throw new Error('TmuxRpcServer has been destroyed');
    }

    // 如果已有服务器，先关闭
    if (this.servers.has(windowId)) {
      await this.stopServer(windowId);
    }

    const socketPath = this.getSocketPath(windowId);

    // Unix: 清理可能残留的 socket 文件
    if (platform() !== 'win32') {
      try {
        fs.unlinkSync(socketPath);
      } catch {
        // 文件不存在，忽略
      }
    }

    return new Promise<string>((resolve, reject) => {
      const activeConnections = new Set<net.Socket>();

      const server = net.createServer({ allowHalfOpen: true }, (socket) => {
        this.handleConnection(windowId, socket, activeConnections);
      });

      server.on('error', (err) => {
        console.error(`[TmuxRpcServer] Server error for window ${windowId}:`, err.message);
      });

      server.listen(socketPath, () => {
        // Unix: 设置 socket 文件权限为 0600
        if (platform() !== 'win32') {
          try {
            fs.chmodSync(socketPath, 0o600);
          } catch (err) {
            console.error(`[TmuxRpcServer] WARNING: Failed to set socket permissions to 0600. Socket may be accessible to other users:`, err);
            console.error(`[TmuxRpcServer] Socket path: ${socketPath}`);
          }
        }

        this.servers.set(windowId, { server, socketPath, activeConnections });

        if (this.config.debug) {
          console.log(`[TmuxRpcServer] Server started for window ${windowId} at ${socketPath}`);
        }

        resolve(socketPath);
      });

      server.on('error', (err) => {
        // 如果 listen 失败，reject promise
        if (!this.servers.has(windowId)) {
          reject(err);
        }
      });
    });
  }

  /**
   * 停止指定 window 的 RPC 服务器
   */
  async stopServer(windowId: string): Promise<void> {
    const entry = this.servers.get(windowId);
    if (!entry) return;

    this.servers.delete(windowId);

    // 关闭所有活跃连接
    for (const socket of entry.activeConnections) {
      try {
        socket.destroy();
      } catch {
        // 忽略
      }
    }
    entry.activeConnections.clear();

    // 关闭服务器
    await new Promise<void>((resolve) => {
      entry.server.close(() => resolve());
    });

    // Unix: 清理 socket 文件
    if (platform() !== 'win32') {
      try {
        fs.unlinkSync(entry.socketPath);
      } catch {
        // 忽略
      }
    }

    if (this.config.debug) {
      console.log(`[TmuxRpcServer] Server stopped for window ${windowId}`);
    }
  }

  /**
   * 获取指定 window 的 socket 路径
   */
  getSocketPath(windowId: string): string {
    // 验证 windowId 格式（应为字母数字、下划线、连字符，防止路径注入）
    if (!/^[a-zA-Z0-9_-]+$/.test(windowId)) {
      throw new Error(`Invalid windowId format: ${windowId}`);
    }
    if (platform() === 'win32') {
      return `\\\\.\\pipe\\ausome-tmux-${windowId}`;
    } else {
      return `/tmp/ausome-tmux-${windowId}.sock`;
    }
  }

  /**
   * 检查指定 window 是否有运行中的 RPC 服务器
   */
  hasServer(windowId: string): boolean {
    return this.servers.has(windowId);
  }

  /**
   * 销毁所有 RPC 服务器
   */
  async destroy(): Promise<void> {
    this.destroyed = true;

    const windowIds = Array.from(this.servers.keys());
    await Promise.all(windowIds.map((id) => this.stopServer(id)));

    if (this.config.debug) {
      console.log('[TmuxRpcServer] All servers destroyed');
    }
  }

  /**
   * 处理单个客户端连接
   *
   * 每个连接：接收完整 JSON 请求 → 执行命令 → 返回 JSON 响应 → 关闭连接
   */
  private handleConnection(
    windowId: string,
    socket: net.Socket,
    activeConnections: Set<net.Socket>,
  ): void {
    activeConnections.add(socket);

    let buffer = '';
    const REQUEST_TIMEOUT_MS = 30000;

    // 设置超时
    const timeout = setTimeout(() => {
      if (this.config.debug) {
        console.warn(`[TmuxRpcServer] Connection timeout for window ${windowId}`);
      }
      socket.destroy();
    }, REQUEST_TIMEOUT_MS);

    socket.on('data', (chunk) => {
      buffer += chunk.toString();

      // 尝试解析完整的 JSON 消息（以换行符分隔）
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx !== -1) {
        const messageStr = buffer.substring(0, newlineIdx);
        buffer = buffer.substring(newlineIdx + 1);

        clearTimeout(timeout);
        this.processRequest(windowId, messageStr, socket);
      }
    });

    // 如果客户端关闭连接前没有换行符，尝试解析整个 buffer
    socket.on('end', () => {
      clearTimeout(timeout);

      if (buffer.trim().length > 0) {
        this.processRequest(windowId, buffer.trim(), socket);
      }

      activeConnections.delete(socket);
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);

      if (this.config.debug) {
        console.error(`[TmuxRpcServer] Socket error for window ${windowId}:`, err.message);
      }

      activeConnections.delete(socket);
    });

    socket.on('close', () => {
      clearTimeout(timeout);
      activeConnections.delete(socket);
    });
  }

  /**
   * 处理单个 RPC 请求
   */
  private async processRequest(
    windowId: string,
    messageStr: string,
    socket: net.Socket,
  ): Promise<void> {
    const startTime = Date.now();
    let requestId = 'unknown';

    try {
      // 解析 JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(messageStr);
      } catch {
        this.sendError(socket, requestId, 'Invalid JSON');
        return;
      }

      // 验证消息格式
      if (!isValidRequest(parsed)) {
        this.sendError(socket, (parsed as any)?.requestId ?? requestId, 'Invalid request format');
        return;
      }

      requestId = parsed.requestId;

      if (this.config.debug) {
        console.log(`[TmuxRpcServer] Request ${requestId} from window ${windowId}:`, parsed.request.argv);
      }

      // 执行命令
      const response = await this.config.tmuxCompatService.executeCommand(parsed.request);

      // 发送响应
      const rpcResponse: TmuxRpcResponse = {
        type: 'response',
        requestId,
        response,
      };

      this.sendResponse(socket, rpcResponse);

      const duration = Date.now() - startTime;
      if (this.config.debug || duration > 100) {
        console.log(
          `[TmuxRpcServer] Request ${requestId} completed in ${duration}ms ` +
          `(exitCode=${response.exitCode}, argv=${parsed.request.argv.join(' ')})`
        );
      }
    } catch (error) {
      console.error(`[TmuxRpcServer] Error processing request ${requestId}:`, error);
      this.sendError(socket, requestId, error instanceof Error ? error.message : 'Internal error');
    }
  }

  /**
   * 发送成功响应
   */
  private sendResponse(socket: net.Socket, response: TmuxRpcResponse): void {
    try {
      if (!socket.destroyed) {
        socket.end(JSON.stringify(response) + '\n');
      }
    } catch (err) {
      if (this.config.debug) {
        console.error('[TmuxRpcServer] Failed to send response:', err);
      }
    }
  }

  /**
   * 发送错误响应
   */
  private sendError(socket: net.Socket, requestId: string, errorMessage: string, errorCode?: string): void {
    const response: TmuxRpcResponse = {
      type: 'response',
      requestId,
      error: errorMessage,
      ...(errorCode && { errorCode }),
    };
    this.sendResponse(socket, response);
  }
}
