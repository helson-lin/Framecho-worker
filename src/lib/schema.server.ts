const SCHEMA_VERSION = 1;

async function addColumn(
  database: D1Database,
  table: string,
  name: string,
  definition: string,
): Promise<void> {
  try {
    await database.exec(
      `ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`,
    );
  } catch (error) {
    // Two cold requests may observe the old schema. Ignore only the exact
    // duplicate-column race, and verify that the other request added it.
    if (
      !(error instanceof Error) ||
      !error.message.includes("duplicate column name")
    )
      throw error;
    const columns = await database
      .prepare(`PRAGMA table_info(${table})`)
      .all<{ name: string }>();
    if (!columns.results.some((column) => column.name === name)) throw error;
  }
}

export async function initializeSchema(
  database: D1Database,
): Promise<Array<string>> {
  // A persistent marker avoids DDL on ordinary requests, across all isolates.
  try {
    const row = await database
      .prepare("SELECT version FROM framecho_schema WHERE id = 1")
      .first<{ version: number }>();
    if (row && row.version >= SCHEMA_VERSION) return [];
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("no such table: framecho_schema")
    )
      throw error;
  }
  const applied: Array<string> = [];

  await database.exec(
    "CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, filename TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL, width INTEGER, height INTEGER, r2_key TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), media_type TEXT NOT NULL DEFAULT 'image', duration REAL)",
  );
  await database.exec(
    "CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at DESC)",
  );

  const columns = await database.prepare("PRAGMA table_info(uploads)").all<{
    name: string;
  }>();
  const columnNames = new Set(columns.results.map((row) => row.name));

  if (!columnNames.has("media_type")) {
    await addColumn(
      database,
      "uploads",
      "media_type",
      "TEXT NOT NULL DEFAULT 'image'",
    );
    applied.push("media_type");
  }

  if (!columnNames.has("duration")) {
    await addColumn(database, "uploads", "duration", "REAL");
    applied.push("duration");
  }

  const v2Columns: Array<[name: string, definition: string]> = [
    ["title", "TEXT"],
    ["poster_key", "TEXT"],
    ["transcript_key", "TEXT"],
    ["storyboard_key", "TEXT"],
    ["storyboard_meta", "TEXT"],
    ["chapters", "TEXT"],
    ["views", "INTEGER NOT NULL DEFAULT 0"],
    ["social_enabled", "INTEGER NOT NULL DEFAULT 1"],
  ];
  for (const [name, definition] of v2Columns) {
    if (!columnNames.has(name)) {
      await addColumn(database, "uploads", name, definition);
      applied.push(name);
    }
  }

  await database.exec(
    "CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, upload_id TEXT NOT NULL, viewer_id TEXT NOT NULL, author_name TEXT NOT NULL, author_avatar TEXT, text TEXT NOT NULL, timestamp REAL, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );
  await database.exec(
    "CREATE INDEX IF NOT EXISTS idx_comments_upload_id ON comments(upload_id)",
  );

  const commentColumns = await database
    .prepare("PRAGMA table_info(comments)")
    .all<{ name: string }>();
  if (!commentColumns.results.some((row) => row.name === "author_avatar")) {
    await addColumn(database, "comments", "author_avatar", "TEXT");
    applied.push("author_avatar");
  }

  await database.exec(
    "CREATE TABLE IF NOT EXISTS likes (upload_id TEXT NOT NULL, viewer_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (upload_id, viewer_id))",
  );

  await database.exec(
    "CREATE TABLE IF NOT EXISTS view_events (id TEXT PRIMARY KEY, upload_id TEXT NOT NULL, country TEXT, city TEXT, referrer TEXT, device TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );
  await database.exec(
    "CREATE INDEX IF NOT EXISTS idx_view_events_upload_id ON view_events(upload_id)",
  );

  // Mark readiness only after all schema operations succeeded.
  await database.exec(
    "CREATE TABLE IF NOT EXISTS framecho_schema (id INTEGER PRIMARY KEY, version INTEGER NOT NULL)",
  );
  await database
    .prepare(
      "INSERT INTO framecho_schema (id, version) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET version = MAX(version, excluded.version)",
    )
    .bind(SCHEMA_VERSION)
    .run();
  return applied;
}
