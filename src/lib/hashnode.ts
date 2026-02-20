export type TagItem = { id: string; name: string; slug: string };
type TagV2 = { __typename: string; id?: string; name?: string; slug?: string };

export function normalizeTags(tagsV2: TagV2[] | undefined | null): TagItem[] {
  if (!tagsV2) return [];
  return tagsV2
    .filter((t) => t.__typename === "Tag" && t.id && t.name && t.slug)
    .map((t) => ({ id: t.id!, name: t.name!, slug: t.slug! }));
}

const CACHE_TTL = 300; // 5 minutes

function buildCacheKey(
  query: string,
  variables?: Record<string, unknown>,
): string {
  const payload = JSON.stringify({ query, variables });
  return `https://hashdash.internal/graphql-cache/${encodeURIComponent(payload)}`;
}

export function getClient(env: Env) {
  return {
    async query<T>(
      query: string,
      variables?: Record<string, unknown>,
      options?: { skipCache?: boolean },
    ): Promise<T> {
      const cacheKey = buildCacheKey(query, variables);
      const cacheRequest = new Request(cacheKey);

      // Try cache first (only in production — caches API unavailable in dev)
      if (!options?.skipCache && typeof caches !== "undefined") {
        const cache = caches.default;
        const cached = await cache.match(cacheRequest);
        if (cached) {
          const json = (await cached.json()) as T;
          return json;
        }
      }

      const response = await fetch("https://gql.hashnode.com/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: env.HASHNODE_TOKEN,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new Error(`Hashnode API returned HTTP ${response.status}`);
      }

      const json = (await response.json()) as { data: T; errors?: unknown[] };

      if (json.errors) {
        throw new Error(
          `Hashnode GraphQL error: ${JSON.stringify(json.errors)}`,
        );
      }

      // Store in cache (only in production)
      if (typeof caches !== "undefined") {
        const cache = caches.default;
        const cacheResponse = new Response(JSON.stringify(json.data), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `s-maxage=${CACHE_TTL}`,
          },
        });
        await cache.put(cacheRequest, cacheResponse);
      }

      return json.data;
    },
  };
}

export const GET_PUBLICATION_DRAFTS = `
  query GetPublicationDrafts($host: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      drafts(first: $first, after: $after) {
        totalDocuments
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            slug
            updatedAt
            author {
              name
              username
            }
            tagsV2 {
              __typename
              ... on Tag {
                id
                name
                slug
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_SUBMITTED_DRAFTS = `
  query GetSubmittedDrafts($host: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      submittedDrafts(first: $first, after: $after) {
        totalDocuments
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            slug
            updatedAt
            author {
              name
              username
            }
            tagsV2 {
              __typename
              ... on Tag {
                id
                name
                slug
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_POST_BY_ID = `
  query GetPostById($id: ID!) {
    post(id: $id) {
      id
      cuid
      title
      slug
      url
      brief
      publishedAt
      updatedAt
      readTimeInMinutes
      author {
        name
        username
      }
      coverImage {
        url
      }
      tags {
        id
        name
        slug
      }
    }
  }
`;

export const GET_SCHEDULED_DRAFTS = `
  query GetScheduledDrafts($host: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      scheduledDrafts(first: $first, after: $after) {
        totalDocuments
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            slug
            updatedAt
            scheduledDate
            author {
              name
              username
            }
            tagsV2 {
              __typename
              ... on Tag {
                id
                name
                slug
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_ALL_DRAFTS_PAGE = `
  query GetAllDraftsPage($host: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      allDrafts(first: $first, after: $after) {
        totalDocuments
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            title
            updatedAt
            author { name username }
            tagsV2 {
              __typename
              ... on Tag {
                id
                name
                slug
              }
            }
          }
        }
      }
    }
  }
`;
