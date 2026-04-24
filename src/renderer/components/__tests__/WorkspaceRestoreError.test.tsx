import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceRestoreError } from '../WorkspaceRestoreError';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, string | number>) => {
      if (params) {
        return Object.entries(params).reduce((str, [key, val]) => str.replace(`{${key}}`, String(val)), k);
      }
      return k;
    },
    language: 'zh-CN',
    setLanguage: vi.fn(),
  }),
}));

describe('WorkspaceRestoreError', () => {
  it('should render error message', () => {
    render(
      <WorkspaceRestoreError
        error="Failed to load workspace.json"
      />
    );

    expect(screen.getByText('workspaceRestore.title')).toBeInTheDocument();
    expect(screen.getByText('Failed to load workspace.json')).toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided', () => {
    const onRetry = vi.fn();

    render(
      <WorkspaceRestoreError
        error="Failed to load workspace.json"
        onRetry={onRetry}
      />
    );

    const retryButton = screen.getByText('common.retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should render recover from backup button when onRecoverFromBackup is provided', () => {
    const onRecoverFromBackup = vi.fn();

    render(
      <WorkspaceRestoreError
        error="Failed to load workspace.json"
        onRecoverFromBackup={onRecoverFromBackup}
      />
    );

    const recoverButton = screen.getByText('common.recoverFromBackup');
    expect(recoverButton).toBeInTheDocument();

    fireEvent.click(recoverButton);
    expect(onRecoverFromBackup).toHaveBeenCalledTimes(1);
  });

  it('should render both buttons when both callbacks are provided', () => {
    const onRetry = vi.fn();
    const onRecoverFromBackup = vi.fn();

    render(
      <WorkspaceRestoreError
        error="Failed to load workspace.json"
        onRetry={onRetry}
        onRecoverFromBackup={onRecoverFromBackup}
      />
    );

    expect(screen.getByText('common.retry')).toBeInTheDocument();
    expect(screen.getByText('common.recoverFromBackup')).toBeInTheDocument();
  });

  it('should not render buttons when callbacks are not provided', () => {
    render(
      <WorkspaceRestoreError
        error="Failed to load workspace.json"
      />
    );

    expect(screen.queryByText('common.retry')).not.toBeInTheDocument();
    expect(screen.queryByText('从备份恢复')).not.toBeInTheDocument();
  });

  it('should render error icon', () => {
    render(
      <WorkspaceRestoreError
        error="Failed to load workspace.json"
      />
    );

    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('should handle long error messages', () => {
    const longError = 'A'.repeat(500);

    render(
      <WorkspaceRestoreError
        error={longError}
      />
    );

    expect(screen.getByText(longError)).toBeInTheDocument();
  });

  it('should handle special characters in error message', () => {
    const errorWithSpecialChars = 'Error: <script>alert("xss")</script>';

    render(
      <WorkspaceRestoreError
        error={errorWithSpecialChars}
      />
    );

    // React 会自动转义特殊字符，防止 XSS
    expect(screen.getByText(errorWithSpecialChars)).toBeInTheDocument();
  });
});
