// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  integrations: [preact()],
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: "cloudflare",
    workerEntryPoint: {
      path: "./src/worker.ts",
      namedExports: ["PostIndexer"],
    },
  }),
  prefetch: {
    defaultStrategy: "hover",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
