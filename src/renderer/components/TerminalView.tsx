import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ArrowLeft } from 'lucide-react';
import { Window } from '../types/window';
import { getStatusLabel, getStatusTextColor } from '../utils/statusHelpers';
import '../styles/xterm.css';

export interface TerminalViewProps {
  window: Window;
  onReturn: () => void;
}

/**
 * TerminalView 组件
 * 切入窗口后的 CLI 全屏视图，集成 xterm.js 渲染终端
 */
export const TerminalView: React.FC<TerminalViewProps> = ({ window: terminalWindow, onReturn }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const statusLabel = getStatusLabel(terminalWindow.status);
  const statusTextColor = getStatusTextColor(terminalWindow.status);

  // 初始化 xterm.js
  useEffect(() => {
    if (!terminalContainerRef.current) return;

    const terminal = new Terminal({
      cols: 80,
      rows: 30,
      theme: {
        background: '#0f0f0f',
        foreground: '#e0e0e0',
        cursor: '#e0e0e0',
        selectionBackground: '#0087ff',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalContainerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 等待容器渲染完成后调整尺寸
    requestAnimationFrame(() => {
      if (!fitAddonRef.current || !terminalRef.current) return;

      // 调整终端尺寸以适应容器
      fitAddonRef.current.fit();
      const { cols, rows } = terminalRef.current;

      // 同步尺寸到 PTY
      window.electronAPI?.ptyResize(terminalWindow.id, cols, rows);

      // 加载历史输出
      window.electronAPI?.getPtyHistory(terminalWindow.id).then((history) => {
        if (history && history.length > 0 && terminalRef.current) {
          for (const data of history) {
            terminalRef.current.write(data);
          }
        }
      }).catch(() => {
        // 忽略错误，继续正常流程
      });
    });

    // 划选复制：选中文本自动复制到剪贴板
    terminal.onSelectionChange(() => {
      const selection = terminal.getSelection();
      if (selection && navigator.clipboard) {
        navigator.clipboard.writeText(selection).catch(() => {});
      }
    });

    // 用户输入 → PTY
    terminal.onData((data: string) => {
      window.electronAPI?.ptyWrite(terminalWindow.id, data);
    });

    // PTY 输出 → 终端
    const ptyDataHandler = (_event: unknown, payload: { windowId: string; data: string }) => {
      if (payload.windowId === terminalWindow.id) {
        terminal.write(payload.data);
      }
    };
    window.electronAPI?.onPtyData(ptyDataHandler);

    // 聚焦终端
    terminal.focus();

    return () => {
      window.electronAPI?.offPtyData(ptyDataHandler);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [terminalWindow.id]);

  // 右键粘贴
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (navigator.clipboard) {
      navigator.clipboard.readText().then((text) => {
        if (text && terminalRef.current) {
          window.electronAPI?.ptyWrite(terminalWindow.id, text);
        }
      }).catch(() => {});
    }
  }, [terminalWindow.id]);

  // Esc 键返回统一视图（在 xterm 捕获之前处理）
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onReturn();
    }
  }, [onReturn]);

  // ResizeObserver 监听容器大小变化
  useEffect(() => {
    if (!terminalContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        try {
          fitAddonRef.current.fit();
          const { cols, rows } = terminalRef.current;
          window.electronAPI?.ptyResize(terminalWindow.id, cols, rows);
        } catch {
          // fit() may throw if terminal is not yet ready
        }
      }
    });

    resizeObserver.observe(terminalContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [terminalWindow.id]);

  return (
    <div
      className="flex flex-col h-full bg-zinc-900"
      onKeyDown={handleKeyDown}
      data-testid="terminal-view"
      tabIndex={-1}
    >
      {/* 顶部窄条 (40px) */}
      <div
        className="flex items-center gap-2 px-2 py-2 bg-zinc-900 border-b border-zinc-800 flex-shrink-0"
        style={{ height: '40px' }}
        data-testid="terminal-topbar"
      >
        {/* 返回按钮 */}
        <button
          onClick={onReturn}
          aria-label="返回统一视图"
          className="flex items-center justify-center w-8 h-8 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex-shrink-0"
          data-testid="return-button"
        >
          <ArrowLeft size={16} />
        </button>

        {/* 窗口名称 */}
        <span
          className="text-base font-semibold text-zinc-100 truncate flex-1"
          data-testid="window-name"
        >
          {terminalWindow.name}
        </span>

        {/* 状态标签 */}
        <span
          className={`text-xs flex-shrink-0 ${statusTextColor}`}
          data-testid="status-label"
        >
          {statusLabel}
        </span>
      </div>

      {/* 终端内容区 */}
      <div
        ref={terminalContainerRef}
        onContextMenu={handleContextMenu}
        className="flex-1 overflow-hidden"
        data-testid="terminal-container"
        style={{ minHeight: 0 }}
      />
    </div>
  );
};

TerminalView.displayName = 'TerminalView';
