import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    rolldownOptions: {
      // Keyboard-driven sandbox for the character — /playground.html
      input: { main: resolve('index.html'), playground: resolve('playground.html') },
    },
  },
});
