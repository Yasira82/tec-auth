import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals:     true,
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'lcov'],
      thresholds: {
        statements: 60,
        branches:   60,
        functions:  60,
        lines:      60,
      },
    },
  },
});
