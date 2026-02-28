import React, { useMemo } from 'react';
import { Activity, Pause, CheckCircle, XCircle } from 'lucide-react';
import { useWindowStore } from '../stores/windowStore';
import { WindowStatus } from '../types/window';
import { getStatusTextColor } from '../utils/statusHelpers';

/**
 * StatusBar 组件
 * 在工具栏中显示各状态的窗口数量统计
 */
export const StatusBar = React.memo(function StatusBar() {
  const windows = useWindowStore((state) => state.windows);

  // 缓存状态计数
  const statusCounts = useMemo(() => ({
    running: windows.filter((w) => w.status === WindowStatus.Running).length,
    waiting: windows.filter((w) => w.status === WindowStatus.WaitingForInput).length,
    completed: windows.filter((w) => w.status === WindowStatus.Completed).length,
    error: windows.filter((w) => w.status === WindowStatus.Error).length,
  }), [windows]);

  // 缓存 aria-label
  const ariaLabel = useMemo(
    () =>
      `窗口状态统计：运行中 ${statusCounts.running} 个，等待输入 ${statusCounts.waiting} 个，已完成 ${statusCounts.completed} 个，出错 ${statusCounts.error} 个`,
    [statusCounts]
  );

  const runningColor = getStatusTextColor(WindowStatus.Running);
  const waitingColor = getStatusTextColor(WindowStatus.WaitingForInput);
  const completedColor = getStatusTextColor(WindowStatus.Completed);
  const errorColor = getStatusTextColor(WindowStatus.Error);

  return (
    <div
      aria-live="polite"
      aria-label={ariaLabel}
      className="flex items-center"
    >
      {/* 标准模式（>= 640px）：文字标签 + 数字 */}
      <div className="hidden sm:flex items-center space-x-1">
        <span className="text-sm text-zinc-400">运行中</span>
        <span className={`text-sm font-semibold ${runningColor}`}>
          {statusCounts.running}
        </span>
        <span className="text-zinc-500 mx-2">·</span>
        <span className="text-sm text-zinc-400">等待输入</span>
        <span className={`text-sm font-semibold ${waitingColor}`}>
          {statusCounts.waiting}
        </span>
        <span className="text-zinc-500 mx-2">·</span>
        <span className="text-sm text-zinc-400">已完成</span>
        <span className={`text-sm font-semibold ${completedColor}`}>
          {statusCounts.completed}
        </span>
        <span className="text-zinc-500 mx-2">·</span>
        <span className="text-sm text-zinc-400">出错</span>
        <span className={`text-sm font-semibold ${errorColor}`}>
          {statusCounts.error}
        </span>
      </div>

      {/* 简化模式（< 640px）：图标 + 数字 */}
      <div className="flex sm:hidden items-center space-x-3">
        <div className="flex items-center space-x-1">
          <Activity className={`w-4 h-4 ${runningColor}`} aria-hidden="true" />
          <span className={`text-sm font-semibold ${runningColor}`}>
            {statusCounts.running}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <Pause className={`w-4 h-4 ${waitingColor}`} aria-hidden="true" />
          <span className={`text-sm font-semibold ${waitingColor}`}>
            {statusCounts.waiting}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <CheckCircle className={`w-4 h-4 ${completedColor}`} aria-hidden="true" />
          <span className={`text-sm font-semibold ${completedColor}`}>
            {statusCounts.completed}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <XCircle className={`w-4 h-4 ${errorColor}`} aria-hidden="true" />
          <span className={`text-sm font-semibold ${errorColor}`}>
            {statusCounts.error}
          </span>
        </div>
      </div>
    </div>
  );
});
