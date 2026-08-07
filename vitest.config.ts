import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    // Server tests exercise real Node HTTP/WebSocket servers and opt back into
    // the plain 'node' environment individually via a `// @vitest-environment
    // node` docblock — jsdom's own WebSocket/Event globals otherwise conflict
    // with Node's native ones.
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}', 'server/**/*.test.js'],
    exclude: ['node_modules', 'dist', 'e2e', 'server/node_modules'],
  },
});
