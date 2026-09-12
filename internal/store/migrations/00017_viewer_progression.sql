-- +goose Up
ALTER TABLE viewers ADD COLUMN progression_alerts_disabled INTEGER NOT NULL DEFAULT 0
    CHECK (progression_alerts_disabled IN (0, 1));

CREATE TABLE progression_levels (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 64),
    min_xp INTEGER NOT NULL UNIQUE CHECK (min_xp BETWEEN 0 AND 1000000000),
    announce INTEGER NOT NULL DEFAULT 0 CHECK (announce IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE achievement_definitions (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 64),
    description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 240),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    secret INTEGER NOT NULL DEFAULT 0 CHECK (secret IN (0, 1)),
    announce INTEGER NOT NULL DEFAULT 1 CHECK (announce IN (0, 1)),
    active_revision INTEGER NOT NULL CHECK (active_revision > 0),
    deleted_at TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE achievement_revisions (
    achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id),
    revision INTEGER NOT NULL CHECK (revision > 0),
    metric TEXT NOT NULL CHECK (metric IN (
        'message_count', 'xp', 'award_count', 'command_count', 'session_count', 'contract_win_count'
    )),
    subject_id TEXT NULL,
    subject_label TEXT NOT NULL DEFAULT '',
    target INTEGER NOT NULL CHECK (target BETWEEN 1 AND 1000000000),
    repeatable INTEGER NOT NULL DEFAULT 0 CHECK (repeatable IN (0, 1)),
    created_at TEXT NOT NULL,
    PRIMARY KEY (achievement_id, revision),
    CHECK (
        (metric IN ('award_count', 'command_count') AND subject_id IS NOT NULL AND length(trim(subject_id)) > 0)
        OR (metric NOT IN ('award_count', 'command_count') AND subject_id IS NULL)
    )
);

CREATE TABLE viewer_achievement_unlocks (
    id TEXT NOT NULL PRIMARY KEY,
    viewer_id TEXT NOT NULL REFERENCES viewers(id),
    achievement_id TEXT NOT NULL,
    revision INTEGER NOT NULL,
    occurrence INTEGER NOT NULL CHECK (occurrence > 0),
    progress_value INTEGER NOT NULL CHECK (progress_value >= 0),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    backfilled INTEGER NOT NULL DEFAULT 0 CHECK (backfilled IN (0, 1)),
    unlocked_at TEXT NOT NULL,
    UNIQUE (viewer_id, achievement_id, revision, occurrence),
    FOREIGN KEY (achievement_id, revision) REFERENCES achievement_revisions(achievement_id, revision)
);

CREATE INDEX idx_viewer_achievement_unlocks_history
ON viewer_achievement_unlocks(viewer_id, unlocked_at DESC, id DESC);
CREATE INDEX idx_viewer_achievement_unlocks_reconciliation
ON viewer_achievement_unlocks(achievement_id, revision, viewer_id);

CREATE TABLE progression_alert_settings (
    id INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
    achievement_enabled INTEGER NOT NULL DEFAULT 0 CHECK (achievement_enabled IN (0, 1)),
    level_enabled INTEGER NOT NULL DEFAULT 0 CHECK (level_enabled IN (0, 1)),
    layout TEXT NOT NULL DEFAULT 'card' CHECK (layout IN ('card', 'banner', 'fullscreen')),
    sound TEXT NOT NULL DEFAULT '',
    sound_volume INTEGER NOT NULL DEFAULT 70 CHECK (sound_volume BETWEEN 0 AND 100),
    duration_ms INTEGER NOT NULL DEFAULT 5000 CHECK (duration_ms > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE progression_reconciliation (
    id INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
    bootstrap_state TEXT NOT NULL DEFAULT 'complete',
    requested_generation INTEGER NOT NULL DEFAULT 0 CHECK (requested_generation >= 0),
    completed_generation INTEGER NOT NULL DEFAULT 0 CHECK (completed_generation >= 0),
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'pending', 'running', 'paused', 'failed')),
    last_viewer_id TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (completed_generation <= requested_generation)
);

CREATE INDEX idx_interaction_events_viewer_award_progression
ON interaction_events(viewer_id, kind, award_id);
CREATE INDEX idx_interaction_events_viewer_command_progression
ON interaction_events(viewer_id, kind, command_trigger);
CREATE INDEX idx_viewer_contracts_winner_progression
ON viewer_contracts(winner_viewer_id, status);

-- +goose Down
DROP INDEX IF EXISTS idx_viewer_contracts_winner_progression;
DROP INDEX IF EXISTS idx_interaction_events_viewer_command_progression;
DROP INDEX IF EXISTS idx_interaction_events_viewer_award_progression;
DROP TABLE IF EXISTS progression_reconciliation;
DROP TABLE IF EXISTS progression_alert_settings;
DROP INDEX IF EXISTS idx_viewer_achievement_unlocks_reconciliation;
DROP INDEX IF EXISTS idx_viewer_achievement_unlocks_history;
DROP TABLE IF EXISTS viewer_achievement_unlocks;
DROP TABLE IF EXISTS achievement_revisions;
DROP TABLE IF EXISTS achievement_definitions;
DROP TABLE IF EXISTS progression_levels;
ALTER TABLE viewers DROP COLUMN progression_alerts_disabled;
