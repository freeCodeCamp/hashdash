import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const indexerSrc = readFileSync(
  resolve(__dirname, "../lib/indexer.ts"),
  "utf-8",
);

describe("PostIndexer Durable Object", () => {
  it("should extend DurableObject", () => {
    expect(indexerSrc).toContain("extends DurableObject<Env>");
  });

  it("should use WebSocket Hibernation API", () => {
    expect(indexerSrc).toContain("acceptWebSocket");
    expect(indexerSrc).toContain("getWebSockets");
    expect(indexerSrc).toContain("webSocketMessage");
    expect(indexerSrc).toContain("webSocketClose");
  });

  it("should set up auto ping/pong", () => {
    expect(indexerSrc).toContain("setWebSocketAutoResponse");
    expect(indexerSrc).toContain("WebSocketRequestResponsePair");
  });

  it("should create WebSocketPair in fetch and return 101", () => {
    expect(indexerSrc).toContain("WebSocketPair");
    expect(indexerSrc).toContain("status: 101");
    expect(indexerSrc).toContain("webSocket:");
  });

  it("should reject non-WebSocket requests in fetch", () => {
    expect(indexerSrc).toContain("Upgrade");
    expect(indexerSrc).toContain("426");
  });

  it("should handle start action", () => {
    expect(indexerSrc).toMatch(/action.*start/);
    expect(indexerSrc).toContain("runIndex");
  });

  it("should handle cancel action with aborted flag", () => {
    expect(indexerSrc).toMatch(/action.*cancel/);
    expect(indexerSrc).toContain("aborted");
  });

  it("should handle reset action", () => {
    expect(indexerSrc).toMatch(/action.*reset/);
    expect(indexerSrc).toContain("DEFAULT_STATE");
  });

  it("should broadcast status to all connected WebSockets", () => {
    expect(indexerSrc).toContain("broadcast");
    expect(indexerSrc).toContain("getWebSockets");
  });

  it("should broadcast progress during runIndex", () => {
    expect(indexerSrc).toMatch(/runIndex[\s\S]*broadcast/);
  });

  it("should check aborted flag between batches", () => {
    expect(indexerSrc).toMatch(/while[\s\S]*aborted/);
  });

  it("should use upsertPost from shared db helpers", () => {
    expect(indexerSrc).toContain("upsertPost");
    expect(indexerSrc).toContain('from "./db"');
  });

  it("should NOT use stale-run detection (replaced by cancel/reset)", () => {
    expect(indexerSrc).not.toContain("staleMs");
    expect(indexerSrc).not.toContain("isStale");
  });

  it("should handle malformed WebSocket messages with try/catch", () => {
    expect(indexerSrc).toMatch(/try\s*\{[\s\S]*JSON\.parse/);
    expect(indexerSrc).toContain("Invalid message");
  });

  it("should load state from storage in constructor via blockConcurrencyWhile", () => {
    expect(indexerSrc).toContain("blockConcurrencyWhile");
    expect(indexerSrc).toContain("storage.get");
  });

  it("should have phase field in IndexerState", () => {
    expect(indexerSrc).toContain("phase");
  });

  it("should import upsertDraft from shared db helpers", () => {
    expect(indexerSrc).toContain("upsertDraft");
  });

  it("should import GET_ALL_DRAFTS_PAGE from hashnode", () => {
    expect(indexerSrc).toContain("GET_ALL_DRAFTS_PAGE");
  });

  it("should import normalizeTags from hashnode", () => {
    expect(indexerSrc).toContain("normalizeTags");
  });

  it("should have purgeStale method for cleaning stale rows", () => {
    expect(indexerSrc).toContain("purgeStale");
    expect(indexerSrc).toContain("SELECT id FROM");
  });

  it("should sync drafts after posts in runIndex", () => {
    const postsPhaseIdx = indexerSrc.indexOf('phase: "posts"');
    const allDraftsIdx = indexerSrc.indexOf("allDrafts");
    expect(postsPhaseIdx).toBeGreaterThan(-1);
    expect(allDraftsIdx).toBeGreaterThan(postsPhaseIdx);
  });

  it("should have fetchWithRetry for resilient API calls", () => {
    expect(indexerSrc).toContain("fetchWithRetry");
    expect(indexerSrc).toContain("RETRY_DELAYS");
  });

  it("should recover from stuck running state in constructor", () => {
    expect(indexerSrc).toContain("Interrupted");
  });

  it("should track seen IDs for stale purge", () => {
    expect(indexerSrc).toContain("seenPostIds");
    expect(indexerSrc).toContain("seenDraftIds");
  });

  it("should have warning field in IndexerState", () => {
    expect(indexerSrc).toContain("warning");
  });

  it("should track per-type sync counts in state", () => {
    expect(indexerSrc).toContain("postsTotal");
    expect(indexerSrc).toContain("postsSynced");
    expect(indexerSrc).toContain("draftsTotal");
    expect(indexerSrc).toContain("draftsSynced");
    expect(indexerSrc).toContain("purged");
  });

  it("should not use DELETE FROM for upfront table clearing", () => {
    expect(indexerSrc).not.toContain("DELETE FROM posts");
    expect(indexerSrc).not.toContain("DELETE FROM drafts");
  });
});
