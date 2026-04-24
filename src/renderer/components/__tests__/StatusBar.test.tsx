import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StatusBar } from '../StatusBar';
import { useWindowStore } from '../../stores/windowStore';
import { Window, WindowStatus } from '../../types/window';

// Mock i18n to return actual Chinese translation values
vi.mock('../../i18n', () => {
  const messages: Record<string, string> = {
    'status.running': '运行中',
    'status.waitingInput': '等待输入',
    'status.paused': '已暂停',
    'statusBar.ariaLabel': '窗格状态统计：运行中 {running} 个，等待输入 {waiting} 个，暂停 {paused} 个',
  }
  return {
    useI18n: () => ({
      t: (k: string, params?: Record<string, string | number>) => {
        let msg = messages[k] ?? k
        if (params) {
          Object.entries(params).forEach(([key, val]) => {
            msg = msg.replace(`{${key}}`, String(val))
          })
        }
        return msg
      },
      language: 'zh-CN',
      setLanguage: vi.fn(),
    }),
    I18nProvider: ({ children }: any) => children,
  }
})

// Helper to reset store between tests
function resetStore() {
  useWindowStore.setState({ windows: [], activeWindowId: null });
}

function makeWindow(overrides: Partial<Window> = {}): Window {
  const id = Math.random().toString();
  // Use overrides.status for both window and pane status by default
  const winStatus = overrides.status ?? WindowStatus.Running;
  return {
    id,
    name: 'Test Window',
    workingDirectory: '/home/user',
    command: 'claude',
    status: winStatus,
    pid: null,
    createdAt: '2024-01-01T00:00:00Z',
    lastActiveAt: '2024-01-01T00:00:00Z',
    layout: {
      type: 'pane',
      id: `pane-${id}`,
      pane: {
        id: `pane-${id}`,
        cwd: '/home/user',
        command: 'claude',
        status: winStatus,
        pid: null,
      },
    },
    activePaneId: `pane-${id}`,
    ...overrides,
    // Ensure layout pane status matches window status after spread
    layout: overrides.layout ?? {
      type: 'pane',
      id: `pane-${id}`,
      pane: {
        id: `pane-${id}`,
        cwd: '/home/user',
        command: 'claude',
        status: winStatus,
        pid: null,
      },
    },
  };
}

describe('StatusBar', () => {
  beforeEach(() => {
    resetStore();
  });

  // AC1: 状态计数逻辑 - 3 status items (running, waiting, paused)
  it('shows zero counts when no windows', () => {
    render(<StatusBar />);
    // 3 status items, all with count 0
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it('counts running windows correctly', () => {
    useWindowStore.setState({
      windows: [
        makeWindow({ status: WindowStatus.Running }),
        makeWindow({ status: WindowStatus.Running }),
        makeWindow({ status: WindowStatus.Completed }),
      ],
    });
    render(<StatusBar />);
    // The running count should show 2
    const runningCounts = screen.getAllByText('2');
    expect(runningCounts.length).toBeGreaterThanOrEqual(1);
  });

  it('counts all statuses correctly', () => {
    useWindowStore.setState({
      windows: [
        makeWindow({ status: WindowStatus.Running }),
        makeWindow({ status: WindowStatus.WaitingForInput }),
        makeWindow({ status: WindowStatus.WaitingForInput }),
        makeWindow({ status: WindowStatus.Paused }),
      ],
    });
    render(<StatusBar />);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // running
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1); // waiting
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // paused
  });

  // AC2: 状态色应用
  it('applies green color class to running count', () => {
    useWindowStore.setState({ windows: [makeWindow({ status: WindowStatus.Running })] });
    const { container } = render(<StatusBar />);
    const greenSpans = container.querySelectorAll('.text-green-500');
    expect(greenSpans.length).toBeGreaterThan(0);
  });

  it('applies blue color class to waiting count', () => {
    useWindowStore.setState({ windows: [makeWindow({ status: WindowStatus.WaitingForInput })] });
    const { container } = render(<StatusBar />);
    const blueSpans = container.querySelectorAll('.text-blue-500');
    expect(blueSpans.length).toBeGreaterThan(0);
  });

  it('applies gray color class to paused count', () => {
    useWindowStore.setState({ windows: [makeWindow({ status: WindowStatus.Paused })] });
    const { container } = render(<StatusBar />);
    const graySpans = container.querySelectorAll('.text-gray-500');
    expect(graySpans.length).toBeGreaterThan(0);
  });

  // AC3: 实时更新
  it('updates counts when windows array changes', () => {
    const { rerender } = render(<StatusBar />);
    // Initial: all 3 items should show 0
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);

    // Add a running window
    act(() => {
      useWindowStore.setState({ windows: [makeWindow({ status: WindowStatus.Running })] });
    });
    rerender(<StatusBar />);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  // AC4: 无障碍
  it('has aria-live="polite" attribute', () => {
    const { container } = render(<StatusBar />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('has aria-label with status counts', () => {
    useWindowStore.setState({
      windows: [
        makeWindow({ status: WindowStatus.Running }),
        makeWindow({ status: WindowStatus.Paused }),
      ],
    });
    const { container } = render(<StatusBar />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    const label = liveRegion?.getAttribute('aria-label') ?? '';
    expect(label).toContain('运行中 1');
    expect(label).toContain('暂停 1');
    expect(label).toContain('等待输入 0');
  });

  it('updates aria-label when windows change', () => {
    const { container, rerender } = render(<StatusBar />);
    const liveRegion = container.querySelector('[aria-live="polite"]')!;
    expect(liveRegion.getAttribute('aria-label')).toContain('运行中 0');

    act(() => {
      useWindowStore.setState({ windows: [makeWindow({ status: WindowStatus.Running })] });
    });
    rerender(<StatusBar />);
    expect(liveRegion.getAttribute('aria-label')).toContain('运行中 1');
  });

  it('icons have aria-hidden="true"', () => {
    const { container } = render(<StatusBar />);
    const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenIcons.length).toBeGreaterThan(0);
  });

  // 标签文字显示
  it('shows text labels for all statuses', () => {
    render(<StatusBar />);
    expect(screen.getByText('运行中')).toBeInTheDocument();
    expect(screen.getByText('等待输入')).toBeInTheDocument();
    expect(screen.getByText('已暂停')).toBeInTheDocument();
  });

  // 按钮交互
  it('renders 3 status filter buttons', () => {
    render(<StatusBar />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);
  });

  it('calls onTabChange when a status button is clicked', () => {
    const onTabChange = vi.fn();
    render(<StatusBar onTabChange={onTabChange} />);
    const buttons = screen.getAllByRole('button');
    buttons[0].click();
    expect(onTabChange).toHaveBeenCalledWith('status:running');
  });
});
