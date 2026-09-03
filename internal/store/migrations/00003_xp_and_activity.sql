-- +goose Up
ALTER TABLE viewers RENAME COLUMN score TO xp;
ALTER TABLE viewer_session_stats RENAME COLUMN score TO xp;
ALTER TABLE viewer_day_stats RENAME COLUMN score TO xp;
ALTER TABLE viewer_session_stats ADD COLUMN activity_grants INTEGER NOT NULL DEFAULT 0;
ALTER TABLE viewer_session_stats ADD COLUMN last_activity_at TEXT NULL;

CREATE TABLE interaction_events_new (
    id TEXT NOT NULL PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('command', 'award', 'activity')),
    viewer_id TEXT NULL REFERENCES viewers(id),
    command_trigger TEXT NULL,
    award_id TEXT NULL,
    points INTEGER NOT NULL,
    message_platform TEXT NULL,
    message_id TEXT NULL,
    created_at TEXT NOT NULL
);

INSERT INTO interaction_events_new (
    id, kind, viewer_id, command_trigger, award_id, points,
    message_platform, message_id, created_at
)
SELECT
    id, kind, viewer_id, command_trigger, award_id, points,
    message_platform, message_id, created_at
FROM interaction_events;

DROP TABLE interaction_events;

ALTER TABLE interaction_events_new RENAME TO interaction_events;

CREATE INDEX idx_interaction_events_viewer_created ON interaction_events(viewer_id, created_at);

-- +goose Down
DROP INDEX IF EXISTS idx_interaction_events_viewer_created;

CREATE TABLE interaction_events_old (
    id TEXT NOT NULL PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('command', 'award')),
    viewer_id TEXT NULL REFERENCES viewers(id),
    command_trigger TEXT NULL,
    award_id TEXT NULL,
    points INTEGER NOT NULL,
    message_platform TEXT NULL,
    message_id TEXT NULL,
    created_at TEXT NOT NULL
);

INSERT INTO interaction_events_old (
    id, kind, viewer_id, command_trigger, award_id, points,
    message_platform, message_id, created_at
)
SELECT
    id, kind, viewer_id, command_trigger, award_id, points,
    message_platform, message_id, created_at
FROM interaction_events
WHERE kind IN ('command', 'award');

DROP TABLE interaction_events;

ALTER TABLE interaction_events_old RENAME TO interaction_events;

CREATE INDEX idx_interaction_events_viewer_created ON interaction_events(viewer_id, created_at);

ALTER TABLE viewer_session_stats DROP COLUMN last_activity_at;
ALTER TABLE viewer_session_stats DROP COLUMN activity_grants;
ALTER TABLE viewer_day_stats RENAME COLUMN xp TO score;
ALTER TABLE viewer_session_stats RENAME COLUMN xp TO score;
ALTER TABLE viewers RENAME COLUMN xp TO score;
