export interface PostRow {
  id: string;
  cuid: string;
  title: string;
  slug: string;
  url: string;
  brief: string | null;
  author_name: string;
  author_username: string;
  published_at: string;
  updated_at: string | null;
  read_time: number | null;
  cover_image_url: string | null;
  tags: string;
}

export function upsertPost(db: D1Database, post: PostRow): D1PreparedStatement {
  return db
    .prepare(
      `INSERT OR REPLACE INTO posts
       (id, cuid, title, slug, url, brief, author_name, author_username,
        published_at, updated_at, read_time, cover_image_url, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      post.id,
      post.cuid,
      post.title,
      post.slug,
      post.url,
      post.brief,
      post.author_name,
      post.author_username,
      post.published_at,
      post.updated_at,
      post.read_time,
      post.cover_image_url,
      post.tags,
    );
}

export function deletePost(
  db: D1Database,
  postId: string,
): D1PreparedStatement {
  return db.prepare("DELETE FROM posts WHERE id = ?").bind(postId);
}

export interface DraftRow {
  id: string;
  title: string | null;
  author_name: string;
  author_username: string;
  updated_at: string;
  tags: string;
}

export function upsertDraft(
  db: D1Database,
  draft: DraftRow,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT OR REPLACE INTO drafts
       (id, title, author_name, author_username, updated_at, tags)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      draft.id,
      draft.title,
      draft.author_name,
      draft.author_username,
      draft.updated_at,
      draft.tags,
    );
}

export function deleteDraft(
  db: D1Database,
  draftId: string,
): D1PreparedStatement {
  return db.prepare("DELETE FROM drafts WHERE id = ?").bind(draftId);
}
