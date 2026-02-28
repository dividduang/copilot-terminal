import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainLayout } from '../MainLayout';

describe('MainLayout', () => {
  it('should render toolbar and children', () => {
    render(
      <MainLayout toolbar={<div>Toolbar Content</div>}>
        <div>Main Content</div>
      </MainLayout>
    );

    expect(screen.getByText('Toolbar Content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('should apply correct layout classes', () => {
    const { container } = render(
      <MainLayout toolbar={<div>Toolbar</div>}>
        <div>Content</div>
      </MainLayout>
    );

    const layoutDiv = container.firstChild as HTMLElement;
    expect(layoutDiv).toHaveClass('flex', 'flex-col', 'h-screen', 'bg-bg-app');
  });

  it('should have toolbar in flex-shrink-0 container', () => {
    const { container } = render(
      <MainLayout toolbar={<div data-testid="toolbar">Toolbar</div>}>
        <div>Content</div>
      </MainLayout>
    );

    const toolbarContainer = screen.getByTestId('toolbar').parentElement;
    expect(toolbarContainer).toHaveClass('flex-shrink-0');
  });

  it('should have main content in flex-1 container', () => {
    const { container } = render(
      <MainLayout toolbar={<div>Toolbar</div>}>
        <div data-testid="content">Content</div>
      </MainLayout>
    );

    const mainElement = screen.getByTestId('content').parentElement;
    expect(mainElement).toHaveClass('flex-1', 'overflow-auto');
    expect(mainElement?.tagName).toBe('MAIN');
  });
});
