import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceRestoreError } from '../WorkspaceRestoreError';

describe('WorkspaceRestoreError', () => {
  it('should render error message', () => {
    render(
      <WorkspaceRestoreError
        error="Failed to load workspace.json"
      />
    );

    expect(screen.getByText('工作区加载失败')).toBeInTheDocument();
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

    const retryButton = screen.getByText('重试');
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

    const recoverButton = screen.getByText('从备份恢复');
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

    expect(screen.getByText('重试')).toBeInTheDocument();
    expect(screen.getByText('从备份恢复')).toBeInTheDocument();
  });

  it('should not render buttons when callbacks are not provided', () => {
    render(
      <WorkspaceRestoreError
        error="Failed to load workspace.json"
      />
    );

    expect(screen.queryByText('重试')).not.toBeInTheDocument();
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
