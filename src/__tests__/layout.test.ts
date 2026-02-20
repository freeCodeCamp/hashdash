import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const layoutSrc = readFileSync(
  resolve(__dirname, "../layouts/Layout.astro"),
  "utf-8",
);

const searchBarSrc = readFileSync(
  resolve(__dirname, "../components/SearchBar.astro"),
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
  it("should contain 'Published' label", () => {
    expect(layoutSrc).toMatch(/['"]Published['"]/);
  });

  it("should NOT contain 'Home' label", () => {
    expect(layoutSrc).not.toMatch(/label:\s*['"]Home['"]/);
  });

  it("'Published' link should href to '/'", () => {
    expect(layoutSrc).toMatch(
      /href:\s*['"]\/['"][\s\S]*?label:\s*['"]Published['"]/,
    );
  });
});

describe("Search bar is wide and centered in top nav", () => {
  it("search bar should have flex-1 or grow class for width", () => {
    const combined = layoutSrc + searchBarSrc;
    expect(combined).toMatch(/flex-1|grow/);
  });

  it("search bar input should have max-w class for controlled width", () => {
    const combined = layoutSrc + searchBarSrc;
    expect(combined).toMatch(/max-w-/);
  });

  it("search bar input should have aria-label", () => {
    expect(searchBarSrc).toMatch(/aria-label/);
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
  it("should default to dark when no theme is set", () => {
    expect(layoutSrc).toMatch(
      /localStorage\.getItem\(['"]theme['"]\)\s*!==\s*['"]light['"]/,
    );
  });

  it("should persist theme in localStorage on toggle", () => {
    expect(layoutSrc).toMatch(/localStorage\.setItem\(['"]theme['"]/);
  });

  it("should preserve dark mode across view transitions", () => {
    expect(layoutSrc).toContain("astro:before-swap");
  });
});

describe("SEO and privacy", () => {
  it("should have noindex, nofollow meta tag", () => {
    expect(layoutSrc).toMatch(/noindex.*nofollow|nofollow.*noindex/);
  });
});

describe("View transitions", () => {
  it("should import ClientRouter from astro:transitions", () => {
    expect(layoutSrc).toContain("astro:transitions");
    expect(layoutSrc).toContain("ClientRouter");
  });

  it("should render <ClientRouter /> in head", () => {
    expect(layoutSrc).toMatch(/<ClientRouter\s*\/>/);
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
