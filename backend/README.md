# Backend

```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## D1 + Kysely (initial setup)

Schema and types are prepared here:

- `db/migrations/0001_init.sql`
- `db/migrations/0002_media_duration_seconds.sql`
- `src/db/types.ts`
- `src/db/client.ts`
- `src/db/queries.ts`

Apply local migration:

```txt
npm run db:migrate:local
```

Apply remote migration:

```txt
npm run db:migrate:remote
```

Before remote execution, replace `database_id` in `wrangler.jsonc`.

## Media upload API (R2)

- `POST /api/media/upload` (multipart/form-data)
  - fields: `communityId`, `userId`, `type`, `month`, `file`, `durationSeconds?`
- `POST /api/media/upload-url` (key generation helper)

R2 binding and optional public URL are configured in `wrangler.jsonc`:

- `MEDIA_BUCKET`
- `PUBLIC_R2_BASE_URL`

## Monthly roulette

- `GET /api/roulette/current?communityId=...&month=YYYY-MM`
- `POST /api/roulette/run` body: `{ "targetMonthYear": "YYYY-MM" }`
- `POST /api/cron/roulette` (optional header: `x-cron-secret`)

`wrangler.jsonc` includes a cron trigger:

- `triggers.crons: ["0 15 28-31 * *"]`

Set `CRON_SECRET` when using `/api/cron/roulette` via external scheduler.
