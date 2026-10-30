# cheliki

Сцена с человечками из чата Twitch для browser source в OBS: автор сообщения выходит куклой и
бродит по низу экрана. Что умеет приложение и параметры адреса — в `README.md`. Общие для
репозитория правила — в корневом AGENTS.md.

## Команды

Запускаются из корня репозитория. Корневые `pnpm lint` / `pnpm typecheck` прогоняют turbo-задачу
во всех пакетах; чтобы ограничиться этим приложением, добавь фильтр:
`pnpm --filter cheliki <скрипт>`.

| | |
|---|---|
| `pnpm --filter cheliki dev` | запустить dev-сервер |
| `pnpm --filter cheliki lint` / `lint:fix` | ESLint и Stylelint (и автоисправление) |
| `pnpm --filter cheliki typecheck` | проверка типов TypeScript (через `vue-tsc`) |
| `pnpm --filter cheliki build` | проверка типов и production-сборка |

**Чтобы проверить изменение, запусти `lint`, затем `typecheck`.** Не запускай `build` только ради
проверки типов: он делает то же самое и вдобавок собирает бандл.

## Поддержка браузеров: OBS

Приложение показывается в OBS через browser source, а у него встроенный Chromium (CEF) отстаёт
от обычного Chrome. **Минимальная версия — Chromium 127** (CEF в OBS 32.2). Она указана в
`.browserslistrc`; `build.target` в `vite.config.ts` выводится из него, а ESLint ловит Web API и
API ECMAScript, которых в ней нет (см. «Поддержка браузеров» в корневом AGENTS.md).

- Не используй CSS-свойства, Web API и синтаксис, которых нет в Chrome 127. CSS линтер не
  проверяет: сверяйся с caniuse/MDN, а не с тем, что работает в текущем Chrome.
- Встроенный Chromium отличается и поведением. Например, SMIL-анимация после удаления
  `<animate>` оставляла последнее значение вместо базового. Если что-то по-разному выглядит в
  браузере и в OBS, сначала проверь в OBS.
- Версию CEF в установленном OBS можно узнать по файлу
  `C:\Program Files\obs-studio\obs-plugins\64bit\libcef.dll` (Свойства → Подробно).
