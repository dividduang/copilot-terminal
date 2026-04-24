import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../EmptyState';

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'zh-CN', setLanguage: vi.fn() }),
}))

describe('EmptyState', () => {
  it('should render guidance text', () => {
    render(<EmptyState />);

    expect(screen.getByText('emptyState.title')).toBeInTheDocument();
  });

  it('should render description text', () => {
    render(<EmptyState />);

    expect(screen.getByText('emptyState.description')).toBeInTheDocument();
  });

  it('should render create window button', () => {
    render(<EmptyState />);

    // Button text comes from i18n mock returning the key
    const button = screen.getByRole('button', { name: /common\.newTerminal/ });
    expect(button).toBeInTheDocument();
  });

  it('should call onCreateWindow when button is clicked', async () => {
    const user = userEvent.setup();
    const handleCreateWindow = vi.fn();

    render(<EmptyState onCreateWindow={handleCreateWindow} />);

    const button = screen.getByRole('button', { name: /common\.newTerminal/ });
    await user.click(button);

    expect(handleCreateWindow).toHaveBeenCalledTimes(1);
  });

  it('should center content vertically and horizontally', () => {
    const { container } = render(<EmptyState />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'h-full');
  });

  it('should render title with correct styling', () => {
    render(<EmptyState />);

    const text = screen.getByText('emptyState.title');
    expect(text).toHaveClass('text-2xl', 'font-semibold');
  });

  it('should render description with correct styling', () => {
    render(<EmptyState />);

    const text = screen.getByText('emptyState.description');
    expect(text).toHaveClass('text-base', 'mb-8');
  });

  it('should render button with correct styling', () => {
    render(<EmptyState />);

    const button = screen.getByRole('button', { name: /common\.newTerminal/ });
    expect(button).toHaveClass('px-6', 'py-3');
  });

  it('should not crash when onCreateWindow is not provided', async () => {
    const user = userEvent.setup();
    render(<EmptyState />);

    const button = screen.getByRole('button', { name: /common\.newTerminal/ });

    // Should not throw error
    await user.click(button);
    expect(button).toBeInTheDocument();
  });
});
