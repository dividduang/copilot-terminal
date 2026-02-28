import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardGrid } from '../CardGrid';
import { useWindowStore } from '../../stores/windowStore';
import { Window, WindowStatus } from '../../types/window';

const makeWindow = (overrides: Partial<Window> & { id: string }): Window => ({
  name: `Window ${overrides.id}`,
  workingDirectory: `/path/${overrides.id}`,
  command: 'claude',
  status: WindowStatus.Running,
  pid: 1000,
  createdAt: '2024-01-01T10:00:00Z',
  lastActiveAt: '2024-01-01T10:00:00Z',
  ...overrides,
});

describe('CardGrid', () => {
  beforeEach(() => {
    useWindowStore.setState({ windows: [], activeWindowId: null });
  });

  // AC1, AC2: CSS Grid layout and gap
  it('renders grid container with correct CSS Grid classes', () => {
    useWindowStore.getState().addWindow(makeWindow({ id: '1' }));
    render(<CardGrid />);
    const grid = screen.getByTestId('card-grid');
    expect(grid.className).toContain('grid');
    expect(grid.className).toContain('gap-3');
    expect(grid.className).toContain('p-6');
    expect(grid.className).toContain('minmax(280px,1fr)');
  });

  // AC7: scroll support
  it('renders ScrollArea root for scroll support', () => {
    useWindowStore.getState().addWindow(makeWindow({ id: '1' }));
    render(<CardGrid />);
    expect(screen.getByTestId('card-grid-scroll-root')).toBeInTheDocument();
  });

  // AC8: sort by lastActiveAt descending
  it('renders cards sorted by lastActiveAt descending', () => {
    const { addWindow } = useWindowStore.getState();
    addWindow(makeWindow({ id: 'old', name: 'Old Window', lastActiveAt: '2024-01-01T08:00:00Z' }));
    addWindow(makeWindow({ id: 'new', name: 'New Window', lastActiveAt: '2024-01-01T12:00:00Z' }));
    addWindow(makeWindow({ id: 'mid', name: 'Mid Window', lastActiveAt: '2024-01-01T10:00:00Z' }));

    render(<CardGrid />);

    const cards = screen.getAllByRole('button');
    expect(cards[0]).toHaveAttribute('aria-label', expect.stringContaining('New Window'));
    expect(cards[1]).toHaveAttribute('aria-label', expect.stringContaining('Mid Window'));
    expect(cards[2]).toHaveAttribute('aria-label', expect.stringContaining('Old Window'));
  });

  // Empty state
  it('renders nothing when windows array is empty', () => {
    const { container } = render(<CardGrid />);
    expect(container.firstChild).toBeNull();
  });

  // Renders all windows
  it('renders a WindowCard for each window', () => {
    const { addWindow } = useWindowStore.getState();
    addWindow(makeWindow({ id: '1', name: 'Window 1' }));
    addWindow(makeWindow({ id: '2', name: 'Window 2' }));
    addWindow(makeWindow({ id: '3', name: 'Window 3' }));

    render(<CardGrid />);

    expect(screen.getByText('Window 1')).toBeInTheDocument();
    expect(screen.getByText('Window 2')).toBeInTheDocument();
    expect(screen.getByText('Window 3')).toBeInTheDocument();
  });

  // 15+ windows scroll
  it('renders 15+ windows without error (scroll state)', () => {
    const { addWindow } = useWindowStore.getState();
    for (let i = 1; i <= 16; i++) {
      addWindow(makeWindow({ id: `${i}`, name: `Window ${i}` }));
    }

    render(<CardGrid />);

    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(16);
    expect(screen.getByTestId('card-grid-scroll-root')).toBeInTheDocument();
  });

  // onClick sets active window
  it('sets activeWindowId in store on card click', async () => {
    const { addWindow } = useWindowStore.getState();
    addWindow(makeWindow({ id: 'win-1', name: 'Clickable Window' }));

    const user = userEvent.setup();
    render(<CardGrid />);

    await user.click(screen.getByRole('button'));
    expect(useWindowStore.getState().activeWindowId).toBe('win-1');
  });

  // Different statuses render correctly
  it('renders cards with different statuses', () => {
    const { addWindow } = useWindowStore.getState();
    const statuses = [
      WindowStatus.Running,
      WindowStatus.WaitingForInput,
      WindowStatus.Completed,
      WindowStatus.Error,
      WindowStatus.Restoring,
    ];
    statuses.forEach((status, i) => {
      addWindow(makeWindow({ id: `${i}`, name: `Window ${i}`, status }));
    });

    render(<CardGrid />);

    expect(screen.getByText('运行中')).toBeInTheDocument();
    expect(screen.getByText('等待输入')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('出错')).toBeInTheDocument();
    expect(screen.getByText('恢复中')).toBeInTheDocument();
  });
});
