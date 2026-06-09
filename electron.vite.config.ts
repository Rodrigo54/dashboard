import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import angular from '@analogjs/vite-plugin-angular';

// Config única para os três processos do Electron.
// - main/preload: bundle CJS via Rollup; deps de runtime (electron, node:sqlite,
//   drizzle-orm) ficam externalizadas e são resolvidas de node_modules.
// - renderer: app Angular compilado pelo plugin do AnalogJS, sob o Vite.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: resolve(__dirname, 'src/main/main.ts') },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: resolve(__dirname, 'src/main/preload.ts') },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    base: './',
    publicDir: resolve(__dirname, 'public'),
    plugins: [angular({ tsconfig: resolve(__dirname, 'tsconfig.app.json') })],
  },
});
