// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: "cloudflare",
  }),
  prefetch: {
    defaultStrategy: "hover",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
