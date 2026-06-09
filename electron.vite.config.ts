import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import angular from '@analogjs/vite-plugin-angular';
import tailwindcss from '@tailwindcss/vite';

// Aliases compartilhados pelos três processos. Espelham os `paths` dos tsconfig
// (@shared / @main / @renderer) para que a resolução em runtime/build bata com
// o type-check.
const alias = {
  '@shared': resolve(__dirname, 'src/shared'),
  '@main': resolve(__dirname, 'src/main'),
  '@renderer': resolve(__dirname, 'src/renderer'),
  '@/': resolve(__dirname, 'src/renderer/app') + '/',
};

// Config única para os três processos do Electron.
// - main/preload: bundle CJS via Rollup; deps de runtime (electron, node:sqlite,
//   drizzle-orm) ficam externalizadas (build.externalizeDeps) e são resolvidas
//   de node_modules.
// - renderer: app Angular compilado pelo plugin do AnalogJS, sob o Vite.
export default defineConfig({
  main: {
    resolve: { alias },
    build: {
      externalizeDeps: true,
      lib: { entry: resolve(__dirname, 'src/main/main.ts') },
    },
  },
  preload: {
    resolve: { alias },
    build: {
      externalizeDeps: true,
      lib: { entry: resolve(__dirname, 'src/main/preload.ts') },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    base: './',
    publicDir: resolve(__dirname, 'public'),
    resolve: { alias },
    plugins: [tailwindcss(), angular({ tsconfig: resolve(__dirname, 'tsconfig.app.json') })],
  },
});
