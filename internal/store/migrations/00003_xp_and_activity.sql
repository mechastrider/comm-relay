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

INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms)
SELECT 'spotter', 'Spotter', 25, 'Spotter for {name}! +{points}', 'ping', 5000
WHERE NOT EXISTS (SELECT 1 FROM award_types WHERE id = 'spotter');

INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms)
SELECT 'intel', 'Intel', 30, 'Intel for {name}! +{points}', 'chime', 5000
WHERE NOT EXISTS (SELECT 1 FROM award_types WHERE id = 'intel');

INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms)
SELECT 'expert', 'Expert', 40, 'Expert for {name}! +{points}', 'alert', 5000
WHERE NOT EXISTS (SELECT 1 FROM award_types WHERE id = 'expert');

INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms)
SELECT 'meme', 'Meme', 20, 'Meme for {name}! +{points}', 'soft', 5000
WHERE NOT EXISTS (SELECT 1 FROM award_types WHERE id = 'meme');

INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms)
SELECT 'clutch', 'Clutch Help', 50, 'Clutch Help for {name}! +{points}', 'alert', 5000
WHERE NOT EXISTS (SELECT 1 FROM award_types WHERE id = 'clutch');

INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms)
SELECT 'mvp', 'MVP', 100, 'MVP for {name}! +{points}', 'chime', 5000
WHERE NOT EXISTS (SELECT 1 FROM award_types WHERE id = 'mvp');

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
