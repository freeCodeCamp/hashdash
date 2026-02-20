import type { APIRoute } from "astro";
import { getClient, GET_POST_BY_ID } from "../../lib/hashnode";
import { upsertPost, deletePost } from "../../lib/db";
import type { PostRow } from "../../lib/db";

const REPLAY_WINDOW_MS = 300000; // 5 minutes

async function verifySignature(
  rawBody: string,
  header: string,
  secret: string,
): Promise<boolean> {
  const parts = header.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const signaturePart = parts.find((p) => p.startsWith("v1="));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.slice(2);
  const signature = signaturePart.slice(3);

  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) return false;
  const age = Math.abs(Date.now() - ts);
  if (age > REPLAY_WINDOW_MS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );

  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe comparison via double-HMAC
  const compareKey = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hmacA = await crypto.subtle.sign(
    "HMAC",
    compareKey,
    new TextEncoder().encode(expected),
  );
  const hmacB = await crypto.subtle.sign(
    "HMAC",
    compareKey,
    new TextEncoder().encode(signature),
  );

  const a = new Uint8Array(hmacA);
  const b = new Uint8Array(hmacB);
  if (a.length !== b.length) return false;
  let match = true;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) match = false;
  }
  return match;
}

interface WebhookPayload {
  metadata: { uuid: string };
  data: {
    eventType: string;
    publication: { id: string };
    post: { id: string };
  };
}

interface PostQueryResult {
  post: {
    id: string;
    cuid: string;
    title: string;
    slug: string;
    url: string;
    brief: string | null;
    publishedAt: string;
    updatedAt: string | null;
    readTimeInMinutes: number | null;
    author: { name: string; username: string } | null;
    coverImage: { url: string } | null;
    tags: Array<{ id: string; name: string; slug: string }>;
  };
}

function toPostRow(post: PostQueryResult["post"]): PostRow {
  return {
    id: post.id,
    cuid: post.cuid,
    title: post.title,
    slug: post.slug,
    url: post.url,
    brief: post.brief,
    author_name: post.author?.name ?? "Unknown",
    author_username: post.author?.username ?? "unknown",
    published_at: post.publishedAt,
    updated_at: post.updatedAt,
    read_time: post.readTimeInMinutes,
    cover_image_url: post.coverImage?.url ?? null,
    tags: JSON.stringify(post.tags ?? []),
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;

  const signatureHeader = request.headers.get("x-hashnode-signature");
  if (!signatureHeader) {
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await request.text();

  const valid = await verifySignature(
    rawBody,
    signatureHeader,
    env.WEBHOOK_SECRET,
  );
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!payload?.data?.eventType) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { eventType } = payload.data;
  const postId = payload.data.post?.id;

  if (eventType === "post_published" || eventType === "post_updated") {
    if (!postId) {
      return new Response(JSON.stringify({ error: "Missing post ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = getClient(env);
    const result = await client.query<PostQueryResult>(
      GET_POST_BY_ID,
      {
        id: postId,
      },
      { skipCache: true },
    );

    if (!result.post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const row = toPostRow(result.post);
    await upsertPost(env.POSTS_DB, row).run();

    return new Response(
      JSON.stringify({ ok: true, event: eventType, postId }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  if (eventType === "post_deleted") {
    if (!postId) {
      return new Response(JSON.stringify({ error: "Missing post ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await deletePost(env.POSTS_DB, postId).run();

    return new Response(
      JSON.stringify({ ok: true, event: eventType, postId }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, event: eventType, ignored: true }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
