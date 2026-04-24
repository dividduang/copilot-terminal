import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TerminalPane } from '../TerminalPane';
import { WindowStatus } from '../../types/window';

const { fitAddonInstances } = vi.hoisted(() => ({
  fitAddonInstances: [] as Array<{
    fit: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    dispose: vi.fn(),
    write: vi.fn((data: string, callback?: () => void) => {
      callback?.();
    }),
    getSelection: vi.fn().mockReturnValue(''),
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    onSelectionChange: vi.fn(() => ({ dispose: vi.fn() })),
    attachCustomKeyEventHandler: vi.fn(),
    cols: 120,
    rows: 40,
  })),
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => {
    const instance = {
      fit: vi.fn(),
    };
    fitAddonInstances.push(instance);
    return instance;
  }),
}));

vi.mock('../../api/ptyDataBus', () => ({
  subscribeToPanePtyData: vi.fn(() => vi.fn()),
}));

vi.mock('../../styles/xterm.css', () => ({}));

// Mock i18n
vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'zh-CN', setLanguage: vi.fn() }),
  I18nProvider: ({ children }: any) => children,
}));

describe('TerminalPane resize on resume', () => {
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fitAddonInstances.length = 0;
    // Suppress React error boundary warnings from component cleanup errors
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 900,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 600,
    });

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();

    if (originalClientWidth) {
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    }
    if (originalClientHeight) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
    }

    if (originalRequestAnimationFrame) {
      vi.stubGlobal('requestAnimationFrame', originalRequestAnimationFrame);
    }
    if (originalCancelAnimationFrame) {
      vi.stubGlobal('cancelAnimationFrame', originalCancelAnimationFrame);
    }
  });

  it('forces fit and pty resize when pane resumes from paused', async () => {
    const { rerender } = render(
      <TerminalPane
        windowId="win-1"
        pane={{
          id: 'pane-1',
          cwd: 'D:\\tmp',
          command: 'pwsh.exe',
          status: WindowStatus.Paused,
          pid: 1234,
        }}
        isActive
        isWindowActive
        onActivate={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(window.electronAPI.ptyResize).toHaveBeenCalled();
    });

    vi.mocked(window.electronAPI.ptyResize).mockClear();
    fitAddonInstances[0]?.fit.mockClear();

    rerender(
      <TerminalPane
        windowId="win-1"
        pane={{
          id: 'pane-1',
          cwd: 'D:\\tmp',
          command: 'pwsh.exe',
          status: WindowStatus.Running,
          pid: 1234,
        }}
        isActive
        isWindowActive
        onActivate={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(fitAddonInstances[0]?.fit).toHaveBeenCalledTimes(1);
      expect(window.electronAPI.ptyResize).toHaveBeenCalledWith('win-1', 'pane-1', 120, 40);
    });
  });

  it('swaps the tmux header status icon with the close button on hover', () => {
    const onClose = vi.fn();
    const { container } = render(
      <TerminalPane
        windowId="win-1"
        pane={{
          id: 'pane-1',
          cwd: 'D:\\tmp',
          command: 'pwsh.exe',
          status: WindowStatus.Running,
          pid: 1234,
          title: 'agent-1',
          agentName: 'agent-1',
        }}
        isActive
        isWindowActive
        onActivate={vi.fn()}
        onClose={onClose}
      />
    );

    // i18n mock returns key names, not translated text
    expect(screen.getByTitle('terminalPane.status')).toBeInTheDocument();
    expect(screen.queryByTitle('terminalPane.close')).not.toBeInTheDocument();

    fireEvent.mouseEnter(container.firstElementChild as HTMLElement);

    expect(screen.queryByTitle('terminalPane.status')).not.toBeInTheDocument();
    const closeButton = screen.getByTitle('terminalPane.close');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).not.toHaveClass('absolute');

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
