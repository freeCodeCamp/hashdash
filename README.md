# hashdash

A dashboard for managing [freeCodeCamp](https://freecodecamp.org/news) publications on Hashnode. View published posts, drafts, submissions, and search content — all from one place.

Built with [Astro](https://astro.build) and deployed to [Cloudflare Workers](https://workers.cloudflare.com).

## Setup

```bash
pnpm install
cp .dev.vars.example .dev.vars
# Fill in your HASHNODE_TOKEN in .dev.vars
```

## Development

Two modes available:

**`pnpm develop`** — Astro dev server at `localhost:4321` with Cloudflare platform proxy. Hot reload, but Durable Objects are **not** available (Miniflare limitation with internal DOs).

**`pnpm preview`** — Builds then runs via `wrangler dev` at `localhost:8787`. No hot reload, but **full D1 + Durable Object support**. Use this to test the reindex flow end-to-end.

### Local D1 setup

```bash
# Apply migrations to local D1 (one-time or after schema changes)
npx wrangler d1 execute hashdash-posts --local --file=migrations/0001_create_tables.sql

# Start with full bindings
pnpm preview

# Visit /reindex to populate D1 from Hashnode API
```

## Commands

| Command              | Purpose                                                |
| :------------------- | :----------------------------------------------------- |
| `pnpm develop`       | Start local dev server (localhost:4321), no DO support |
| `pnpm preview`       | Build + local Wrangler (localhost:8787), full D1 + DO  |
| `pnpm build`         | Production build to `./dist/`                          |
| `pnpm deploy:worker` | Type-check + build + deploy to Cloudflare Workers      |
| `pnpm test`          | Run tests (Vitest)                                     |
| `pnpm check`         | Type-check Astro and TypeScript files                  |
| `pnpm lint`          | Lint with oxlint                                       |
| `pnpm format`        | Format with Prettier                                   |
| `pnpm format:check`  | Check formatting without writing                       |
| `pnpm cf-typegen`    | Regenerate types from Wrangler bindings                |

## Deployment

Production deploys are triggered automatically when pushing to `main` via Cloudflare Builds. The only production URL is `hashdash.freecodecamp.org`.

Non-production branch builds and preview URLs are not available (CF limitation: Workers with Durable Objects cannot generate preview URLs). Test locally with `pnpm preview` before merging.

### First-time setup

1. Authenticate with Cloudflare: `npx wrangler login`
2. Create the D1 database (if not already created):
   ```bash
   npx wrangler d1 create hashdash-posts
   # Update database_id in wrangler.jsonc with the returned ID
   ```
3. Apply D1 migrations to remote:
   ```bash
   npx wrangler d1 execute hashdash-posts --remote --file=migrations/0001_create_tables.sql
   ```
4. Set secrets:
   ```bash
   npx wrangler secret put HASHNODE_TOKEN
   npx wrangler secret put WEBHOOK_SECRET
   ```
5. Deploy: `pnpm deploy:worker`
6. Sync index: visit `https://hashdash.freecodecamp.org/reindex` and click Sync Now
7. Configure Hashnode webhook to POST to `https://hashdash.freecodecamp.org/api/webhook` with the same `WEBHOOK_SECRET`

### Cloudflare infrastructure

| Resource      | Created by            | Notes                                      |
| :------------ | :-------------------- | :----------------------------------------- |
| D1 database   | `wrangler d1 create`  | Must exist before first deploy             |
| DO namespace  | Automatic on deploy   | Via `migrations` block in `wrangler.jsonc` |
| Secrets       | `wrangler secret put` | HASHNODE_TOKEN, WEBHOOK_SECRET             |
| Custom domain | Cloudflare dashboard  | `hashdash.freecodecamp.org`                |
| CF Access     | Cloudflare dashboard  | Protects `/reindex` admin page             |
