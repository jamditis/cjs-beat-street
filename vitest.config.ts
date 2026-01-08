import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    // Exclude Phaser-related tests from jsdom environment (they need special handling)
    exclude: ['**/node_modules/**', '**/dist/**', '**/game/**'],
  },
});
