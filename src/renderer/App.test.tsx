import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock window.electronAPI
const mockElectronAPI = {
  ping: vi.fn(),
};

beforeEach(() => {
  // @ts-ignore - mocking global
  global.window.electronAPI = mockElectronAPI;
  vi.clearAllMocks();
});

describe('React Integration', () => {
  it('should import React successfully', () => {
    expect(React).toBeDefined();
    expect(React.version).toMatch(/^18\./);
  });

  it('should have React.StrictMode available', () => {
    expect(React.StrictMode).toBeDefined();
  });

  it('should have useState hook available', () => {
    expect(React.useState).toBeDefined();
  });

  it('should have useEffect hook available', () => {
    expect(React.useEffect).toBeDefined();
  });
});

describe('App Component', () => {
  it('should render the app title', () => {
    mockElectronAPI.ping.mockResolvedValue('pong');
    render(<App />);

    expect(screen.getByText('ausome-terminal')).toBeDefined();
    expect(screen.getByText('React + TypeScript + Vite 集成成功!')).toBeDefined();
  });

  it('should call electronAPI.ping on mount', async () => {
    mockElectronAPI.ping.mockResolvedValue('pong');
    render(<App />);

    await waitFor(() => {
      expect(mockElectronAPI.ping).toHaveBeenCalledTimes(1);
    });
  });

  it('should display IPC response when successful', async () => {
    mockElectronAPI.ping.mockResolvedValue('pong');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/IPC 通信测试: pong/)).toBeDefined();
    });
  });

  it('should handle IPC errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockElectronAPI.ping.mockRejectedValue(new Error('IPC failed'));

    render(<App />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('IPC test failed:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });
});
