import React, { useMemo } from 'react';
import { Activity, Pause, CheckCircle, XCircle } from 'lucide-react';
import { useWindowStore } from '../stores/windowStore';
import { WindowStatus } from '../types/window';

/**
 * StatusBar 组件
 * 在侧边栏中显示各状态的窗口数量统计
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

  return (
    <div
      aria-live="polite"
      aria-label={ariaLabel}
      className="space-y-2"
    >
      {/* 运行中 */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-400" aria-hidden="true" />
          <span className="text-xs text-zinc-400">运行中</span>
        </div>
        <span className="text-sm font-semibold text-green-400">
          {statusCounts.running}
        </span>
      </div>

      {/* 等待输入 */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2">
          <Pause className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-xs text-zinc-400">等待输入</span>
        </div>
        <span className="text-sm font-semibold text-blue-400">
          {statusCounts.waiting}
        </span>
      </div>

      {/* 已完成 */}
      {statusCounts.completed > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-zinc-400" aria-hidden="true" />
            <span className="text-xs text-zinc-400">已完成</span>
          </div>
          <span className="text-sm font-semibold text-zinc-400">
            {statusCounts.completed}
          </span>
        </div>
      )}

      {/* 出错 */}
      {statusCounts.error > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
            <span className="text-xs text-zinc-400">出错</span>
          </div>
          <span className="text-sm font-semibold text-red-400">
            {statusCounts.error}
          </span>
        </div>
      )}
    </div>
  );
});

