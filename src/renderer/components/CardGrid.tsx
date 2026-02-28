import React, { useCallback, useMemo } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { useWindowStore } from '../stores/windowStore';
import { sortWindows } from '../utils/sortWindows';
import { WindowCard } from './WindowCard';

/**
 * CardGrid 组件
 * 以响应式 CSS Grid 网格布局显示所有窗口卡片
 */
export const CardGrid = React.memo(() => {
  const windows = useWindowStore((state) => state.windows);
  const setActiveWindow = useWindowStore((state) => state.setActiveWindow);

  // 按 lastActiveAt 降序排序，缓存结果避免每次渲染都排序
  const sortedWindows = useMemo(() => sortWindows(windows, 'lastActiveAt'), [windows]);

  const handleCardClick = useCallback(
    (windowId: string) => {
      setActiveWindow(windowId);
      // TODO: Story 5-2 将实现切换到终端视图
    },
    [setActiveWindow]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, windowId: string) => {
    e.preventDefault();
    // TODO: Story 2.4 的右键菜单将在这里集成
    console.log('打开右键菜单:', windowId);
  }, []);

  if (windows.length === 0) {
    return null; // EmptyState 由 Story 3.4 实现
  }

  return (
    <ScrollArea.Root className="h-full" data-testid="card-grid-scroll-root">
      <ScrollArea.Viewport className="h-full w-full">
        <div
          data-testid="card-grid"
          className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 p-6"
        >
          {sortedWindows.map((window) => (
            <WindowCard
              key={window.id}
              window={window}
              onClick={() => handleCardClick(window.id)}
              onContextMenu={(e) => handleContextMenu(e, window.id)}
            />
          ))}
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        className="flex w-2 touch-none select-none bg-zinc-900 p-0.5 transition-colors"
      >
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-zinc-700" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
});

CardGrid.displayName = 'CardGrid';
