import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ptyDataBus', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('registers only one global IPC listener for multiple pane subscriptions', async () => {
    const { subscribeToPanePtyData } = await import('../ptyDataBus');

    const unsubscribeA = subscribeToPanePtyData('win-1', 'pane-a', vi.fn());
    const unsubscribeB = subscribeToPanePtyData('win-1', 'pane-b', vi.fn());

    expect(window.electronAPI.onPtyData).toHaveBeenCalledTimes(1);
    expect(window.electronAPI.offPtyData).toHaveBeenCalledTimes(0);

    unsubscribeA();
    expect(window.electronAPI.offPtyData).toHaveBeenCalledTimes(0);

    unsubscribeB();
    expect(window.electronAPI.onPtyData).toHaveBeenCalledTimes(1);
    expect(window.electronAPI.offPtyData).toHaveBeenCalledTimes(0);
  });

  it('dispatches payload only to the matched pane subscriber', async () => {
    let registeredHandler:
      | ((event: unknown, payload: { windowId: string; paneId?: string; data: string }) => void)
      | undefined;

    vi.mocked(window.electronAPI.onPtyData).mockImplementation((handler) => {
      registeredHandler = handler as typeof registeredHandler;
    });

    const { subscribeToPanePtyData } = await import('../ptyDataBus');

    const paneACallback = vi.fn();
    const paneBCallback = vi.fn();

    const unsubscribeA = subscribeToPanePtyData('win-1', 'pane-a', paneACallback);
    const unsubscribeB = subscribeToPanePtyData('win-1', 'pane-b', paneBCallback);

    expect(registeredHandler).toBeDefined();
    registeredHandler?.(null, { windowId: 'win-1', paneId: 'pane-a', data: 'hello-a' });

    expect(paneACallback).toHaveBeenCalledTimes(1);
    expect(paneACallback).toHaveBeenCalledWith({ windowId: 'win-1', paneId: 'pane-a', data: 'hello-a' });
    expect(paneBCallback).toHaveBeenCalledTimes(0);

    unsubscribeA();
    unsubscribeB();
  });

  it('replays buffered payloads after a late subscription', async () => {
    let registeredHandler:
      | ((event: unknown, payload: { windowId: string; paneId?: string; data: string }) => void)
      | undefined;

    vi.mocked(window.electronAPI.onPtyData).mockImplementation((handler) => {
      registeredHandler = handler as typeof registeredHandler;
    });

    const { subscribeToPanePtyData } = await import('../ptyDataBus');

    registeredHandler?.(null, { windowId: 'win-1', paneId: 'pane-a', data: 'buffered-output' });

    const paneACallback = vi.fn();
    const unsubscribe = subscribeToPanePtyData('win-1', 'pane-a', paneACallback);

    expect(paneACallback).toHaveBeenCalledTimes(1);
    expect(paneACallback).toHaveBeenCalledWith({ windowId: 'win-1', paneId: 'pane-a', data: 'buffered-output' });

    unsubscribe();
  });

  it('can skip buffered replay when history will be restored elsewhere', async () => {
    let registeredHandler:
      | ((event: unknown, payload: { windowId: string; paneId?: string; data: string }) => void)
      | undefined;

    vi.mocked(window.electronAPI.onPtyData).mockImplementation((handler) => {
      registeredHandler = handler as typeof registeredHandler;
    });

    const { subscribeToPanePtyData } = await import('../ptyDataBus');

    registeredHandler?.(null, { windowId: 'win-1', paneId: 'pane-a', data: 'buffered-output' });

    const paneACallback = vi.fn();
    const unsubscribe = subscribeToPanePtyData('win-1', 'pane-a', paneACallback, {
      replayBuffered: false,
    });

    expect(paneACallback).not.toHaveBeenCalled();

    registeredHandler?.(null, { windowId: 'win-1', paneId: 'pane-a', data: 'live-output' });
    expect(paneACallback).toHaveBeenCalledTimes(1);
    expect(paneACallback).toHaveBeenCalledWith({ windowId: 'win-1', paneId: 'pane-a', data: 'live-output' });

    unsubscribe();
  });
});

