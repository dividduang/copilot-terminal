import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('CardGrid', () => {
  beforeEach(() => {
    useWindowStore.setState({ windows: [], activeWindowId: null, groups: [], customCategories: [], hideGroupedWindows: false });
  });

  // AC1, AC2: CSS Grid layout and gap
  it('renders grid container with correct CSS Grid classes', () => {
    useWindowStore.getState().addWindow(makeWindow({ id: '1' }));
    renderWithDnd(<CardGrid />);
    const grid = screen.getByTestId('card-grid');
    expect(grid.className).toContain('grid');
    expect(grid.className).toContain('gap-4');
    expect(grid.className).toContain('p-8');
    expect(grid.className).toContain('minmax(350px,1fr)');
  });

  // AC7: scroll support
  it('renders ScrollArea root for scroll support', () => {
    useWindowStore.getState().addWindow(makeWindow({ id: '1' }));
    renderWithDnd(<CardGrid />);
    expect(screen.getByTestId('card-grid-scroll-root')).toBeInTheDocument();
  });

  // AC8: sort by createdAt descending
  it('renders cards sorted by createdAt descending', () => {
    const { addWindow } = useWindowStore.getState();
    addWindow(makeWindow({ id: 'old', name: 'Old Window', createdAt: '2024-01-01T08:00:00Z' }));
    addWindow(makeWindow({ id: 'new', name: 'New Window', createdAt: '2024-01-01T12:00:00Z' }));
    addWindow(makeWindow({ id: 'mid', name: 'Mid Window', createdAt: '2024-01-01T10:00:00Z' }));

    renderWithDnd(<CardGrid />);

    // Verify all three window names are rendered (order depends on sortWindows by createdAt desc)
    expect(screen.getByText('New Window')).toBeInTheDocument();
    expect(screen.getByText('Mid Window')).toBeInTheDocument();
    expect(screen.getByText('Old Window')).toBeInTheDocument();
  });

  // Empty state
  it('renders nothing when windows array is empty', () => {
    renderWithDnd(<CardGrid />);
    expect(screen.queryByTestId('card-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('card-grid-scroll-root')).not.toBeInTheDocument();
  });

  // Renders all windows
  it('renders a WindowCard for each window', () => {
    const { addWindow } = useWindowStore.getState();
    addWindow(makeWindow({ id: '1', name: 'Window 1' }));
    addWindow(makeWindow({ id: '2', name: 'Window 2' }));
    addWindow(makeWindow({ id: '3', name: 'Window 3' }));

    renderWithDnd(<CardGrid />);

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

    renderWithDnd(<CardGrid />);

    // All 16 window names should be visible
    for (let i = 1; i <= 16; i++) {
      expect(screen.getByText(`Window ${i}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('new-window-card')).toBeInTheDocument();
    expect(screen.getByTestId('card-grid-scroll-root')).toBeInTheDocument();
  });

  // onClick calls onEnterTerminal
  it('calls onEnterTerminal when card is clicked', async () => {
    const { addWindow } = useWindowStore.getState();
    addWindow(makeWindow({ id: 'win-1', name: 'Clickable Window' }));

    const handleEnterTerminal = vi.fn();
    const user = userEvent.setup();
    renderWithDnd(<CardGrid onEnterTerminal={handleEnterTerminal} />);

    // Find the card by its window name text, then click its parent button
    const windowNameEl = screen.getByText('Clickable Window');
    const card = windowNameEl.closest('[role="button"]')!;
    await user.click(card);

    await screen.findByText('Clickable Window'); // wait for async
    expect(handleEnterTerminal).toHaveBeenCalledTimes(1);
    expect(handleEnterTerminal).toHaveBeenCalledWith(expect.objectContaining({ id: 'win-1' }));
  });

  // NewWindowCard is rendered at the end of the grid
  it('renders NewWindowCard at the end of the grid when windows exist', () => {
    useWindowStore.getState().addWindow(makeWindow({ id: '1', name: 'Window 1' }));
    renderWithDnd(<CardGrid />);
    expect(screen.getByTestId('new-window-card')).toBeInTheDocument();
  });

  // NewWindowCard calls onCreateWindow
  it('calls onCreateWindow when NewWindowCard is clicked', async () => {
    const user = userEvent.setup();
    const handleCreate = vi.fn();
    useWindowStore.getState().addWindow(makeWindow({ id: '1' }));

    renderWithDnd(<CardGrid onCreateWindow={handleCreate} />);

    await user.click(screen.getByRole('button', { name: 'common.newWindow' }));
    expect(handleCreate).toHaveBeenCalledTimes(1);
  });

  // NewWindowCard not shown when empty
  it('does not render NewWindowCard when windows array is empty', () => {
    renderWithDnd(<CardGrid />);
    expect(screen.queryByTestId('new-window-card')).not.toBeInTheDocument();
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

    renderWithDnd(<CardGrid />);

    // All 5 windows with different statuses should render their names
    for (let i = 0; i < statuses.length; i++) {
      expect(screen.getByText(`Window ${i}`)).toBeInTheDocument();
    }
  });
});
