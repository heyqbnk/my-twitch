import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';

// Страница превью: подменяет SVG по событию walker:update, не сбрасывая скролл и зум
const PREVIEW_PAGE = `<!doctype html>
<meta charset="utf-8">
<title>Walker sprites</title>
<style>body { margin: 0; background: #d4d4dc } #sheet svg { display: block }</style>
<div id="sheet"></div>
<script type="module">
  import { createHotContext } from '/@vite/client'
  const sheet = document.getElementById('sheet')
  const load = async () => (sheet.innerHTML = await (await fetch('/walker-preview.svg?t=' + Date.now())).text())
  createHotContext('/walker-preview').on('walker:update', load)
  load()
</script>
`;

// В dev-режиме перегенерирует спрайты человечка и SVG-превью для ревью при старте и после правки генератора.
// Превью с HMR — /walker-preview, сам SVG — /walker-preview.svg
function walkerSprites(): Plugin {
  const script = resolve('scripts/generate-walker.mjs');
  const generate = () => promisify(execFile)(process.execPath, [script, 'src/scene/walkerSprite.ts', 'walker-preview.svg']);
  return {
    name: 'walker-sprites',
    apply: 'serve',
    async configureServer(server) {
      await generate();
      server.watcher.add(script);
      server.watcher.on('change', file => {
        if (file !== script) return;
        generate().then(
          () => {
            server.ws.send({ type: 'custom', event: 'walker:update' });
            server.config.logger.info('walker sprites regenerated', { timestamp: true });
          },
          error => server.config.logger.error(`walker sprites: ${error.stderr || error.message}`, { timestamp: true }),
        );
      });
      server.middlewares.use('/walker-preview', (req, res, next) => {
        if (req.url !== '/' && req.url !== '') return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(PREVIEW_PAGE);
      });
      const printUrls = server.printUrls;
      server.printUrls = () => {
        printUrls();
        const local = server.resolvedUrls?.local[0];
        if (local) server.config.logger.info(`  ➜  Sprites: ${local}walker-preview`);
      };
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), walkerSprites()],
  build: {
    rolldownOptions: {
      // Песочница для отладки сцены без настоящего чата — /playground.html
      input: { main: resolve('index.html'), playground: resolve('playground.html') },
    },
  },
});
