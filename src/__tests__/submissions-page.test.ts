import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const submissionsSrc = readFileSync(
  resolve(__dirname, "../pages/submissions.astro"),
  "utf-8",
);

describe("Submissions page", () => {
  it("should show API unavailable placeholder", () => {
    expect(submissionsSrc).toContain("not currently accessible");
  });

  it("should NOT have Scheduled section", () => {
    expect(submissionsSrc).not.toContain("scheduledDrafts");
    expect(submissionsSrc).not.toContain("scheduledDate");
  });

  it("should NOT have active API calls", () => {
    expect(submissionsSrc).not.toContain("GET_SUBMITTED_DRAFTS");
    expect(submissionsSrc).not.toContain("getClient");
  });
});
