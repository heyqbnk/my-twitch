# my-twitch

Монорепозиторий на pnpm workspaces + Turborepo.

- `apps/dudes` — Vue 3 + Vite сцена с чатом Twitch
- `packages/*` — общие пакеты (пока пусто)

```sh
pnpm install
pnpm dev                       # dev всех приложений через turbo
pnpm build                     # сборка с кэшем turbo
pnpm --filter dudes dev   # только одно приложение
```
