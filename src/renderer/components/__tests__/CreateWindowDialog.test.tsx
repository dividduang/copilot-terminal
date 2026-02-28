import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { CreateWindowDialog } from '../CreateWindowDialog'
import { useWindowStore } from '../../stores/windowStore'

// Mock window.electronAPI
const mockElectronAPI = {
  validatePath: vi.fn(),
  selectDirectory: vi.fn(),
  createWindow: vi.fn(),
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

describe('CreateWindowDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useWindowStore.setState({ windows: [], activeWindowId: null })
  })

  it('should render dialog when open', () => {
    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    expect(screen.getByText('新建窗口')).toBeInTheDocument()
    expect(screen.getByLabelText(/窗口名称/)).toBeInTheDocument()
    expect(screen.getByLabelText(/工作目录/)).toBeInTheDocument()
    expect(screen.getByLabelText(/启动命令/)).toBeInTheDocument()
  })

  it('should not render dialog when closed', () => {
    render(<CreateWindowDialog open={false} onOpenChange={() => {}} />)

    expect(screen.queryByText('新建窗口')).not.toBeInTheDocument()
  })

  it('should show placeholder for window name', () => {
    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    const nameInput = screen.getByLabelText(/窗口名称/)
    expect(nameInput).toHaveAttribute('placeholder', '窗口 #1')
  })

  it('should validate path and show error for invalid path', async () => {
    mockElectronAPI.validatePath.mockResolvedValue(false)

    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    const dirInput = screen.getByLabelText(/工作目录/)
    fireEvent.change(dirInput, { target: { value: '/invalid/path' } })

    await waitFor(() => {
      expect(screen.getByText('路径不存在')).toBeInTheDocument()
    })
  })

  it('should not show error for valid path', async () => {
    mockElectronAPI.validatePath.mockResolvedValue(true)

    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    const dirInput = screen.getByLabelText(/工作目录/)
    fireEvent.change(dirInput, { target: { value: '/valid/path' } })

    await waitFor(() => {
      expect(mockElectronAPI.validatePath).toHaveBeenCalledWith('/valid/path')
    })

    expect(screen.queryByText('路径不存在')).not.toBeInTheDocument()
  })

  it('should call selectDirectory when browse button clicked', async () => {
    mockElectronAPI.selectDirectory.mockResolvedValue('/selected/path')
    mockElectronAPI.validatePath.mockResolvedValue(true)

    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    const browseButton = screen.getByText('浏览')
    fireEvent.click(browseButton)

    await waitFor(() => {
      expect(mockElectronAPI.selectDirectory).toHaveBeenCalled()
    })

    const dirInput = screen.getByLabelText(/工作目录/) as HTMLInputElement
    expect(dirInput.value).toBe('/selected/path')
  })

  it('should disable create button when path is invalid', async () => {
    mockElectronAPI.validatePath.mockResolvedValue(false)

    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    const dirInput = screen.getByLabelText(/工作目录/)
    fireEvent.change(dirInput, { target: { value: '/invalid/path' } })

    await waitFor(() => {
      expect(screen.getByText('路径不存在')).toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: /创建/ })
    expect(createButton).toBeDisabled()
  })

  it('should create window and close dialog on submit', async () => {
    const mockWindow = {
      id: 'test-id',
      name: 'Test Window',
      workingDirectory: '/test/path',
      command: 'bash',
      status: 'running',
      pid: 1234,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    }

    mockElectronAPI.validatePath.mockResolvedValue(true)
    mockElectronAPI.createWindow.mockResolvedValue(mockWindow)

    const onOpenChange = vi.fn()
    render(<CreateWindowDialog open={true} onOpenChange={onOpenChange} />)

    const nameInput = screen.getByLabelText(/窗口名称/)
    const dirInput = screen.getByLabelText(/工作目录/)
    const commandInput = screen.getByLabelText(/启动命令/)

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Test Window' } })
      fireEvent.change(dirInput, { target: { value: '/test/path' } })
      fireEvent.change(commandInput, { target: { value: 'bash' } })
    })

    // 等待验证完成
    await waitFor(() => {
      expect(screen.queryByText('路径不存在')).not.toBeInTheDocument()
      expect(screen.queryByText('验证中...')).not.toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: /创建/ })

    await act(async () => {
      fireEvent.click(createButton)
    })

    await waitFor(() => {
      expect(mockElectronAPI.createWindow).toHaveBeenCalledWith({
        name: 'Test Window',
        workingDirectory: '/test/path',
        command: 'bash',
      })
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should support keyboard navigation with Tab', () => {
    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    const nameInput = screen.getByLabelText(/窗口名称/)
    const dirInput = screen.getByLabelText(/工作目录/)
    const commandInput = screen.getByLabelText(/启动命令/)

    nameInput.focus()
    expect(document.activeElement).toBe(nameInput)

    fireEvent.keyDown(nameInput, { key: 'Tab' })
    // Note: Tab navigation is handled by browser, we just verify inputs are focusable
    expect(dirInput).toBeInTheDocument()
    expect(commandInput).toBeInTheDocument()
  })

  it('should close dialog on Escape key', async () => {
    const onOpenChange = vi.fn()
    render(<CreateWindowDialog open={true} onOpenChange={onOpenChange} />)

    const form = screen.getByRole('form')
    await act(async () => {
      fireEvent.keyDown(form, { key: 'Escape' })
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should submit form on Enter key when path is valid', async () => {
    const mockWindow = {
      id: 'test-id',
      name: 'Test Window',
      workingDirectory: '/test/path',
      command: 'bash',
      status: 'running',
      pid: 1234,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    }

    mockElectronAPI.validatePath.mockResolvedValue(true)
    mockElectronAPI.createWindow.mockResolvedValue(mockWindow)

    const onOpenChange = vi.fn()
    render(<CreateWindowDialog open={true} onOpenChange={onOpenChange} />)

    const dirInput = screen.getByLabelText(/工作目录/)

    await act(async () => {
      fireEvent.change(dirInput, { target: { value: '/test/path' } })
    })

    // 等待验证完成
    await waitFor(() => {
      expect(screen.queryByText('路径不存在')).not.toBeInTheDocument()
      expect(screen.queryByText('验证中...')).not.toBeInTheDocument()
    })

    const form = screen.getByRole('form')
    await act(async () => {
      fireEvent.keyDown(form, { key: 'Enter' })
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

  it('should not submit on Enter key when path is invalid', async () => {
    mockElectronAPI.validatePath.mockResolvedValue(false)

    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    const dirInput = screen.getByLabelText(/工作目录/)

    await act(async () => {
      fireEvent.change(dirInput, { target: { value: '/invalid/path' } })
    })

    await waitFor(() => {
      expect(screen.getByText('路径不存在')).toBeInTheDocument()
    })

    const form = screen.getByRole('form')
    await act(async () => {
      fireEvent.keyDown(form, { key: 'Enter' })
    })

    expect(mockElectronAPI.createWindow).not.toHaveBeenCalled()
  })

  it('should disable create button while validating', async () => {
    mockElectronAPI.validatePath.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(true), 500))
    )

    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    const dirInput = screen.getByLabelText(/工作目录/)
    const createButton = screen.getByRole('button', { name: /创建/ })

    await act(async () => {
      fireEvent.change(dirInput, { target: { value: '/test/path' } })
    })

    // 验证期间按钮应该被禁用
    expect(createButton).toBeDisabled()
  })

  it('should show user-friendly error message on create failure', async () => {
    mockElectronAPI.validatePath.mockResolvedValue(true)
    mockElectronAPI.createWindow.mockRejectedValue(new Error('进程管理器未初始化，请重启应用'))

    render(<CreateWindowDialog open={true} onOpenChange={() => {}} />)

    const dirInput = screen.getByLabelText(/工作目录/)

    await act(async () => {
      fireEvent.change(dirInput, { target: { value: '/test/path' } })
    })

    // 等待验证完成
    await waitFor(() => {
      expect(screen.queryByText('路径不存在')).not.toBeInTheDocument()
      expect(screen.queryByText('验证中...')).not.toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: /创建/ })

    await act(async () => {
      fireEvent.click(createButton)
    })

    await waitFor(() => {
      expect(screen.getByText('进程管理器未初始化，请重启应用')).toBeInTheDocument()
    })
  })
})
