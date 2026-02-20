interface Env {
  HASHNODE_TOKEN: string;
  WEBHOOK_SECRET: string;
  LIVE_MODE?: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}

interface CacheStorage {
  default: Cache;
}
