import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../ConfirmDialog'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'zh-CN', setLanguage: vi.fn() }),
}))

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onConfirm: vi.fn(),
    onOpenChange: vi.fn(),
    title: '关闭窗口',
    description: '确定关闭？终端进程将被终止',
    confirmText: '关闭',
    cancelText: '取消',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('关闭窗口')).toBeInTheDocument()
    expect(screen.getByText('确定关闭？终端进程将被终止')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('关闭窗口')).not.toBeInTheDocument()
  })

  it('should call onConfirm when confirm button clicked', () => {
    render(<ConfirmDialog {...defaultProps} />)
    fireEvent.click(screen.getByText('关闭'))
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
  })

  it('should call onOpenChange(false) when cancel button clicked', () => {
    render(<ConfirmDialog {...defaultProps} />)
    fireEvent.click(screen.getByText('取消'))
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should call onOpenChange(false) when Esc key pressed', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)
    await user.keyboard('{Escape}')
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should call onOpenChange(false) after confirm', () => {
    render(<ConfirmDialog {...defaultProps} />)
    fireEvent.click(screen.getByText('关闭'))
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should render custom confirmText', () => {
    render(<ConfirmDialog {...defaultProps} confirmText="删除" />)
    expect(screen.getByText('删除')).toBeInTheDocument()
  })

  it('should render custom cancelText', () => {
    render(<ConfirmDialog {...defaultProps} cancelText="返回" />)
    expect(screen.getByText('返回')).toBeInTheDocument()
  })

  it('should use i18n fallback for confirm button when confirmText not provided', () => {
    const { confirmText, ...propsWithoutConfirmText } = defaultProps
    render(<ConfirmDialog {...propsWithoutConfirmText} />)
    // i18n mock returns the key, so it should show 'common.create'
    expect(screen.getByText('common.create')).toBeInTheDocument()
  })

  it('should use i18n fallback for cancel button when cancelText not provided', () => {
    const { cancelText, ...propsWithoutCancelText } = defaultProps
    render(<ConfirmDialog {...propsWithoutCancelText} />)
    // i18n mock returns the key, so it should show 'common.cancel'
    expect(screen.getByText('common.cancel')).toBeInTheDocument()
  })
})
