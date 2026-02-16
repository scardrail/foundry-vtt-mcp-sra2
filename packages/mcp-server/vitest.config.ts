import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/dsa5/filters.test.ts'], // DSA5 file is console demo, not vitest suite
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.*', '**/*.spec.*'],
    },
  },
  resolve: {
    alias: {
      '@shared': '../../shared',
    },
  },
});