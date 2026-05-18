import { defineConfig } from 'tsup';

export default defineConfig([
  // ── Main bundle (client) ──────────────────────────────
  {
    entry:       { index: 'src/index.ts' },
    format:      ['cjs', 'esm'],
    dts:         true,
    sourcemap:   true,
    clean:       true,
    outDir:      'dist',
    external:    ['next', 'react', 'react-dom'],
    banner:      { js: "'use client';" },
  },
  // ── Middleware bundle (server) ────────────────────────
  {
    entry:       { index: 'src/middleware/index.ts' },
    format:      ['cjs', 'esm'],
    dts:         true,
    sourcemap:   true,
    outDir:      'dist/middleware',
    external:    ['next'],
  },
]);
