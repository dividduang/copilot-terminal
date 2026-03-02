import { useCallback } from 'react';
import { useWindowStore } from '../stores/windowStore';
import { WindowStatus } from '../types/window';
import { getAllPanes, getAggregatedStatus } from '../utils/layoutHelpers';

/**
 * 窗口切换 Hook
 * 统一处理窗口切换逻辑：如果窗口是暂停状态，先启动再切换
 */
export function useWindowSwitcher(onSwitchView: (windowId: string) => void) {
  const { getWindowById, updatePane, setActiveWindow } = useWindowStore();

  const switchToWindow = useCallback(async (windowId: string) => {
    const win = getWindowById(windowId);
    if (!win) {
      console.error('Window not found:', windowId);
      return;
    }

    // 获取窗口的聚合状态和所有窗格
    const aggregatedStatus = getAggregatedStatus(win.layout);
    const panes = getAllPanes(win.layout);

    console.log('[useWindowSwitcher] Current aggregated status:', aggregatedStatus);
    console.log('[useWindowSwitcher] Panes:', panes);

    // 如果窗口是暂停状态，启动所有窗格
    if (aggregatedStatus === WindowStatus.Paused) {
      try {
        console.log('[useWindowSwitcher] Updating panes to Restoring status...');
        // 更新所有窗格状态为 Restoring
        for (const pane of panes) {
          updatePane(win.id, pane.id, { status: WindowStatus.Restoring });
          console.log(`[useWindowSwitcher] Updated pane ${pane.id} to Restoring`);
        }

        // 验证状态是否更新
        const updatedWin = getWindowById(windowId);
        if (updatedWin) {
          const updatedStatus = getAggregatedStatus(updatedWin.layout);
          console.log('[useWindowSwitcher] Updated aggregated status:', updatedStatus);
        }

        // 使用 requestAnimationFrame 确保 UI 已经更新
        console.log('[useWindowSwitcher] Waiting for UI update...');
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            // 再等待一帧，确保渲染完成
            requestAnimationFrame(() => {
              setTimeout(resolve, 200); // 增加到 200ms 确保动画可见
            });
          });
        });

        console.log('[useWindowSwitcher] Starting panes...');
        // 启动所有窗格
        for (const pane of panes) {
          const result = await window.electronAPI.startWindow({
            windowId: win.id,
            paneId: pane.id,
            name: win.name,
            workingDirectory: pane.cwd,
            command: pane.command,
          });

          console.log(`[useWindowSwitcher] Pane ${pane.id} started with pid ${result.pid}`);

          // 更新窗格信息
          updatePane(win.id, pane.id, {
            pid: result.pid,
            status: result.status,
          });
        }

        // 等待一小段时间让终端初始化
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error('Failed to start window:', error);
        // 恢复所有窗格状态为 Paused
        for (const pane of panes) {
          updatePane(win.id, pane.id, { status: WindowStatus.Paused });
        }
        return;
      }
    }

    // 切换到终端视图
    console.log('[useWindowSwitcher] Switching to terminal view...');
    setActiveWindow(win.id);
    onSwitchView(win.id);
  }, [getWindowById, updatePane, setActiveWindow, onSwitchView]);

  return { switchToWindow };
}
