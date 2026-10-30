import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    // OBS browser source runs Chromium 127 (CEF in OBS 32), the same floor as `browserslist` in package.json
    target: 'chrome127',
  },
});
