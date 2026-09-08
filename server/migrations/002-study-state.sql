CREATE TABLE IF NOT EXISTS lesson_state (
  lesson_id TEXT PRIMARY KEY REFERENCES lessons(id),
  data TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);
PRAGMA user_version=2;
