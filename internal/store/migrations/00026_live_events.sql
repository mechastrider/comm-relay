-- +goose Up
ALTER TABLE interaction_events ADD COLUMN actor_viewer_id TEXT NULL REFERENCES viewers(id);
ALTER TABLE interaction_events ADD COLUMN feed_hidden INTEGER NOT NULL DEFAULT 0 CHECK (feed_hidden IN (0, 1));

CREATE TABLE viewer_level_events (
    id TEXT NOT NULL PRIMARY KEY,
    viewer_id TEXT NOT NULL REFERENCES viewers(id),
    session_id TEXT NOT NULL REFERENCES stream_sessions(id),
    level_title TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_viewer_level_events_session ON viewer_level_events(session_id, created_at DESC, id DESC);

-- +goose Down
DROP TABLE viewer_level_events;
ALTER TABLE interaction_events DROP COLUMN feed_hidden;
ALTER TABLE interaction_events DROP COLUMN actor_viewer_id;
