import { BrowserWindow } from 'electron';
import { ViewChangedPayload } from '../../shared/types/ipc';

export interface ViewSwitcher {
  switchToTerminalView(windowId: string): void;
  switchToUnifiedView(): void;
  getCurrentView(): 'unified' | 'terminal';
  getActiveWindowId(): string | null;
}

export class ViewSwitcherImpl implements ViewSwitcher {
  private currentView: 'unified' | 'terminal' = 'unified';
  private activeWindowId: string | null = null;
  private mainWindow: BrowserWindow;
  private getValidWindowIds: () => string[];

  constructor(mainWindow: BrowserWindow, getValidWindowIds: () => string[]) {
    this.mainWindow = mainWindow;
    this.getValidWindowIds = getValidWindowIds;
  }

  switchToTerminalView(windowId: string): void {
    // 验证 windowId 是否有效
    const validIds = this.getValidWindowIds();
    if (windowId && !validIds.includes(windowId)) {
      console.warn(`[ViewSwitcher] Invalid windowId: ${windowId}`);
      return;
    }

    this.currentView = 'terminal';
    this.activeWindowId = windowId;

    const payload: ViewChangedPayload = { view: 'terminal', windowId };
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('view-changed', payload);
    }
  }

  switchToUnifiedView(): void {
    this.currentView = 'unified';
    this.activeWindowId = null;

    const payload: ViewChangedPayload = { view: 'unified' };
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('view-changed', payload);
    }
  }

  getCurrentView(): 'unified' | 'terminal' {
    return this.currentView;
  }

  getActiveWindowId(): string | null {
    return this.activeWindowId;
  }
}
