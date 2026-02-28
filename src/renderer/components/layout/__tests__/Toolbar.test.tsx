import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toolbar } from '../Toolbar';

describe('Toolbar', () => {
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

  it('should render new window button', () => {
    render(<Toolbar />);
    expect(screen.getByText('+ 新建窗口')).toBeInTheDocument();
  });
});
