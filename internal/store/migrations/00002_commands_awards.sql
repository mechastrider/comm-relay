-- +goose Up
CREATE TABLE commands (
    id TEXT NOT NULL PRIMARY KEY,
    trigger TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL,
    cooldown_seconds INTEGER NOT NULL CHECK (cooldown_seconds >= 0),
    splash_template TEXT NOT NULL,
    sound TEXT NOT NULL DEFAULT '',
    duration_ms INTEGER NOT NULL DEFAULT 5000,
    image_asset TEXT NULL,
    sound_file TEXT NULL
);

CREATE TABLE award_types (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points >= 1),
    splash_template TEXT NOT NULL,
    sound TEXT NOT NULL DEFAULT '',
    duration_ms INTEGER NOT NULL DEFAULT 5000,
    image_asset TEXT NULL,
    sound_file TEXT NULL
);

CREATE TABLE interaction_events (
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

CREATE INDEX idx_interaction_events_viewer_created ON interaction_events(viewer_id, created_at);

INSERT INTO commands (id, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms) VALUES
    ('gg', 'gg', 1, 30, 'Good game, {name}!', 'chime', 5000),
    ('hi', 'hi', 1, 30, 'Hi, {name}!', 'ping', 5000);

INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms) VALUES
    ('joke', 'Joke', 10, 'Joke for {name}! +{points}', 'soft', 5000),
    ('advice', 'Advice', 50, 'Advice for {name}! +{points}', 'alert', 5000);

-- +goose Down
DROP TABLE IF EXISTS interaction_events;
DROP TABLE IF EXISTS award_types;
DROP TABLE IF EXISTS commands;
