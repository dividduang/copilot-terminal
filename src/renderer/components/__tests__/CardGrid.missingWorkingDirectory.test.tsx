import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CardGrid } from '../CardGrid';
import { useWindowStore } from '../../stores/windowStore';
import { Window, WindowStatus } from '../../types/window';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, string | number>) => {
      if (params) {
        return Object.entries(params).reduce((str, [key, val]) => str.replace(`{${key}}`, String(val)), k);
      }
      return k;
    },
    language: 'zh-CN',
    setLanguage: vi.fn(),
  }),
  formatRelativeTime: () => '刚刚',
}));

function renderWithDnd(ui: React.ReactElement) {
  return render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);
}

function makeWindow(overrides: Partial<Window> = {}): Window {
  const paneId = overrides.activePaneId || 'pane-1';

  return {
    id: 'win-1',
    name: 'Test Window',
    activePaneId: paneId,
    createdAt: '2024-01-01T10:00:00Z',
    lastActiveAt: '2024-01-01T10:00:00Z',
    layout: {
      type: 'pane',
      id: paneId,
      pane: {
        id: paneId,
        cwd: 'D:\\missing\\repo',
        command: 'pwsh.exe',
        status: WindowStatus.Paused,
        pid: null,
      },
    },
    ...overrides,
  };
}

/** Click the WindowCard that contains the given text */
async function clickWindowCard(text: string, user: ReturnType<typeof userEvent.setup>) {
  const nameEl = screen.getByText(text);
  const card = nameEl.closest('[role="button"]')!;
  await user.click(card);
}

describe('CardGrid missing working directory guard', () => {
  beforeEach(() => {
    useWindowStore.setState({
      windows: [],
      activeWindowId: null,
      mruList: [],
      sidebarExpanded: false,
      sidebarWidth: 200,
      groups: [],
      customCategories: [],
      hideGroupedWindows: false,
    });
    vi.clearAllMocks();
    vi.mocked(window.electronAPI.getSettings).mockResolvedValue({
      success: true,
      data: {
        language: 'zh-CN',
        ides: [
          { id: 'vscode', name: 'VS Code', command: 'code', enabled: true, icon: '' },
        ],
        quickNav: { items: [] },
        terminal: { useBundledConptyDll: false, defaultShellProgram: '' },
      },
    });
  });

  it('enters terminal immediately when working directory exists', async () => {
    const user = userEvent.setup();
    const handleEnterTerminal = vi.fn();
    const terminalWindow = makeWindow();

    useWindowStore.getState().addWindow(terminalWindow);
    vi.mocked(window.electronAPI.validatePath).mockResolvedValueOnce({ success: true, data: true });

    renderWithDnd(<CardGrid onEnterTerminal={handleEnterTerminal} />);

    await clickWindowCard('Test Window', user);

    await waitFor(() => {
      expect(handleEnterTerminal).toHaveBeenCalledWith(terminalWindow);
    });
    expect(screen.queryByText('windowDirectory.missingTitle')).not.toBeInTheDocument();
  });

  it('creates the missing directory and then enters terminal', async () => {
    const user = userEvent.setup();
    const handleEnterTerminal = vi.fn();
    const terminalWindow = makeWindow();

    useWindowStore.getState().addWindow(terminalWindow);
    vi.mocked(window.electronAPI.validatePath).mockResolvedValueOnce({ success: true, data: false });
    vi.mocked(window.electronAPI.createDirectory).mockResolvedValueOnce({
      success: true,
      data: 'D:\\missing\\repo',
    });

    renderWithDnd(<CardGrid onEnterTerminal={handleEnterTerminal} />);

    await clickWindowCard('Test Window', user);

    expect(await screen.findByText('windowDirectory.missingTitle')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'windowDirectory.autoCreate' }));

    await waitFor(() => {
      expect(window.electronAPI.createDirectory).toHaveBeenCalledWith('D:\\missing\\repo');
      expect(handleEnterTerminal).toHaveBeenCalledWith(terminalWindow);
    });
  });

  it('deletes the window when user chooses delete', async () => {
    const user = userEvent.setup();
    const handleEnterTerminal = vi.fn();

    useWindowStore.getState().addWindow(makeWindow());
    vi.mocked(window.electronAPI.validatePath).mockResolvedValueOnce({ success: true, data: false });
    vi.mocked(window.electronAPI.deleteWindow).mockResolvedValueOnce({ success: true });

    renderWithDnd(<CardGrid onEnterTerminal={handleEnterTerminal} />);

    await clickWindowCard('Test Window', user);
    await user.click(await screen.findByRole('button', { name: 'windowDirectory.deleteWindow' }));

    await waitFor(() => {
      expect(window.electronAPI.deleteWindow).toHaveBeenCalledWith('win-1');
      expect(useWindowStore.getState().windows).toHaveLength(0);
    });
    expect(handleEnterTerminal).not.toHaveBeenCalled();
  });

  it('applies the same missing-directory guard to the start button', async () => {
    const user = userEvent.setup();

    useWindowStore.getState().addWindow(makeWindow());
    vi.mocked(window.electronAPI.validatePath).mockResolvedValueOnce({ success: true, data: false });

    renderWithDnd(<CardGrid />);

    await user.click(screen.getByRole('button', { name: 'windowCard.start' }));

    expect(await screen.findByText('windowDirectory.missingTitle')).toBeInTheDocument();
    expect(window.electronAPI.startWindow).not.toHaveBeenCalled();
  });

  it('applies the same missing-directory guard to the open folder button', async () => {
    const user = userEvent.setup();
    const runningWindow = makeWindow({
      layout: {
        type: 'pane',
        id: 'pane-1',
        pane: {
          id: 'pane-1',
          cwd: 'D:\\missing\\repo',
          command: 'pwsh.exe',
          status: WindowStatus.Running,
          pid: 42,
        },
      },
    });

    useWindowStore.getState().addWindow(runningWindow);
    vi.mocked(window.electronAPI.validatePath).mockResolvedValueOnce({ success: true, data: false });

    renderWithDnd(<CardGrid />);

    await user.click(screen.getByRole('button', { name: 'common.openFolder' }));

    expect(await screen.findByText('windowDirectory.missingTitle')).toBeInTheDocument();
    expect(window.electronAPI.openFolder).not.toHaveBeenCalled();
  });

  it('applies the same missing-directory guard to the IDE button', async () => {
    const user = userEvent.setup();
    const runningWindow = makeWindow({
      layout: {
        type: 'pane',
        id: 'pane-1',
        pane: {
          id: 'pane-1',
          cwd: 'D:\\missing\\repo',
          command: 'pwsh.exe',
          status: WindowStatus.Running,
          pid: 42,
        },
      },
    });

    useWindowStore.getState().addWindow(runningWindow);
    vi.mocked(window.electronAPI.validatePath).mockResolvedValueOnce({ success: true, data: false });

    renderWithDnd(<CardGrid />);

    // IDE button aria-label is t('common.openInIDE', { name: ide.name }) which resolves to 'common.openInIDE' (key has no placeholder matched)
    await waitFor(() => {
      const ideButtons = screen.getAllByRole('button').filter(b => b.getAttribute('aria-label')?.includes('common.openInIDE'));
      expect(ideButtons.length).toBeGreaterThan(0);
    });
    const ideButton = screen.getAllByRole('button').find(b => b.getAttribute('aria-label')?.includes('common.openInIDE'))!;
    await user.click(ideButton);

    expect(await screen.findByText('windowDirectory.missingTitle')).toBeInTheDocument();
    expect(window.electronAPI.openInIDE).not.toHaveBeenCalled();
  });
});
