-- +goose Up
CREATE TABLE ai_message_jobs (
 id TEXT PRIMARY KEY,
 revision INTEGER NOT NULL,
 state TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 payload TEXT NOT NULL
);
CREATE INDEX ai_message_jobs_state_created ON ai_message_jobs(state, created_at);
CREATE TABLE ai_message_dedupe (
 source_key TEXT PRIMARY KEY,
 created_at TEXT NOT NULL
);
-- +goose Down
DROP TABLE ai_message_dedupe;
DROP TABLE ai_message_jobs;
