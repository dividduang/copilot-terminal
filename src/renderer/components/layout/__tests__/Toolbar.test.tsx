import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from '../Toolbar';
import { useWindowStore } from '../../../stores/windowStore';
import { Window, WindowStatus } from '../../../types/window';

const makeWindow = (overrides: Partial<Window> & { id: string }): Window => ({
  name: `Window ${overrides.id}`,
  workingDirectory: `/path/${overrides.id}`,
  command: 'claude',
  status: WindowStatus.Running,
  pid: 1000,
  createdAt: '2024-01-01T10:00:00Z',
  lastActiveAt: '2024-01-01T10:00:00Z',
  layout: {
    type: 'pane',
    id: `pane-${overrides.id}`,
    pane: {
      id: `pane-${overrides.id}`,
      cwd: `/path/${overrides.id}`,
      command: 'claude',
      status: WindowStatus.Running,
      pid: 1000,
    },
  },
  activePaneId: `pane-${overrides.id}`,
  ...overrides,
});

describe('Toolbar', () => {
  beforeEach(() => {
    useWindowStore.setState({ windows: [], activeWindowId: null });
  });

  it('should render with default app name and version', () => {
    render(<Toolbar />);

    expect(screen.getByText('ausome-terminal')).toBeInTheDocument();
    expect(screen.getByText('v0.1.0')).toBeInTheDocument();
  });

  it('should render with custom app name', () => {
    render(<Toolbar appName="Custom App" />);

    expect(screen.getByText('Custom App')).toBeInTheDocument();
  });

  it('should render with custom version', () => {
    render(<Toolbar version="1.2.3" />);

    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
  });

  it('should apply correct styling classes', () => {
    const { container } = render(<Toolbar />);

    const header = container.querySelector('header');
    expect(header).toHaveClass('h-14', 'px-6', 'flex', 'items-center', 'justify-between', 'bg-bg-card', 'border-b', 'border-border-subtle');
  });

  it('should render app name as h1 with correct styling', () => {
    render(<Toolbar appName="Test App" />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Test App');
    expect(heading).toHaveClass('text-lg', 'font-semibold', 'text-text-primary');
  });

  it('should render version with secondary text color', () => {
    render(<Toolbar version="2.0.0" />);

    const version = screen.getByText('v2.0.0');
    expect(version).toHaveClass('text-sm', 'text-text-secondary');
  });

  it('should have fixed height of 56px (h-14)', () => {
    const { container } = render(<Toolbar />);

    const header = container.querySelector('header');
    expect(header).toHaveClass('h-14'); // h-14 = 56px (14 * 4px)
  });

  it('should render StatusBar inside toolbar', () => {
    const { container } = render(<Toolbar />);
    // StatusBar renders an aria-live region
    const statusBar = container.querySelector('[aria-live="polite"]');
    expect(statusBar).toBeInTheDocument();
  });

  // AC4: button only shown when windows.length > 0
  it('should not render new window button when no windows exist', () => {
    render(<Toolbar />);
    expect(screen.queryByText('+ 新建窗口')).not.toBeInTheDocument();
  });

  it('should render new window button when windows exist', () => {
    useWindowStore.getState().addWindow(makeWindow({ id: '1' }));
    render(<Toolbar />);
    expect(screen.getByText('+ 新建窗口')).toBeInTheDocument();
  });

  it('should call onCreateWindow when new window button is clicked', async () => {
    const user = userEvent.setup();
    const handleCreate = vi.fn();
    useWindowStore.getState().addWindow(makeWindow({ id: '1' }));

    render(<Toolbar onCreateWindow={handleCreate} />);

    await user.click(screen.getByText('+ 新建窗口'));
    expect(handleCreate).toHaveBeenCalledTimes(1);
  });
});
