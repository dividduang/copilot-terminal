import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerminalView } from '../TerminalView';
import { Window, WindowStatus } from '../../types/window';

// Mock @xterm/xterm and @xterm/addon-fit — jsdom has no canvas/WebGL
vi.mock('@xterm/xterm', () => {
  const Terminal = vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    focus: vi.fn(),
    dispose: vi.fn(),
    write: vi.fn(),
    getSelection: vi.fn().mockReturnValue(''),
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    onSelectionChange: vi.fn(() => ({ dispose: vi.fn() })),
    cols: 80,
    rows: 30,
  }));

  return { Terminal };
});

vi.mock('@xterm/addon-fit', () => {
  const FitAddon = vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
  }));
  return { FitAddon };
});

// Mock xterm CSS import
vi.mock('../../styles/xterm.css', () => ({}));

// Mock i18n
vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'zh-CN', setLanguage: vi.fn() }),
  I18nProvider: ({ children }: any) => children,
}));

// Mock react-dnd
vi.mock('react-dnd', () => ({
  useDrop: () => [{ isOver: false, canDrop: false }, vi.fn()],
  useDrag: () => [{ isDragging: false }, vi.fn()],
  DndProvider: ({ children }: any) => children,
}));

vi.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

// Mock Sidebar, QuickSwitcher, SettingsPanel, ProjectLinks, IDEIcons, hooks
vi.mock('../Sidebar', () => ({ Sidebar: () => null }));
vi.mock('../QuickSwitcher', () => ({ QuickSwitcher: () => null }));
vi.mock('../SettingsPanel', () => ({ SettingsPanel: () => null }));
vi.mock('../ProjectLinks', () => ({ ProjectLinks: () => null }));
vi.mock('../icons/IDEIcons', () => ({ IDEIcon: () => null }));
vi.mock('../../hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: () => undefined }));
vi.mock('../../hooks/useIDESettings', () => ({ useIDESettings: () => ({ enabledIDEs: [] }) }));

function createWindow(overrides?: Partial<Window>): Window {
  return {
    id: 'win-001',
    name: 'Test Terminal',
    createdAt: '2024-01-01T10:00:00Z',
    lastActiveAt: '2024-01-01T10:30:00Z',
    layout: {
      type: 'pane',
      id: 'pane-win-001',
      pane: {
        id: 'pane-win-001',
        cwd: '/home/user/project',
        command: 'claude',
        status: WindowStatus.Running,
        pid: 1234,
      },
    },
    activePaneId: 'pane-win-001',
    ...overrides,
  };
}

function makeLayoutWithStatus(status: WindowStatus, pid: number | null = 1234) {
  return {
    type: 'pane' as const,
    id: 'pane-win-001',
    pane: {
      id: 'pane-win-001',
      cwd: '/home/user/project',
      command: 'claude',
      status,
      pid,
    },
  };
}

describe('TerminalView', () => {
  const onReturn = vi.fn();
  const onWindowSwitch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the terminal view container', () => {
    render(<TerminalView window={createWindow()} onReturn={onReturn} onWindowSwitch={onWindowSwitch} isActive />);
    // The main container is a div with flex and h-screen classes
    const container = document.querySelector('.h-screen.w-screen');
    expect(container).toBeInTheDocument();
  });

  it('renders the window name', () => {
    render(<TerminalView window={createWindow()} onReturn={onReturn} onWindowSwitch={onWindowSwitch} isActive />);
    expect(screen.getByText('Test Terminal')).toBeInTheDocument();
  });

  it('renders the return button', () => {
    render(<TerminalView window={createWindow()} onReturn={onReturn} onWindowSwitch={onWindowSwitch} isActive />);
    // Return button contains ArrowLeft icon
    const buttons = screen.getAllByRole('button');
    const returnButton = buttons.find(btn => btn.querySelector('svg') && btn.closest('.flex.items-center.justify-center'));
    expect(returnButton).toBeTruthy();
  });

  it('calls onReturn when return button is clicked', async () => {
    const user = userEvent.setup();
    render(<TerminalView window={createWindow()} onReturn={onReturn} onWindowSwitch={onWindowSwitch} isActive />);

    // The return button is the first button in the toolbar
    const buttons = screen.getAllByRole('button');
    // First small icon button is the return button (ArrowLeft)
    await user.click(buttons[0]);
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it('shows split buttons in toolbar', () => {
    render(<TerminalView window={createWindow()} onReturn={onReturn} onWindowSwitch={onWindowSwitch} isActive />);
    // Split buttons have title attributes
    expect(screen.getByTitle('terminalView.splitHorizontal')).toBeInTheDocument();
    expect(screen.getByTitle('terminalView.splitVertical')).toBeInTheDocument();
  });

  it('shows archive button in toolbar', () => {
    render(<TerminalView window={createWindow()} onReturn={onReturn} onWindowSwitch={onWindowSwitch} isActive />);
    expect(screen.getByTitle('terminalView.archive')).toBeInTheDocument();
  });

  it('shows stop button when window is running', () => {
    render(<TerminalView window={createWindow()} onReturn={onReturn} onWindowSwitch={onWindowSwitch} isActive />);
    expect(screen.getByTitle('terminalView.stop')).toBeInTheDocument();
  });

  it('does not show stop button when window is paused', () => {
    const pausedWindow = createWindow({
      layout: makeLayoutWithStatus(WindowStatus.Paused, null),
    });
    render(<TerminalView window={pausedWindow} onReturn={onReturn} onWindowSwitch={onWindowSwitch} isActive />);
    expect(screen.queryByTitle('terminalView.stop')).not.toBeInTheDocument();
  });

  it('renders the terminal layout area', () => {
    render(<TerminalView window={createWindow()} onReturn={onReturn} onWindowSwitch={onWindowSwitch} isActive />);
    // The terminal area is rendered inside SplitLayout mock or DropZone
    const layoutArea = document.querySelector('.flex-1.overflow-hidden');
    expect(layoutArea).toBeInTheDocument();
  });

  it('renders git branch when present', () => {
    const windowWithBranch = createWindow({ gitBranch: 'main' });
    render(<TerminalView window={windowWithBranch} onReturn={onReturn} onWindowSwitch={onWindowSwitch} isActive />);
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('does not render git branch when absent', () => {
    render(<TerminalView window={createWindow()} onReturn={onReturn} onWindowSwitch={onWindowSwitch} isActive />);
    expect(screen.queryByText('main')).not.toBeInTheDocument();
  });
});
