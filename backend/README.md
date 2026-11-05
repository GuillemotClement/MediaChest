# Backend MediaChest

Node.js 22 minimum.

```sh
pnpm install
pnpm dev
```

Port par défaut : `3000`, configurable via `PORT`.

`GET /api/health-check` retourne HTTP 200 et `{ "status": "ok" }`.

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm start
```

`pnpm format` applique Prettier ; `pnpm lint:fix` applique les corrections ESLint.
