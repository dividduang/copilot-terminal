import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Window, WindowStatus } from '../types/window';

/**
 * 窗口状态管理 Store 接口
 */
interface WindowStore {
  // 状态
  windows: Window[];
  activeWindowId: string | null;

  // Actions
  addWindow: (window: Window) => void;
  removeWindow: (id: string) => void;
  updateWindowStatus: (id: string, status: WindowStatus) => void;
  setActiveWindow: (id: string | null) => void;

  // 辅助方法
  getWindowById: (id: string) => Window | undefined;
  getWindowsByStatus: (status: WindowStatus) => Window[];
}

/**
 * 创建窗口状态管理 Store
 * 使用 immer 中间件确保不可变更新
 */
export const useWindowStore = create<WindowStore>()(
  immer((set, get) => ({
    // 初始状态
    windows: [],
    activeWindowId: null,

    // 添加窗口
    addWindow: (window) => set((state) => {
      state.windows.push(window);
    }),

    // 删除窗口
    removeWindow: (id) => set((state) => {
      state.windows = state.windows.filter(w => w.id !== id);
      if (state.activeWindowId === id) {
        state.activeWindowId = null;
      }
    }),

    // 更新窗口状态
    updateWindowStatus: (id, status) => set((state) => {
      const window = state.windows.find(w => w.id === id);
      if (window) {
        window.status = status;
        window.lastActiveAt = new Date().toISOString();
      }
    }),

    // 设置活跃窗口
    setActiveWindow: (id) => set((state) => {
      state.activeWindowId = id;
      if (id) {
        const window = state.windows.find(w => w.id === id);
        if (window) {
          window.lastActiveAt = new Date().toISOString();
        }
      }
    }),

    // 根据 ID 查找窗口
    getWindowById: (id) => {
      return get().windows.find(w => w.id === id);
    },

    // 根据状态筛选窗口
    getWindowsByStatus: (status) => {
      return get().windows.filter(w => w.status === status);
    },
  }))
);

// Re-export types for convenience
export type { Window };
export { WindowStatus } from '../types/window';


