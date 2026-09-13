-- +goose Up
ALTER TABLE interaction_events ADD COLUMN session_id TEXT NULL REFERENCES stream_sessions(id);

ALTER TABLE viewer_achievement_unlocks ADD COLUMN session_id TEXT NULL REFERENCES stream_sessions(id);

UPDATE interaction_events
SET session_id = (
    SELECT ss.id
    FROM stream_sessions ss
    WHERE interaction_events.created_at >= ss.started_at
      AND (ss.ended_at IS NULL OR interaction_events.created_at < ss.ended_at)
)
WHERE (
    SELECT COUNT(*)
    FROM stream_sessions ss
    WHERE interaction_events.created_at >= ss.started_at
      AND (ss.ended_at IS NULL OR interaction_events.created_at < ss.ended_at)
) = 1;

UPDATE viewer_achievement_unlocks
SET session_id = (
    SELECT ss.id
    FROM stream_sessions ss
    WHERE viewer_achievement_unlocks.unlocked_at >= ss.started_at
      AND (ss.ended_at IS NULL OR viewer_achievement_unlocks.unlocked_at < ss.ended_at)
)
WHERE backfilled = 0
  AND (
    SELECT COUNT(*)
    FROM stream_sessions ss
    WHERE viewer_achievement_unlocks.unlocked_at >= ss.started_at
      AND (ss.ended_at IS NULL OR viewer_achievement_unlocks.unlocked_at < ss.ended_at)
) = 1;

CREATE TABLE stream_recaps (
    id TEXT NOT NULL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE REFERENCES stream_sessions(id),
    schema_version INTEGER NOT NULL CHECK (schema_version > 0),
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    captured_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_interaction_events_session_created
    ON interaction_events(session_id, created_at, id);

CREATE INDEX idx_viewer_achievement_unlocks_session_unlocked
    ON viewer_achievement_unlocks(session_id, unlocked_at DESC, id DESC);

CREATE INDEX idx_stream_sessions_started
    ON stream_sessions(started_at DESC, id DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_stream_sessions_started;
DROP INDEX IF EXISTS idx_viewer_achievement_unlocks_session_unlocked;
DROP INDEX IF EXISTS idx_interaction_events_session_created;
DROP TABLE IF EXISTS stream_recaps;
ALTER TABLE viewer_achievement_unlocks DROP COLUMN session_id;
ALTER TABLE interaction_events DROP COLUMN session_id;
