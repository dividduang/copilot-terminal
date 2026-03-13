import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerPtyHandlers } from '../ptyHandlers';
import type { HandlerContext } from '../HandlerContext';

const { mockIpcHandle } = vi.hoisted(() => ({
  mockIpcHandle: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockIpcHandle,
  },
}));

function getRegisteredHandler(channel: string) {
  const call = mockIpcHandle.mock.calls.find(([name]) => name === channel);
  expect(call, `IPC handler ${channel} should be registered`).toBeTruthy();
  return call?.[1] as (event: unknown, payload: unknown) => Promise<unknown>;
}

describe('registerPtyHandlers', () => {
  beforeEach(() => {
    mockIpcHandle.mockReset();
  });

  it('returns pane PTY history from ProcessManager', async () => {
    const processManager = {
      getPidByPane: vi.fn(),
      listProcesses: vi.fn(),
      writeToPty: vi.fn(),
      resizePty: vi.fn(),
      getPtyHistory: vi.fn().mockReturnValue({ chunks: ['line-1', 'line-2'], lastSeq: 2 }),
    };
    const ctx = {
      processManager,
    } as unknown as HandlerContext;

    registerPtyHandlers(ctx);
    const historyHandler = getRegisteredHandler('get-pty-history');

    const response = await historyHandler({}, { paneId: 'pane-1' }) as {
      success: boolean;
      data?: { chunks: string[]; lastSeq: number };
    };

    expect(processManager.getPtyHistory).toHaveBeenCalledWith('pane-1');
    expect(response).toEqual({
      success: true,
      data: { chunks: ['line-1', 'line-2'], lastSeq: 2 },
    });
  });
});
