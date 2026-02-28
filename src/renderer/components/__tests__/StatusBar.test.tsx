import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StatusBar } from '../StatusBar';
import { useWindowStore } from '../../stores/windowStore';
import { Window, WindowStatus } from '../../types/window';

// Helper to reset store between tests
function resetStore() {
  useWindowStore.setState({ windows: [], activeWindowId: null });
}

function makeWindow(overrides: Partial<Window> = {}): Window {
  return {
    id: Math.random().toString(),
    name: 'Test Window',
    workingDirectory: '/home/user',
    command: 'claude',
    status: WindowStatus.Running,
    pid: null,
    createdAt: '2024-01-01T00:00:00Z',
    lastActiveAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('StatusBar', () => {
  beforeEach(() => {
    resetStore();
  });

  // AC1: 状态计数逻辑
  it('shows zero counts when no windows', () => {
    render(<StatusBar />);
    // 标准模式下有4个数字，都应为 0
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);
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
    // 标准模式：运行中 2，已完成 1，其余 0
    const runningCounts = screen.getAllByText('2');
    expect(runningCounts.length).toBeGreaterThanOrEqual(1);
  });

  it('counts all statuses correctly', () => {
    useWindowStore.setState({
      windows: [
        makeWindow({ status: WindowStatus.Running }),
        makeWindow({ status: WindowStatus.WaitingForInput }),
        makeWindow({ status: WindowStatus.WaitingForInput }),
        makeWindow({ status: WindowStatus.Completed }),
        makeWindow({ status: WindowStatus.Completed }),
        makeWindow({ status: WindowStatus.Completed }),
        makeWindow({ status: WindowStatus.Error }),
      ],
    });
    render(<StatusBar />);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // running
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1); // waiting
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // completed
  });

  // AC2: 状态色应用
  it('applies blue color class to running count', () => {
    useWindowStore.setState({ windows: [makeWindow({ status: WindowStatus.Running })] });
    const { container } = render(<StatusBar />);
    const blueSpans = container.querySelectorAll('.text-blue-500');
    expect(blueSpans.length).toBeGreaterThan(0);
  });

  it('applies amber color class to waiting count', () => {
    useWindowStore.setState({ windows: [makeWindow({ status: WindowStatus.WaitingForInput })] });
    const { container } = render(<StatusBar />);
    const amberSpans = container.querySelectorAll('.text-amber-500');
    expect(amberSpans.length).toBeGreaterThan(0);
  });

  it('applies green color class to completed count', () => {
    useWindowStore.setState({ windows: [makeWindow({ status: WindowStatus.Completed })] });
    const { container } = render(<StatusBar />);
    const greenSpans = container.querySelectorAll('.text-green-500');
    expect(greenSpans.length).toBeGreaterThan(0);
  });

  it('applies red color class to error count', () => {
    useWindowStore.setState({ windows: [makeWindow({ status: WindowStatus.Error })] });
    const { container } = render(<StatusBar />);
    const redSpans = container.querySelectorAll('.text-red-500');
    expect(redSpans.length).toBeGreaterThan(0);
  });

  // AC3: 实时更新
  it('updates counts when windows array changes', () => {
    const { rerender } = render(<StatusBar />);
    // 初始：0 个运行中
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(4);

    // 添加一个运行中窗口
    act(() => {
      useWindowStore.setState({ windows: [makeWindow({ status: WindowStatus.Running })] });
    });
    rerender(<StatusBar />);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  // AC4: 响应式布局
  it('renders standard mode container with hidden sm:flex', () => {
    const { container } = render(<StatusBar />);
    const standardMode = container.querySelector('.hidden.sm\\:flex');
    expect(standardMode).toBeInTheDocument();
  });

  it('renders compact mode container with flex sm:hidden', () => {
    const { container } = render(<StatusBar />);
    const compactMode = container.querySelector('.flex.sm\\:hidden');
    expect(compactMode).toBeInTheDocument();
  });

  // AC5: 无障碍
  it('has aria-live="polite" attribute', () => {
    const { container } = render(<StatusBar />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('has aria-label with status counts', () => {
    useWindowStore.setState({
      windows: [
        makeWindow({ status: WindowStatus.Running }),
        makeWindow({ status: WindowStatus.Error }),
      ],
    });
    const { container } = render(<StatusBar />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    const label = liveRegion?.getAttribute('aria-label') ?? '';
    expect(label).toContain('运行中 1');
    expect(label).toContain('出错 1');
    expect(label).toContain('等待输入 0');
    expect(label).toContain('已完成 0');
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
    // lucide icons render as svg; they should have aria-hidden
    const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenIcons.length).toBeGreaterThan(0);
  });

  // 标准模式文字标签
  it('shows text labels in standard mode', () => {
    render(<StatusBar />);
    const standardMode = screen.getByText('运行中').closest('.hidden');
    expect(standardMode).toBeInTheDocument();
    expect(screen.getByText('等待输入')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('出错')).toBeInTheDocument();
  });
});
