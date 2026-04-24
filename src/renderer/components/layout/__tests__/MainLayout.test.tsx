import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'zh-CN', setLanguage: vi.fn() }),
  I18nProvider: ({ children }: any) => children,
}));

import { MainLayout } from '../MainLayout';

describe('MainLayout', () => {
  it('should render sidebar and children', () => {
    render(
      <MainLayout sidebar={<div>Sidebar Content</div>}>
        <div>Main Content</div>
      </MainLayout>
    );

    expect(screen.getByText('Sidebar Content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('should render children without sidebar', () => {
    render(
      <MainLayout>
        <div>Main Content</div>
      </MainLayout>
    );

    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('should apply correct layout classes', () => {
    const { container } = render(
      <MainLayout sidebar={<div>Sidebar</div>}>
        <div>Content</div>
      </MainLayout>
    );

    const layoutDiv = container.firstChild as HTMLElement;
    expect(layoutDiv).toHaveClass('flex', 'h-screen');
    expect(layoutDiv.className).toContain('rgb(var(--background))');
  });

  it('should have sidebar in flex-shrink-0 container', () => {
    const { container } = render(
      <MainLayout sidebar={<div data-testid="sidebar">Sidebar</div>}>
        <div>Content</div>
      </MainLayout>
    );

    const sidebarContainer = screen.getByTestId('sidebar').parentElement;
    expect(sidebarContainer).toHaveClass('flex-shrink-0');
  });

  it('should have main content in flex-1 container', () => {
    const { container } = render(
      <MainLayout sidebar={<div>Sidebar</div>}>
        <div data-testid="content">Content</div>
      </MainLayout>
    );

    const mainElement = screen.getByTestId('content').parentElement;
    expect(mainElement).toHaveClass('flex-1', 'overflow-auto');
    expect(mainElement?.tagName).toBe('MAIN');
  });
});
