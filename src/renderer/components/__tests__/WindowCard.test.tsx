import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WindowCard } from '../WindowCard';
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

vi.mock('../../hooks/useIDESettings', () => ({
  useIDESettings: () => ({ enabledIDEs: [] }),
}));

describe('WindowCard', () => {
  const mockWindow: Window = {
    id: '123',
    name: 'Test Window',
    workingDirectory: '/home/user/project',
    command: 'claude',
    status: WindowStatus.Running,
    pid: 1234,
    createdAt: '2024-01-01T10:00:00Z',
    lastActiveAt: '2024-01-01T10:30:00Z',
    model: 'Claude Opus 4.6',
    lastOutput: 'Some output text',
    layout: {
      type: 'pane',
      id: 'pane-123',
      pane: {
        id: 'pane-123',
        cwd: '/home/user/project',
        command: 'claude',
        status: WindowStatus.Running,
        pid: 1234,
      },
    },
    activePaneId: 'pane-123',
  };

  /** Helper: get the outer card element (role=button with tabIndex=0) */
  function getCard(container: HTMLElement): HTMLElement {
    return container.querySelector('[role="button"][tabindex="0"]') as HTMLElement;
  }

  /** Helper: create a window variant with a specific pane status */
  function withStatus(status: WindowStatus): Window {
    return {
      ...mockWindow,
      layout: {
        type: 'pane' as const,
        id: 'pane-123',
        pane: {
          id: 'pane-123',
          cwd: '/home/user/project',
          command: 'claude',
          status,
          pid: 1234,
        },
      },
    };
  }

  it('renders window name', () => {
    render(<WindowCard window={mockWindow} />);
    expect(screen.getByText('Test Window')).toBeInTheDocument();
  });

  it('renders working directory from layout pane cwd', () => {
    render(<WindowCard window={mockWindow} />);
    expect(screen.getByText('/home/user/project')).toBeInTheDocument();
  });

  it('applies correct status color for running via borderTop style', () => {
    const { container } = render(<WindowCard window={mockWindow} />);
    const card = getCard(container);
    expect(card.style.borderTop).toContain('rgb(59, 130, 246)'); // blue-500
  });

  it('applies correct status color for waiting via borderTop style', () => {
    const { container } = render(<WindowCard window={withStatus(WindowStatus.WaitingForInput)} />);
    const card = getCard(container);
    expect(card.style.borderTop).toContain('rgb(245, 158, 11)'); // amber-500
  });

  it('applies correct status color for completed via borderTop style', () => {
    const { container } = render(<WindowCard window={withStatus(WindowStatus.Completed)} />);
    const card = getCard(container);
    expect(card.style.borderTop).toContain('rgb(34, 197, 94)'); // green-500
  });

  it('applies correct status color for error via borderTop style', () => {
    const { container } = render(<WindowCard window={withStatus(WindowStatus.Error)} />);
    const card = getCard(container);
    expect(card.style.borderTop).toContain('rgb(239, 68, 68)'); // red-500
  });

  it('applies correct status color for restoring via borderTop style', () => {
    const { container } = render(<WindowCard window={withStatus(WindowStatus.Restoring)} />);
    const card = getCard(container);
    expect(card.style.borderTop).toContain('rgb(107, 114, 128)'); // gray-500
  });

  it('renders start button for paused window', () => {
    const pausedWindow = withStatus(WindowStatus.Paused);
    render(<WindowCard window={pausedWindow} />);
    expect(screen.getByRole('button', { name: 'windowCard.start' })).toBeInTheDocument();
  });

  it('renders stop button for running window', () => {
    render(<WindowCard window={mockWindow} />);
    expect(screen.getByRole('button', { name: 'windowCard.stop' })).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<WindowCard window={mockWindow} onClick={onClick} />);

    const card = getCard(container);
    await user.click(card);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter key is pressed', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<WindowCard window={mockWindow} onClick={onClick} />);

    const card = getCard(container);
    card.focus();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space key is pressed', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<WindowCard window={mockWindow} onClick={onClick} />);

    const card = getCard(container);
    card.focus();
    await user.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility attributes', () => {
    const { container } = render(<WindowCard window={mockWindow} />);
    const card = getCard(container);

    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('aria-label');
  });

  it('truncates long working directory path', () => {
    const longPathWindow = {
      ...mockWindow,
      layout: {
        type: 'pane' as const,
        id: 'pane-123',
        pane: {
          id: 'pane-123',
          cwd: '/very/long/path/that/should/be/truncated/in/the/display',
          command: 'claude',
          status: WindowStatus.Running,
          pid: 1234,
        },
      },
    };
    const { container } = render(<WindowCard window={longPathWindow} />);
    const pathElement = container.querySelector('[data-testid="working-directory"]');
    expect(pathElement).toHaveClass('truncate');
  });
});
