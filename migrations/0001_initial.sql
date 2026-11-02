-- Every deployment is a single private workspace. No multi-tenant identities.
CREATE TABLE maps (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  document TEXT NOT NULL CHECK (json_valid(document)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TEXT NOT NULL
);
CREATE INDEX maps_updated ON maps(updated_at DESC, id);

-- Four fixed rows, reset in place at the first request of each UTC day.
CREATE TABLE quotas (
  category TEXT PRIMARY KEY NOT NULL,
  day TEXT NOT NULL,
  used INTEGER NOT NULL CHECK (used >= 0)
);
