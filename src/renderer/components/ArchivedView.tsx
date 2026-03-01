import React, { useCallback, useMemo } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { useWindowStore } from '../stores/windowStore';
import { sortWindows } from '../utils/sortWindows';
import { WindowCard } from './WindowCard';
import { Window } from '../types/window';

interface ArchivedViewProps {
  onEnterTerminal?: (window: Window) => void;
}

/**
 * ArchivedView 组件
 * 显示所有已归档的窗口
 */
export const ArchivedView = React.memo<ArchivedViewProps>(({ onEnterTerminal }) => {
  const windows = useWindowStore((state) => state.windows);
  const setActiveWindow = useWindowStore((state) => state.setActiveWindow);
  const removeWindow = useWindowStore((state) => state.removeWindow);
  const updateWindow = useWindowStore((state) => state.updateWindow);
  const unarchiveWindow = useWindowStore((state) => state.unarchiveWindow);

  // 只显示已归档的窗口
  const archivedWindows = useMemo(() => windows.filter(w => w.archived), [windows]);

  // 按 lastActiveAt 降序排序
  const sortedWindows = useMemo(() => sortWindows(archivedWindows, 'lastActiveAt'), [archivedWindows]);

  const handleUnarchiveWindow = useCallback((win: Window) => {
    unarchiveWindow(win.id);
  }, [unarchiveWindow]);

  const handleDeleteWindow = useCallback(async (windowId: string) => {
    try {
      await window.electronAPI.deleteWindow(windowId);
      removeWindow(windowId);
    } catch (error) {
      console.error('Failed to delete window:', error);
    }
  }, [removeWindow]);

  const handleOpenFolder = useCallback(async (workingDirectory: string) => {
    try {
      await window.electronAPI.openFolder(workingDirectory);
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }, []);

  if (archivedWindows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-[rgb(var(--muted-foreground))]">暂无归档终端</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea.Root className="h-full" data-testid="archived-view-scroll-root">
      <ScrollArea.Viewport className="h-full w-full">
        <div
          data-testid="archived-view"
          className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 p-8"
        >
          {sortedWindows.map((win) => (
            <WindowCard
              key={win.id}
              window={win}
              onClick={() => {}}
              onOpenFolder={() => handleOpenFolder(win.workingDirectory)}
              onDelete={() => handleDeleteWindow(win.id)}
              onUnarchive={() => handleUnarchiveWindow(win)}
            />
          ))}
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        className="flex w-2.5 touch-none select-none bg-transparent p-0.5 transition-colors hover:bg-zinc-800/50"
      >
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-colors" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
});

ArchivedView.displayName = 'ArchivedView';
