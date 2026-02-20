import { DurableObject } from "cloudflare:workers";
import { upsertPost, upsertDraft } from "./db";
import { GET_ALL_DRAFTS_PAGE, normalizeTags } from "./hashnode";

interface IndexerState {
  status: "idle" | "running" | "completed" | "failed";
  phase: "posts" | "drafts" | "purge-posts" | "purge-drafts";
  processed: number;
  total: number;
  postsTotal: number;
  postsSynced: number;
  draftsTotal: number;
  draftsSynced: number;
  purged: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  warning: string | null;
}

const DEFAULT_STATE: IndexerState = {
  status: "idle",
  phase: "posts",
  processed: 0,
  total: 0,
  postsTotal: 0,
  postsSynced: 0,
  draftsTotal: 0,
  draftsSynced: 0,
  purged: 0,
  startedAt: null,
  completedAt: null,
  error: null,
  warning: null,
};

const PAGE_SIZE = 50;
const DELAY_MS = 200;

const RETRY_DELAYS = [1000, 2000, 4000];

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) return response;
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      ) {
        throw new Error(`Hashnode API returned HTTP ${response.status}`);
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw new Error(
        `Hashnode API returned HTTP ${response.status} after ${maxRetries + 1} attempts`,
      );
    } catch (e) {
      if (e instanceof TypeError && attempt < maxRetries) {
        lastError = e;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw e;
    }
  }
  throw lastError ?? new Error("Fetch failed after retries");
}

const GET_POSTS_PAGE = `
  query GetPostsPage($host: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      posts(first: $first, after: $after) {
        totalDocuments
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id cuid title slug url brief publishedAt updatedAt readTimeInMinutes
            author { name username }
            coverImage { url }
            tags { id name slug }
          }
        }
      }
    }
  }
`;

export class PostIndexer extends DurableObject<Env> {
  private state: IndexerState = { ...DEFAULT_STATE };
  private aborted = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<IndexerState>("state");
      if (stored) {
        if (stored.status === "running") {
          stored.status = "failed";
          stored.error = "Interrupted — restart indexing";
          stored.completedAt = new Date().toISOString();
          await this.ctx.storage.put("state", stored);
        }
        this.state = stored;
      }
    });
  }

  async getStatus(): Promise<IndexerState> {
    const stored = await this.ctx.storage.get<IndexerState>("state");
    return stored ?? { ...DEFAULT_STATE };
  }

  private async saveState(patch: Partial<IndexerState>): Promise<void> {
    this.state = { ...this.state, ...patch };
    await this.ctx.storage.put("state", this.state);
  }

  private broadcast(): void {
    const message = JSON.stringify({ type: "status", ...this.state });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(message);
      } catch {
        // client disconnected
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade !== "websocket") {
      return new Response("Expected WebSocket Upgrade", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    const status = await this.getStatus();
    this.state = { ...status };
    server.send(JSON.stringify({ type: "status", ...status }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    let data: { action: string };
    try {
      data = JSON.parse(
        typeof message === "string"
          ? message
          : new TextDecoder().decode(message),
      );
    } catch {
      ws.send(
        JSON.stringify({ type: "error", error: "Invalid message format" }),
      );
      return;
    }

    if (data.action === "start") {
      const current = await this.getStatus();
      if (current.status === "running") {
        ws.send(
          JSON.stringify({
            type: "status",
            ...current,
            error: "Reindex already in progress",
          }),
        );
        return;
      }
      this.aborted = false;
      this.state = { ...DEFAULT_STATE };
      await this.saveState({
        status: "running",
        startedAt: new Date().toISOString(),
      });
      this.broadcast();
      this.ctx.waitUntil(this.runIndex());
    } else if (data.action === "cancel") {
      if (this.state.status === "running") {
        this.aborted = true;
      }
    } else if (data.action === "reset") {
      this.aborted = true;
      this.state = { ...DEFAULT_STATE };
      await this.ctx.storage.put("state", { ...DEFAULT_STATE });
      this.broadcast();
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    try {
      ws.close(code, reason);
    } catch {
      ws.close();
    }
  }

  private async purgeStale(
    db: D1Database,
    table: "posts" | "drafts",
    seenIds: Set<string>,
  ): Promise<void> {
    const phase = table === "posts" ? "purge-posts" : "purge-drafts";
    await this.saveState({ phase, processed: 0, total: 0 });
    this.broadcast();

    try {
      const existing = await db
        .prepare(`SELECT id FROM ${table}`)
        .all<{ id: string }>();

      const toDelete = (existing.results ?? [])
        .map((row) => row.id)
        .filter((id) => !seenIds.has(id));

      if (toDelete.length === 0) return;

      await this.saveState({ total: toDelete.length });
      this.broadcast();

      const CHUNK_SIZE = 100;
      let deleted = 0;
      for (let i = 0; i < toDelete.length; i += CHUNK_SIZE) {
        const chunk = toDelete.slice(i, i + CHUNK_SIZE);
        const stmts = chunk.map((id) =>
          db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id),
        );
        await db.batch(stmts);
        deleted += chunk.length;
        await this.saveState({
          processed: deleted,
          purged: this.state.purged + chunk.length,
        });
        this.broadcast();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.saveState({ warning: `Purge ${table} failed: ${msg}` });
      this.broadcast();
    }
  }

  private async runIndex(): Promise<void> {
    try {
      const db = this.env.POSTS_DB;

      await this.saveState({ phase: "posts" });

      let cursor: string | undefined;
      let hasNextPage = true;
      let processed = 0;
      const seenPostIds = new Set<string>();

      while (hasNextPage) {
        if (this.aborted) {
          await this.saveState({
            status: "failed",
            error: "Cancelled by user",
            completedAt: new Date().toISOString(),
          });
          this.broadcast();
          return;
        }

        const response = await fetchWithRetry("https://gql.hashnode.com/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: this.env.HASHNODE_TOKEN,
          },
          body: JSON.stringify({
            query: GET_POSTS_PAGE,
            variables: {
              host: this.env.HASHNODE_HOST,
              first: PAGE_SIZE,
              after: cursor,
            },
          }),
        });

        const json = (await response.json()) as {
          data: {
            publication: {
              posts: {
                totalDocuments: number;
                pageInfo: { hasNextPage: boolean; endCursor: string };
                edges: Array<{ node: Record<string, unknown> }>;
              };
            };
          };
          errors?: unknown[];
        };

        if (json.errors) {
          throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
        }

        const { totalDocuments, pageInfo, edges } = json.data.publication.posts;

        if (processed === 0) {
          await this.saveState({
            total: totalDocuments,
            postsTotal: totalDocuments,
          });
        }

        const batch = edges.map(
          ({ node }: { node: Record<string, unknown> }) => {
            seenPostIds.add(node.id as string);
            const author = node.author as {
              name: string;
              username: string;
            } | null;
            const coverImage = node.coverImage as { url: string } | null;
            const tags = node.tags as Array<{
              id: string;
              name: string;
              slug: string;
            }>;
            return upsertPost(db, {
              id: node.id as string,
              cuid: node.cuid as string,
              title: node.title as string,
              slug: node.slug as string,
              url: node.url as string,
              brief: (node.brief as string) ?? null,
              author_name: author?.name ?? "Unknown",
              author_username: author?.username ?? "unknown",
              published_at: node.publishedAt as string,
              updated_at: (node.updatedAt as string) ?? null,
              read_time: (node.readTimeInMinutes as number) ?? null,
              cover_image_url: coverImage?.url ?? null,
              tags: JSON.stringify(tags ?? []),
            });
          },
        );

        await db.batch(batch);
        processed += edges.length;

        hasNextPage = pageInfo.hasNextPage;
        cursor = pageInfo.endCursor;

        await this.saveState({ processed, postsSynced: processed });
        this.broadcast();

        if (hasNextPage) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }

      await this.purgeStale(db, "posts", seenPostIds);

      await this.saveState({ phase: "drafts", processed: 0, total: 0 });
      this.broadcast();

      let draftCursor: string | undefined;
      let hasDraftsNextPage = true;
      let draftsProcessed = 0;
      const seenDraftIds = new Set<string>();

      while (hasDraftsNextPage) {
        if (this.aborted) {
          await this.saveState({
            status: "failed",
            error: "Cancelled by user",
            completedAt: new Date().toISOString(),
          });
          this.broadcast();
          return;
        }

        const draftResponse = await fetchWithRetry(
          "https://gql.hashnode.com/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: this.env.HASHNODE_TOKEN,
            },
            body: JSON.stringify({
              query: GET_ALL_DRAFTS_PAGE,
              variables: {
                host: this.env.HASHNODE_HOST,
                first: PAGE_SIZE,
                after: draftCursor,
              },
            }),
          },
        );

        const draftJson = (await draftResponse.json()) as {
          data: {
            publication: {
              allDrafts: {
                totalDocuments: number;
                pageInfo: { hasNextPage: boolean; endCursor: string };
                edges: Array<{ node: Record<string, unknown> }>;
              };
            };
          };
          errors?: unknown[];
        };

        if (draftJson.errors) {
          throw new Error(`GraphQL error: ${JSON.stringify(draftJson.errors)}`);
        }

        const {
          totalDocuments: draftTotal,
          pageInfo: draftPageInfo,
          edges: draftEdges,
        } = draftJson.data.publication.allDrafts;

        if (draftsProcessed === 0) {
          await this.saveState({ total: draftTotal, draftsTotal: draftTotal });
        }

        const draftBatch = draftEdges.map(
          ({ node }: { node: Record<string, unknown> }) => {
            seenDraftIds.add(node.id as string);
            const author = node.author as {
              name: string;
              username: string;
            } | null;
            return upsertDraft(db, {
              id: node.id as string,
              title: (node.title as string) ?? "",
              author_name: author?.name ?? "Unknown",
              author_username: author?.username ?? "unknown",
              updated_at: node.updatedAt as string,
              tags: JSON.stringify(
                normalizeTags(
                  node.tagsV2 as Array<{
                    __typename: string;
                    id?: string;
                    name?: string;
                    slug?: string;
                  }>,
                ),
              ),
            });
          },
        );

        await db.batch(draftBatch);
        draftsProcessed += draftEdges.length;

        hasDraftsNextPage = draftPageInfo.hasNextPage;
        draftCursor = draftPageInfo.endCursor;

        await this.saveState({
          processed: draftsProcessed,
          draftsSynced: draftsProcessed,
        });
        this.broadcast();

        if (hasDraftsNextPage) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }

      await this.purgeStale(db, "drafts", seenDraftIds);

      await this.saveState({
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      this.broadcast();
    } catch (e) {
      await this.saveState({
        status: "failed",
        error: e instanceof Error ? e.message : String(e),
        completedAt: new Date().toISOString(),
      });
      this.broadcast();
    }
  }
}
