import { handle } from "@astrojs/cloudflare/handler";
import type { SSRManifest } from "astro";
import { App } from "astro/app";
import { PostIndexer } from "./lib/indexer";

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);
  return {
    default: {
      async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const url = new URL(request.url);
        if (
          url.pathname === "/api/reindex/ws" &&
          request.headers.get("Upgrade") === "websocket"
        ) {
          const id = env.POST_INDEXER.idFromName("singleton");
          const stub = env.POST_INDEXER.get(id);
          return stub.fetch(request);
        }
        // @ts-expect-error astro cloudflare handler type mismatch
        return handle(manifest, app, request, env, ctx);
      },
    } satisfies ExportedHandler<Env>,
    PostIndexer,
  };
}
