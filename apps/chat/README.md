# chat

Оверлей с сообщениями из чата Twitch. Пока только заготовка: Vue + Vite + Tailwind, без функционала.

## Где работает

Оверлей делается для browser source в OBS. Минимальная версия браузера — Chromium 127 (CEF в
OBS 32.2): она указана в `browserslist` в `package.json` и в `build.target` в `vite.config.ts`.

## Команды

- `pnpm --filter chat dev` — dev-сервер.
- `pnpm --filter chat build` — проверка типов и сборка в `dist/`.
- `pnpm --filter chat lint` — ESLint и stylelint.
