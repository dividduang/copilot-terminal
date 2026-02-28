import { Window, WindowStatus } from '../types/window';

/**
 * Store Selectors
 * 用于精确订阅 store 状态，避免不必要的重渲染
 */

interface WindowStoreState {
  windows: Window[];
  activeWindowId: string | null;
}

// 获取所有窗口
export const selectAllWindows = (state: WindowStoreState) => state.windows;

// 获取当前活跃窗口
export const selectActiveWindow = (state: WindowStoreState) => {
  if (!state.activeWindowId) return null;
  return state.windows.find((w) => w.id === state.activeWindowId) || null;
};

// 按状态筛选窗口
export const selectWindowsByStatus = (status: WindowStatus) => (state: WindowStoreState) => {
  return state.windows.filter((w) => w.status === status);
};

// 获取窗口总数
export const selectWindowCount = (state: WindowStoreState) => state.windows.length;

// 获取各状态窗口数量统计
export const selectStatusCounts = (state: WindowStoreState) => {
  const counts = {
    running: 0,
    waiting: 0,
    completed: 0,
    error: 0,
    restoring: 0,
  };

  state.windows.forEach((w) => {
    counts[w.status]++;
  });

  return counts;
};
