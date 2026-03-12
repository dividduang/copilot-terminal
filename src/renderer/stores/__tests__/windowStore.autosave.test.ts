import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWindowStore, WindowStatus } from '../windowStore';
import { createSinglePaneWindow } from '../../utils/layoutHelpers';

describe('windowStore auto-save gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWindowStore.setState({
      windows: [],
      activeWindowId: null,
      mruList: [],
      sidebarExpanded: false,
      sidebarWidth: 200,
    });
  });

  it('does not auto-save when switching the active pane', () => {
    const terminalWindow = createSinglePaneWindow('Team Lead', 'D:\\repo', 'pwsh.exe');
    const originalPaneId = terminalWindow.activePaneId;
    const teammatePaneId = 'pane-teammate';

    terminalWindow.layout = {
      type: 'split',
      direction: 'horizontal',
      sizes: [0.5, 0.5],
      children: [
        terminalWindow.layout,
        {
          type: 'pane',
          id: teammatePaneId,
          pane: {
            id: teammatePaneId,
            cwd: 'D:\\repo',
            command: 'pwsh.exe',
            status: WindowStatus.Paused,
            pid: null,
          },
        },
      ],
    };

    useWindowStore.setState({
      windows: [terminalWindow],
      activeWindowId: terminalWindow.id,
      mruList: [terminalWindow.id],
      sidebarExpanded: false,
      sidebarWidth: 200,
    });

    useWindowStore.getState().setActivePane(terminalWindow.id, teammatePaneId);

    expect(useWindowStore.getState().windows[0].activePaneId).toBe(teammatePaneId);
    expect(useWindowStore.getState().windows[0].activePaneId).not.toBe(originalPaneId);
    expect(window.electronAPI.setActivePane).toHaveBeenCalledWith(terminalWindow.id, teammatePaneId);
    expect(window.electronAPI.triggerAutoSave).not.toHaveBeenCalled();
  });

  it('does not auto-save when switching the active window', () => {
    const windowOne = createSinglePaneWindow('One', 'D:\\repo-one', 'pwsh.exe');
    const windowTwo = createSinglePaneWindow('Two', 'D:\\repo-two', 'pwsh.exe');

    useWindowStore.setState({
      windows: [windowOne, windowTwo],
      activeWindowId: windowOne.id,
      mruList: [windowOne.id, windowTwo.id],
      sidebarExpanded: false,
      sidebarWidth: 200,
    });

    useWindowStore.getState().setActiveWindow(windowTwo.id);

    expect(useWindowStore.getState().activeWindowId).toBe(windowTwo.id);
    expect(useWindowStore.getState().mruList[0]).toBe(windowTwo.id);
    expect(window.electronAPI.triggerAutoSave).not.toHaveBeenCalled();
  });

  it('does not auto-save runtime-only pane updates', () => {
    const terminalWindow = createSinglePaneWindow('Pane Runtime', 'D:\\repo', 'pwsh.exe');
    const paneId = terminalWindow.activePaneId;

    useWindowStore.setState({
      windows: [terminalWindow],
      activeWindowId: terminalWindow.id,
      mruList: [terminalWindow.id],
      sidebarExpanded: false,
      sidebarWidth: 200,
    });

    useWindowStore.getState().updatePane(terminalWindow.id, paneId, {
      status: WindowStatus.Running,
      pid: 4321,
      title: 'team-lead',
    });

    const pane = useWindowStore.getState().getPaneById(terminalWindow.id, paneId);
    expect(pane).toMatchObject({
      status: WindowStatus.Running,
      pid: 4321,
      title: 'team-lead',
    });
    expect(window.electronAPI.triggerAutoSave).not.toHaveBeenCalled();
  });

  it('does not auto-save when updating claude runtime fields', () => {
    const terminalWindow = createSinglePaneWindow('Claude', 'D:\\repo', 'pwsh.exe');

    useWindowStore.setState({
      windows: [terminalWindow],
      activeWindowId: terminalWindow.id,
      mruList: [terminalWindow.id],
      sidebarExpanded: false,
      sidebarWidth: 200,
    });

    useWindowStore.getState().updateClaudeModel(
      terminalWindow.id,
      'Claude Opus 4',
      'claude-opus-4',
      82,
      1.23,
    );

    const storedWindow = useWindowStore.getState().windows[0] as typeof terminalWindow & {
      claudeModel?: string;
      claudeModelId?: string;
      claudeContextPercentage?: number;
      claudeCost?: number;
    };

    expect(storedWindow.claudeModel).toBe('Claude Opus 4');
    expect(storedWindow.claudeModelId).toBe('claude-opus-4');
    expect(storedWindow.claudeContextPercentage).toBe(82);
    expect(storedWindow.claudeCost).toBe(1.23);
    expect(window.electronAPI.triggerAutoSave).not.toHaveBeenCalled();
  });
});
