import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

// A entrada regex do spartan espelha os aliases por componente do tsconfig.json
// (`@/shared/spartan/<comp>` -> `<comp>/src/index.ts`), como no electron.vite.config.
const alias = [
  {
    find: /^@\/shared\/spartan\/([^/]+)$/,
    replacement: resolve(__dirname, 'src/renderer/app/shared/spartan') + '/$1/src/index.ts',
  },
  { find: '@shared', replacement: resolve(__dirname, 'src/shared') },
  { find: '@main', replacement: resolve(__dirname, 'src/main') },
  { find: '@renderer', replacement: resolve(__dirname, 'src/renderer') },
  { find: '@/', replacement: resolve(__dirname, 'src/renderer/app') + '/' },
];

export default defineConfig({
  plugins: [angular({ tsconfig: resolve(__dirname, 'tsconfig.spec.json') })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'src/renderer/test-setup.ts')],
    include: ['src/renderer/**/*.spec.ts', 'src/shared/**/*.spec.ts', 'src/main/**/*.spec.ts'],
    alias,
  },
});
