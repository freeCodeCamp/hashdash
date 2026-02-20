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
const submissionsSrc = readFileSync(
  resolve(__dirname, "../pages/submissions.astro"),
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

  it("should export GET_PUBLICATION_DRAFTS", () => {
    expect(hashnodeSrc).toContain("export const GET_PUBLICATION_DRAFTS");
  });

  it("should NOT export any mutations", () => {
    expect(hashnodeSrc).not.toContain("mutation");
  });

  it("should export GET_POST_BY_ID for webhook handler", () => {
    expect(hashnodeSrc).toContain("export const GET_POST_BY_ID");
  });

  it("should export GET_SUBMITTED_DRAFTS", () => {
    expect(hashnodeSrc).toContain("export const GET_SUBMITTED_DRAFTS");
  });

  it("should have submittedDrafts query field in GET_SUBMITTED_DRAFTS", () => {
    expect(hashnodeSrc).toMatch(/GET_SUBMITTED_DRAFTS[\s\S]*?submittedDrafts/);
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

  it("should use POSTS_DB (D1)", () => {
    expect(landingPageSrc).toContain("POSTS_DB");
  });

  it("should use page-number pagination for published tab", () => {
    expect(landingPageSrc).toContain("LIMIT");
    expect(landingPageSrc).toContain("OFFSET");
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
    expect(landingPageSrc).toMatch(/bg-red-900/);
  });
});

describe("Submissions page", () => {
  it("should NOT use getCollection", () => {
    expect(submissionsSrc).not.toContain("getCollection");
  });

  it("should show API unavailable placeholder", () => {
    expect(submissionsSrc).toContain("not currently accessible");
  });

  it("should NOT have active API calls or pagination", () => {
    expect(submissionsSrc).not.toContain("GET_SUBMITTED_DRAFTS");
    expect(submissionsSrc).not.toContain("sub_after");
    expect(submissionsSrc).not.toContain("sched_after");
  });
});

describe("Search page", () => {
  it("should NOT use getCollection", () => {
    expect(searchSrc).not.toContain("getCollection");
  });

  it("should redirect to / with query param", () => {
    expect(searchSrc).toContain("Astro.redirect");
    expect(searchSrc).toMatch(/\?q=/);
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
