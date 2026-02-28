import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('should render guidance text', () => {
    render(<EmptyState />);

    expect(screen.getByText('创建你的第一个任务窗口')).toBeInTheDocument();
  });

  it('should render create window button', () => {
    render(<EmptyState />);

    const button = screen.getByRole('button', { name: '+ 新建窗口' });
    expect(button).toBeInTheDocument();
  });

  it('should call onCreateWindow when button is clicked', async () => {
    const user = userEvent.setup();
    const handleCreateWindow = vi.fn();

    render(<EmptyState onCreateWindow={handleCreateWindow} />);

    const button = screen.getByRole('button', { name: '+ 新建窗口' });
    await user.click(button);

    expect(handleCreateWindow).toHaveBeenCalledTimes(1);
  });

  it('should center content vertically and horizontally', () => {
    const { container } = render(<EmptyState />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'h-full');
  });

  it('should render guidance text with correct styling', () => {
    render(<EmptyState />);

    const text = screen.getByText('创建你的第一个任务窗口');
    expect(text).toHaveClass('text-xl', 'text-text-primary', 'mb-6');
  });

  it('should render button with primary variant', () => {
    render(<EmptyState />);

    const button = screen.getByRole('button', { name: '+ 新建窗口' });
    expect(button).toHaveClass('text-lg', 'px-8', 'py-3');
  });

  it('should not crash when onCreateWindow is not provided', async () => {
    const user = userEvent.setup();
    render(<EmptyState />);

    const button = screen.getByRole('button', { name: '+ 新建窗口' });
    
    // Should not throw error
    await user.click(button);
    expect(button).toBeInTheDocument();
  });
});
