-- +goose Up
CREATE TABLE viewer_contracts (
    id TEXT NOT NULL PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('active', 'awarded', 'closed')),
    active_slot INTEGER UNIQUE CHECK (active_slot IS NULL OR active_slot = 1),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    objective TEXT NOT NULL CHECK (length(trim(objective)) > 0),
    reward_id TEXT NOT NULL,
    reward_name TEXT NOT NULL CHECK (length(trim(reward_name)) > 0),
    reward_points INTEGER NOT NULL CHECK (reward_points > 0),
    reward_splash_template TEXT NOT NULL,
    reward_sound TEXT NOT NULL DEFAULT '',
    reward_duration_ms INTEGER NOT NULL,
    reward_image_asset TEXT NULL,
    reward_sound_file TEXT NULL,
    reward_sound_volume INTEGER NOT NULL CHECK (reward_sound_volume BETWEEN 0 AND 100),
    reward_layout TEXT NOT NULL CHECK (reward_layout IN ('card', 'banner', 'fullscreen')),
    reward_image_fit TEXT NOT NULL CHECK (reward_image_fit IN ('cover', 'contain', 'fill', 'tile')),
    reward_image_size_pct INTEGER NOT NULL CHECK (reward_image_size_pct BETWEEN 25 AND 300),
    winner_viewer_id TEXT NULL REFERENCES viewers(id),
    announced_at TEXT NOT NULL,
    settled_at TEXT NULL,
    CHECK (
        (status = 'active' AND active_slot = 1 AND winner_viewer_id IS NULL AND settled_at IS NULL)
        OR (status = 'awarded' AND active_slot IS NULL AND winner_viewer_id IS NOT NULL AND settled_at IS NOT NULL)
        OR (status = 'closed' AND active_slot IS NULL AND winner_viewer_id IS NULL AND settled_at IS NOT NULL)
    )
);

CREATE INDEX idx_viewer_contracts_status_announced
ON viewer_contracts(status, announced_at DESC);

ALTER TABLE interaction_events ADD COLUMN contract_id TEXT NULL REFERENCES viewer_contracts(id);

CREATE INDEX idx_interaction_events_contract_id
ON interaction_events(contract_id);

-- +goose Down
DROP INDEX IF EXISTS idx_interaction_events_contract_id;
ALTER TABLE interaction_events DROP COLUMN contract_id;
DROP INDEX IF EXISTS idx_viewer_contracts_status_announced;
DROP TABLE IF EXISTS viewer_contracts;
