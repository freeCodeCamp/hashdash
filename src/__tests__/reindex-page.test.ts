import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pageSrc = readFileSync(
  resolve(__dirname, "../pages/reindex.astro"),
  "utf-8",
);

const panelSrc = readFileSync(
  resolve(__dirname, "../components/ReindexPanel.tsx"),
  "utf-8",
);

const layoutSrc = readFileSync(
  resolve(__dirname, "../layouts/Layout.astro"),
  "utf-8",
);

describe("Reindex page", () => {
  it("should use Layout component", () => {
    expect(pageSrc).toContain('import Layout from "../layouts/Layout.astro"');
    expect(pageSrc).toContain("<Layout");
  });

  it("should use ReindexPanel Preact island with client:load", () => {
    expect(pageSrc).toContain("ReindexPanel");
    expect(pageSrc).toContain("client:load");
  });

  it("should NOT have inline script (all logic in Preact component)", () => {
    expect(pageSrc).not.toContain("<script");
    expect(pageSrc).not.toContain("is:inline");
  });

  it("should have Sync Index as page title", () => {
    expect(pageSrc).toContain("Sync Index");
  });
});

describe("ReindexPanel component", () => {
  it("should use Preact hooks for state management", () => {
    expect(panelSrc).toContain("useState");
    expect(panelSrc).toContain("useEffect");
    expect(panelSrc).toContain("useRef");
    expect(panelSrc).toContain("useCallback");
  });

  it("should use WebSocket for communication", () => {
    expect(panelSrc).toContain("new WebSocket(");
    expect(panelSrc).toContain("/api/reindex/ws");
  });

  it("should construct WebSocket URL from location", () => {
    expect(panelSrc).toMatch(/wss?:\/\//);
    expect(panelSrc).toContain("location.host");
  });

  it("should track connection status (connecting, connected, reconnecting)", () => {
    expect(panelSrc).toContain("ConnectionStatus");
    expect(panelSrc).toContain('"connecting"');
    expect(panelSrc).toContain('"connected"');
    expect(panelSrc).toContain('"reconnecting"');
  });

  it("should disable button when not connected", () => {
    expect(panelSrc).toContain("btnDisabled");
    expect(panelSrc).toContain("disabled={btnDisabled}");
  });

  it("should have Sync Now button instead of Reindex", () => {
    expect(panelSrc).toContain("Sync Now");
    expect(panelSrc).toContain("Stop Syncing");
  });

  it("should send start and cancel actions", () => {
    expect(panelSrc).toContain('"start"');
    expect(panelSrc).toContain('"cancel"');
  });

  it("should NOT have full rebuild checkbox or mode", () => {
    expect(panelSrc).not.toContain("fullRebuild");
    expect(panelSrc).not.toContain("data-full-rebuild");
  });

  it("should display per-type sync counts", () => {
    expect(panelSrc).toContain("postsSynced");
    expect(panelSrc).toContain("draftsSynced");
    expect(panelSrc).toContain("purged");
  });

  it("should have elapsed timer with interval", () => {
    expect(panelSrc).toContain("setElapsed");
    expect(panelSrc).toContain("setInterval");
    expect(panelSrc).toContain("clearInterval");
  });

  it("should estimate ETA during indexing", () => {
    expect(panelSrc).toContain("estimateEta");
    expect(panelSrc).toContain("setEta");
  });

  it("should display started and completed timestamps", () => {
    expect(panelSrc).toContain("formatDate(state.startedAt)");
    expect(panelSrc).toContain("formatDate(state.completedAt)");
  });

  it("should show error, success, and warning messages", () => {
    expect(panelSrc).toContain("state.error");
    expect(panelSrc).toContain("Sync complete");
    expect(panelSrc).toContain("Sync failed");
    expect(panelSrc).toContain("state.warning");
  });

  it("should show summary counts on completion", () => {
    expect(panelSrc).toContain("posts");
    expect(panelSrc).toContain("drafts");
    expect(panelSrc).toContain("stale removed");
  });

  it("should have phase labels for all sync phases", () => {
    expect(panelSrc).toContain("Syncing published posts");
    expect(panelSrc).toContain("Syncing drafts");
    expect(panelSrc).toContain("Removing stale posts");
    expect(panelSrc).toContain("Removing stale drafts");
  });

  it("should clean up WebSocket on unmount", () => {
    expect(panelSrc).toContain(".close(1000)");
  });

  it("should auto-reconnect with exponential backoff", () => {
    expect(panelSrc).toContain("reconnectAttemptRef");
    expect(panelSrc).toContain("MAX_RECONNECT_DELAY");
    expect(panelSrc).toContain("Math.pow");
  });

  it("should explain what syncing does", () => {
    expect(panelSrc).toContain("Hashnode");
    expect(panelSrc).toContain("local index");
    expect(panelSrc).toContain("remain fully usable");
  });

  it("should show last sync info when available", () => {
    expect(panelSrc).toContain("Last sync");
    expect(panelSrc).toContain("hasLastRun");
  });

  it("should have state-based views (running vs idle)", () => {
    expect(panelSrc).toMatch(/status\s*===\s*"running"/);
    expect(panelSrc).toMatch(/status\s*!==\s*"running"/);
  });
});

describe("Layout nav", () => {
  it("should have /reindex as a gear icon link", () => {
    expect(layoutSrc).toContain('"/reindex"');
    expect(layoutSrc).toContain("Settings");
    expect(layoutSrc).toContain("<svg");
  });

  it("should NOT have 'Admin' text label in nav", () => {
    expect(layoutSrc).not.toContain('"Admin"');
  });

  it("should push gear icon to the right with ml-auto", () => {
    expect(layoutSrc).toContain("ml-auto");
  });

  it("should NOT have a search bar in the nav", () => {
    expect(layoutSrc).not.toContain("SearchBar");
  });
});
