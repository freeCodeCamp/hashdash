import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workerSrc = readFileSync(resolve(__dirname, "../worker.ts"), "utf-8");

describe("WebSocket routing in worker.ts", () => {
  it("should intercept /api/reindex/ws before Astro", () => {
    expect(workerSrc).toContain("/api/reindex/ws");
    expect(workerSrc).toContain("websocket");
  });

  it("should forward WebSocket upgrades to POST_INDEXER DO", () => {
    expect(workerSrc).toContain("POST_INDEXER");
    expect(workerSrc).toContain("idFromName");
    expect(workerSrc).toContain("stub.fetch");
  });

  it("should pass non-WebSocket requests to Astro handle()", () => {
    expect(workerSrc).toContain("handle(");
  });
});

describe("HTTP status endpoint in worker.ts", () => {
  it("should intercept GET /api/reindex/status", () => {
    expect(workerSrc).toContain("/api/reindex/status");
    expect(workerSrc).toContain("GET");
  });

  it("should call getStatus() via DO RPC", () => {
    expect(workerSrc).toMatch(/stub\.getStatus\(\)/);
  });

  it("should return JSON with status field", () => {
    expect(workerSrc).toContain("application/json");
    expect(workerSrc).toMatch(/status:\s*state\.status/);
  });
});
