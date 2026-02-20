# hashdash

A dashboard for managing [freeCodeCamp](https://freecodecamp.org/news) publications on Hashnode. View published posts, drafts, and search content — all from one place.

Built with [Astro](https://astro.build) and deployed to [Cloudflare Workers](https://workers.cloudflare.com).

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm develop
```

Starts a local dev server at `localhost:4321` with Cloudflare platform proxy enabled.

## Commands

| Command              | Purpose                                 |
| :------------------- | :-------------------------------------- |
| `pnpm develop`       | Start local dev server                  |
| `pnpm build`         | Production build to `./dist/`           |
| `pnpm preview`       | Build + local preview via Wrangler      |
| `pnpm deploy:worker` | Build + deploy to Cloudflare Workers    |
| `pnpm test`          | Run tests (Vitest)                      |
| `pnpm check`         | Type-check Astro and TypeScript files   |
| `pnpm lint`          | Lint with oxlint                        |
| `pnpm format`        | Format with Prettier                    |
| `pnpm format:check`  | Check formatting without writing        |
| `pnpm cf-typegen`    | Regenerate types from Wrangler bindings |

## Deployment

1. Authenticate with Cloudflare: `pnpm wrangler login`
2. Set the Hashnode API token: `pnpm wrangler secret put HASHNODE_TOKEN`
3. Deploy: `pnpm deploy:worker`
