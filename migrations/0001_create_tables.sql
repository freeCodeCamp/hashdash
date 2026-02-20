-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  cuid TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  brief TEXT,
  author_name TEXT NOT NULL,
  author_username TEXT NOT NULL,
  published_at TEXT NOT NULL,
  updated_at TEXT,
  read_time INTEGER,
  cover_image_url TEXT,
  tags TEXT
);

CREATE INDEX IF NOT EXISTS idx_author ON posts(author_username);
CREATE INDEX IF NOT EXISTS idx_published ON posts(published_at DESC);

-- Drafts table
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  title TEXT,
  author_name TEXT NOT NULL,
  author_username TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  tags TEXT
);

CREATE INDEX IF NOT EXISTS idx_draft_author ON drafts(author_username);
CREATE INDEX IF NOT EXISTS idx_draft_updated ON drafts(updated_at DESC);
