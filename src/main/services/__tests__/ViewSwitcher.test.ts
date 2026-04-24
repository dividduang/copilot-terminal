import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow } from 'electron';
import { ViewSwitcherImpl } from '../ViewSwitcher';

describe('ViewSwitcher', () => {
  let mockWindow: BrowserWindow;
  let viewSwitcher: ViewSwitcherImpl;
  let getValidWindowIds: () => string[];

  beforeEach(() => {
    mockWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: {
        send: vi.fn(),
      },
    } as unknown as BrowserWindow;

    getValidWindowIds = vi.fn().mockReturnValue(['window-123', 'window-456']);
    viewSwitcher = new ViewSwitcherImpl(mockWindow, getValidWindowIds);
  });

  describe('初始状态', () => {
    it('应该初始化为统一视图', () => {
      expect(viewSwitcher.getCurrentView()).toBe('unified');
    });

    it('应该初始化时没有活跃窗口', () => {
      expect(viewSwitcher.getActiveWindowId()).toBeNull();
    });
  });

  describe('switchToTerminalView', () => {
    it('应该切换到终端视图', () => {
      viewSwitcher.switchToTerminalView('window-123');

      expect(viewSwitcher.getCurrentView()).toBe('terminal');
      expect(viewSwitcher.getActiveWindowId()).toBe('window-123');
    });

    it('应该发送 view-changed 事件到渲染进程', () => {
      viewSwitcher.switchToTerminalView('window-123');

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('view-changed', {
        view: 'terminal',
        windowId: 'window-123',
      });
    });

    it('窗口已销毁时不应该发送事件', () => {
      vi.mocked(mockWindow.isDestroyed).mockReturnValue(true);

      viewSwitcher.switchToTerminalView('window-123');

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('应该拒绝无效的窗口 ID', () => {
      viewSwitcher.switchToTerminalView('invalid-window-id');

      expect(viewSwitcher.getCurrentView()).toBe('unified');
      expect(viewSwitcher.getActiveWindowId()).toBeNull();
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('应该允许有效的窗口 ID', () => {
      const validId = 'window-123';
      vi.mocked(getValidWindowIds).mockReturnValue([validId]);

      viewSwitcher.switchToTerminalView(validId);

      expect(viewSwitcher.getCurrentView()).toBe('terminal');
      expect(viewSwitcher.getActiveWindowId()).toBe(validId);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('view-changed', {
        view: 'terminal',
        windowId: validId,
      });
    });
  });

  describe('switchToUnifiedView', () => {
    it('应该切换到统一视图', () => {
      viewSwitcher.switchToTerminalView('window-123');
      viewSwitcher.switchToUnifiedView();

      expect(viewSwitcher.getCurrentView()).toBe('unified');
      expect(viewSwitcher.getActiveWindowId()).toBeNull();
    });

    it('应该发送 view-changed 事件到渲染进程', () => {
      viewSwitcher.switchToUnifiedView();

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('view-changed', {
        view: 'unified',
      });
    });

    it('窗口已销毁时不应该发送事件', () => {
      vi.mocked(mockWindow.isDestroyed).mockReturnValue(true);

      viewSwitcher.switchToUnifiedView();

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('视图切换流程', () => {
    it('应该支持多次切换', () => {
      // 更新 mock 以包含测试中使用的窗口 ID
      vi.mocked(getValidWindowIds).mockReturnValue(['window-1', 'window-2']);

      viewSwitcher.switchToTerminalView('window-1');
      expect(viewSwitcher.getCurrentView()).toBe('terminal');
      expect(viewSwitcher.getActiveWindowId()).toBe('window-1');

      viewSwitcher.switchToUnifiedView();
      expect(viewSwitcher.getCurrentView()).toBe('unified');
      expect(viewSwitcher.getActiveWindowId()).toBeNull();

      viewSwitcher.switchToTerminalView('window-2');
      expect(viewSwitcher.getCurrentView()).toBe('terminal');
      expect(viewSwitcher.getActiveWindowId()).toBe('window-2');
    });

    it('应该在切换窗口时更新活跃窗口 ID', () => {
      // 更新 mock 以包含测试中使用的窗口 ID
      vi.mocked(getValidWindowIds).mockReturnValue(['window-1', 'window-2']);

      viewSwitcher.switchToTerminalView('window-1');
      expect(viewSwitcher.getActiveWindowId()).toBe('window-1');

      viewSwitcher.switchToTerminalView('window-2');
      expect(viewSwitcher.getActiveWindowId()).toBe('window-2');
    });
  });
});
