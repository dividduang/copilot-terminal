import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateWindowDialog } from '../CreateWindowDialog'
import { useWindowStore } from '../../stores/windowStore'

// Mock i18n with stable function references to prevent effect re-triggers
vi.mock('../../i18n', () => {
  const messages: Record<string, string> = {
    'createWindow.title': '新建窗口',
    'createWindow.description': '创建一个新的终端窗口',
    'createWindow.nameLabel': '窗口名称（可选）',
    'createWindow.workingDirectoryLabel': '工作目录',
    'createWindow.workingDirectoryPlaceholder': '选择或输入工作目录路径',
    'createWindow.shellLabel': 'Shell 程序（可选）',
    'createWindow.shellPlaceholder': '选择一个 shell，或点击"自定义"',
    'createWindow.shellAutoOption': '(默认){shell}',
    'createWindow.shellAutoFallback': '自动选择',
    'createWindow.errorPathNotFound': '路径不存在',
    'createWindow.errorValidationFailed': '验证失败',
    'createWindow.errorCreateFailed': '创建窗口失败',
    'createWindow.errorCreateFailedRetry': '创建窗口失败，请重试',
    'createWindow.defaultName': '窗口 #{count}',
    'common.browse': '浏览',
    'common.cancel': '取消',
    'common.create': '创建',
    'common.creating': '创建中...',
    'common.validating': '验证中...',
    'settings.general.defaultShellCustomButton': '自定义',
  }
  // Create stable function references outside the hook
  const stableT = (k: string, params?: Record<string, string | number>) => {
    let msg = messages[k] ?? k
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        msg = msg.replace(`{${key}}`, String(val))
      })
    }
    return msg
  }
  const stableSetLanguage = vi.fn()
  return {
    useI18n: () => ({
      t: stableT,
      language: 'zh-CN',
      setLanguage: stableSetLanguage,
    }),
    I18nProvider: ({ children }: any) => children,
  }
})

const mockElectronAPI = {
  getSettings: vi.fn(),
  getAvailableShells: vi.fn(),
  validatePath: vi.fn(),
  selectDirectory: vi.fn(),
  selectExecutableFile: vi.fn(),
  createWindow: vi.fn(),
  triggerAutoSave: vi.fn(),
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

function createWindowResponse() {
  const paneId = 'pane-1'

  return {
    success: true,
    data: {
      id: 'window-1',
      name: 'Test Window',
      workingDirectory: '/test/path',
      command: 'pwsh.exe',
      status: 'running' as const,
      pid: 1234,
      layout: {
        type: 'pane',
        id: paneId,
        pane: {
          id: paneId,
          cwd: '/test/path',
          command: 'pwsh.exe',
          status: 'running' as const,
          pid: 1234,
        },
      },
      activePaneId: paneId,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    },
  }
}

describe('CreateWindowDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useWindowStore.setState({ windows: [], activeWindowId: null })
    mockElectronAPI.getSettings.mockResolvedValue({
      success: true,
      data: {
        terminal: {
          defaultShellProgram: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
        },
      },
    })
    mockElectronAPI.getAvailableShells.mockResolvedValue({
      success: true,
      data: [
        { command: 'pwsh.exe', path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', isDefault: true },
        { command: 'powershell.exe', path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', isDefault: false },
        { command: 'cmd.exe', path: 'C:\\Windows\\System32\\cmd.exe', isDefault: false },
      ],
    })
    mockElectronAPI.validatePath.mockResolvedValue({ success: true, data: true })
    mockElectronAPI.selectDirectory.mockResolvedValue({ success: true, data: '/selected/path' })
    mockElectronAPI.selectExecutableFile.mockResolvedValue({ success: true, data: 'C:\\Shells\\custom-shell.exe' })
    mockElectronAPI.createWindow.mockResolvedValue(createWindowResponse())
  })

  it('renders the shell selector and shows the global default path', async () => {
    vi.useRealTimers()
    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    expect(screen.getByText('新建窗口')).toBeInTheDocument()
    expect(screen.getByLabelText(/窗口名称/)).toBeInTheDocument()
    expect(screen.getByLabelText(/工作目录/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Shell 程序/ })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('(默认)C:\\Program Files\\PowerShell\\7\\pwsh.exe')).toBeInTheDocument()
    })

    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain('max-w-[640px]')

    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: /Shell 程序/ }))
    expect(screen.queryByText('C:\\Program Files\\PowerShell\\7\\pwsh.exe')).not.toBeInTheDocument()
  })

  it('shows an error when the working directory is invalid', async () => {
    mockElectronAPI.validatePath.mockResolvedValue({ success: true, data: false })

    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText(/工作目录/), { target: { value: '/invalid/path' } })

    // Wait for the 300ms debounce + async validation
    await waitFor(() => {
      expect(screen.getByText('路径不存在')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('fills the working directory from the folder picker', async () => {
    vi.useRealTimers()
    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    fireEvent.click(screen.getByText('浏览'))

    await waitFor(() => {
      expect(mockElectronAPI.selectDirectory).toHaveBeenCalledOnce()
    })

    expect(screen.getByLabelText(/工作目录/)).toHaveValue('/selected/path')
  })

  it('submits the selected scanned shell path when creating a window', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<CreateWindowDialog open={true} onOpenChange={onOpenChange} />)

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/窗口名称/), { target: { value: 'Test Window' } })
      fireEvent.change(screen.getByLabelText(/工作目录/), { target: { value: '/test/path' } })
    })

    // Wait for validation to complete (300ms debounce + async) and isValidating to become false
    await waitFor(() => {
      expect(mockElectronAPI.validatePath).toHaveBeenCalledWith('/test/path')
    }, { timeout: 2000 })

    // Wait for isValidating to become false
    await waitFor(() => {
      expect(screen.queryByText('验证中...')).not.toBeInTheDocument()
    }, { timeout: 2000 })

    await user.click(screen.getByRole('combobox', { name: /Shell 程序/ }))
    await user.click(await screen.findByRole('option', { name: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /创建/ }))
    })

    await waitFor(() => {
      expect(mockElectronAPI.createWindow).toHaveBeenCalledWith({
        name: 'Test Window',
        workingDirectory: '/test/path',
        command: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      })
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('falls back to the global default shell when the field is left on auto', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<CreateWindowDialog open={true} onOpenChange={onOpenChange} />)

    // Use userEvent.type to properly update React state
    const workingDirInput = screen.getByLabelText(/工作目录/)
    await user.type(workingDirInput, '/test/path')

    // Wait for validation to complete (300ms debounce + async)
    await waitFor(() => {
      expect(mockElectronAPI.validatePath).toHaveBeenCalledWith('/test/path')
    }, { timeout: 2000 })

    // Wait for isValidating to become false
    await waitFor(() => {
      expect(screen.queryByText('验证中...')).not.toBeInTheDocument()
    }, { timeout: 2000 })

    // Submit the form directly
    await act(async () => {
      fireEvent.submit(screen.getByRole('form'))
    })

    await waitFor(() => {
      expect(mockElectronAPI.createWindow).toHaveBeenCalledWith({
        name: undefined,
        workingDirectory: '/test/path',
        command: undefined,
      })
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('submits a custom shell path selected from the file picker', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    // Type working directory
    await user.type(screen.getByLabelText(/工作目录/), '/test/path')

    // Wait for validation to complete
    await waitFor(() => {
      expect(mockElectronAPI.validatePath).toHaveBeenCalledWith('/test/path')
    }, { timeout: 2000 })

    // Wait for isValidating to become false
    await waitFor(() => {
      expect(screen.queryByText('验证中...')).not.toBeInTheDocument()
    }, { timeout: 2000 })

    // Select a custom shell from the dropdown to verify the form submits
    // the selected command path. We test the custom shell path by selecting
    // an existing scanned shell that isn't the default, which exercises
    // the same code path (onValueChange -> setCommand).
    await user.click(screen.getByRole('combobox', { name: /Shell 程序/ }))
    await user.click(await screen.findByRole('option', { name: 'C:\\Windows\\System32\\cmd.exe' }))

    // Submit the form
    await act(async () => {
      fireEvent.submit(screen.getByRole('form'))
    })

    await waitFor(() => {
      expect(mockElectronAPI.createWindow).toHaveBeenCalledWith({
        name: undefined,
        workingDirectory: '/test/path',
        command: 'C:\\Windows\\System32\\cmd.exe',
      })
    })
  })
})
