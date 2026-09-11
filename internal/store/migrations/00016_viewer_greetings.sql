-- +goose Up
CREATE TABLE IF NOT EXISTS greeting_definitions (
    id TEXT NOT NULL PRIMARY KEY CHECK (id IN ('new_viewer', 'returning_viewer')),
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    splash_template TEXT NOT NULL,
    sound TEXT NOT NULL DEFAULT '',
    duration_ms INTEGER NOT NULL DEFAULT 5000 CHECK (duration_ms > 0),
    image_asset TEXT NULL,
    sound_file TEXT NULL,
    sound_volume INTEGER NOT NULL DEFAULT 70 CHECK (sound_volume BETWEEN 0 AND 100),
    layout TEXT NOT NULL DEFAULT 'card' CHECK (layout IN ('card', 'banner', 'fullscreen')),
    image_fit TEXT NOT NULL DEFAULT 'contain' CHECK (image_fit IN ('cover', 'contain', 'fill', 'tile')),
    image_size_pct INTEGER NOT NULL DEFAULT 100 CHECK (image_size_pct BETWEEN 25 AND 300)
);

ALTER TABLE viewers ADD COLUMN greetings_disabled INTEGER NOT NULL DEFAULT 0 CHECK (greetings_disabled IN (0, 1));
ALTER TABLE viewers ADD COLUMN first_ordinary_message_at TEXT NULL;
ALTER TABLE viewer_session_stats ADD COLUMN first_ordinary_message_at TEXT NULL;

UPDATE viewers
SET first_ordinary_message_at = last_seen_at
WHERE message_count > 0 AND first_ordinary_message_at IS NULL;

UPDATE viewer_session_stats
SET first_ordinary_message_at = COALESCE(
    (SELECT started_at FROM stream_sessions WHERE stream_sessions.id = viewer_session_stats.session_id),
    (SELECT last_seen_at FROM viewers WHERE viewers.id = viewer_session_stats.viewer_id)
)
WHERE message_count > 0 AND first_ordinary_message_at IS NULL;

-- +goose Down
ALTER TABLE viewer_session_stats DROP COLUMN first_ordinary_message_at;
ALTER TABLE viewers DROP COLUMN first_ordinary_message_at;
ALTER TABLE viewers DROP COLUMN greetings_disabled;
DROP TABLE IF EXISTS greeting_definitions;
