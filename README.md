# my-twitch

Монорепозиторий на pnpm workspaces + Turborepo: сцены и оверлеи для Twitch-стрима.

- `apps/cheliki` — сцена с человечками из чата Twitch (Vue 3 + Vite)
- `apps/site` — Nuxt-приложение с виджетами для стрима: человечки из чата
  (`/widgets/twitch/dudes/<канал>`) и чат (`/widgets/twitch/chat/<канал>`)
- `packages/*` — общие пакеты (пока пусто)

```sh
pnpm install
pnpm dev                      # dev всех приложений через turbo
pnpm lint                     # ESLint и Stylelint
pnpm typecheck                # проверка типов
pnpm build                    # сборка с кэшем turbo
pnpm --filter cheliki dev     # только одно приложение
```
