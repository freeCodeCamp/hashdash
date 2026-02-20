import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dbSrc = readFileSync(resolve(__dirname, "../lib/db.ts"), "utf-8");
const indexerSrc = readFileSync(
  resolve(__dirname, "../lib/indexer.ts"),
  "utf-8",
);

describe("DB helpers (src/lib/db.ts)", () => {
  it("should export upsertPost function", () => {
    expect(dbSrc).toContain("export function upsertPost");
  });

  it("should export deletePost function", () => {
    expect(dbSrc).toContain("export function deletePost");
  });

  it("should export PostRow type", () => {
    expect(dbSrc).toContain("export interface PostRow");
  });

  it("should use INSERT OR REPLACE for upsert", () => {
    expect(dbSrc).toContain("INSERT OR REPLACE INTO posts");
  });

  it("should bind all 13 columns", () => {
    const questionMarks = (dbSrc.match(/\?/g) || []).length;
    expect(questionMarks).toBeGreaterThanOrEqual(13);
  });

  it("should use DELETE FROM posts for delete", () => {
    expect(dbSrc).toContain("DELETE FROM posts WHERE id = ?");
  });
});

describe("Drafts DB helpers (src/lib/db.ts)", () => {
  it("should export DraftRow type", () => {
    expect(dbSrc).toContain("export interface DraftRow");
  });

  it("should export upsertDraft function", () => {
    expect(dbSrc).toContain("export function upsertDraft");
  });

  it("should export deleteDraft function", () => {
    expect(dbSrc).toContain("export function deleteDraft");
  });

  it("should use INSERT OR REPLACE for draft upsert", () => {
    expect(dbSrc).toContain("INSERT OR REPLACE INTO drafts");
  });

  it("should bind all 6 draft columns", () => {
    const questionMarks = (dbSrc.match(/\?/g) || []).length;
    expect(questionMarks).toBeGreaterThanOrEqual(19);
  });

  it("should use DELETE FROM drafts for draft delete", () => {
    expect(dbSrc).toContain("DELETE FROM drafts WHERE id = ?");
  });
});

describe("Indexer uses shared DB helpers", () => {
  it("should import from db.ts", () => {
    expect(indexerSrc).toMatch(/from\s+["']\.\/db/);
  });

  it("should not have inline INSERT OR REPLACE", () => {
    expect(indexerSrc).not.toContain("INSERT OR REPLACE");
  });
});
