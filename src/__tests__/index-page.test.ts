import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const indexSrc = readFileSync(
  resolve(__dirname, "../pages/index.astro"),
  "utf-8",
);

describe("Index page (D1-backed)", () => {
  it("should use POSTS_DB from env", () => {
    expect(indexSrc).toContain("POSTS_DB");
  });

  it("should read filter params from URL", () => {
    expect(indexSrc).toMatch(/searchParams.*get.*['"]q['"]/);
    expect(indexSrc).toMatch(/searchParams.*get.*['"]author['"]/);
    expect(indexSrc).toMatch(/searchParams.*get.*['"]from['"]/);
    expect(indexSrc).toMatch(/searchParams.*get.*['"]to['"]/);
    expect(indexSrc).toMatch(/searchParams.*get.*['"]page['"]/);
  });

  it("should build SQL WHERE clause with parameterized queries", () => {
    expect(indexSrc).toContain("WHERE");
    expect(indexSrc).toContain("LIKE ?");
    expect(indexSrc).toContain(".bind(");
  });

  it("should populate author combobox from D1", () => {
    expect(indexSrc).toContain("DISTINCT author_username");
    expect(indexSrc).toContain("data-author-combobox");
    expect(indexSrc).toContain("data-author-option");
  });

  it("should use page-number pagination for published tab", () => {
    expect(indexSrc).toContain("LIMIT");
    expect(indexSrc).toContain("OFFSET");
  });

  it("should have error handling", () => {
    expect(indexSrc).toMatch(/try\s*\{/);
    expect(indexSrc).toMatch(/catch\s*\(/);
    expect(indexSrc).toContain("fetchError");
  });
});

describe("Article tabs", () => {
  it("should read tab param from URL", () => {
    expect(indexSrc).toMatch(/searchParams.*get.*['"]tab['"]/);
  });

  it("should have Published, Drafts, Scheduled, and Archived tab labels", () => {
    expect(indexSrc).toContain('"Published"');
    expect(indexSrc).toContain('"Drafts"');
    expect(indexSrc).toContain('"Scheduled"');
    expect(indexSrc).toContain('"Archived"');
  });

  it("should import GET_SCHEDULED_DRAFTS for scheduled tab", () => {
    expect(indexSrc).toContain("GET_SCHEDULED_DRAFTS");
  });

  it("should query drafts table from D1 for drafts tab", () => {
    expect(indexSrc).toContain("FROM drafts");
  });

  it("should have tabUrl helper function", () => {
    expect(indexSrc).toMatch(/function tabUrl/);
  });

  it("should have draftsPageUrl helper function", () => {
    expect(indexSrc).toMatch(/function draftsPageUrl/);
  });

  it("should have schedPageUrl helper function for scheduled pagination", () => {
    expect(indexSrc).toMatch(/function schedPageUrl/);
  });

  it("should fetch scheduled drafts count in tab counts query", () => {
    expect(indexSrc).toContain("scheduledDrafts");
  });

  it("should show scheduled date for scheduled posts", () => {
    expect(indexSrc).toContain("scheduledDate");
  });
});
