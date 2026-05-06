/**
 * Live contract tests for the Hashnode GraphQL API.
 *
 * These hit the real endpoint and assert response *shape*, not values.
 * Skipped by default — opt in with RUN_LIVE_CONTRACT=1.
 *
 *   set -a && . ./.dev.vars && set +a && \
 *     RUN_LIVE_CONTRACT=1 pnpm test src/__tests__/hashnode-contract.live.test.ts
 *
 * Requires HASHNODE_TOKEN and HASHNODE_HOST in the environment.
 */
import { describe, it, expect } from "vitest";
import {
  GET_PUBLICATION_DRAFTS,
  GET_SUBMITTED_DRAFTS,
  GET_SCHEDULED_DRAFTS,
  GET_ALL_DRAFTS_PAGE,
  GET_POST_BY_ID,
} from "../lib/hashnode";

const RUN = process.env.RUN_LIVE_CONTRACT === "1";
const TOKEN = process.env.HASHNODE_TOKEN ?? "";
const HOST = process.env.HASHNODE_HOST ?? "";
const ENDPOINT = "https://gql.hashnode.com/";

type GqlResponse<T> = { data: T; errors?: Array<{ message: string }> };

async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`Hashnode HTTP ${response.status}`);
  }
  const json = (await response.json()) as GqlResponse<T>;
  if (json.errors && json.errors.length > 0) {
    throw new Error(`Hashnode GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

type DraftConnection = {
  publication: {
    drafts?: {
      totalDocuments: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: Array<{ node: DraftNode }>;
    };
    submittedDrafts?: DraftConnection["publication"]["drafts"];
    scheduledDrafts?: {
      totalDocuments: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: Array<{ node: DraftNode & { scheduledDate: string } }>;
    };
    allDrafts?: DraftConnection["publication"]["drafts"];
  };
};

type DraftNode = {
  id: string;
  title: string | null;
  slug?: string;
  updatedAt: string;
  author: { name: string | null; username: string };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

type PostResult = {
  post: {
    id: string;
    cuid: string;
    title: string | null;
    slug: string;
    url: string;
    brief: string;
    publishedAt: string;
    updatedAt: string;
    readTimeInMinutes: number;
    author: { name: string | null; username: string };
    coverImage: { url: string } | null;
    tags: Array<{ id: string; name: string; slug: string }> | null;
  } | null;
};

function assertConnectionShape(conn: {
  totalDocuments: unknown;
  pageInfo: unknown;
  edges: unknown;
}) {
  expect(typeof conn.totalDocuments).toBe("number");
  expect(conn.pageInfo).toBeTypeOf("object");
  expect(Array.isArray(conn.edges)).toBe(true);
}

describe.skipIf(!RUN)("Hashnode live contract", () => {
  it("requires HASHNODE_TOKEN and HASHNODE_HOST", () => {
    expect(TOKEN, "set HASHNODE_TOKEN").not.toBe("");
    expect(HOST, "set HASHNODE_HOST").not.toBe("");
  });

  it("GET_PUBLICATION_DRAFTS returns a DraftConnection", async () => {
    const data = await gql<DraftConnection>(GET_PUBLICATION_DRAFTS, {
      host: HOST,
      first: 1,
    });
    const conn = data.publication.drafts;
    expect(conn).toBeDefined();
    assertConnectionShape(conn!);
  });

  // Hashnode beta returns drafts with `slug: null` for submittedDrafts, which
  // violates the schema's `Draft.slug: String!` and trips non-null validation.
  // Reproduces in undici/Node fetch consistently regardless of page size; curl
  // gets cached responses and appears clean. The query itself is valid and
  // currently unused by any production page, so this is informational only.
  // Re-enable once Hashnode backfills slugs on submittedDrafts.
  it.skip("GET_SUBMITTED_DRAFTS returns a DraftConnection", async () => {
    const data = await gql<DraftConnection>(GET_SUBMITTED_DRAFTS, {
      host: HOST,
      first: 10,
    });
    const conn = data.publication.submittedDrafts;
    expect(conn).toBeDefined();
    assertConnectionShape(conn!);
  });

  it("GET_SCHEDULED_DRAFTS returns a DraftConnection with scheduledDate", async () => {
    const data = await gql<DraftConnection>(GET_SCHEDULED_DRAFTS, {
      host: HOST,
      first: 1,
    });
    const conn = data.publication.scheduledDrafts;
    expect(conn).toBeDefined();
    assertConnectionShape(conn!);
    const node = conn!.edges[0]?.node;
    if (node) {
      expect(typeof node.scheduledDate).toBe("string");
    }
  });

  it("GET_ALL_DRAFTS_PAGE returns a DraftConnection", async () => {
    const data = await gql<DraftConnection>(GET_ALL_DRAFTS_PAGE, {
      host: HOST,
      first: 1,
    });
    const conn = data.publication.allDrafts;
    expect(conn).toBeDefined();
    assertConnectionShape(conn!);
    const node = conn!.edges[0]?.node;
    if (node) {
      expect(typeof node.id).toBe("string");
      expect(Array.isArray(node.tags)).toBe(true);
    }
  });

  it("GET_POST_BY_ID returns a Post with all D1-indexed fields", async () => {
    const idData = await gql<{
      publication: { posts: { edges: Array<{ node: { id: string } }> } };
    }>(
      `query($host:String!){publication(host:$host){posts(first:1){edges{node{id}}}}}`,
      { host: HOST },
    );
    const id = idData.publication.posts.edges[0]?.node.id;
    expect(id, "publication has at least one published post").toBeTruthy();

    const data = await gql<PostResult>(GET_POST_BY_ID, { id });
    const post = data.post;
    expect(post).not.toBeNull();
    expect(typeof post!.id).toBe("string");
    expect(typeof post!.cuid).toBe("string");
    expect(typeof post!.slug).toBe("string");
    expect(typeof post!.url).toBe("string");
    expect(typeof post!.publishedAt).toBe("string");
    expect(typeof post!.readTimeInMinutes).toBe("number");
    expect(typeof post!.author.username).toBe("string");
  });
});
