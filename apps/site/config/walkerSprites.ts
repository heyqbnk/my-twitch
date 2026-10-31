import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import type { Plugin } from 'vite';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts/generate-walker.mjs');
const SOURCES = [SCRIPT, path.join(ROOT, 'scripts/aseprite.mjs')];
const SPRITES = path.join(ROOT, 'sprites');
/**
 * The generated sprite module of the dudes widget.
 */
const OUTPUT = path.join(
  ROOT,
  'layers/pages/app/components/twitch-dudes-widget/_utils/walkerSprite.ts',
);
const PREVIEW = path.join(ROOT, 'walker-preview.svg');

/**
 * The preview page: swaps the SVG on the walker:update event without resetting scroll and zoom.
 */
function previewPage(base: string) {
  return `<!doctype html>
<meta charset="utf-8">
<title>Walker sprites</title>
<style>body { margin: 0; background: #d4d4dc } #sheet svg { display: block }</style>
<div id="sheet"></div>
<script type="module">
  import { createHotContext } from '${base}@vite/client'
  const sheet = document.getElementById('sheet')
  const load = async () => (sheet.innerHTML = await (await fetch('/walker-preview.svg?t=' + Date.now())).text())
  createHotContext('/walker-preview').on('walker:update', load)
  load()
</script>
`;
}

/**
 * In dev mode regenerates the dude sprites and the SVG review preview on start and after the
 * generator or sprites/*.aseprite change. The preview with HMR is /walker-preview, the SVG itself
 * is /walker-preview.svg.
 */
export function walkerSprites(): Plugin {
  const generate = () => promisify(execFile)(process.execPath, [SCRIPT, OUTPUT, PREVIEW]);
  return {
    apply: 'serve',
    async configureServer(server) {
      await generate();
      server.watcher.add([...SOURCES, SPRITES]);
      server.watcher.on('change', file => {
        const changed = path.resolve(file);
        if (!SOURCES.includes(changed)
          && !(changed.startsWith(SPRITES) && changed.endsWith('.aseprite'))) {
          return;
        }
        generate().then(
          () => {
            server.ws.send({ event: 'walker:update', type: 'custom' });
            server.config.logger.info('walker sprites regenerated', { timestamp: true });
          },
          (error: { message: string; stderr?: string }) => server.config.logger.error(
            `walker sprites: ${error.stderr || error.message}`,
            { timestamp: true },
          ),
        );
      });
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url === '/walker-preview') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(previewPage(server.config.base));
        } else if (url === '/walker-preview.svg') {
          res.setHeader('Content-Type', 'image/svg+xml');
          // Read on each request: the generator rewrites the file
          res.end(readFileSync(PREVIEW));
        } else {
          next();
        }
      });
    },
    name: 'walker-sprites',
  };
}
