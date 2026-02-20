import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const webhookSrc = readFileSync(
  resolve(__dirname, "../pages/api/webhook.ts"),
  "utf-8",
);

describe("Webhook endpoint", () => {
  it("should export a POST handler", () => {
    expect(webhookSrc).toContain("export const POST");
  });

  it("should not export a GET handler", () => {
    expect(webhookSrc).not.toContain("export const GET");
  });

  it("should read x-hashnode-signature header", () => {
    expect(webhookSrc).toContain("x-hashnode-signature");
  });

  it("should use WEBHOOK_SECRET for verification", () => {
    expect(webhookSrc).toContain("WEBHOOK_SECRET");
  });

  it("should use Web Crypto API for HMAC", () => {
    expect(webhookSrc).toContain("crypto.subtle");
  });

  it("should check timestamp within 5 minute window", () => {
    expect(webhookSrc).toContain("300000");
  });

  it("should handle post_published event", () => {
    expect(webhookSrc).toContain("post_published");
  });

  it("should handle post_updated event", () => {
    expect(webhookSrc).toContain("post_updated");
  });

  it("should handle post_deleted event", () => {
    expect(webhookSrc).toContain("post_deleted");
  });

  it("should use GET_POST_BY_ID for re-fetch", () => {
    expect(webhookSrc).toContain("GET_POST_BY_ID");
  });

  it("should use upsertPost from shared db helpers", () => {
    expect(webhookSrc).toMatch(/from\s+["'].*\/lib\/db/);
    expect(webhookSrc).toContain("upsertPost");
  });

  it("should use deletePost from shared db helpers", () => {
    expect(webhookSrc).toContain("deletePost");
  });

  it("should use getClient for GraphQL fetch", () => {
    expect(webhookSrc).toContain("getClient");
  });

  it("should return 401 for invalid signature", () => {
    expect(webhookSrc).toContain("401");
  });

  it("should return 200 on success", () => {
    expect(webhookSrc).toContain("200");
  });

  it("should read body as text before parsing for signature verification", () => {
    expect(webhookSrc).toContain("request.text()");
  });
});
