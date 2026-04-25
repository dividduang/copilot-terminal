import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ThemeState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  immer((set) => ({
    theme: 'dark',

    toggleTheme: () => {
      set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        state.theme = newTheme;
        // 保存到 settings
        window.electronAPI?.saveSettings?.({ theme: newTheme });
      });
    },

    setTheme: (theme: 'dark' | 'light') => {
      set((state) => {
        state.theme = theme;
        // 保存到 settings
        window.electronAPI?.saveSettings?.({ theme });
      });
    },

    initTheme: () => {
      // 从保存的 settings 中读取主题，如果没有则默认为 'dark'
      const loadTheme = async () => {
        try {
          const response = await window.electronAPI?.getSettings?.();
          if (response?.success && response.data?.theme) {
            set((state) => {
              state.theme = response.data.theme;
            });
          }
        } catch (error) {
          console.error('Failed to load theme from settings:', error);
        }
      };
      loadTheme();
    },
  }))
);
