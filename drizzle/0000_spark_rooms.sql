CREATE TABLE spark_rooms (
 id TEXT PRIMARY KEY NOT NULL,
 host_id TEXT NOT NULL,
 invite_hash TEXT NOT NULL,
 state TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0,
 expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX spark_rooms_host_expiry ON spark_rooms (host_id, expires_at);
