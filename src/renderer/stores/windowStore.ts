import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Window, WindowStatus } from '../types/window';

// 全局标志：是否启用自动保存
let autoSaveEnabled = true;

/**
 * 触发自动保存
 * 通过 IPC 事件通知主进程触发保存
 * @param windows 当前窗口列表
 */
function triggerAutoSave(windows: Window[]): void {
  if (autoSaveEnabled && window.electronAPI) {
    window.electronAPI.triggerAutoSave(windows);
  }
}

/**
 * 设置自动保存开关
 */
export function setAutoSaveEnabled(enabled: boolean): void {
  autoSaveEnabled = enabled;
}

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
  updateWindow: (id: string, updates: Partial<Window>) => void;
  archiveWindow: (id: string) => void;
  unarchiveWindow: (id: string) => void;
  setActiveWindow: (id: string | null) => void;
  clearWindows: () => void; // 清空所有窗口（用于工作区恢复）

  // 辅助方法
  getWindowById: (id: string) => Window | undefined;
  getWindowsByStatus: (status: WindowStatus) => Window[];
  getActiveWindows: () => Window[]; // 获取未归档的窗口
  getArchivedWindows: () => Window[]; // 获取已归档的窗口
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
    addWindow: (window) => {
      set((state) => {
        state.windows.push(window);
      });
      // 触发自动保存，传递最新的窗口列表
      const windows = get().windows;
      triggerAutoSave(windows);
    },

    // 删除窗口
    removeWindow: (id) => {
      set((state) => {
        state.windows = state.windows.filter(w => w.id !== id);
        if (state.activeWindowId === id) {
          state.activeWindowId = null;
        }
      });
      // 触发自动保存，传递最新的窗口列表
      const windows = get().windows;
      triggerAutoSave(windows);
    },

    // 更新窗口状态
    updateWindowStatus: (id, status) => {
      set((state) => {
        const window = state.windows.find(w => w.id === id);
        if (window) {
          window.status = status;
          window.lastActiveAt = new Date().toISOString();
        }
      });
      // 触发自动保存，传递最新的窗口列表
      const windows = get().windows;
      triggerAutoSave(windows);
    },

    // 更新窗口（支持更新多个属性）
    updateWindow: (id, updates) => {
      set((state) => {
        const window = state.windows.find(w => w.id === id);
        if (window) {
          Object.assign(window, updates);
          window.lastActiveAt = new Date().toISOString();
        }
      });
      // 触发自动保存，传递最新的窗口列表
      const windows = get().windows;
      triggerAutoSave(windows);
    },

    // 归档窗口
    archiveWindow: (id) => {
      set((state) => {
        const window = state.windows.find(w => w.id === id);
        if (window) {
          window.archived = true;
          window.lastActiveAt = new Date().toISOString();
        }
        // 如果归档的是当前活跃窗口，清除活跃状态
        if (state.activeWindowId === id) {
          state.activeWindowId = null;
        }
      });
      // 触发自动保存
      const windows = get().windows;
      triggerAutoSave(windows);
    },

    // 取消归档窗口
    unarchiveWindow: (id) => {
      set((state) => {
        const window = state.windows.find(w => w.id === id);
        if (window) {
          window.archived = false;
          window.lastActiveAt = new Date().toISOString();
        }
      });
      // 触发自动保存
      const windows = get().windows;
      triggerAutoSave(windows);
    },

    // 设置活跃窗口
    setActiveWindow: (id) => {
      set((state) => {
        state.activeWindowId = id;
        if (id) {
          const window = state.windows.find(w => w.id === id);
          if (window) {
            window.lastActiveAt = new Date().toISOString();
          }
        }
      });
      // 触发自动保存，传递最新的窗口列表
      const windows = get().windows;
      triggerAutoSave(windows);
    },

    // 清空所有窗口（用于工作区恢复）
    clearWindows: () => {
      set((state) => {
        state.windows = [];
        state.activeWindowId = null;
      });
      // 不触发自动保存，因为这是恢复过程的一部分
    },

    // 根据 ID 查找窗口
    getWindowById: (id) => {
      return get().windows.find(w => w.id === id);
    },

    // 根据状态筛选窗口
    getWindowsByStatus: (status) => {
      return get().windows.filter(w => w.status === status);
    },

    // 获取未归档的窗口
    getActiveWindows: () => {
      return get().windows.filter(w => !w.archived);
    },

    // 获取已归档的窗口
    getArchivedWindows: () => {
      return get().windows.filter(w => w.archived);
    },
  }))
);

// Re-export types for convenience
export type { Window };
export { WindowStatus } from '../types/window';


