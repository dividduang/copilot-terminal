import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'zh-CN', setLanguage: vi.fn() }),
  I18nProvider: ({ children }: any) => children,
}));

vi.mock('../components/TerminalPane', () => ({
  TerminalPane: () => null,
}));

import App from '../App';

describe('App - Dark Theme and Design Tokens', () => {
  it('should apply background color via CSS variables to main layout', () => {
    const { container } = render(<App />);
    const layout = container.querySelector('.h-screen');
    expect(layout?.className).toContain('bg-[rgb(var(--background))]');
  });

  it('should apply foreground color to empty state title', () => {
    render(<App />);
    const title = screen.getByText('emptyState.title');
    expect(title).toHaveClass('text-[rgb(var(--foreground))]');
  });

  it('should apply muted foreground color to empty state description', () => {
    render(<App />);
    const desc = screen.getByText('emptyState.description');
    expect(desc).toHaveClass('text-[rgb(var(--muted-foreground))]');
  });

  it('should apply primary background to new terminal button', () => {
    render(<App />);
    const buttons = screen.getAllByRole('button', { name: /newTerminal/i });
    // At least one button uses primary background
    const primaryButtons = buttons.filter(btn =>
      btn.className.includes('bg-[rgb(var(--primary))]')
    );
    expect(primaryButtons.length).toBeGreaterThan(0);
  });

  it('should apply card background to sidebar', () => {
    render(<App />);
    const sidebar = document.querySelector('aside');
    expect(sidebar?.className).toContain('bg-[rgb(var(--sidebar))]');
  });

  it('should apply border via CSS variables to sidebar', () => {
    render(<App />);
    const sidebar = document.querySelector('aside');
    expect(sidebar?.className).toContain('border-[rgb(var(--border))]');
  });

  it('should apply icon color via text-[rgb(var(--primary))] to terminal icon', () => {
    render(<App />);
    const svg = document.querySelector('.text-\\[rgb\\(var\\(--primary\\)\\)\\]');
    expect(svg).toBeInTheDocument();
  });

  it('should maintain consistent design token usage via CSS variables', () => {
    const { container } = render(<App />);

    const elementsWithBackground = container.querySelectorAll('[class*="rgb(var(--background))"]');
    expect(elementsWithBackground.length).toBeGreaterThan(0);

    const elementsWithForeground = container.querySelectorAll('[class*="rgb(var(--foreground))"]');
    expect(elementsWithForeground.length).toBeGreaterThan(0);

    const elementsWithBorder = container.querySelectorAll('[class*="rgb(var(--border))"]');
    expect(elementsWithBorder.length).toBeGreaterThan(0);
  });
});
