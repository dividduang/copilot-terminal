import { useEffect, useRef } from 'react';

interface KeyboardShortcutsOptions {
  onCtrlTab?: () => void;
  onCtrlShiftTab?: () => void;
  onCtrlP?: () => void;
  onCtrlB?: () => void;
  onCtrlNumber?: (num: number) => void;
  onEscape?: () => void;
  enabled?: boolean;
}

/**
 * 全局快捷键 Hook
 * 处理终端视图中的快捷键
 * 使用 ref 模式避免 stale closure 问题，listener 只注册一次
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  // 同步更新 ref，始终持有最新的 options（包含最新的 enabled 和所有回调）
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const opts = optionsRef.current;
      const enabled = opts.enabled !== false; // 默认 true

      console.log('[Shortcuts] keydown:', e.key, 'ctrl:', e.ctrlKey, 'enabled:', enabled, 'target:', (e.target as HTMLElement)?.tagName);

      if (!enabled) return;

      // Ctrl+Tab: 切换到下一个窗口
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        console.log('[Shortcuts] Ctrl+Tab triggered');
        e.preventDefault();
        opts.onCtrlTab?.();
        return;
      }

      // Ctrl+Shift+Tab: 切换到上一个窗口
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        console.log('[Shortcuts] Ctrl+Shift+Tab triggered');
        e.preventDefault();
        opts.onCtrlShiftTab?.();
        return;
      }

      // Ctrl+P: 打开快速切换面板
      if (e.ctrlKey && e.key === 'p') {
        console.log('[Shortcuts] Ctrl+P triggered');
        e.preventDefault();
        opts.onCtrlP?.();
        return;
      }

      // Ctrl+B: 切换侧边栏
      if (e.ctrlKey && e.key === 'b') {
        console.log('[Shortcuts] Ctrl+B triggered');
        e.preventDefault();
        opts.onCtrlB?.();
        return;
      }

      // Ctrl+1~9: 切换到第 N 个窗口
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        console.log('[Shortcuts] Ctrl+' + e.key + ' triggered');
        e.preventDefault();
        opts.onCtrlNumber?.(parseInt(e.key, 10));
        return;
      }

      // Escape: 关闭打开的面板（QuickSwitcher、TabSwitcher）
      if (e.key === 'Escape') {
        console.log('[Shortcuts] Escape triggered');
        // 只在有面板打开时才调用回调，否则保持原生默认行为
        if (opts.onEscape) {
          opts.onEscape();
        }
        // 不阻止默认行为，让 ESC 在终端中正常工作
        return;
      }
    };

    console.log('[Shortcuts] Registering keydown listener (capture phase)');
    // 使用捕获阶段监听，确保在 xterm.js 之前处理快捷键
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      console.log('[Shortcuts] Removing keydown listener');
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []); // 空依赖数组：listener 只注册一次，通过 ref 读取最新值
}
