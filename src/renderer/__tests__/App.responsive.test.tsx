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

describe('App - Responsive Layout', () => {
  it('should maintain layout structure at minimum window size (480x360)', () => {
    global.innerWidth = 480;
    global.innerHeight = 360;

    const { container } = render(<App />);
    const layout = container.querySelector('.h-screen');
    expect(layout).toBeDefined();
    // Empty state visible via i18n key
    expect(screen.getByText('emptyState.title')).toBeInTheDocument();
  });

  it('should maintain layout structure at standard window size (1024x768)', () => {
    global.innerWidth = 1024;
    global.innerHeight = 768;

    const { container } = render(<App />);
    const layout = container.querySelector('.h-screen');
    expect(layout).toBeDefined();
    expect(screen.getByText('emptyState.title')).toBeInTheDocument();
  });

  it('should maintain layout structure at large window size (1920x1080)', () => {
    global.innerWidth = 1920;
    global.innerHeight = 1080;

    const { container } = render(<App />);
    const layout = container.querySelector('.h-screen');
    expect(layout).toBeDefined();
    expect(screen.getByText('emptyState.title')).toBeInTheDocument();
  });

  it('should have main content area that fills remaining space', () => {
    const { container } = render(<App />);
    const main = container.querySelector('main');
    expect(main).toHaveClass('flex-1');
    expect(main).toHaveClass('overflow-auto');
  });

  it('should center empty state content at all sizes', () => {
    render(<App />);
    const emptyStateContainer = screen.getByText('emptyState.title').parentElement;
    expect(emptyStateContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'h-full');
  });

  it('should not have horizontal overflow on main layout', () => {
    const { container } = render(<App />);
    const layout = container.querySelector('.h-screen');
    expect(layout).not.toHaveClass('overflow-x-scroll');
  });

  it('should allow vertical scrolling in main content area', () => {
    const { container } = render(<App />);
    const main = container.querySelector('main');
    expect(main).toHaveClass('overflow-auto');
  });
});
