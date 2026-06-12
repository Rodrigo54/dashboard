import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

const alias = {
  '@shared': resolve(__dirname, 'src/shared'),
  '@main': resolve(__dirname, 'src/main'),
  '@renderer': resolve(__dirname, 'src/renderer'),
  '@/': resolve(__dirname, 'src/renderer/app') + '/',
};

export default defineConfig({
  plugins: [angular({ tsconfig: resolve(__dirname, 'tsconfig.spec.json') })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'src/renderer/test-setup.ts')],
    include: ['src/renderer/**/*.spec.ts'],
    alias,
  },
});
