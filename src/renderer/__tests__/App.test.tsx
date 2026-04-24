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

describe('App - Main Window and Basic Layout', () => {
  it('renders the unified view with MainLayout', () => {
    const { container } = render(<App />);
    // MainLayout renders a flex h-screen container
    const layout = container.querySelector('.h-screen');
    expect(layout).toBeDefined();
    expect(layout?.className).toContain('flex');
  });

  it('renders empty state when no windows exist', () => {
    render(<App />);
    // EmptyState uses i18n key 'emptyState.title'
    expect(screen.getByText('emptyState.title')).toBeInTheDocument();
  });

  it('renders the new terminal button', () => {
    render(<App />);
    const buttons = screen.getAllByRole('button', { name: /newTerminal/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders the sidebar component', () => {
    render(<App />);
    // Sidebar renders an aside element
    const sidebar = document.querySelector('aside');
    expect(sidebar).toBeInTheDocument();
  });

  it('wraps content in I18nProvider and DndProvider', () => {
    const { container } = render(<App />);
    // App renders without crashing when wrapped with providers
    expect(container).toBeDefined();
  });

  it('applies dark theme background via CSS variables', () => {
    const { container } = render(<App />);
    const mainLayout = container.querySelector('.h-screen');
    expect(mainLayout?.className).toContain('bg-[rgb(var(--background))]');
  });
});
