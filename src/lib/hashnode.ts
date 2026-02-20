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
    ): Promise<T> {
      const cacheKey = buildCacheKey(query, variables);
      const cacheRequest = new Request(cacheKey);

      // Try cache first (only in production — caches API unavailable in dev)
      if (typeof caches !== "undefined") {
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

export const GET_PUBLICATION_POSTS = `
  query GetPublicationPosts($host: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      id
      posts(first: $first, after: $after) {
        totalDocuments
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            cuid
            title
            brief
            slug
            url
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
      }
    }
  }
`;

export const SEARCH_POSTS = `
  query SearchPosts($filter: SearchPostsOfPublicationFilter!, $first: Int!, $after: String) {
    searchPostsOfPublication(filter: $filter, first: $first, after: $after) {
      edges {
        node {
          id
          title
          brief
          slug
          url
          publishedAt
          author {
            name
            username
          }
          coverImage {
            url
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

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

export const GET_MY_DRAFTS = `
  query GetMyDrafts($first: Int!, $after: String) {
    me {
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
