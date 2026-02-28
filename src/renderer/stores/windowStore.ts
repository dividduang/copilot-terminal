import { create } from 'zustand';
import { TerminalWindow, WindowStatus } from '../types/window';

// Store state interface
interface WindowStore {
  windows: TerminalWindow[];
  activeWindowId: string | null;

  // Actions
  addWindow: (window: TerminalWindow) => void;
  removeWindow: (id: string) => void;
  updateWindowStatus: (id: string, status: WindowStatus) => void;
  setActiveWindow: (id: string | null) => void;
  getWindow: (id: string) => TerminalWindow | undefined;
}

// Create store
export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  activeWindowId: null,

  addWindow: (window) => set((state) => ({
    windows: [...state.windows, window],
  })),

  removeWindow: (id) => set((state) => ({
    windows: state.windows.filter((w) => w.id !== id),
    activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
  })),

  updateWindowStatus: (id, status) => set((state) => ({
    windows: state.windows.map((w) =>
      w.id === id ? { ...w, status, lastActiveAt: new Date().toISOString() } : w
    ),
  })),

  setActiveWindow: (id) => set({ activeWindowId: id }),

  getWindow: (id) => get().windows.find((w) => w.id === id),
}));

// Re-export types for convenience
export type Window = TerminalWindow;
export { WindowStatus } from '../types/window';

