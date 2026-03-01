import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cardSrc = readFileSync(
  resolve(__dirname, "../components/PostCard.astro"),
  "utf-8",
);

describe("PostCard action URLs", () => {
  it("should compute previewUrl for all cards using preview.freecodecamp.org", () => {
    expect(cardSrc).toContain("preview.freecodecamp.org");
    expect(cardSrc).toMatch(
      /previewUrl\s*=\s*`https:\/\/preview\.freecodecamp\.org/,
    );
  });

  it("should compute visitUrl for published posts", () => {
    expect(cardSrc).toMatch(/visitUrl\s*=\s*type\s*===\s*"post"/);
  });

  it("should compute editUrl for both types", () => {
    expect(cardSrc).toContain("hashnode.com/edit/");
    expect(cardSrc).toContain("hashnode.com/draft/");
  });
});

describe("PostCard icon buttons", () => {
  it("should have a preview button with document-search icon for all cards", () => {
    expect(cardSrc).toContain('aria-label="Preview (opens in new tab)"');
  });

  it("should have a visit button with eye icon for posts", () => {
    expect(cardSrc).toContain('aria-label="Visit article (opens in new tab)"');
    expect(cardSrc).toContain("{visitUrl && (");
  });

  it("should have an edit button for all cards", () => {
    expect(cardSrc).toContain(
      'aria-label="Edit on Hashnode (opens in new tab)"',
    );
  });

  it("should use data-card-action attribute on all action links", () => {
    expect(cardSrc).toContain("data-card-action");
    expect(cardSrc).not.toContain("data-card-edit");
  });

  it("should have title tooltips on all action buttons", () => {
    expect(cardSrc).toContain('title="Preview"');
    expect(cardSrc).toContain('title="Visit article"');
    expect(cardSrc).toContain('title="Edit on Hashnode"');
  });
});

describe("PostCard details table", () => {
  it("should show Preview row for all cards", () => {
    const previewRowMatch = cardSrc.match(
      /<td[^>]*>[\s\n]*Preview[\s\n]*<\/td>/,
    );
    expect(previewRowMatch).not.toBeNull();
  });

  it("should show Visit row for published posts", () => {
    expect(cardSrc).toMatch(/visitUrl\s*&&\s*\(\s*\n?\s*<tr[\s\S]*?Visit/);
  });

  it("should always show Edit row", () => {
    const editRowMatch = cardSrc.match(/<td[^>]*>[\s\n]*Edit[\s\n]*<\/td>/);
    expect(editRowMatch).not.toBeNull();
  });
});

describe("PostCard accessibility", () => {
  it("should hide decorative SVGs from assistive technology", () => {
    const svgCount = (cardSrc.match(/<svg/g) || []).length;
    const ariaHiddenCount = (cardSrc.match(/aria-hidden="true"/g) || []).length;
    expect(ariaHiddenCount).toBeGreaterThanOrEqual(svgCount);
  });

  it("should have focus-visible ring on action buttons", () => {
    expect(cardSrc).toContain("focus-visible:ring-2");
    expect(cardSrc).toContain("focus-visible:ring-blue-400");
  });

  it("should have focus-visible ring on card toggle", () => {
    expect(cardSrc).toMatch(/data-card-toggle[\s\S]*?focus-visible:ring-2/);
  });

  it("should hide decorative middot separators from AT", () => {
    expect(cardSrc).toContain('aria-hidden="true">&middot;</span>');
    expect(cardSrc).not.toMatch(
      /<span[^>]*class="mx-1\.5"[^>]*(?<!aria-hidden="true")>&middot;/,
    );
  });

  it("should indicate new tab in aria-labels for external links", () => {
    expect(cardSrc).toContain("opens in new tab");
  });

  it("should have aria-expanded on card toggle", () => {
    expect(cardSrc).toContain('aria-expanded="false"');
  });
});

describe("PostCard interactivity", () => {
  it("should stop propagation on action buttons", () => {
    expect(cardSrc).toContain("[data-card-action]");
    expect(cardSrc).toContain("stopPropagation");
  });

  it("should toggle details on card click", () => {
    expect(cardSrc).toContain("[data-card-toggle]");
    expect(cardSrc).toContain("[data-card-details]");
    expect(cardSrc).toContain('toggle("hidden")');
  });

  it("should support keyboard activation", () => {
    expect(cardSrc).toContain('"Enter"');
    expect(cardSrc).toContain('" "');
  });
});
