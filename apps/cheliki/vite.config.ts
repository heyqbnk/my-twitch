import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

import { createCssModuleScopedName } from './config/createCssModuleScopedName.ts';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  build: {
    rolldownOptions: {
      // Real chat — /, a sandbox with made-up viewers — /playground.html
      input: {
        main: resolve('index.html'),
        playground: resolve('playground.html'),
      },
    },
    // Resolved from .browserslistrc.
    target: browserslistToEsbuild(undefined, { path: import.meta.dirname }),
  },
  css: {
    modules: {
      generateScopedName: createCssModuleScopedName({
        rootDir: import.meta.dirname,
        withComponentName: command === 'serve',
      }),
    },
  },
  plugins: [vue(), tailwindcss()],
}));
