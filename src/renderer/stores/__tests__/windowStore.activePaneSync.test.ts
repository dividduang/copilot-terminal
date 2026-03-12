import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWindowStore } from '../windowStore';
import { createSinglePaneWindow } from '../../utils/layoutHelpers';

describe('windowStore active pane sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWindowStore.setState({ windows: [], activeWindowId: null, mruList: [] });
  });

  it('syncs active pane changes to the main process', () => {
    const terminalWindow = createSinglePaneWindow('Test', 'D:\\repo', 'pwsh.exe');
    const paneId = terminalWindow.activePaneId;

    useWindowStore.setState({
      windows: [terminalWindow],
      activeWindowId: terminalWindow.id,
      mruList: [terminalWindow.id],
    });

    useWindowStore.getState().setActivePane(terminalWindow.id, paneId);

    expect(window.electronAPI.setActivePane).toHaveBeenCalledWith(terminalWindow.id, paneId);
  });
});
