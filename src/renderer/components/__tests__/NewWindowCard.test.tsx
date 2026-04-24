import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewWindowCard } from '../NewWindowCard';

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'zh-CN', setLanguage: vi.fn() }),
}))

describe('NewWindowCard', () => {
  it('renders the + icon', () => {
    render(<NewWindowCard onClick={vi.fn()} />);
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('renders the label text', () => {
    render(<NewWindowCard onClick={vi.fn()} />);
    expect(screen.getByText('common.newTerminal')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<NewWindowCard onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'common.newWindow' })).toBeInTheDocument();
  });

  it('has tabIndex 0 for keyboard navigation', () => {
    render(<NewWindowCard onClick={vi.fn()} />);
    const card = screen.getByRole('button', { name: 'common.newWindow' });
    expect(card).toHaveAttribute('tabindex', '0');
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<NewWindowCard onClick={handleClick} />);

    await user.click(screen.getByRole('button', { name: 'common.newWindow' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter key is pressed', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<NewWindowCard onClick={handleClick} />);

    const card = screen.getByRole('button', { name: 'common.newWindow' });
    card.focus();
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space key is pressed', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<NewWindowCard onClick={handleClick} />);

    const card = screen.getByRole('button', { name: 'common.newWindow' });
    card.focus();
    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has dashed border classes', () => {
    render(<NewWindowCard onClick={vi.fn()} />);
    const card = screen.getByTestId('new-window-card');
    expect(card).toHaveClass('border-dashed');
  });

  it('has correct height class', () => {
    render(<NewWindowCard onClick={vi.fn()} />);
    const card = screen.getByTestId('new-window-card');
    expect(card).toHaveClass('h-56');
  });

  it('has focus ring class for accessibility', () => {
    render(<NewWindowCard onClick={vi.fn()} />);
    const card = screen.getByTestId('new-window-card');
    expect(card).toHaveClass('focus:ring-2');
  });
});
