import { WindowStatus } from '../types/window';

/**
 * 状态色映射表（常量，避免重复创建）
 */
const STATUS_COLOR_MAP: Record<WindowStatus, string> = {
  [WindowStatus.Running]: 'bg-blue-500',
  [WindowStatus.WaitingForInput]: 'bg-amber-500',
  [WindowStatus.Completed]: 'bg-green-500',
  [WindowStatus.Error]: 'bg-red-500',
  [WindowStatus.Restoring]: 'bg-gray-500'
};

/**
 * 状态标签映射表（常量，避免重复创建）
 */
const STATUS_LABEL_MAP: Record<WindowStatus, string> = {
  [WindowStatus.Running]: '运行中',
  [WindowStatus.WaitingForInput]: '等待输入',
  [WindowStatus.Completed]: '已完成',
  [WindowStatus.Error]: '出错',
  [WindowStatus.Restoring]: '恢复中'
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
