-- +goose Up
CREATE TABLE viewers (
    id TEXT NOT NULL PRIMARY KEY,
    display_name TEXT,
    message_count INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    last_seen_at TEXT NOT NULL,
    hidden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE viewer_identities (
    platform TEXT NOT NULL,
    user_id TEXT NOT NULL,
    viewer_id TEXT NOT NULL REFERENCES viewers(id),
    username TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    last_seen_at TEXT NOT NULL,
    PRIMARY KEY (platform, user_id)
);

CREATE TABLE stream_sessions (
    id TEXT NOT NULL PRIMARY KEY,
    started_at TEXT NOT NULL,
    ended_at TEXT
);

CREATE TABLE viewer_session_stats (
    viewer_id TEXT NOT NULL REFERENCES viewers(id),
    session_id TEXT NOT NULL REFERENCES stream_sessions(id),
    message_count INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (viewer_id, session_id)
);

CREATE TABLE viewer_day_stats (
    viewer_id TEXT NOT NULL REFERENCES viewers(id),
    day_key TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (viewer_id, day_key)
);

CREATE TABLE viewer_merges (
    from_id TEXT NOT NULL REFERENCES viewers(id),
    into_id TEXT NOT NULL REFERENCES viewers(id),
    merged_at TEXT NOT NULL
);

-- +goose Down
DROP TABLE IF EXISTS viewer_merges;
DROP TABLE IF EXISTS viewer_day_stats;
DROP TABLE IF EXISTS viewer_session_stats;
DROP TABLE IF EXISTS stream_sessions;
DROP TABLE IF EXISTS viewer_identities;
DROP TABLE IF EXISTS viewers;
