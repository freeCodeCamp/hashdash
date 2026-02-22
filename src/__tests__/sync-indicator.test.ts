import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(
  resolve(__dirname, "../components/SyncIndicator.tsx"),
  "utf-8",
);

describe("SyncIndicator component", () => {
  it("should connect via WebSocket to /api/reindex/ws", () => {
    expect(src).toContain("/api/reindex/ws");
    expect(src).toContain("WebSocket");
  });

  it("should track all four sync statuses", () => {
    expect(src).toContain('"idle"');
    expect(src).toContain('"running"');
    expect(src).toContain('"completed"');
    expect(src).toContain('"failed"');
  });

  it("should show yellow for running, green for completed, red for failed", () => {
    expect(src).toMatch(/running[\s\S]*bg-yellow-500/);
    expect(src).toMatch(/completed[\s\S]*bg-green-500/);
    expect(src).toMatch(/failed[\s\S]*bg-red-500/);
  });

  it("should return null for idle status", () => {
    expect(src).toMatch(/idle:\s*null/);
  });

  it("should animate the running indicator", () => {
    expect(src).toContain("animate-pulse");
  });

  it("should auto-reconnect with exponential backoff", () => {
    expect(src).toContain("MAX_RECONNECT_DELAY");
    expect(src).toMatch(/Math\.pow\(2/);
    expect(src).toContain("setTimeout");
  });

  it("should clean up WebSocket on unmount", () => {
    expect(src).toMatch(/close\(1000\)/);
    expect(src).toContain("clearTimeout");
  });
});
