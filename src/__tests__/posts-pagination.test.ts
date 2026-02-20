import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const hashnodeSrc = readFileSync(
  resolve(__dirname, "../lib/hashnode.ts"),
  "utf-8",
);
const landingPageSrc = readFileSync(
  resolve(__dirname, "../pages/index.astro"),
  "utf-8",
);
const draftsSrc = readFileSync(
  resolve(__dirname, "../pages/drafts/index.astro"),
  "utf-8",
);
const searchSrc = readFileSync(
  resolve(__dirname, "../pages/search.astro"),
  "utf-8",
);
const postCardSrc = readFileSync(
  resolve(__dirname, "../components/PostCard.astro"),
  "utf-8",
);

describe("GraphQL client", () => {
  it("should NOT import from astro-loader-hashnode", () => {
    expect(hashnodeSrc).not.toContain("astro-loader-hashnode");
  });

  it("should export getClient", () => {
    expect(hashnodeSrc).toContain("export function getClient");
  });

  it("should export GET_PUBLICATION_POSTS with cuid field", () => {
    expect(hashnodeSrc).toContain("export const GET_PUBLICATION_POSTS");
    expect(hashnodeSrc).toMatch(/GET_PUBLICATION_POSTS[\s\S]*?cuid/);
  });

  it("should export GET_PUBLICATION_DRAFTS", () => {
    expect(hashnodeSrc).toContain("export const GET_PUBLICATION_DRAFTS");
  });

  it("should export GET_MY_DRAFTS", () => {
    expect(hashnodeSrc).toContain("export const GET_MY_DRAFTS");
  });

  it("should export SEARCH_POSTS", () => {
    expect(hashnodeSrc).toContain("export const SEARCH_POSTS");
  });

  it("should NOT export any mutations", () => {
    expect(hashnodeSrc).not.toContain("mutation");
  });

  it("should NOT export GET_POST", () => {
    expect(hashnodeSrc).not.toContain("export const GET_POST");
  });

  it("should NOT export isDryRun", () => {
    expect(hashnodeSrc).not.toContain("isDryRun");
  });

  it("should check HTTP response status", () => {
    expect(hashnodeSrc).toMatch(/response\.ok/);
  });

  it("should use full payload for cache keys (no hash collisions)", () => {
    expect(hashnodeSrc).toMatch(/encodeURIComponent/);
    expect(hashnodeSrc).not.toMatch(/djb2|hash32|hashCode/);
  });
});

describe("Landing page (published posts)", () => {
  it("should NOT use getCollection", () => {
    expect(landingPageSrc).not.toContain("getCollection");
  });

  it("should use getClient and GET_PUBLICATION_POSTS", () => {
    expect(landingPageSrc).toContain("getClient");
    expect(landingPageSrc).toContain("GET_PUBLICATION_POSTS");
  });

  it("should read cursor from URL params", () => {
    expect(landingPageSrc).toMatch(/searchParams.*get.*['"]after['"]/);
  });

  it("should pass type=post to PostCard", () => {
    expect(landingPageSrc).toContain('type="post"');
  });

  it("should have error handling with try/catch", () => {
    expect(landingPageSrc).toMatch(/try\s*\{/);
    expect(landingPageSrc).toMatch(/catch\s*\(/);
  });

  it("should display error banner on failure", () => {
    expect(landingPageSrc).toContain("fetchError");
    expect(landingPageSrc).toMatch(/bg-red-50/);
  });
});

describe("Drafts page", () => {
  it("should NOT use getCollection", () => {
    expect(draftsSrc).not.toContain("getCollection");
  });

  it("should use GET_PUBLICATION_DRAFTS and GET_MY_DRAFTS", () => {
    expect(draftsSrc).toContain("GET_PUBLICATION_DRAFTS");
    expect(draftsSrc).toContain("GET_MY_DRAFTS");
  });

  it("should have independent pagination params", () => {
    expect(draftsSrc).toContain("pub_after");
    expect(draftsSrc).toContain("my_after");
  });

  it("should use Promise.all for parallel queries", () => {
    expect(draftsSrc).toContain("Promise.all");
  });

  it("should have error handling with try/catch", () => {
    expect(draftsSrc).toMatch(/try\s*\{/);
    expect(draftsSrc).toMatch(/catch\s*\(/);
  });
});

describe("Search page", () => {
  it("should NOT use getCollection", () => {
    expect(searchSrc).not.toContain("getCollection");
  });

  it("should use SEARCH_POSTS", () => {
    expect(searchSrc).toContain("SEARCH_POSTS");
  });

  it("should have error handling with try/catch", () => {
    expect(searchSrc).toMatch(/try\s*\{/);
    expect(searchSrc).toMatch(/catch\s*\(/);
  });
});

describe("PostCard component", () => {
  it("should have expandable toggle markup", () => {
    expect(postCardSrc).toContain("data-card-toggle");
    expect(postCardSrc).toContain("data-card-details");
  });

  it("should NOT have an href prop", () => {
    expect(postCardSrc).not.toMatch(/href.*Astro\.props|props.*href/);
  });

  it("should have a type prop for post vs draft", () => {
    expect(postCardSrc).toMatch(/type.*['"]post['"].*['"]draft['"]/s);
  });

  it("should have data-card attribute for stable selector", () => {
    expect(postCardSrc).toContain("data-card");
    expect(postCardSrc).toMatch(/closest\(\s*['"]?\[data-card\]/);
  });

  it("should have aria-expanded on toggle button", () => {
    expect(postCardSrc).toContain("aria-expanded");
  });

  it("should have aria-label on edit button", () => {
    expect(postCardSrc).toMatch(/aria-label.*Edit/);
  });

  it("should use data-initialized guard for event listeners", () => {
    expect(postCardSrc).toContain("data-initialized");
  });

  it("should support keyboard navigation (Enter and Space)", () => {
    expect(postCardSrc).toContain("Enter");
    expect(postCardSrc).toMatch(/['"] ['"]/);
  });

  it("should render details in a table layout", () => {
    expect(postCardSrc).toMatch(/<table/);
    expect(postCardSrc).toMatch(/<tbody/);
  });

  it("should show edit URL in details table", () => {
    expect(postCardSrc).toMatch(/editUrl/);
  });

  it("should render cover image inline", () => {
    expect(postCardSrc).toMatch(/<img.*coverImageUrl/s);
  });

  it("should re-initialize on astro:page-load for view transitions", () => {
    expect(postCardSrc).toContain("astro:page-load");
  });
});
