import { WindowStatus } from '../types/window';

/**
 * 状态色映射表（常量，避免重复创建）
 */
const STATUS_COLOR_MAP: Record<WindowStatus, string> = {
  [WindowStatus.Running]: 'bg-blue-500',
  [WindowStatus.WaitingForInput]: 'bg-amber-500',
  [WindowStatus.Completed]: 'bg-green-500',
  [WindowStatus.Error]: 'bg-red-500',
  [WindowStatus.Restoring]: 'bg-gray-500',
  [WindowStatus.Paused]: 'bg-gray-400'
};

/**
 * 状态文字色映射表（text-* 变体，用于文字和图标着色）
 */
const STATUS_TEXT_COLOR_MAP: Record<WindowStatus, string> = {
  [WindowStatus.Running]: 'text-blue-500',
  [WindowStatus.WaitingForInput]: 'text-amber-500',
  [WindowStatus.Completed]: 'text-green-500',
  [WindowStatus.Error]: 'text-red-500',
  [WindowStatus.Restoring]: 'text-gray-500',
  [WindowStatus.Paused]: 'text-gray-400'
};

/**
 * 状态标签映射表（常量，避免重复创建）
 */
const STATUS_LABEL_MAP: Record<WindowStatus, string> = {
  [WindowStatus.Running]: '运行中',
  [WindowStatus.WaitingForInput]: '等待输入',
  [WindowStatus.Completed]: '已完成',
  [WindowStatus.Error]: '出错',
  [WindowStatus.Restoring]: '恢复中',
  [WindowStatus.Paused]: '已暂停'
};

/**
 * 获取窗口状态对应的颜色类名
 * @param status 窗口状态
 * @returns Tailwind CSS 颜色类名
 */
export function getStatusColor(status: WindowStatus): string {
  return STATUS_COLOR_MAP[status];
}

/**
 * 获取窗口状态对应的中文标签
 * @param status 窗口状态
 * @returns 中文状态标签
 */
export function getStatusLabel(status: WindowStatus): string {
  return STATUS_LABEL_MAP[status];
}

/**
 * 获取窗口状态对应的文字颜色类名（text-* 变体）
 * @param status 窗口状态
 * @returns Tailwind CSS text-* 颜色类名
 */
export function getStatusTextColor(status: WindowStatus): string {
  return STATUS_TEXT_COLOR_MAP[status];
}
