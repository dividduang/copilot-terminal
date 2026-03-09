import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWindowStore } from '../../stores/windowStore';
import { useWindowSwitcher } from '../useWindowSwitcher';
import { WindowStatus } from '../../types/window';

describe('useWindowSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWindowStore.setState({
      windows: [
        {
          id: 'window-1',
          name: 'Window 1',
          activePaneId: 'pane-1',
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          layout: {
            type: 'pane',
            id: 'pane-1',
            pane: {
              id: 'pane-1',
              cwd: 'D:/repo',
              command: 'pwsh.exe',
              status: WindowStatus.Paused,
            },
          },
        },
      ],
      activeWindowId: null,
    });
  });

  it('switches immediately after startWindow resolves', async () => {
    const startWindowSpy = vi.fn().mockResolvedValue({
      success: true,
      data: { pid: 1234, status: WindowStatus.WaitingForInput },
    });
    const checkPtyOutputSpy = vi.fn();
    (window.electronAPI as any).startWindow = startWindowSpy;
    (window.electronAPI as any).checkPtyOutput = checkPtyOutputSpy;

    const onSwitchView = vi.fn();
    const { result } = renderHook(() => useWindowSwitcher(onSwitchView));

    await act(async () => {
      await result.current.switchToWindow('window-1');
    });

    expect(startWindowSpy).toHaveBeenCalledTimes(1);
    expect(checkPtyOutputSpy).not.toHaveBeenCalled();
    expect(onSwitchView).toHaveBeenCalledWith('window-1');
    expect(useWindowStore.getState().activeWindowId).toBe('window-1');
  });
});
