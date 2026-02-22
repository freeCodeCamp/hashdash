import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const layoutSrc = readFileSync(
  resolve(__dirname, "../layouts/Layout.astro"),
  "utf-8",
);

describe("Brand: fCC puck logo replaces text", () => {
  it("should NOT contain 'hashdash' as visible text in the brand link", () => {
    expect(layoutSrc).not.toMatch(/>\s*hashdash\s*<\/a>/);
  });

  it("should have an <img> or <svg> in the brand/home link area", () => {
    expect(layoutSrc).toMatch(/<img[\s>]|<svg[\s>]/);
  });

  it("should reference the fCC puck logo file", () => {
    expect(layoutSrc).toMatch(/fcc[_-]puck/i);
  });

  it("fCC puck logo SVG file should exist in public/", () => {
    const logoPath = resolve(__dirname, "../../public/fcc_puck.svg");
    expect(existsSync(logoPath)).toBe(true);
  });

  it("should still use 'hashdash' as the default page title", () => {
    expect(layoutSrc).toMatch(/['"]hashdash['"]/);
  });

  it("logo should have invert class for white color", () => {
    expect(layoutSrc).toContain("invert");
  });
});

describe("Top nav replaces sidebar", () => {
  it("should NOT have an <aside> sidebar element", () => {
    expect(layoutSrc).not.toMatch(/<aside[\s>]/);
  });

  it("should have a <header> element for top nav", () => {
    expect(layoutSrc).toMatch(/<header[\s>]/);
  });

  it("should have a <nav> element inside the layout", () => {
    expect(layoutSrc).toMatch(/<nav[\s>]/);
  });

  it("should NOT use a sidebar flex layout (flex with w-64)", () => {
    expect(layoutSrc).not.toContain("w-64");
  });
});

describe("Nav labels", () => {
  it("should contain 'Articles' label", () => {
    expect(layoutSrc).toMatch(/['"]Articles['"]/);
  });

  it("should NOT contain 'Home' label", () => {
    expect(layoutSrc).not.toMatch(/label:\s*['"]Home['"]/);
  });

  it("'Articles' link should href to '/'", () => {
    expect(layoutSrc).toMatch(
      /href:\s*['"]\/['"][\s\S]*?label:\s*['"]Articles['"]/,
    );
  });

  it("should have a gear icon link to /reindex", () => {
    expect(layoutSrc).toContain('"/reindex"');
    expect(layoutSrc).toContain("Settings");
    expect(layoutSrc).toContain("<svg");
  });
});

describe("Nav should NOT have a search bar", () => {
  it("should not import or render SearchBar", () => {
    expect(layoutSrc).not.toContain("SearchBar");
  });
});

describe("Nav and main content alignment", () => {
  it("header and main should use the same max-width", () => {
    const headerMaxW = layoutSrc.match(/<header[^>]*>[\s\S]*?max-w-(\w+)/);
    const mainMaxW = layoutSrc.match(/<main[^>]*max-w-(\w+)/);
    expect(headerMaxW).not.toBeNull();
    expect(mainMaxW).not.toBeNull();
    expect(headerMaxW![1]).toBe(mainMaxW![1]);
  });

  it("header and main should use the same horizontal padding", () => {
    const headerPx = layoutSrc.match(/<header[^>]*>[\s\S]*?px-(\d+)/);
    const mainPx = layoutSrc.match(/<main[^>]*px-(\d+)/);
    expect(headerPx).not.toBeNull();
    expect(mainPx).not.toBeNull();
    expect(headerPx![1]).toBe(mainPx![1]);
  });
});

describe("Dark mode", () => {
  it("should have dark class set statically on html element", () => {
    expect(layoutSrc).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
    expect(layoutSrc).not.toContain('classList.add("dark")');
  });

  it("should not have a theme toggle button", () => {
    expect(layoutSrc).not.toContain("theme-toggle");
    expect(layoutSrc).not.toContain("theme-icon-sun");
    expect(layoutSrc).not.toContain("theme-icon-moon");
  });
});

describe("SEO and privacy", () => {
  it("should have noindex, nofollow meta tag", () => {
    expect(layoutSrc).toMatch(/noindex.*nofollow|nofollow.*noindex/);
  });
});

describe("View transitions", () => {
  it("should not use ClientRouter", () => {
    expect(layoutSrc).not.toContain("astro:transitions");
    expect(layoutSrc).not.toContain("ClientRouter");
  });
});

describe("Flash messages", () => {
  it("should import FlashMessage component", () => {
    expect(layoutSrc).toContain("FlashMessage");
  });

  it("should read success and error from URL params", () => {
    expect(layoutSrc).toMatch(/searchParams.*get.*['"]success['"]/);
    expect(layoutSrc).toMatch(/searchParams.*get.*['"]error['"]/);
  });
});
