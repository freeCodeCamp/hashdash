import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getClient } from "../lib/hashnode";

const mockEnv = {
  HASHNODE_TOKEN: "test-token-123",
  HASHNODE_HOST: "test.hashnode.dev",
} as unknown as Env;

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

describe("getClient", () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;

  beforeEach(() => {
    // Remove caches to test non-cache path by default
    delete (globalThis as Record<string, unknown>).caches;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalCaches) {
      (globalThis as Record<string, unknown>).caches = originalCaches;
    }
    vi.restoreAllMocks();
  });

  it("should send POST to Hashnode GraphQL endpoint", async () => {
    const fetchMock = mockFetchResponse({ data: { result: "ok" } });
    globalThis.fetch = fetchMock;

    const client = getClient(mockEnv);
    await client.query("query { test }");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("https://gql.hashnode.com/");
    expect(opts.method).toBe("POST");
  });

  it("should include Authorization header from env", async () => {
    const fetchMock = mockFetchResponse({ data: {} });
    globalThis.fetch = fetchMock;

    const client = getClient(mockEnv);
    await client.query("query { test }");

    const opts = fetchMock.mock.calls[0][1];
    expect(opts.headers.Authorization).toBe("test-token-123");
    expect(opts.headers["Content-Type"]).toBe("application/json");
  });

  it("should send query and variables in request body", async () => {
    const fetchMock = mockFetchResponse({ data: {} });
    globalThis.fetch = fetchMock;

    const client = getClient(mockEnv);
    await client.query(
      "query GetPosts($first: Int!) { posts(first: $first) { id } }",
      {
        first: 10,
      },
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.query).toContain("GetPosts");
    expect(body.variables).toEqual({ first: 10 });
  });

  it("should return data from successful response", async () => {
    const fetchMock = mockFetchResponse({
      data: { publication: { posts: [] } },
    });
    globalThis.fetch = fetchMock;

    const client = getClient(mockEnv);
    const result = await client.query<{ publication: { posts: unknown[] } }>(
      "query { publication { posts { id } } }",
    );

    expect(result).toEqual({ publication: { posts: [] } });
  });

  it("should throw on non-ok HTTP response", async () => {
    const fetchMock = mockFetchResponse({}, false, 401);
    globalThis.fetch = fetchMock;

    const client = getClient(mockEnv);
    await expect(client.query("query { test }")).rejects.toThrow(
      "Hashnode API returned HTTP 401",
    );
  });

  it("should throw on HTTP 500", async () => {
    const fetchMock = mockFetchResponse({}, false, 500);
    globalThis.fetch = fetchMock;

    const client = getClient(mockEnv);
    await expect(client.query("query { test }")).rejects.toThrow(
      "Hashnode API returned HTTP 500",
    );
  });

  it("should throw on GraphQL errors in response", async () => {
    const fetchMock = mockFetchResponse({
      data: null,
      errors: [{ message: "Field not found" }],
    });
    globalThis.fetch = fetchMock;

    const client = getClient(mockEnv);
    await expect(client.query("query { bad }")).rejects.toThrow(
      "Hashnode GraphQL error",
    );
  });

  it("should throw on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    const client = getClient(mockEnv);
    await expect(client.query("query { test }")).rejects.toThrow(
      "Network failure",
    );
  });

  describe("caching", () => {
    let mockCache: {
      match: ReturnType<typeof vi.fn>;
      put: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockCache = {
        match: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      };
      (globalThis as Record<string, unknown>).caches = {
        default: mockCache,
      };
    });

    it("should check cache before fetching", async () => {
      const fetchMock = mockFetchResponse({ data: { result: "fresh" } });
      globalThis.fetch = fetchMock;

      const client = getClient(mockEnv);
      await client.query("query { test }");

      expect(mockCache.match).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("should return cached result without fetching", async () => {
      mockCache.match.mockResolvedValue({
        json: () => Promise.resolve({ cached: true }),
      });
      const fetchMock = mockFetchResponse({ data: {} });
      globalThis.fetch = fetchMock;

      const client = getClient(mockEnv);
      const result = await client.query<{ cached: boolean }>("query { test }");

      expect(result).toEqual({ cached: true });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should store response in cache after fetch", async () => {
      const fetchMock = mockFetchResponse({ data: { stored: true } });
      globalThis.fetch = fetchMock;

      const client = getClient(mockEnv);
      await client.query("query { test }");

      expect(mockCache.put).toHaveBeenCalledOnce();
      const cachedResponse = mockCache.put.mock.calls[0][1] as Response;
      const cachedData = await cachedResponse.json();
      expect(cachedData).toEqual({ stored: true });
    });

    it("should set s-maxage cache header", async () => {
      const fetchMock = mockFetchResponse({ data: {} });
      globalThis.fetch = fetchMock;

      const client = getClient(mockEnv);
      await client.query("query { test }");

      const cachedResponse = mockCache.put.mock.calls[0][1] as Response;
      expect(cachedResponse.headers.get("Cache-Control")).toContain(
        "s-maxage=",
      );
    });

    it("should use different cache keys for different variables", async () => {
      const fetchMock = mockFetchResponse({ data: {} });
      globalThis.fetch = fetchMock;

      const client = getClient(mockEnv);
      await client.query("query { test }", { first: 10 });
      await client.query("query { test }", { first: 20 });

      const key1 = mockCache.match.mock.calls[0][0] as Request;
      const key2 = mockCache.match.mock.calls[1][0] as Request;
      expect(key1.url).not.toBe(key2.url);
    });

    it("should not cache when caches API is unavailable", async () => {
      delete (globalThis as Record<string, unknown>).caches;
      const fetchMock = mockFetchResponse({ data: { result: "ok" } });
      globalThis.fetch = fetchMock;

      const client = getClient(mockEnv);
      const result = await client.query<{ result: string }>("query { test }");

      expect(result).toEqual({ result: "ok" });
    });
  });
});
