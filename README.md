# my-twitch

Монорепозиторий на pnpm workspaces + Turborepo.

- `apps/cheliki` — Vue 3 + Vite сцена с человечками из чата Twitch
- `_legacy/dudes` — прежняя версия сцены; не поддерживается и не входит в workspace, оставлена как образец для новых фич
- `packages/*` — общие пакеты (пока пусто)

```sh
pnpm install
pnpm dev                       # dev всех приложений через turbo
pnpm build                     # сборка с кэшем turbo
pnpm --filter cheliki dev # только одно приложение
```
