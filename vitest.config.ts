import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @xterm packages only ship .mjs but package.json points to .js
      '@xterm/addon-fit': path.resolve(__dirname, 'node_modules/@xterm/addon-fit/lib/addon-fit.mjs'),
      '@xterm/xterm': path.resolve(__dirname, 'node_modules/@xterm/xterm/lib/xterm.mjs'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/renderer/test-setup.ts'],
    // Ensure mocked modules are not optimized/transformed by vitest
    deps: {
      optimizer: {
        web: {
          exclude: ['@xterm/xterm', '@xterm/addon-fit'],
        },
      },
    },
  },
});
