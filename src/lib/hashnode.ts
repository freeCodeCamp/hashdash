export type TagItem = { id: string; name: string; slug: string };
type RawTag = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
};

export function normalizeTags(tags: RawTag[] | undefined | null): TagItem[] {
  if (!tags) return [];
  return tags
    .filter((t): t is TagItem => Boolean(t.id && t.name && t.slug))
    .map(({ id, name, slug }) => ({ id, name, slug }));
}

const CACHE_TTL = 300; // 5 minutes
const CACHE_KEY_PREFIX = "https://hashdash.internal/graphql-cache/";

function buildCacheKey(
  query: string,
  variables?: Record<string, unknown>,
): string {
  const payload = JSON.stringify({ query, variables });
  return `${CACHE_KEY_PREFIX}${encodeURIComponent(payload)}`;
}

export function getClient(env: Env) {
  const endpoint = env.HASHNODE_API_URL;
  if (!endpoint) {
    throw new Error(
      "HASHNODE_API_URL is not configured. Set it in wrangler.jsonc vars.",
    );
  }

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

      const response = await fetch(endpoint, {
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
            tags {
              id
              name
              slug
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
            tags {
              id
              name
              slug
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
            tags {
              id
              name
              slug
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
            tags {
              id
              name
              slug
            }
          }
        }
      }
    }
  }
`;
