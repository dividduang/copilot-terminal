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

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  switchToTerminalView(windowId: string): void {
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
